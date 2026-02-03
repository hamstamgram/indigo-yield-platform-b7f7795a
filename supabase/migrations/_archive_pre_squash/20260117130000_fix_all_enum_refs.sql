-- ============================================================================
-- Comprehensive Fix: Remove ALL invalid enum references
-- ============================================================================
-- This migration fixes all functions that reference FIRST_INVESTMENT or TOP_UP
-- which are NOT valid tx_type enum values.
--
-- Valid tx_type values: DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT, YIELD,
--                       FEE_CREDIT, IB_CREDIT, IB_DEBIT, INTERNAL_CREDIT, INTERNAL_WITHDRAWAL
--
-- First investments are stored as DEPOSIT with tx_subtype='first_investment'
-- ============================================================================

-- ============================================================================
-- 1) Fix apply_daily_yield_to_fund_v3
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_yield_date date,
  p_gross_yield_pct numeric,
  p_created_by uuid DEFAULT NULL::uuid,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fund_aum numeric;
  v_fund record;
  v_gross_yield_amount numeric;
  v_snapshot_id uuid;
  v_distribution_id uuid;
  v_investor_count int := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_investor record;
  v_fee_pct numeric;
  v_fee_amount numeric;
  v_ib_pct numeric;
  v_ib_amount numeric;
  v_net_yield numeric;
  v_investor_gross numeric;
  v_fees_account_id uuid;
  v_dust numeric;
  v_dust_receiver_id uuid;
  v_reference_id text;
  v_fund_asset text;
  v_fee_tx_id uuid;
  v_ib_tx_id uuid;
  v_yield_tx_id uuid;
BEGIN
  -- Advisory lock for concurrency
  PERFORM pg_advisory_xact_lock(hashtext('yield:' || p_fund_id::text), hashtext(p_yield_date::text));

  -- SECURITY: Yield application is a finance mutation and must be ADMIN-only
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can apply yield distributions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validate yield rate sanity (absolute bounds)
  PERFORM validate_yield_rate_sanity(p_gross_yield_pct, p_fund_id);

  -- Duplicate distribution guard
  IF EXISTS (
    SELECT 1
    FROM yield_distributions yd
    WHERE yd.fund_id = p_fund_id
      AND yd.effective_date = p_yield_date
      AND yd.purpose = p_purpose
      AND yd.voided_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Distribution already exists for this fund/date/purpose',
      'code', 'DUPLICATE_DISTRIBUTION'
    );
  END IF;

  -- Temporal lock check
  IF EXISTS (
    SELECT 1
    FROM fund_daily_aum
    WHERE fund_id = p_fund_id
      AND aum_date = p_yield_date
      AND created_at::date = CURRENT_DATE
      AND is_voided = false
      AND (temporal_lock_bypass IS NULL OR temporal_lock_bypass = false)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Temporal lock active', 'code', 'TEMPORAL_LOCK');
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found', 'code', 'FUND_NOT_FOUND');
  END IF;
  v_fund_asset := COALESCE(v_fund.asset, 'USDC');

  -- Compute AS-OF AUM at yield date
  -- FIXED: Only use valid enum value 'DEPOSIT' (not FIRST_INVESTMENT or TOP_UP)
  WITH tx_summary AS (
    SELECT
      t.investor_id,
      SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END) AS deposits,
      SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN abs(t.amount) ELSE 0 END) AS withdrawals
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id
      AND t.is_voided = false
      AND t.investor_id IS NOT NULL
      AND t.tx_date <= p_yield_date
    GROUP BY t.investor_id
  ),
  yield_summary AS (
    SELECT
      ya.investor_id,
      COALESCE(SUM(ya.net_amount), 0) AS total_yield
    FROM yield_allocations ya
    JOIN yield_distributions yd ON yd.id = ya.distribution_id
    WHERE yd.fund_id = p_fund_id
      AND yd.is_voided = false
      AND yd.yield_date < p_yield_date
    GROUP BY ya.investor_id
  )
  SELECT COALESCE(SUM(GREATEST(0, COALESCE(ts.deposits, 0) - COALESCE(ts.withdrawals, 0) + COALESCE(ys.total_yield, 0))), 0)
  INTO v_fund_aum
  FROM tx_summary ts
  LEFT JOIN yield_summary ys ON ys.investor_id = ts.investor_id;

  IF v_fund_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund has no AUM', 'code', 'NO_AUM');
  END IF;

  v_gross_yield_amount := v_fund_aum * (p_gross_yield_pct / 100);

  -- Get fees account
  SELECT i.id INTO v_fees_account_id
  FROM investors i
  JOIN profiles p ON p.id = i.profile_id
  WHERE p.email = 'fees@indigowealthgroup.com'
  LIMIT 1;

  -- Create distribution record
  INSERT INTO yield_distributions (
    fund_id, yield_date, effective_date, gross_yield_pct, gross_yield_amount,
    net_yield_amount, total_fees, total_ib_fees, investor_count, purpose,
    created_by, is_voided
  ) VALUES (
    p_fund_id, p_yield_date, p_yield_date, p_gross_yield_pct, v_gross_yield_amount,
    0, 0, 0, 0, p_purpose,
    COALESCE(p_created_by, auth.uid()), false
  ) RETURNING id INTO v_distribution_id;

  -- Process each investor with AS-OF balances
  -- FIXED: Only use valid enum value 'DEPOSIT' (not FIRST_INVESTMENT or TOP_UP)
  FOR v_investor IN
    WITH tx_summary AS (
      SELECT
        t.investor_id,
        SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END) AS deposits,
        SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN abs(t.amount) ELSE 0 END) AS withdrawals
      FROM transactions_v2 t
      WHERE t.fund_id = p_fund_id
        AND t.is_voided = false
        AND t.investor_id IS NOT NULL
        AND t.tx_date <= p_yield_date
      GROUP BY t.investor_id
    ),
    yield_summary AS (
      SELECT
        ya.investor_id,
        COALESCE(SUM(ya.net_amount), 0) AS total_yield
      FROM yield_allocations ya
      JOIN yield_distributions yd ON yd.id = ya.distribution_id
      WHERE yd.fund_id = p_fund_id
        AND yd.is_voided = false
        AND yd.yield_date < p_yield_date
      GROUP BY ya.investor_id
    ),
    balances AS (
      SELECT
        ts.investor_id,
        GREATEST(0, COALESCE(ts.deposits, 0) - COALESCE(ts.withdrawals, 0) + COALESCE(ys.total_yield, 0)) AS balance
      FROM tx_summary ts
      LEFT JOIN yield_summary ys ON ys.investor_id = ts.investor_id
    )
    SELECT
      b.investor_id,
      inv.profile_id,
      COALESCE(p.full_name, 'Unknown') AS investor_name,
      b.balance AS current_balance,
      COALESCE(fs.fee_percentage, 0) AS fee_percentage,
      inv.ib_parent_id,
      COALESCE(inv.ib_commission_rate, 0) AS ib_percentage
    FROM balances b
    JOIN investors inv ON inv.id = b.investor_id
    JOIN profiles p ON p.id = inv.profile_id
    LEFT JOIN fee_schedules fs ON fs.investor_id = b.investor_id AND fs.fund_id = p_fund_id
    WHERE b.balance > 0
    ORDER BY b.balance DESC
  LOOP
    v_investor_count := v_investor_count + 1;
    v_reference_id := v_fund.code || '-' || to_char(p_yield_date, 'YYYYMMDD') || '-' || v_investor_count;

    -- Calculate yield allocation
    v_investor_gross := v_gross_yield_amount * (v_investor.current_balance / v_fund_aum);

    -- Fee calculation (only on positive yield)
    IF v_investor_gross > 0 THEN
      v_fee_pct := COALESCE(v_investor.fee_percentage, 0);
      v_fee_amount := v_investor_gross * (v_fee_pct / 100);
    ELSE
      v_fee_pct := 0;
      v_fee_amount := 0;
    END IF;

    -- IB calculation
    IF v_investor_gross > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
      v_ib_pct := COALESCE(v_investor.ib_percentage, 0);
      v_ib_amount := v_investor_gross * (v_ib_pct / 100);
    ELSE
      v_ib_pct := 0;
      v_ib_amount := 0;
    END IF;

    v_net_yield := v_investor_gross - v_fee_amount;

    -- Skip dust amounts
    IF abs(v_net_yield) < 0.01 THEN
      CONTINUE;
    END IF;

    -- Insert yield allocation
    INSERT INTO yield_allocations (
      distribution_id, investor_id, fund_id, allocation_pct,
      gross_amount, fee_pct, fee_amount, net_amount, reference_id
    ) VALUES (
      v_distribution_id, v_investor.investor_id, p_fund_id,
      (v_investor.current_balance / v_fund_aum) * 100,
      v_investor_gross, v_fee_pct, v_fee_amount, v_net_yield, v_reference_id
    );

    -- Create yield transaction for investor
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, status,
      reference_id, created_by, is_voided
    ) VALUES (
      v_investor.investor_id, p_fund_id, 'YIELD', v_net_yield, p_yield_date, 'CONFIRMED',
      v_reference_id, COALESCE(p_created_by, auth.uid()), false
    ) RETURNING id INTO v_yield_tx_id;

    -- Create fee transaction if applicable
    IF v_fee_amount > 0 AND v_fees_account_id IS NOT NULL THEN
      INSERT INTO fee_allocations (
        distribution_id, investor_id, fund_id, fee_pct, fee_amount, reference_id
      ) VALUES (
        v_distribution_id, v_investor.investor_id, p_fund_id,
        v_fee_pct, v_fee_amount, v_reference_id || '-FEE'
      );

      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, status,
        reference_id, created_by, is_voided
      ) VALUES (
        v_fees_account_id, p_fund_id, 'FEE_CREDIT', v_fee_amount - v_ib_amount, p_yield_date, 'CONFIRMED',
        v_reference_id || '-FEE', COALESCE(p_created_by, auth.uid()), false
      );
    END IF;

    -- Create IB transaction if applicable
    IF v_ib_amount > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
      INSERT INTO ib_allocations (
        distribution_id, ib_investor_id, source_investor_id, fund_id,
        ib_pct, ib_amount, source, reference_id
      ) VALUES (
        v_distribution_id, v_investor.ib_parent_id, v_investor.investor_id, p_fund_id,
        v_ib_pct, v_ib_amount, 'yield', v_reference_id || '-IB'
      );

      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, status,
        reference_id, created_by, is_voided
      ) VALUES (
        v_investor.ib_parent_id, p_fund_id, 'IB_CREDIT', v_ib_amount, p_yield_date, 'CONFIRMED',
        v_reference_id || '-IB', COALESCE(p_created_by, auth.uid()), false
      );
    END IF;

    -- Track totals
    v_total_net := v_total_net + v_net_yield;
    v_total_fees := v_total_fees + v_fee_amount;
    v_total_ib := v_total_ib + v_ib_amount;
  END LOOP;

  -- Update distribution totals
  UPDATE yield_distributions SET
    net_yield_amount = v_total_net,
    total_fees = v_total_fees,
    total_ib_fees = v_total_ib,
    investor_count = v_investor_count
  WHERE id = v_distribution_id;

  -- Trigger position recomputation
  PERFORM recompute_investor_positions_for_fund(p_fund_id);

  RETURN jsonb_build_object(
    'success', true,
    'distributionId', v_distribution_id,
    'fundId', p_fund_id,
    'yieldDate', p_yield_date,
    'grossYieldPct', p_gross_yield_pct,
    'grossYieldAmount', round(v_gross_yield_amount, 2),
    'netYieldAmount', round(v_total_net, 2),
    'totalFees', round(v_total_fees, 2),
    'totalIbFees', round(v_total_ib, 2),
    'investorCount', v_investor_count
  );
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, aum_purpose) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, aum_purpose) TO service_role;

-- ============================================================================
-- 2) Fix get_investor_position_as_of (if it has the bug)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_investor_position_as_of(
  p_investor_id uuid,
  p_fund_id uuid,
  p_as_of_date date
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance numeric;
BEGIN
  -- Calculate AS-OF balance using only valid enum values
  -- FIXED: Removed FIRST_INVESTMENT and TOP_UP (not valid enum values)
  WITH tx_summary AS (
    SELECT
      SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END) AS deposits,
      SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN abs(t.amount) ELSE 0 END) AS withdrawals
    FROM transactions_v2 t
    WHERE t.investor_id = p_investor_id
      AND t.fund_id = p_fund_id
      AND t.is_voided = false
      AND t.tx_date <= p_as_of_date
  ),
  yield_summary AS (
    SELECT COALESCE(SUM(ya.net_amount), 0) AS total_yield
    FROM yield_allocations ya
    JOIN yield_distributions yd ON yd.id = ya.distribution_id
    WHERE ya.investor_id = p_investor_id
      AND ya.fund_id = p_fund_id
      AND yd.is_voided = false
      AND yd.yield_date <= p_as_of_date
  )
  SELECT GREATEST(0, COALESCE(ts.deposits, 0) - COALESCE(ts.withdrawals, 0) + COALESCE(ys.total_yield, 0))
  INTO v_balance
  FROM tx_summary ts, yield_summary ys;

  RETURN COALESCE(v_balance, 0);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_investor_position_as_of(uuid, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_investor_position_as_of(uuid, uuid, date) TO service_role;

-- ============================================================================
-- 3) Fix reconcile_investor_position (if it has the bug)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_investor_position(
  p_investor_id uuid,
  p_fund_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_calculated_balance numeric;
  v_current_balance numeric;
  v_difference numeric;
BEGIN
  -- Get current position
  SELECT current_value INTO v_current_balance
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  -- Calculate what the balance should be
  -- FIXED: Only use valid enum value 'DEPOSIT' (not FIRST_INVESTMENT or TOP_UP)
  WITH tx_summary AS (
    SELECT
      SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END) AS deposits,
      SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN abs(t.amount) ELSE 0 END) AS withdrawals
    FROM transactions_v2 t
    WHERE t.investor_id = p_investor_id
      AND t.fund_id = p_fund_id
      AND t.is_voided = false
  ),
  yield_summary AS (
    SELECT COALESCE(SUM(ya.net_amount), 0) AS total_yield
    FROM yield_allocations ya
    JOIN yield_distributions yd ON yd.id = ya.distribution_id
    WHERE ya.investor_id = p_investor_id
      AND ya.fund_id = p_fund_id
      AND yd.is_voided = false
  )
  SELECT GREATEST(0, COALESCE(ts.deposits, 0) - COALESCE(ts.withdrawals, 0) + COALESCE(ys.total_yield, 0))
  INTO v_calculated_balance
  FROM tx_summary ts, yield_summary ys;

  v_calculated_balance := COALESCE(v_calculated_balance, 0);
  v_current_balance := COALESCE(v_current_balance, 0);
  v_difference := v_calculated_balance - v_current_balance;

  -- Update position if there's a discrepancy
  IF abs(v_difference) > 0.01 THEN
    UPDATE investor_positions SET
      current_value = v_calculated_balance,
      updated_at = now()
    WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

    IF NOT FOUND THEN
      INSERT INTO investor_positions (investor_id, fund_id, current_value)
      VALUES (p_investor_id, p_fund_id, v_calculated_balance);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'investorId', p_investor_id,
    'fundId', p_fund_id,
    'previousBalance', v_current_balance,
    'calculatedBalance', v_calculated_balance,
    'difference', v_difference,
    'adjusted', abs(v_difference) > 0.01
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.reconcile_investor_position(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_investor_position(uuid, uuid) TO service_role;

-- ============================================================================
-- Success message
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Successfully fixed all functions with invalid enum references';
  RAISE NOTICE 'Functions fixed: apply_daily_yield_to_fund_v3, get_investor_position_as_of, reconcile_investor_position';
END $$;
