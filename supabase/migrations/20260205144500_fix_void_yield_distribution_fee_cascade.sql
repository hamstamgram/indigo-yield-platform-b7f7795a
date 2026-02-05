-- Fix: void_yield_distribution must fully cascade to fee_credit transactions and fee_allocations.
-- Root issue:
-- 1) Fee credit reference matching only handled fee_credit_<dist>_% but not fee_credit_<dist>
-- 2) fee_allocations were not explicitly voided in this RPC path

CREATE OR REPLACE FUNCTION "public"."void_yield_distribution"(
  "p_distribution_id" "uuid",
  "p_admin_id" "uuid",
  "p_reason" "text" DEFAULT 'Voided by admin'::"text"
) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_dist RECORD;
  v_is_admin boolean;
  v_tx RECORD;
  v_voided_yield_count int := 0;
  v_voided_fee_credit_count int := 0;
  v_voided_ib_credit_count int := 0;
  v_voided_other_tx_count int := 0;
  v_voided_ib_allocations_count int := 0;
  v_voided_fee_allocations_count int := 0;
  v_voided_yield_allocations_count int := 0;
  v_voided_investor_events_count int := 0;
BEGIN
  -- Advisory lock: prevent concurrent void of same distribution
  PERFORM pg_advisory_xact_lock(hashtext('void_dist'), hashtext(p_distribution_id::text));

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.allow_yield_void', 'true', true);

  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_admin_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Admin privileges required');
  END IF;

  SELECT * INTO v_dist FROM yield_distributions
  WHERE id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Yield distribution not found or already voided');
  END IF;

  -- First pass: linked transactions from allocation linkage
  FOR v_tx IN
    WITH linked_tx AS (
      SELECT DISTINCT unnest(ARRAY[ya.transaction_id, ya.fee_transaction_id, ya.ib_transaction_id]) AS tx_id
      FROM yield_allocations ya
      WHERE ya.distribution_id = p_distribution_id
    )
    SELECT t.*
    FROM transactions_v2 t
    JOIN linked_tx l ON l.tx_id = t.id
    WHERE l.tx_id IS NOT NULL
      AND t.is_voided = false
  LOOP
    PERFORM void_transaction(v_tx.id, p_admin_id, 'Yield distribution voided: ' || p_reason);
    IF v_tx.type = 'YIELD' THEN
      v_voided_yield_count := v_voided_yield_count + 1;
    ELSIF v_tx.type = 'FEE_CREDIT' THEN
      v_voided_fee_credit_count := v_voided_fee_credit_count + 1;
    ELSIF v_tx.type = 'IB_CREDIT' THEN
      v_voided_ib_credit_count := v_voided_ib_credit_count + 1;
    ELSE
      v_voided_other_tx_count := v_voided_other_tx_count + 1;
    END IF;
  END LOOP;

  -- Second pass (safety net): pattern + explicit distribution_id linkage
  FOR v_tx IN
    SELECT *
    FROM transactions_v2
    WHERE is_voided = false
      AND (
        distribution_id = p_distribution_id
        OR reference_id = 'fee_credit_' || p_distribution_id::text
        OR reference_id LIKE 'fee_credit_' || p_distribution_id::text || '_%'
        OR reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%'
        OR reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
      )
  LOOP
    PERFORM void_transaction(v_tx.id, p_admin_id, 'Yield distribution voided: ' || p_reason);
    IF v_tx.type = 'YIELD' THEN
      v_voided_yield_count := v_voided_yield_count + 1;
    ELSIF v_tx.type = 'FEE_CREDIT' THEN
      v_voided_fee_credit_count := v_voided_fee_credit_count + 1;
    ELSIF v_tx.type = 'IB_CREDIT' THEN
      v_voided_ib_credit_count := v_voided_ib_credit_count + 1;
    ELSE
      v_voided_other_tx_count := v_voided_other_tx_count + 1;
    END IF;
  END LOOP;

  -- Void IB allocations strictly by distribution_id
  UPDATE ib_allocations
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE distribution_id = p_distribution_id
    AND (is_voided = false OR is_voided IS NULL);
  GET DIAGNOSTICS v_voided_ib_allocations_count = ROW_COUNT;

  -- Void fee allocations (previously missing from this RPC path)
  UPDATE fee_allocations
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE distribution_id = p_distribution_id
    AND (is_voided = false OR is_voided IS NULL);
  GET DIAGNOSTICS v_voided_fee_allocations_count = ROW_COUNT;

  -- Void yield allocations
  UPDATE yield_allocations
  SET is_voided = true
  WHERE distribution_id = p_distribution_id
    AND (is_voided = false OR is_voided IS NULL);
  GET DIAGNOSTICS v_voided_yield_allocations_count = ROW_COUNT;

  -- Void investor yield events
  UPDATE investor_yield_events
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE (
      reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
      OR reference_id = p_distribution_id::text
    )
    AND (is_voided = false OR is_voided IS NULL);
  GET DIAGNOSTICS v_voided_investor_events_count = ROW_COUNT;

  -- Void platform fee ledger entries
  UPDATE platform_fee_ledger
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = 'Yield distribution voided: ' || p_reason
  WHERE yield_distribution_id = p_distribution_id
    AND (is_voided = false OR is_voided IS NULL);

  -- Void IB commission ledger entries
  UPDATE ib_commission_ledger
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = 'Yield distribution voided: ' || p_reason
  WHERE yield_distribution_id = p_distribution_id
    AND (is_voided = false OR is_voided IS NULL);

  -- Void the distribution itself
  UPDATE yield_distributions
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id, void_reason = p_reason
  WHERE id = p_distribution_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES (
    'VOID_YIELD_DISTRIBUTION',
    'yield_distributions',
    p_distribution_id::text,
    p_admin_id,
    jsonb_build_object('is_voided', false, 'net_yield', v_dist.net_yield),
    jsonb_build_object(
      'is_voided', true,
      'void_reason', p_reason,
      'voided_yield_transactions', v_voided_yield_count,
      'voided_fee_credit_transactions', v_voided_fee_credit_count,
      'voided_ib_credit_transactions', v_voided_ib_credit_count,
      'voided_other_transactions', v_voided_other_tx_count,
      'voided_fee_allocations', v_voided_fee_allocations_count,
      'voided_ib_allocations', v_voided_ib_allocations_count,
      'voided_yield_allocations', v_voided_yield_allocations_count,
      'voided_investor_events', v_voided_investor_events_count
    )
  );

  RETURN json_build_object(
    'success', true,
    'distribution_id', p_distribution_id,
    'fund_id', v_dist.fund_id,
    'period_end', v_dist.period_end,
    'voided_yield_transactions', v_voided_yield_count,
    'voided_fee_credit_transactions', v_voided_fee_credit_count,
    'voided_ib_credit_transactions', v_voided_ib_credit_count,
    'voided_other_transactions', v_voided_other_tx_count,
    'voided_fee_allocations', v_voided_fee_allocations_count,
    'voided_ib_allocations', v_voided_ib_allocations_count,
    'voided_yield_allocations', v_voided_yield_allocations_count,
    'voided_investor_events', v_voided_investor_events_count,
    'message', 'Yield distribution voided with full cascade'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'void_yield_distribution failed: % (%) dist_id=%', SQLERRM, SQLSTATE, p_distribution_id;
    RETURN json_build_object('success', false, 'error', SQLERRM, 'error_code', SQLSTATE);
END;
$$;

COMMENT ON FUNCTION "public"."void_yield_distribution"("p_distribution_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") IS
'Voids a yield distribution with full cascade to transactions, fee_allocations, ib_allocations, yield_allocations, investor_yield_events, platform_fee_ledger, ib_commission_ledger. Fix: includes fee_credit_<dist> references and direct fee_allocations void.';
