-- =============================================================
-- Fix yield distribution: Restore baseline apply_segmented_yield_distribution_v5
-- 2026-04-17 | CRITICAL: Tier 1 migration (20260416120000) replaced
-- this function with a broken version referencing non-existent
-- schema elements (investor_ib_schedule, fee_percentage, account_type
-- on investor_positions, status on investor_fee_schedule). It also
-- skipped fee_allocations, ib_allocations, ib_commission_ledger,
-- dust/residual handling, and used direct INSERTs instead of
-- apply_investor_transaction.
--
-- This migration restores the proven baseline version (from the
-- 20260415000000 squash) with the ONLY addition being the
-- canonical_rpc + aum_synced config flags and is_admin() gate
-- that Tier 1 correctly added.
--
-- The baseline version correctly uses:
-- - get_investor_fee_pct / get_investor_ib_pct (now gated but
--   can_access_investor bypasses with canonical_rpc flag — see
--   migration 20260417000000)
-- - apply_investor_transaction for all tx types (YIELD, FEE_CREDIT,
--   IB_CREDIT, DUST)
-- - temp table _vflat_alloc for proportional allocation
-- - fee_allocations, ib_allocations, ib_commission_ledger inserts
-- - Correct response field names (gross, net, opening_aum, etc.)
-- =============================================================

CREATE OR REPLACE FUNCTION "public"."apply_segmented_yield_distribution_v5"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_admin_id" "uuid" DEFAULT NULL::"uuid", "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose", "p_distribution_date" "date" DEFAULT NULL::"date", "p_opening_aum" numeric DEFAULT NULL::numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_period_start date;
  v_period_end date;
  v_tx_date date;
  v_is_month_end boolean;
  v_lock_key bigint;
  v_distribution_id uuid;
  v_fees_account_id uuid;
  v_opening_aum numeric := 0;
  v_pre_day_aum numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_fees_account_gross numeric := 0;
  v_fees_account_net numeric := 0;
  v_allocation_count int := 0;
  v_residual numeric := 0;
  v_inv RECORD;
  v_alloc RECORD;
  v_share numeric;
  v_gross numeric;
  v_fee numeric;
  v_ib numeric;
  v_net numeric;
  v_fee_pct numeric;
  v_ib_rate numeric;
  v_tx_result json;
  v_yield_tx_id uuid;
  v_fee_tx_result json;
  v_fee_tx_id uuid;
  v_ib_tx_result json;
  v_ib_tx_id uuid;
  v_final_positions_sum numeric;
  v_updated_rows int;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.aum_synced', 'true', true);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  IF p_purpose = 'reporting'::aum_purpose THEN
    v_period_start := GREATEST(
      date_trunc('month', p_period_end)::date,
      COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
    );
    v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;
  ELSE
    v_period_start := p_period_end;
    v_period_end := p_period_end;
  END IF;

  v_is_month_end := (p_period_end = (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date);
  v_tx_date := COALESCE(p_distribution_date, v_period_end);

  v_lock_key := ('x' || substr(md5(p_fund_id::text || v_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF p_purpose = 'reporting'::aum_purpose THEN
    IF EXISTS (
      SELECT 1 FROM yield_distributions
      WHERE fund_id = p_fund_id AND period_end = v_period_end
        AND purpose = 'reporting' AND is_voided = false
        AND consolidated_into_id IS NULL
        AND COALESCE(distribution_type, '') NOT IN ('deposit', 'withdrawal', 'transaction')
    ) THEN
      RAISE EXCEPTION 'Reporting yield already exists for fund % period ending %. Void before reapplying.',
        p_fund_id, v_period_end;
    END IF;
  END IF;

  v_fees_account_id := get_fees_account_for_fund(p_fund_id);
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'Fees account not configured';
  END IF;

  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  INSERT INTO yield_distributions (
    fund_id, effective_date, yield_date, period_start, period_end,
    recorded_aum, previous_aum, gross_yield, gross_yield_amount,
    total_net_amount, total_fee_amount, total_ib_amount,
    net_yield, total_fees, total_ib, dust_amount,
    status, created_by, calculation_method, purpose, is_month_end, allocation_count,
    distribution_type
  ) VALUES (
    p_fund_id, v_period_end, v_period_end, v_period_start, v_period_end,
    p_recorded_aum, v_opening_aum, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    'applied'::yield_distribution_status, v_admin,
    'flat_position_proportional_v7', p_purpose, v_is_month_end, 0,
    CASE WHEN p_purpose = 'reporting' THEN 'original' ELSE p_purpose::text END
  ) RETURNING id INTO v_distribution_id;

  DROP TABLE IF EXISTS _vflat_alloc;
  CREATE TEMP TABLE _vflat_alloc (
    investor_id uuid PRIMARY KEY,
    investor_name text,
    investor_email text,
    account_type text NOT NULL DEFAULT 'investor',
    ib_parent_id uuid,
    current_value numeric NOT NULL DEFAULT 0,
    pre_day_value numeric NOT NULL DEFAULT 0,
    gross numeric NOT NULL DEFAULT 0,
    fee_pct numeric NOT NULL DEFAULT 0,
    fee numeric NOT NULL DEFAULT 0,
    ib_rate numeric NOT NULL DEFAULT 0,
    ib numeric NOT NULL DEFAULT 0,
    net numeric NOT NULL DEFAULT 0
  ) ON COMMIT DROP;

  INSERT INTO _vflat_alloc (investor_id, investor_name, investor_email, account_type, ib_parent_id, current_value, pre_day_value)
  SELECT ip.investor_id,
         COALESCE(p.first_name || ' ' || p.last_name, 'Unknown'),
         COALESCE(p.email, ''),
         p.account_type::text,
         p.ib_parent_id,
         ip.current_value,
         ip.current_value - COALESCE((
           SELECT SUM(t.amount)
           FROM transactions_v2 t
           WHERE t.investor_id = ip.investor_id
             AND t.fund_id = p_fund_id
             AND t.tx_date = v_tx_date
             AND t.type IN ('DEPOSIT', 'WITHDRAWAL')
             AND (t.is_voided IS NULL OR t.is_voided = false)
         ), 0)
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id
    AND (
      (ip.is_active = true AND ip.current_value <> 0)
      OR EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id AND t.fund_id = p_fund_id
          AND t.tx_date = v_tx_date AND t.type = 'WITHDRAWAL'
          AND (t.is_voided IS NULL OR t.is_voided = false)
      )
    );

  SELECT COALESCE(SUM(pre_day_value), 0) INTO v_pre_day_aum FROM _vflat_alloc
  WHERE pre_day_value > 0;

  IF p_opening_aum IS NOT NULL AND p_opening_aum > 0 THEN
    v_total_month_yield := p_recorded_aum - p_opening_aum;
  ELSE
    v_total_month_yield := p_recorded_aum - v_opening_aum;
  END IF;
  v_is_negative_yield := (v_total_month_yield < 0);

  IF v_pre_day_aum > 0 THEN
    FOR v_alloc IN SELECT * FROM _vflat_alloc LOOP
      IF v_alloc.pre_day_value <= 0 THEN
        v_share := 0;
        v_gross := 0;
      ELSE
        v_share := v_alloc.pre_day_value / v_pre_day_aum;
        v_gross := v_total_month_yield * v_share;
      END IF;

      IF v_alloc.account_type = 'fees_account' THEN
        v_fee_pct := 0;
        v_ib_rate := 0;
      ELSE
        v_fee_pct := COALESCE(get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end), 0);
        IF v_alloc.ib_parent_id IS NOT NULL THEN
          v_ib_rate := COALESCE(get_investor_ib_pct(v_alloc.investor_id, p_fund_id, v_period_end), 0);
        ELSE
          v_ib_rate := 0;
        END IF;
      END IF;

      IF v_is_negative_yield OR v_gross <= 0 THEN
        v_fee := 0;
        v_ib := 0;
        v_net := v_gross;
      ELSE
        v_fee := v_gross * v_fee_pct / 100;
        v_ib := v_gross * v_ib_rate / 100;
        v_net := v_gross - v_fee - v_ib;
      END IF;

      UPDATE _vflat_alloc SET
        gross = v_gross,
        fee_pct = v_fee_pct,
        fee = v_fee,
        ib_rate = v_ib_rate,
        ib = v_ib,
        net = v_net
      WHERE investor_id = v_alloc.investor_id;
    END LOOP;
  ELSIF v_opening_aum <> 0 THEN
    FOR v_alloc IN SELECT * FROM _vflat_alloc LOOP
      v_share := v_alloc.current_value / v_opening_aum;
      v_gross := v_total_month_yield * v_share;

      IF v_alloc.account_type = 'fees_account' THEN
        v_fee_pct := 0;
        v_ib_rate := 0;
      ELSE
        v_fee_pct := COALESCE(get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end), 0);
        IF v_alloc.ib_parent_id IS NOT NULL THEN
          v_ib_rate := COALESCE(get_investor_ib_pct(v_alloc.investor_id, p_fund_id, v_period_end), 0);
        ELSE
          v_ib_rate := 0;
        END IF;
      END IF;

      IF v_is_negative_yield THEN
        v_fee := 0;
        v_ib := 0;
        v_net := v_gross;
      ELSE
        v_fee := v_gross * v_fee_pct / 100;
        v_ib := v_gross * v_ib_rate / 100;
        v_net := v_gross - v_fee - v_ib;
      END IF;

      UPDATE _vflat_alloc SET
        gross = v_gross,
        fee_pct = v_fee_pct,
        fee = v_fee,
        ib_rate = v_ib_rate,
        ib = v_ib,
        net = v_net
      WHERE investor_id = v_alloc.investor_id;
    END LOOP;
  END IF;

  v_total_gross := (SELECT COALESCE(SUM(gross), 0) FROM _vflat_alloc);
  v_total_net := (SELECT COALESCE(SUM(net), 0) FROM _vflat_alloc);
  v_total_fees := (SELECT COALESCE(SUM(fee), 0) FROM _vflat_alloc);
  v_total_ib := (SELECT COALESCE(SUM(ib), 0) FROM _vflat_alloc);
  v_residual := v_total_month_yield - v_total_gross;

  SELECT COALESCE(gross, 0), COALESCE(net, 0)
  INTO v_fees_account_gross, v_fees_account_net
  FROM _vflat_alloc WHERE investor_id = v_fees_account_id;

  v_allocation_count := 0;

  FOR v_alloc IN SELECT * FROM _vflat_alloc LOOP
    IF v_alloc.gross = 0 AND v_alloc.fee = 0 AND v_alloc.ib = 0 AND v_alloc.net = 0 THEN
      CONTINUE;
    END IF;

    v_allocation_count := v_allocation_count + 1;

    SELECT apply_investor_transaction(
      p_fund_id := p_fund_id,
      p_investor_id := v_alloc.investor_id,
      p_tx_type := 'YIELD',
      p_amount := v_alloc.net,
      p_tx_date := v_tx_date,
      p_reference_id := 'yield-' || v_distribution_id || '-' || v_alloc.investor_id,
      p_admin_id := v_admin,
      p_notes := 'Yield distribution ' || v_distribution_id,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    ) INTO v_tx_result;

    v_yield_tx_id := (v_tx_result->>'transaction_id')::uuid;

    IF v_alloc.account_type = 'fees_account' THEN
      UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
      WHERE id = v_yield_tx_id;
    END IF;

    INSERT INTO yield_allocations (
      distribution_id, investor_id, fund_id,
      gross_amount, net_amount, fee_amount, ib_amount,
      fee_pct, ib_pct, position_value_at_calc,
      ownership_pct, transaction_id
    ) VALUES (
      v_distribution_id, v_alloc.investor_id, p_fund_id,
      v_alloc.gross, v_alloc.net, v_alloc.fee, v_alloc.ib,
      v_alloc.fee_pct, v_alloc.ib_rate, v_alloc.pre_day_value,
      CASE WHEN v_pre_day_aum > 0 THEN v_alloc.pre_day_value / v_pre_day_aum * 100
           WHEN v_opening_aum <> 0 THEN v_alloc.current_value / v_opening_aum * 100
           ELSE 0 END,
      v_yield_tx_id
    );

    IF v_alloc.fee > 0 AND v_alloc.account_type <> 'fees_account' THEN
      SELECT apply_investor_transaction(
        p_fund_id := p_fund_id,
        p_investor_id := v_fees_account_id,
        p_tx_type := 'FEE_CREDIT',
        p_amount := v_alloc.fee,
        p_tx_date := v_tx_date,
        p_reference_id := 'fee_credit-' || v_distribution_id || '-' || v_alloc.investor_id,
        p_admin_id := v_admin,
        p_notes := 'Fee from ' || v_alloc.investor_name,
        p_purpose := p_purpose,
        p_distribution_id := v_distribution_id
      ) INTO v_fee_tx_result;

      v_fee_tx_id := (v_fee_tx_result->>'transaction_id')::uuid;

      INSERT INTO fee_allocations (
        distribution_id, investor_id, fund_id, fees_account_id,
        fee_amount, fee_percentage, base_net_income,
        period_start, period_end, purpose, created_by,
        credit_transaction_id
      ) VALUES (
        v_distribution_id, v_alloc.investor_id, p_fund_id, v_fees_account_id,
        v_alloc.fee, v_alloc.fee_pct, v_alloc.gross,
        v_period_start, v_period_end, p_purpose, v_admin,
        v_fee_tx_id
      );
    END IF;

    IF v_alloc.ib > 0 AND v_alloc.ib_parent_id IS NOT NULL AND v_alloc.account_type <> 'fees_account' THEN
      SELECT apply_investor_transaction(
        p_fund_id := p_fund_id,
        p_investor_id := v_alloc.ib_parent_id,
        p_tx_type := 'IB_CREDIT',
        p_amount := v_alloc.ib,
        p_tx_date := v_tx_date,
        p_reference_id := 'ib_credit-' || v_distribution_id || '-' || v_alloc.investor_id,
        p_admin_id := v_admin,
        p_notes := 'IB commission from ' || v_alloc.investor_name,
        p_purpose := p_purpose,
        p_distribution_id := v_distribution_id
      ) INTO v_ib_tx_result;

      v_ib_tx_id := (v_ib_tx_result->>'transaction_id')::uuid;

      UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
      WHERE id = v_ib_tx_id;

      INSERT INTO ib_allocations (
        distribution_id, ib_investor_id, source_investor_id, fund_id,
        ib_fee_amount, ib_percentage, source_net_income,
        period_start, period_end, purpose, created_by, effective_date
      ) VALUES (
        v_distribution_id, v_alloc.ib_parent_id, v_alloc.investor_id, p_fund_id,
        v_alloc.ib, v_alloc.ib_rate, v_alloc.gross,
        v_period_start, v_period_end, p_purpose, v_admin, v_tx_date
      );

      INSERT INTO ib_commission_ledger (
        fund_id, yield_distribution_id, source_investor_id, ib_id,
        gross_yield_amount, ib_percentage, ib_commission_amount,
        effective_date, transaction_id, created_by, asset,
        source_investor_name, ib_name
      ) VALUES (
        p_fund_id, v_distribution_id, v_alloc.investor_id, v_alloc.ib_parent_id,
        v_alloc.gross, v_alloc.ib_rate, v_alloc.ib,
        v_tx_date, v_ib_tx_id, v_admin, v_fund.asset,
        v_alloc.investor_name,
        (SELECT COALESCE(first_name || ' ' || last_name, 'Unknown') FROM profiles WHERE id = v_alloc.ib_parent_id)
      );
    END IF;
  END LOOP;

  IF v_residual <> 0 AND v_fees_account_id IS NOT NULL THEN
    SELECT apply_investor_transaction(
      p_fund_id := p_fund_id,
      p_investor_id := v_fees_account_id,
      p_tx_type := 'DUST',
      p_amount := v_residual,
      p_tx_date := v_tx_date,
      p_reference_id := 'dust-' || v_distribution_id,
      p_admin_id := v_admin,
      p_notes := 'Dust from yield distribution ' || v_distribution_id,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    ) INTO v_tx_result;

    UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
    WHERE id = (v_tx_result->>'transaction_id')::uuid;
  END IF;

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
    opening_aum = v_pre_day_aum,
    summary_json = jsonb_build_object(
      'version', 'flat_v7',
      'opening_aum', v_opening_aum,
      'pre_day_aum', v_pre_day_aum,
      'is_negative_yield', v_is_negative_yield,
      'same_day_deposits_excluded', v_opening_aum - v_pre_day_aum
    )
  WHERE id = v_distribution_id;

  PERFORM check_aum_reconciliation(p_fund_id, 0.01, p_period_end);

  UPDATE fund_daily_aum
  SET total_aum = p_recorded_aum,
      source = 'yield_distribution_v5',
      is_month_end = v_is_month_end,
      updated_at = now()
  WHERE fund_id = p_fund_id
    AND aum_date = v_period_end
    AND purpose = p_purpose
    AND is_voided = false;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
    VALUES (p_fund_id, v_period_end, p_recorded_aum, p_purpose, 'yield_distribution_v5', v_admin, v_is_month_end);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'period_start', v_period_start::text,
    'period_end', v_period_end::text,
    'opening_aum', v_opening_aum,
    'pre_day_aum', v_pre_day_aum,
    'recorded_aum', p_recorded_aum,
    'total_yield', v_total_month_yield,
    'gross', v_total_gross,
    'net', v_total_net,
    'fees', v_total_fees,
    'ib', v_total_ib,
    'dust', COALESCE(v_residual, 0),
    'allocations', v_allocation_count,
    'same_day_deposits_excluded', v_opening_aum - v_pre_day_aum
  );
END;
$$;

ALTER FUNCTION "public"."apply_segmented_yield_distribution_v5"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_opening_aum" numeric) OWNER TO "postgres";