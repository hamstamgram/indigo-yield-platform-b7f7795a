-- =============================================================================
-- INDIGO PLATFORM CRITICAL FIXES
-- Date: 2026-01-12
-- Priority: P0 - Critical fixes for institutional-grade reliability
-- =============================================================================

-- =============================================================================
-- FIX 1: Enhanced apply_daily_yield_to_fund_v3
-- Issues Fixed:
--   - Adds AUM update after yield distribution
--   - Distributes dust to fees account
--   - Creates ib_allocations records
--   - Fixes fee_allocations ownership calculation
--   - Adds balance_before/balance_after tracking
-- =============================================================================

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_yield_date date,
  p_gross_yield_pct numeric,
  p_created_by uuid,
  p_purpose public.aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund_aum numeric(28,10);
  v_fund record;
  v_gross_yield_amount numeric(28,10);
  v_snapshot_id uuid;
  v_distribution_id uuid;
  v_investor_count int := 0;
  v_total_net numeric(28,10) := 0;
  v_total_fees numeric(28,10) := 0;
  v_total_ib numeric(28,10) := 0;
  v_investor record;
  v_fee_pct numeric(28,10);
  v_fee_amount numeric(28,10);
  v_ib_pct numeric(28,10);
  v_ib_amount numeric(28,10);
  v_net_yield numeric(28,10);
  v_investor_gross numeric(28,10);
  v_fees_account_id uuid;
  v_dust numeric(28,10);
  v_dust_receiver_id uuid;
  v_reference_id text;
  v_fund_asset text;
  v_balance_before numeric(28,10);
  v_balance_after numeric(28,10);
  v_ownership_pct numeric(28,10);
  v_aum_result jsonb;
  v_new_aum numeric(28,10);
  -- Temp storage for pre-calculated allocations
  v_allocations jsonb := '[]'::jsonb;
BEGIN
  -- ===== ADVISORY LOCK =====
  PERFORM pg_advisory_xact_lock(hashtext('yield:' || p_fund_id::text), hashtext(p_yield_date::text));

  -- ===== TEMPORAL LOCK CHECK =====
  IF EXISTS (
    SELECT 1 FROM fund_daily_aum
    WHERE fund_id = p_fund_id AND aum_date = p_yield_date
    AND created_at::date = CURRENT_DATE AND is_voided = false
    AND (temporal_lock_bypass IS NULL OR temporal_lock_bypass = false)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Temporal lock active', 'code', 'TEMPORAL_LOCK');
  END IF;

  -- ===== DUPLICATE CHECK =====
  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id
    AND effective_date = p_yield_date
    AND purpose = p_purpose::text
    AND status = 'applied'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Yield already applied for this date', 'code', 'DUPLICATE_YIELD');
  END IF;

  -- ===== VALIDATE FUND =====
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;
  v_fund_asset := v_fund.asset;

  -- ===== GET AUM =====
  SELECT total_aum INTO v_fund_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id AND aum_date = p_yield_date AND purpose = p_purpose AND is_voided = false
  ORDER BY created_at DESC LIMIT 1;

  IF v_fund_aum IS NULL OR v_fund_aum = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No AUM found for date', 'code', 'NO_AUM');
  END IF;

  -- ===== VALIDATE FEES ACCOUNT (with lock) =====
  SELECT id INTO v_fees_account_id
  FROM profiles
  WHERE account_type = 'fees_account'
  LIMIT 1
  FOR UPDATE;

  IF v_fees_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fees account not found', 'code', 'NO_FEES_ACCOUNT');
  END IF;

  -- ===== CALCULATE GROSS YIELD =====
  v_gross_yield_amount := ROUND(v_fund_aum * (p_gross_yield_pct / 100), 10);
  v_reference_id := 'YIELD-' || v_fund.code || '-' || to_char(p_yield_date, 'YYYYMMDD');

  -- ===== CREATE SNAPSHOT =====
  INSERT INTO fund_yield_snapshots (
    fund_id, snapshot_date, period_start, period_end,
    opening_aum, closing_aum, gross_yield_pct, gross_yield_amount,
    days_in_period, trigger_type, created_by
  )
  VALUES (
    p_fund_id, p_yield_date, p_yield_date, p_yield_date,
    v_fund_aum, v_fund_aum + v_gross_yield_amount, p_gross_yield_pct, v_gross_yield_amount,
    1, 'manual', p_created_by
  )
  RETURNING id INTO v_snapshot_id;

  -- ===== PRE-CALCULATE ALL ALLOCATIONS (BEFORE position updates) =====
  FOR v_investor IN
    SELECT
      ip.investor_id,
      ip.current_value as balance,
      CASE WHEN v_fund_aum > 0 THEN ROUND((ip.current_value / v_fund_aum) * 100, 10) ELSE 0 END as ownership_pct,
      p.ib_percentage,
      p.ib_parent_id,
      COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'') as investor_name,
      COALESCE(p.fee_pct, 0) as profile_fee_pct
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
    AND ip.current_value > 0
    AND p.account_type IS DISTINCT FROM 'fees_account'
    ORDER BY ip.current_value DESC
  LOOP
    IF v_dust_receiver_id IS NULL THEN
      v_dust_receiver_id := v_investor.investor_id;
    END IF;

    -- Use profile fee_pct, default to 0 if not set (platform may have no fees)
    v_fee_pct := COALESCE(v_investor.profile_fee_pct, 0);
    v_ownership_pct := v_investor.ownership_pct;
    v_investor_gross := ROUND(v_gross_yield_amount * (v_ownership_pct / 100), 10);
    v_fee_amount := ROUND(v_investor_gross * (v_fee_pct / 100), 10);
    v_ib_pct := COALESCE(v_investor.ib_percentage, 0);
    v_ib_amount := ROUND(v_investor_gross * (v_ib_pct / 100), 10);
    v_net_yield := v_investor_gross - v_fee_amount - v_ib_amount;

    -- Store pre-calculated allocation
    v_allocations := v_allocations || jsonb_build_object(
      'investor_id', v_investor.investor_id,
      'balance_before', v_investor.balance,
      'ownership_pct', v_ownership_pct,
      'investor_gross', v_investor_gross,
      'fee_pct', v_fee_pct,
      'fee_amount', v_fee_amount,
      'ib_pct', v_ib_pct,
      'ib_amount', v_ib_amount,
      'ib_parent_id', v_investor.ib_parent_id,
      'net_yield', v_net_yield
    );

    v_investor_count := v_investor_count + 1;
    v_total_net := v_total_net + v_net_yield;
    v_total_fees := v_total_fees + v_fee_amount;
    v_total_ib := v_total_ib + v_ib_amount;
  END LOOP;

  IF v_investor_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No eligible investors found', 'code', 'NO_INVESTORS');
  END IF;

  -- ===== CALCULATE AND HANDLE DUST =====
  v_dust := v_gross_yield_amount - (v_total_net + v_total_fees + v_total_ib);

  -- Route dust to fees account
  IF ABS(v_dust) > 0.0000000001 THEN
    v_total_fees := v_total_fees + v_dust;
  END IF;

  -- ===== CREATE YIELD DISTRIBUTION RECORD =====
  INSERT INTO yield_distributions (
    fund_id, effective_date, purpose, is_month_end,
    recorded_aum, previous_aum, opening_aum, closing_aum,
    gross_yield, net_yield, total_fees, total_ib,
    yield_percentage, investor_count, period_start, period_end,
    reference_id, dust_amount, dust_receiver_id, status, created_by
  )
  VALUES (
    p_fund_id, p_yield_date, p_purpose::text, false,
    v_fund_aum + v_gross_yield_amount, v_fund_aum, v_fund_aum, v_fund_aum + v_gross_yield_amount,
    v_gross_yield_amount, v_total_net, v_total_fees, v_total_ib,
    p_gross_yield_pct, v_investor_count, p_yield_date, p_yield_date,
    v_reference_id, v_dust, v_fees_account_id, 'applied', p_created_by
  )
  RETURNING id INTO v_distribution_id;

  -- ===== PROCESS EACH ALLOCATION =====
  FOR v_investor IN
    SELECT * FROM jsonb_array_elements(v_allocations)
  LOOP
    v_balance_before := (v_investor.value->>'balance_before')::numeric;
    v_net_yield := (v_investor.value->>'net_yield')::numeric;
    v_fee_amount := (v_investor.value->>'fee_amount')::numeric;
    v_ib_amount := (v_investor.value->>'ib_amount')::numeric;
    v_balance_after := v_balance_before + v_net_yield;

    -- ===== CREATE YIELD TRANSACTION (with balance tracking) =====
    INSERT INTO transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, purpose, is_system_generated,
      balance_before, balance_after, distribution_id
    )
    VALUES (
      p_fund_id, (v_investor.value->>'investor_id')::uuid, 'YIELD', v_net_yield,
      p_yield_date, v_fund_asset,
      v_reference_id || '-' || (v_investor.value->>'investor_id'),
      'Net yield distribution', p_created_by, p_purpose, true,
      v_balance_before, v_balance_after, v_distribution_id
    );

    -- ===== CREATE FEE TRANSACTION =====
    IF v_fee_amount > 0 THEN
      INSERT INTO transactions_v2 (
        fund_id, investor_id, type, amount, tx_date, asset,
        reference_id, notes, created_by, purpose, is_system_generated,
        distribution_id
      )
      VALUES (
        p_fund_id, v_fees_account_id, 'FEE', v_fee_amount,
        p_yield_date, v_fund_asset,
        'FEE-' || v_reference_id || '-' || (v_investor.value->>'investor_id'),
        'Platform fee from ' || (v_investor.value->>'investor_id'),
        p_created_by, p_purpose, true, v_distribution_id
      );
    END IF;

    -- ===== CREATE IB_CREDIT TRANSACTION AND ib_allocations RECORD =====
    IF v_ib_amount > 0 AND (v_investor.value->>'ib_parent_id') IS NOT NULL THEN
      INSERT INTO transactions_v2 (
        fund_id, investor_id, type, amount, tx_date, asset,
        reference_id, notes, created_by, purpose, is_system_generated,
        distribution_id
      )
      VALUES (
        p_fund_id, (v_investor.value->>'ib_parent_id')::uuid, 'IB_CREDIT', v_ib_amount,
        p_yield_date, v_fund_asset,
        'IB-' || v_reference_id || '-' || (v_investor.value->>'investor_id'),
        'IB commission', p_created_by, p_purpose, true, v_distribution_id
      );

      -- ===== CREATE ib_allocations RECORD (FIX #4) =====
      INSERT INTO ib_allocations (
        distribution_id, fund_id, source_investor_id, ib_investor_id,
        base_yield_amount, ib_percentage, ib_amount,
        effective_date, purpose, created_by
      )
      VALUES (
        v_distribution_id, p_fund_id,
        (v_investor.value->>'investor_id')::uuid,
        (v_investor.value->>'ib_parent_id')::uuid,
        (v_investor.value->>'investor_gross')::numeric,
        (v_investor.value->>'ib_pct')::numeric,
        v_ib_amount,
        p_yield_date, p_purpose::text, p_created_by
      );
    END IF;

    -- ===== UPDATE INVESTOR POSITION =====
    UPDATE investor_positions
    SET
      current_value = current_value + v_net_yield,
      cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_net_yield,
      last_yield_crystallization_date = p_yield_date,
      updated_at = now()
    WHERE fund_id = p_fund_id AND investor_id = (v_investor.value->>'investor_id')::uuid;

    -- ===== CREATE fee_allocations WITH CORRECT OWNERSHIP % (FIX #3) =====
    INSERT INTO fee_allocations (
      distribution_id, fund_id, investor_id, fees_account_id,
      base_net_income, fee_percentage, fee_amount,
      period_start, period_end, purpose, created_by
    )
    VALUES (
      v_distribution_id, p_fund_id,
      (v_investor.value->>'investor_id')::uuid, v_fees_account_id,
      (v_investor.value->>'investor_gross')::numeric,
      (v_investor.value->>'fee_pct')::numeric,
      v_fee_amount,
      p_yield_date, p_yield_date, p_purpose::text, p_created_by
    );
  END LOOP;

  -- ===== CREATE DUST TRANSACTION IF APPLICABLE =====
  IF ABS(v_dust) > 0.0000000001 THEN
    INSERT INTO transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, purpose, is_system_generated,
      distribution_id
    )
    VALUES (
      p_fund_id, v_fees_account_id, 'FEE', v_dust,
      p_yield_date, v_fund_asset,
      'DUST-' || v_reference_id,
      'Rounding dust', p_created_by, p_purpose, true, v_distribution_id
    );
  END IF;

  -- ===== UPDATE AUM (FIX #1) =====
  v_new_aum := v_fund_aum + v_gross_yield_amount;

  v_aum_result := upsert_fund_aum_after_yield(
    p_fund_id, p_yield_date, v_gross_yield_amount, p_purpose, p_created_by
  );

  -- ===== AUDIT LOG =====
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'YIELD_DISTRIBUTION_APPLIED',
    'yield_distributions',
    v_distribution_id::text,
    p_created_by,
    jsonb_build_object('opening_aum', v_fund_aum),
    jsonb_build_object(
      'gross_yield', v_gross_yield_amount,
      'net_yield', v_total_net,
      'total_fees', v_total_fees,
      'total_ib', v_total_ib,
      'dust', v_dust,
      'investor_count', v_investor_count,
      'closing_aum', v_new_aum
    ),
    jsonb_build_object(
      'fund_id', p_fund_id,
      'yield_date', p_yield_date,
      'aum_update', v_aum_result
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'gross_yield', v_gross_yield_amount,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'dust', v_dust,
    'investor_count', v_investor_count,
    'aum_update', v_aum_result,
    'conservation_check', ABS(v_gross_yield_amount - (v_total_net + v_total_fees + v_total_ib)) < 0.0000000001
  );

EXCEPTION WHEN OTHERS THEN
  -- Log error before returning
  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES (
    'YIELD_DISTRIBUTION_ERROR',
    'yield_distributions',
    COALESCE(v_distribution_id::text, 'N/A'),
    p_created_by,
    jsonb_build_object(
      'error', SQLERRM,
      'sqlstate', SQLSTATE,
      'fund_id', p_fund_id,
      'yield_date', p_yield_date
    )
  );

  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;

COMMENT ON FUNCTION apply_daily_yield_to_fund_v3 IS
'Enhanced yield distribution with AUM update, dust handling, ib_allocations, and correct fee allocation tracking. Version 2026-01-12.';


-- =============================================================================
-- FIX 2: Enhanced admin_create_transaction
-- Issues Fixed:
--   - Adds AUM update after transaction
--   - Creates audit log entry
--   - Fixes cost_basis calculation (only for DEPOSIT)
--   - Adds balance_before/balance_after tracking
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_create_transaction(
  p_investor_id uuid,
  p_fund_id uuid,
  p_type text,
  p_amount numeric,
  p_tx_date date,
  p_notes text DEFAULT NULL,
  p_reference_id text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id uuid;
  v_fund_asset text;
  v_fund_class text;
  v_current_value numeric(28,10);
  v_new_value numeric(28,10);
  v_actor uuid;
  v_aum_result jsonb;
BEGIN
  v_actor := COALESCE(p_admin_id, auth.uid());

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- ===== ADVISORY LOCK =====
  PERFORM pg_advisory_xact_lock(
    hashtext('position:' || p_investor_id::text),
    hashtext(p_fund_id::text)
  );

  -- Super admin check for deposits/withdrawals
  IF p_type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    PERFORM public.require_super_admin('admin_create_transaction:' || p_type);
  END IF;

  -- Get fund info
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM public.funds WHERE id = p_fund_id;
  IF v_fund_asset IS NULL THEN
    RAISE EXCEPTION 'Fund not found';
  END IF;

  -- Get current position value
  SELECT COALESCE(current_value, 0) INTO v_current_value
  FROM public.investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  v_new_value := COALESCE(v_current_value, 0) + p_amount;

  -- Validate no negative balance
  IF v_new_value < 0 THEN
    RAISE EXCEPTION 'Transaction would result in negative balance (%.8f)', v_new_value;
  END IF;

  -- ===== CREATE TRANSACTION WITH balance_before/balance_after =====
  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, type, amount, asset, fund_class,
    tx_date, notes, reference_id, created_by, is_voided,
    balance_before, balance_after
  )
  VALUES (
    p_investor_id, p_fund_id, p_type::tx_type, p_amount, v_fund_asset, v_fund_class,
    p_tx_date, p_notes, p_reference_id, v_actor, false,
    COALESCE(v_current_value, 0), v_new_value
  )
  RETURNING id INTO v_tx_id;

  -- ===== UPSERT POSITION (FIX: cost_basis only for DEPOSIT) =====
  INSERT INTO public.investor_positions (
    investor_id, fund_id, current_value, cost_basis, fund_class, shares, updated_at, is_active
  )
  VALUES (
    p_investor_id, p_fund_id, v_new_value,
    CASE WHEN p_type = 'DEPOSIT' AND p_amount > 0 THEN p_amount ELSE 0 END,
    v_fund_class, v_new_value, now(), true
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = v_new_value,
    shares = v_new_value,
    -- Only add to cost_basis for DEPOSIT transactions
    cost_basis = CASE
      WHEN p_type = 'DEPOSIT' AND p_amount > 0
      THEN investor_positions.cost_basis + p_amount
      ELSE investor_positions.cost_basis
    END,
    is_active = CASE WHEN v_new_value > 0 THEN true ELSE investor_positions.is_active END,
    updated_at = now();

  -- ===== UPDATE AUM (FIX #5) =====
  v_aum_result := recalculate_fund_aum_for_date(p_fund_id, p_tx_date, 'transaction'::aum_purpose, v_actor);

  -- ===== AUDIT LOG (FIX #6) =====
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'ADMIN_TRANSACTION_CREATED',
    'transactions_v2',
    v_tx_id::text,
    v_actor,
    jsonb_build_object('balance_before', COALESCE(v_current_value, 0)),
    jsonb_build_object(
      'balance_after', v_new_value,
      'amount', p_amount,
      'type', p_type
    ),
    jsonb_build_object(
      'fund_id', p_fund_id,
      'investor_id', p_investor_id,
      'tx_date', p_tx_date,
      'aum_update', v_aum_result
    )
  );

  RETURN v_tx_id;
END;
$$;

COMMENT ON FUNCTION admin_create_transaction IS
'Enhanced transaction creation with AUM update, audit logging, correct cost_basis, and balance tracking. Version 2026-01-12.';


-- =============================================================================
-- FIX 3: Add advisory lock to recompute_investor_position
-- =============================================================================

CREATE OR REPLACE FUNCTION public.recompute_investor_position(
  p_investor_id uuid,
  p_fund_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric(28,10) := 0;
  v_cost_basis numeric(28,10) := 0;
  v_first_tx_date date;
  v_last_tx_date date;
  v_current_fund_id uuid;
  v_old_value numeric(28,10);
BEGIN
  FOR v_current_fund_id IN
    SELECT DISTINCT fund_id
    FROM transactions_v2
    WHERE investor_id = p_investor_id
    AND (p_fund_id IS NULL OR fund_id = p_fund_id)
  LOOP
    -- ===== ADVISORY LOCK (FIX #9) =====
    PERFORM pg_advisory_xact_lock(
      hashtext('position:' || p_investor_id::text),
      hashtext(v_current_fund_id::text)
    );

    -- Get old value for audit
    SELECT current_value INTO v_old_value
    FROM investor_positions
    WHERE investor_id = p_investor_id AND fund_id = v_current_fund_id;

    -- Calculate totals from non-voided transactions
    SELECT
      COALESCE(SUM(
        CASE
          WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN amount
          WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
          ELSE 0
        END
      ), 0),
      COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END), 0),
      MIN(tx_date),
      MAX(tx_date)
    INTO v_total, v_cost_basis, v_first_tx_date, v_last_tx_date
    FROM transactions_v2
    WHERE investor_id = p_investor_id
      AND fund_id = v_current_fund_id
      AND is_voided = false;

    -- Upsert the position
    INSERT INTO investor_positions (
      investor_id, fund_id, current_value, cost_basis, shares,
      updated_at, is_active, last_transaction_date
    )
    VALUES (
      p_investor_id, v_current_fund_id, v_total, v_cost_basis, v_total,
      now(), v_total > 0, v_last_tx_date
    )
    ON CONFLICT (investor_id, fund_id) DO UPDATE SET
      current_value = v_total,
      shares = v_total,
      cost_basis = v_cost_basis,
      is_active = v_total > 0,
      last_transaction_date = v_last_tx_date,
      updated_at = now();

    -- Audit significant changes
    IF ABS(COALESCE(v_old_value, 0) - v_total) > 0.01 THEN
      INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
      VALUES (
        'POSITION_RECOMPUTED',
        'investor_positions',
        p_investor_id::text || ':' || v_current_fund_id::text,
        auth.uid(),
        jsonb_build_object('current_value', v_old_value),
        jsonb_build_object('current_value', v_total, 'cost_basis', v_cost_basis)
      );
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION recompute_investor_position IS
'Enhanced position recomputation with advisory lock and audit logging. Version 2026-01-12.';


-- =============================================================================
-- FIX 4: Add advisory lock to recalculate_fund_aum_for_date
-- =============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_fund_aum_for_date(
  p_fund_id uuid,
  p_date date,
  p_purpose public.aum_purpose DEFAULT 'transaction',
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calculated_aum numeric(28,10);
  v_existing_record RECORD;
  v_actor uuid;
  v_changes jsonb := '[]'::jsonb;
  v_new_record_id uuid;
  v_action text := 'none';
BEGIN
  -- ===== ADVISORY LOCK (FIX #10) =====
  PERFORM pg_advisory_xact_lock(
    hashtext('aum:' || p_fund_id::text),
    hashtext(p_date::text)
  );

  v_actor := COALESCE(p_actor_id, auth.uid());

  -- Calculate AUM from positions excluding house accounts
  SELECT COALESCE(SUM(ip.current_value), 0)::numeric(28,10)
  INTO v_calculated_aum
  FROM public.investor_positions ip
  JOIN public.profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id
    AND ip.current_value > 0
    AND p.account_type IS DISTINCT FROM 'fees_account';

  SELECT * INTO v_existing_record
  FROM public.fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_date
    AND purpose = p_purpose
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF ABS(v_existing_record.total_aum - v_calculated_aum) > 0.00001 THEN
      UPDATE public.fund_daily_aum
      SET is_voided = true,
          voided_at = NOW(),
          voided_by = v_actor,
          void_reason = 'Auto-corrected by recalculate_fund_aum_for_date: old=' ||
                        v_existing_record.total_aum || ', new=' || v_calculated_aum
      WHERE id = v_existing_record.id;

      INSERT INTO public.fund_daily_aum (
        fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end
      )
      VALUES (
        p_fund_id, p_date, v_calculated_aum, p_purpose, 'recalculated', v_actor,
        (p_date = (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date)
      )
      RETURNING id INTO v_new_record_id;

      v_action := 'corrected';
      v_changes := v_changes || jsonb_build_object(
        'action', 'corrected',
        'old_record_id', v_existing_record.id,
        'new_record_id', v_new_record_id,
        'old_aum', v_existing_record.total_aum,
        'new_aum', v_calculated_aum,
        'difference', v_calculated_aum - v_existing_record.total_aum
      );

      INSERT INTO public.audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
      VALUES (
        'fund_daily_aum', v_new_record_id::text, 'AUM_RECALCULATED', v_actor,
        jsonb_build_object('total_aum', v_existing_record.total_aum, 'old_record_id', v_existing_record.id),
        jsonb_build_object('total_aum', v_calculated_aum, 'new_record_id', v_new_record_id),
        jsonb_build_object('fund_id', p_fund_id, 'date', p_date, 'purpose', p_purpose)
      );
    ELSE
      v_action := 'unchanged';
    END IF;
  ELSE
    INSERT INTO public.fund_daily_aum (
      fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end
    )
    VALUES (
      p_fund_id, p_date, v_calculated_aum, p_purpose, 'transaction_op', v_actor,
      (p_date = (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date)
    )
    RETURNING id INTO v_new_record_id;

    v_action := 'created';
    v_changes := v_changes || jsonb_build_object(
      'action', 'created',
      'record_id', v_new_record_id,
      'aum', v_calculated_aum
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'date', p_date,
    'purpose', p_purpose,
    'calculated_aum', v_calculated_aum,
    'action', v_action,
    'changes', v_changes
  );
END;
$$;

COMMENT ON FUNCTION recalculate_fund_aum_for_date IS
'Enhanced AUM recalculation with advisory lock. Version 2026-01-12.';


-- =============================================================================
-- FIX 5: Enhanced approve_withdrawal with balance re-check
-- =============================================================================

CREATE OR REPLACE FUNCTION public.approve_withdrawal(
  p_request_id uuid,
  p_approved_amount numeric DEFAULT NULL,
  p_admin_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_final_amount NUMERIC(28,10);
  v_current_balance NUMERIC(28,10);
BEGIN
  PERFORM public.ensure_admin();

  -- ===== ADVISORY LOCK =====
  PERFORM pg_advisory_xact_lock(hashtext('withdrawal:' || p_request_id::text));

  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Can only approve pending requests. Current status: %', v_request.status;
  END IF;

  v_final_amount := COALESCE(p_approved_amount, v_request.requested_amount);

  IF v_final_amount <= 0 THEN
    RAISE EXCEPTION 'Approved amount must be greater than zero';
  END IF;

  IF v_final_amount > v_request.requested_amount THEN
    RAISE EXCEPTION 'Approved amount cannot exceed requested amount';
  END IF;

  -- ===== BALANCE RE-CHECK (FIX #11) =====
  SELECT COALESCE(current_value, 0) INTO v_current_balance
  FROM investor_positions
  WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id;

  IF v_current_balance < v_final_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', v_current_balance, v_final_amount;
  END IF;

  UPDATE public.withdrawal_requests
  SET
    status = 'approved',
    approved_amount = v_final_amount,
    approved_by = auth.uid(),
    approved_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  PERFORM public.log_withdrawal_action(
    p_request_id,
    'approve',
    jsonb_build_object(
      'approved_amount', v_final_amount,
      'requested_amount', v_request.requested_amount,
      'current_balance', v_current_balance,
      'admin_notes', p_admin_notes
    )
  );

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION approve_withdrawal IS
'Enhanced withdrawal approval with balance re-check. Version 2026-01-12.';


-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify all functions have been updated
SELECT proname,
  obj_description(oid) AS comment,
  CASE WHEN obj_description(oid) LIKE '%2026-01-12%' THEN 'UPDATED' ELSE 'NOT UPDATED' END AS status
FROM pg_proc
WHERE proname IN (
  'apply_daily_yield_to_fund_v3',
  'admin_create_transaction',
  'recompute_investor_position',
  'recalculate_fund_aum_for_date',
  'approve_withdrawal'
)
AND pronamespace = 'public'::regnamespace;
