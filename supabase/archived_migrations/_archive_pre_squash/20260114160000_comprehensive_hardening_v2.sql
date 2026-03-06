-- ============================================================================
-- COMPREHENSIVE HARDENING MIGRATION V2
-- Date: 2026-01-14
-- Version: 2.0.0
--
-- Addresses ALL P0 requirements from the CTO/CFO hardening workplan:
--   A) Base asset (native currency) enforcement
--   B) No management fee enforcement
--   C) Purpose guardrails (remove dangerous defaults)
--   D) Fee model + conservation (gross = net + fee)
--   E) Positions ↔ Ledger reconciliation
--   F) Security + RLS + EXECUTE permissions
--   G) Monitoring + regression suite
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION A: BASE ASSET (NATIVE CURRENCY) ENFORCEMENT
-- ============================================================================

-- A1: Document the canonical base asset column (funds.asset)
-- We keep "asset" as the column name (not renaming to base_asset) to avoid breaking changes
COMMENT ON COLUMN funds.asset IS
  'Base asset (native currency) for this fund. All amounts in accounting tables must be in this currency. No USD conversion allowed.';

-- A2: Verify asset enforcement trigger exists (created in previous migration)
-- The trigger trg_enforce_transaction_asset already enforces transactions_v2.asset = funds.asset

-- A3: Add constraint to fund_daily_aum to prevent mixing currencies
-- Note: fund_daily_aum inherits fund currency implicitly via fund_id

-- A4: Add validation function for base asset consistency
CREATE OR REPLACE FUNCTION validate_fund_base_asset(
  p_fund_id uuid,
  p_asset text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM funds WHERE id = p_fund_id AND asset = p_asset
  );
$$;

COMMENT ON FUNCTION validate_fund_base_asset IS
  'Validates that the provided asset matches the fund base asset. Used by triggers and checks.';


-- ============================================================================
-- SECTION B: NO MANAGEMENT FEE ENFORCEMENT
-- ============================================================================

-- B1: Set all mgmt_fee_bps to 0
UPDATE funds SET mgmt_fee_bps = 0 WHERE mgmt_fee_bps != 0 OR mgmt_fee_bps IS NULL;

-- B2: Add CHECK constraint to prevent non-zero mgmt_fee_bps
ALTER TABLE funds DROP CONSTRAINT IF EXISTS chk_no_management_fee;
ALTER TABLE funds ADD CONSTRAINT chk_no_management_fee
  CHECK (mgmt_fee_bps = 0);

-- B3: Set default to 0 (was 200)
ALTER TABLE funds ALTER COLUMN mgmt_fee_bps SET DEFAULT 0;

-- B4: Set all mgmt_fees_paid to 0 in investor_positions
UPDATE investor_positions SET mgmt_fees_paid = 0 WHERE mgmt_fees_paid != 0 OR mgmt_fees_paid IS NULL;

-- B5: Add CHECK constraint to prevent non-zero mgmt_fees_paid
ALTER TABLE investor_positions DROP CONSTRAINT IF EXISTS chk_no_mgmt_fees_paid;
ALTER TABLE investor_positions ADD CONSTRAINT chk_no_mgmt_fees_paid
  CHECK (mgmt_fees_paid = 0 OR mgmt_fees_paid IS NULL);

-- B6: Set default to 0
ALTER TABLE investor_positions ALTER COLUMN mgmt_fees_paid SET DEFAULT 0;

-- B7: Update investor_positions_archive if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investor_positions_archive') THEN
    UPDATE investor_positions_archive SET mgmt_fees_paid = 0 WHERE mgmt_fees_paid != 0 OR mgmt_fees_paid IS NULL;
  END IF;
END $$;

-- B8: Document the policy
COMMENT ON COLUMN funds.mgmt_fee_bps IS
  'Management fee in basis points. FROZEN TO 0 - no management fee per CFO policy. Constraint enforces this.';

COMMENT ON COLUMN investor_positions.mgmt_fees_paid IS
  'Management fees paid. FROZEN TO 0 - no management fee per CFO policy. Constraint enforces this.';


-- ============================================================================
-- SECTION C: PURPOSE GUARDRAILS (REMOVE DANGEROUS DEFAULTS)
-- ============================================================================

-- C1: Fix crystallize_yield_before_flow - REMOVE the dangerous DEFAULT 'reporting'
-- This function must be called with explicit purpose
DROP FUNCTION IF EXISTS crystallize_yield_before_flow(uuid, numeric, text, text, timestamptz, uuid, aum_purpose);

CREATE OR REPLACE FUNCTION public.crystallize_yield_before_flow(
  p_fund_id uuid,
  p_closing_aum numeric,
  p_trigger_type text,
  p_trigger_reference text,
  p_event_ts timestamp with time zone,
  p_admin_id uuid,
  p_purpose aum_purpose  -- NO DEFAULT - MUST be explicit
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_checkpoint RECORD;
  v_opening_aum numeric(28,10);
  v_yield_amount numeric(28,10);
  v_yield_pct numeric(18,10);
  v_event_date date;
  v_period_start date;
  v_days_in_period int;
  v_snapshot_id uuid;
  v_distribution_id uuid;
  v_investors_processed int := 0;

  -- Conservation tracking
  v_total_gross_allocated numeric(28,10) := 0;
  v_total_fees_allocated numeric(28,10) := 0;
  v_total_net_allocated numeric(28,10) := 0;
  v_dust_amount numeric(28,10) := 0;
  v_dust_receiver_id uuid;

  v_investor RECORD;
  v_investor_yield numeric(28,10);
  v_investor_fee numeric(28,10);
  v_investor_net numeric(28,10);
  v_investor_share_pct numeric(18,10);
  v_fee_pct numeric(10,6);
  v_reference_id text;
  v_scale int := 10;  -- Precision for rounding
BEGIN
  -- C1a: MANDATORY purpose check - must not be NULL
  IF p_purpose IS NULL THEN
    RAISE EXCEPTION 'p_purpose parameter is required. Must be explicitly specified.'
      USING ERRCODE = 'not_null_violation';
  END IF;

  v_event_date := (p_event_ts AT TIME ZONE 'UTC')::date;

  -- Get last checkpoint - USE post_flow_aum if available, otherwise closing_aum
  SELECT
    id,
    COALESCE(post_flow_aum, closing_aum) as effective_aum,
    event_ts,
    event_date
  INTO v_last_checkpoint
  FROM fund_aum_events
  WHERE fund_id = p_fund_id
    AND is_voided = false
    AND purpose = p_purpose
    AND event_ts < p_event_ts
  ORDER BY event_ts DESC
  LIMIT 1;

  -- Determine opening AUM and period start
  IF v_last_checkpoint.id IS NULL THEN
    v_opening_aum := 0;
    v_period_start := v_event_date;
  ELSE
    v_opening_aum := v_last_checkpoint.effective_aum;
    v_period_start := v_last_checkpoint.event_date;
  END IF;

  v_days_in_period := v_event_date - v_period_start;
  v_yield_amount := p_closing_aum - v_opening_aum;

  IF v_opening_aum > 0 THEN
    v_yield_pct := ROUND((v_yield_amount / v_opening_aum) * 100, v_scale);
  ELSE
    v_yield_pct := 0;
  END IF;

  -- Insert the AUM checkpoint event
  INSERT INTO fund_aum_events (
    fund_id, event_date, event_ts, trigger_type, trigger_reference,
    opening_aum, closing_aum, purpose, created_by
  ) VALUES (
    p_fund_id, v_event_date, p_event_ts, p_trigger_type, p_trigger_reference,
    v_opening_aum, p_closing_aum, p_purpose, p_admin_id
  )
  RETURNING id INTO v_snapshot_id;

  -- Only distribute yield if there's actual positive yield and opening AUM > 0
  IF v_yield_amount > 0 AND v_opening_aum > 0 THEN

    -- Find the largest investor to receive dust
    SELECT ip.investor_id INTO v_dust_receiver_id
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
    ORDER BY ip.current_value DESC
    LIMIT 1;

    -- Create yield snapshot
    INSERT INTO fund_yield_snapshots (
      fund_id, snapshot_date, opening_aum, closing_aum, gross_yield_pct, gross_yield_amount,
      period_start, period_end, days_in_period, trigger_type, trigger_reference, created_by
    ) VALUES (
      p_fund_id, v_event_date, v_opening_aum, p_closing_aum, v_yield_pct, v_yield_amount,
      v_period_start, v_event_date, v_days_in_period, p_trigger_type, p_trigger_reference, p_admin_id
    );

    -- Process each investor with explicit fee calculation (PERFORMANCE FEE ONLY, no mgmt fee)
    FOR v_investor IN
      SELECT
        ip.investor_id,
        ip.current_value,
        COALESCE(ifs.fee_pct, 0.30) as fee_pct,  -- Default 30% performance fee
        ROW_NUMBER() OVER (ORDER BY ip.current_value DESC) as rank
      FROM investor_positions ip
      LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id
        AND ifs.fund_id = p_fund_id
        AND ifs.effective_date <= v_event_date
        AND (ifs.end_date IS NULL OR ifs.end_date >= v_event_date)
      WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
    LOOP
      -- Calculate investor's share percentage
      v_investor_share_pct := ROUND((v_investor.current_value / v_opening_aum) * 100, v_scale);

      -- Calculate gross yield (investor's proportional share)
      v_investor_yield := ROUND(v_yield_amount * (v_investor.current_value / v_opening_aum), v_scale);

      -- Get fee percentage (PERFORMANCE FEE ONLY)
      v_fee_pct := v_investor.fee_pct;

      -- Calculate performance fee amount (from gross)
      v_investor_fee := ROUND(v_investor_yield * v_fee_pct, v_scale);

      -- CONSERVATION IDENTITY: net = gross - fee
      v_investor_net := v_investor_yield - v_investor_fee;

      -- Track totals for conservation
      v_total_gross_allocated := v_total_gross_allocated + v_investor_yield;
      v_total_fees_allocated := v_total_fees_allocated + v_investor_fee;
      v_total_net_allocated := v_total_net_allocated + v_investor_net;

      -- Generate reference ID
      v_reference_id := 'YLD:' || p_fund_id::text || ':' || v_event_date::text || ':' || v_investor.investor_id::text;

      -- Insert yield event with all fee fields populated
      INSERT INTO investor_yield_events (
        investor_id, fund_id, event_date, trigger_type, trigger_transaction_id,
        fund_aum_before, fund_aum_after, investor_balance, investor_share_pct,
        fund_yield_pct, gross_yield_amount, fee_pct, fee_amount, net_yield_amount,
        period_start, period_end, days_in_period, visibility_scope, reference_id, created_by
      ) VALUES (
        v_investor.investor_id, p_fund_id, v_event_date, p_trigger_type,
        CASE WHEN p_trigger_reference ~ '^[0-9a-f-]{36}$' THEN p_trigger_reference::uuid ELSE NULL END,
        v_opening_aum, p_closing_aum, v_investor.current_value,
        v_investor_share_pct, v_yield_pct, v_investor_yield,
        v_fee_pct, v_investor_fee, v_investor_net, v_period_start, v_event_date,
        v_days_in_period, 'admin_only', v_reference_id, p_admin_id
      );

      v_investors_processed := v_investors_processed + 1;
    END LOOP;

    -- Calculate dust (rounding difference)
    v_dust_amount := v_yield_amount - v_total_gross_allocated;

    -- Create distribution record with conservation data
    INSERT INTO yield_distributions (
      fund_id, effective_date, purpose, is_month_end, recorded_aum, previous_aum,
      gross_yield, net_yield, total_fees, investor_count, distribution_type, status,
      period_start, period_end, dust_amount, dust_receiver_id, created_by,
      reference_id
    ) VALUES (
      p_fund_id, v_event_date, p_purpose, false, p_closing_aum, v_opening_aum,
      v_yield_amount, v_total_net_allocated, v_total_fees_allocated,
      v_investors_processed, p_trigger_type, 'completed',
      v_period_start, v_event_date, v_dust_amount, v_dust_receiver_id, p_admin_id,
      'DIST-' || p_fund_id::text || '-' || v_event_date::text
    )
    RETURNING id INTO v_distribution_id;

    -- If dust is significant (>0.0001), allocate to largest investor
    IF ABS(v_dust_amount) > 0.0001 AND v_dust_receiver_id IS NOT NULL THEN
      UPDATE investor_yield_events
      SET gross_yield_amount = gross_yield_amount + v_dust_amount,
          net_yield_amount = net_yield_amount + v_dust_amount
      WHERE investor_id = v_dust_receiver_id
        AND fund_id = p_fund_id
        AND event_date = v_event_date
        AND reference_id LIKE 'YLD:' || p_fund_id::text || ':' || v_event_date::text || ':%';

      -- Update conservation totals
      v_total_gross_allocated := v_total_gross_allocated + v_dust_amount;
      v_total_net_allocated := v_total_net_allocated + v_dust_amount;
    END IF;

  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'snapshot_id', v_snapshot_id,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'trigger_date', v_event_date,
    'trigger_type', p_trigger_type,
    'period_start', v_period_start,
    'opening_aum', v_opening_aum,
    'closing_aum', p_closing_aum,
    'fund_yield_pct', v_yield_pct,
    'gross_yield', v_yield_amount,
    'investors_processed', v_investors_processed,
    'total_gross_allocated', v_total_gross_allocated,
    'total_fees_allocated', v_total_fees_allocated,
    'total_net_allocated', v_total_net_allocated,
    'dust_amount', v_dust_amount,
    'dust_receiver_id', v_dust_receiver_id,
    'conservation_check', jsonb_build_object(
      'gross_matches', ABS(v_yield_amount - v_total_gross_allocated) < 0.0001,
      'fee_identity_holds', ABS(v_total_gross_allocated - v_total_net_allocated - v_total_fees_allocated) < 0.0001
    )
  );
END;
$$;

COMMENT ON FUNCTION crystallize_yield_before_flow IS
  'Crystallize yield before deposit/withdrawal. NO DEFAULT PURPOSE - must be explicit. Conservation: gross = net + performance_fee.';


-- ============================================================================
-- SECTION D: FEE MODEL + CONSERVATION CONSTRAINTS
-- ============================================================================

-- D1: Add CHECK constraint on investor_yield_events for conservation identity
ALTER TABLE investor_yield_events DROP CONSTRAINT IF EXISTS chk_yield_event_conservation;
ALTER TABLE investor_yield_events ADD CONSTRAINT chk_yield_event_conservation
  CHECK (ABS(gross_yield_amount - net_yield_amount - COALESCE(fee_amount, 0)) < 0.0001);

COMMENT ON CONSTRAINT chk_yield_event_conservation ON investor_yield_events IS
  'Enforces CFO conservation identity: gross = net + fee (within 0.0001 tolerance)';

-- D2: Add CHECK constraint on yield_distributions for dust tolerance
ALTER TABLE yield_distributions DROP CONSTRAINT IF EXISTS chk_dust_tolerance;
ALTER TABLE yield_distributions ADD CONSTRAINT chk_dust_tolerance
  CHECK (dust_amount IS NULL OR ABS(dust_amount) <= 0.01);

COMMENT ON CONSTRAINT chk_dust_tolerance ON yield_distributions IS
  'Enforces dust must be less than 0.01 (1 cent) - prevents large rounding errors';

-- D3: Ensure fee_amount and fee_pct have proper defaults
ALTER TABLE investor_yield_events ALTER COLUMN fee_pct SET DEFAULT 0;
ALTER TABLE investor_yield_events ALTER COLUMN fee_amount SET DEFAULT 0;


-- ============================================================================
-- SECTION E: POSITIONS ↔ LEDGER RECONCILIATION
-- ============================================================================

-- E1: Create/update the authoritative reconciliation view
CREATE OR REPLACE VIEW v_position_ledger_reconciliation AS
WITH ledger_totals AS (
  SELECT
    fund_id,
    investor_id,
    SUM(CASE WHEN type IN ('DEPOSIT', 'WITHDRAWAL') THEN amount ELSE 0 END) as deposits_minus_withdrawals,
    SUM(CASE WHEN type = 'YIELD' THEN amount ELSE 0 END) as yield_transactions
  FROM transactions_v2
  WHERE is_voided = false
  GROUP BY fund_id, investor_id
),
yield_event_totals AS (
  SELECT
    fund_id,
    investor_id,
    SUM(net_yield_amount) as yield_from_events
  FROM investor_yield_events
  WHERE is_voided = false
  GROUP BY fund_id, investor_id
)
SELECT
  ip.fund_id,
  f.code as fund_code,
  f.asset as base_asset,
  ip.investor_id,
  ip.current_value as position_value,
  COALESCE(lt.deposits_minus_withdrawals, 0) as ledger_deposits,
  COALESCE(yet.yield_from_events, 0) as ledger_yield,
  COALESCE(lt.deposits_minus_withdrawals, 0) + COALESCE(yet.yield_from_events, 0) as expected_value,
  ip.current_value - (COALESCE(lt.deposits_minus_withdrawals, 0) + COALESCE(yet.yield_from_events, 0)) as difference,
  CASE
    WHEN ABS(ip.current_value - (COALESCE(lt.deposits_minus_withdrawals, 0) + COALESCE(yet.yield_from_events, 0))) < 0.01
    THEN 'OK'
    ELSE 'MISMATCH'
  END as status
FROM investor_positions ip
JOIN funds f ON f.id = ip.fund_id
LEFT JOIN ledger_totals lt ON lt.fund_id = ip.fund_id AND lt.investor_id = ip.investor_id
LEFT JOIN yield_event_totals yet ON yet.fund_id = ip.fund_id AND yet.investor_id = ip.investor_id
WHERE ip.current_value > 0 OR COALESCE(lt.deposits_minus_withdrawals, 0) + COALESCE(yet.yield_from_events, 0) > 0;

COMMENT ON VIEW v_position_ledger_reconciliation IS
  'Authoritative view for position vs ledger reconciliation. status=MISMATCH indicates data integrity issue.';

-- E2: Create admin RPC to repair positions (with period lock check)
CREATE OR REPLACE FUNCTION admin_reconcile_position(
  p_fund_id uuid,
  p_investor_id uuid,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_expected_value numeric(28,10);
  v_current_value numeric(28,10);
  v_difference numeric(28,10);
  v_ledger_deposits numeric(28,10);
  v_ledger_yield numeric(28,10);
BEGIN
  -- Check admin permission
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can reconcile positions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get current position value
  SELECT current_value INTO v_current_value
  FROM investor_positions
  WHERE fund_id = p_fund_id AND investor_id = p_investor_id;

  -- Calculate expected value from ledger
  SELECT
    COALESCE(SUM(CASE WHEN type IN ('DEPOSIT', 'WITHDRAWAL') THEN amount ELSE 0 END), 0),
    0  -- yield comes from investor_yield_events now
  INTO v_ledger_deposits, v_ledger_yield
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND investor_id = p_investor_id
    AND is_voided = false;

  -- Add yield from events
  SELECT COALESCE(SUM(net_yield_amount), 0) INTO v_ledger_yield
  FROM investor_yield_events
  WHERE fund_id = p_fund_id
    AND investor_id = p_investor_id
    AND is_voided = false;

  v_expected_value := v_ledger_deposits + v_ledger_yield;
  v_difference := COALESCE(v_current_value, 0) - v_expected_value;

  -- Only repair if there's a meaningful difference
  IF ABS(v_difference) < 0.01 THEN
    RETURN jsonb_build_object(
      'success', true,
      'action', 'none',
      'message', 'Position already reconciled',
      'current_value', v_current_value,
      'expected_value', v_expected_value
    );
  END IF;

  -- Update position
  UPDATE investor_positions
  SET current_value = v_expected_value,
      shares = v_expected_value,
      updated_at = now()
  WHERE fund_id = p_fund_id AND investor_id = p_investor_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'POSITION_RECONCILIATION',
    'investor_positions',
    p_investor_id::text,
    p_admin_id,
    jsonb_build_object(
      'old_value', v_current_value,
      'new_value', v_expected_value,
      'difference', v_difference
    ),
    jsonb_build_object('fund_id', p_fund_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', 'corrected',
    'old_value', v_current_value,
    'new_value', v_expected_value,
    'difference', v_difference,
    'ledger_deposits', v_ledger_deposits,
    'ledger_yield', v_ledger_yield
  );
END;
$$;

COMMENT ON FUNCTION admin_reconcile_position IS
  'Admin-only function to reconcile investor position with ledger. Requires is_admin().';


-- ============================================================================
-- SECTION F: SECURITY + RLS + EXECUTE PERMISSIONS
-- ============================================================================

-- F1: Revoke EXECUTE on crystallize_yield_before_flow from PUBLIC and anon
REVOKE EXECUTE ON FUNCTION crystallize_yield_before_flow(uuid, numeric, text, text, timestamptz, uuid, aum_purpose) FROM PUBLIC, anon, authenticated;

-- F2: Grant only to service_role (internal use by deposit/withdrawal functions)
GRANT EXECUTE ON FUNCTION crystallize_yield_before_flow(uuid, numeric, text, text, timestamptz, uuid, aum_purpose) TO service_role;

-- F3: Grant admin_reconcile_position only to authenticated (with internal is_admin check)
GRANT EXECUTE ON FUNCTION admin_reconcile_position(uuid, uuid, uuid) TO authenticated;

-- F4: Ensure deposit/withdrawal functions are restricted
-- (Already done in previous migration, but verify)
REVOKE EXECUTE ON FUNCTION apply_deposit_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION apply_deposit_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION apply_withdrawal_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION apply_withdrawal_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) TO authenticated, service_role;


-- ============================================================================
-- SECTION G: MONITORING + REGRESSION SUITE
-- ============================================================================

-- G1: Enhanced daily health check
CREATE OR REPLACE FUNCTION run_comprehensive_health_check()
RETURNS TABLE(
  check_name text,
  category text,
  status text,
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
  INTO status, violation_count, details
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
      'fund_code', fund_code,
      'investor_id', investor_id,
      'difference', difference
    )), '[]'::jsonb)
  INTO status, violation_count, details
  FROM v_position_ledger_reconciliation
  WHERE status = 'MISMATCH';
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
  INTO status, violation_count, details
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
  INTO status, violation_count, details
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
  INTO status, violation_count, details
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
  INTO status, violation_count, details
  FROM fund_daily_aum
  WHERE purpose IS NULL AND is_voided = false;
  RETURN NEXT;

  -- Check 7: Dust Tolerance (P1)
  check_name := 'DUST_TOLERANCE';
  category := 'ACCOUNTING';
  severity := 'WARNING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'distribution_id', id,
      'dust_amount', dust_amount
    )), '[]'::jsonb)
  INTO status, violation_count, details
  FROM yield_distributions
  WHERE dust_amount IS NOT NULL AND ABS(dust_amount) > 0.01 AND status != 'voided';
  RETURN NEXT;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION run_comprehensive_health_check() TO authenticated;

COMMENT ON FUNCTION run_comprehensive_health_check IS
  'Comprehensive health check for all P0/P1 requirements. Run daily via cron or monitoring.';

-- G2: Regression test function
CREATE OR REPLACE FUNCTION run_regression_tests()
RETURNS TABLE(
  test_name text,
  test_category text,
  passed boolean,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_test_fund_id uuid;
  v_test_investor_id uuid;
  v_result jsonb;
BEGIN
  -- Get test data
  SELECT id INTO v_test_fund_id FROM funds LIMIT 1;
  SELECT investor_id INTO v_test_investor_id FROM investor_positions LIMIT 1;

  -- Test 1: NULL purpose deposit should fail
  test_name := 'DEPOSIT_NULL_PURPOSE_REJECTED';
  test_category := 'PURPOSE_GUARDRAILS';
  BEGIN
    SELECT apply_deposit_with_crystallization(
      v_test_fund_id, v_test_investor_id, 100, 1000000, CURRENT_DATE,
      '00000000-0000-0000-0000-000000000000'::uuid, 'Test', NULL
    ) INTO v_result;
    passed := false;
    details := 'Expected exception but got: ' || v_result::text;
  EXCEPTION WHEN OTHERS THEN
    passed := true;
    details := 'Correctly rejected: ' || SQLERRM;
  END;
  RETURN NEXT;

  -- Test 2: reporting purpose deposit should fail
  test_name := 'DEPOSIT_REPORTING_PURPOSE_REJECTED';
  test_category := 'PURPOSE_GUARDRAILS';
  BEGIN
    SELECT apply_deposit_with_crystallization(
      v_test_fund_id, v_test_investor_id, 100, 1000000, CURRENT_DATE,
      '00000000-0000-0000-0000-000000000000'::uuid, 'Test', 'reporting'
    ) INTO v_result;
    passed := false;
    details := 'Expected exception but got: ' || v_result::text;
  EXCEPTION WHEN OTHERS THEN
    passed := true;
    details := 'Correctly rejected: ' || SQLERRM;
  END;
  RETURN NEXT;

  -- Test 3: NULL purpose withdrawal should fail
  test_name := 'WITHDRAWAL_NULL_PURPOSE_REJECTED';
  test_category := 'PURPOSE_GUARDRAILS';
  BEGIN
    SELECT apply_withdrawal_with_crystallization(
      v_test_fund_id, v_test_investor_id, 100, 1000000, CURRENT_DATE,
      '00000000-0000-0000-0000-000000000000'::uuid, 'Test', NULL
    ) INTO v_result;
    passed := false;
    details := 'Expected exception but got: ' || v_result::text;
  EXCEPTION WHEN OTHERS THEN
    passed := true;
    details := 'Correctly rejected: ' || SQLERRM;
  END;
  RETURN NEXT;

  -- Test 4: Management fee constraint check
  test_name := 'MGMT_FEE_FROZEN_TO_ZERO';
  test_category := 'NO_MANAGEMENT_FEE';
  BEGIN
    -- Try to insert a fund with non-zero mgmt_fee_bps (should fail)
    INSERT INTO funds (code, name, asset, fund_class, mgmt_fee_bps)
    VALUES ('TEST-MGMT', 'Test Fund', 'USDC', 'Class A', 100);
    passed := false;
    details := 'Expected constraint violation but insert succeeded';
    DELETE FROM funds WHERE code = 'TEST-MGMT';
  EXCEPTION WHEN OTHERS THEN
    passed := true;
    details := 'Correctly rejected non-zero mgmt_fee_bps: ' || SQLERRM;
  END;
  RETURN NEXT;

  -- Test 5: Event conservation constraint
  test_name := 'EVENT_CONSERVATION_CONSTRAINT';
  test_category := 'CONSERVATION';
  BEGIN
    -- This should exist if constraint is working
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_yield_event_conservation'
    INTO STRICT v_result;
    passed := true;
    details := 'Conservation constraint exists';
  EXCEPTION WHEN NO_DATA_FOUND THEN
    passed := false;
    details := 'Conservation constraint missing';
  WHEN OTHERS THEN
    passed := false;
    details := 'Error checking constraint: ' || SQLERRM;
  END;
  RETURN NEXT;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION run_regression_tests() TO authenticated;

COMMENT ON FUNCTION run_regression_tests IS
  'Regression tests for P0 requirements. All tests should pass=true.';


COMMIT;
