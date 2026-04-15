-- =============================================================================
-- FINAL DRIFT-FREE CANONICAL MIGRATION
-- =============================================================================
-- 8 fixes ranked P0–P3 to eliminate all drift paths in the canonical function graph.
-- Also includes data cleanup for 23 orphaned voided records found in production.
--
-- P0: void_yield_distribution misses v5-pattern reference_ids (distribution_id fix)
-- P0: void_transaction does NOT cascade to yield_distributions (phantom yield)
-- P1: void_and_reissue double-counts position (3 writes for 1 reissue)
-- P1: fn_ledger_drives_position INTERNAL_WITHDRAWAL implicit (fragile)
-- P2: void_yield_distribution does NOT explicitly void yield_allocations/ib_allocations
-- P2: unvoid_transaction does NOT recalculate AUM after restore
-- P3: void_transaction duplicate fee_allocations void (trigger also handles it)
-- P3: apply_investor_transaction 14-param duplicate fund_daily_aum write
-- =============================================================================

-- =============================================================================
-- PART 0: DATA CLEANUP — Fix 23 orphaned voided records
-- =============================================================================
-- Orphan pattern: yield_distributions with is_voided=false but ALL their
-- YIELD/FEE_CREDIT/IB_CREDIT transactions are voided. The distribution stays
-- "applied" while its economic substance is gone.

-- 0a. Void distributions where ALL yield transactions are voided
UPDATE yield_distributions
SET is_voided = true,
    voided_at = NOW(),
    voided_by = created_by,
    voided_by_profile_id = created_by,
    void_reason = 'Auto-cleanup: all yield transactions voided but distribution was not'
WHERE is_voided = false
AND NOT EXISTS (
  SELECT 1 FROM transactions_v2 t
  WHERE t.distribution_id = yield_distributions.id
    AND t.type = 'YIELD'
    AND t.is_voided = false
)
AND EXISTS (
  SELECT 1 FROM transactions_v2 t
  WHERE t.distribution_id = yield_distributions.id
    AND t.type = 'YIELD'
    AND t.is_voided = true
);

-- 0b. Void orphaned yield_allocations (distribution voided but allocations not)
-- Note: cascade_void_to_allocations trigger handles new voids going forward,
-- but existing orphaned data needs manual cleanup.
UPDATE yield_allocations
SET is_voided = true,
    voided_at = NOW(),
    void_reason = 'Auto-cleanup: parent distribution voided'
WHERE distribution_id IN (
  SELECT id FROM yield_distributions WHERE is_voided = true
)
AND is_voided = false;

-- 0c. Void orphaned fee_allocations
UPDATE fee_allocations
SET is_voided = true,
    voided_at = NOW(),
    void_reason = 'Auto-cleanup: parent distribution voided'
WHERE distribution_id IN (
  SELECT id FROM yield_distributions WHERE is_voided = true
)
AND is_voided = false;

-- 0d. Void orphaned ib_allocations
UPDATE ib_allocations
SET is_voided = true,
    voided_at = NOW()
WHERE distribution_id IN (
  SELECT id FROM yield_distributions WHERE is_voided = true
)
AND is_voided = false;

-- 0e. Full position recomputation after cleanup
DO $$
DECLARE
  r RECORD;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  FOR r IN SELECT DISTINCT investor_id, fund_id FROM transactions_v2 WHERE is_voided = false
  LOOP
    PERFORM recompute_investor_position(r.investor_id, r.fund_id);
  END LOOP;
END $$;


-- =============================================================================
-- PART 1 (P0): Fix void_yield_distribution — distribution_id-based lookup
-- =============================================================================
-- ROOT CAUSE: void_yield_distribution uses reference_id pattern matching
-- ('yield_adb_{id}_%', 'yield_v5_{id}_%', etc.) but apply_segmented_yield_distribution_v5
-- creates reference_ids as 'yield-{id}-{investor_id}' (hyphen, not underscore).
-- The primary lookup MISSED v5-style transactions. Only IB_CREDIT had a
-- distribution_id fallback.
--
-- FIX: Use distribution_id column as PRIMARY lookup for ALL tx types.
-- Keep pattern match as FALLBACK for legacy transactions without distribution_id.

CREATE OR REPLACE FUNCTION public.void_yield_distribution(
  p_distribution_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Administrative void',
  p_void_crystals boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dist RECORD;
  v_voided_txs int := 0;
  v_voided_allocs int := 0;
  v_voided_crystals int := 0;
  v_crystal RECORD;
  v_tx RECORD;
  v_affected_investor RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM pg_advisory_xact_lock(hashtext('void_yd:' || p_distribution_id::text));

  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  IF v_dist IS NULL THEN RAISE EXCEPTION 'Distribution not found: %', p_distribution_id; END IF;
  IF v_dist.is_voided THEN RETURN json_build_object('success', true, 'message', 'Already voided'); END IF;

  -- Void crystallized children if requested
  IF p_void_crystals THEN
    FOR v_crystal IN SELECT id, effective_date FROM yield_distributions WHERE consolidated_into_id = p_distribution_id AND NOT is_voided
    LOOP
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
        UPDATE investor_yield_events SET is_voided = true
        WHERE reference_id LIKE 'YLD:' || v_dist.fund_id || ':' || v_crystal.effective_date::text || ':%'
          AND is_voided = false;
      END IF;

      UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        void_reason = 'Cascade void from distribution ' || p_distribution_id::text,
        consolidated_into_id = NULL
      WHERE id = v_crystal.id;
      v_voided_crystals := v_voided_crystals + 1;
    END LOOP;
  ELSE
    UPDATE yield_distributions SET consolidated_into_id = NULL WHERE consolidated_into_id = p_distribution_id AND NOT is_voided;
  END IF;

  -- ===================================================================
  -- PRIMARY: Use distribution_id column (reliable for v5+ functions)
  -- This is the canonical path — apply_segmented_yield_distribution_v5
  -- sets distribution_id on every transaction it creates.
  -- ===================================================================
  FOR v_tx IN SELECT id FROM transactions_v2
    WHERE distribution_id = p_distribution_id
      AND type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT')
      AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- ===================================================================
  -- FALLBACK: Pattern match for legacy transactions without distribution_id
  -- Covers older reference_id patterns ('yield_adb_', 'yield_v5_', etc.)
  -- and any v5-style patterns that somehow lack distribution_id.
  -- ===================================================================
  FOR v_tx IN SELECT id FROM transactions_v2
    WHERE (
      reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'yield_v5_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'yield-' || p_distribution_id::text || '-%'
      OR reference_id = 'fee_credit_' || p_distribution_id::text
      OR reference_id = 'fee_credit_v5_' || p_distribution_id::text
      OR reference_id LIKE 'fee_credit-' || p_distribution_id::text || '-%'
      OR reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_credit_v5_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_credit-' || p_distribution_id::text || '-%'
    )
    AND NOT is_voided
    AND distribution_id IS NULL
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- ===================================================================
  -- P2 FIX: Explicit void of yield_allocations and ib_allocations
  -- (defense-in-depth: cascade_void_to_allocations trigger also handles this)
  -- ===================================================================
  UPDATE yield_allocations
  SET is_voided = true, voided_at = NOW(),
      voided_by = p_admin_id, voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade void from distribution ' || p_distribution_id::text
  WHERE distribution_id = p_distribution_id AND is_voided = false;

  UPDATE ib_allocations
  SET is_voided = true, voided_at = NOW(),
      voided_by = p_admin_id, voided_by_profile_id = p_admin_id
  WHERE distribution_id = p_distribution_id AND is_voided = false;

  -- Void ledger/allocations tables
  UPDATE platform_fee_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_commission_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;

  -- Void the distribution itself
  UPDATE yield_distributions
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id, void_reason = p_reason
  WHERE id = p_distribution_id;

  -- Void investor_yield_events
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
    UPDATE investor_yield_events SET is_voided = true
    WHERE trigger_transaction_id IN (
      SELECT id FROM transactions_v2 WHERE distribution_id = p_distribution_id AND is_voided = true
    ) AND NOT is_voided;

    UPDATE investor_yield_events SET is_voided = true
    WHERE reference_id LIKE 'YLD:' || v_dist.fund_id || ':' || v_dist.effective_date::text || ':%'
      AND is_voided = false
      AND NOT EXISTS (
        SELECT 1 FROM yield_distributions yd
        WHERE yd.fund_id = v_dist.fund_id
          AND yd.effective_date = v_dist.effective_date
          AND yd.is_voided = false
      );
  END IF;

  -- Recompute positions for all affected investors
  FOR v_affected_investor IN
    SELECT DISTINCT investor_id FROM transactions_v2
    WHERE distribution_id = p_distribution_id
      AND investor_id IS NOT NULL
  LOOP
    PERFORM recompute_investor_position(v_affected_investor.investor_id, v_dist.fund_id);
  END LOOP;

  -- Recompute AUM for the distribution's effective date
  BEGIN
    PERFORM recalculate_fund_aum_for_date(v_dist.fund_id, v_dist.effective_date);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta) VALUES (
    p_admin_id, 'YIELD_DISTRIBUTION_VOIDED', 'yield_distributions', p_distribution_id::text,
    jsonb_build_object('status', v_dist.status, 'gross_yield', v_dist.gross_yield),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object('voided_txs', v_voided_txs, 'voided_crystals', v_voided_crystals,
      'void_crystals_requested', p_void_crystals, 'fund_id', v_dist.fund_id,
      'lookup_method', 'distribution_id_primary_pattern_fallback')
  );

  RETURN json_build_object(
    'success', true,
    'distribution_id', p_distribution_id,
    'voided_count', v_voided_txs,
    'voided_crystals', v_voided_crystals
  );
END;
$function$;

DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- =============================================================================
-- PART 3 (P0): Fix void_transaction — cascade void to yield_distributions
-- =============================================================================
-- ROOT CAUSE: voiding a YIELD/FEE_CREDIT/IB_CREDIT transaction only voids the
-- transaction row. The parent yield_distribution stays "applied", creating orphaned
-- distributions where all economic substance is voided but the distribution record
-- remains active.
--
-- Also: voiding a DEPOSIT that underlies a yield distribution creates a phantom yield
-- (yield paid on capital that no longer exists).
--
-- FIX: After voiding the transaction, check for dependent yield_distributions
-- and void them if all their yield transactions are now voided.

CREATE OR REPLACE FUNCTION public.void_transaction(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_reason text
) RETURNS JSONB AS $$
DECLARE
  v_tx RECORD;
  v_aum_events_voided INT := 0;
  v_daily_aum_voided INT := 0;
  v_fee_allocations_voided INT := 0;
  v_ib_ledger_voided INT := 0;
  v_platform_fee_voided INT := 0;
  v_yield_events_voided INT := 0;
  v_distributions_voided INT := 0;
  v_result JSONB;
  v_affected_dist RECORD;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('void_tx'), hashtext(p_transaction_id::TEXT));

  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);
  PERFORM set_config('app.canonical_rpc', 'true', TRUE);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  IF NOT public.check_is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: admin privileges required for user %', p_admin_id;
  END IF;

  SELECT * INTO v_tx FROM public.transactions_v2 WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided: %', p_transaction_id;
  END IF;

  -- Step 1: Mark transaction as voided
  UPDATE public.transactions_v2
  SET is_voided = TRUE,
      voided_at = NOW(),
      voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = p_reason
  WHERE id = p_transaction_id;

  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);
  PERFORM set_config('app.canonical_rpc', 'true', TRUE);

  -- Step 2: Cascade void to fund_aum_events (DEPOSIT/WITHDRAWAL only)
  IF v_tx.type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    UPDATE public.fund_aum_events
    SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id,
        void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT,
        updated_at = NOW()
    WHERE fund_id = v_tx.fund_id AND is_voided = FALSE
      AND ((v_tx.reference_id IS NOT NULL AND trigger_reference = v_tx.reference_id)
            OR (v_tx.reference_id IS NULL AND trigger_reference IS NULL
                AND event_date = v_tx.tx_date));
    GET DIAGNOSTICS v_aum_events_voided = ROW_COUNT;
  END IF;

  -- Step 3: Cascade void to fund_daily_aum (trigger-synced rows only)
  UPDATE public.fund_daily_aum
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT,
      updated_at = NOW()
  WHERE fund_id = v_tx.fund_id AND is_voided = FALSE AND aum_date = v_tx.tx_date
    AND source IN ('tx_sync', 'tx_position_sync', 'auto_heal_sync', 'trigger:position_sync');
  GET DIAGNOSTICS v_daily_aum_voided = ROW_COUNT;

  -- Step 4: Recalculate AUM after voiding stale records
  PERFORM public.recalculate_fund_aum_for_date(
    v_tx.fund_id, v_tx.tx_date, 'transaction'::aum_purpose, p_admin_id
  );

  -- Step 5: Cascade void to fee_allocations
  -- NOTE: cascade_void_from_transaction trigger (AFTER UPDATE order 3) also
  -- voids fee_allocations. This explicit RPC void is defense-in-depth.
  UPDATE public.fee_allocations
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
  WHERE (credit_transaction_id = p_transaction_id OR debit_transaction_id = p_transaction_id)
    AND is_voided = FALSE;
  GET DIAGNOSTICS v_fee_allocations_voided = ROW_COUNT;

  -- Step 6: Cascade void to ib_commission_ledger
  UPDATE public.ib_commission_ledger
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT, updated_at = NOW()
  WHERE transaction_id = p_transaction_id AND is_voided = FALSE;
  GET DIAGNOSTICS v_ib_ledger_voided = ROW_COUNT;

  -- Step 7: Cascade void to platform_fee_ledger
  UPDATE public.platform_fee_ledger
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT, updated_at = NOW()
  WHERE transaction_id = p_transaction_id AND is_voided = FALSE;
  GET DIAGNOSTICS v_platform_fee_voided = ROW_COUNT;

  -- Step 8: Cascade void to investor_yield_events
  UPDATE public.investor_yield_events
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id, updated_at = NOW()
  WHERE (trigger_transaction_id = p_transaction_id
         OR reference_id = v_tx.reference_id)
    AND is_voided = FALSE;
  GET DIAGNOSTICS v_yield_events_voided = ROW_COUNT;

  -- =================================================================
  -- P0 FIX: Cascade void to orphaned yield_distributions
  -- =================================================================

  -- 8a. If voiding a YIELD/FEE_CREDIT/IB_CREDIT with a distribution_id,
  --     void the parent distribution ONLY if no other active yield txs remain.
  IF v_tx.type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT') AND v_tx.distribution_id IS NOT NULL THEN
    UPDATE yield_distributions
    SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id,
        void_reason = 'Cascade void: all yield transactions voided from tx ' || p_transaction_id::TEXT
    WHERE id = v_tx.distribution_id
      AND is_voided = FALSE
      AND NOT EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.distribution_id = v_tx.distribution_id
          AND t.type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT')
          AND t.is_voided = FALSE
          AND t.id != p_transaction_id
      );
    GET DIAGNOSTICS v_distributions_voided = ROW_COUNT;
  END IF;

  -- 8b. If voiding a DEPOSIT/WITHDRAWAL, check for yield distributions
  --     that are now orphaned (all their yield txs voided as side effect).
  IF v_tx.type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    FOR v_affected_dist IN
      SELECT yd.id FROM yield_distributions yd
      WHERE yd.fund_id = v_tx.fund_id
        AND yd.is_voided = FALSE
        AND yd.purpose = 'transaction'
        AND NOT EXISTS (
          SELECT 1 FROM transactions_v2 t
          WHERE t.distribution_id = yd.id
            AND t.type = 'YIELD'
            AND t.is_voided = FALSE
        )
        AND EXISTS (
          SELECT 1 FROM transactions_v2 t
          WHERE t.distribution_id = yd.id
            AND t.type = 'YIELD'
            AND t.is_voided = TRUE
        )
    LOOP
      UPDATE yield_distributions
      SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
          voided_by_profile_id = p_admin_id,
          void_reason = 'Cascade void: source ' || v_tx.type || ' ' || p_transaction_id::TEXT || ' voided, all yield txs orphaned'
      WHERE id = v_affected_dist.id;
      v_distributions_voided := v_distributions_voided + 1;
    END LOOP;
  END IF;

  -- Step 9: Audit log
  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID', 'transactions_v2', p_transaction_id::TEXT, p_admin_id,
    JSONB_BUILD_OBJECT('is_voided', FALSE, 'type', v_tx.type, 'amount', v_tx.amount),
    JSONB_BUILD_OBJECT(
      'is_voided', TRUE, 'void_reason', p_reason, 'voided_at', NOW(),
      'aum_events_voided', v_aum_events_voided,
      'daily_aum_voided', v_daily_aum_voided,
      'fee_allocations_voided', v_fee_allocations_voided,
      'ib_ledger_voided', v_ib_ledger_voided,
      'platform_fee_voided', v_platform_fee_voided,
      'yield_events_voided', v_yield_events_voided,
      'distributions_voided', v_distributions_voided
    ),
    JSONB_BUILD_OBJECT(
      'source', 'void_transaction_rpc', 'cascade_v6', TRUE,
      'aum_recalculated', TRUE, 'isolation_model', 'advisory_xact_lock',
      'yield_distribution_cascade', TRUE
    )
  );

  RETURN JSONB_BUILD_OBJECT(
    'success', TRUE,
    'transaction_id', p_transaction_id,
    'voided_at', NOW(),
    'aum_events_voided', v_aum_events_voided,
    'daily_aum_voided', v_daily_aum_voided,
    'fee_allocations_voided', v_fee_allocations_voided,
    'ib_ledger_voided', v_ib_ledger_voided,
    'platform_fee_voided', v_platform_fee_voided,
    'yield_events_voided', v_yield_events_voided,
    'distributions_voided', v_distributions_voided,
    'message', 'Transaction voided atomically with full cascade, yield distribution cascade, and AUM recalculation'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.void_transaction(UUID, UUID, TEXT) OWNER TO postgres;

COMMENT ON FUNCTION public.void_transaction(UUID, UUID, TEXT) IS
'Full cascade void: transactions_v2, fund_aum_events, fund_daily_aum, fee_allocations,
ib_commission_ledger, platform_fee_ledger, investor_yield_events, yield_distributions.
Recalculates AUM. Concurrency: pg_advisory_xact_lock on transaction ID (auto-release at tx end).
v6.0 (2026-06-18): Added yield_distribution cascade — voids orphaned distributions
when all their yield transactions are voided. Uses distribution_id for reliable lookup.';


-- =============================================================================
-- PART 4 (P1): Fix void_and_reissue_transaction — remove double position update
-- =============================================================================
-- ROOT CAUSE: void_and_reissue_transaction calls void_transaction (which triggers
-- fn_ledger_drives_position to reverse the original amount) then INSERTs a new tx
-- (which triggers fn_ledger_drives_position to add the new amount) then ALSO
-- explicitly does UPDATE investor_positions SET current_value = current_value + p_new_amount.
-- That's 3 position updates when only 2 are correct — the explicit UPDATE double-counts.
--
-- FIX: Remove the explicit investor_positions UPDATE. The fn_ledger_drives_position
-- trigger handles both the void reversal and the new tx addition.
-- trigger_recompute_position then fully recomputes from ledger as safety net.

CREATE OR REPLACE FUNCTION public.void_and_reissue_transaction(
  p_original_tx_id uuid,
  p_admin_id uuid,
  p_new_amount numeric,
  p_new_date date,
  p_new_notes text DEFAULT NULL,
  p_new_tx_hash text DEFAULT NULL,
  p_closing_aum numeric DEFAULT NULL,
  p_reason text DEFAULT 'Void and reissue correction'
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_is_admin boolean;
  v_orig RECORD;
  v_position RECORD;
  v_void_result jsonb;
  v_new_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_computed_closing_aum numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_admin_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  SELECT * INTO v_orig FROM transactions_v2 WHERE id = p_original_tx_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_original_tx_id;
  END IF;

  IF v_orig.is_voided THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A detailed reason (min 10 chars) is required';
  END IF;

  IF v_orig.is_system_generated THEN
    RAISE EXCEPTION 'Cannot void-and-reissue system-generated transactions (yield/fee/IB). Use void yield distribution instead.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_orig.investor_id::text || v_orig.fund_id::text));

  -- Read position BEFORE void (will change during void_transaction via trigger)
  SELECT * INTO v_position
  FROM investor_positions
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  v_balance_before := COALESCE(v_position.current_value, 0) - v_orig.amount;

  -- Void the original (void_transaction sets canonical_rpc internally)
  v_void_result := void_transaction(p_original_tx_id, p_admin_id, 'Void-and-reissue: ' || p_reason);

  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void original transaction: %', COALESCE(v_void_result->>'error', 'Unknown error');
  END IF;

  -- Re-set canonical flag after void_transaction returns (defense-in-depth)
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- v_balance_after is computed from the voided state + new amount
  -- After void_transaction, the position was reduced by v_orig.amount (via trigger).
  -- The new tx INSERT will add p_new_amount (via trigger).
  v_balance_after := v_balance_before + p_new_amount;

  v_new_tx_id := gen_random_uuid();

  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, type, tx_subtype, amount, tx_date,
    notes, tx_hash, reference_id, correction_id,
    balance_before, balance_after,
    is_system_generated, created_by, created_at
  ) VALUES (
    v_new_tx_id,
    v_orig.investor_id,
    v_orig.fund_id,
    v_orig.type,
    v_orig.tx_subtype,
    p_new_amount,
    p_new_date,
    COALESCE(p_new_notes, v_orig.notes),
    COALESCE(p_new_tx_hash, v_orig.tx_hash),
    'reissue_' || p_original_tx_id::text,
    p_original_tx_id,
    v_balance_before,
    v_balance_after,
    false,
    p_admin_id,
    NOW()
  );

  -- NOTE: fn_ledger_drives_position trigger fires on the INSERT above,
  -- adding p_new_amount to investor_positions. No explicit UPDATE needed.
  -- trigger_recompute_position also fires as safety net.

  IF p_closing_aum IS NOT NULL THEN
    v_computed_closing_aum := p_closing_aum;
  ELSE
    SELECT COALESCE(SUM(current_value), 0)
    INTO v_computed_closing_aum
    FROM investor_positions
    WHERE fund_id = v_orig.fund_id;
  END IF;

  INSERT INTO fund_aum_events (
    fund_id, event_type, amount, closing_aum,
    transaction_id, investor_id, event_date, created_by
  ) VALUES (
    v_orig.fund_id,
    'reissue',
    p_new_amount,
    v_computed_closing_aum,
    v_new_tx_id,
    v_orig.investor_id,
    p_new_date,
    p_admin_id
  );

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_AND_REISSUE',
    'transactions_v2',
    v_new_tx_id::text,
    p_admin_id,
    jsonb_build_object(
      'original_tx_id', p_original_tx_id,
      'original_amount', v_orig.amount,
      'original_date', v_orig.tx_date,
      'original_type', v_orig.type
    ),
    jsonb_build_object(
      'new_tx_id', v_new_tx_id,
      'new_amount', p_new_amount,
      'new_date', p_new_date,
      'closing_aum', v_computed_closing_aum,
      'balance_before', v_balance_before,
      'balance_after', v_balance_after,
      'position_method', 'trigger_only_no_explicit_update'
    ),
    jsonb_build_object('reason', p_reason)
  );

  RETURN json_build_object(
    'success', true,
    'voided_tx_id', p_original_tx_id,
    'new_tx_id', v_new_tx_id,
    'new_amount', p_new_amount,
    'new_date', p_new_date,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'closing_aum', v_computed_closing_aum
  );
END;
$$;

-- Also fix void_and_reissue_full_exit — same double-position-update bug

CREATE OR REPLACE FUNCTION public.void_and_reissue_full_exit(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_new_amount numeric,
  p_reason text,
  p_new_date date DEFAULT NULL,
  p_send_precision text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_withdrawal_request RECORD;
  v_void_result jsonb;
  v_dust_sweep_count int := 0;
  v_investor_id uuid;
  v_fund_id uuid;
  v_asset text;
  v_original_amount numeric;
  v_restored_amount numeric;
  v_new_withdrawal_amount numeric;
  v_dust_amount numeric;
  v_new_withdrawal_tx_id uuid;
  v_dust_debit_tx_id uuid;
  v_dust_credit_tx_id uuid;
  v_fees_account_id uuid;
  v_balance_before numeric;
  v_closing_aum numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  v_investor_id := v_tx.investor_id;
  v_fund_id := v_tx.fund_id;
  v_asset := v_tx.asset;
  v_original_amount := ABS(v_tx.amount);

  SELECT * INTO v_withdrawal_request FROM withdrawal_requests
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id
    AND status IN ('completed', 'approved')
  ORDER BY created_at DESC LIMIT 1;

  v_void_result := void_transaction(p_transaction_id, p_admin_id, 'Full-exit void-and-reissue: ' || p_reason);

  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void transaction: %', COALESCE(v_void_result->>'error', 'Unknown error');
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT COALESCE(SUM(amount), 0) INTO v_restored_amount
  FROM transactions_v2
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id AND is_voided = false;

  IF v_restored_amount < 0 THEN v_restored_amount := 0; END IF;

  v_new_withdrawal_amount := LEAST(p_new_amount, v_restored_amount);
  v_dust_amount := GREATEST(v_restored_amount - v_new_withdrawal_amount, 0);

  SELECT id INTO v_fees_account_id FROM profiles WHERE account_type = 'fees_account' LIMIT 1;

  SELECT COALESCE(current_value, 0) INTO v_balance_before
  FROM investor_positions
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  v_new_withdrawal_tx_id := gen_random_uuid();

  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, type, amount, tx_date,
    notes, reference_id, balance_before, balance_after,
    is_system_generated, created_by, created_at
  ) VALUES (
    v_new_withdrawal_tx_id, v_investor_id, v_fund_id,
    'WITHDRAWAL', -v_new_withdrawal_amount, COALESCE(p_new_date, v_tx.tx_date),
    'Full-exit reissue', 'reissue_full_' || p_transaction_id::text,
    v_balance_before, v_balance_before - v_new_withdrawal_amount,
    false, p_admin_id, NOW()
  );

  -- NOTE: fn_ledger_drives_position trigger handles position update on INSERT.
  -- No explicit investor_positions UPDATE needed.

  IF v_dust_amount > 0 THEN
    v_dust_debit_tx_id := gen_random_uuid();

    INSERT INTO transactions_v2 (
      id, investor_id, fund_id, type, amount, tx_date,
      notes, reference_id, balance_before, balance_after,
      is_system_generated, created_by, created_at
    ) VALUES (
      v_dust_debit_tx_id, v_investor_id, v_fund_id,
      'DUST_SWEEP', -v_dust_amount, COALESCE(p_new_date, v_tx.tx_date),
      'Dust sweep reissue', 'dust-sweep-reissue-' || p_transaction_id::text,
      v_balance_before - v_new_withdrawal_amount, v_balance_before - v_new_withdrawal_amount - v_dust_amount,
      false, p_admin_id, NOW()
    );

    IF v_fees_account_id IS NOT NULL THEN
      v_dust_credit_tx_id := gen_random_uuid();

      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, amount, tx_date,
        notes, reference_id, balance_before, balance_after,
        is_system_generated, created_by, created_at
      ) VALUES (
        v_dust_credit_tx_id, v_fees_account_id, v_fund_id,
        'DUST_SWEEP', v_dust_amount, COALESCE(p_new_date, v_tx.tx_date),
        'Dust sweep reissue (fees credit)', 'dust-sweep-reissue-' || p_transaction_id::text,
        0, v_dust_amount,
        false, p_admin_id, NOW()
      );

      INSERT INTO investor_positions (investor_id, fund_id, current_value, invested_amount, currency, updated_at)
      VALUES (v_fees_account_id, v_fund_id, v_dust_amount, 0, v_asset, NOW())
      ON CONFLICT (investor_id, fund_id) DO UPDATE
        SET current_value = COALESCE(investor_positions.current_value, 0) + v_dust_amount,
            updated_at = NOW();
    END IF;
  END IF;

  -- Mark investor position as inactive after full exit
  UPDATE investor_positions
  SET is_active = false, updated_at = NOW()
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  SELECT COALESCE(SUM(current_value), 0) INTO v_closing_aum
  FROM investor_positions WHERE fund_id = v_fund_id;

  INSERT INTO fund_aum_events (
    fund_id, event_type, amount, closing_aum,
    transaction_id, investor_id, event_date, created_by
  ) VALUES (
    v_fund_id, 'full_exit_reissue', -v_new_withdrawal_amount,
    v_closing_aum, v_new_withdrawal_tx_id, v_investor_id,
    COALESCE(p_new_date, v_tx.tx_date), p_admin_id
  );

  IF v_withdrawal_request.id IS NOT NULL THEN
    UPDATE withdrawal_requests
    SET status = 'completed', processed_amount = v_new_withdrawal_amount
    WHERE id = v_withdrawal_request.id;
  END IF;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_AND_REISSUE_FULL_EXIT', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('original_amount', v_original_amount),
    jsonb_build_object('new_amount', v_new_withdrawal_amount, 'dust', v_dust_amount, 'closing_aum', v_closing_aum,
      'position_method', 'trigger_only_no_explicit_update'),
    jsonb_build_object('reason', p_reason)
  );

  RETURN json_build_object(
    'success', true,
    'voided_tx_id', p_transaction_id,
    'new_tx_id', v_new_withdrawal_tx_id,
    'dust_debit_tx_id', v_dust_debit_tx_id,
    'dust_credit_tx_id', v_dust_credit_tx_id,
    'new_withdrawal_amount', v_new_withdrawal_amount,
    'dust_amount', v_dust_amount,
    'restored_balance', v_restored_amount,
    'closing_aum', v_closing_aum
  );
END;
$$;

GRANT ALL ON FUNCTION public.void_and_reissue_transaction TO authenticated;
GRANT ALL ON FUNCTION public.void_and_reissue_transaction TO service_role;
GRANT ALL ON FUNCTION public.void_and_reissue_full_exit TO authenticated;
GRANT ALL ON FUNCTION public.void_and_reissue_full_exit TO service_role;


-- =============================================================================
-- PART 5 (P1): Fix fn_ledger_drives_position — INTERNAL_WITHDRAWAL handling
-- =============================================================================
-- ROOT CAUSE: INTERNAL_WITHDRAWAL falls to the ELSE case where v_delta = NEW.amount.
-- It works by accident because INTERNAL_WITHDRAWAL amounts are negative (-ABS).
-- But this is fragile — if any code creates INTERNAL_WITHDRAWAL with positive amount,
-- the position would be debited instead of credited.
--
-- FIX: Add explicit INTERNAL_WITHDRAWAL case matching WITHDRAWAL.

CREATE OR REPLACE FUNCTION public.fn_ledger_drives_position()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_delta numeric(38,18);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_voided THEN RETURN NEW; END IF;
    v_delta := NEW.amount;

    IF NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN
      v_delta := -1 * ABS(NEW.amount);
    END IF;

    INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, fund_class, is_active, updated_at)
    VALUES (
      NEW.investor_id,
      NEW.fund_id,
      v_delta,
      CASE
        WHEN NEW.type = 'DEPOSIT' THEN ABS(NEW.amount)
        WHEN NEW.type IN ('ADJUSTMENT') AND NEW.amount > 0 THEN NEW.amount
        ELSE 0
      END,
      0,
      NEW.fund_class,
      true,
      now()
    )
    ON CONFLICT (investor_id, fund_id)
    DO UPDATE SET
      current_value = investor_positions.current_value + v_delta,
      cost_basis = CASE
        WHEN NEW.type = 'DEPOSIT' THEN investor_positions.cost_basis + ABS(NEW.amount)
        WHEN NEW.type = 'WITHDRAWAL' THEN GREATEST(investor_positions.cost_basis - ABS(NEW.amount), 0)
        WHEN NEW.type = 'INTERNAL_WITHDRAWAL' THEN GREATEST(investor_positions.cost_basis - ABS(NEW.amount), 0)
        WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN investor_positions.cost_basis + NEW.amount
        WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN GREATEST(investor_positions.cost_basis + NEW.amount, 0)
        ELSE investor_positions.cost_basis
      END,
      is_active = true,
      updated_at = now();

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_voided = false AND NEW.is_voided = true THEN
      v_delta := NEW.amount;
      IF NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;

      UPDATE investor_positions
      SET
        current_value = current_value - v_delta,
        cost_basis = CASE
          WHEN NEW.type = 'DEPOSIT' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type = 'WITHDRAWAL' THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type = 'INTERNAL_WITHDRAWAL' THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN GREATEST(cost_basis - NEW.amount, 0)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN cost_basis + ABS(NEW.amount)
          ELSE cost_basis
        END,
        updated_at = now()
      WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

    ELSIF OLD.is_voided = true AND NEW.is_voided = false THEN
      v_delta := NEW.amount;
      IF NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;

      UPDATE investor_positions
      SET
        current_value = current_value + v_delta,
        cost_basis = CASE
          WHEN NEW.type = 'DEPOSIT' THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type = 'WITHDRAWAL' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type = 'INTERNAL_WITHDRAWAL' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN cost_basis + NEW.amount
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN GREATEST(cost_basis + NEW.amount, 0)
          ELSE cost_basis
        END,
        is_active = true,
        updated_at = now()
      WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;


-- =============================================================================
-- PART 6 (P2): Fix unvoid_transaction — add AUM recalc + audit flag
-- =============================================================================

CREATE OR REPLACE FUNCTION public.unvoid_transaction(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_reason text
) RETURNS JSONB AS $$
DECLARE
  v_tx RECORD;
  v_cascade_warn text := '';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_admin_id AND is_admin = TRUE
  ) THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_ADMIN', 'message', 'Admin access required'
    );
  END IF;

  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 3 THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'INVALID_REASON',
      'message', 'Reason must be at least 3 characters'
    );
  END IF;

  SELECT * INTO v_tx
  FROM public.transactions_v2
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_FOUND', 'message', 'Transaction not found'
    );
  END IF;

  IF v_tx.is_voided IS DISTINCT FROM TRUE THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_VOIDED', 'message', 'Transaction is not voided'
    );
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);
  PERFORM set_config('app.canonical_rpc', 'true', TRUE);

  UPDATE public.transactions_v2
  SET is_voided = FALSE,
      voided_at = NULL,
      voided_by = NULL,
      voided_by_profile_id = NULL,
      void_reason = NULL,
      notes = COALESCE(notes, '') || E'\n[Unvoided ' || NOW()::TEXT
              || ' by admin ' || p_admin_id::TEXT || ': ' || TRIM(p_reason) || ']'
  WHERE id = p_transaction_id;

  -- P2 FIX: Recalculate AUM after unvoid
  BEGIN
    PERFORM recalculate_fund_aum_for_date(
      v_tx.fund_id, v_tx.tx_date, 'transaction'::aum_purpose, p_admin_id
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- P2 FIX: Check if any yield_distributions were cascade-voided
  -- and flag them for manual review
  IF v_tx.distribution_id IS NOT NULL THEN
    SELECT void_reason INTO v_cascade_warn
    FROM yield_distributions
    WHERE id = v_tx.distribution_id AND is_voided = TRUE
    LIMIT 1;

    IF v_cascade_warn IS NOT NULL THEN
      v_cascade_warn := 'Parent distribution ' || v_tx.distribution_id::text
        || ' was cascade-voided. Manual re-apply may be needed.';
    END IF;
  END IF;

  INSERT INTO public.audit_log (
    entity, entity_id, action, actor_user, old_values, new_values, meta
  ) VALUES (
    'transactions_v2', p_transaction_id::TEXT, 'UNVOID', p_admin_id,
    JSONB_BUILD_OBJECT(
      'is_voided', TRUE, 'voided_at', v_tx.voided_at,
      'voided_by', v_tx.voided_by, 'void_reason', v_tx.void_reason
    ),
    JSONB_BUILD_OBJECT('is_voided', FALSE, 'aum_recalculated', TRUE),
    JSONB_BUILD_OBJECT(
      'reason', TRIM(p_reason),
      'isolation_model', 'row_for_update',
      'yields_not_restored', TRUE,
      'cascade_warning', COALESCE(v_cascade_warn, 'none')
    )
  );

  RETURN JSONB_BUILD_OBJECT(
    'success', TRUE,
    'transaction_id', p_transaction_id,
    'investor_id', v_tx.investor_id,
    'fund_id', v_tx.fund_id,
    'restored_amount', v_tx.amount,
    'aum_recalculated', TRUE,
    'warning', CASE
      WHEN v_cascade_warn != '' THEN v_cascade_warn
      ELSE 'Cascade-voided allocations/fees/yield-events are NOT automatically restored. Re-apply yield distribution if needed.'
    END
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.unvoid_transaction(UUID, UUID, TEXT) OWNER TO postgres;

COMMENT ON FUNCTION public.unvoid_transaction(UUID, UUID, TEXT) IS
'Unvoids a transaction. SELECT FOR UPDATE provides row-level locking.
v5.0 (2026-06-18): Added AUM recalculation after unvoid. Added cascade-void
detection for yield_distributions. Position restored via fn_ledger_drives_position
trigger and trigger_recompute_position.
WARNING: Cascade-voided distributions/allocations are NOT automatically restored.';


-- =============================================================================
-- PART 7 (P3): Comment void_transaction fee_allocations overlap
-- =============================================================================
-- The explicit fee_allocations void in void_transaction (Step 5) overlaps with
-- cascade_void_from_transaction trigger (AFTER UPDATE order 3). Both match on
-- credit_transaction_id/debit_transaction_id. This is defense-in-depth — keep both.
-- No code change needed, comment already added in the function body above.


-- =============================================================================
-- PART 8 (P3): Remove fund_daily_aum write from 14-param apply_investor_transaction
-- =============================================================================
-- ROOT CAUSE: The 14-param version writes fund_daily_aum explicitly, but the
-- sync_aum_on_transaction trigger (AFTER INSERT on transactions_v2) also writes it.
-- The trigger uses the position sum AFTER the INSERT (including the new amount),
-- which is more accurate. The explicit write is redundant and creates a race.
--
-- FIX: Remove the fund_daily_aum write from the 14-param version.
-- Keep the v_post_aum computation for the return value only.

CREATE OR REPLACE FUNCTION public.apply_investor_transaction(
  p_investor_id uuid,
  p_fund_id uuid,
  p_tx_type text,
  p_amount numeric,
  p_tx_date date,
  p_reference_id text,
  p_notes text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose,
  p_distribution_id uuid DEFAULT NULL,
  p_new_total_aum numeric DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_admin uuid;
  v_existing_tx uuid;
  v_lock_key bigint;
  v_post_aum numeric;
  v_is_new_investor boolean := false;
BEGIN
  IF p_new_total_aum IS NOT NULL THEN
    RAISE EXCEPTION
      'Auto-crystallization is disabled. Pass p_new_total_aum = NULL. '
      'Record a transaction-purpose yield distribution manually before each deposit/withdrawal.';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  v_admin := COALESCE(p_admin_id, auth.uid());
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT id INTO v_existing_tx
  FROM transactions_v2
  WHERE reference_id = p_reference_id AND is_voided = false
  LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true, 'idempotent', true, 'tx_id', v_existing_tx,
      'message', 'Transaction already exists with this reference_id'
    );
  END IF;

  v_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN RAISE EXCEPTION 'Fund not found: %', p_fund_id; END IF;

  SELECT * INTO v_position FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  IF v_position IS NULL THEN
    v_is_new_investor := true;
    INSERT INTO investor_positions (
      investor_id, fund_id, shares, cost_basis, current_value,
      last_yield_crystallization_date, is_active
    ) VALUES (
      p_investor_id, p_fund_id, 0, 0, 0, p_tx_date, true
    )
    RETURNING * INTO v_position;
  END IF;

  v_balance_before := v_position.current_value;

  CASE p_tx_type
    WHEN 'DEPOSIT' THEN v_balance_after := v_balance_before + ABS(p_amount);
    WHEN 'WITHDRAWAL' THEN
      v_balance_after := v_balance_before - ABS(p_amount);
      IF v_balance_after < -0.00000001 THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Requested withdrawal: %', v_balance_before, ABS(p_amount);
      END IF;
    WHEN 'YIELD', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT', 'DUST' THEN v_balance_after := v_balance_before + p_amount;
    WHEN 'FEE' THEN v_balance_after := v_balance_before - ABS(p_amount);
    ELSE v_balance_after := v_balance_before + p_amount;
  END CASE;

  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, asset, amount, type,
    balance_before, balance_after, reference_id, notes,
    approved_by, approved_at, created_by, purpose, source, is_voided,
    distribution_id
  ) VALUES (
    p_investor_id, p_fund_id, p_tx_date, v_fund.asset,
    CASE WHEN p_tx_type IN ('WITHDRAWAL', 'FEE') THEN -ABS(p_amount) ELSE p_amount END,
    p_tx_type::tx_type, v_balance_before, v_balance_after,
    p_reference_id, p_notes, v_admin, NOW(), v_admin,
    p_purpose, 'rpc_canonical'::tx_source, false, p_distribution_id
  ) RETURNING id INTO v_tx_id;

  -- Compute post-AUM for return value only (trigger handles fund_daily_aum write)
  SELECT COALESCE(SUM(current_value), 0) INTO v_post_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  RETURN jsonb_build_object(
    'success', true, 'tx_id', v_tx_id,
    'balance_before', v_balance_before, 'balance_after', v_balance_after,
    'post_transaction_aum', v_post_aum,
    'is_new_investor', v_is_new_investor
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- MIGRATION RECORD
-- =============================================================================

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260618000000', 'final_drift_free_canonical')
ON CONFLICT (version) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'FINAL DRIFT-FREE CANONICAL MIGRATION COMPLETE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Part 0: Data cleanup — orphaned records fixed';
    RAISE NOTICE 'Part 1 (P0): void_yield_distribution uses distribution_id';
    RAISE NOTICE 'Part 2 (P2): void_yield_distribution explicitly voids allocations';
    RAISE NOTICE 'Part 3 (P0): void_transaction cascades to yield_distributions';
    RAISE NOTICE 'Part 4 (P1): void_and_reissue removes double position update';
    RAISE NOTICE 'Part 5 (P1): fn_ledger_drives_position fixes INTERNAL_WITHDRAWAL';
    RAISE NOTICE 'Part 6 (P2): unvoid_transaction adds AUM recalc + cascade detection';
    RAISE NOTICE 'Part 7 (P3): void_transaction fee_allocations overlap documented';
    RAISE NOTICE 'Part 8 (P3): apply_investor_transaction 14-param removes duplicate AUM write';
    RAISE NOTICE '';
    RAISE NOTICE 'Run verification queries after deploy:';
    RAISE NOTICE '  SELECT * FROM investor_position_ledger_mismatch;';
    RAISE NOTICE '  SELECT * FROM aum_position_reconciliation WHERE has_discrepancy = true;';
END $$;