-- ============================================================================
-- UNIFIED AUM MANAGEMENT MIGRATION
-- ============================================================================
-- Implements a unified AUM management system that automatically maintains
-- fund_daily_aum records for ALL transaction operations:
-- - Adding deposits, withdrawals, yields
-- - Voiding deposits, withdrawals, yields
-- ============================================================================

-- ============================================================================
-- PHASE 1: Create Core AUM Recalculation Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_fund_aum_for_date(
  p_fund_id uuid,
  p_date date,
  p_purpose aum_purpose DEFAULT 'transaction',
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_calculated_aum numeric;
  v_existing_record RECORD;
  v_actor uuid;
  v_changes jsonb := '[]'::jsonb;
  v_new_record_id uuid;
  v_action text := 'none';
BEGIN
  v_actor := COALESCE(p_actor_id, auth.uid());
  
  -- Calculate current AUM from non-voided positions for this fund
  SELECT COALESCE(SUM(current_value), 0)
  INTO v_calculated_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id 
    AND current_value > 0;
  
  -- Check for existing non-voided record for this date/purpose
  SELECT * INTO v_existing_record
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id 
    AND aum_date = p_date 
    AND purpose = p_purpose
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    -- Record exists - check if value differs
    IF ABS(v_existing_record.total_aum - v_calculated_aum) > 0.00001 THEN
      -- Void old record
      UPDATE fund_daily_aum
      SET is_voided = true,
          voided_at = NOW(),
          voided_by = v_actor,
          void_reason = 'Auto-corrected by recalculate_fund_aum_for_date: old=' || v_existing_record.total_aum || ', new=' || v_calculated_aum
      WHERE id = v_existing_record.id;
      
      -- Create corrected record
      INSERT INTO fund_daily_aum (
        fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end
      )
      VALUES (
        p_fund_id, 
        p_date, 
        v_calculated_aum, 
        p_purpose, 
        'recalculated', 
        v_actor,
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
      
      -- Audit log
      INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
      VALUES (
        'fund_daily_aum',
        v_new_record_id::text,
        'AUM_RECALCULATED',
        v_actor,
        jsonb_build_object('total_aum', v_existing_record.total_aum, 'old_record_id', v_existing_record.id),
        jsonb_build_object('total_aum', v_calculated_aum, 'new_record_id', v_new_record_id),
        jsonb_build_object('fund_id', p_fund_id, 'date', p_date, 'purpose', p_purpose)
      );
    ELSE
      -- Values match, no change needed
      v_action := 'unchanged';
    END IF;
  ELSE
    -- No existing record - create new one
    INSERT INTO fund_daily_aum (
      fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end
    )
    VALUES (
      p_fund_id, 
      p_date, 
      v_calculated_aum, 
      p_purpose, 
      'transaction_op', 
      v_actor,
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

GRANT EXECUTE ON FUNCTION public.recalculate_fund_aum_for_date(uuid, date, aum_purpose, uuid) TO authenticated;

COMMENT ON FUNCTION public.recalculate_fund_aum_for_date IS 
'Recalculates fund AUM for a specific date based on current positions. Creates/corrects fund_daily_aum records.';

-- ============================================================================
-- PHASE 2: Enhance adjust_investor_position to Update AUM
-- ============================================================================

DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text);

CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_investor_id uuid,
  p_fund_id uuid,
  p_delta numeric,
  p_note text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL,
  p_tx_type text DEFAULT 'ADJUSTMENT',
  p_tx_date date DEFAULT CURRENT_DATE,
  p_reference_id text DEFAULT NULL
)
RETURNS TABLE(
  out_success boolean,
  out_message text,
  out_investor_id uuid,
  out_fund_id uuid,
  out_old_balance numeric,
  out_new_balance numeric,
  out_transaction_id uuid,
  out_reference_id text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_value numeric;
  v_new_balance numeric;
  v_tx_id uuid;
  v_fund_asset text;
  v_fund_class text;
  v_final_reference_id text;
  v_effective_type text;
  v_aum_result jsonb;
BEGIN
  -- Validate inputs
  IF p_investor_id IS NULL THEN
    RETURN QUERY SELECT false, 'investor_id is required'::text, NULL::uuid, NULL::uuid, NULL::numeric, NULL::numeric, NULL::uuid, NULL::text;
    RETURN;
  END IF;
  
  IF p_fund_id IS NULL THEN
    RETURN QUERY SELECT false, 'fund_id is required'::text, NULL::uuid, NULL::uuid, NULL::numeric, NULL::numeric, NULL::uuid, NULL::text;
    RETURN;
  END IF;
  
  IF p_delta IS NULL OR p_delta = 0 THEN
    RETURN QUERY SELECT false, 'delta must be non-zero'::text, NULL::uuid, NULL::uuid, NULL::numeric, NULL::numeric, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  -- Verify fund exists and get asset/class
  SELECT f.asset, f.fund_class INTO v_fund_asset, v_fund_class
  FROM public.funds f
  WHERE f.id = p_fund_id;
  
  IF v_fund_asset IS NULL THEN
    RETURN QUERY SELECT false, ('Fund not found: ' || p_fund_id)::text, NULL::uuid, NULL::uuid, NULL::numeric, NULL::numeric, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  -- Verify investor exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = p_investor_id) THEN
    RETURN QUERY SELECT false, ('Investor not found: ' || p_investor_id)::text, NULL::uuid, NULL::uuid, NULL::numeric, NULL::numeric, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  -- Map transaction type
  v_effective_type := CASE 
    WHEN UPPER(p_tx_type) IN ('DEPOSIT', 'SUBSCRIPTION', 'FIRST_INVESTMENT') THEN 'DEPOSIT'
    WHEN UPPER(p_tx_type) IN ('WITHDRAWAL', 'REDEMPTION') THEN 'WITHDRAWAL'
    WHEN UPPER(p_tx_type) = 'YIELD' THEN 'YIELD'
    WHEN UPPER(p_tx_type) = 'FEE' THEN 'FEE'
    ELSE 'ADJUSTMENT'
  END;

  -- Get current position value
  SELECT COALESCE(ip.current_value, 0)
  INTO v_current_value
  FROM public.investor_positions ip
  WHERE ip.investor_id = p_investor_id AND ip.fund_id = p_fund_id;
  
  v_current_value := COALESCE(v_current_value, 0);
  v_new_balance := v_current_value + p_delta;
  
  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT false, ('Insufficient balance. Current: ' || v_current_value || ', Requested: ' || ABS(p_delta))::text, NULL::uuid, NULL::uuid, NULL::numeric, NULL::numeric, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  -- Generate unique reference_id if not provided
  v_final_reference_id := COALESCE(
    p_reference_id, 
    'adj_' || SUBSTRING(p_investor_id::text, 1, 8) || '_' || SUBSTRING(gen_random_uuid()::text, 1, 8)
  );

  -- Create transaction record
  INSERT INTO public.transactions_v2 (
    investor_id,
    fund_id,
    type,
    amount,
    asset,
    fund_class,
    tx_date,
    notes,
    reference_id,
    created_by,
    source,
    is_system_generated,
    visibility_scope
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_effective_type::tx_type,
    p_delta,
    v_fund_asset,
    v_fund_class,
    p_tx_date,
    COALESCE(p_note, 'Position adjustment'),
    v_final_reference_id,
    p_admin_id,
    'manual_admin'::tx_source,
    false,
    'admin_only'::visibility_scope
  )
  RETURNING id INTO v_tx_id;

  -- Upsert investor position
  INSERT INTO public.investor_positions (
    investor_id,
    fund_id,
    current_value,
    cost_basis,
    fund_class,
    created_at,
    updated_at
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_new_balance,
    CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END,
    v_fund_class,
    NOW(),
    NOW()
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = v_new_balance,
    cost_basis = CASE 
      WHEN p_delta > 0 THEN investor_positions.cost_basis + p_delta 
      ELSE investor_positions.cost_basis 
    END,
    updated_at = NOW();

  -- *** NEW: Recalculate AUM for the transaction date ***
  v_aum_result := recalculate_fund_aum_for_date(
    p_fund_id,
    p_tx_date,
    'transaction'::aum_purpose,
    COALESCE(p_admin_id, auth.uid())
  );

  -- Return success
  RETURN QUERY SELECT
    true,
    'Position adjusted successfully'::text,
    p_investor_id,
    p_fund_id,
    v_current_value,
    v_new_balance,
    v_tx_id,
    v_final_reference_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text) TO authenticated;

-- ============================================================================
-- PHASE 3: Enhance void_transaction to Recalculate AUM
-- ============================================================================

DROP FUNCTION IF EXISTS public.void_transaction(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.void_transaction(uuid, text);

CREATE OR REPLACE FUNCTION public.void_transaction(
  p_transaction_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_actor uuid;
  v_projected_balance numeric;
  v_aum_result jsonb;
BEGIN
  v_actor := COALESCE(p_actor_id, auth.uid());
  
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;
  
  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided';
  END IF;
  
  -- Calculate projected balance after voiding
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
      ELSE 0
    END
  ), 0)
  INTO v_projected_balance
  FROM transactions_v2
  WHERE investor_id = v_tx.investor_id 
    AND fund_id = v_tx.fund_id
    AND is_voided = false
    AND id != p_transaction_id;
  
  IF v_projected_balance < 0 THEN
    RAISE EXCEPTION 'Cannot void: would result in negative balance (%). Void related withdrawals first.', ROUND(v_projected_balance, 4);
  END IF;
  
  -- Mark transaction as voided
  UPDATE transactions_v2
  SET 
    is_voided = true,
    void_reason = p_reason,
    voided_by = v_actor,
    voided_at = NOW()
  WHERE id = p_transaction_id;
  
  -- Recompute investor position
  PERFORM recompute_investor_position(v_tx.investor_id, v_tx.fund_id);
  
  -- *** NEW: Recalculate AUM for the transaction's date ***
  IF v_tx.fund_id IS NOT NULL THEN
    v_aum_result := recalculate_fund_aum_for_date(
      v_tx.fund_id,
      v_tx.tx_date,
      'transaction'::aum_purpose,
      v_actor
    );
  END IF;
  
  -- Audit log
  INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
  VALUES (
    'transactions_v2',
    p_transaction_id::text,
    'VOID',
    v_actor,
    jsonb_build_object('is_voided', false),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object(
      'transaction_type', v_tx.type, 
      'amount', v_tx.amount,
      'tx_date', v_tx.tx_date,
      'aum_update', COALESCE(v_aum_result, '{}'::jsonb)
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'voided_at', NOW(),
    'aum_updated', v_aum_result IS NOT NULL,
    'aum_result', COALESCE(v_aum_result, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.void_transaction(uuid, text, uuid) TO authenticated;

-- ============================================================================
-- PHASE 4: Enhance void_fund_daily_aum to Cascade Void YIELD Transactions
-- ============================================================================

DROP FUNCTION IF EXISTS public.void_fund_daily_aum(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.void_fund_daily_aum(
  p_record_id uuid,
  p_reason text,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_voided_tx_count integer := 0;
  v_affected_investors uuid[];
  v_investor_id uuid;
BEGIN
  -- Validate admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can void yield records';
  END IF;

  -- Get record
  SELECT * INTO v_record
  FROM fund_daily_aum
  WHERE id = p_record_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found';
  END IF;

  IF v_record.is_voided THEN
    RAISE EXCEPTION 'Record is already voided';
  END IF;

  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A reason of at least 5 characters is required';
  END IF;

  -- *** NEW: Cascade void related YIELD/INTEREST transactions ***
  -- Find affected investors first
  SELECT ARRAY_AGG(DISTINCT investor_id)
  INTO v_affected_investors
  FROM transactions_v2
  WHERE fund_id = v_record.fund_id
    AND tx_date = v_record.aum_date
    AND type IN ('YIELD', 'INTEREST', 'FEE', 'FEE_CREDIT', 'IB_CREDIT')
    AND is_voided = false;

  -- Void the transactions
  UPDATE transactions_v2
  SET is_voided = true,
      void_reason = 'Cascade void from fund_daily_aum: ' || p_reason,
      voided_at = NOW(),
      voided_by = p_admin_id
  WHERE fund_id = v_record.fund_id
    AND tx_date = v_record.aum_date
    AND type IN ('YIELD', 'INTEREST', 'FEE', 'FEE_CREDIT', 'IB_CREDIT')
    AND is_voided = false;
  
  GET DIAGNOSTICS v_voided_tx_count = ROW_COUNT;

  -- Void related fee_allocations
  UPDATE fee_allocations
  SET is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id
  WHERE fund_id = v_record.fund_id
    AND period_end = v_record.aum_date
    AND is_voided = false;

  -- Void related ib_allocations
  UPDATE ib_allocations
  SET is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id
  WHERE fund_id = v_record.fund_id
    AND effective_date = v_record.aum_date
    AND is_voided = false;

  -- *** NEW: Recompute affected investor positions ***
  IF v_affected_investors IS NOT NULL THEN
    FOREACH v_investor_id IN ARRAY v_affected_investors
    LOOP
      PERFORM recompute_investor_position(v_investor_id, v_record.fund_id);
    END LOOP;
  END IF;

  -- Mark AUM record as voided
  UPDATE fund_daily_aum
  SET 
    is_voided = true,
    voided_at = NOW(),
    voided_by = p_admin_id,
    void_reason = p_reason
  WHERE id = p_record_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'void_fund_daily_aum',
    'fund_daily_aum',
    p_record_id::TEXT,
    p_admin_id,
    jsonb_build_object(
      'fund_id', v_record.fund_id,
      'aum_date', v_record.aum_date,
      'total_aum', v_record.total_aum,
      'purpose', v_record.purpose
    ),
    jsonb_build_object('is_voided', true, 'reason', p_reason),
    jsonb_build_object(
      'voided_transactions', v_voided_tx_count,
      'affected_investors', COALESCE(array_length(v_affected_investors, 1), 0)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', v_record.fund_id,
    'aum_date', v_record.aum_date,
    'purpose', v_record.purpose,
    'voided_at', NOW(),
    'cascade_voided_transactions', v_voided_tx_count,
    'affected_investors', COALESCE(array_length(v_affected_investors, 1), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.void_fund_daily_aum(uuid, text, uuid) TO authenticated;

-- ============================================================================
-- PHASE 5: Create AUM Integrity Check Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_and_fix_aum_integrity(
  p_fund_id uuid DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_aum_record RECORD;
  v_calculated_aum numeric;
  v_discrepancies jsonb := '[]'::jsonb;
  v_fixed_count integer := 0;
  v_total_checked integer := 0;
  v_fix_result jsonb;
BEGIN
  -- Require admin for this operation
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can run integrity checks';
  END IF;

  -- Iterate through fund_daily_aum records
  FOR v_aum_record IN 
    SELECT fda.*, f.code as fund_code, f.name as fund_name
    FROM fund_daily_aum fda
    JOIN funds f ON f.id = fda.fund_id
    WHERE fda.is_voided = false
      AND (p_fund_id IS NULL OR fda.fund_id = p_fund_id)
      AND (p_start_date IS NULL OR fda.aum_date >= p_start_date)
      AND (p_end_date IS NULL OR fda.aum_date <= p_end_date)
    ORDER BY fda.fund_id, fda.aum_date
  LOOP
    v_total_checked := v_total_checked + 1;
    
    -- Calculate what AUM should be based on positions
    SELECT COALESCE(SUM(current_value), 0)
    INTO v_calculated_aum
    FROM investor_positions
    WHERE fund_id = v_aum_record.fund_id
      AND current_value > 0;
    
    -- Check for discrepancy (allow small rounding differences)
    IF ABS(v_aum_record.total_aum - v_calculated_aum) > 0.01 THEN
      v_discrepancies := v_discrepancies || jsonb_build_object(
        'record_id', v_aum_record.id,
        'fund_id', v_aum_record.fund_id,
        'fund_code', v_aum_record.fund_code,
        'aum_date', v_aum_record.aum_date,
        'purpose', v_aum_record.purpose,
        'recorded_aum', v_aum_record.total_aum,
        'calculated_aum', v_calculated_aum,
        'difference', v_calculated_aum - v_aum_record.total_aum
      );
      
      -- Fix if not dry run
      IF NOT p_dry_run THEN
        v_fix_result := recalculate_fund_aum_for_date(
          v_aum_record.fund_id,
          v_aum_record.aum_date,
          v_aum_record.purpose,
          auth.uid()
        );
        
        IF (v_fix_result->>'success')::boolean THEN
          v_fixed_count := v_fixed_count + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'dry_run', p_dry_run,
    'total_checked', v_total_checked,
    'discrepancies_found', jsonb_array_length(v_discrepancies),
    'fixed_count', v_fixed_count,
    'discrepancies', v_discrepancies
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_fix_aum_integrity(uuid, date, date, boolean) TO authenticated;

COMMENT ON FUNCTION public.check_and_fix_aum_integrity IS 
'Scans fund_daily_aum records and compares against calculated positions. Use dry_run=false to auto-fix discrepancies.';

-- ============================================================================
-- PHASE 6: Create Void Impact Preview Functions
-- ============================================================================

-- Function to preview impact of voiding a transaction
CREATE OR REPLACE FUNCTION public.get_void_transaction_impact(
  p_transaction_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_current_position numeric;
  v_projected_position numeric;
  v_aum_records_count integer;
  v_related_records jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  IF v_tx.is_voided THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction already voided');
  END IF;
  
  -- Get current position
  SELECT COALESCE(current_value, 0)
  INTO v_current_position
  FROM investor_positions
  WHERE investor_id = v_tx.investor_id AND fund_id = v_tx.fund_id;
  
  -- Calculate projected position after void
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
      ELSE 0
    END
  ), 0)
  INTO v_projected_position
  FROM transactions_v2
  WHERE investor_id = v_tx.investor_id 
    AND fund_id = v_tx.fund_id
    AND is_voided = false
    AND id != p_transaction_id;
  
  -- Count AUM records that would be affected
  SELECT COUNT(*)
  INTO v_aum_records_count
  FROM fund_daily_aum
  WHERE fund_id = v_tx.fund_id
    AND aum_date = v_tx.tx_date
    AND is_voided = false;
  
  -- Check for related fee allocations
  IF EXISTS (SELECT 1 FROM fee_allocations WHERE distribution_id = v_tx.distribution_id AND is_voided = false) THEN
    v_related_records := v_related_records || jsonb_build_object('type', 'fee_allocations', 'count', 
      (SELECT COUNT(*) FROM fee_allocations WHERE distribution_id = v_tx.distribution_id AND is_voided = false));
  END IF;
  
  -- Check for related IB allocations
  IF EXISTS (SELECT 1 FROM ib_allocations WHERE distribution_id = v_tx.distribution_id AND is_voided = false) THEN
    v_related_records := v_related_records || jsonb_build_object('type', 'ib_allocations', 'count',
      (SELECT COUNT(*) FROM ib_allocations WHERE distribution_id = v_tx.distribution_id AND is_voided = false));
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'transaction_type', v_tx.type,
    'transaction_amount', v_tx.amount,
    'transaction_date', v_tx.tx_date,
    'current_position', COALESCE(v_current_position, 0),
    'projected_position', v_projected_position,
    'position_change', v_projected_position - COALESCE(v_current_position, 0),
    'would_go_negative', v_projected_position < 0,
    'aum_records_affected', v_aum_records_count,
    'related_records', v_related_records,
    'is_system_generated', COALESCE(v_tx.is_system_generated, false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_void_transaction_impact(uuid) TO authenticated;

-- Function to preview impact of voiding a yield AUM record
CREATE OR REPLACE FUNCTION public.get_void_yield_impact(
  p_record_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_tx_count integer;
  v_affected_investors jsonb;
BEGIN
  SELECT * INTO v_record
  FROM fund_daily_aum
  WHERE id = p_record_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Record not found');
  END IF;
  
  IF v_record.is_voided THEN
    RETURN jsonb_build_object('success', false, 'error', 'Record already voided');
  END IF;
  
  -- Count transactions that would be voided
  SELECT COUNT(*)
  INTO v_tx_count
  FROM transactions_v2
  WHERE fund_id = v_record.fund_id
    AND tx_date = v_record.aum_date
    AND type IN ('YIELD', 'INTEREST', 'FEE', 'FEE_CREDIT', 'IB_CREDIT')
    AND is_voided = false;
  
  -- Get affected investors with their projected changes
  SELECT jsonb_agg(jsonb_build_object(
    'investor_id', t.investor_id,
    'investor_name', p.display_name,
    'current_position', ip.current_value,
    'yield_amount', SUM(CASE WHEN t.type IN ('YIELD', 'INTEREST') THEN t.amount ELSE 0 END),
    'fee_amount', SUM(CASE WHEN t.type = 'FEE' THEN t.amount ELSE 0 END)
  ))
  INTO v_affected_investors
  FROM transactions_v2 t
  JOIN profiles p ON p.id = t.investor_id
  LEFT JOIN investor_positions ip ON ip.investor_id = t.investor_id AND ip.fund_id = t.fund_id
  WHERE t.fund_id = v_record.fund_id
    AND t.tx_date = v_record.aum_date
    AND t.type IN ('YIELD', 'INTEREST', 'FEE', 'FEE_CREDIT', 'IB_CREDIT')
    AND t.is_voided = false
  GROUP BY t.investor_id, p.display_name, ip.current_value;
  
  RETURN jsonb_build_object(
    'success', true,
    'record_id', p_record_id,
    'fund_id', v_record.fund_id,
    'aum_date', v_record.aum_date,
    'total_aum', v_record.total_aum,
    'purpose', v_record.purpose,
    'transactions_to_void', v_tx_count,
    'affected_investors', COALESCE(v_affected_investors, '[]'::jsonb),
    'affected_investor_count', COALESCE(jsonb_array_length(v_affected_investors), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_void_yield_impact(uuid) TO authenticated;

-- ============================================================================
-- Notify PostgREST to reload schema
-- ============================================================================
NOTIFY pgrst, 'reload schema';