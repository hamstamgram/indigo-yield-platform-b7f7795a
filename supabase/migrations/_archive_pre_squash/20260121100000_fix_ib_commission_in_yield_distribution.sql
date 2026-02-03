-- Fix: IB Commission handling in yield distribution
-- ============================================================================
-- BUGS FIXED:
-- 1. IB rate was queried from ib_allocations (wrong) - now queries profiles.ib_percentage
-- 2. IB_CREDIT transactions were not created - now created for each IB parent
-- 3. ib_allocations records were not created - now created for audit trail
-- 4. IB parent positions were not updated - now updated with commission amount
-- 5. INDIGO FEES received full fees - now receives (fees - IB commission)
-- 6. get_investor_ib_pct helper function queried ib_allocations - now queries profiles
-- ============================================================================

-- Drop existing functions first (required to change parameter defaults)
DROP FUNCTION IF EXISTS apply_adb_yield_distribution(uuid, date, date, numeric, uuid, text, numeric);
DROP FUNCTION IF EXISTS preview_adb_yield_distribution_v3(uuid, date, date, numeric, text);

-- ============================================================================
-- Fix get_investor_ib_pct helper function
-- This function was querying ib_allocations first (populated AFTER distributions)
-- Now it ONLY queries profiles.ib_percentage (source of truth)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_investor_ib_pct(p_investor_id uuid, p_fund_id uuid)
RETURNS numeric AS $$
DECLARE
  v_ib_pct numeric;
  v_account_type text;
BEGIN
  -- Check account type and get IB percentage from profiles (source of truth)
  SELECT account_type, ib_percentage
  INTO v_account_type, v_ib_pct
  FROM profiles
  WHERE id = p_investor_id;

  -- fees_account never has IB commission
  IF v_account_type = 'fees_account' THEN
    RETURN 0;
  END IF;

  -- Return the IB percentage from profiles (or 0 if not set)
  RETURN COALESCE(v_ib_pct, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public';

COMMENT ON FUNCTION get_investor_ib_pct IS
'Get IB commission percentage for an investor. FIXED: Now only queries profiles.ib_percentage (source of truth). The ib_allocations table is for RECORDING commissions AFTER distribution, not for querying rates BEFORE.';

-- ============================================================================
-- Fix apply_adb_yield_distribution
-- ============================================================================
CREATE OR REPLACE FUNCTION apply_adb_yield_distribution(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_gross_yield_amount numeric,
  p_admin_id uuid,
  p_purpose text DEFAULT 'month_end',
  p_dust_tolerance numeric DEFAULT 0.01
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_distribution_id uuid;
  v_total_adb numeric := 0;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_allocation_count int := 0;
  v_investor RECORD;
  v_gross_share numeric;
  v_net_share numeric;
  v_fee_share numeric;
  v_ib_share numeric;
  v_lock_key bigint;
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_fee_tx_id uuid;
  v_ib_tx_id uuid;
  v_ib_allocation_id uuid;
BEGIN
  -- *** CRITICAL: Enable canonical mutation flag ***
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Validate admin
  v_admin := COALESCE(p_admin_id, auth.uid());
  IF NOT is_admin() AND v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  -- Validate parameters
  IF p_gross_yield_amount <= 0 THEN
    RAISE EXCEPTION 'Gross yield amount must be positive';
  END IF;

  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'Period end must be after period start';
  END IF;

  -- *** VALIDATION: Prevent future-dated yield distributions ***
  IF p_period_end > CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot distribute yield for future dates. Period end (%) is after today (%).',
      p_period_end, CURRENT_DATE;
  END IF;

  -- Get fund
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Acquire fund-level lock
  v_lock_key := ('x' || substr(md5(p_fund_id::text || p_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Check for existing distribution (idempotency)
  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND period_end = p_period_end
      AND is_voided = false
  ) THEN
    RAISE EXCEPTION 'Yield distribution already exists for fund % on %', p_fund_id, p_period_end;
  END IF;

  -- Calculate total ADB
  SELECT COALESCE(SUM(calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end)), 0)
  INTO v_total_adb
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id
    AND ip.is_active = true;

  IF v_total_adb <= 0 THEN
    RAISE EXCEPTION 'No positions with positive average daily balance';
  END IF;

  -- Create distribution record
  INSERT INTO yield_distributions (
    fund_id,
    yield_date,
    period_start,
    period_end,
    gross_yield_amount,
    net_yield,
    total_fees,
    total_ib,
    status,
    created_by,
    calculation_method,
    purpose
  ) VALUES (
    p_fund_id,
    p_period_end,
    p_period_start,
    p_period_end,
    p_gross_yield_amount,
    0, -- Will be updated
    0, -- Will be updated
    0, -- Will be updated
    'applied'::yield_distribution_status,
    v_admin,
    'ADB',
    p_purpose
  )
  RETURNING id INTO v_distribution_id;

  -- Process each investor with positive ADB
  -- INDIGO FEES account (fees_account type) receives yield but pays 0% fee
  -- FIX: Query IB rate from profiles.ib_percentage, NOT from ib_allocations
  FOR v_investor IN
    SELECT
      ip.investor_id,
      p.first_name || ' ' || p.last_name as investor_name,
      p.account_type,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) as adb,
      -- INDIGO FEES (fees_account) always has 0% fee
      CASE WHEN p.account_type = 'fees_account' THEN 0
      ELSE COALESCE(
        (SELECT ifs.fee_pct FROM investor_fee_schedule ifs
         WHERE ifs.investor_id = ip.investor_id AND ifs.fund_id = p_fund_id
         ORDER BY ifs.created_at DESC LIMIT 1),
        p.fee_pct,
        0
      ) END as fee_pct,
      -- FIX: Get IB info from profiles table, NOT ib_allocations
      CASE WHEN p.account_type = 'fees_account' THEN NULL
           ELSE p.ib_parent_id
      END as ib_parent_id,
      CASE WHEN p.account_type = 'fees_account' THEN 0
           ELSE COALESCE(p.ib_percentage, 0)
      END as ib_rate
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.is_active = true
      AND calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) > 0
  LOOP
    -- Calculate shares
    v_gross_share := ROUND((v_investor.adb / v_total_adb * p_gross_yield_amount)::numeric, 8);
    v_fee_share := ROUND((v_gross_share * v_investor.fee_pct / 100)::numeric, 8);
    v_net_share := v_gross_share - v_fee_share;

    -- IB commission is a percentage of the FEE (not net yield)
    -- Only calculate if investor has an IB parent
    IF v_investor.ib_parent_id IS NOT NULL AND v_investor.ib_rate > 0 AND v_fee_share > 0 THEN
      v_ib_share := ROUND((v_fee_share * v_investor.ib_rate / 100)::numeric, 8);
    ELSE
      v_ib_share := 0;
    END IF;

    -- Skip if allocation is below dust tolerance
    IF v_gross_share < p_dust_tolerance THEN
      CONTINUE;
    END IF;

    -- Create yield allocation
    INSERT INTO yield_allocations (
      distribution_id,
      investor_id,
      fund_id,
      gross_amount,
      net_amount,
      fee_amount,
      fee_pct,
      ib_amount,
      adb_share,
      created_at
    ) VALUES (
      v_distribution_id,
      v_investor.investor_id,
      p_fund_id,
      v_gross_share,
      v_net_share,
      v_fee_share,
      v_investor.fee_pct,
      v_ib_share,
      v_investor.adb,
      NOW()
    );

    -- Create YIELD transaction for investor (NET amount)
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, asset, amount,
      tx_date, value_date, reference_id, notes,
      created_by, is_voided, source, distribution_id, created_at
    ) VALUES (
      v_investor.investor_id, p_fund_id, 'YIELD', v_fund.asset, v_net_share,
      p_period_end, p_period_end,
      'yield_adb_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
      'ADB yield distribution for period ' || p_period_start::text || ' to ' || p_period_end::text,
      v_admin, false, 'rpc', v_distribution_id, NOW()
    );

    -- Update investor position
    UPDATE investor_positions
    SET current_value = current_value + v_net_share, updated_at = NOW()
    WHERE investor_id = v_investor.investor_id AND fund_id = p_fund_id;

    -- If fee was charged, create platform fee ledger entry
    IF v_fee_share > 0 THEN
      INSERT INTO platform_fee_ledger (
        fund_id, yield_distribution_id, investor_id, investor_name,
        gross_yield_amount, fee_percentage, fee_amount,
        effective_date, asset, created_at, created_by, is_voided
      ) VALUES (
        p_fund_id, v_distribution_id, v_investor.investor_id, v_investor.investor_name,
        v_gross_share, v_investor.fee_pct, v_fee_share,
        p_period_end, v_fund.asset, NOW(), v_admin, false
      );
    END IF;

    -- FIX: Create IB_CREDIT transaction and ib_allocations record if IB commission applies
    IF v_ib_share > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
      -- Create ib_allocations record for audit trail
      INSERT INTO ib_allocations (
        distribution_id,
        fund_id,
        ib_investor_id,
        source_investor_id,
        ib_percentage,
        ib_fee_amount,
        source_net_income,
        is_voided,
        created_at
      ) VALUES (
        v_distribution_id,
        p_fund_id,
        v_investor.ib_parent_id,
        v_investor.investor_id,
        v_investor.ib_rate,
        v_ib_share,
        v_net_share,
        false,
        NOW()
      ) RETURNING id INTO v_ib_allocation_id;

      -- Create IB_CREDIT transaction for IB parent
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, asset, amount,
        tx_date, value_date, reference_id, notes,
        created_by, is_voided, source, distribution_id, created_at
      ) VALUES (
        v_investor.ib_parent_id, p_fund_id, 'IB_CREDIT', v_fund.asset, v_ib_share,
        p_period_end, p_period_end,
        'ib_credit_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
        'IB commission (' || v_investor.ib_rate || '%) from ' || v_investor.investor_name || ' yield',
        v_admin, false, 'rpc', v_distribution_id, NOW()
      ) RETURNING id INTO v_ib_tx_id;

      -- Update IB parent position with commission
      INSERT INTO investor_positions (investor_id, fund_id, current_value, is_active, updated_at)
      VALUES (v_investor.ib_parent_id, p_fund_id, v_ib_share, true, NOW())
      ON CONFLICT (investor_id, fund_id)
      DO UPDATE SET current_value = investor_positions.current_value + EXCLUDED.current_value,
                    is_active = true, updated_at = NOW();
    END IF;

    -- Update totals
    v_total_gross := v_total_gross + v_gross_share;
    v_total_net := v_total_net + v_net_share;
    v_total_fees := v_total_fees + v_fee_share;
    v_total_ib := v_total_ib + v_ib_share;
    v_allocation_count := v_allocation_count + 1;
  END LOOP;

  -- FIX: Create FEE_CREDIT transaction for INDIGO FEES account
  -- INDIGO FEES gets (total_fees - total_ib) because IB parents get their share
  IF v_total_fees > 0 THEN
    DECLARE
      v_platform_fee_amount numeric := v_total_fees - v_total_ib;
    BEGIN
      IF v_platform_fee_amount > 0 THEN
        INSERT INTO transactions_v2 (
          investor_id, fund_id, type, asset, amount,
          tx_date, value_date, reference_id, notes,
          created_by, is_voided, source, distribution_id, created_at
        ) VALUES (
          v_indigo_fees_id, p_fund_id, 'FEE_CREDIT', v_fund.asset, v_platform_fee_amount,
          p_period_end, p_period_end,
          'fee_credit_' || v_distribution_id::text,
          'Platform fees from yield distribution for ' || v_fund.code || ' (after IB commissions)',
          v_admin, false, 'rpc', v_distribution_id, NOW()
        ) RETURNING id INTO v_fee_tx_id;

        -- Update INDIGO FEES position
        INSERT INTO investor_positions (investor_id, fund_id, current_value, is_active, updated_at)
        VALUES (v_indigo_fees_id, p_fund_id, v_platform_fee_amount, true, NOW())
        ON CONFLICT (investor_id, fund_id)
        DO UPDATE SET current_value = investor_positions.current_value + EXCLUDED.current_value,
                      is_active = true, updated_at = NOW();
      END IF;
    END;
  END IF;

  -- Update distribution totals
  UPDATE yield_distributions
  SET
    net_yield = v_total_net,
    total_fees = v_total_fees,
    total_fee_amount = v_total_fees,
    total_net_amount = v_total_net,
    total_ib = v_total_ib,
    total_ib_amount = v_total_ib,
    allocation_count = v_allocation_count
  WHERE id = v_distribution_id;

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'total_adb', v_total_adb,
    'gross_yield', p_gross_yield_amount,
    'allocated_gross', v_total_gross,
    'allocated_net', v_total_net,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'platform_fees', v_total_fees - v_total_ib,
    'allocation_count', v_allocation_count,
    'investor_count', v_allocation_count,
    'dust_amount', p_gross_yield_amount - v_total_gross,
    'conservation_check', ABS(p_gross_yield_amount - (v_total_net + v_total_fees)) < p_dust_tolerance,
    'days_in_period', p_period_end - p_period_start + 1,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((p_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    'features', ARRAY['time_weighted', 'loss_carryforward', 'fee_credit', 'ib_commission']
  );
END;
$$;

-- ============================================================================
-- Fix preview_adb_yield_distribution_v3
-- ============================================================================
CREATE OR REPLACE FUNCTION preview_adb_yield_distribution_v3(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_gross_yield_amount numeric,
  p_purpose text DEFAULT 'transaction'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_adb numeric := 0;
  v_fund RECORD;
  v_allocations jsonb := '[]'::jsonb;
  v_ib_summary jsonb := '[]'::jsonb;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_investor RECORD;
  v_gross_share numeric;
  v_net_share numeric;
  v_fee_share numeric;
  v_ib_share numeric;
  v_dust_tolerance numeric := 0.01;
  v_ib_parent_name text;
BEGIN
  -- Get fund info
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Calculate total ADB
  SELECT COALESCE(SUM(calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end)), 0)
  INTO v_total_adb
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id
    AND ip.is_active = true;

  IF v_total_adb <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'total_adb', 0,
      'allocations', '[]'::jsonb,
      'message', 'No positions with positive average daily balance'
    );
  END IF;

  -- Calculate allocations
  -- FIX: Get IB info from profiles table, NOT ib_allocations
  FOR v_investor IN
    SELECT
      ip.investor_id,
      p.email as investor_email,
      COALESCE(p.first_name || ' ' || p.last_name, p.email) as investor_name,
      p.account_type,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) as adb,
      -- INDIGO FEES (fees_account) always has 0% fee
      CASE WHEN p.account_type = 'fees_account' THEN 0
      ELSE COALESCE(
        (SELECT ifs.fee_pct FROM investor_fee_schedule ifs
         WHERE ifs.investor_id = ip.investor_id AND ifs.fund_id = p_fund_id
         ORDER BY ifs.created_at DESC LIMIT 1),
        p.fee_pct,
        0
      ) END as fee_pct,
      -- FIX: Get IB info from profiles table
      CASE WHEN p.account_type = 'fees_account' THEN NULL
           ELSE p.ib_parent_id
      END as ib_parent_id,
      CASE WHEN p.account_type = 'fees_account' THEN 0
           ELSE COALESCE(p.ib_percentage, 0)
      END as ib_rate
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.is_active = true
      AND calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) > 0
    ORDER BY calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) DESC
  LOOP
    v_gross_share := ROUND((v_investor.adb / v_total_adb * p_gross_yield_amount)::numeric, 8);
    v_fee_share := ROUND((v_gross_share * v_investor.fee_pct / 100)::numeric, 8);
    v_net_share := v_gross_share - v_fee_share;

    -- IB commission is a percentage of the FEE
    IF v_investor.ib_parent_id IS NOT NULL AND v_investor.ib_rate > 0 AND v_fee_share > 0 THEN
      v_ib_share := ROUND((v_fee_share * v_investor.ib_rate / 100)::numeric, 8);
      -- Get IB parent name for display
      SELECT COALESCE(first_name || ' ' || last_name, email) INTO v_ib_parent_name
      FROM profiles WHERE id = v_investor.ib_parent_id;
    ELSE
      v_ib_share := 0;
      v_ib_parent_name := NULL;
    END IF;

    IF v_gross_share >= v_dust_tolerance THEN
      v_allocations := v_allocations || jsonb_build_object(
        'investor_id', v_investor.investor_id,
        'investor_email', v_investor.investor_email,
        'investor_name', v_investor.investor_name,
        'account_type', v_investor.account_type,
        'adb', v_investor.adb,
        'adb_share_pct', ROUND((v_investor.adb / v_total_adb * 100)::numeric, 4),
        'gross_yield', v_gross_share,
        'fee_pct', v_investor.fee_pct,
        'fee_amount', v_fee_share,
        'net_yield', v_net_share,
        'ib_parent_id', v_investor.ib_parent_id,
        'ib_parent_name', v_ib_parent_name,
        'ib_rate', v_investor.ib_rate,
        'ib_amount', v_ib_share
      );

      -- Track IB summary if commission applies
      IF v_ib_share > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
        v_ib_summary := v_ib_summary || jsonb_build_object(
          'ib_parent_id', v_investor.ib_parent_id,
          'ib_parent_name', v_ib_parent_name,
          'source_investor_id', v_investor.investor_id,
          'source_investor_name', v_investor.investor_name,
          'ib_rate', v_investor.ib_rate,
          'ib_amount', v_ib_share,
          'source_fee', v_fee_share
        );
      END IF;

      v_total_gross := v_total_gross + v_gross_share;
      v_total_net := v_total_net + v_net_share;
      v_total_fees := v_total_fees + v_fee_share;
      v_total_ib := v_total_ib + v_ib_share;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'days_in_period', p_period_end - p_period_start + 1,
    'total_adb', v_total_adb,
    'gross_yield_amount', p_gross_yield_amount,
    'gross_yield', v_total_gross,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'platform_fees', v_total_fees - v_total_ib,
    'dust_amount', p_gross_yield_amount - v_total_gross,
    'investor_count', jsonb_array_length(v_allocations),
    'allocations', v_allocations,
    'ib_summary', v_ib_summary,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((p_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    'conservation_check', ABS(p_gross_yield_amount - (v_total_net + v_total_fees)) < v_dust_tolerance,
    'calculation_method', 'adb_v3',
    'features', ARRAY['time_weighted', 'loss_carryforward', 'fees_account_0pct', 'ib_commission']
  );
END;
$$;

GRANT EXECUTE ON FUNCTION preview_adb_yield_distribution_v3(uuid, date, date, numeric, text) TO authenticated;

COMMENT ON FUNCTION apply_adb_yield_distribution IS
'Apply yield using ADB method. FIXED: IB commission now correctly queries profiles.ib_percentage, creates IB_CREDIT transactions, ib_allocations records, and updates IB parent positions.';

COMMENT ON FUNCTION preview_adb_yield_distribution_v3 IS
'Preview ADB yield distribution. FIXED: IB commission now correctly queries profiles.ib_percentage and shows IB parent info in allocations.';

-- ============================================================================
-- Fix void_yield_distribution to void ib_allocations (was missing!)
-- ============================================================================
CREATE OR REPLACE FUNCTION void_yield_distribution(
  p_distribution_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Administrative void'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dist RECORD;
  v_is_admin boolean;
  v_voided_yield_count int := 0;
  v_voided_fee_credit_count int := 0;
  v_voided_ib_credit_count int := 0;
  v_voided_ib_allocations_count int := 0;
  v_tx RECORD;
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_admin_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Admin privileges required');
  END IF;

  SELECT * INTO v_dist
  FROM yield_distributions
  WHERE id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Yield distribution not found or already voided');
  END IF;

  -- 1. Void YIELD transactions and reverse positions
  FOR v_tx IN
    SELECT * FROM transactions_v2
    WHERE reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
      AND is_voided = false
  LOOP
    UPDATE investor_positions
    SET current_value = current_value - v_tx.amount, updated_at = NOW()
    WHERE investor_id = v_tx.investor_id AND fund_id = v_tx.fund_id;

    UPDATE transactions_v2
    SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        void_reason = 'Yield distribution voided: ' || p_reason
    WHERE id = v_tx.id;

    v_voided_yield_count := v_voided_yield_count + 1;
  END LOOP;

  -- 2. Void FEE_CREDIT transactions
  FOR v_tx IN
    SELECT * FROM transactions_v2
    WHERE reference_id = 'fee_credit_' || p_distribution_id::text
      AND is_voided = false
  LOOP
    UPDATE investor_positions
    SET current_value = current_value - v_tx.amount, updated_at = NOW()
    WHERE investor_id = v_tx.investor_id AND fund_id = v_tx.fund_id;

    UPDATE transactions_v2
    SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        void_reason = 'Yield distribution voided: ' || p_reason
    WHERE id = v_tx.id;

    v_voided_fee_credit_count := v_voided_fee_credit_count + 1;
  END LOOP;

  -- 3. Void IB_CREDIT transactions
  FOR v_tx IN
    SELECT * FROM transactions_v2
    WHERE reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%'
      AND is_voided = false
  LOOP
    UPDATE investor_positions
    SET current_value = current_value - v_tx.amount, updated_at = NOW()
    WHERE investor_id = v_tx.investor_id AND fund_id = v_tx.fund_id;

    UPDATE transactions_v2
    SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        void_reason = 'Yield distribution voided: ' || p_reason
    WHERE id = v_tx.id;

    v_voided_ib_credit_count := v_voided_ib_credit_count + 1;
  END LOOP;

  -- 4. Void platform_fee_ledger
  UPDATE platform_fee_ledger
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = 'Yield distribution voided: ' || p_reason
  WHERE yield_distribution_id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);

  -- 5. Void ib_commission_ledger
  UPDATE ib_commission_ledger
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = 'Yield distribution voided: ' || p_reason
  WHERE yield_distribution_id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);

  -- 6. FIX: Void ib_allocations (was missing!)
  UPDATE ib_allocations
  SET is_voided = true
  WHERE distribution_id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);
  GET DIAGNOSTICS v_voided_ib_allocations_count = ROW_COUNT;

  -- 7. Void yield_allocations
  UPDATE yield_allocations
  SET is_voided = true
  WHERE distribution_id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);

  -- 8. Void the distribution
  UPDATE yield_distributions
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id, void_reason = p_reason
  WHERE id = p_distribution_id;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES ('VOID_YIELD_DISTRIBUTION', 'yield_distributions', p_distribution_id::text, p_admin_id,
    jsonb_build_object('is_voided', false, 'net_yield', v_dist.net_yield, 'total_fees', v_dist.total_fees, 'total_ib', v_dist.total_ib),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason,
      'voided_yield_transactions', v_voided_yield_count,
      'voided_fee_credit_transactions', v_voided_fee_credit_count,
      'voided_ib_credit_transactions', v_voided_ib_credit_count,
      'voided_ib_allocations', v_voided_ib_allocations_count));

  RETURN json_build_object(
    'success', true,
    'distribution_id', p_distribution_id,
    'fund_id', v_dist.fund_id,
    'period_end', v_dist.period_end,
    'original_net_yield', v_dist.net_yield,
    'original_total_fees', v_dist.total_fees,
    'original_total_ib', v_dist.total_ib,
    'voided_yield_transactions', v_voided_yield_count,
    'voided_fee_credit_transactions', v_voided_fee_credit_count,
    'voided_ib_credit_transactions', v_voided_ib_credit_count,
    'voided_ib_allocations', v_voided_ib_allocations_count,
    'allocations_voided', true,
    'fee_ledger_voided', true,
    'ib_ledger_voided', true
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM, 'error_code', SQLSTATE);
END;
$function$;

COMMENT ON FUNCTION void_yield_distribution IS
'Void a yield distribution and all related records. FIXED: Now also voids ib_allocations records.';
