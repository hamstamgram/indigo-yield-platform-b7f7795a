-- Add fund-level advisory locks to void/unvoid operations - Phase 4A
-- Fixes: Race condition (concurrent void + yield apply) identified in POSITION_SYNC_DUPLICATE_ANALYSIS.md Finding 6
-- Ensures no two void/yield operations on the same fund can execute concurrently

-- 1. Wrapper function that acquires fund lock before void_transaction
-- Prevents concurrent void + yield apply on same fund
CREATE OR REPLACE FUNCTION public.void_transaction_with_lock(
  p_transaction_id UUID,
  p_admin_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_fund_id UUID;
  v_result JSONB;
  v_lock_acquired BOOLEAN;
BEGIN
  -- Fetch fund_id to use as lock key
  SELECT fund_id INTO v_fund_id
  FROM transactions_v2
  WHERE id = p_transaction_id;

  IF v_fund_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error_code', 'NOT_FOUND', 'message', 'Transaction not found');
  END IF;

  -- Acquire fund-level advisory lock
  -- This lock serializes all void/unvoid/yield operations on the same fund
  v_lock_acquired := pg_advisory_lock(HASHTEXT(v_fund_id::TEXT));

  BEGIN
    -- Call the atomic void_transaction function with lock held
    v_result := void_transaction(p_transaction_id, p_admin_id, p_reason);

    -- Release lock
    PERFORM pg_advisory_unlock(HASHTEXT(v_fund_id::TEXT));

    RETURN v_result;
  EXCEPTION WHEN OTHERS THEN
    -- Release lock on error
    PERFORM pg_advisory_unlock(HASHTEXT(v_fund_id::TEXT));
    RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.void_transaction_with_lock(UUID, UUID, TEXT) OWNER TO postgres;

COMMENT ON FUNCTION public.void_transaction_with_lock(UUID, UUID, TEXT) IS
'Wrapper around void_transaction that acquires a fund-level advisory lock.
Prevents concurrent void and yield operations on the same fund from interleaving.
IMPORTANT: Use this function instead of void_transaction directly.
Lock: pg_advisory_lock(HASHTEXT(fund_id::TEXT))';

---

-- 2. Wrapper function that acquires fund lock before unvoid_transaction
CREATE OR REPLACE FUNCTION public.unvoid_transaction_with_lock(
  p_transaction_id UUID,
  p_admin_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_fund_id UUID;
  v_result JSONB;
  v_lock_acquired BOOLEAN;
BEGIN
  -- Fetch fund_id to use as lock key
  SELECT fund_id INTO v_fund_id
  FROM transactions_v2
  WHERE id = p_transaction_id;

  IF v_fund_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error_code', 'NOT_FOUND', 'message', 'Transaction not found');
  END IF;

  -- Acquire fund-level advisory lock
  v_lock_acquired := pg_advisory_lock(HASHTEXT(v_fund_id::TEXT));

  BEGIN
    -- Call the atomic unvoid_transaction function with lock held
    v_result := unvoid_transaction(p_transaction_id, p_admin_id, p_reason);

    -- Release lock
    PERFORM pg_advisory_unlock(HASHTEXT(v_fund_id::TEXT));

    RETURN v_result;
  EXCEPTION WHEN OTHERS THEN
    -- Release lock on error
    PERFORM pg_advisory_unlock(HASHTEXT(v_fund_id::TEXT));
    RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.unvoid_transaction_with_lock(UUID, UUID, TEXT) OWNER TO postgres;

COMMENT ON FUNCTION public.unvoid_transaction_with_lock(UUID, UUID, TEXT) IS
'Wrapper around unvoid_transaction that acquires a fund-level advisory lock.
Prevents concurrent unvoid and yield operations on the same fund from interleaving.
IMPORTANT: Use this function instead of unvoid_transaction directly.
Lock: pg_advisory_lock(HASHTEXT(fund_id::TEXT))';

---

-- 3. Wrapper around apply_segmented_yield_distribution_v5 with fund-level lock
-- Prevents concurrent yield apply while void is executing on same fund
CREATE OR REPLACE FUNCTION public.apply_yield_distribution_v5_with_lock(
  p_fund_id UUID,
  p_period_end DATE,
  p_recorded_aum NUMERIC,
  p_admin_id UUID DEFAULT NULL,
  p_override_investor_id UUID DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'daily_operations'::aum_purpose,
  p_crystallization_date DATE DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_lock_acquired BOOLEAN;
BEGIN
  -- Acquire fund-level advisory lock
  -- This is the same lock used by void_transaction_with_lock and unvoid_transaction_with_lock
  -- So all three operations (void, unvoid, yield) serialize on the same fund lock
  v_lock_acquired := pg_advisory_lock(HASHTEXT(p_fund_id::TEXT));

  BEGIN
    -- Call original yield function with lock held
    -- This ensures yield apply cannot read inconsistent fund state while void is executing
    v_result := apply_segmented_yield_distribution_v5(
      p_fund_id,
      p_period_end,
      p_recorded_aum,
      p_admin_id,
      p_override_investor_id,
      p_purpose,
      p_crystallization_date
    );

    -- Release lock
    PERFORM pg_advisory_unlock(HASHTEXT(p_fund_id::TEXT));

    RETURN v_result;
  EXCEPTION WHEN OTHERS THEN
    -- Release lock on error
    PERFORM pg_advisory_unlock(HASHTEXT(p_fund_id::TEXT));
    RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.apply_yield_distribution_v5_with_lock(
  UUID, DATE, NUMERIC, UUID, UUID, aum_purpose, DATE
) OWNER TO postgres;

COMMENT ON FUNCTION public.apply_yield_distribution_v5_with_lock(
  UUID, DATE, NUMERIC, UUID, UUID, aum_purpose, DATE
) IS
'Wrapper around apply_segmented_yield_distribution_v5 that acquires a fund-level advisory lock.
Prevents concurrent yield application while void/unvoid operations are executing on the same fund.
This prevents the race condition where yield apply reads fund state mid-void and applies yield to voided transactions.
IMPORTANT: Use this function instead of apply_segmented_yield_distribution_v5 for production yield application.
Lock: pg_advisory_lock(HASHTEXT(fund_id::TEXT)) - same lock as void_transaction_with_lock and unvoid_transaction_with_lock';

---

-- Migration record
INSERT INTO schema_migrations (name, hash, executed_at)
VALUES ('20260512000000_void_fund_level_locking', MD5(current_setting('server_version')), NOW())
ON CONFLICT (name) DO NOTHING;
