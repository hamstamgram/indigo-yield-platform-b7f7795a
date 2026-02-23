-- Migration: Add unvoid_yield_distribution RPC
-- Purpose: Restore a previously voided yield distribution and its associated ledger entries.
-- Follows "First Principles" (Live Data is Truth) model.

CREATE OR REPLACE FUNCTION public.unvoid_yield_distribution(
  p_distribution_id uuid,
  p_admin_id uuid,
  p_reason text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dist RECORD;
  v_restored_txs int := 0;
  v_restored_allocs int := 0;
  v_tx RECORD;
BEGIN
  -- Canonical guard
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- 1. Check distribution
  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  IF v_dist IS NULL THEN 
    RAISE EXCEPTION 'Distribution not found: %', p_distribution_id; 
  END IF;
  
  IF NOT v_dist.is_voided THEN 
    RETURN json_build_object('success', true, 'message', 'Distribution is not voided'); 
  END IF;

  -- 2. Restore transactions
  -- Pattern matching must be identical to void_yield_distribution to ensure full restoration
  FOR v_tx IN
    SELECT id FROM transactions_v2
    WHERE (
      distribution_id = p_distribution_id
      OR reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'yield_v5_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'yield_flat_' || p_distribution_id::text || '_%'
      OR reference_id = 'yield_flat_fees_' || p_distribution_id::text
      OR reference_id = 'fee_credit_' || p_distribution_id::text
      OR reference_id = 'fee_credit_v5_' || p_distribution_id::text
      OR reference_id = 'fee_flat_' || p_distribution_id::text
      OR reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_credit_v5_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_flat_' || p_distribution_id::text || '_%'
    ) AND is_voided
  LOOP
    UPDATE transactions_v2 
    SET is_voided = false, 
        voided_at = NULL, 
        voided_by = NULL, 
        void_reason = NULL,
        updated_at = NOW(),
        updated_by = p_admin_id
    WHERE id = v_tx.id;
    v_restored_txs := v_restored_txs + 1;
  END LOOP;

  -- 3. Restore Related Ledgers
  UPDATE platform_fee_ledger 
  SET is_voided = false, voided_at = NULL, voided_by = NULL 
  WHERE yield_distribution_id = p_distribution_id AND is_voided;
  
  UPDATE ib_commission_ledger 
  SET is_voided = false, voided_at = NULL, voided_by = NULL 
  WHERE yield_distribution_id = p_distribution_id AND is_voided;
  
  UPDATE fee_allocations 
  SET is_voided = false, voided_at = NULL, voided_by = NULL 
  WHERE distribution_id = p_distribution_id AND is_voided;
  
  GET DIAGNOSTICS v_restored_allocs = ROW_COUNT;
  
  UPDATE yield_allocations 
  SET is_voided = false 
  WHERE distribution_id = p_distribution_id AND is_voided;
  
  UPDATE ib_allocations 
  SET is_voided = false, voided_at = NULL, voided_by = NULL 
  WHERE distribution_id = p_distribution_id AND is_voided;

  -- 4. Restore Distribution Main Record
  UPDATE yield_distributions 
  SET is_voided = false, 
      voided_at = NULL, 
      voided_by = NULL, 
      status = 'active', 
      void_reason = NULL,
      updated_at = NOW(),
      updated_by = p_admin_id
  WHERE id = p_distribution_id;

  -- 5. Audit Log
  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (
    p_admin_id, 
    'YIELD_DISTRIBUTION_RESTORED', 
    'yield_distributions', 
    p_distribution_id::text,
    jsonb_build_object('is_voided', true, 'status', 'voided'),
    jsonb_build_object('is_voided', false, 'status', 'active', 'reason', p_reason),
    jsonb_build_object('restored_txs', v_restored_txs, 'v6_first_principles', true)
  );

  RETURN json_build_object(
    'success', true, 
    'distribution_id', p_distribution_id,
    'unvoided_transactions', v_restored_txs, 
    'unvoided_fee_allocations', v_restored_allocs
  );
END;
$$;
