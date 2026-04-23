-- Migration: fix_cascade_void_and_add_constraints
-- Purpose:
--   1. Rewrite cascade void triggers to set voided_at on all child tables
--   2. Fix void_yield_distribution RPC to set voided_at on ledger tables
--   3. Add CHECK constraints to prevent half-voided states
--   4. Backfill any remaining half-voided records (safety net)

-- =============================================================================
-- 1. REWRITE cascade_void_from_transaction
-- =============================================================================
CREATE OR REPLACE FUNCTION cascade_void_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_voided = true AND (OLD.is_voided IS NULL OR OLD.is_voided = false) THEN
    -- Mark audit entries
    UPDATE data_edit_audit
    SET voided_record = true
    WHERE record_id = NEW.id::uuid
      AND table_name = 'transactions_v2';

    -- Cascade to fee_allocations
    UPDATE fee_allocations
    SET is_voided = true,
        voided_at = COALESCE(NEW.voided_at, NOW()),
        voided_by = NEW.voided_by,
        voided_by_profile_id = NEW.voided_by_profile_id
    WHERE (debit_transaction_id = NEW.id OR credit_transaction_id = NEW.id)
      AND (is_voided = false OR is_voided IS NULL);

    -- Cascade to ib_commission_ledger via transaction_id
    UPDATE ib_commission_ledger
    SET is_voided = true,
        voided_at = COALESCE(NEW.voided_at, NOW()),
        voided_by = NEW.voided_by,
        voided_by_profile_id = NEW.voided_by_profile_id,
        void_reason = COALESCE(NEW.void_reason, 'Cascade from transaction')
    WHERE transaction_id = NEW.id
      AND (is_voided = false OR is_voided IS NULL);

    -- Cascade to platform_fee_ledger via transaction_id
    UPDATE platform_fee_ledger
    SET is_voided = true,
        voided_at = COALESCE(NEW.voided_at, NOW()),
        voided_by = NEW.voided_by,
        voided_by_profile_id = NEW.voided_by_profile_id,
        void_reason = COALESCE(NEW.void_reason, 'Cascade from transaction')
    WHERE transaction_id = NEW.id
      AND (is_voided = false OR is_voided IS NULL);

    -- Cascade to investor_yield_events via trigger_transaction_id
    UPDATE investor_yield_events
    SET is_voided = true,
        voided_at = COALESCE(NEW.voided_at, NOW()),
        voided_by = NEW.voided_by,
        voided_by_profile_id = NEW.voided_by_profile_id,
        void_reason = COALESCE(NEW.void_reason, 'Cascade from transaction')
    WHERE trigger_transaction_id = NEW.id
      AND (is_voided = false OR is_voided IS NULL);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. REWRITE cascade_void_to_allocations
-- =============================================================================
CREATE OR REPLACE FUNCTION cascade_void_to_allocations()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_voided = true AND (OLD.is_voided = false OR OLD.is_voided IS NULL) THEN

    -- Cascade to yield_allocations
    UPDATE yield_allocations
    SET is_voided = true,
        voided_at = COALESCE(NEW.voided_at, NOW()),
        voided_by = NEW.voided_by,
        voided_by_profile_id = NEW.voided_by_profile_id,
        void_reason = COALESCE(NEW.void_reason, 'Cascade from yield_distributions')
    WHERE distribution_id = NEW.id
      AND (is_voided = false OR is_voided IS NULL);

    -- Cascade to fee_allocations
    UPDATE fee_allocations
    SET is_voided = true,
        voided_at = COALESCE(NEW.voided_at, NOW()),
        voided_by = NEW.voided_by,
        voided_by_profile_id = NEW.voided_by_profile_id,
        void_reason = COALESCE(NEW.void_reason, 'Cascade from yield_distributions')
    WHERE distribution_id = NEW.id
      AND (is_voided = false OR is_voided IS NULL);

    -- Cascade to ib_allocations
    UPDATE ib_allocations
    SET is_voided = true,
        voided_at = COALESCE(NEW.voided_at, NOW()),
        voided_by = NEW.voided_by,
        voided_by_profile_id = NEW.voided_by_profile_id,
        void_reason = COALESCE(NEW.void_reason, 'Cascade from yield_distributions')
    WHERE distribution_id = NEW.id
      AND (is_voided = false OR is_voided IS NULL);

    -- Void associated fund_daily_aum records
    -- This works because the calling RPC sets indigo.canonical_rpc = true
    UPDATE fund_daily_aum
    SET is_voided = true,
        voided_at = COALESCE(NEW.voided_at, NOW()),
        voided_by = NEW.voided_by,
        voided_by_profile_id = NEW.voided_by_profile_id,
        void_reason = COALESCE(NEW.void_reason, 'Cascade from yield_distributions')
    WHERE fund_id = NEW.fund_id
      AND aum_date = NEW.period_end
      AND source = 'yield_distribution_v5'
      AND (is_voided = false OR is_voided IS NULL);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. REWRITE cascade_void_to_yield_events (extend to also cascade from distributions)
-- =============================================================================
CREATE OR REPLACE FUNCTION cascade_void_to_yield_events()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.voided_at IS NOT NULL AND OLD.voided_at IS NULL THEN
    UPDATE data_edit_audit
    SET voided_record = true
    WHERE record_id = NEW.id::uuid
      AND table_name = 'yield_distributions';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. FIX void_yield_distribution RPC to set voided_at on ledger tables
-- =============================================================================
DROP FUNCTION IF EXISTS void_yield_distribution(uuid, uuid, text, boolean);

CREATE OR REPLACE FUNCTION void_yield_distribution(
  p_distribution_id uuid,
  p_admin_id uuid,
  p_reason text,
  p_void_crystals boolean
) RETURNS json AS $$
DECLARE
  v_dist RECORD;
  v_voided_txs int := 0;
  v_voided_allocs int := 0;
  v_voided_crystals int := 0;
  v_crystal RECORD;
  v_tx RECORD;
  v_affected_investor RECORD;
  v_fees_account_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM pg_advisory_xact_lock(hashtext('void_yd:' || p_distribution_id::text));

  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  IF v_dist IS NULL THEN RAISE EXCEPTION 'Distribution not found: %', p_distribution_id; END IF;
  IF v_dist.is_voided THEN RETURN json_build_object('success', true, 'message', 'Already voided'); END IF;

  SELECT id INTO v_fees_account_id FROM profiles WHERE account_type = 'fees_account' AND is_system_account = true LIMIT 1;

  IF p_void_crystals THEN
    FOR v_crystal IN SELECT id, effective_date FROM yield_distributions WHERE consolidated_into_id = p_distribution_id AND NOT is_voided
    LOOP
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
        UPDATE investor_yield_events
        SET is_voided = true,
            voided_at = NOW(),
            voided_by = p_admin_id,
            voided_by_profile_id = p_admin_id
        WHERE reference_id LIKE 'YLD:' || v_dist.fund_id || ':' || v_crystal.effective_date::text || ':%'
          AND (is_voided = false OR is_voided IS NULL);
      END IF;

      UPDATE yield_distributions
      SET is_voided = true,
          status = 'voided',
          voided_at = NOW(),
          voided_by = p_admin_id,
          void_reason = 'Cascade void from distribution ' || p_distribution_id::text,
          consolidated_into_id = NULL
      WHERE id = v_crystal.id;
      v_voided_crystals := v_voided_crystals + 1;
    END LOOP;
  ELSE
    UPDATE yield_distributions SET consolidated_into_id = NULL WHERE consolidated_into_id = p_distribution_id AND NOT is_voided;
  END IF;

  FOR v_tx IN SELECT id, investor_id FROM transactions_v2
    WHERE distribution_id = p_distribution_id
      AND type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT')
      AND NOT is_voided
  LOOP
    UPDATE transactions_v2
    SET is_voided = true,
        voided_at = NOW(),
        voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;

    PERFORM public.recompute_investor_position(v_tx.investor_id, v_dist.fund_id);
  END LOOP;

  FOR v_tx IN SELECT id, investor_id FROM transactions_v2
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
    UPDATE transactions_v2
    SET is_voided = true,
        voided_at = NOW(),
        voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;

    PERFORM public.recompute_investor_position(v_tx.investor_id, v_dist.fund_id);
  END LOOP;

  UPDATE yield_allocations
  SET is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade void from distribution ' || p_distribution_id::text
  WHERE distribution_id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);

  UPDATE ib_allocations
  SET is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
  WHERE distribution_id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);

  -- FIX: set voided_at on ledger tables too
  UPDATE platform_fee_ledger
  SET is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
  WHERE yield_distribution_id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);

  UPDATE ib_commission_ledger
  SET is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
  WHERE yield_distribution_id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);

  UPDATE yield_distributions
  SET is_voided = true,
      status = 'voided',
      voided_at = NOW(),
      voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = p_reason
  WHERE id = p_distribution_id;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
    UPDATE investor_yield_events
    SET is_voided = true,
        voided_at = NOW(),
        voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id
    WHERE trigger_transaction_id IN (
      SELECT id FROM transactions_v2 WHERE distribution_id = p_distribution_id AND is_voided = true
    ) AND (is_voided = false OR is_voided IS NULL);

    UPDATE investor_yield_events
    SET is_voided = true,
        voided_at = NOW(),
        voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id
    WHERE reference_id LIKE 'YLD:' || v_dist.fund_id || ':' || v_dist.effective_date::text || ':%'
      AND (is_voided = false OR is_voided IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM yield_distributions yd
        WHERE yd.fund_id = v_dist.fund_id
          AND yd.effective_date = v_dist.effective_date
          AND yd.is_voided = false
      );
  END IF;

  FOR v_affected_investor IN
    SELECT DISTINCT investor_id FROM transactions_v2
    WHERE distribution_id = p_distribution_id
      AND investor_id IS NOT NULL
  LOOP
    PERFORM recompute_investor_position(v_affected_investor.investor_id, v_dist.fund_id);
  END LOOP;

  IF v_fees_account_id IS NOT NULL THEN
    PERFORM recompute_investor_position(v_fees_account_id, v_dist.fund_id);
  END IF;

  BEGIN
    PERFORM recalculate_fund_aum_for_date(v_dist.fund_id, v_dist.effective_date);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta) VALUES (
    p_admin_id, 'YIELD_DISTRIBUTION_VOIDED', 'yield_distributions', p_distribution_id::text,
    jsonb_build_object('status', v_dist.status, 'gross_yield', v_dist.gross_yield),
    jsonb_build_object('is_voided', true, 'status', 'voided', 'void_reason', p_reason),
    jsonb_build_object('voided_txs', v_voided_txs, 'voided_crystals', v_voided_crystals,
      'void_crystals_requested', p_void_crystals, 'fund_id', v_dist.fund_id,
      'lookup_method', 'distribution_id_primary_pattern_fallback',
      'fees_account_recomputed', v_fees_account_id IS NOT NULL,
      'dual_path_position_recompute', true)
  );

  RETURN json_build_object(
    'success', true,
    'distribution_id', p_distribution_id,
    'voided_count', v_voided_txs,
    'voided_crystals', v_voided_crystals,
    'fees_account_recomputed', v_fees_account_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. SAFETY BACKFILL: ensure no half-voided records remain before adding constraints
-- =============================================================================

-- Backfill from parent transactions where possible
UPDATE ib_commission_ledger icl
SET voided_at = t.voided_at,
    voided_by = t.voided_by,
    voided_by_profile_id = t.voided_by_profile_id
FROM transactions_v2 t
WHERE icl.transaction_id = t.id
  AND icl.is_voided = true AND icl.voided_at IS NULL
  AND t.voided_at IS NOT NULL;

UPDATE platform_fee_ledger pfl
SET voided_at = t.voided_at,
    voided_by = t.voided_by,
    voided_by_profile_id = t.voided_by_profile_id
FROM transactions_v2 t
WHERE pfl.transaction_id = t.id
  AND pfl.is_voided = true AND pfl.voided_at IS NULL
  AND t.voided_at IS NOT NULL;

UPDATE investor_yield_events iye
SET voided_at = t.voided_at,
    voided_by = t.voided_by,
    voided_by_profile_id = t.voided_by_profile_id
FROM transactions_v2 t
WHERE iye.trigger_transaction_id = t.id
  AND iye.is_voided = true AND iye.voided_at IS NULL
  AND t.voided_at IS NOT NULL;

UPDATE yield_allocations ya
SET voided_at = d.voided_at,
    voided_by = d.voided_by,
    voided_by_profile_id = d.voided_by_profile_id
FROM yield_distributions d
WHERE ya.distribution_id = d.id
  AND ya.is_voided = true AND ya.voided_at IS NULL
  AND d.voided_at IS NOT NULL;

UPDATE ib_allocations ia
SET voided_at = d.voided_at,
    voided_by = d.voided_by,
    voided_by_profile_id = d.voided_by_profile_id
FROM yield_distributions d
WHERE ia.distribution_id = d.id
  AND ia.is_voided = true AND ia.voided_at IS NULL
  AND d.voided_at IS NOT NULL;

-- Orphan records: set voided_at to created_at as last resort
UPDATE ib_commission_ledger SET voided_at = created_at WHERE is_voided = true AND voided_at IS NULL;
UPDATE platform_fee_ledger SET voided_at = created_at WHERE is_voided = true AND voided_at IS NULL;
UPDATE investor_yield_events SET voided_at = created_at WHERE is_voided = true AND voided_at IS NULL;
UPDATE yield_allocations SET voided_at = created_at WHERE is_voided = true AND voided_at IS NULL;
UPDATE ib_allocations SET voided_at = created_at WHERE is_voided = true AND voided_at IS NULL;

-- fund_daily_aum requires canonical RPC flag to bypass mutation guard
SELECT set_config('indigo.canonical_rpc', 'true', true);
UPDATE fund_daily_aum SET voided_at = created_at WHERE is_voided = true AND voided_at IS NULL;

-- =============================================================================
-- 6. ADD CHECK CONSTRAINTS to prevent future half-voided states
-- =============================================================================

ALTER TABLE yield_allocations
  ADD CONSTRAINT chk_yield_allocations_void_complete
  CHECK (is_voided = false OR is_voided IS NULL OR voided_at IS NOT NULL);

ALTER TABLE ib_allocations
  ADD CONSTRAINT chk_ib_allocations_void_complete
  CHECK (is_voided = false OR is_voided IS NULL OR voided_at IS NOT NULL);

ALTER TABLE investor_yield_events
  ADD CONSTRAINT chk_investor_yield_events_void_complete
  CHECK (is_voided = false OR is_voided IS NULL OR voided_at IS NOT NULL);

ALTER TABLE ib_commission_ledger
  ADD CONSTRAINT chk_ib_commission_ledger_void_complete
  CHECK (is_voided = false OR is_voided IS NULL OR voided_at IS NOT NULL);

ALTER TABLE platform_fee_ledger
  ADD CONSTRAINT chk_platform_fee_ledger_void_complete
  CHECK (is_voided = false OR is_voided IS NULL OR voided_at IS NOT NULL);

ALTER TABLE fee_allocations
  ADD CONSTRAINT chk_fee_allocations_void_complete
  CHECK (is_voided = false OR is_voided IS NULL OR voided_at IS NOT NULL);

ALTER TABLE fund_daily_aum
  ADD CONSTRAINT chk_fund_daily_aum_void_complete
  CHECK (is_voided = false OR is_voided IS NULL OR voided_at IS NOT NULL);
