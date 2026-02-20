-- DEEP FIX: AUM & Yield Unification
-- 1. Refine get_funds_aum_snapshot for strict date mapping and live fallback
CREATE OR REPLACE FUNCTION public.get_funds_aum_snapshot(
    p_as_of_date date,
    p_purpose aum_purpose DEFAULT 'reporting'
)
RETURNS TABLE (
    fund_id uuid,
    fund_code text,
    fund_name text,
    asset text,
    as_of_date date,
    purpose text,
    aum_value numeric,
    aum_source text,
    investor_count bigint
) AS $$
DECLARE
    v_is_today boolean;
BEGIN
    v_is_today := (p_as_of_date = CURRENT_DATE);

    RETURN QUERY
    WITH fund_list AS (
        SELECT f.id, f.code, f.name, f.asset
        FROM public.funds f
        WHERE f.status = 'active'
    ),
    live_positions AS (
        SELECT 
            ip.fund_id,
            SUM(ip.current_value) as pos_sum,
            COUNT(DISTINCT ip.investor_id) as inv_count
        FROM public.investor_positions ip
        WHERE ip.is_active = true
        GROUP BY ip.fund_id
    ),
    recorded_aum AS (
        SELECT 
            da.fund_id, 
            da.total_aum
        FROM public.fund_daily_aum da
        WHERE da.aum_date = p_as_of_date
          AND da.purpose = p_purpose
          AND da.is_voided = false
    )
    SELECT
        fl.id,
        fl.code,
        fl.name,
        fl.asset,
        p_as_of_date as as_of_date,
        p_purpose::text as purpose,
        CASE 
            WHEN v_is_today THEN COALESCE(lp.pos_sum, 0)
            ELSE COALESCE(ra.total_aum, 0)
        END as aum_value,
        CASE 
            WHEN v_is_today THEN 'live_positions'
            WHEN ra.total_aum IS NOT NULL THEN 'fund_daily_aum'
            ELSE 'no_data'
        END as aum_source,
        COALESCE(lp.inv_count, 0) as investor_count
    FROM fund_list fl
    LEFT JOIN live_positions lp ON lp.fund_id = fl.id
    LEFT JOIN recorded_aum ra ON ra.fund_id = fl.id
    ORDER BY fl.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Unify crystallize_yield_before_flow with V5 pro-rata logic
CREATE OR REPLACE FUNCTION public.crystallize_yield_before_flow(
  p_fund_id uuid,
  p_closing_aum numeric,
  p_trigger_type text,
  p_trigger_reference text,
  p_event_ts timestamp with time zone,
  p_admin_id uuid,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
)
RETURNS jsonb AS $$
DECLARE
  v_opening_aum numeric;
  v_yield_amount numeric;
  v_event_date date;
  v_distribution_id uuid;
  v_investors_processed int := 0;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_fees_account_id uuid;
  v_inv record;
  v_share numeric;
  v_gross numeric;
  v_fee numeric;
  v_ib numeric;
  v_net numeric;
  v_fee_pct numeric;
  v_ib_rate numeric;
BEGIN
  v_event_date := (p_event_ts AT TIME ZONE 'UTC')::date;
  
  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;

  SELECT COALESCE(SUM(current_value), 0) INTO v_opening_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND is_active = true;

  v_yield_amount := p_closing_aum - v_opening_aum;

  INSERT INTO yield_distributions (
    fund_id, effective_date, yield_date, period_start, period_end,
    recorded_aum, previous_aum, gross_yield_amount, status, 
    created_by, calculation_method, purpose, distribution_type
  ) VALUES (
    p_fund_id, v_event_date, v_event_date, v_event_date, v_event_date,
    p_closing_aum, v_opening_aum, v_yield_amount, 'applied',
    COALESCE(p_admin_id, auth.uid()), 'pro_rata_v5_unified', p_purpose, p_trigger_type
  ) RETURNING id INTO v_distribution_id;

  IF v_yield_amount != 0 AND v_opening_aum > 0 THEN
    FOR v_inv IN
      SELECT ip.investor_id, ip.current_value, p.account_type::text AS account_type, p.ib_parent_id
      FROM investor_positions ip
      JOIN profiles p ON p.id = ip.investor_id
      WHERE ip.fund_id = p_fund_id AND ip.is_active = true AND ip.current_value > 0
    LOOP
      v_share := v_inv.current_value / v_opening_aum;
      v_gross := ROUND((v_yield_amount * v_share)::numeric, 8);
      
      IF v_yield_amount < 0 THEN
        v_fee := 0; v_ib := 0; v_net := v_gross;
      ELSE
        IF v_inv.account_type = 'fees_account' THEN v_fee_pct := 0;
        ELSE v_fee_pct := get_investor_fee_pct(v_inv.investor_id, p_fund_id, v_event_date); END IF;
        
        v_fee := ROUND((v_gross * v_fee_pct / 100)::numeric, 8);
        v_ib_rate := get_investor_ib_pct(v_inv.investor_id, p_fund_id, v_event_date);
        
        IF v_inv.ib_parent_id IS NOT NULL AND v_ib_rate > 0 THEN
          v_ib := ROUND((v_gross * v_ib_rate / 100)::numeric, 8);
        ELSE v_ib := 0; END IF;
        
        v_net := v_gross - v_fee - v_ib;
      END IF;

      IF v_net != 0 THEN
        PERFORM apply_transaction_with_crystallization(
          p_investor_id := v_inv.investor_id, p_fund_id := p_fund_id, p_tx_type := 'YIELD',
          p_amount := v_net, p_tx_date := v_event_date,
          p_reference_id := 'crystal_v5_' || v_distribution_id::text || '_' || v_inv.investor_id::text,
          p_notes := 'Crystallized ' || p_trigger_type || ' yield',
          p_admin_id := p_admin_id, p_purpose := p_purpose, p_distribution_id := v_distribution_id
        );
      END IF;

      IF v_ib > 0 THEN
        PERFORM apply_transaction_with_crystallization(
          p_investor_id := v_inv.ib_parent_id, p_fund_id := p_fund_id, p_tx_type := 'IB_CREDIT',
          p_amount := v_ib, p_tx_date := v_event_date,
          p_reference_id := 'ib_v5_' || v_distribution_id::text || '_' || v_inv.investor_id::text,
          p_notes := 'IB Commission from ' || p_trigger_type,
          p_admin_id := p_admin_id, p_purpose := p_purpose, p_distribution_id := v_distribution_id
        );
      END IF;

      v_total_gross := v_total_gross + v_gross;
      v_total_fees := v_total_fees + v_fee;
      v_total_ib := v_total_ib + v_ib;
      v_total_net := v_total_net + v_net;
      v_investors_processed := v_investors_processed + 1;
    END LOOP;
    
    IF v_total_fees > 0 THEN
      PERFORM apply_transaction_with_crystallization(
        p_investor_id := v_fees_account_id, p_fund_id := p_fund_id, p_tx_type := 'FEE_CREDIT',
        p_amount := v_total_fees, p_tx_date := v_event_date,
        p_reference_id := 'fee_v5_' || v_distribution_id::text,
        p_notes := 'Platform Fees from ' || p_trigger_type,
        p_admin_id := p_admin_id, p_purpose := p_purpose, p_distribution_id := v_distribution_id
      );
    END IF;
  END IF;

  UPDATE yield_distributions SET
    gross_yield_amount = v_total_gross,
    total_net_amount = v_total_net,
    total_fee_amount = v_total_fees,
    total_ib_amount = v_total_ib,
    allocation_count = v_investors_processed
  WHERE id = v_distribution_id;

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'gross_yield', v_total_gross,
    'net_yield', v_total_net,
    'fees', v_total_fees,
    'investors_affected', v_investors_processed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Restore auto-crystallization in apply_transaction_with_crystallization
CREATE OR REPLACE FUNCTION public.apply_transaction_with_crystallization(
  p_investor_id uuid,
  p_fund_id uuid,
  p_tx_type text,
  p_amount numeric,
  p_tx_date date,
  p_reference_id text,
  p_notes text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose,
  p_distribution_id uuid DEFAULT NULL,
  p_new_total_aum numeric DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_admin uuid;
  v_existing_tx uuid;
  v_lock_key bigint;
  v_post_aum numeric;
  v_is_new_investor boolean := false;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  v_admin := COALESCE(p_admin_id, auth.uid());
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  SELECT id INTO v_existing_tx
  FROM transactions_v2
  WHERE reference_id = p_reference_id AND is_voided = false
  LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true, 'idempotent', true, 'tx_id', v_existing_tx,
      'message', 'Transaction already exists with this reference_id'
    );
  END IF;

  v_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN RAISE EXCEPTION 'Fund not found: %', p_fund_id; END IF;

  IF p_new_total_aum IS NOT NULL THEN
    PERFORM public.crystallize_yield_before_flow(
      p_fund_id := p_fund_id,
      p_closing_aum := p_new_total_aum,
      p_trigger_type := 'pre_' || LOWER(p_tx_type),
      p_trigger_reference := p_reference_id,
      p_event_ts := p_tx_date::timestamp with time zone,
      p_admin_id := v_admin,
      p_purpose := p_purpose
    );
  END IF;

  SELECT * INTO v_position FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  IF v_position IS NULL THEN
    v_is_new_investor := true;
    INSERT INTO investor_positions (
      investor_id, fund_id, shares, cost_basis, current_value,
      last_yield_crystallization_date, is_active
    ) VALUES (
      p_investor_id, p_fund_id, 0, 0, 0, p_tx_date, true
    )
    RETURNING * INTO v_position;
  END IF;

  v_balance_before := v_position.current_value;

  CASE p_tx_type
    WHEN 'DEPOSIT' THEN v_balance_after := v_balance_before + ABS(p_amount);
    WHEN 'WITHDRAWAL' THEN 
      v_balance_after := v_balance_before - ABS(p_amount);
      IF v_balance_after < -0.00000001 THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Requested withdrawal: %', v_balance_before, ABS(p_amount);
      END IF;
    WHEN 'YIELD', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT' THEN v_balance_after := v_balance_before + p_amount;
    WHEN 'FEE' THEN v_balance_after := v_balance_before - ABS(p_amount);
    ELSE v_balance_after := v_balance_before + p_amount;
  END CASE;

  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, asset, amount, type,
    balance_before, balance_after, reference_id, notes,
    approved_by, approved_at, created_by, purpose, source, is_voided,
    distribution_id
  ) VALUES (
    p_investor_id, p_fund_id, p_tx_date, v_fund.asset,
    CASE WHEN p_tx_type IN ('WITHDRAWAL', 'FEE') THEN -ABS(p_amount) ELSE p_amount END,
    p_tx_type::tx_type, v_balance_before, v_balance_after,
    p_reference_id, p_notes, v_admin, NOW(), v_admin,
    p_purpose, 'rpc_canonical'::tx_source, false, p_distribution_id
  ) RETURNING id INTO v_tx_id;

  SELECT COALESCE(SUM(current_value), 0) INTO v_post_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by)
  VALUES (p_fund_id, p_tx_date, v_post_aum, p_purpose, 'transaction_sum', v_admin)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, updated_at = now();

  RETURN jsonb_build_object(
    'success', true, 'tx_id', v_tx_id,
    'balance_before', v_balance_before, 'balance_after', v_balance_after,
    'post_transaction_aum', v_post_aum,
    'is_new_investor', v_is_new_investor
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
