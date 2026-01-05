-- ============================================
-- Complete Void Cascade Fix
-- Ensures voiding AUM records cascades to ALL related tables
-- ============================================

-- Part 1: Enhanced void_fund_daily_aum with complete cascade
CREATE OR REPLACE FUNCTION public.void_fund_daily_aum(
  p_record_id uuid, 
  p_reason text, 
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_voided_tx_count integer := 0;
  v_voided_dist_count integer := 0;
  v_voided_events_count integer := 0;
  v_voided_fee_count integer := 0;
  v_voided_ib_count integer := 0;
  v_affected_investors uuid[];
  v_investor_id uuid;
BEGIN
  -- Validate admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can void yield records';
  END IF;

  -- Get record
  SELECT * INTO v_record FROM fund_daily_aum WHERE id = p_record_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
  IF v_record.is_voided THEN RAISE EXCEPTION 'Record is already voided'; END IF;
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A reason of at least 5 characters is required';
  END IF;

  -- 1. Void yield_distributions (this triggers cascade to allocations via triggers)
  UPDATE yield_distributions
  SET status = 'voided',
      voided_at = NOW(),
      voided_by = p_admin_id,
      void_reason = 'Cascade from fund_daily_aum: ' || p_reason
  WHERE fund_id = v_record.fund_id
    AND effective_date = v_record.aum_date
    AND purpose::text = v_record.purpose::text
    AND status != 'voided';
  GET DIAGNOSTICS v_voided_dist_count = ROW_COUNT;

  -- 2. Find affected investors from transactions
  SELECT ARRAY_AGG(DISTINCT investor_id)
  INTO v_affected_investors
  FROM transactions_v2
  WHERE fund_id = v_record.fund_id
    AND tx_date = v_record.aum_date
    AND type IN ('YIELD', 'INTEREST', 'FEE', 'FEE_CREDIT', 'IB_CREDIT')
    AND is_voided = false;

  -- 3. Void transactions
  UPDATE transactions_v2
  SET is_voided = true,
      void_reason = 'Cascade from fund_daily_aum: ' || p_reason,
      voided_at = NOW(),
      voided_by = p_admin_id
  WHERE fund_id = v_record.fund_id
    AND tx_date = v_record.aum_date
    AND type IN ('YIELD', 'INTEREST', 'FEE', 'FEE_CREDIT', 'IB_CREDIT')
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_tx_count = ROW_COUNT;

  -- 4. Void investor_yield_events directly (in case trigger didn't catch all)
  UPDATE investor_yield_events
  SET is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id
  WHERE fund_id = v_record.fund_id
    AND event_date = v_record.aum_date
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_events_count = ROW_COUNT;

  -- 5. Void fee_allocations (broader matching)
  UPDATE fee_allocations
  SET is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id
  WHERE fund_id = v_record.fund_id
    AND period_end = v_record.aum_date
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_fee_count = ROW_COUNT;

  -- 6. Void ib_allocations (broader matching)
  UPDATE ib_allocations
  SET is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id
  WHERE fund_id = v_record.fund_id
    AND effective_date = v_record.aum_date
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_ib_count = ROW_COUNT;

  -- 7. Recompute affected investor positions
  IF v_affected_investors IS NOT NULL THEN
    FOREACH v_investor_id IN ARRAY v_affected_investors
    LOOP
      PERFORM recompute_investor_position(v_investor_id, v_record.fund_id);
    END LOOP;
  END IF;

  -- 8. Mark AUM record as voided
  UPDATE fund_daily_aum
  SET is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id,
      void_reason = p_reason
  WHERE id = p_record_id;

  -- 9. Comprehensive audit log
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
      'voided_distributions', v_voided_dist_count,
      'voided_yield_events', v_voided_events_count,
      'voided_fee_allocations', v_voided_fee_count,
      'voided_ib_allocations', v_voided_ib_count,
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
    'cascade_voided_distributions', v_voided_dist_count,
    'cascade_voided_yield_events', v_voided_events_count,
    'cascade_voided_fee_allocations', v_voided_fee_count,
    'cascade_voided_ib_allocations', v_voided_ib_count,
    'affected_investors', COALESCE(array_length(v_affected_investors, 1), 0)
  );
END;
$$;

-- Part 2: New void_yield_distribution function for direct distribution voiding
CREATE OR REPLACE FUNCTION public.void_yield_distribution(
  p_distribution_id uuid,
  p_reason text,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dist RECORD;
  v_affected_investors uuid[];
  v_investor_id uuid;
  v_voided_tx_count integer := 0;
  v_voided_fee_count integer := 0;
  v_voided_ib_count integer := 0;
  v_voided_events_count integer := 0;
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can void distributions';
  END IF;

  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A reason of at least 5 characters is required';
  END IF;

  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Distribution not found'; END IF;
  IF v_dist.status = 'voided' THEN RAISE EXCEPTION 'Distribution already voided'; END IF;

  -- Get affected investors from fee_allocations
  SELECT ARRAY_AGG(DISTINCT investor_id)
  INTO v_affected_investors
  FROM fee_allocations
  WHERE distribution_id = p_distribution_id
    AND is_voided = false;

  -- 1. Void the distribution
  UPDATE yield_distributions
  SET status = 'voided',
      voided_at = NOW(),
      voided_by = p_admin_id,
      void_reason = p_reason
  WHERE id = p_distribution_id;

  -- 2. Void fee_allocations
  UPDATE fee_allocations
  SET is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id
  WHERE distribution_id = p_distribution_id
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_fee_count = ROW_COUNT;

  -- 3. Void ib_allocations
  UPDATE ib_allocations
  SET is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id
  WHERE distribution_id = p_distribution_id
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_ib_count = ROW_COUNT;

  -- 4. Void investor_yield_events linked to this distribution
  UPDATE investor_yield_events
  SET is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id
  WHERE fund_id = v_dist.fund_id
    AND event_date = v_dist.effective_date
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_events_count = ROW_COUNT;

  -- 5. Void related transactions by reference_id pattern or date match
  UPDATE transactions_v2
  SET is_voided = true,
      void_reason = 'Distribution voided: ' || p_reason,
      voided_at = NOW(),
      voided_by = p_admin_id
  WHERE fund_id = v_dist.fund_id
    AND tx_date = v_dist.effective_date
    AND type IN ('YIELD', 'FEE', 'FEE_CREDIT', 'IB_CREDIT')
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_tx_count = ROW_COUNT;

  -- 6. Recompute investor positions
  IF v_affected_investors IS NOT NULL THEN
    FOREACH v_investor_id IN ARRAY v_affected_investors
    LOOP
      PERFORM recompute_investor_position(v_investor_id, v_dist.fund_id);
    END LOOP;
    -- Also recompute INDIGO FEES
    PERFORM recompute_investor_position(v_indigo_fees_id, v_dist.fund_id);
  END IF;

  -- 7. Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES (
    'VOID_YIELD_DISTRIBUTION',
    'yield_distributions',
    p_distribution_id::text,
    p_admin_id,
    jsonb_build_object(
      'fund_id', v_dist.fund_id,
      'effective_date', v_dist.effective_date,
      'gross_yield', v_dist.gross_yield,
      'net_yield', v_dist.net_yield,
      'reason', p_reason,
      'voided_transactions', v_voided_tx_count,
      'voided_fee_allocations', v_voided_fee_count,
      'voided_ib_allocations', v_voided_ib_count,
      'voided_yield_events', v_voided_events_count,
      'affected_investors', COALESCE(array_length(v_affected_investors, 1), 0)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', p_distribution_id,
    'fund_id', v_dist.fund_id,
    'effective_date', v_dist.effective_date,
    'voided_transactions', v_voided_tx_count,
    'voided_fee_allocations', v_voided_fee_count,
    'voided_ib_allocations', v_voided_ib_count,
    'voided_yield_events', v_voided_events_count,
    'affected_investors', COALESCE(array_length(v_affected_investors, 1), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.void_yield_distribution TO authenticated;