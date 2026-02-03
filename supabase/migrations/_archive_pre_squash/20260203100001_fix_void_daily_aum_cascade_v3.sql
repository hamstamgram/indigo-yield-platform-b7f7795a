-- Bug #9 + #5: Rewrite void_fund_daily_aum with distribution-based cascade
-- Fixes: date-based transaction matching → distribution-linked matching via yield_allocations
-- Adds: ib_commission_ledger + platform_fee_ledger void steps (Bug #5 cascade alignment)

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
  v_distribution_ids uuid[];
  v_dist_id uuid;
  v_affected_investors uuid[];
  v_investor_id uuid;
  v_is_admin boolean := false;
  v_voided_dist_count integer := 0;
  v_voided_alloc_count integer := 0;
  v_voided_tx_count integer := 0;
  v_voided_events_count integer := 0;
  v_voided_fee_alloc_count integer := 0;
  v_voided_ib_alloc_count integer := 0;
  v_voided_ib_ledger_count integer := 0;
  v_voided_platform_fee_count integer := 0;
  v_events_batch integer;
BEGIN
  -- Set canonical flags for BOTH namespaces to ensure compatibility
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Admin validation
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = COALESCE(auth.uid(), p_admin_id)
    AND is_admin = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    SELECT EXISTS(
      SELECT 1 FROM profiles
      WHERE id = p_admin_id
      AND is_admin = true
    ) INTO v_is_admin;
  END IF;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can void yield records';
  END IF;

  -- Get AUM record
  SELECT * INTO v_record FROM fund_daily_aum WHERE id = p_record_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
  IF v_record.is_voided THEN RAISE EXCEPTION 'Record is already voided'; END IF;
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A reason of at least 5 characters is required';
  END IF;

  -- =========================================================================
  -- Step 1: Collect distribution IDs (distribution-based, not date-based)
  -- =========================================================================
  v_distribution_ids := ARRAY(
    SELECT id FROM yield_distributions
    WHERE fund_id = v_record.fund_id
      AND effective_date = v_record.aum_date
      AND purpose::text = v_record.purpose::text
      AND status != 'voided'
      AND (is_voided = false OR is_voided IS NULL)
  );

  -- Edge case: no distributions found — skip cascade, void AUM record only
  IF v_distribution_ids IS NULL OR array_length(v_distribution_ids, 1) IS NULL THEN
    -- Void the AUM record directly
    UPDATE fund_daily_aum
    SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        void_reason = p_reason
    WHERE id = p_record_id;

    INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
    VALUES (
      'void_fund_daily_aum', 'fund_daily_aum', p_record_id::TEXT, p_admin_id,
      jsonb_build_object('fund_id', v_record.fund_id, 'aum_date', v_record.aum_date,
                         'total_aum', v_record.total_aum, 'purpose', v_record.purpose),
      jsonb_build_object('is_voided', true, 'reason', p_reason),
      jsonb_build_object('note', 'No distributions found — AUM-only void',
                         'voided_transactions', 0, 'voided_distributions', 0)
    );

    RETURN jsonb_build_object(
      'success', true,
      'fund_id', v_record.fund_id,
      'aum_date', v_record.aum_date,
      'purpose', v_record.purpose,
      'voided_at', NOW(),
      'cascade_voided_transactions', 0,
      'cascade_voided_distributions', 0,
      'cascade_voided_yield_allocations', 0,
      'cascade_voided_yield_events', 0,
      'cascade_voided_fee_allocations', 0,
      'cascade_voided_ib_allocations', 0,
      'cascade_voided_ib_ledger', 0,
      'cascade_voided_platform_fee_ledger', 0,
      'affected_investors', 0
    );
  END IF;

  -- =========================================================================
  -- Step 2: Void yield_distributions
  -- =========================================================================
  UPDATE yield_distributions
  SET status = 'voided',
      is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id,
      void_reason = 'Cascade from fund_daily_aum: ' || p_reason
  WHERE id = ANY(v_distribution_ids);
  GET DIAGNOSTICS v_voided_dist_count = ROW_COUNT;

  -- =========================================================================
  -- Step 3: Void yield_allocations
  -- =========================================================================
  UPDATE yield_allocations
  SET is_voided = true
  WHERE distribution_id = ANY(v_distribution_ids)
    AND (is_voided = false OR is_voided IS NULL);
  GET DIAGNOSTICS v_voided_alloc_count = ROW_COUNT;

  -- =========================================================================
  -- Step 4: Find affected investors (distribution-based, not date-based)
  -- =========================================================================
  SELECT ARRAY_AGG(DISTINCT ya.investor_id) INTO v_affected_investors
  FROM yield_allocations ya
  WHERE ya.distribution_id = ANY(v_distribution_ids);

  -- =========================================================================
  -- Step 5: Void transactions via yield_allocations linkage (not date matching)
  -- =========================================================================
  WITH linked_tx AS (
    SELECT DISTINCT unnest(ARRAY[ya.transaction_id, ya.fee_transaction_id, ya.ib_transaction_id]) AS tx_id
    FROM yield_allocations ya
    WHERE ya.distribution_id = ANY(v_distribution_ids)
  )
  UPDATE transactions_v2
  SET is_voided = true,
      void_reason = 'Cascade from fund_daily_aum: ' || p_reason,
      voided_at = NOW(),
      voided_by = p_admin_id
  WHERE id IN (SELECT tx_id FROM linked_tx WHERE tx_id IS NOT NULL)
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_tx_count = ROW_COUNT;

  -- Also void FEE_CREDIT transactions by reference_id pattern (not in yield_allocations)
  UPDATE transactions_v2
  SET is_voided = true,
      void_reason = 'Cascade from fund_daily_aum: ' || p_reason,
      voided_at = NOW(),
      voided_by = p_admin_id
  WHERE reference_id = ANY(
    SELECT 'fee_credit_' || unnest(v_distribution_ids)::text
  )
    AND is_voided = false;
  v_voided_tx_count := v_voided_tx_count + (SELECT COUNT(*) FROM transactions_v2
    WHERE reference_id = ANY(SELECT 'fee_credit_' || unnest(v_distribution_ids)::text)
      AND is_voided = true AND voided_at >= NOW() - interval '5 seconds');

  -- =========================================================================
  -- Step 6: Void investor_yield_events via proven helper
  -- =========================================================================
  FOREACH v_dist_id IN ARRAY v_distribution_ids LOOP
    SELECT void_investor_yield_events_for_distribution(v_dist_id, p_admin_id) INTO v_events_batch;
    v_voided_events_count := v_voided_events_count + COALESCE(v_events_batch, 0);
  END LOOP;

  -- =========================================================================
  -- Step 7: Void fee_allocations by distribution_id
  -- =========================================================================
  UPDATE fee_allocations
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE distribution_id = ANY(v_distribution_ids)
    AND (is_voided = false OR is_voided IS NULL);
  GET DIAGNOSTICS v_voided_fee_alloc_count = ROW_COUNT;

  -- =========================================================================
  -- Step 8: Void ib_allocations by distribution_id
  -- =========================================================================
  UPDATE ib_allocations
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE distribution_id = ANY(v_distribution_ids)
    AND (is_voided = false OR is_voided IS NULL);
  GET DIAGNOSTICS v_voided_ib_alloc_count = ROW_COUNT;

  -- =========================================================================
  -- Step 9 (NEW — Bug #5): Void ib_commission_ledger
  -- =========================================================================
  UPDATE ib_commission_ledger
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = 'Cascade from fund_daily_aum: ' || p_reason
  WHERE yield_distribution_id = ANY(v_distribution_ids)
    AND (is_voided = false OR is_voided IS NULL);
  GET DIAGNOSTICS v_voided_ib_ledger_count = ROW_COUNT;

  -- =========================================================================
  -- Step 10 (NEW): Void platform_fee_ledger
  -- =========================================================================
  UPDATE platform_fee_ledger
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = 'Cascade from fund_daily_aum: ' || p_reason
  WHERE yield_distribution_id = ANY(v_distribution_ids)
    AND (is_voided = false OR is_voided IS NULL);
  GET DIAGNOSTICS v_voided_platform_fee_count = ROW_COUNT;

  -- =========================================================================
  -- Step 11: Recompute positions for affected investors
  -- =========================================================================
  IF v_affected_investors IS NOT NULL THEN
    FOREACH v_investor_id IN ARRAY v_affected_investors LOOP
      PERFORM recompute_investor_position(v_investor_id, v_record.fund_id);
    END LOOP;
  END IF;

  -- =========================================================================
  -- Step 12: Void the AUM record itself
  -- =========================================================================
  UPDATE fund_daily_aum
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = p_reason
  WHERE id = p_record_id;

  -- =========================================================================
  -- Step 13: Audit log + return
  -- =========================================================================
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'void_fund_daily_aum', 'fund_daily_aum', p_record_id::TEXT, p_admin_id,
    jsonb_build_object('fund_id', v_record.fund_id, 'aum_date', v_record.aum_date,
                       'total_aum', v_record.total_aum, 'purpose', v_record.purpose),
    jsonb_build_object('is_voided', true, 'reason', p_reason),
    jsonb_build_object(
      'voided_transactions', v_voided_tx_count,
      'voided_distributions', v_voided_dist_count,
      'voided_yield_allocations', v_voided_alloc_count,
      'voided_yield_events', v_voided_events_count,
      'voided_fee_allocations', v_voided_fee_alloc_count,
      'voided_ib_allocations', v_voided_ib_alloc_count,
      'voided_ib_commission_ledger', v_voided_ib_ledger_count,
      'voided_platform_fee_ledger', v_voided_platform_fee_count,
      'affected_investors', COALESCE(array_length(v_affected_investors, 1), 0),
      'distribution_ids', v_distribution_ids
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
    'cascade_voided_yield_allocations', v_voided_alloc_count,
    'cascade_voided_yield_events', v_voided_events_count,
    'cascade_voided_fee_allocations', v_voided_fee_alloc_count,
    'cascade_voided_ib_allocations', v_voided_ib_alloc_count,
    'cascade_voided_ib_ledger', v_voided_ib_ledger_count,
    'cascade_voided_platform_fee_ledger', v_voided_platform_fee_count,
    'affected_investors', COALESCE(array_length(v_affected_investors, 1), 0)
  );
END;
$$;
