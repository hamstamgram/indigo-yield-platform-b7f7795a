-- Fix: Add mandatory audit_log entry to crystallize_yield_before_flow
--
-- Core bug: crystallize_yield_before_flow creates yield_distributions records
-- but never writes to audit_log. This violates the platform rule that every
-- financial mutation MUST create an audit_log entry, and causes the
-- audit_log_for_distributions invariant check (check 13) to report violations
-- for every crystallization distribution.
--
-- Fix: Insert into audit_log just before the RETURN statement, after all
-- mutations are complete (positions updated, transactions created, etc.).
-- The action name 'CRYSTALLIZE_YIELD_BEFORE_FLOW' contains 'YIELD' so it
-- satisfies the check 13 filter: al.action ILIKE '%yield%'.

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
  v_existing_preflow record;
  v_opening_aum numeric(28,10);
  v_yield_amount numeric(28,10);
  v_yield_pct numeric(18,10);
  v_event_date date;
  v_period_start date;
  v_days_in_period int;
  v_snapshot_id uuid;
  v_distribution_id uuid;
  v_investors_processed int := 0;
  v_reused_preflow boolean := false;
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

  -- Get fund info for asset column
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Get fees account
  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;

  -- AUM validation
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

  -- Idempotency: check for existing preflow AUM event
  SELECT * INTO v_existing_preflow
  FROM get_existing_preflow_aum(p_fund_id, v_event_date, p_purpose);

  IF v_existing_preflow.aum_event_id IS NOT NULL THEN
    v_reused_preflow := true;
    v_snapshot_id := v_existing_preflow.aum_event_id;

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
      SELECT id, coalesce(post_flow_aum, closing_aum) AS effective_aum, event_ts, event_date
      INTO v_last_checkpoint
      FROM fund_aum_events
      WHERE fund_id = p_fund_id AND is_voided = false AND purpose = p_purpose
        AND event_ts < v_existing_preflow.event_ts
      ORDER BY event_ts DESC LIMIT 1;

      IF v_last_checkpoint.id IS NULL THEN
        v_opening_aum := 0; v_period_start := v_event_date;
      ELSE
        v_opening_aum := v_last_checkpoint.effective_aum; v_period_start := v_last_checkpoint.event_date;
      END IF;
    END IF;

    v_yield_amount := v_existing_preflow.closing_aum - v_opening_aum;
    IF v_opening_aum > 0 THEN
      v_yield_pct := round((v_yield_amount / v_opening_aum) * 100, 10);
    ELSE
      v_yield_pct := 0;
    END IF;

    RETURN jsonb_build_object(
      'success', true, 'snapshot_id', v_snapshot_id, 'fund_id', p_fund_id,
      'trigger_date', v_event_date, 'trigger_type', p_trigger_type,
      'period_start', v_period_start, 'opening_aum', v_opening_aum,
      'closing_aum', v_existing_preflow.closing_aum, 'fund_yield_pct', v_yield_pct,
      'gross_yield', v_yield_amount, 'reused_preflow', true,
      'calculation_method', 'flat_proportional', 'message', 'Reused existing preflow AUM',
      'validation', v_validation_result
    );
  END IF;

  -- ============================================================
  -- OPENING AUM LOOKUP (from fund_daily_aum, fallback to fund_aum_events)
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
    SELECT id, coalesce(post_flow_aum, closing_aum) AS effective_aum, event_ts, event_date
    INTO v_last_checkpoint
    FROM fund_aum_events
    WHERE fund_id = p_fund_id AND is_voided = false AND purpose = p_purpose AND event_ts < p_event_ts
    ORDER BY event_ts DESC LIMIT 1;

    IF v_last_checkpoint.id IS NULL THEN
      SELECT coalesce(sum(current_value), 0) INTO v_opening_aum
      FROM investor_positions
      WHERE fund_id = p_fund_id AND is_active = true;
      v_period_start := v_event_date;
    ELSE
      v_opening_aum := v_last_checkpoint.effective_aum;
      v_period_start := v_last_checkpoint.event_date;
    END IF;
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

  -- ============================================================
  -- Create fund_aum_events record
  -- ============================================================
  INSERT INTO fund_aum_events (
    fund_id, event_date, event_ts, trigger_type, trigger_reference,
    opening_aum, closing_aum, purpose, created_by
  ) VALUES (
    p_fund_id, v_event_date, p_event_ts, p_trigger_type, p_trigger_reference,
    v_opening_aum, p_closing_aum, p_purpose, p_admin_id
  ) RETURNING id INTO v_snapshot_id;

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
      -- Share = current_value / total_positions (flat, not ADB)
      v_investor_share := v_investor.current_value / v_total_positions;
      v_investor_gross := ROUND((v_yield_amount * v_investor_share)::numeric, v_scale);

      IF v_is_negative_yield THEN
        -- Negative yield: proportional loss, no fees, no IB
        v_investor_fee := 0;
        v_investor_ib := 0;
        v_investor_net := v_investor_gross;
        v_fee_pct := 0;
        v_ib_rate := 0;
      ELSE
        -- Positive yield: compute fees and IB from GROSS
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

      -- Track header totals (fees_account tracked separately)
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

        -- Enrich investor_yield_events (created by sync trigger from YIELD tx)
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

        -- Update yield_allocation with IB tx ref
        UPDATE yield_allocations SET ib_transaction_id = v_ib_tx_id
        WHERE distribution_id = v_distribution_id
          AND investor_id = v_investor.investor_id
          AND ib_transaction_id IS NULL;

        -- ib_commission_ledger (trigger creates ib_allocations)
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

    -- FEE_CREDIT to fees_account (total fees from investors + dust)
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

      -- Link fee tx to records
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
  -- Prevents same-date deposit from re-triggering crystallization
  -- ============================================================
  UPDATE investor_positions SET
    last_yield_crystallization_date = v_event_date
  WHERE fund_id = p_fund_id
    AND is_active = true
    AND investor_id IS NOT NULL;

  -- ============================================================
  -- AUDIT LOG (mandatory for every financial mutation)
  -- action contains 'YIELD' to satisfy audit_log_for_distributions check
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
    'reused_preflow', v_reused_preflow,
    'is_negative_yield', v_is_negative_yield,
    'calculation_method', 'flat_proportional',
    'validation', v_validation_result
  );
END;
$function$;
