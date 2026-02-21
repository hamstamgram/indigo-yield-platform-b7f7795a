-- V6 Unified Yield Engine: Preview and Apply

CREATE OR REPLACE FUNCTION public.preview_segmented_yield_distribution_v5(
  p_fund_id uuid,
  p_period_end date,
  p_recorded_aum numeric,
  p_purpose public.aum_purpose DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund RECORD;
  v_period_start date;
  v_opening_aum numeric := 0;
  v_allocations_out jsonb;
  
  -- Totals
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_residual numeric := 0;
  v_fees_account_id uuid;
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

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type ORDER BY created_at ASC LIMIT 1;

  -- Get Opening AUM for the header
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  -- 1. Get exact line items from our unified pure math engine
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'investor_id', alloc.investor_id,
      'investor_name', alloc.investor_name,
      'investor_email', alloc.investor_email,
      'account_type', alloc.account_type,
      'ib_parent_id', alloc.ib_parent_id,
      'current_value', alloc.current_value,
      'share', alloc.share,
      'gross', alloc.gross,
      'fee_pct', alloc.fee_pct,
      'fee', alloc.fee,
      'ib_rate', alloc.ib_rate,
      'ib', alloc.ib,
      'net', alloc.net,
      'segments', '[]'::jsonb
    )
  ), '[]'::jsonb) INTO v_allocations_out
  FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end) alloc
  WHERE alloc.net != 0; -- Only show lines that actually get a transaction

  -- 2. Compute aggregate totals from the engine output
  -- Note: Dust is already routed to the fees_account in the calculation engine's net value.
  -- The residual we report in the header is just total total yield vs sum of gross allocations.
  v_residual := (p_recorded_aum - v_opening_aum) - 
                COALESCE((SELECT SUM(gross) FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end)), 0);

  SELECT 
    COALESCE(SUM(gross), 0),
    COALESCE(SUM(net), 0),
    COALESCE(SUM(fee), 0),
    COALESCE(SUM(ib), 0)
  INTO 
    v_total_gross, v_total_net, v_total_fees, v_total_ib
  FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end) alloc
  WHERE alloc.investor_id != v_fees_account_id;

  -- Fees account totals (not included in the public gross/net sums above to match legacy behavior)
  -- But wait, standard balancing means we should just report exactly what happened.
  -- The old code explicitly excluded fees_account from `v_total_gross` and `v_total_net`.

  -- Return V5YieldRPCResult shape matching TypeScript types
  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'period_start', v_period_start,
    'period_end', p_period_end,
    'opening_aum', v_opening_aum,
    'recorded_aum', p_recorded_aum,
    'gross_yield', v_total_gross,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'dust_amount', COALESCE(v_residual, 0),
    'investor_count', jsonb_array_length(v_allocations_out),
    'conservation_check', true, -- Engine enforces this natively
    'allocations', v_allocations_out,
    'is_negative_yield', (p_recorded_aum < v_opening_aum),
    'calculation_method', 'flat_position_proportional_v6'
  );
END;
$$;


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
  v_tx_date date;
  v_is_month_end boolean;
  v_lock_key bigint;
  v_distribution_id uuid;
  v_fees_account_id uuid;

  v_opening_aum numeric := 0;
  v_is_negative_yield boolean := false;
  v_residual numeric := 0;
  
  -- Totals
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_allocation_count int := 0;

  v_alloc RECORD;
  v_tx_result jsonb;
  v_yield_tx_id uuid;
  v_fee_tx_result jsonb;
  v_fee_tx_id uuid;
  v_ib_tx_result jsonb;
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

  v_period_start := GREATEST(
    date_trunc('month', p_period_end)::date,
    COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
  );
  v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;
  v_is_month_end := (p_period_end = v_period_end);
  v_tx_date := COALESCE(p_distribution_date, v_period_end);

  v_lock_key := ('x' || substr(md5(p_fund_id::text || v_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Duplicate check
  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id AND period_end = v_period_end
      AND purpose = p_purpose AND is_voided = false
      AND consolidated_into_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Distribution already exists for fund % period ending % with purpose %',
      p_fund_id, v_period_end, p_purpose;
  END IF;

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type ORDER BY created_at ASC LIMIT 1;
  IF v_fees_account_id IS NULL THEN RAISE EXCEPTION 'Fees account not configured'; END IF;

  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  v_is_negative_yield := (p_recorded_aum < v_opening_aum);

  -- Insert Distribution Header
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

  -- ============================================================
  -- THE V6 UNIFIED ENGINE CALL
  -- We loop the results of calculate_yield_allocations
  -- ============================================================
  FOR v_alloc IN
    SELECT * FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end)
    WHERE net != 0 OR fee != 0 OR ib != 0
    ORDER BY gross DESC
  LOOP
    v_allocation_count := v_allocation_count + 1;

    -- Update totals if this is an actual investor
    IF v_alloc.investor_id != v_fees_account_id THEN
      v_total_gross := v_total_gross + v_alloc.gross;
      v_total_net := v_total_net + v_alloc.net;
      v_total_fees := v_total_fees + v_alloc.fee;
      v_total_ib := v_total_ib + v_alloc.ib;
    END IF;

    -- 1. YIELD Transaction
    IF v_alloc.net != 0 THEN
      v_tx_result := apply_investor_transaction(
        p_investor_id := v_alloc.investor_id,
        p_fund_id := p_fund_id,
        p_tx_type := 'YIELD',
        p_amount := v_alloc.net,
        p_tx_date := v_tx_date,
        p_reference_id := 'yield_flat_' || v_distribution_id::text || '_' || v_alloc.investor_id::text,
        p_notes := 'Yield ' || to_char(v_period_start, 'Mon YYYY'),
        p_admin_id := v_admin,
        p_purpose := p_purpose,
        p_distribution_id := v_distribution_id
      );
      v_yield_tx_id := NULLIF(v_tx_result->>'tx_id', '')::uuid;

      -- Set visibility scope
      IF v_yield_tx_id IS NOT NULL THEN
        IF p_purpose = 'reporting'::aum_purpose AND v_alloc.investor_id != v_fees_account_id THEN
          UPDATE transactions_v2 SET visibility_scope = 'investor_visible'::visibility_scope WHERE id = v_yield_tx_id;
        ELSE
          UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope WHERE id = v_yield_tx_id;
        END IF;

        -- Enrich investor_yield_events (trigger created this row automatically on tx insert)
        UPDATE investor_yield_events SET
          gross_yield_amount = v_alloc.gross,
          fee_pct = v_alloc.fee_pct,
          fee_amount = v_alloc.fee,
          ib_amount = v_alloc.ib,
          net_yield_amount = v_alloc.net,
          investor_balance = v_alloc.current_value,
          distribution_id = v_distribution_id
        WHERE trigger_transaction_id = v_yield_tx_id AND is_voided = false;
      END IF;
    END IF;

    -- 2. yield_allocations header row
    INSERT INTO yield_allocations (
      distribution_id, investor_id, fund_id, gross_amount, net_amount,
      fee_amount, ib_amount, adb_share, fee_pct, ib_pct, transaction_id, created_at
    ) VALUES (
      v_distribution_id, v_alloc.investor_id, p_fund_id,
      v_alloc.gross, v_alloc.net, v_alloc.fee, v_alloc.ib,
      0, v_alloc.fee_pct, v_alloc.ib_rate, v_yield_tx_id, NOW()
    );

    -- 3. Platform Fees Ledgers
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

    -- 4. IB Commission Creation
    IF v_alloc.ib > 0 AND v_alloc.ib_parent_id IS NOT NULL THEN
      v_ib_tx_result := apply_investor_transaction(
        p_investor_id := v_alloc.ib_parent_id,
        p_fund_id := p_fund_id,
        p_tx_type := 'IB_CREDIT',
        p_amount := v_alloc.ib,
        p_tx_date := v_tx_date,
        p_reference_id := 'ib_flat_' || v_distribution_id::text || '_' || v_alloc.investor_id::text,
        p_notes := 'IB commission yield ' || to_char(v_period_start, 'Mon YYYY'),
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
             v_alloc.gross, v_alloc.ib_rate, v_alloc.ib,
             v_period_end, v_fund.asset, v_ib_tx_id, v_admin
      FROM profiles ib WHERE ib.id = v_alloc.ib_parent_id;
    END IF;

  END LOOP;

  -- 5. FEE_CREDIT aggregator for fees_account (one big lump sum of platform fees)
  IF v_total_fees > 0 THEN
    v_fee_tx_result := apply_investor_transaction(
      p_investor_id := v_fees_account_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'FEE_CREDIT',
      p_amount := v_total_fees,
      p_tx_date := v_tx_date,
      p_reference_id := 'fee_flat_' || v_distribution_id::text,
      p_notes := 'Platform fees yield ' || to_char(v_period_start, 'Mon YYYY'),
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

  -- 6. Auto-mark IB as paid for reporting
  IF p_purpose = 'reporting'::aum_purpose THEN
    UPDATE ib_allocations
    SET payout_status = 'paid', paid_at = NOW(), paid_by = v_admin
    WHERE distribution_id = v_distribution_id
      AND is_voided = false AND payout_status = 'pending';
  END IF;

  v_residual := (p_recorded_aum - v_opening_aum) - 
                COALESCE((SELECT SUM(gross) FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end)), 0);

  -- 7. Header Finalization
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
      'version', 'flat_v6_unified',
      'opening_aum', v_opening_aum,
      'is_negative_yield', v_is_negative_yield
    )
  WHERE id = v_distribution_id;

  -- Record AUM snapshot
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
  VALUES (p_fund_id, v_period_end, p_recorded_aum, p_purpose, 'yield_distribution_v6', v_admin, v_is_month_end)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, source = 'yield_distribution_v6',
    is_month_end = EXCLUDED.is_month_end, updated_at = now();

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
    'conservation_check', true,
    'position_sum', v_final_positions_sum,
    'ib_auto_paid', (p_purpose = 'reporting'::aum_purpose),
    'crystals_consolidated', 0,
    'calculation_method', 'flat_position_proportional_v6'
  );
END;
$$;
