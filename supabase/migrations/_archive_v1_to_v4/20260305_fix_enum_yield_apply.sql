-- Migration to fix FLAT_FEE enum exception in yield apply
-- Date: 2026-03-05

BEGIN;

-- Apply function update for MTD fee tracking without the non-existent FLAT_FEE enum type
CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5(
    p_fund_id uuid,
    p_period_end date,
    p_recorded_aum numeric,
    p_admin_id uuid,
    p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose,
    p_distribution_date date DEFAULT NULL::date
) RETURNS jsonb
    LANGUAGE plpgsql
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
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.aum_synced', 'true', true);

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

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'Fees account not configured';
  END IF;

  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  v_total_month_yield := p_recorded_aum - v_opening_aum;
  v_is_negative_yield := (v_total_month_yield < 0);

  INSERT INTO yield_distributions (
    fund_id, effective_date, yield_date, period_start, period_end,
    recorded_aum, previous_aum, gross_yield, gross_yield_amount,
    total_net_amount, total_fee_amount, total_ib_amount,
    net_yield, total_fees, total_ib, dust_amount,
    status, created_by, calculation_method, purpose, is_month_end, allocation_count
  ) VALUES (
    p_fund_id, v_period_end, v_period_end, v_period_start, v_period_end,
    p_recorded_aum, v_opening_aum, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    'applied'::yield_distribution_status, v_admin,
    'flat_position_proportional_v6', p_purpose, v_is_month_end, 0
  ) RETURNING id INTO v_distribution_id;

  DROP TABLE IF EXISTS _vflat_alloc;
  CREATE TEMP TABLE _vflat_alloc (
    investor_id uuid PRIMARY KEY,
    investor_name text,
    investor_email text,
    account_type text NOT NULL DEFAULT 'investor',
    ib_parent_id uuid,
    current_value numeric NOT NULL DEFAULT 0,
    gross numeric NOT NULL DEFAULT 0,
    fee_pct numeric NOT NULL DEFAULT 0,
    fee numeric NOT NULL DEFAULT 0,
    ib_rate numeric NOT NULL DEFAULT 0,
    ib numeric NOT NULL DEFAULT 0,
    net numeric NOT NULL DEFAULT 0
  ) ON COMMIT DROP;

  IF v_total_month_yield != 0 AND v_opening_aum > 0 THEN
    FOR v_inv IN
      SELECT ip.investor_id, ip.current_value,
             p.account_type::text AS account_type,
             p.ib_parent_id,
             trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS investor_name,
             p.email AS investor_email
      FROM investor_positions ip
      JOIN profiles p ON p.id = ip.investor_id
      WHERE ip.fund_id = p_fund_id AND ip.is_active = true AND ip.current_value > 0
      ORDER BY ip.current_value DESC
    LOOP
      v_share := v_inv.current_value / v_opening_aum;
      v_gross := ROUND((v_total_month_yield * v_share)::numeric, 8);

      IF v_is_negative_yield THEN
        v_fee_pct := 0; v_ib_rate := 0;
        v_fee := 0; v_ib := 0; v_net := v_gross;
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
        v_fees_account_net := v_fees_account_net + v_net;
      ELSE
        v_total_gross := v_total_gross + v_gross;
        v_total_net := v_total_net + v_net;
        v_total_fees := v_total_fees + v_fee;
        v_total_ib := v_total_ib + v_ib;
      END IF;

      INSERT INTO _vflat_alloc (
        investor_id, investor_name, investor_email, account_type, ib_parent_id,
        current_value, gross, fee_pct, fee, ib_rate, ib, net
      ) VALUES (
        v_inv.investor_id, v_inv.investor_name, v_inv.investor_email,
        v_inv.account_type, v_inv.ib_parent_id,
        v_inv.current_value, v_gross, v_fee_pct, v_fee, v_ib_rate, v_ib, v_net
      );
    END LOOP;
  END IF;

  v_residual := v_total_month_yield - v_total_gross - v_fees_account_gross;
  v_fees_account_net := v_fees_account_net + v_residual;

  FOR v_alloc IN
    SELECT * FROM _vflat_alloc
    WHERE investor_id != v_fees_account_id AND net != 0
    ORDER BY gross DESC
  LOOP
    v_tx_result := apply_investor_transaction(
      p_investor_id := v_alloc.investor_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'YIELD',
      p_amount := ABS(v_alloc.net),
      p_tx_date := v_tx_date,
      p_reference_id := 'yield_flat_' || v_distribution_id::text || '_' || v_alloc.investor_id::text,
      p_notes := 'Flat yield ' || to_char(v_period_start, 'Mon DD, YYYY'),
      p_admin_id := v_admin,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    );
    v_yield_tx_id := (v_tx_result->>'transaction_id')::uuid;

    IF v_yield_tx_id IS NOT NULL THEN
      IF p_purpose = 'reporting'::aum_purpose THEN
        UPDATE transactions_v2 SET visibility_scope = 'investor_visible'::visibility_scope
        WHERE id = v_yield_tx_id;
      ELSE
        UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
        WHERE id = v_yield_tx_id;
      END IF;
    END IF;

    INSERT INTO yield_allocations (
      distribution_id, investor_id, fund_id, gross_amount, net_amount,
      fee_amount, ib_amount, adb_share, fee_pct, ib_pct, transaction_id, created_at
    ) VALUES (
      v_distribution_id, v_alloc.investor_id, p_fund_id,
      v_alloc.gross, v_alloc.net, v_alloc.fee, v_alloc.ib,
      0, v_alloc.fee_pct, v_alloc.ib_rate, v_yield_tx_id, NOW()
    );
    v_allocation_count := v_allocation_count + 1;

    IF v_alloc.fee > 0 THEN
      INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        period_start, period_end, purpose, base_net_income, fee_percentage,
        fee_amount, credit_transaction_id, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, v_alloc.investor_id, v_fees_account_id,
        v_period_start, v_period_end, p_purpose, v_alloc.gross,
        v_alloc.fee_pct, v_alloc.fee, NULL, v_admin
      );

      INSERT INTO platform_fee_ledger (
        fund_id, yield_distribution_id, investor_id, investor_name,
        gross_yield_amount, fee_percentage, fee_amount, effective_date,
        asset, transaction_id, created_by
      ) VALUES (
        p_fund_id, v_distribution_id, v_alloc.investor_id,
        NULLIF(v_alloc.investor_name, ''),
        v_alloc.gross, v_alloc.fee_pct, v_alloc.fee,
        v_period_end, v_fund.asset, NULL, v_admin
      );
    END IF;

    IF v_alloc.ib > 0 AND v_alloc.ib_parent_id IS NOT NULL THEN
      v_ib_tx_result := apply_investor_transaction(
        p_investor_id := v_alloc.ib_parent_id,
        p_fund_id := p_fund_id,
        p_tx_type := 'IB_CREDIT',
        p_amount := v_alloc.ib,
        p_tx_date := v_tx_date,
        p_reference_id := 'ib_flat_' || v_distribution_id::text || '_' || v_alloc.investor_id::text,
        p_notes := 'IB commission flat yield ' || to_char(v_period_start, 'Mon DD, YYYY'),
        p_admin_id := v_admin,
        p_purpose := p_purpose,
        p_distribution_id := v_distribution_id
      );
      v_ib_tx_id := (v_ib_tx_result->>'transaction_id')::uuid;

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
             v_alloc.gross, v_alloc.ib_rate, v_alloc.ib,
             v_period_end, v_fund.asset, v_ib_tx_id, v_admin
      FROM profiles ib WHERE ib.id = v_alloc.ib_parent_id;
    END IF;
  END LOOP;

  IF v_total_fees > 0 THEN
    v_fee_tx_result := apply_investor_transaction(
      p_investor_id := v_fees_account_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'FEE_CREDIT',
      p_amount := v_total_fees,
      p_tx_date := v_tx_date,
      p_reference_id := 'fee_flat_' || v_distribution_id::text,
      p_notes := 'Platform fees flat yield ' || to_char(v_period_start, 'Mon DD, YYYY'),
      p_admin_id := v_admin,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    );
    v_fee_tx_id := (v_fee_tx_result->>'transaction_id')::uuid;

    UPDATE platform_fee_ledger SET transaction_id = v_fee_tx_id
    WHERE yield_distribution_id = v_distribution_id AND transaction_id IS NULL;
    UPDATE yield_allocations SET fee_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id AND fee_amount > 0 AND fee_transaction_id IS NULL;
    UPDATE fee_allocations SET credit_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id AND credit_transaction_id IS NULL;
  END IF;

  IF v_fees_account_net != 0 THEN
    v_tx_result := apply_investor_transaction(
      p_investor_id := v_fees_account_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'YIELD',
      p_amount := ABS(v_fees_account_net),
      p_tx_date := v_tx_date,
      p_reference_id := 'yield_flat_fees_' || v_distribution_id::text,
      p_notes := 'Fees account yield + dust flat ' || to_char(v_period_start, 'Mon DD, YYYY'),
      p_admin_id := v_admin,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    );
    v_yield_tx_id := (v_tx_result->>'transaction_id')::uuid;

    IF v_yield_tx_id IS NOT NULL THEN
      UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
      WHERE id = v_yield_tx_id;
    END IF;
  END IF;

  IF p_purpose = 'reporting'::aum_purpose THEN
    UPDATE ib_allocations
    SET payout_status = 'paid', paid_at = NOW(), paid_by = v_admin
    WHERE distribution_id = v_distribution_id
      AND is_voided = false AND payout_status = 'pending';
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
    summary_json = jsonb_build_object(
      'version', 'flat_v6',
      'opening_aum', v_opening_aum,
      'is_negative_yield', v_is_negative_yield
    )
  WHERE id = v_distribution_id;

  IF p_purpose = 'reporting'::aum_purpose THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
    VALUES (p_fund_id, v_period_end, p_recorded_aum, p_purpose, 'yield_distribution_v5', v_admin, v_is_month_end)
    ON CONFLICT (fund_id, aum_date) WHERE (is_voided = false AND purpose = 'reporting')
    DO UPDATE SET total_aum = EXCLUDED.total_aum, source = 'yield_distribution_v5',
      is_month_end = EXCLUDED.is_month_end, updated_at = now();
  ELSE
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
    VALUES (p_fund_id, v_period_end, p_recorded_aum, 'transaction', 'yield_distribution_v5', v_admin, v_is_month_end);
  END IF;

  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_final_positions_sum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'opening_aum', v_opening_aum,
    'recorded_aum', p_recorded_aum,
    'gross_yield', v_total_gross,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'dust_amount', COALESCE(v_residual, 0),
    'allocation_count', v_allocation_count,
    'investor_count', v_allocation_count,
    'conservation_check', (v_total_gross = v_total_net + v_total_fees + v_total_ib),
    'position_sum', v_final_positions_sum,
    'ib_auto_paid', (p_purpose = 'reporting'::aum_purpose),
    'calculation_method', 'flat_position_proportional_v6'
  );
END;
$$;

COMMIT;
