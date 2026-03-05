-- Migration: Eliminate fund_aum_events desync
-- Date: 2026-02-28
--
-- PROBLEM: Two parallel AUM tables exist:
--   fund_daily_aum (always correct, written by deposits/withdrawals/yields/triggers)
--   fund_aum_events (goes stale, only written by crystallization/yields)
-- The UI calls get_fund_aum_as_of which reads fund_aum_events, showing stale AUM.
-- Example: Paul deposits 234.17 SOL, yield dialog still shows pre-deposit AUM.
--
-- FIX: Consolidate on fund_daily_aum as single source of truth.
-- Drop fund_aum_events table and all functions/triggers that reference it.
--
-- Functions rewritten (fund_aum_events references removed):
--   get_fund_aum_as_of
--   crystallize_yield_before_flow
--   preview_segmented_yield_distribution_v5
--   apply_segmented_yield_distribution_v5
--   void_transaction
--   void_yield_distribution
--   reset_all_data_keep_profiles
--
-- Functions dropped (only existed for fund_aum_events):
--   ensure_preflow_aum
--   get_existing_preflow_aum
--   cleanup_duplicate_preflow_aum
--   enforce_canonical_aum_event_mutation
--   sync_fund_aum_events_voided_by_profile
--   validate_manual_aum_event

-- ============================================================
-- STEP 1: Rewrite get_fund_aum_as_of to read from fund_daily_aum
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_fund_aum_as_of(
  p_fund_id uuid,
  p_as_of_date date,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
)
RETURNS TABLE(
  fund_id uuid,
  fund_code text,
  as_of_date date,
  purpose aum_purpose,
  aum_value numeric,
  aum_source text,
  event_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    f.id,
    f.code,
    p_as_of_date,
    p_purpose,
    COALESCE(fda.total_aum, 0),
    CASE WHEN fda.id IS NOT NULL THEN 'fund_daily_aum' ELSE 'no_data' END,
    fda.id
  FROM funds f
  LEFT JOIN LATERAL (
    SELECT id, total_aum
    FROM fund_daily_aum
    WHERE fund_id = f.id
      AND aum_date <= p_as_of_date
      AND purpose = p_purpose
      AND is_voided = false
    ORDER BY aum_date DESC
    LIMIT 1
  ) fda ON true
  WHERE f.id = p_fund_id;
$$;

-- ============================================================
-- STEP 2: Rewrite crystallize_yield_before_flow
--   Removed: fund_aum_events reads/writes, preflow reuse path
--   Simplified: 2-tier AUM lookup (fund_daily_aum -> positions SUM)
-- ============================================================

DROP FUNCTION IF EXISTS public.crystallize_yield_before_flow(uuid, numeric, text, text, timestamptz, uuid, aum_purpose);

CREATE OR REPLACE FUNCTION public.crystallize_yield_before_flow(
  p_fund_id uuid,
  p_closing_aum numeric,
  p_trigger_type text,
  p_trigger_reference text,
  p_event_ts timestamp with time zone,
  p_admin_id uuid,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_last_checkpoint record;
  v_opening_aum numeric(28,10);
  v_yield_amount numeric(28,10);
  v_yield_pct numeric(18,10);
  v_event_date date;
  v_period_start date;
  v_days_in_period int;
  v_snapshot_id uuid;
  v_distribution_id uuid;
  v_investors_processed int := 0;
  v_is_negative_yield boolean := false;

  v_validation_result jsonb;
  v_total_positions numeric(28,10) := 0;
  v_total_gross_allocated numeric(28,10) := 0;
  v_total_fees_allocated numeric(28,10) := 0;
  v_total_ib_allocated numeric(28,10) := 0;
  v_total_net_allocated numeric(28,10) := 0;
  v_fees_account_gross numeric(28,10) := 0;
  v_dust_amount numeric(28,10) := 0;

  v_fees_account_id uuid;
  v_fund record;
  v_investor record;
  v_investor_gross numeric(28,10);
  v_investor_fee numeric(28,10);
  v_investor_ib numeric(28,10);
  v_investor_net numeric(28,10);
  v_investor_share numeric(28,10);
  v_fee_pct numeric(10,6);
  v_ib_rate numeric(10,6);
  v_reference_id text;
  v_scale int := 8;

  v_tx_result jsonb;
  v_yield_tx_id uuid;
  v_fee_tx_result jsonb;
  v_fee_tx_id uuid;
  v_ib_tx_result jsonb;
  v_ib_tx_id uuid;

  v_orphaned_yield_events int;
  v_orphaned_snapshots int;
  v_orphaned_distributions int;

  v_fund_daily_aum_record record;
BEGIN
  IF p_purpose IS NULL THEN
    RAISE EXCEPTION 'p_purpose parameter is required'
      USING errcode = 'not_null_violation';
  END IF;

  v_event_date := (p_event_ts AT TIME ZONE 'UTC')::date;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;

  v_validation_result := validate_aum_against_positions_at_date(
    p_fund_id, p_closing_aum, v_event_date, 0.10, 'crystallize_yield_before_flow'
  );

  IF NOT (v_validation_result->>'valid')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'AUM_VALIDATION_FAILED',
      'error_code', 'AUM_DEVIATION_ERROR',
      'message', v_validation_result->>'error',
      'validation', v_validation_result,
      'fund_id', p_fund_id,
      'entered_closing_aum', p_closing_aum
    );
  END IF;

  -- ============================================================
  -- OPENING AUM LOOKUP (fund_daily_aum -> positions SUM fallback)
  -- ============================================================
  SELECT total_aum, aum_date INTO v_fund_daily_aum_record
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date <= v_event_date
    AND purpose = 'transaction'
    AND is_voided = false
  ORDER BY aum_date DESC
  LIMIT 1;

  IF v_fund_daily_aum_record.total_aum IS NOT NULL THEN
    v_opening_aum := v_fund_daily_aum_record.total_aum;
    v_period_start := v_fund_daily_aum_record.aum_date;
  ELSE
    SELECT coalesce(sum(current_value), 0) INTO v_opening_aum
    FROM investor_positions
    WHERE fund_id = p_fund_id AND is_active = true;
    v_period_start := v_event_date;
  END IF;

  v_days_in_period := v_event_date - v_period_start;
  v_yield_amount := p_closing_aum - v_opening_aum;
  v_is_negative_yield := (v_yield_amount < 0);

  IF v_opening_aum > 0 THEN
    v_yield_pct := round((v_yield_amount / v_opening_aum) * 100, 10);
  ELSE
    v_yield_pct := 0;
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Generate tracking ID (replaces fund_aum_events RETURNING id)
  v_snapshot_id := gen_random_uuid();

  -- Get total positions for flat allocation
  SELECT coalesce(sum(current_value), 0) INTO v_total_positions
  FROM investor_positions
  WHERE fund_id = p_fund_id AND is_active = true AND current_value > 0;

  -- ============================================================
  -- YIELD DISTRIBUTION (only if yield != 0 AND positions exist)
  -- ============================================================
  IF v_total_positions > 0 AND v_yield_amount != 0 THEN

    -- Idempotency cleanup: void orphaned records from failed retries
    UPDATE investor_yield_events
    SET is_voided = true, voided_at = now(), voided_by = p_admin_id
    WHERE fund_id = p_fund_id AND event_date = v_event_date
      AND is_voided = false
      AND reference_id LIKE 'crystal_yield_' || '%' || '_' || '%';
    GET DIAGNOSTICS v_orphaned_yield_events = ROW_COUNT;

    DELETE FROM fund_yield_snapshots
    WHERE fund_id = p_fund_id AND snapshot_date = v_event_date AND trigger_type = p_trigger_type;
    GET DIAGNOSTICS v_orphaned_snapshots = ROW_COUNT;

    UPDATE yield_distributions
    SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
        void_reason = 'Orphaned from failed flow retry - voided for idempotency'
    WHERE fund_id = p_fund_id AND effective_date = v_event_date AND purpose = p_purpose
      AND distribution_type = p_trigger_type AND is_voided = false;
    GET DIAGNOSTICS v_orphaned_distributions = ROW_COUNT;

    -- Fund yield snapshot
    INSERT INTO fund_yield_snapshots (
      fund_id, snapshot_date, opening_aum, closing_aum, gross_yield_pct, gross_yield_amount,
      period_start, period_end, days_in_period, trigger_type, trigger_reference, created_by
    ) VALUES (
      p_fund_id, v_event_date, v_opening_aum, p_closing_aum, v_yield_pct, v_yield_amount,
      v_period_start, v_event_date, v_days_in_period, p_trigger_type, p_trigger_reference, p_admin_id
    );

    -- Distribution header (amounts updated after allocation loop)
    INSERT INTO yield_distributions (
      fund_id, effective_date, yield_date, period_start, period_end,
      recorded_aum, previous_aum, gross_yield, gross_yield_amount,
      total_net_amount, total_fee_amount, total_ib_amount,
      net_yield, total_fees, total_ib, dust_amount,
      status, created_by, calculation_method, purpose, is_month_end,
      distribution_type
    ) VALUES (
      p_fund_id, v_event_date, v_event_date, v_period_start, v_event_date,
      p_closing_aum, v_opening_aum, 0, 0,
      0, 0, 0, 0, 0, 0, 0,
      'applied', p_admin_id, 'flat_proportional', p_purpose, false,
      p_trigger_type
    ) RETURNING id INTO v_distribution_id;

    -- ============================================================
    -- FLAT PROPORTIONAL ALLOCATION to each active investor
    -- ============================================================
    FOR v_investor IN
      SELECT ip.investor_id, ip.current_value, p.account_type::text AS account_type,
             p.ib_parent_id
      FROM investor_positions ip
      JOIN profiles p ON p.id = ip.investor_id
      WHERE ip.fund_id = p_fund_id AND ip.is_active = true AND ip.current_value > 0
    LOOP
      v_investor_share := v_investor.current_value / v_total_positions;
      v_investor_gross := ROUND((v_yield_amount * v_investor_share)::numeric, v_scale);

      IF v_is_negative_yield THEN
        v_investor_fee := 0;
        v_investor_ib := 0;
        v_investor_net := v_investor_gross;
        v_fee_pct := 0;
        v_ib_rate := 0;
      ELSE
        IF v_investor.account_type = 'fees_account' THEN
          v_fee_pct := 0;
        ELSE
          v_fee_pct := get_investor_fee_pct(v_investor.investor_id, p_fund_id, v_event_date);
        END IF;
        v_investor_fee := ROUND((v_investor_gross * v_fee_pct / 100.0)::numeric, v_scale);

        v_ib_rate := get_investor_ib_pct(v_investor.investor_id, p_fund_id, v_event_date);
        IF v_investor.ib_parent_id IS NOT NULL AND v_ib_rate > 0 THEN
          v_investor_ib := ROUND((v_investor_gross * v_ib_rate / 100.0)::numeric, v_scale);
        ELSE
          v_investor_ib := 0;
          v_ib_rate := 0;
        END IF;

        v_investor_net := v_investor_gross - v_investor_fee - v_investor_ib;
      END IF;

      IF v_investor.investor_id = v_fees_account_id THEN
        v_fees_account_gross := v_fees_account_gross + v_investor_gross;
      ELSE
        v_total_gross_allocated := v_total_gross_allocated + v_investor_gross;
        v_total_fees_allocated := v_total_fees_allocated + v_investor_fee;
        v_total_ib_allocated := v_total_ib_allocated + v_investor_ib;
        v_total_net_allocated := v_total_net_allocated + v_investor_net;
      END IF;

      -- CREATE YIELD TRANSACTION (net amount to investor)
      v_yield_tx_id := NULL;
      IF v_investor_net != 0 THEN
        v_tx_result := apply_transaction_with_crystallization(
          p_fund_id := p_fund_id,
          p_investor_id := v_investor.investor_id,
          p_tx_type := 'YIELD',
          p_amount := v_investor_net,
          p_tx_date := v_event_date,
          p_reference_id := 'crystal_yield_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
          p_notes := 'Crystallized yield (' || p_trigger_type || ') ' || v_event_date::text,
          p_admin_id := p_admin_id,
          p_purpose := p_purpose,
          p_distribution_id := v_distribution_id
        );
        v_yield_tx_id := NULLIF(v_tx_result->>'tx_id', '')::uuid;

        IF v_yield_tx_id IS NOT NULL THEN
          UPDATE investor_yield_events SET
            investor_balance = (
              SELECT COALESCE(current_value, 0) FROM investor_positions
              WHERE investor_id = v_investor.investor_id AND fund_id = p_fund_id
            ),
            investor_share_pct = ROUND((v_investor_share * 100)::numeric, 6),
            fund_yield_pct = v_yield_pct,
            gross_yield_amount = v_investor_gross,
            fee_pct = v_fee_pct,
            fee_amount = v_investor_fee,
            ib_amount = v_investor_ib,
            net_yield_amount = v_investor_net,
            period_start = v_period_start,
            period_end = v_event_date,
            days_in_period = v_days_in_period,
            visibility_scope = 'admin_only'
          WHERE trigger_transaction_id = v_yield_tx_id AND is_voided = false;
        END IF;
      END IF;

      -- yield_allocations record
      INSERT INTO yield_allocations (
        distribution_id, investor_id, fund_id, gross_amount, net_amount,
        fee_amount, ib_amount, adb_share, fee_pct, ib_pct,
        transaction_id, created_at
      ) VALUES (
        v_distribution_id, v_investor.investor_id, p_fund_id,
        v_investor_gross, v_investor_net,
        v_investor_fee, v_investor_ib,
        v_investor_share,
        v_fee_pct, v_ib_rate,
        v_yield_tx_id, NOW()
      );

      -- fee_allocations record (if fees apply)
      IF v_investor_fee > 0 AND v_investor.account_type != 'fees_account' THEN
        INSERT INTO fee_allocations (
          distribution_id, fund_id, investor_id, fees_account_id,
          period_start, period_end, purpose, base_net_income, fee_percentage,
          fee_amount, credit_transaction_id, created_by
        ) VALUES (
          v_distribution_id, p_fund_id, v_investor.investor_id, v_fees_account_id,
          v_period_start, v_event_date, p_purpose, v_investor_gross,
          v_fee_pct, v_investor_fee, NULL, p_admin_id
        );

        INSERT INTO platform_fee_ledger (
          fund_id, yield_distribution_id, investor_id, investor_name,
          gross_yield_amount, fee_percentage, fee_amount, effective_date,
          asset, transaction_id, created_by
        ) VALUES (
          p_fund_id, v_distribution_id, v_investor.investor_id,
          (SELECT trim(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) FROM profiles WHERE id = v_investor.investor_id),
          v_investor_gross, v_fee_pct, v_investor_fee, v_event_date,
          v_fund.asset, NULL, p_admin_id
        );
      END IF;

      -- IB allocation + IB_CREDIT transaction
      IF v_investor_ib > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
        v_ib_tx_result := apply_transaction_with_crystallization(
          p_fund_id := p_fund_id,
          p_investor_id := v_investor.ib_parent_id,
          p_tx_type := 'IB_CREDIT',
          p_amount := v_investor_ib,
          p_tx_date := v_event_date,
          p_reference_id := 'crystal_ib_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
          p_notes := 'IB commission from crystallized yield (' || p_trigger_type || ')',
          p_admin_id := p_admin_id,
          p_purpose := p_purpose,
          p_distribution_id := v_distribution_id
        );
        v_ib_tx_id := NULLIF(v_ib_tx_result->>'tx_id', '')::uuid;

        UPDATE yield_allocations SET ib_transaction_id = v_ib_tx_id
        WHERE distribution_id = v_distribution_id
          AND investor_id = v_investor.investor_id
          AND ib_transaction_id IS NULL;

        INSERT INTO ib_commission_ledger (
          fund_id, yield_distribution_id, source_investor_id, source_investor_name,
          ib_id, ib_name, gross_yield_amount, ib_percentage, ib_commission_amount,
          effective_date, asset, transaction_id, created_by
        )
        SELECT p_fund_id, v_distribution_id, v_investor.investor_id,
               (SELECT trim(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) FROM profiles WHERE id = v_investor.investor_id),
               v_investor.ib_parent_id,
               trim(COALESCE(ib.first_name,'') || ' ' || COALESCE(ib.last_name,'')),
               v_investor_gross, v_ib_rate, v_investor_ib,
               v_event_date, v_fund.asset, v_ib_tx_id, p_admin_id
        FROM profiles ib WHERE ib.id = v_investor.ib_parent_id;
      END IF;

      v_investors_processed := v_investors_processed + 1;
    END LOOP;

    -- ============================================================
    -- DUST ROUTING to fees_account
    -- ============================================================
    v_dust_amount := v_yield_amount - v_total_gross_allocated - v_fees_account_gross;

    IF (v_total_fees_allocated + v_dust_amount) > 0 AND v_fees_account_id IS NOT NULL THEN
      v_fee_tx_result := apply_transaction_with_crystallization(
        p_fund_id := p_fund_id,
        p_investor_id := v_fees_account_id,
        p_tx_type := 'FEE_CREDIT',
        p_amount := v_total_fees_allocated + v_dust_amount,
        p_tx_date := v_event_date,
        p_reference_id := 'crystal_fee_' || v_distribution_id::text,
        p_notes := 'Platform fees from crystallized yield (' || p_trigger_type || ')',
        p_admin_id := p_admin_id,
        p_purpose := p_purpose,
        p_distribution_id := v_distribution_id
      );
      v_fee_tx_id := NULLIF(v_fee_tx_result->>'tx_id', '')::uuid;

      UPDATE platform_fee_ledger SET transaction_id = v_fee_tx_id
      WHERE yield_distribution_id = v_distribution_id AND transaction_id IS NULL;
      UPDATE yield_allocations SET fee_transaction_id = v_fee_tx_id
      WHERE distribution_id = v_distribution_id AND fee_amount > 0 AND fee_transaction_id IS NULL;
      UPDATE fee_allocations SET credit_transaction_id = v_fee_tx_id
      WHERE distribution_id = v_distribution_id AND credit_transaction_id IS NULL;
    END IF;

    -- Update distribution header with final totals
    UPDATE yield_distributions SET
      gross_yield = v_total_gross_allocated,
      gross_yield_amount = v_total_gross_allocated,
      total_net_amount = v_total_net_allocated,
      total_fee_amount = v_total_fees_allocated,
      total_ib_amount = v_total_ib_allocated,
      net_yield = v_total_net_allocated,
      total_fees = v_total_fees_allocated,
      total_ib = v_total_ib_allocated,
      dust_amount = v_dust_amount,
      allocation_count = v_investors_processed,
      summary_json = jsonb_build_object(
        'version', 'crystallize_v2_real_transactions',
        'opening_aum', v_opening_aum,
        'closing_aum', p_closing_aum,
        'yield_amount', v_yield_amount,
        'is_negative_yield', v_is_negative_yield,
        'allocation_method', 'flat_proportional',
        'investors_processed', v_investors_processed,
        'trigger_type', p_trigger_type,
        'fees_account_gross', v_fees_account_gross,
        'dust_amount', v_dust_amount
      )
    WHERE id = v_distribution_id;

  ELSE
    -- Zero yield or no positions: create header with zeros
    INSERT INTO yield_distributions (
      fund_id, effective_date, yield_date, period_start, period_end,
      recorded_aum, previous_aum, gross_yield, gross_yield_amount,
      total_net_amount, total_fee_amount, total_ib_amount,
      net_yield, total_fees, total_ib, dust_amount,
      status, created_by, calculation_method, purpose, is_month_end,
      distribution_type, allocation_count
    ) VALUES (
      p_fund_id, v_event_date, v_event_date, v_period_start, v_event_date,
      p_closing_aum, v_opening_aum, v_yield_amount, v_yield_amount,
      0, 0, 0, 0, 0, 0, 0,
      'applied', p_admin_id, 'flat_proportional', p_purpose, false,
      p_trigger_type, 0
    ) RETURNING id INTO v_distribution_id;

  END IF;

  -- ============================================================
  -- UPDATE CRYSTALLIZATION DATE for all active positions
  -- ============================================================
  UPDATE investor_positions SET
    last_yield_crystallization_date = v_event_date
  WHERE fund_id = p_fund_id
    AND is_active = true
    AND investor_id IS NOT NULL;

  -- ============================================================
  -- AUDIT LOG (mandatory for every financial mutation)
  -- ============================================================
  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (
    p_admin_id,
    'CRYSTALLIZE_YIELD_BEFORE_FLOW',
    'yield_distributions',
    v_distribution_id::text,
    jsonb_build_object(
      'opening_aum', v_opening_aum,
      'period_start', v_period_start
    ),
    jsonb_build_object(
      'gross_yield', v_yield_amount,
      'total_gross_allocated', v_total_gross_allocated,
      'total_fees', v_total_fees_allocated,
      'total_ib', v_total_ib_allocated,
      'total_net', v_total_net_allocated,
      'dust_amount', v_dust_amount,
      'investors_processed', v_investors_processed,
      'is_negative_yield', v_is_negative_yield
    ),
    jsonb_build_object(
      'fund_id', p_fund_id,
      'trigger_type', p_trigger_type,
      'trigger_reference', p_trigger_reference,
      'event_date', v_event_date,
      'closing_aum', p_closing_aum,
      'calculation_method', 'flat_proportional'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'snapshot_id', v_snapshot_id,
    'fund_id', p_fund_id,
    'trigger_date', v_event_date,
    'trigger_type', p_trigger_type,
    'period_start', v_period_start,
    'days_in_period', v_days_in_period,
    'opening_aum', v_opening_aum,
    'closing_aum', p_closing_aum,
    'fund_yield_pct', v_yield_pct,
    'gross_yield', v_yield_amount,
    'total_fees', v_total_fees_allocated,
    'total_ib', v_total_ib_allocated,
    'total_net', v_total_net_allocated,
    'dust_amount', v_dust_amount,
    'investors_affected', v_investors_processed,
    'distribution_id', v_distribution_id,
    'reused_preflow', false,
    'is_negative_yield', v_is_negative_yield,
    'calculation_method', 'flat_proportional',
    'validation', v_validation_result
  );
END;
$function$;


-- ============================================================
-- STEP 3a: Rewrite preview_segmented_yield_distribution_v5
--   Removed: LEFT JOIN fund_aum_events in crystal marker metadata
--   Uses yield_distributions.recorded_aum instead
-- ============================================================

DROP FUNCTION IF EXISTS public.preview_segmented_yield_distribution_v5(uuid, date, numeric, text);
DROP FUNCTION IF EXISTS public.preview_segmented_yield_distribution_v5(uuid, date, numeric, aum_purpose);

CREATE OR REPLACE FUNCTION public.preview_segmented_yield_distribution_v5(
  p_fund_id uuid,
  p_period_end date,
  p_recorded_aum numeric,
  p_purpose public.aum_purpose DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund RECORD;
  v_period_start date;
  v_period_end date;
  v_fees_account_id uuid;

  -- Month-level yield
  v_opening_balance_sum numeric := 0;
  v_total_month_flows numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;

  -- Allocation basis (may differ from opening_balance_sum for inception month)
  v_alloc_sum numeric := 0;

  -- Running totals (header: excludes fees_account)
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_fees_account_gross numeric := 0;
  v_opening_aum numeric := 0;

  -- Dust
  v_residual numeric;

  -- Per-investor iteration
  v_inv RECORD;
  v_share numeric;
  v_gross numeric;
  v_fee numeric;
  v_ib numeric;
  v_net numeric;
  v_fee_pct numeric;
  v_ib_rate numeric;

  -- Crystal marker metadata
  v_seg_count int := 0;
  v_crystals_in_period int := 0;
  v_segments_meta jsonb := '[]'::jsonb;

  -- Output
  v_allocations_out jsonb := '[]'::jsonb;
BEGIN
  IF p_recorded_aum IS NULL OR p_recorded_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recorded AUM must be a positive number');
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  v_period_start := GREATEST(
    date_trunc('month', p_period_end)::date,
    COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
  );
  v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;

  -- ============================================================
  -- TEMP TABLES
  -- ============================================================
  DROP TABLE IF EXISTS _v5p_bal;
  DROP TABLE IF EXISTS _v5p_tot;

  CREATE TEMP TABLE _v5p_bal (
    investor_id uuid PRIMARY KEY,
    balance numeric NOT NULL DEFAULT 0,
    opening_balance numeric NOT NULL DEFAULT 0,
    account_type text NOT NULL DEFAULT 'investor',
    ib_parent_id uuid,
    ib_rate numeric NOT NULL DEFAULT 0,
    investor_name text,
    investor_email text
  ) ON COMMIT DROP;

  CREATE TEMP TABLE _v5p_tot (
    investor_id uuid PRIMARY KEY,
    total_gross numeric NOT NULL DEFAULT 0,
    total_fee numeric NOT NULL DEFAULT 0,
    total_ib numeric NOT NULL DEFAULT 0,
    total_net numeric NOT NULL DEFAULT 0,
    seg_detail jsonb NOT NULL DEFAULT '[]'::jsonb,
    ib_parent_id uuid,
    ib_rate numeric NOT NULL DEFAULT 0,
    investor_name text,
    investor_email text
  ) ON COMMIT DROP;

  -- ============================================================
  -- Opening balances: SUM(all non-voided txs before period_start)
  -- ============================================================
  INSERT INTO _v5p_bal (investor_id, balance, opening_balance, account_type, ib_parent_id, ib_rate, investor_name, investor_email)
  SELECT
    p.id,
    COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = p.id AND t.fund_id = p_fund_id
        AND t.tx_date < v_period_start AND t.is_voided = false
    ), 0),
    COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = p.id AND t.fund_id = p_fund_id
        AND t.tx_date < v_period_start AND t.is_voided = false
    ), 0),
    p.account_type::text,
    p.ib_parent_id,
    get_investor_ib_pct(p.id, p_fund_id, v_period_end),
    trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
    p.email
  FROM (
    SELECT DISTINCT t.investor_id
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id AND t.is_voided = false
  ) active_inv
  JOIN profiles p ON p.id = active_inv.investor_id;

  INSERT INTO _v5p_bal (investor_id, balance, opening_balance, account_type, ib_parent_id, ib_rate, investor_name, investor_email)
  SELECT p.id, 0, 0, 'fees_account', NULL, 0,
         trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), p.email
  FROM profiles p WHERE p.id = v_fees_account_id
  ON CONFLICT (investor_id) DO NOTHING;

  INSERT INTO _v5p_tot (investor_id, ib_parent_id, ib_rate, investor_name, investor_email)
  SELECT investor_id, ib_parent_id, ib_rate, investor_name, investor_email FROM _v5p_bal;

  SELECT COALESCE(SUM(balance), 0) INTO v_opening_aum FROM _v5p_bal;
  v_opening_balance_sum := v_opening_aum;

  -- ============================================================
  -- MONTH-LEVEL YIELD COMPUTATION
  -- ============================================================
  SELECT COALESCE(SUM(t.amount), 0) INTO v_total_month_flows
  FROM transactions_v2 t
  WHERE t.fund_id = p_fund_id
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= v_period_start
    AND t.tx_date <= v_period_end;

  v_total_month_yield := p_recorded_aum - v_opening_balance_sum - v_total_month_flows;
  v_is_negative_yield := (v_total_month_yield < 0);

  -- ============================================================
  -- INCEPTION MONTH FALLBACK
  -- ============================================================
  v_alloc_sum := v_opening_balance_sum;

  IF v_alloc_sum = 0 THEN
    UPDATE _v5p_bal b SET opening_balance = COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = b.investor_id AND t.fund_id = p_fund_id
        AND t.tx_date <= v_period_end AND t.is_voided = false
        AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    ), 0)
    WHERE b.investor_id IS NOT NULL;

    SELECT COALESCE(SUM(opening_balance), 0) INTO v_alloc_sum
    FROM _v5p_bal WHERE opening_balance > 0;
  END IF;

  -- ============================================================
  -- Build crystal marker metadata (uses yield_distributions.recorded_aum)
  -- ============================================================
  FOR v_inv IN
    SELECT
      yd.effective_date,
      COALESCE(yd.recorded_aum, 0) as closing_aum
    FROM yield_distributions yd
    WHERE yd.fund_id = p_fund_id
      AND yd.effective_date >= v_period_start
      AND yd.effective_date <= v_period_end
      AND yd.is_voided = false
      AND yd.distribution_type IN ('deposit', 'withdrawal', 'transaction')
      AND yd.consolidated_into_id IS NULL
    ORDER BY yd.effective_date
  LOOP
    v_seg_count := v_seg_count + 1;
    v_crystals_in_period := v_crystals_in_period + 1;
    v_segments_meta := v_segments_meta || jsonb_build_object(
      'seg_idx', v_seg_count,
      'date', v_inv.effective_date,
      'marker_closing_aum', v_inv.closing_aum,
      'type', 'crystal_marker'
    );
  END LOOP;
  v_seg_count := v_seg_count + 1;

  -- ============================================================
  -- YIELD ALLOCATION
  -- ============================================================
  IF v_total_month_yield != 0 AND v_alloc_sum > 0 THEN

    FOR v_inv IN
      SELECT b.investor_id, b.opening_balance, b.account_type,
             b.ib_parent_id, b.ib_rate, b.investor_name, b.investor_email
      FROM _v5p_bal b WHERE b.opening_balance > 0
    LOOP
      v_share := v_inv.opening_balance / v_alloc_sum;
      v_gross := ROUND((v_total_month_yield * v_share)::numeric, 8);

      IF v_is_negative_yield THEN
        v_fee := 0;
        v_ib := 0;
        v_net := v_gross;
        v_fee_pct := 0;
        v_ib_rate := 0;
      ELSE
        IF v_inv.account_type = 'fees_account' THEN
          v_fee_pct := 0;
        ELSE
          v_fee_pct := get_investor_fee_pct(v_inv.investor_id, p_fund_id, v_period_end);
        END IF;
        v_fee := ROUND((v_gross * v_fee_pct / 100)::numeric, 8);

        v_ib_rate := get_investor_ib_pct(v_inv.investor_id, p_fund_id, v_period_end);
        IF v_inv.ib_parent_id IS NOT NULL AND v_ib_rate > 0 THEN
          v_ib := ROUND((v_gross * v_ib_rate / 100)::numeric, 8);
        ELSE
          v_ib := 0;
        END IF;

        v_net := v_gross - v_fee - v_ib;
      END IF;

      IF v_inv.investor_id = v_fees_account_id THEN
        v_fees_account_gross := v_fees_account_gross + v_gross;
      ELSE
        v_total_gross := v_total_gross + v_gross;
        v_total_net := v_total_net + v_net;
        v_total_fees := v_total_fees + v_fee;
        v_total_ib := v_total_ib + v_ib;
      END IF;

      UPDATE _v5p_tot SET
        total_gross = v_gross,
        total_fee = v_fee,
        total_ib = v_ib,
        total_net = v_net,
        seg_detail = jsonb_build_object(
          'gross', v_gross, 'fee_pct', v_fee_pct,
          'fee', v_fee, 'ib_pct', v_ib_rate,
          'ib', v_ib, 'net', v_net, 'share', v_share
        )
      WHERE investor_id = v_inv.investor_id;
    END LOOP;

  END IF;

  -- ============================================================
  -- DUST ROUTING to fees_account
  -- ============================================================
  v_residual := v_total_month_yield - v_total_gross - v_fees_account_gross;

  IF v_residual != 0 THEN
    UPDATE _v5p_tot SET
      total_gross = total_gross + v_residual,
      total_net = total_net + v_residual
    WHERE investor_id = v_fees_account_id;

    v_fees_account_gross := v_fees_account_gross + v_residual;
  END IF;

  -- ============================================================
  -- BUILD ALLOCATIONS OUTPUT
  -- ============================================================
  FOR v_inv IN
    SELECT t.investor_id, t.total_gross, t.total_fee, t.total_ib, t.total_net,
           t.seg_detail, t.investor_name, t.investor_email, t.ib_parent_id, t.ib_rate
    FROM _v5p_tot t
    WHERE t.total_gross != 0
    ORDER BY ABS(t.total_gross) DESC
  LOOP
    v_allocations_out := v_allocations_out || jsonb_build_object(
      'investor_id', v_inv.investor_id,
      'investor_name', v_inv.investor_name,
      'investor_email', v_inv.investor_email,
      'account_type', COALESCE((SELECT account_type::text FROM _v5p_bal WHERE investor_id = v_inv.investor_id), 'investor'),
      'gross', v_inv.total_gross,
      'fee_pct', COALESCE(
        get_investor_fee_pct(v_inv.investor_id, p_fund_id, v_period_end), 0),
      'fee', v_inv.total_fee,
      'ib_parent_id', v_inv.ib_parent_id,
      'ib_rate', v_inv.ib_rate,
      'ib', v_inv.total_ib,
      'net', v_inv.total_net,
      'details', v_inv.seg_detail
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'days_in_period', v_period_end - v_period_start + 1,
    'opening_aum', v_opening_aum,
    'recorded_aum', p_recorded_aum,
    'month_yield', v_total_month_yield,
    'month_flows', v_total_month_flows,
    'is_negative_yield', v_is_negative_yield,
    'total_yield', v_total_gross,
    'gross_yield', v_total_gross,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'dust_amount', COALESCE(v_residual, 0),
    'dust_receiver', 'fees_account',
    'investor_count', jsonb_array_length(v_allocations_out),
    'segment_count', v_seg_count,
    'crystal_count', v_crystals_in_period,
    'crystal_markers', v_segments_meta,
    'allocations', v_allocations_out,
    'conservation_check', (v_total_gross = v_total_net + v_total_fees + v_total_ib),
    'calculation_method', 'segmented_v5_month_level',
    'features', ARRAY[
      'month_level_yield', 'opening_balance_allocation', 'negative_yield_support',
      'per_investor_fees', 'ib_from_gross', 'fees_account_yield',
      'crystal_consolidation', 'aum_only_input',
      'inception_date_period_start', 'dust_to_fees_account',
      'inception_month_fallback', 'fees_account_in_preview'
    ]
  );
END;
$$;


-- ============================================================
-- STEP 3b: Rewrite apply_segmented_yield_distribution_v5
--   Removed: LEFT JOIN fund_aum_events in crystal marker metadata
--   Uses yield_distributions.recorded_aum instead
-- ============================================================

CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5(
  p_fund_id uuid,
  p_period_end date,
  p_recorded_aum numeric,
  p_admin_id uuid DEFAULT NULL,
  p_purpose public.aum_purpose DEFAULT 'reporting',
  p_distribution_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_period_start date;
  v_period_end date;
  v_lock_key bigint;
  v_distribution_id uuid;
  v_fees_account_id uuid;

  -- Month-level yield
  v_opening_balance_sum numeric := 0;
  v_total_month_flows numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;

  -- Allocation basis (may differ from opening_balance_sum for inception month)
  v_alloc_sum numeric := 0;

  -- Running totals (header: excludes fees_account)
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_fees_account_gross numeric := 0;
  v_allocation_count int := 0;
  v_opening_aum numeric := 0;

  -- Dust
  v_residual numeric;

  -- Per-investor iteration
  v_inv RECORD;
  v_share numeric;
  v_gross numeric;
  v_fee numeric;
  v_ib numeric;
  v_net numeric;
  v_fee_pct numeric;
  v_ib_rate numeric;

  -- Transaction results (only used for reporting purpose)
  v_tx_result jsonb;
  v_yield_tx_id uuid;
  v_fee_tx_result jsonb;
  v_fee_tx_id uuid;
  v_ib_tx_result jsonb;
  v_ib_tx_id uuid;

  -- Crystal consolidation
  v_crystals_consolidated int := 0;
  v_crystal_dist RECORD;

  -- Metadata
  v_final_positions_sum numeric;
  v_is_month_end boolean;
  v_tx_date date;
  v_alloc RECORD;
  v_segments_meta jsonb := '[]'::jsonb;
  v_seg_count int := 0;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  IF p_recorded_aum IS NULL OR p_recorded_aum <= 0 THEN
    RAISE EXCEPTION 'Recorded AUM must be a positive number, got: %', p_recorded_aum;
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  v_period_start := GREATEST(
    date_trunc('month', p_period_end)::date,
    COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
  );
  v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;
  v_is_month_end := (v_period_end = (date_trunc('month', v_period_end) + interval '1 month - 1 day')::date);
  v_tx_date := COALESCE(p_distribution_date, v_period_end);

  -- Advisory lock
  v_lock_key := ('x' || substr(md5(p_fund_id::text || v_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  PERFORM _v5_check_distribution_uniqueness(p_fund_id, v_period_end, p_purpose);

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'Fees account not configured';
  END IF;

  PERFORM set_config('indigo.aum_synced', 'true', true);

  -- ============================================================
  -- TEMP TABLES
  -- ============================================================
  DROP TABLE IF EXISTS _v5_bal;
  DROP TABLE IF EXISTS _v5_tot;

  CREATE TEMP TABLE _v5_bal (
    investor_id uuid PRIMARY KEY,
    balance numeric NOT NULL DEFAULT 0,
    opening_balance numeric NOT NULL DEFAULT 0,
    account_type text NOT NULL DEFAULT 'investor',
    ib_parent_id uuid,
    ib_rate numeric NOT NULL DEFAULT 0,
    investor_name text
  ) ON COMMIT DROP;

  CREATE TEMP TABLE _v5_tot (
    investor_id uuid PRIMARY KEY,
    total_gross numeric NOT NULL DEFAULT 0,
    total_fee numeric NOT NULL DEFAULT 0,
    total_ib numeric NOT NULL DEFAULT 0,
    total_net numeric NOT NULL DEFAULT 0,
    seg_detail jsonb NOT NULL DEFAULT '[]'::jsonb,
    ib_parent_id uuid,
    ib_rate numeric NOT NULL DEFAULT 0,
    investor_name text
  ) ON COMMIT DROP;

  -- ============================================================
  -- Opening balances: SUM(all non-voided txs before period_start)
  -- ============================================================
  INSERT INTO _v5_bal (investor_id, balance, opening_balance, account_type, ib_parent_id, ib_rate, investor_name)
  SELECT
    p.id,
    COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = p.id AND t.fund_id = p_fund_id
        AND t.tx_date < v_period_start AND t.is_voided = false
    ), 0),
    COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = p.id AND t.fund_id = p_fund_id
        AND t.tx_date < v_period_start AND t.is_voided = false
    ), 0),
    p.account_type::text,
    p.ib_parent_id,
    get_investor_ib_pct(p.id, p_fund_id, v_period_end),
    trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
  FROM (
    SELECT DISTINCT t.investor_id
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id AND t.is_voided = false
  ) active_inv
  JOIN profiles p ON p.id = active_inv.investor_id;

  INSERT INTO _v5_bal (investor_id, balance, opening_balance, account_type, ib_parent_id, ib_rate, investor_name)
  SELECT p.id, 0, 0, 'fees_account', NULL, 0,
         trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
  FROM profiles p WHERE p.id = v_fees_account_id
  ON CONFLICT (investor_id) DO NOTHING;

  INSERT INTO _v5_tot (investor_id, ib_parent_id, ib_rate, investor_name)
  SELECT investor_id, ib_parent_id, ib_rate, investor_name FROM _v5_bal;

  SELECT COALESCE(SUM(balance), 0) INTO v_opening_aum FROM _v5_bal;
  v_opening_balance_sum := v_opening_aum;

  -- ============================================================
  -- MONTH-LEVEL YIELD COMPUTATION
  -- ============================================================
  SELECT COALESCE(SUM(t.amount), 0) INTO v_total_month_flows
  FROM transactions_v2 t
  WHERE t.fund_id = p_fund_id
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= v_period_start
    AND t.tx_date <= v_period_end;

  v_total_month_yield := p_recorded_aum - v_opening_balance_sum - v_total_month_flows;
  v_is_negative_yield := (v_total_month_yield < 0);

  -- ============================================================
  -- INCEPTION MONTH FALLBACK
  -- ============================================================
  v_alloc_sum := v_opening_balance_sum;

  IF v_alloc_sum = 0 THEN
    UPDATE _v5_bal b SET opening_balance = COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = b.investor_id AND t.fund_id = p_fund_id
        AND t.tx_date <= v_period_end AND t.is_voided = false
        AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    ), 0)
    WHERE b.investor_id IS NOT NULL;

    SELECT COALESCE(SUM(opening_balance), 0) INTO v_alloc_sum
    FROM _v5_bal WHERE opening_balance > 0;
  END IF;

  -- ============================================================
  -- Build segment metadata (uses yield_distributions.recorded_aum)
  -- ============================================================
  FOR v_inv IN
    SELECT
      yd.effective_date,
      COALESCE(yd.recorded_aum, 0) as closing_aum
    FROM yield_distributions yd
    WHERE yd.fund_id = p_fund_id
      AND yd.effective_date >= v_period_start
      AND yd.effective_date <= v_period_end
      AND yd.is_voided = false
      AND yd.distribution_type IN ('deposit', 'withdrawal', 'transaction')
      AND yd.consolidated_into_id IS NULL
    ORDER BY yd.effective_date
  LOOP
    v_seg_count := v_seg_count + 1;
    v_segments_meta := v_segments_meta || jsonb_build_object(
      'seg_idx', v_seg_count,
      'date', v_inv.effective_date,
      'marker_closing_aum', v_inv.closing_aum,
      'type', 'crystal_marker'
    );
  END LOOP;
  v_seg_count := v_seg_count + 1;

  -- ============================================================
  -- Create distribution header
  -- ============================================================
  INSERT INTO yield_distributions (
    fund_id, effective_date, yield_date, period_start, period_end,
    recorded_aum, previous_aum, gross_yield, gross_yield_amount,
    total_net_amount, total_fee_amount, total_ib_amount,
    net_yield, total_fees, total_ib, dust_amount,
    status, created_by, calculation_method, purpose, is_month_end,
    allocation_count
  ) VALUES (
    p_fund_id, v_period_end, v_period_end, v_period_start, v_period_end,
    p_recorded_aum, v_opening_aum, 0, 0,
    0, 0, 0, 0, 0, 0, 0,
    'applied'::yield_distribution_status, v_admin, 'segmented_v5', p_purpose, v_is_month_end,
    0
  ) RETURNING id INTO v_distribution_id;

  -- ============================================================
  -- Consolidate crystallization markers
  -- ============================================================
  FOR v_crystal_dist IN
    SELECT id FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND effective_date >= v_period_start AND effective_date <= v_period_end
      AND is_voided = false
      AND distribution_type IN ('deposit', 'withdrawal', 'transaction')
      AND consolidated_into_id IS NULL
      AND id != v_distribution_id
  LOOP
    UPDATE yield_distributions
    SET consolidated_into_id = v_distribution_id
    WHERE id = v_crystal_dist.id;
    v_crystals_consolidated := v_crystals_consolidated + 1;
  END LOOP;

  -- ============================================================
  -- YIELD ALLOCATION
  -- ============================================================
  IF v_total_month_yield != 0 AND v_alloc_sum > 0 THEN

    FOR v_inv IN
      SELECT b.investor_id, b.opening_balance, b.account_type,
             b.ib_parent_id, b.ib_rate, b.investor_name
      FROM _v5_bal b WHERE b.opening_balance > 0
    LOOP
      v_share := v_inv.opening_balance / v_alloc_sum;
      v_gross := ROUND((v_total_month_yield * v_share)::numeric, 8);

      IF v_is_negative_yield THEN
        v_fee := 0;
        v_ib := 0;
        v_net := v_gross;
        v_fee_pct := 0;
        v_ib_rate := 0;
      ELSE
        IF v_inv.account_type = 'fees_account' THEN
          v_fee_pct := 0;
        ELSE
          v_fee_pct := get_investor_fee_pct(v_inv.investor_id, p_fund_id, v_period_end);
        END IF;
        v_fee := ROUND((v_gross * v_fee_pct / 100)::numeric, 8);

        v_ib_rate := get_investor_ib_pct(v_inv.investor_id, p_fund_id, v_period_end);
        IF v_inv.ib_parent_id IS NOT NULL AND v_ib_rate > 0 THEN
          v_ib := ROUND((v_gross * v_ib_rate / 100)::numeric, 8);
        ELSE
          v_ib := 0;
        END IF;

        v_net := v_gross - v_fee - v_ib;
      END IF;

      IF v_inv.investor_id = v_fees_account_id THEN
        v_fees_account_gross := v_fees_account_gross + v_gross;
      ELSE
        v_total_gross := v_total_gross + v_gross;
        v_total_net := v_total_net + v_net;
        v_total_fees := v_total_fees + v_fee;
        v_total_ib := v_total_ib + v_ib;
      END IF;

      UPDATE _v5_tot SET
        total_gross = v_gross,
        total_fee = v_fee,
        total_ib = v_ib,
        total_net = v_net,
        seg_detail = jsonb_build_object(
          'gross', v_gross, 'fee_pct', CASE WHEN v_is_negative_yield THEN 0 ELSE v_fee_pct END,
          'fee', v_fee, 'ib_pct', CASE WHEN v_is_negative_yield THEN 0 ELSE v_ib_rate END,
          'ib', v_ib, 'net', v_net, 'share', v_share
        )
      WHERE investor_id = v_inv.investor_id;

      IF v_fee > 0 AND v_inv.account_type != 'fees_account' THEN
        INSERT INTO _v5_tot (investor_id, investor_name)
        VALUES (v_fees_account_id, 'Fees Account')
        ON CONFLICT DO NOTHING;
      END IF;

      IF v_ib > 0 AND v_inv.ib_parent_id IS NOT NULL THEN
        INSERT INTO _v5_tot (investor_id, ib_parent_id, ib_rate, investor_name)
        SELECT v_inv.ib_parent_id, NULL, 0,
               trim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,''))
        FROM profiles p WHERE p.id = v_inv.ib_parent_id
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;

  END IF;

  -- ============================================================
  -- DUST ROUTING to fees_account
  -- ============================================================
  v_residual := v_total_month_yield - v_total_gross - v_fees_account_gross;

  IF v_residual != 0 THEN
    UPDATE _v5_tot SET
      total_gross = total_gross + v_residual,
      total_net = total_net + v_residual
    WHERE investor_id = v_fees_account_id;

    v_fees_account_gross := v_fees_account_gross + v_residual;
  END IF;

  -- ============================================================
  -- CREATE TRANSACTIONS AND ALLOCATION RECORDS
  -- ============================================================
  FOR v_alloc IN
    SELECT t.investor_id, t.total_gross, t.total_fee, t.total_ib, t.total_net,
           t.seg_detail, t.ib_parent_id, t.ib_rate, t.investor_name
    FROM _v5_tot t
    WHERE t.total_net != 0 OR t.total_gross != 0
  LOOP

    IF p_purpose = 'reporting'::aum_purpose THEN
      -- REPORTING: Create actual YIELD transactions
      v_yield_tx_id := NULL;
      IF v_alloc.total_net != 0 THEN
        v_tx_result := apply_transaction_with_crystallization(
          p_investor_id := v_alloc.investor_id,
          p_fund_id := p_fund_id,
          p_tx_type := 'YIELD',
          p_amount := v_alloc.total_net,
          p_tx_date := v_tx_date,
          p_reference_id := 'yield_v5_' || v_distribution_id::text || '_' || v_alloc.investor_id::text,
          p_notes := 'V5 yield for ' || to_char(v_period_start, 'Mon YYYY') ||
            CASE WHEN v_is_negative_yield THEN ' (negative yield)' ELSE '' END ||
            E'\n' || COALESCE(v_alloc.seg_detail::text, ''),
          p_admin_id := v_admin,
          p_purpose := p_purpose,
          p_distribution_id := v_distribution_id
        );
        v_yield_tx_id := NULLIF(v_tx_result->>'tx_id', '')::uuid;

        IF v_yield_tx_id IS NOT NULL THEN
          UPDATE transactions_v2 SET visibility_scope = 'investor_visible'::visibility_scope
          WHERE id = v_yield_tx_id;

          UPDATE investor_yield_events SET
            investor_balance = (
              SELECT COALESCE(current_value, 0) FROM investor_positions
              WHERE investor_id = v_alloc.investor_id AND fund_id = p_fund_id
            ),
            investor_share_pct = CASE
              WHEN v_total_gross > 0
              THEN ROUND((v_alloc.total_gross / v_total_gross * 100)::numeric, 6)
              ELSE 0
            END,
            fund_yield_pct = CASE
              WHEN v_opening_aum > 0
              THEN ROUND((v_total_month_yield / v_opening_aum * 100)::numeric, 6)
              ELSE 0
            END,
            gross_yield_amount = v_alloc.total_gross,
            fee_pct = CASE WHEN v_alloc.investor_id = v_fees_account_id THEN 0
                           ELSE get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end) END,
            fee_amount = v_alloc.total_fee,
            ib_amount = v_alloc.total_ib,
            net_yield_amount = v_alloc.total_net,
            period_start = v_period_start,
            period_end = v_period_end,
            days_in_period = v_period_end - v_period_start + 1
          WHERE trigger_transaction_id = v_yield_tx_id AND is_voided = false;
        END IF;
      END IF;

      IF v_alloc.total_gross != 0 THEN
        INSERT INTO yield_allocations (
          distribution_id, investor_id, fund_id, gross_amount, net_amount,
          fee_amount, ib_amount, adb_share, fee_pct, ib_pct,
          transaction_id, created_at
        ) VALUES (
          v_distribution_id, v_alloc.investor_id, p_fund_id,
          v_alloc.total_gross, v_alloc.total_net,
          v_alloc.total_fee, v_alloc.total_ib,
          0,
          CASE WHEN v_alloc.investor_id = v_fees_account_id THEN 0
               ELSE get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end) END,
          v_alloc.ib_rate,
          v_yield_tx_id, NOW()
        );

        v_allocation_count := v_allocation_count + 1;
      END IF;

      IF v_alloc.total_fee > 0 AND v_alloc.investor_id != v_fees_account_id THEN
        INSERT INTO fee_allocations (
          distribution_id, fund_id, investor_id, fees_account_id,
          period_start, period_end, purpose, base_net_income, fee_percentage,
          fee_amount, credit_transaction_id, created_by
        ) VALUES (
          v_distribution_id, p_fund_id, v_alloc.investor_id, v_fees_account_id,
          v_period_start, v_period_end, p_purpose, v_alloc.total_gross,
          get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end),
          v_alloc.total_fee, NULL, v_admin
        );

        INSERT INTO platform_fee_ledger (
          fund_id, yield_distribution_id, investor_id, investor_name,
          gross_yield_amount, fee_percentage, fee_amount, effective_date,
          asset, transaction_id, created_by
        ) VALUES (
          p_fund_id, v_distribution_id, v_alloc.investor_id,
          NULLIF(v_alloc.investor_name, ''),
          v_alloc.total_gross,
          get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end),
          v_alloc.total_fee, v_period_end, v_fund.asset, NULL, v_admin
        );
      END IF;

      IF v_alloc.total_ib > 0 AND v_alloc.ib_parent_id IS NOT NULL THEN
        v_ib_tx_result := apply_transaction_with_crystallization(
          p_investor_id := v_alloc.ib_parent_id,
          p_fund_id := p_fund_id,
          p_tx_type := 'IB_CREDIT',
          p_amount := v_alloc.total_ib,
          p_tx_date := v_tx_date,
          p_reference_id := 'ib_credit_v5_' || v_distribution_id::text || '_' || v_alloc.investor_id::text,
          p_notes := 'IB commission from V5 yield for ' || to_char(v_period_start, 'Mon YYYY'),
          p_admin_id := v_admin,
          p_purpose := p_purpose,
          p_distribution_id := v_distribution_id
        );
        v_ib_tx_id := NULLIF(v_ib_tx_result->>'tx_id', '')::uuid;

        UPDATE yield_allocations SET ib_transaction_id = v_ib_tx_id
        WHERE distribution_id = v_distribution_id
          AND investor_id = v_alloc.investor_id
          AND ib_transaction_id IS NULL;

        INSERT INTO ib_commission_ledger (
          fund_id, yield_distribution_id, source_investor_id, source_investor_name,
          ib_id, ib_name, gross_yield_amount, ib_percentage, ib_commission_amount,
          effective_date, asset, transaction_id, created_by
        )
        SELECT p_fund_id, v_distribution_id, v_alloc.investor_id,
               NULLIF(v_alloc.investor_name, ''),
               v_alloc.ib_parent_id,
               trim(COALESCE(ib.first_name,'') || ' ' || COALESCE(ib.last_name,'')),
               v_alloc.total_gross, v_alloc.ib_rate, v_alloc.total_ib,
               v_period_end, v_fund.asset, v_ib_tx_id, v_admin
        FROM profiles ib WHERE ib.id = v_alloc.ib_parent_id;
      END IF;

    ELSE
      -- TRANSACTION (checkpoint): yield_allocations + investor_yield_events only
      IF v_alloc.total_gross != 0 THEN
        INSERT INTO yield_allocations (
          distribution_id, investor_id, fund_id, gross_amount, net_amount,
          fee_amount, ib_amount, adb_share, fee_pct, ib_pct,
          transaction_id, created_at
        ) VALUES (
          v_distribution_id, v_alloc.investor_id, p_fund_id,
          v_alloc.total_gross, v_alloc.total_net,
          v_alloc.total_fee, v_alloc.total_ib,
          0,
          CASE WHEN v_alloc.investor_id = v_fees_account_id THEN 0
               ELSE get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end) END,
          v_alloc.ib_rate,
          NULL, NOW()
        );

        v_allocation_count := v_allocation_count + 1;
      END IF;

      IF v_alloc.total_net != 0 THEN
        INSERT INTO investor_yield_events (
          investor_id, fund_id,
          trigger_type, event_date,
          fund_aum_before, fund_aum_after,
          gross_yield_amount, fee_pct, fee_amount, ib_amount, net_yield_amount,
          investor_balance, investor_share_pct, fund_yield_pct,
          period_start, period_end, days_in_period,
          visibility_scope, reference_id, created_by, is_voided
        ) VALUES (
          v_alloc.investor_id, p_fund_id,
          'month_end', v_period_end,
          v_opening_aum, p_recorded_aum,
          v_alloc.total_gross,
          CASE WHEN v_alloc.investor_id = v_fees_account_id THEN 0
               ELSE get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end) END,
          v_alloc.total_fee, v_alloc.total_ib, v_alloc.total_net,
          (SELECT COALESCE(current_value, 0) FROM investor_positions
           WHERE investor_id = v_alloc.investor_id AND fund_id = p_fund_id),
          CASE WHEN v_total_gross > 0
               THEN ROUND((v_alloc.total_gross / v_total_gross * 100)::numeric, 6)
               ELSE 0 END,
          CASE WHEN v_opening_aum > 0
               THEN ROUND((v_total_month_yield / v_opening_aum * 100)::numeric, 6)
               ELSE 0 END,
          v_period_start, v_period_end, v_period_end - v_period_start + 1,
          'admin_only',
          'yield_v5_checkpoint_' || v_distribution_id::text || '_' || v_alloc.investor_id::text,
          v_admin,
          false
        );
      END IF;

    END IF;
  END LOOP;

  -- ============================================================
  -- FEE_CREDIT to fees_account (REPORTING only)
  -- ============================================================
  IF p_purpose = 'reporting'::aum_purpose AND v_total_fees > 0 THEN
    v_fee_tx_result := apply_transaction_with_crystallization(
      p_investor_id := v_fees_account_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'FEE_CREDIT',
      p_amount := v_total_fees,
      p_tx_date := v_tx_date,
      p_reference_id := 'fee_credit_v5_' || v_distribution_id::text,
      p_notes := 'Platform fees from V5 yield for ' || to_char(v_period_start, 'Mon YYYY'),
      p_admin_id := v_admin,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    );
    v_fee_tx_id := NULLIF(v_fee_tx_result->>'tx_id', '')::uuid;

    UPDATE platform_fee_ledger SET transaction_id = v_fee_tx_id
    WHERE yield_distribution_id = v_distribution_id AND transaction_id IS NULL;
    UPDATE yield_allocations SET fee_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id AND fee_amount > 0 AND fee_transaction_id IS NULL;
    UPDATE fee_allocations SET credit_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id AND credit_transaction_id IS NULL;
  END IF;

  IF p_purpose = 'reporting'::aum_purpose THEN
    UPDATE ib_allocations
    SET payout_status = 'paid', paid_at = NOW(), paid_by = v_admin
    WHERE distribution_id = v_distribution_id
      AND is_voided = false AND payout_status = 'pending';
  END IF;

  -- TRANSACTION PURPOSE: Update crystallization date directly
  IF p_purpose = 'transaction'::aum_purpose THEN
    UPDATE investor_positions SET
      last_yield_crystallization_date = v_period_end
    WHERE fund_id = p_fund_id
      AND is_active = true
      AND investor_id IS NOT NULL;
  END IF;

  -- ============================================================
  -- Update distribution header with final totals
  -- ============================================================
  UPDATE yield_distributions SET
    gross_yield = v_total_gross,
    gross_yield_amount = v_total_gross,
    total_net_amount = v_total_net,
    total_fee_amount = v_total_fees,
    total_ib_amount = v_total_ib,
    net_yield = v_total_net,
    total_fees = v_total_fees,
    total_ib = v_total_ib,
    dust_amount = COALESCE(v_residual, 0),
    allocation_count = v_allocation_count,
    summary_json = jsonb_build_object(
      'version', 'v5_month_level',
      'opening_aum', v_opening_aum,
      'month_flows', v_total_month_flows,
      'month_yield', v_total_month_yield,
      'is_negative_yield', v_is_negative_yield,
      'crystals_consolidated', v_crystals_consolidated,
      'crystal_markers', v_segments_meta,
      'inception_fallback', (v_opening_balance_sum = 0),
      'checkpoint_only', (p_purpose = 'transaction'::aum_purpose)
    )
  WHERE id = v_distribution_id;

  -- ============================================================
  -- Record AUM
  -- ============================================================
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
  VALUES (p_fund_id, v_period_end, p_recorded_aum, p_purpose, 'yield_distribution_v5', v_admin, v_is_month_end)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, source = 'yield_distribution_v5',
    is_month_end = EXCLUDED.is_month_end, updated_at = now();

  -- ============================================================
  -- Audit log
  -- ============================================================
  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (
    v_admin, 'YIELD_DISTRIBUTION_V5_APPLIED', 'yield_distributions', v_distribution_id::text,
    jsonb_build_object('opening_aum', v_opening_aum),
    jsonb_build_object(
      'recorded_aum', p_recorded_aum, 'gross_yield', v_total_gross,
      'net_yield', v_total_net, 'total_fees', v_total_fees,
      'total_ib', v_total_ib, 'allocation_count', v_allocation_count
    ),
    jsonb_build_object(
      'fund_id', p_fund_id, 'fund_code', v_fund.code,
      'period_start', v_period_start, 'period_end', v_period_end,
      'purpose', p_purpose::text, 'calculation_method', 'segmented_v5_month_level',
      'month_yield', v_total_month_yield, 'month_flows', v_total_month_flows,
      'is_negative_yield', v_is_negative_yield,
      'crystals_consolidated', v_crystals_consolidated,
      'conservation_check', v_total_gross = (v_total_net + v_total_fees + v_total_ib),
      'dust_residual', v_residual, 'dust_receiver', 'fees_account',
      'distribution_date', v_tx_date,
      'inception_fallback', (v_opening_balance_sum = 0),
      'checkpoint_only', (p_purpose = 'transaction'::aum_purpose)
    )
  );

  -- Final position check
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_final_positions_sum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'opening_aum', v_opening_aum,
    'recorded_aum', p_recorded_aum,
    'month_yield', v_total_month_yield,
    'month_flows', v_total_month_flows,
    'is_negative_yield', v_is_negative_yield,
    'gross_yield', v_total_gross,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'dust_amount', COALESCE(v_residual, 0),
    'allocation_count', v_allocation_count,
    'segment_count', v_seg_count,
    'crystals_consolidated', v_crystals_consolidated,
    'conservation_check', v_total_gross = (v_total_net + v_total_fees + v_total_ib),
    'position_sum', v_final_positions_sum,
    'position_aum_match', ABS(v_final_positions_sum - p_recorded_aum) < 0.00000001,
    'ib_auto_paid', p_purpose = 'reporting'::aum_purpose,
    'checkpoint_only', p_purpose = 'transaction'::aum_purpose,
    'distribution_date', v_tx_date,
    'fund_asset', v_fund.asset,
    'investor_count', v_allocation_count,
    'days_in_period', (v_period_end - v_period_start + 1),
    'features', ARRAY[
      'month_level_yield', 'opening_balance_allocation', 'negative_yield_support',
      'per_investor_fees', 'ib_from_gross', 'fees_account_yield',
      'crystal_consolidation', 'aum_only_input',
      'inception_date_period_start', 'visibility_scope_control',
      'yield_event_enrichment', 'distribution_date_override',
      'dust_to_fees_account', 'inception_month_fallback',
      'transaction_checkpoint_only', 'fees_account_in_preview'
    ]
  );
END;
$$;


-- ============================================================
-- STEP 4: Rewrite void_transaction
--   Removed: fund_aum_events cascade void block
--   Kept: fund_daily_aum void + recalculate
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_tx RECORD;
  v_daily_aum_voided int := 0;
  v_fee_allocations_voided int := 0;
  v_ib_ledger_voided int := 0;
  v_platform_fee_voided int := 0;
  v_yield_events_voided int := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('void_tx'), hashtext(p_transaction_id::text));

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  IF NOT is_admin() THEN
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

  UPDATE public.transactions_v2
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id, void_reason = p_reason
  WHERE id = p_transaction_id;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  UPDATE public.fund_daily_aum
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id, void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE fund_id = v_tx.fund_id AND is_voided = false AND aum_date = v_tx.tx_date
    AND source IN ('tx_sync', 'tx_position_sync', 'auto_heal_sync', 'trigger:position_sync');
  GET DIAGNOSTICS v_daily_aum_voided = ROW_COUNT;

  PERFORM recalculate_fund_aum_for_date(v_tx.fund_id, v_tx.tx_date, 'transaction'::aum_purpose, p_admin_id);

  UPDATE public.fee_allocations
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id
  WHERE (credit_transaction_id = p_transaction_id OR debit_transaction_id = p_transaction_id)
    AND is_voided = false;
  GET DIAGNOSTICS v_fee_allocations_voided = ROW_COUNT;

  UPDATE public.ib_commission_ledger
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id, void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE transaction_id = p_transaction_id AND is_voided = false;
  GET DIAGNOSTICS v_ib_ledger_voided = ROW_COUNT;

  UPDATE public.platform_fee_ledger
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id, void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE transaction_id = p_transaction_id AND is_voided = false;
  GET DIAGNOSTICS v_platform_fee_voided = ROW_COUNT;

  UPDATE public.investor_yield_events
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id
  WHERE (
      trigger_transaction_id = p_transaction_id
      OR reference_id = v_tx.reference_id
    )
    AND is_voided = false;
  GET DIAGNOSTICS v_yield_events_voided = ROW_COUNT;

  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES ('VOID', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('is_voided', false, 'type', v_tx.type, 'amount', v_tx.amount),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason, 'voided_at', now(),
      'daily_aum_voided', v_daily_aum_voided,
      'fee_allocations_voided', v_fee_allocations_voided, 'ib_ledger_voided', v_ib_ledger_voided,
      'platform_fee_voided', v_platform_fee_voided, 'yield_events_voided', v_yield_events_voided),
    jsonb_build_object('source', 'void_transaction_rpc', 'cascade_v5', true,
      'aum_recalculated', true)
  );

  RETURN jsonb_build_object(
    'success', true, 'transaction_id', p_transaction_id, 'voided_at', now(),
    'daily_aum_voided', v_daily_aum_voided,
    'fee_allocations_voided', v_fee_allocations_voided, 'ib_ledger_voided', v_ib_ledger_voided,
    'platform_fee_voided', v_platform_fee_voided, 'yield_events_voided', v_yield_events_voided,
    'message', 'Transaction voided with full cascade and AUM recalculation'
  );

END;
$$;


-- ============================================================
-- STEP 5: Rewrite void_yield_distribution
--   Removed: fund_aum_events cascade void in crystal loop
-- ============================================================

CREATE OR REPLACE FUNCTION void_yield_distribution(
  p_distribution_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Administrative void',
  p_void_crystals boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dist RECORD;
  v_voided_txs int := 0;
  v_voided_allocs int := 0;
  v_voided_crystals int := 0;
  v_crystal RECORD;
  v_tx RECORD;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  IF v_dist IS NULL THEN
    RAISE EXCEPTION 'Distribution not found: %', p_distribution_id;
  END IF;
  IF v_dist.is_voided THEN
    RETURN json_build_object('success', true, 'message', 'Already voided');
  END IF;

  IF p_void_crystals THEN
    FOR v_crystal IN
      SELECT id, effective_date FROM yield_distributions
      WHERE consolidated_into_id = p_distribution_id AND NOT is_voided
    LOOP
      UPDATE investor_yield_events SET is_voided = true
      WHERE reference_id LIKE 'YLD:' || v_dist.fund_id || ':' || v_crystal.effective_date::text || ':%'
        AND is_voided = false;

      UPDATE yield_distributions SET
        is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        void_reason = 'Cascade void from distribution ' || p_distribution_id::text,
        consolidated_into_id = NULL
      WHERE id = v_crystal.id;

      v_voided_crystals := v_voided_crystals + 1;
    END LOOP;
  ELSE
    UPDATE yield_distributions
    SET consolidated_into_id = NULL
    WHERE consolidated_into_id = p_distribution_id AND NOT is_voided;
  END IF;

  FOR v_tx IN
    SELECT id, investor_id, amount FROM transactions_v2
    WHERE (
      reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'yield_v5_' || p_distribution_id::text || '_%'
    )
    AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  FOR v_tx IN
    SELECT id FROM transactions_v2
    WHERE (
      reference_id = 'fee_credit_' || p_distribution_id::text
      OR reference_id = 'fee_credit_v5_' || p_distribution_id::text
    )
    AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  FOR v_tx IN
    SELECT id FROM transactions_v2
    WHERE (
      reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_credit_v5_' || p_distribution_id::text || '_%'
    )
    AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  UPDATE platform_fee_ledger SET is_voided = true
  WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE ib_commission_ledger SET is_voided = true
  WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE fee_allocations SET is_voided = true
  WHERE distribution_id = p_distribution_id AND NOT is_voided;
  GET DIAGNOSTICS v_voided_allocs = ROW_COUNT;

  UPDATE yield_allocations SET is_voided = true
  WHERE distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE ib_allocations SET is_voided = true
  WHERE distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE yield_distributions SET
    is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
    void_reason = p_reason
  WHERE id = p_distribution_id;

  UPDATE investor_yield_events SET is_voided = true
  WHERE (
    trigger_transaction_id IN (
      SELECT id FROM transactions_v2
      WHERE distribution_id = p_distribution_id AND is_voided = true
    )
    OR distribution_id = p_distribution_id
  ) AND NOT is_voided;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (
    p_admin_id, 'YIELD_DISTRIBUTION_VOIDED', 'yield_distributions', p_distribution_id::text,
    jsonb_build_object('status', v_dist.status, 'gross_yield', v_dist.gross_yield),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object(
      'voided_txs', v_voided_txs,
      'voided_fee_allocations', v_voided_allocs,
      'voided_crystals', v_voided_crystals,
      'void_crystals_requested', p_void_crystals,
      'fund_id', v_dist.fund_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'distribution_id', p_distribution_id,
    'voided_transactions', v_voided_txs,
    'voided_fee_allocations', v_voided_allocs,
    'voided_crystals', v_voided_crystals
  );
END;
$$;


-- ============================================================
-- STEP 6: Rewrite reset_all_data_keep_profiles
--   Removed: DELETE FROM fund_aum_events
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."reset_all_data_keep_profiles"("p_admin_id" "uuid", "p_confirmation_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_batch_id UUID := gen_random_uuid();
  v_counts JSONB := '{}'::jsonb;
  v_count INTEGER;
BEGIN
  IF p_confirmation_code != 'FULL RESET' THEN
    RAISE EXCEPTION 'Invalid confirmation code. Expected: FULL RESET';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Phase 1: Leaf tables with FK refs to yield_distributions and transactions_v2
  DELETE FROM withdrawal_requests;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('withdrawal_requests', v_count);

  DELETE FROM investor_yield_events;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_yield_events', v_count);

  DELETE FROM yield_allocations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('yield_allocations', v_count);

  DELETE FROM ib_commission_ledger;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('ib_commission_ledger', v_count);

  DELETE FROM platform_fee_ledger;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('platform_fee_ledger', v_count);

  DELETE FROM ib_allocations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('ib_allocations', v_count);

  DELETE FROM fee_allocations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fee_allocations', v_count);

  -- Phase 2: yield_distributions
  DELETE FROM yield_distributions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('yield_distributions', v_count);

  -- Phase 3: Statement/report tables
  DELETE FROM statement_email_delivery;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('statement_email_delivery', v_count);

  DELETE FROM generated_statements;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('generated_statements', v_count);

  DELETE FROM statements;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('statements', v_count);

  DELETE FROM statement_periods;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('statement_periods', v_count);

  -- Phase 4: Performance/AUM tables
  DELETE FROM investor_fund_performance;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_fund_performance', v_count);

  DELETE FROM fund_daily_aum;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fund_daily_aum', v_count);

  -- Phase 5: Transactions
  DELETE FROM transactions_v2;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('transactions_v2', v_count);

  -- Phase 6: Positions
  DELETE FROM investor_positions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_positions', v_count);

  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES ('RESET_ALL_DATA', 'system', v_batch_id::text, p_admin_id, v_counts);

  RETURN jsonb_build_object(
    'success', true, 'batch_id', v_batch_id, 'deleted_counts', v_counts,
    'message', 'Full data reset completed. All transactional data cleared. Investor profiles preserved.');
END;
$$;


-- ============================================================
-- STEP 7: DROP helper functions (only existed for fund_aum_events)
-- ============================================================

DROP FUNCTION IF EXISTS public.ensure_preflow_aum(uuid, date, numeric, aum_purpose, uuid);
DROP FUNCTION IF EXISTS public.get_existing_preflow_aum(uuid, date, aum_purpose);
DROP FUNCTION IF EXISTS public.cleanup_duplicate_preflow_aum();


-- ============================================================
-- STEP 8: DROP triggers, trigger functions, RLS, and table
-- ============================================================

-- Triggers (must drop before table/functions)
DROP TRIGGER IF EXISTS trg_enforce_canonical_aum_event ON fund_aum_events;
DROP TRIGGER IF EXISTS trg_fund_aum_events_sync_voided_by ON fund_aum_events;
DROP TRIGGER IF EXISTS trg_validate_manual_aum_event ON fund_aum_events;

-- RLS policies
DROP POLICY IF EXISTS "Admins can insert fund AUM events" ON fund_aum_events;
DROP POLICY IF EXISTS "Admins can update fund AUM events" ON fund_aum_events;
DROP POLICY IF EXISTS "Admins can view all fund AUM events" ON fund_aum_events;

-- Table (CASCADE drops PK, FK, indexes automatically)
DROP TABLE IF EXISTS fund_aum_events CASCADE;

-- Trigger functions (drop after table since triggers are already gone)
DROP FUNCTION IF EXISTS public.enforce_canonical_aum_event_mutation();
DROP FUNCTION IF EXISTS public.sync_fund_aum_events_voided_by_profile();
DROP FUNCTION IF EXISTS public.validate_manual_aum_event();
