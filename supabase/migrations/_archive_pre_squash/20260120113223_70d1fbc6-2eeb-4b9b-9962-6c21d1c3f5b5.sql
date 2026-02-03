-- =============================================================================
-- Update void_fund_daily_aum RPC to set voided_by_profile_id
-- =============================================================================

DROP FUNCTION IF EXISTS void_fund_daily_aum(uuid, uuid, text);

CREATE OR REPLACE FUNCTION void_fund_daily_aum(
  p_record_id uuid,
  p_admin_id uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Enable canonical RPC bypass
  PERFORM set_canonical_rpc(true);

  -- 1. Void yield_distributions (this triggers cascade to allocations via triggers)
  UPDATE yield_distributions
  SET status = 'voided',
      voided_at = NOW(),
      voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
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
      voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
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
      voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
  WHERE fund_id = v_record.fund_id
    AND period_end = v_record.aum_date
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_fee_count = ROW_COUNT;

  -- 6. Void ib_allocations (broader matching)
  UPDATE ib_allocations
  SET is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
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
      voided_by_profile_id = p_admin_id,
      void_reason = p_reason
  WHERE id = p_record_id;

  -- Disable canonical RPC bypass
  PERFORM set_canonical_rpc(false);

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