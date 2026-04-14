-- =============================================================================
-- STABILIZATION PHASE 2: Void Function Sanitization
-- =============================================================================
-- Explicitly removes any SET TRANSACTION ISOLATION LEVEL from RPC functions.
-- Uses advisory locks only - the correct pattern for PostgREST RPC.
--
-- PostgREST starts the transaction before calling the function, so setting
-- isolation level inside the function body fails with:
--   "SET TRANSACTION ISOLATION LEVEL must be called before any query"
--
-- Solution: Use pg_advisory_xact_lock for concurrency control (auto-releases)
-- =============================================================================

-- 1. void_transaction - use advisory lock, NO SET TRANSACTION ISOLATION
CREATE OR REPLACE FUNCTION public.void_transaction(
  p_transaction_id UUID,
  p_admin_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_tx RECORD;
  v_aum_events_voided INT := 0;
  v_daily_aum_voided INT := 0;
  v_fee_allocations_voided INT := 0;
  v_ib_ledger_voided INT := 0;
  v_platform_fee_voided INT := 0;
  v_yield_events_voided INT := 0;
  v_result JSONB;
BEGIN
  -- Advisory lock: prevents concurrent void of same transaction
  -- pg_advisory_xact_lock auto-releases at transaction end - no leak on error
  -- NO SET TRANSACTION ISOLATION LEVEL - illegal in PostgREST RPC
  PERFORM pg_advisory_xact_lock(hashtext('void_tx'), hashtext(p_transaction_id::TEXT));

  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);
  PERFORM set_config('app.canonical_rpc', 'true', TRUE);

  -- Admin authorization checks
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  IF NOT public.check_is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: admin privileges required for user %', p_admin_id;
  END IF;

  -- Fetch transaction
  SELECT * INTO v_tx FROM public.transactions_v2 WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided: %', p_transaction_id;
  END IF;

  -- Step 1: Mark transaction as voided
  -- transactions_v2 is append-only ledger - NO updated_at column
  -- Void state expressed via dedicated void columns only
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
      'yield_events_voided', v_yield_events_voided
    ),
    JSONB_BUILD_OBJECT(
      'source', 'void_transaction_rpc', 'cascade_v5', TRUE,
      'aum_recalculated', TRUE, 'isolation_model', 'advisory_xact_lock'
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
    'message', 'Transaction voided atomically with full cascade and AUM recalculation'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.void_transaction(UUID, UUID, TEXT) OWNER TO postgres;

COMMENT ON FUNCTION public.void_transaction(UUID, UUID, TEXT) IS
'Full cascade void: transactions_v2, fund_aum_events, fund_daily_aum, fee_allocations,
ib_commission_ledger, platform_fee_ledger, investor_yield_events. Recalculates AUM.
Concurrency: pg_advisory_xact_lock on transaction ID (auto-release at tx end).
v5.3 (2026-06-01): Explicitly removed SET TRANSACTION ISOLATION LEVEL - illegal in PostgREST RPC.
v5.3: Uses advisory lock only for concurrency control.';

---

-- 2. unvoid_transaction - use row-level lock, NO SET TRANSACTION ISOLATION
CREATE OR REPLACE FUNCTION public.unvoid_transaction(
  p_transaction_id UUID,
  p_admin_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_tx RECORD;
BEGIN
  -- Admin check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_admin_id AND is_admin = TRUE
  ) THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_ADMIN', 'message', 'Admin access required'
    );
  END IF;

  -- Reason validation
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 3 THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'INVALID_REASON',
      'message', 'Reason must be at least 3 characters'
    );
  END IF;

  -- Row-level lock prevents concurrent unvoid of same transaction
  -- NO SET TRANSACTION ISOLATION LEVEL - illegal in PostgREST RPC
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

  -- Mark transaction as not voided
  -- transactions_v2 is append-only ledger - NO updated_at column
  UPDATE public.transactions_v2
  SET is_voided = FALSE,
      voided_at = NULL,
      voided_by = NULL,
      voided_by_profile_id = NULL,
      void_reason = NULL,
      notes = COALESCE(notes, '') || E'\n[Unvoided ' || NOW()::TEXT
              || ' by admin ' || p_admin_id::TEXT || ': ' || TRIM(p_reason) || ']'
  WHERE id = p_transaction_id;

  -- Audit log
  INSERT INTO public.audit_log (
    entity, entity_id, action, actor_user, old_values, new_values, meta
  ) VALUES (
    'transactions_v2', p_transaction_id::TEXT, 'UNVOID', p_admin_id,
    JSONB_BUILD_OBJECT(
      'is_voided', TRUE, 'voided_at', v_tx.voided_at,
      'voided_by', v_tx.voided_by, 'void_reason', v_tx.void_reason
    ),
    JSONB_BUILD_OBJECT('is_voided', FALSE),
    JSONB_BUILD_OBJECT(
      'reason', TRIM(p_reason),
      'isolation_model', 'row_for_update',
      'yields_not_restored', TRUE
    )
  );

  RETURN JSONB_BUILD_OBJECT(
    'success', TRUE,
    'transaction_id', p_transaction_id,
    'investor_id', v_tx.investor_id,
    'fund_id', v_tx.fund_id,
    'restored_amount', v_tx.amount,
    'warning', 'Cascade-voided yields are NOT automatically restored. Admin must reapply.'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.unvoid_transaction(UUID, UUID, TEXT) OWNER TO postgres;

COMMENT ON FUNCTION public.unvoid_transaction(UUID, UUID, TEXT) IS
'Unvoids a transaction. SELECT FOR UPDATE provides row-level locking.
v4.3 (2026-06-01): Explicitly removed SET TRANSACTION ISOLATION LEVEL - illegal in PostgREST RPC.
v4.3: Uses row-level lock only for concurrency control.
WARNING: Cascade-voided yields are NOT automatically restored. Admin must reapply.';

---

-- 3. Migration record (Supabase uses version-based schema_migrations)
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260601010000_stabilization_phase2_void_sanitization', 'Stabilization Phase 2: Void function sanitization')
ON CONFLICT (version) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'STABILIZATION PHASE 2 COMPLETE - Void functions sanitized';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Verified: No SET TRANSACTION ISOLATION LEVEL in void/unvoid';
    RAISE NOTICE 'Verified: Advisory locks (pg_advisory_xact_lock) for concurrency';
    RAISE NOTICE 'Verified: transactions_v2 uses void columns only (no updated_at)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Proceed to Phase 3 - Yield Constraint Gate';
    RAISE NOTICE '        (Validate chk_correction_has_parent, add idempotency)';
END $$;