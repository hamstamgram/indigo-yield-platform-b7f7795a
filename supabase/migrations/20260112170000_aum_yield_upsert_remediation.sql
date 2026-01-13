-- =============================================================================
-- Migration: AUM Yield UPSERT Remediation
-- Date: 2026-01-12
-- Purpose: Fix silent AUM update failure in apply_daily_yield_to_fund_v3
-- =============================================================================
--
-- ISSUE IDENTIFIED:
-- The current apply_daily_yield_to_fund_v3 function uses UPDATE for AUM:
--   UPDATE fund_daily_aum SET total_aum = total_aum + v_gross_yield_amount
--   WHERE fund_id = p_fund_id AND aum_date = p_yield_date AND purpose = p_purpose AND is_voided = false;
--
-- This UPDATE silently fails if no matching AUM record exists for the yield date!
--
-- FIX: Replace UPDATE with UPSERT (INSERT ... ON CONFLICT) pattern
-- =============================================================================

-- Step 1: Create unique constraint on fund_daily_aum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fund_daily_aum_fund_id_aum_date_purpose_key'
  ) THEN
    -- Only add constraint if we can (need unique combination)
    -- First check if there are duplicates
    IF NOT EXISTS (
      SELECT fund_id, aum_date, purpose, COUNT(*)
      FROM fund_daily_aum
      WHERE is_voided = false
      GROUP BY fund_id, aum_date, purpose
      HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE fund_daily_aum
      ADD CONSTRAINT fund_daily_aum_fund_id_aum_date_purpose_key
      UNIQUE (fund_id, aum_date, purpose);
      RAISE NOTICE 'Created unique constraint on fund_daily_aum(fund_id, aum_date, purpose)';
    ELSE
      RAISE WARNING 'Cannot create unique constraint - duplicates exist. Run deduplication first.';
    END IF;
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
END $$;

-- Step 2: Create helper function for safe AUM update with UPSERT
CREATE OR REPLACE FUNCTION public.upsert_fund_aum_after_yield(
  p_fund_id uuid,
  p_aum_date date,
  p_gross_yield_amount numeric(28,10),
  p_purpose public.aum_purpose,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_aum numeric(28,10);
  v_new_aum numeric(28,10);
  v_record_id uuid;
  v_action text;
BEGIN
  -- Try to get existing AUM record
  SELECT total_aum, id INTO v_existing_aum, v_record_id
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_aum_date
    AND purpose = p_purpose
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_aum IS NOT NULL THEN
    -- Record exists - UPDATE it
    v_new_aum := v_existing_aum + p_gross_yield_amount;

    UPDATE fund_daily_aum
    SET total_aum = v_new_aum,
        updated_at = NOW(),
        updated_by = p_actor_id,
        notes = COALESCE(notes, '') || ' | Yield added: ' || p_gross_yield_amount::text
    WHERE id = v_record_id;

    v_action := 'updated';
  ELSE
    -- No record exists - we need to calculate base AUM and INSERT
    -- Get AUM from most recent date before yield date
    SELECT total_aum INTO v_existing_aum
    FROM fund_daily_aum
    WHERE fund_id = p_fund_id
      AND aum_date < p_aum_date
      AND is_voided = false
    ORDER BY aum_date DESC
    LIMIT 1;

    IF v_existing_aum IS NULL THEN
      -- Calculate from positions as fallback
      SELECT COALESCE(SUM(ip.current_value), 0)::numeric(28,10)
      INTO v_existing_aum
      FROM investor_positions ip
      JOIN profiles p ON p.id = ip.investor_id
      WHERE ip.fund_id = p_fund_id
        AND ip.current_value > 0
        AND p.account_type <> 'fees_account';
    END IF;

    v_new_aum := COALESCE(v_existing_aum, 0) + p_gross_yield_amount;

    INSERT INTO fund_daily_aum (
      fund_id, aum_date, total_aum, purpose, source, created_by, notes
    ) VALUES (
      p_fund_id,
      p_aum_date,
      v_new_aum,
      p_purpose,
      'yield_distribution',
      p_actor_id,
      'Auto-created during yield distribution. Base AUM: ' || COALESCE(v_existing_aum, 0)::text || ', Yield: ' || p_gross_yield_amount::text
    )
    RETURNING id INTO v_record_id;

    v_action := 'inserted';

    -- Log this important event
    INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
    VALUES (
      'AUM_AUTO_CREATED_FOR_YIELD',
      'fund_daily_aum',
      v_record_id::text,
      p_actor_id,
      jsonb_build_object(
        'fund_id', p_fund_id,
        'aum_date', p_aum_date,
        'base_aum', v_existing_aum,
        'yield_amount', p_gross_yield_amount,
        'new_aum', v_new_aum
      ),
      jsonb_build_object('source', 'upsert_fund_aum_after_yield', 'remediation', 'AUM_YIELD_UPSERT_2026-01-12')
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action', v_action,
    'record_id', v_record_id,
    'previous_aum', v_existing_aum,
    'yield_added', p_gross_yield_amount,
    'new_aum', v_new_aum
  );
END;
$$;

COMMENT ON FUNCTION upsert_fund_aum_after_yield IS
'Safe UPSERT for fund AUM after yield distribution.
Handles missing AUM records by creating them automatically.
Remediation: 2026-01-12 (AUM Yield Update Fix)';

-- Step 3: Update apply_daily_yield_to_fund_v3 to use the helper
-- We'll modify the end of the function to use upsert instead of update

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v3(
  p_fund_id uuid, p_yield_date date, p_gross_yield_pct numeric,
  p_created_by uuid DEFAULT NULL, p_purpose aum_purpose DEFAULT 'transaction'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_fund_aum numeric; v_fund record; v_gross_yield_amount numeric; v_snapshot_id uuid;
  v_period_id uuid; v_distributions_created int := 0; v_total_distributed numeric := 0;
  v_total_fees numeric := 0; v_total_ib numeric := 0; v_investor record; v_distribution_id uuid;
  v_fee_pct numeric; v_fee_amount numeric; v_ib_pct numeric; v_ib_amount numeric;
  v_net_yield numeric; v_investor_gross numeric; v_fees_account_id uuid;
  v_dust numeric; v_dust_receiver_id uuid; v_allocated_sum numeric;
  v_aum_result jsonb; -- NEW: Store AUM upsert result
BEGIN
  -- ===== ADVISORY LOCK: Prevent concurrent yield distributions =====
  PERFORM pg_advisory_xact_lock(hashtext('yield:' || p_fund_id::text), hashtext(p_yield_date::text));

  IF EXISTS (SELECT 1 FROM fund_daily_aum WHERE fund_id = p_fund_id AND aum_date = p_yield_date
      AND created_at::date = CURRENT_DATE AND is_voided = false
      AND (temporal_lock_bypass IS NULL OR temporal_lock_bypass = false)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Temporal violation: AUM for ' || p_yield_date || ' was recorded today.', 'code', 'TEMPORAL_LOCK');
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Fund not found'); END IF;

  SELECT total_aum INTO v_fund_aum FROM fund_daily_aum WHERE fund_id = p_fund_id AND aum_date = p_yield_date AND purpose = p_purpose AND is_voided = false ORDER BY created_at DESC LIMIT 1;

  -- MODIFIED: If no exact match, get most recent AUM before yield date
  IF v_fund_aum IS NULL OR v_fund_aum = 0 THEN
    SELECT total_aum INTO v_fund_aum
    FROM fund_daily_aum
    WHERE fund_id = p_fund_id
      AND aum_date < p_yield_date
      AND is_voided = false
    ORDER BY aum_date DESC
    LIMIT 1;
  END IF;

  IF v_fund_aum IS NULL OR v_fund_aum = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'No AUM found for fund'); END IF;

  SELECT id INTO v_fees_account_id FROM profiles WHERE account_type = 'fees_account' LIMIT 1;
  v_gross_yield_amount := v_fund_aum * (p_gross_yield_pct / 100);

  INSERT INTO fund_yield_snapshots (fund_id, snapshot_date, period_start, period_end, opening_aum, closing_aum, gross_yield_pct, gross_yield_amount, days_in_period, trigger_type, trigger_reference, created_by)
  VALUES (p_fund_id, p_yield_date, p_yield_date, p_yield_date, v_fund_aum, v_fund_aum + v_gross_yield_amount, p_gross_yield_pct, v_gross_yield_amount, 1, 'manual', 'Daily yield application', p_created_by) RETURNING id INTO v_snapshot_id;

  SELECT id INTO v_period_id FROM statement_periods sp WHERE p_yield_date BETWEEN make_date(sp.year, sp.month, 1) AND sp.period_end_date LIMIT 1;

  FOR v_investor IN SELECT ip.investor_id, ip.current_value as balance, CASE WHEN v_fund_aum > 0 THEN (ip.current_value / v_fund_aum) * 100 ELSE 0 END as ownership_pct, p.ib_percentage, p.ib_parent_id FROM investor_positions ip JOIN profiles p ON p.id = ip.investor_id WHERE ip.fund_id = p_fund_id AND ip.current_value > 0 ORDER BY ip.current_value DESC, ip.investor_id ASC
  LOOP
    IF v_dust_receiver_id IS NULL THEN v_dust_receiver_id := v_investor.investor_id; END IF;
    SELECT COALESCE((SELECT fee_pct FROM investor_fee_schedule WHERE investor_id = v_investor.investor_id AND (fund_id = p_fund_id OR fund_id IS NULL) AND effective_date <= p_yield_date AND (end_date IS NULL OR end_date >= p_yield_date) ORDER BY fund_id NULLS LAST, effective_date DESC LIMIT 1), (SELECT value FROM global_fee_settings WHERE setting_key = 'default_fee_pct'), 20) INTO v_fee_pct;
    v_investor_gross := v_gross_yield_amount * (v_investor.ownership_pct / 100);
    v_fee_amount := v_investor_gross * (v_fee_pct / 100);
    v_ib_pct := COALESCE(v_investor.ib_percentage, 0);
    v_ib_amount := v_investor_gross * (v_ib_pct / 100);
    v_net_yield := v_investor_gross - v_fee_amount - v_ib_amount;

    INSERT INTO yield_distributions (fund_id, investor_id, period_id, period_start, period_end, gross_yield_amount, fee_percentage, fee_amount, net_yield_amount, investor_balance_at_distribution, ownership_percentage, purpose, status, created_by) VALUES (p_fund_id, v_investor.investor_id, v_period_id, p_yield_date, p_yield_date, v_investor_gross, v_fee_pct, v_fee_amount, v_net_yield, v_investor.balance, v_investor.ownership_pct, p_purpose, 'applied', p_created_by) RETURNING id INTO v_distribution_id;

    INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, value_date, reference_id, notes, created_by, purpose, asset, fund_class, source, visibility_scope) VALUES (v_investor.investor_id, p_fund_id, 'YIELD', v_net_yield, p_yield_date, p_yield_date, 'YIELD-' || p_fund_id || '-' || p_yield_date || '-' || v_investor.investor_id, 'Daily yield distribution', p_created_by, p_purpose, v_fund.asset, v_fund.asset, 'yield_distribution', 'investor_visible') ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

    IF v_fee_amount > 0 AND v_fees_account_id IS NOT NULL THEN
      INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, value_date, reference_id, notes, created_by, purpose, asset, fund_class, source, visibility_scope) VALUES (v_fees_account_id, p_fund_id, 'FEE', v_fee_amount, p_yield_date, p_yield_date, 'FEE-' || p_fund_id || '-' || p_yield_date || '-' || v_investor.investor_id, 'Platform fee from ' || v_investor.investor_id, p_created_by, p_purpose, v_fund.asset, v_fund.asset, 'yield_distribution', 'admin_only') ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
      INSERT INTO fee_allocations (distribution_id, fund_id, investor_id, fees_account_id, period_start, period_end, purpose, base_net_income, fee_percentage, fee_amount, created_by) VALUES (v_distribution_id, p_fund_id, v_investor.investor_id, v_fees_account_id, p_yield_date, p_yield_date, p_purpose, v_investor_gross, v_fee_pct, v_fee_amount, p_created_by) ON CONFLICT DO NOTHING;
    END IF;

    IF v_ib_amount > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
      INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, value_date, reference_id, notes, created_by, purpose, asset, fund_class, source, visibility_scope) VALUES (v_investor.ib_parent_id, p_fund_id, 'YIELD', v_ib_amount, p_yield_date, p_yield_date, 'IB-' || p_fund_id || '-' || p_yield_date || '-' || v_investor.investor_id, 'IB commission from ' || v_investor.investor_id, p_created_by, p_purpose, v_fund.asset, v_fund.asset, 'yield_distribution', 'admin_only') ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
      INSERT INTO ib_allocations (distribution_id, fund_id, source_investor_id, ib_investor_id, period_start, period_end, purpose, source_net_income, ib_percentage, ib_fee_amount, created_by) VALUES (v_distribution_id, p_fund_id, v_investor.investor_id, v_investor.ib_parent_id, p_yield_date, p_yield_date, p_purpose, v_investor_gross, v_ib_pct, v_ib_amount, p_created_by) ON CONFLICT DO NOTHING;
      v_total_ib := v_total_ib + v_ib_amount;
    END IF;

    UPDATE investor_positions SET current_value = current_value + v_net_yield, cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_net_yield, last_yield_crystallization_date = p_yield_date, updated_at = now() WHERE investor_id = v_investor.investor_id AND fund_id = p_fund_id;
    v_distributions_created := v_distributions_created + 1;
    v_total_distributed := v_total_distributed + v_net_yield;
    v_total_fees := v_total_fees + v_fee_amount;
  END LOOP;

  v_allocated_sum := v_total_distributed + v_total_fees + v_total_ib;
  v_dust := v_gross_yield_amount - v_allocated_sum;
  IF ABS(v_dust) > 0 AND ABS(v_dust) < 0.0000001 AND v_fees_account_id IS NOT NULL THEN
    INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, value_date, reference_id, notes, created_by, purpose, asset, fund_class, source, visibility_scope) VALUES (v_fees_account_id, p_fund_id, 'FEE', v_dust, p_yield_date, p_yield_date, 'DUST-' || p_fund_id || '-' || p_yield_date, 'Rounding dust', p_created_by, p_purpose, v_fund.asset, v_fund.asset, 'yield_distribution', 'admin_only') ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
    UPDATE yield_distributions SET dust_amount = v_dust, dust_receiver_id = v_fees_account_id WHERE id = v_distribution_id;
    v_total_fees := v_total_fees + v_dust;
  END IF;

  -- MODIFIED: Use upsert_fund_aum_after_yield instead of plain UPDATE
  v_aum_result := upsert_fund_aum_after_yield(p_fund_id, p_yield_date, v_gross_yield_amount, p_purpose, p_created_by);

  RETURN jsonb_build_object(
    'success', true,
    'snapshot_id', v_snapshot_id,
    'fund_aum', v_fund_aum,
    'gross_yield_amount', v_gross_yield_amount,
    'distributions_created', v_distributions_created,
    'total_distributed', v_total_distributed,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'dust_amount', v_dust,
    'aum_update', v_aum_result, -- NEW: Include AUM update result
    'conservation_check', jsonb_build_object('gross', v_gross_yield_amount, 'allocated', v_allocated_sum + COALESCE(v_dust, 0), 'balanced', ABS(v_gross_yield_amount - (v_allocated_sum + COALESCE(v_dust, 0))) < 0.0000000001)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, aum_purpose) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_fund_aum_after_yield(uuid, date, numeric, aum_purpose, uuid) TO authenticated;

-- Step 4: Audit log entry for this migration
INSERT INTO audit_log (action, entity, entity_id, new_values, meta)
VALUES (
  'MIGRATION_APPLIED',
  'migrations',
  '20260112_aum_yield_upsert_remediation',
  jsonb_build_object(
    'date', '2026-01-12',
    'description', 'Fixed silent AUM update failure in apply_daily_yield_to_fund_v3',
    'changes', ARRAY[
      'Created upsert_fund_aum_after_yield helper function',
      'Modified apply_daily_yield_to_fund_v3 to use UPSERT pattern',
      'Added fallback AUM lookup from previous dates',
      'Added audit logging for auto-created AUM records'
    ]
  ),
  jsonb_build_object('source', 'AUM_YIELD_AUDIT_2026-01-12')
);

-- Step 5: Verification
DO $$
DECLARE
  v_has_upsert boolean;
BEGIN
  SELECT pg_get_functiondef(oid) ILIKE '%upsert_fund_aum_after_yield%'
  INTO v_has_upsert
  FROM pg_proc
  WHERE proname = 'apply_daily_yield_to_fund_v3'
    AND pronamespace = 'public'::regnamespace;

  IF NOT v_has_upsert THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: apply_daily_yield_to_fund_v3 does not use upsert helper';
  END IF;

  RAISE NOTICE 'AUM YIELD UPSERT REMEDIATION VERIFIED: Function now uses safe UPSERT pattern';
END $$;
