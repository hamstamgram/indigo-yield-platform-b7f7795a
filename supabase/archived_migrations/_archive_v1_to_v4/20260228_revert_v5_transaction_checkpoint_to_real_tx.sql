-- Fix: Transaction-purpose yield MUST create real YIELD transactions to update AUM
-- Date: 2026-02-28
--
-- Reverting the logic from 20260228_v5_transaction_checkpoint_only which
-- skipped creating transactions for 'transaction' purpose yields. The admin
-- needs the AUM to step up internally so subequent operations calculate
-- against the new watermark (e.g. A3 deposit after A2 yield).
--
-- We run apply_transaction_with_crystallization for BOTH purposes, but 
-- keep the sync trigger's behavior of making them admin_only visibility.

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

  -- Allocation basis
  v_alloc_sum numeric := 0;

  -- Running totals
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

  -- Transaction results
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

  -- Uniqueness check
  PERFORM _v5_check_distribution_uniqueness(p_fund_id, v_period_end, p_purpose);

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'Fees account not configured';
  END IF;

  PERFORM set_config('indigo.aum_synced', 'true', true);

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

  -- Opening balances
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

  -- Month flows
  SELECT COALESCE(SUM(t.amount), 0) INTO v_total_month_flows
  FROM transactions_v2 t
  WHERE t.fund_id = p_fund_id
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= v_period_start
    AND t.tx_date <= v_period_end;

  v_total_month_yield := p_recorded_aum - v_opening_balance_sum - v_total_month_flows;
  v_is_negative_yield := (v_total_month_yield < 0);

  -- Inception month fallback
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

  -- Build metadata
  FOR v_inv IN
    SELECT yd.effective_date, COALESCE(yd.recorded_aum, 0) as closing_aum
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

  -- Create distribution header
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

  -- Consolidate markers
  FOR v_crystal_dist IN
    SELECT id FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND effective_date >= v_period_start AND effective_date <= v_period_end
      AND is_voided = false
      AND distribution_type IN ('deposit', 'withdrawal', 'transaction')
      AND consolidated_into_id IS NULL
      AND id != v_distribution_id
  LOOP
    UPDATE yield_distributions SET consolidated_into_id = v_distribution_id
    WHERE id = v_crystal_dist.id;
    v_crystals_consolidated := v_crystals_consolidated + 1;
  END LOOP;

  -- Yield allocation maths
  IF v_total_month_yield != 0 AND v_alloc_sum > 0 THEN
    FOR v_inv IN
      SELECT b.investor_id, b.opening_balance, b.account_type,
             b.ib_parent_id, b.ib_rate, b.investor_name
      FROM _v5_bal b WHERE b.opening_balance > 0
    LOOP
      v_share := v_inv.opening_balance / v_alloc_sum;
      v_gross := ROUND((v_total_month_yield * v_share)::numeric, 8);

      IF v_is_negative_yield THEN
        v_fee := 0; v_ib := 0; v_net := v_gross;
        v_fee_pct := 0; v_ib_rate := 0;
      ELSE
        IF v_inv.account_type = 'fees_account' THEN v_fee_pct := 0;
        ELSE v_fee_pct := get_investor_fee_pct(v_inv.investor_id, p_fund_id, v_period_end); END IF;
        
        v_fee := ROUND((v_gross * v_fee_pct / 100)::numeric, 8);
        v_ib_rate := get_investor_ib_pct(v_inv.investor_id, p_fund_id, v_period_end);
        
        IF v_inv.ib_parent_id IS NOT NULL AND v_ib_rate > 0 THEN
          v_ib := ROUND((v_gross * v_ib_rate / 100)::numeric, 8);
        ELSE v_ib := 0; END IF;
        
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
        total_gross = v_gross, total_fee = v_fee, total_ib = v_ib, total_net = v_net,
        seg_detail = jsonb_build_object(
          'gross', v_gross, 'fee_pct', CASE WHEN v_is_negative_yield THEN 0 ELSE v_fee_pct END,
          'fee', v_fee, 'ib_pct', CASE WHEN v_is_negative_yield THEN 0 ELSE v_ib_rate END,
          'ib', v_ib, 'net', v_net, 'share', v_share
        )
      WHERE investor_id = v_inv.investor_id;

      IF v_fee > 0 AND v_inv.account_type != 'fees_account' THEN
        INSERT INTO _v5_tot (investor_id, investor_name) VALUES (v_fees_account_id, 'Fees Account') ON CONFLICT DO NOTHING;
      END IF;
      IF v_ib > 0 AND v_inv.ib_parent_id IS NOT NULL THEN
        INSERT INTO _v5_tot (investor_id, ib_parent_id, ib_rate, investor_name)
        SELECT v_inv.ib_parent_id, NULL, 0, trim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,''))
        FROM profiles p WHERE p.id = v_inv.ib_parent_id ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- Dust routing
  v_residual := v_total_month_yield - v_total_gross - v_fees_account_gross;
  IF v_residual != 0 THEN
    UPDATE _v5_tot SET total_gross = total_gross + v_residual, total_net = total_net + v_residual
    WHERE investor_id = v_fees_account_id;
    v_fees_account_gross := v_fees_account_gross + v_residual;
  END IF;

  -- Create Transactions
  FOR v_alloc IN
    SELECT t.investor_id, t.total_gross, t.total_fee, t.total_ib, t.total_net,
           t.seg_detail, t.ib_parent_id, t.ib_rate, t.investor_name
    FROM _v5_tot t WHERE t.total_net != 0 OR t.total_gross != 0
  LOOP
    -- ANY purpose generates real transactions to update AUM
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
        IF p_purpose = 'reporting'::aum_purpose THEN
          UPDATE transactions_v2 SET visibility_scope = 'investor_visible'::visibility_scope
          WHERE id = v_yield_tx_id;
        END IF;

        UPDATE investor_yield_events SET
          investor_balance = (SELECT COALESCE(current_value, 0) FROM investor_positions
            WHERE investor_id = v_alloc.investor_id AND fund_id = p_fund_id),
          investor_share_pct = CASE WHEN v_total_gross > 0
            THEN ROUND((v_alloc.total_gross / v_total_gross * 100)::numeric, 6) ELSE 0 END,
          fund_yield_pct = CASE WHEN v_opening_aum > 0
            THEN ROUND((v_total_month_yield / v_opening_aum * 100)::numeric, 6) ELSE 0 END,
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
        fee_amount, ib_amount, adb_share, fee_pct, ib_pct, transaction_id, created_at
      ) VALUES (
        v_distribution_id, v_alloc.investor_id, p_fund_id, v_alloc.total_gross, v_alloc.total_net,
        v_alloc.total_fee, v_alloc.total_ib, 0,
        CASE WHEN v_alloc.investor_id = v_fees_account_id THEN 0 ELSE get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end) END,
        v_alloc.ib_rate, v_yield_tx_id, NOW()
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
        p_fund_id, v_distribution_id, v_alloc.investor_id, NULLIF(v_alloc.investor_name, ''),
        v_alloc.total_gross, get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end),
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
      WHERE distribution_id = v_distribution_id AND investor_id = v_alloc.investor_id AND ib_transaction_id IS NULL;

      INSERT INTO ib_commission_ledger (
        fund_id, yield_distribution_id, source_investor_id, source_investor_name,
        ib_id, ib_name, gross_yield_amount, ib_percentage, ib_commission_amount,
        effective_date, asset, transaction_id, created_by
      )
      SELECT p_fund_id, v_distribution_id, v_alloc.investor_id, NULLIF(v_alloc.investor_name, ''),
             v_alloc.ib_parent_id, trim(COALESCE(ib.first_name,'') || ' ' || COALESCE(ib.last_name,'')),
             v_alloc.total_gross, v_alloc.ib_rate, v_alloc.total_ib,
             v_period_end, v_fund.asset, v_ib_tx_id, v_admin
      FROM profiles ib WHERE ib.id = v_alloc.ib_parent_id;
    END IF;
  END LOOP;

  -- Fees account credit
  IF v_total_fees > 0 THEN
    v_fee_tx_result := apply_transaction_with_crystallization(
      p_investor_id := v_fees_account_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'FEE_CREDIT',
      p_amount := v_total_fees,
      p_tx_date := v_tx_date,
      p_reference_id := 'fee_credit_v5_' || v_distribution_id::text,
      p_notes := 'Platform fees from V5 yield (' || p_purpose || ')',
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
    UPDATE ib_allocations SET payout_status = 'paid', paid_at = NOW(), paid_by = v_admin
    WHERE distribution_id = v_distribution_id AND is_voided = false AND payout_status = 'pending';
  END IF;

  -- Note: No separate crystallization date update here because the real yields/credits will trigger it automatically

  -- Header updates
  UPDATE yield_distributions SET
    gross_yield = v_total_gross, gross_yield_amount = v_total_gross, total_net_amount = v_total_net,
    total_fee_amount = v_total_fees, total_ib_amount = v_total_ib, net_yield = v_total_net,
    total_fees = v_total_fees, total_ib = v_total_ib, dust_amount = COALESCE(v_residual, 0),
    allocation_count = v_allocation_count,
    summary_json = jsonb_build_object(
      'version', 'v5_month_level_real_txs_for_both_purposes',
      'opening_aum', v_opening_aum, 'month_flows', v_total_month_flows, 'month_yield', v_total_month_yield,
      'is_negative_yield', v_is_negative_yield, 'crystals_consolidated', v_crystals_consolidated,
      'crystal_markers', v_segments_meta, 'inception_fallback', (v_opening_balance_sum = 0),
      'checkpoint_only', false -- No longer checkpoint only
    )
  WHERE id = v_distribution_id;

  -- AUM
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
  VALUES (p_fund_id, v_period_end, p_recorded_aum, p_purpose, 'yield_distribution_v5', v_admin, v_is_month_end)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, source = 'yield_distribution_v5', is_month_end = EXCLUDED.is_month_end, updated_at = now();

  -- Audit log
  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (v_admin, 'YIELD_DISTRIBUTION_V5_APPLIED', 'yield_distributions', v_distribution_id::text,
    jsonb_build_object('opening_aum', v_opening_aum),
    jsonb_build_object('recorded_aum', p_recorded_aum, 'gross_yield', v_total_gross, 'net_yield', v_total_net, 'total_fees', v_total_fees, 'total_ib', v_total_ib, 'allocation_count', v_allocation_count),
    jsonb_build_object('fund_id', p_fund_id, 'fund_code', v_fund.code, 'period_start', v_period_start, 'period_end', v_period_end, 'purpose', p_purpose::text, 'calculation_method', 'segmented_v5_month_level', 'month_yield', v_total_month_yield, 'month_flows', v_total_month_flows, 'is_negative_yield', v_is_negative_yield, 'crystals_consolidated', v_crystals_consolidated, 'conservation_check', v_total_gross = (v_total_net + v_total_fees + v_total_ib), 'dust_residual', v_residual, 'dust_receiver', 'fees_account', 'distribution_date', v_tx_date, 'inception_fallback', (v_opening_balance_sum = 0), 'checkpoint_only', false)
  );

  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_final_positions_sum
  FROM investor_positions ip WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  RETURN jsonb_build_object(
    'success', true, 'distribution_id', v_distribution_id, 'fund_id', p_fund_id, 'fund_code', v_fund.code,
    'period_start', v_period_start, 'period_end', v_period_end, 'opening_aum', v_opening_aum, 'recorded_aum', p_recorded_aum,
    'month_yield', v_total_month_yield, 'month_flows', v_total_month_flows, 'is_negative_yield', v_is_negative_yield,
    'gross_yield', v_total_gross, 'net_yield', v_total_net, 'total_fees', v_total_fees, 'total_ib', v_total_ib,
    'dust_amount', COALESCE(v_residual, 0), 'allocation_count', v_allocation_count, 'segment_count', v_seg_count,
    'crystals_consolidated', v_crystals_consolidated, 'conservation_check', v_total_gross = (v_total_net + v_total_fees + v_total_ib),
    'position_sum', v_final_positions_sum, 'position_aum_match', ABS(v_final_positions_sum - p_recorded_aum) < 0.00000001,
    'ib_auto_paid', p_purpose = 'reporting'::aum_purpose, 'checkpoint_only', false, 'distribution_date', v_tx_date,
    'fund_asset', v_fund.asset, 'investor_count', v_allocation_count, 'days_in_period', (v_period_end - v_period_start + 1),
    'features', ARRAY['month_level_yield', 'opening_balance_allocation', 'negative_yield_support', 'per_investor_fees', 'ib_from_gross', 'fees_account_yield', 'crystal_consolidation', 'aum_only_input', 'inception_date_period_start', 'visibility_scope_control', 'yield_event_enrichment', 'distribution_date_override', 'dust_to_fees_account', 'inception_month_fallback']
  );
END;
$$;
