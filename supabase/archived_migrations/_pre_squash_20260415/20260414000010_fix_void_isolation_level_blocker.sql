-- ============================================================
-- BLOCKER FIX: Remove SET TRANSACTION ISOLATION LEVEL from
-- void_transaction and unvoid_transaction.
--
-- Root cause: PostgREST issues BEGIN + auth context queries
-- (SET LOCAL role, SET LOCAL jwt.claims) before the RPC
-- function body executes. SET TRANSACTION ISOLATION LEVEL
-- must be the very first statement after a bare BEGIN.
-- Once any query has run, PostgreSQL raises:
--   "SET TRANSACTION ISOLATION LEVEL must be called before any query"
--
-- The old live functions also had:
--   - Wrong column name: aum instead of total_aum on fund_daily_aum
--   - Missing full cascade (only 3 steps, not 9)
--   - pg_advisory_lock/unlock pairs that can leak on error
--
-- This migration deploys correct full-cascade versions and
-- converts all advisory locks to pg_advisory_xact_lock
-- (auto-releases at transaction end, no leak risk).
--
-- Concurrency safety preserved via advisory locks.
-- Atomicity preserved via PostgreSQL transaction semantics.
-- ============================================================

-- 1. void_transaction — full 9-step cascade, no isolation statement
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

  -- Step 1: Mark transaction as voided
  UPDATE public.transactions_v2
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id, void_reason = p_reason, updated_at = NOW()
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
v5.1: Fixed wrong column name (aum→total_aum) and missing cascade steps.';

---

-- 2. unvoid_transaction — proper row-lock, no isolation statement
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

  UPDATE public.transactions_v2
  SET is_voided = FALSE,
      voided_at = NULL,
      voided_by = NULL,
      voided_by_profile_id = NULL,
      void_reason = NULL,
      notes = COALESCE(notes, '') || E'\n[Unvoided ' || NOW()::TEXT
              || ' by admin ' || p_admin_id::TEXT || ': ' || TRIM(p_reason) || ']',
      updated_at = NOW()
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
WARNING: Cascade-voided yields are NOT automatically restored. Admin must reapply.';

---

-- 3. void_transaction_with_lock — pg_advisory_xact_lock (auto-release, no leak)
CREATE OR REPLACE FUNCTION public.void_transaction_with_lock(
  p_transaction_id UUID,
  p_admin_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_fund_id UUID;
BEGIN
  SELECT fund_id INTO v_fund_id
  FROM public.transactions_v2
  WHERE id = p_transaction_id;

  IF v_fund_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_FOUND', 'message', 'Transaction not found'
    );
  END IF;

  -- Fund-level lock: serializes all void/unvoid/yield on the same fund.
  -- Same key as unvoid_transaction_with_lock and apply_yield_distribution_v5_with_lock.
  -- pg_advisory_xact_lock auto-releases at transaction end — no manual unlock, no leak.
  PERFORM pg_advisory_xact_lock(hashtext(v_fund_id::TEXT));

  RETURN public.void_transaction(p_transaction_id, p_admin_id, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.void_transaction_with_lock(UUID, UUID, TEXT) OWNER TO postgres;

COMMENT ON FUNCTION public.void_transaction_with_lock(UUID, UUID, TEXT) IS
'Fund-level advisory lock wrapper for void_transaction.
Serializes void/unvoid/yield operations on the same fund.
v2 (2026-04-14): Converted to pg_advisory_xact_lock (auto-release).';

---

-- 4. unvoid_transaction_with_lock — pg_advisory_xact_lock (auto-release)
CREATE OR REPLACE FUNCTION public.unvoid_transaction_with_lock(
  p_transaction_id UUID,
  p_admin_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_fund_id UUID;
BEGIN
  SELECT fund_id INTO v_fund_id
  FROM public.transactions_v2
  WHERE id = p_transaction_id;

  IF v_fund_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_FOUND', 'message', 'Transaction not found'
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_fund_id::TEXT));

  RETURN public.unvoid_transaction(p_transaction_id, p_admin_id, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.unvoid_transaction_with_lock(UUID, UUID, TEXT) OWNER TO postgres;

COMMENT ON FUNCTION public.unvoid_transaction_with_lock(UUID, UUID, TEXT) IS
'Fund-level advisory lock wrapper for unvoid_transaction.
v2 (2026-04-14): Converted to pg_advisory_xact_lock (auto-release).';

---

-- 5. apply_yield_distribution_v5_with_lock — correct signature matching live inner function
CREATE OR REPLACE FUNCTION public.apply_yield_distribution_v5_with_lock(
  p_fund_id UUID,
  p_period_end DATE,
  p_recorded_aum NUMERIC,
  p_admin_id UUID DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose,
  p_distribution_date DATE DEFAULT NULL,
  p_opening_aum NUMERIC DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Fund-level lock: same key as void/unvoid wrappers.
  -- Prevents yield apply from reading inconsistent fund state during void.
  PERFORM pg_advisory_xact_lock(hashtext(p_fund_id::TEXT));

  v_result := public.apply_segmented_yield_distribution_v5(
    p_fund_id,
    p_period_end,
    p_recorded_aum,
    p_admin_id,
    p_purpose,
    p_distribution_date,
    p_opening_aum
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.apply_yield_distribution_v5_with_lock(
  UUID, DATE, NUMERIC, UUID, aum_purpose, DATE, NUMERIC
) OWNER TO postgres;

COMMENT ON FUNCTION public.apply_yield_distribution_v5_with_lock(
  UUID, DATE, NUMERIC, UUID, aum_purpose, DATE, NUMERIC
) IS
'Fund-level advisory lock wrapper for apply_segmented_yield_distribution_v5.
Prevents concurrent void/unvoid from racing yield application on the same fund.
v2 (2026-04-14): Fixed wrong call signature (was passing investor_id, yield_amount).
v2: Converted to pg_advisory_xact_lock (auto-release).';

---

-- 6. Drop old broken apply_yield_distribution_v5_with_lock overload
-- that took (investor_id uuid, fund_id uuid, yield_amount numeric) — wrong signature
DROP FUNCTION IF EXISTS public.apply_yield_distribution_v5_with_lock(uuid, uuid, numeric);
