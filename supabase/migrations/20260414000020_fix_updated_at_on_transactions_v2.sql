-- ============================================================
-- BLOCKER FIX: Remove updated_at = NOW() from transactions_v2 UPDATEs.
--
-- Root cause: transactions_v2 is an intentionally immutable financial
-- ledger. It has no updated_at column. Void state is expressed through
-- dedicated columns: is_voided, voided_at, voided_by, voided_by_profile_id,
-- void_reason. Migration 20260414000010 introduced updated_at = NOW()
-- into both void_transaction and unvoid_transaction UPDATE statements
-- against this table, causing every void/unvoid call to fail with:
--   column "updated_at" of relation "transactions_v2" does not exist
--
-- Fix: remove updated_at = NOW() from the two UPDATE public.transactions_v2
-- statements. All other updated_at = NOW() clauses in these functions target
-- other tables (fund_aum_events, fee_allocations, etc.) that have the column
-- and are not affected.
--
-- Scope: void_transaction and unvoid_transaction only.
-- No schema change. No column added. No other function modified.
-- ============================================================

-- 1. void_transaction — identical to 20260414000010 except updated_at removed
--    from UPDATE public.transactions_v2 (Step 1).
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
  -- Advisory lock: prevent concurrent void of same transaction.
  -- pg_advisory_xact_lock auto-releases at transaction end — no leak on error.
  -- SET TRANSACTION ISOLATION LEVEL intentionally absent: PostgREST has already
  -- started the transaction with auth context queries before this function runs.
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

  -- Step 1: Mark transaction as voided.
  -- transactions_v2 is an append-only ledger: no updated_at column.
  -- Void state is fully expressed by the five void-specific columns below.
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
v5.1 (2026-04-14): Removed SET TRANSACTION ISOLATION LEVEL — illegal in PostgREST RPC.
v5.1: Fixed wrong column name (aum→total_aum) and missing cascade steps.
v5.2 (2026-04-14): Removed updated_at from UPDATE transactions_v2 — column does not exist
(transactions_v2 is an append-only ledger; void state is in dedicated void columns).';

---

-- 2. unvoid_transaction — identical to 20260414000010 except updated_at removed
--    from UPDATE public.transactions_v2.
CREATE OR REPLACE FUNCTION public.unvoid_transaction(
  p_transaction_id UUID,
  p_admin_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_tx RECORD;
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

  -- Row-level lock prevents concurrent unvoid of same transaction.
  -- SET TRANSACTION ISOLATION LEVEL intentionally absent — illegal in PostgREST RPC.
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

  -- transactions_v2 is an append-only ledger: no updated_at column.
  -- Unvoid state is expressed by clearing the five void-specific columns.
  -- The notes column appends an unvoid record for the human audit trail.
  UPDATE public.transactions_v2
  SET is_voided = FALSE,
      voided_at = NULL,
      voided_by = NULL,
      voided_by_profile_id = NULL,
      void_reason = NULL,
      notes = COALESCE(notes, '') || E'\n[Unvoided ' || NOW()::TEXT
              || ' by admin ' || p_admin_id::TEXT || ': ' || TRIM(p_reason) || ']'
  WHERE id = p_transaction_id;

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
v4.1 (2026-04-14): Removed SET TRANSACTION ISOLATION LEVEL — illegal in PostgREST RPC.
v4.2 (2026-04-14): Removed updated_at from UPDATE transactions_v2 — column does not exist
(transactions_v2 is an append-only ledger; void state is in dedicated void columns).
WARNING: Cascade-voided yields are NOT automatically restored. Admin must reapply.';
