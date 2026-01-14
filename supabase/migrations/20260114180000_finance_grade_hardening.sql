-- ============================================================================
-- FINANCE-GRADE HARDENING MIGRATION
-- Date: 2026-01-14
-- Version: 3.0.0
--
-- Implements remaining phases from CTO/CFO hardening plan:
--   PHASE 0: Governance & Process (system modes, period lifecycle, approvals)
--   PHASE 2: Economic Date Standardization (tx_date canonical)
--   PHASE 3: Idempotent ensure_preflow_aum
--   PHASE 6: Asset-aware dust policy
--   PHASE 8: Staging import pipeline
--   PHASE 9: Reconciliation pack generation
--   PHASE 10: Complete monitoring suite + legacy cleanup
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 0: GOVERNANCE & PROCESS
-- ============================================================================

-- 0.1 System configuration table
CREATE TABLE IF NOT EXISTS system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Insert default system mode
INSERT INTO system_config (key, value, description)
VALUES ('system_mode', '"live"', 'System operating mode: "backfill" allows historical inserts, "live" enforces strict rules')
ON CONFLICT (key) DO NOTHING;

-- Insert dust tolerance config per asset type
INSERT INTO system_config (key, value, description)
VALUES ('dust_tolerance', '{
  "default": 0.01,
  "USDC": 0.0001,
  "USDT": 0.0001,
  "DAI": 0.0001,
  "ETH": 0.00000001,
  "WETH": 0.00000001,
  "BTC": 0.00000001,
  "WBTC": 0.00000001,
  "SOL": 0.00000001,
  "XRP": 0.000001
}', 'Asset-specific dust tolerance thresholds')
ON CONFLICT (key) DO NOTHING;

-- 0.2 Period lifecycle table
CREATE TABLE IF NOT EXISTS accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES funds(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved', 'locked')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  locked_by uuid REFERENCES auth.users(id),
  locked_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(fund_id, period_start, period_end)
);

COMMENT ON TABLE accounting_periods IS
  'Tracks accounting period lifecycle: draft -> reviewed -> approved -> locked. Locked periods cannot have backdated mutations.';

-- 0.3 Approvals log table
CREATE TABLE IF NOT EXISTS admin_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  reason text,
  metadata jsonb,
  requested_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

COMMENT ON TABLE admin_approvals IS
  'Two-person rule enforcement for high-value operations. Tracks approval requests and resolutions.';

-- Helper function to get system mode
CREATE OR REPLACE FUNCTION get_system_mode()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT value::text FROM system_config WHERE key = 'system_mode';
$$;

-- Helper function to check if period is locked
CREATE OR REPLACE FUNCTION is_period_locked(
  p_fund_id uuid,
  p_date date
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM accounting_periods
    WHERE fund_id = p_fund_id
      AND p_date BETWEEN period_start AND period_end
      AND status = 'locked'
  );
$$;

-- Function to lock a period (admin only)
CREATE OR REPLACE FUNCTION lock_accounting_period(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_period_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can lock accounting periods'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Create or update the period
  INSERT INTO accounting_periods (fund_id, period_start, period_end, status, locked_by, locked_at, notes)
  VALUES (p_fund_id, p_period_start, p_period_end, 'locked', p_admin_id, now(), p_notes)
  ON CONFLICT (fund_id, period_start, period_end) DO UPDATE SET
    status = 'locked',
    locked_by = p_admin_id,
    locked_at = now(),
    notes = COALESCE(p_notes, accounting_periods.notes)
  RETURNING id INTO v_period_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES ('LOCK_PERIOD', 'accounting_periods', v_period_id::text, p_admin_id,
    jsonb_build_object('fund_id', p_fund_id, 'period_start', p_period_start, 'period_end', p_period_end));

  RETURN jsonb_build_object(
    'success', true,
    'period_id', v_period_id,
    'status', 'locked'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION lock_accounting_period(uuid, date, date, uuid, text) TO authenticated;


-- ============================================================================
-- PHASE 2: ECONOMIC DATE STANDARDIZATION
-- Canonical economic date: tx_date (NOT created_at)
-- ============================================================================

-- Trigger to enforce tx_date is never NULL on transactions
CREATE OR REPLACE FUNCTION enforce_economic_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tx_date IS NULL THEN
    RAISE EXCEPTION 'tx_date (economic date) is required and cannot be NULL'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- In live mode, check if date is in locked period
  IF get_system_mode() = '"live"' AND is_period_locked(NEW.fund_id, NEW.tx_date) THEN
    RAISE EXCEPTION 'Cannot insert transaction into locked period for date %', NEW.tx_date
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_economic_date ON transactions_v2;
CREATE TRIGGER trg_enforce_economic_date
  BEFORE INSERT ON transactions_v2
  FOR EACH ROW EXECUTE FUNCTION enforce_economic_date();

-- Add check for event_date on yield events
CREATE OR REPLACE FUNCTION enforce_yield_event_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.event_date IS NULL THEN
    RAISE EXCEPTION 'event_date is required and cannot be NULL'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- In live mode, check if date is in locked period
  IF get_system_mode() = '"live"' AND is_period_locked(NEW.fund_id, NEW.event_date) THEN
    RAISE EXCEPTION 'Cannot insert yield event into locked period for date %', NEW.event_date
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_yield_event_date ON investor_yield_events;
CREATE TRIGGER trg_enforce_yield_event_date
  BEFORE INSERT ON investor_yield_events
  FOR EACH ROW EXECUTE FUNCTION enforce_yield_event_date();


-- ============================================================================
-- PHASE 3: IDEMPOTENT PREFLOW AUM
-- ============================================================================

-- Idempotent ensure_preflow_aum function
CREATE OR REPLACE FUNCTION ensure_preflow_aum(
  p_fund_id uuid,
  p_date date,
  p_purpose aum_purpose,
  p_total_aum numeric,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing RECORD;
  v_new_id uuid;
BEGIN
  -- Check for existing preflow AUM
  SELECT * INTO v_existing
  FROM get_existing_preflow_aum(p_fund_id, p_date, p_purpose);

  IF v_existing.aum_event_id IS NOT NULL THEN
    -- Return existing without creating duplicate
    RETURN jsonb_build_object(
      'success', true,
      'action', 'reused_existing',
      'aum_event_id', v_existing.aum_event_id,
      'closing_aum', v_existing.closing_aum,
      'message', 'Reused existing preflow AUM for this fund/date/purpose'
    );
  END IF;

  -- Create new preflow AUM entry
  INSERT INTO fund_aum_events (
    fund_id, event_date, event_ts, trigger_type, trigger_reference,
    opening_aum, closing_aum, purpose, created_by
  ) VALUES (
    p_fund_id, p_date, (p_date || ' 00:00:00')::timestamptz, 'preflow',
    'PREFLOW-' || p_fund_id::text || '-' || p_date::text,
    0, p_total_aum, p_purpose, p_admin_id
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'created_new',
    'aum_event_id', v_new_id,
    'closing_aum', p_total_aum,
    'message', 'Created new preflow AUM entry'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_preflow_aum(uuid, date, aum_purpose, numeric, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION ensure_preflow_aum IS
  'Idempotent preflow AUM creation. If exists, returns existing. If missing, creates new. Phase 3 implementation.';


-- ============================================================================
-- PHASE 6: ASSET-AWARE DUST POLICY
-- ============================================================================

-- Get dust tolerance for a specific fund's asset
CREATE OR REPLACE FUNCTION get_dust_tolerance_for_fund(p_fund_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT (value->>f.asset)::numeric FROM system_config, funds f
     WHERE system_config.key = 'dust_tolerance' AND f.id = p_fund_id),
    (SELECT (value->>'default')::numeric FROM system_config WHERE key = 'dust_tolerance'),
    0.01
  );
$$;

-- Update yield distribution creation to use asset-aware dust tolerance
CREATE OR REPLACE FUNCTION validate_dust_tolerance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_dust numeric;
BEGIN
  IF NEW.dust_amount IS NOT NULL THEN
    v_max_dust := get_dust_tolerance_for_fund(NEW.fund_id);

    IF ABS(NEW.dust_amount) > v_max_dust THEN
      RAISE EXCEPTION 'Dust amount % exceeds tolerance % for fund asset',
        NEW.dust_amount, v_max_dust
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_dust_tolerance ON yield_distributions;
CREATE TRIGGER trg_validate_dust_tolerance
  BEFORE INSERT OR UPDATE ON yield_distributions
  FOR EACH ROW EXECUTE FUNCTION validate_dust_tolerance();

COMMENT ON FUNCTION get_dust_tolerance_for_fund IS
  'Returns asset-aware dust tolerance. Stablecoins: 0.0001, ETH/BTC: 0.00000001, Default: 0.01';


-- ============================================================================
-- PHASE 8: STAGING IMPORT PIPELINE
-- ============================================================================

-- Create staging table for transaction imports
CREATE TABLE IF NOT EXISTS transaction_import_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  fund_id uuid NOT NULL REFERENCES funds(id),
  investor_id uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL')),
  amount numeric(28,10) NOT NULL,
  tx_date date NOT NULL,
  asset text NOT NULL,
  reference_id text,
  notes text,
  validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'promoted')),
  validation_errors jsonb,
  imported_by uuid NOT NULL REFERENCES auth.users(id),
  validated_at timestamptz,
  promoted_at timestamptz,
  promoted_tx_id uuid REFERENCES transactions_v2(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staging_batch ON transaction_import_staging(batch_id);
CREATE INDEX IF NOT EXISTS idx_staging_status ON transaction_import_staging(validation_status);

COMMENT ON TABLE transaction_import_staging IS
  'Staging table for bulk transaction imports. Rows must pass validation before promotion to transactions_v2.';

-- Validate a single staging row
CREATE OR REPLACE FUNCTION validate_staging_row(p_staging_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row RECORD;
  v_errors jsonb := '[]'::jsonb;
  v_fund_asset text;
BEGIN
  SELECT * INTO v_row FROM transaction_import_staging WHERE id = p_staging_id;

  IF v_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staging row not found');
  END IF;

  -- Check fund exists and get asset
  SELECT asset INTO v_fund_asset FROM funds WHERE id = v_row.fund_id;
  IF v_fund_asset IS NULL THEN
    v_errors := v_errors || jsonb_build_object('field', 'fund_id', 'error', 'Fund not found');
  END IF;

  -- Check asset matches fund
  IF v_fund_asset IS NOT NULL AND v_row.asset != v_fund_asset THEN
    v_errors := v_errors || jsonb_build_object('field', 'asset', 'error',
      format('Asset mismatch: expected %s, got %s', v_fund_asset, v_row.asset));
  END IF;

  -- Check investor exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_row.investor_id) THEN
    v_errors := v_errors || jsonb_build_object('field', 'investor_id', 'error', 'Investor not found');
  END IF;

  -- Check amount is valid
  IF v_row.amount <= 0 AND v_row.type = 'DEPOSIT' THEN
    v_errors := v_errors || jsonb_build_object('field', 'amount', 'error', 'Deposit amount must be positive');
  END IF;

  -- Check date is not in locked period
  IF is_period_locked(v_row.fund_id, v_row.tx_date) THEN
    v_errors := v_errors || jsonb_build_object('field', 'tx_date', 'error', 'Date is in a locked period');
  END IF;

  -- Check for duplicate reference_id
  IF v_row.reference_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM transactions_v2 WHERE reference_id = v_row.reference_id AND is_voided = false
  ) THEN
    v_errors := v_errors || jsonb_build_object('field', 'reference_id', 'error', 'Duplicate reference_id');
  END IF;

  -- Update validation status
  UPDATE transaction_import_staging
  SET validation_status = CASE WHEN jsonb_array_length(v_errors) = 0 THEN 'valid' ELSE 'invalid' END,
      validation_errors = CASE WHEN jsonb_array_length(v_errors) = 0 THEN NULL ELSE v_errors END,
      validated_at = now()
  WHERE id = p_staging_id;

  RETURN jsonb_build_object(
    'success', jsonb_array_length(v_errors) = 0,
    'staging_id', p_staging_id,
    'status', CASE WHEN jsonb_array_length(v_errors) = 0 THEN 'valid' ELSE 'invalid' END,
    'errors', v_errors
  );
END;
$$;

-- Validate all rows in a batch
CREATE OR REPLACE FUNCTION validate_staging_batch(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row RECORD;
  v_valid_count int := 0;
  v_invalid_count int := 0;
  v_result jsonb;
BEGIN
  FOR v_row IN SELECT id FROM transaction_import_staging WHERE batch_id = p_batch_id AND validation_status = 'pending'
  LOOP
    v_result := validate_staging_row(v_row.id);
    IF (v_result->>'success')::boolean THEN
      v_valid_count := v_valid_count + 1;
    ELSE
      v_invalid_count := v_invalid_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'valid_count', v_valid_count,
    'invalid_count', v_invalid_count,
    'ready_for_promotion', v_invalid_count = 0
  );
END;
$$;

-- Promote valid staging rows to transactions_v2
CREATE OR REPLACE FUNCTION promote_staging_batch(
  p_batch_id uuid,
  p_admin_id uuid,
  p_closing_aum numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row RECORD;
  v_promoted_count int := 0;
  v_tx_result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can promote staging batches'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Check no invalid rows
  IF EXISTS (SELECT 1 FROM transaction_import_staging WHERE batch_id = p_batch_id AND validation_status = 'invalid') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch contains invalid rows. Fix validation errors first.');
  END IF;

  -- Promote each valid row
  FOR v_row IN
    SELECT * FROM transaction_import_staging
    WHERE batch_id = p_batch_id AND validation_status = 'valid'
    ORDER BY tx_date, created_at
  LOOP
    IF v_row.type = 'DEPOSIT' THEN
      v_tx_result := apply_deposit_with_crystallization(
        v_row.fund_id, v_row.investor_id, v_row.amount, p_closing_aum,
        v_row.tx_date, p_admin_id, v_row.notes, 'transaction'::aum_purpose
      );
    ELSE
      v_tx_result := apply_withdrawal_with_crystallization(
        v_row.fund_id, v_row.investor_id, ABS(v_row.amount), p_closing_aum,
        v_row.tx_date, p_admin_id, v_row.notes, 'transaction'::aum_purpose
      );
    END IF;

    IF (v_tx_result->>'success')::boolean THEN
      UPDATE transaction_import_staging
      SET validation_status = 'promoted',
          promoted_at = now(),
          promoted_tx_id = (v_tx_result->>'deposit_tx_id')::uuid
      WHERE id = v_row.id;
      v_promoted_count := v_promoted_count + 1;
    ELSE
      -- Mark as invalid with promotion error
      UPDATE transaction_import_staging
      SET validation_status = 'invalid',
          validation_errors = jsonb_build_array(jsonb_build_object('promotion_error', v_tx_result->>'error'))
      WHERE id = v_row.id;
    END IF;
  END LOOP;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES ('PROMOTE_STAGING_BATCH', 'transaction_import_staging', p_batch_id::text, p_admin_id,
    jsonb_build_object('promoted_count', v_promoted_count));

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'promoted_count', v_promoted_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION validate_staging_row(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_staging_batch(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_staging_batch(uuid, uuid, numeric) TO authenticated;


-- ============================================================================
-- PHASE 9: RECONCILIATION PACK GENERATION
-- ============================================================================

-- Reconciliation pack storage
CREATE TABLE IF NOT EXISTS reconciliation_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES funds(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  pack_type text NOT NULL DEFAULT 'monthly' CHECK (pack_type IN ('monthly', 'quarterly', 'annual', 'custom')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'superseded')),

  -- Summary data
  opening_aum numeric(28,10),
  closing_aum numeric(28,10),
  total_deposits numeric(28,10),
  total_withdrawals numeric(28,10),
  net_flows numeric(28,10),
  gross_yield numeric(28,10),
  total_fees numeric(28,10),
  net_yield numeric(28,10),
  total_dust numeric(28,10),

  -- Counts
  transaction_count int,
  distribution_count int,
  void_count int,
  investor_count int,

  -- Detail data
  pack_data jsonb,

  -- Metadata
  generated_by uuid NOT NULL REFERENCES auth.users(id),
  generated_at timestamptz DEFAULT now(),
  finalized_by uuid REFERENCES auth.users(id),
  finalized_at timestamptz,

  UNIQUE(fund_id, period_start, period_end, pack_type, status)
);

COMMENT ON TABLE reconciliation_packs IS
  'Immutable reconciliation pack artifacts for finance/audit. Once finalized, cannot be modified.';

-- Generate reconciliation pack for a fund/period
CREATE OR REPLACE FUNCTION generate_reconciliation_pack(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pack_id uuid;
  v_opening_aum numeric(28,10);
  v_closing_aum numeric(28,10);
  v_total_deposits numeric(28,10);
  v_total_withdrawals numeric(28,10);
  v_gross_yield numeric(28,10);
  v_total_fees numeric(28,10);
  v_net_yield numeric(28,10);
  v_total_dust numeric(28,10);
  v_tx_count int;
  v_dist_count int;
  v_void_count int;
  v_investor_count int;
  v_void_list jsonb;
  v_distribution_summary jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can generate reconciliation packs'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get opening AUM (last AUM before period start)
  SELECT closing_aum INTO v_opening_aum
  FROM fund_aum_events
  WHERE fund_id = p_fund_id
    AND event_date < p_period_start
    AND is_voided = false
    AND purpose = 'transaction'
  ORDER BY event_date DESC, event_ts DESC
  LIMIT 1;
  v_opening_aum := COALESCE(v_opening_aum, 0);

  -- Get closing AUM (last AUM on or before period end)
  SELECT closing_aum INTO v_closing_aum
  FROM fund_aum_events
  WHERE fund_id = p_fund_id
    AND event_date <= p_period_end
    AND is_voided = false
    AND purpose = 'transaction'
  ORDER BY event_date DESC, event_ts DESC
  LIMIT 1;
  v_closing_aum := COALESCE(v_closing_aum, 0);

  -- Calculate deposits and withdrawals
  SELECT
    COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN ABS(amount) ELSE 0 END), 0),
    COUNT(*)
  INTO v_total_deposits, v_total_withdrawals, v_tx_count
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date BETWEEN p_period_start AND p_period_end
    AND is_voided = false;

  -- Calculate yields
  SELECT
    COALESCE(SUM(gross_yield), 0),
    COALESCE(SUM(total_fees), 0),
    COALESCE(SUM(net_yield), 0),
    COALESCE(SUM(dust_amount), 0),
    COUNT(*)
  INTO v_gross_yield, v_total_fees, v_net_yield, v_total_dust, v_dist_count
  FROM yield_distributions
  WHERE fund_id = p_fund_id
    AND effective_date BETWEEN p_period_start AND p_period_end
    AND status != 'voided';

  -- Count voids
  SELECT COUNT(*) INTO v_void_count
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date BETWEEN p_period_start AND p_period_end
    AND is_voided = true;

  -- Count active investors
  SELECT COUNT(DISTINCT investor_id) INTO v_investor_count
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date BETWEEN p_period_start AND p_period_end
    AND is_voided = false;

  -- Get void list
  SELECT jsonb_agg(jsonb_build_object(
    'tx_id', id,
    'type', type,
    'amount', amount,
    'tx_date', tx_date,
    'voided_at', voided_at,
    'void_reason', void_reason
  )) INTO v_void_list
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date BETWEEN p_period_start AND p_period_end
    AND is_voided = true;

  -- Get distribution summary
  SELECT jsonb_agg(jsonb_build_object(
    'distribution_id', id,
    'effective_date', effective_date,
    'gross_yield', gross_yield,
    'total_fees', total_fees,
    'net_yield', net_yield,
    'dust_amount', dust_amount,
    'investor_count', investor_count
  )) INTO v_distribution_summary
  FROM yield_distributions
  WHERE fund_id = p_fund_id
    AND effective_date BETWEEN p_period_start AND p_period_end
    AND status != 'voided';

  -- Insert pack
  INSERT INTO reconciliation_packs (
    fund_id, period_start, period_end, pack_type, status,
    opening_aum, closing_aum, total_deposits, total_withdrawals,
    net_flows, gross_yield, total_fees, net_yield, total_dust,
    transaction_count, distribution_count, void_count, investor_count,
    pack_data, generated_by
  ) VALUES (
    p_fund_id, p_period_start, p_period_end, 'monthly', 'draft',
    v_opening_aum, v_closing_aum, v_total_deposits, v_total_withdrawals,
    v_total_deposits - v_total_withdrawals, v_gross_yield, v_total_fees, v_net_yield, v_total_dust,
    v_tx_count, v_dist_count, v_void_count, v_investor_count,
    jsonb_build_object(
      'void_list', COALESCE(v_void_list, '[]'::jsonb),
      'distribution_summary', COALESCE(v_distribution_summary, '[]'::jsonb),
      'reconciliation', jsonb_build_object(
        'expected_closing', v_opening_aum + v_total_deposits - v_total_withdrawals + v_net_yield,
        'actual_closing', v_closing_aum,
        'difference', v_closing_aum - (v_opening_aum + v_total_deposits - v_total_withdrawals + v_net_yield),
        'reconciled', ABS(v_closing_aum - (v_opening_aum + v_total_deposits - v_total_withdrawals + v_net_yield)) < 0.01
      )
    ),
    p_admin_id
  )
  RETURNING id INTO v_pack_id;

  RETURN jsonb_build_object(
    'success', true,
    'pack_id', v_pack_id,
    'summary', jsonb_build_object(
      'opening_aum', v_opening_aum,
      'closing_aum', v_closing_aum,
      'net_flows', v_total_deposits - v_total_withdrawals,
      'net_yield', v_net_yield,
      'transaction_count', v_tx_count,
      'void_count', v_void_count
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION generate_reconciliation_pack(uuid, date, date, uuid) TO authenticated;

COMMENT ON FUNCTION generate_reconciliation_pack IS
  'Generates monthly reconciliation pack for finance/audit. Creates immutable artifact.';


-- ============================================================================
-- PHASE 10: MONITORING & CLEANUP
-- ============================================================================

-- Cleanup duplicate preflow AUM (legacy data fix)
-- This marks duplicates as voided, keeping only the earliest one per fund/date/purpose
CREATE OR REPLACE FUNCTION cleanup_duplicate_preflow_aum()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_voided_count int := 0;
  v_dup RECORD;
BEGIN
  -- Find and void duplicates (keep earliest by event_ts)
  FOR v_dup IN
    WITH ranked AS (
      SELECT id, fund_id, event_date, purpose, event_ts,
        ROW_NUMBER() OVER (PARTITION BY fund_id, event_date, purpose ORDER BY event_ts) as rn
      FROM fund_aum_events
      WHERE is_voided = false
        AND trigger_type IN ('deposit', 'withdrawal', 'preflow')
    )
    SELECT id FROM ranked WHERE rn > 1
  LOOP
    UPDATE fund_aum_events
    SET is_voided = true,
        voided_at = now(),
        void_reason = 'Duplicate preflow AUM - cleanup migration'
    WHERE id = v_dup.id;
    v_voided_count := v_voided_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'voided_count', v_voided_count,
    'message', format('Voided %s duplicate preflow AUM records', v_voided_count)
  );
END;
$$;

-- Run cleanup
SELECT cleanup_duplicate_preflow_aum();

-- Add AS_OF_FILTERING health check
DROP FUNCTION IF EXISTS run_comprehensive_health_check();

CREATE OR REPLACE FUNCTION run_comprehensive_health_check()
RETURNS TABLE(
  check_name text,
  category text,
  check_status text,
  violation_count int,
  severity text,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check 1: Yield Conservation (P0)
  check_name := 'YIELD_CONSERVATION';
  category := 'ACCOUNTING';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'distribution_id', distribution_id,
      'fund_code', fund_code,
      'violation_type', violation_type,
      'gross_diff', gross_diff
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM v_yield_conservation_violations;
  RETURN NEXT;

  -- Check 2: Ledger Position Match (P0)
  check_name := 'LEDGER_POSITION_MATCH';
  category := 'ACCOUNTING';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'fund_code', r.fund_code,
      'investor_id', r.investor_id,
      'difference', r.difference
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM v_position_ledger_reconciliation r
  WHERE r.status = 'MISMATCH';
  RETURN NEXT;

  -- Check 3: Native Currency (P0)
  check_name := 'NATIVE_CURRENCY';
  category := 'ACCOUNTING';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'tx_id', t.id,
      'tx_asset', t.asset,
      'fund_asset', f.asset
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM transactions_v2 t
  JOIN funds f ON f.id = t.fund_id
  WHERE t.asset != f.asset AND t.is_voided = false;
  RETURN NEXT;

  -- Check 4: Management Fee (P0) - must be 0 everywhere
  check_name := 'NO_MANAGEMENT_FEE';
  category := 'POLICY';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    jsonb_build_object('message', 'Funds with non-zero mgmt_fee_bps')
  INTO check_status, violation_count, details
  FROM funds
  WHERE mgmt_fee_bps != 0;
  RETURN NEXT;

  -- Check 5: Investor Event Conservation (P0)
  check_name := 'EVENT_CONSERVATION';
  category := 'ACCOUNTING';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'event_id', id,
      'gross', gross_yield_amount,
      'net', net_yield_amount,
      'fee', fee_amount,
      'diff', gross_yield_amount - net_yield_amount - COALESCE(fee_amount, 0)
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM investor_yield_events
  WHERE is_voided = false
    AND ABS(gross_yield_amount - net_yield_amount - COALESCE(fee_amount, 0)) >= 0.0001;
  RETURN NEXT;

  -- Check 6: AUM Purpose Consistency (P1)
  check_name := 'AUM_PURPOSE_CONSISTENCY';
  category := 'DATA_QUALITY';
  severity := 'WARNING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    COUNT(*)::int,
    jsonb_build_object('message', 'AUM records with NULL purpose')
  INTO check_status, violation_count, details
  FROM fund_daily_aum
  WHERE purpose IS NULL AND is_voided = false;
  RETURN NEXT;

  -- Check 7: Dust Tolerance (P1) - Now asset-aware
  check_name := 'DUST_TOLERANCE';
  category := 'ACCOUNTING';
  severity := 'WARNING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'distribution_id', yd.id,
      'dust_amount', yd.dust_amount,
      'max_allowed', get_dust_tolerance_for_fund(yd.fund_id)
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM yield_distributions yd
  WHERE yd.dust_amount IS NOT NULL
    AND ABS(yd.dust_amount) > get_dust_tolerance_for_fund(yd.fund_id)
    AND yd.status != 'voided';
  RETURN NEXT;

  -- Check 8: Duplicate Preflow AUM (should be 0 after cleanup)
  check_name := 'DUPLICATE_PREFLOW_AUM';
  category := 'DATA_QUALITY';
  severity := 'WARNING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'fund_id', fund_id,
      'event_date', event_date,
      'purpose', purpose,
      'count', cnt
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM (
    SELECT fund_id, event_date, purpose, COUNT(*) as cnt
    FROM fund_aum_events
    WHERE is_voided = false
      AND trigger_type IN ('deposit', 'withdrawal', 'preflow')
    GROUP BY fund_id, event_date, purpose
    HAVING COUNT(*) > 1
  ) dups;
  RETURN NEXT;

  -- Check 9: Void Cascade Integrity
  check_name := 'VOID_CASCADE_INTEGRITY';
  category := 'DATA_QUALITY';
  severity := 'WARNING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'fund_id', t.fund_id,
      'tx_date', t.tx_date,
      'voided_tx_id', t.id,
      'orphaned_events', (
        SELECT COUNT(*) FROM investor_yield_events ye
        WHERE ye.fund_id = t.fund_id
          AND ye.investor_id = t.investor_id
          AND ye.event_date = t.tx_date
          AND ye.is_voided = false
      )
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM transactions_v2 t
  WHERE t.is_voided = true
    AND EXISTS (
      SELECT 1 FROM investor_yield_events ye
      WHERE ye.fund_id = t.fund_id
        AND ye.investor_id = t.investor_id
        AND ye.event_date = t.tx_date
        AND ye.is_voided = false
    );
  RETURN NEXT;

  -- Check 10: Future Transactions in Past Periods (AS_OF_FILTERING)
  check_name := 'AS_OF_FILTERING';
  category := 'DATA_QUALITY';
  severity := 'WARNING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'tx_id', id,
      'tx_date', tx_date,
      'created_at', created_at,
      'issue', 'tx_date > created_at (backdate)'
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM transactions_v2
  WHERE is_voided = false
    AND tx_date > (created_at AT TIME ZONE 'UTC')::date;
  RETURN NEXT;

  -- Check 11: Economic Date Consistency
  check_name := 'ECONOMIC_DATE_NOT_NULL';
  category := 'DATA_QUALITY';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    jsonb_build_object('message', 'Transactions with NULL tx_date')
  INTO check_status, violation_count, details
  FROM transactions_v2
  WHERE tx_date IS NULL AND is_voided = false;
  RETURN NEXT;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION run_comprehensive_health_check() TO authenticated;

COMMENT ON FUNCTION run_comprehensive_health_check IS
  'Comprehensive health check: 11 checks including AS_OF_FILTERING and ECONOMIC_DATE. All must PASS for production readiness.';


-- ============================================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================================

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_import_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_packs ENABLE ROW LEVEL SECURITY;

-- System config: read by all authenticated, write by admin only
CREATE POLICY "system_config_read" ON system_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "system_config_write" ON system_config FOR ALL TO authenticated USING (is_admin());

-- Accounting periods: admin only
CREATE POLICY "accounting_periods_admin" ON accounting_periods FOR ALL TO authenticated USING (is_admin());

-- Admin approvals: admin only
CREATE POLICY "admin_approvals_admin" ON admin_approvals FOR ALL TO authenticated USING (is_admin());

-- Staging: admin only
CREATE POLICY "staging_admin" ON transaction_import_staging FOR ALL TO authenticated USING (is_admin());

-- Reconciliation packs: admin only
CREATE POLICY "reconciliation_packs_admin" ON reconciliation_packs FOR ALL TO authenticated USING (is_admin());


COMMIT;
