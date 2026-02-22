-- Phase 6: Position & Fee Credit Integrity (1:1 Linked Credits)
-- Transitioning from bulk system credits to 1:1 linked credits per investor allocation
-- This enables selective voiding with perfect ledger transparency.

-- 1. Add credit transaction tracking columns to yield_allocations
ALTER TABLE yield_allocations 
ADD COLUMN IF NOT EXISTS fee_credit_transaction_id uuid REFERENCES transactions_v2(id),
ADD COLUMN IF NOT EXISTS ib_credit_transaction_id uuid REFERENCES transactions_v2(id);

COMMENT ON COLUMN yield_allocations.fee_credit_transaction_id IS 'ID of the FEE_CREDIT transaction issued to the Indigo Fees account for this specific allocation.';
COMMENT ON COLUMN yield_allocations.ib_credit_transaction_id IS 'ID of the IB_CREDIT transaction issued to the agent for this specific allocation.';

-- 2. Refactor calculate_yield_allocations to ensure system account visibility (V7)
DROP FUNCTION IF EXISTS public.calculate_yield_allocations(uuid,numeric,date);

CREATE OR REPLACE FUNCTION public.calculate_yield_allocations(
    p_fund_id uuid,
    p_recorded_aum numeric,
    p_period_end date
)
RETURNS TABLE (
    investor_id uuid,
    investor_name text,
    investor_email text,
    account_type text,
    ib_parent_id uuid,
    current_value numeric,
    share numeric,
    gross_amount numeric,
    fee_pct numeric,
    fee_amount numeric,
    ib_rate numeric,
    ib_amount numeric,
    net_amount numeric,
    fee_credit numeric,
    ib_credit numeric
) 
LANGUAGE plpgsql
AS $function$
DECLARE
  v_fees_account_id uuid;
  v_opening_aum numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;
BEGIN
  -- 1. Identify the system Fees Account
  SELECT id INTO v_fees_account_id FROM profiles
  WHERE profiles.account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;

  -- 2. Compute Opening AUM
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  -- 3. Total Yield Generated
  v_total_month_yield := p_recorded_aum - v_opening_aum;
  v_is_negative_yield := (v_total_month_yield < 0);

  -- 4. Calculate allocations
  RETURN QUERY
  WITH all_relevant_investors AS (
    -- Investors who have a position
    SELECT 
      ip_in.investor_id,
      ip_in.current_value
    FROM investor_positions ip_in
    WHERE ip_in.fund_id = p_fund_id AND ip_in.is_active = true AND ip_in.current_value > 0
    
    UNION
    
    -- Indigo Fees account
    SELECT v_fees_account_id, 0::numeric
    WHERE v_fees_account_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM investor_positions WHERE investor_id = v_fees_account_id AND fund_id = p_fund_id AND is_active = true AND current_value > 0)

    UNION
    
    -- IB Agents
    SELECT DISTINCT p_child.ib_parent_id, 0::numeric
    FROM investor_positions ip_child
    JOIN profiles p_child ON p_child.id = ip_child.investor_id
    WHERE ip_child.fund_id = p_fund_id 
      AND ip_child.is_active = true 
      AND ip_child.current_value > 0
      AND p_child.ib_parent_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM investor_positions WHERE investor_id = p_child.ib_parent_id AND fund_id = p_fund_id AND is_active = true AND current_value > 0)
  ),
  raw_alloc AS (
    SELECT 
      ari.investor_id as r_investor_id,
      trim(COALESCE(p_in.first_name, '') || ' ' || COALESCE(p_in.last_name, '')) AS r_investor_name,
      p_in.email AS r_investor_email,
      p_in.account_type::text AS r_account_type,
      p_in.ib_parent_id as r_ib_parent_id,
      ari.current_value as r_current_value,
      COALESCE((ari.current_value / NULLIF(v_opening_aum, 0)), 0) AS r_share,
      ROUND((v_total_month_yield * COALESCE((ari.current_value / NULLIF(v_opening_aum, 0)), 0))::numeric, 8) AS r_gross,
      
      CASE 
        WHEN v_is_negative_yield THEN 0::numeric
        WHEN p_in.account_type = 'fees_account' THEN 0::numeric
        ELSE get_investor_fee_pct(ari.investor_id, p_fund_id, p_period_end)
      END AS r_fee_pct,

      CASE
        WHEN v_is_negative_yield THEN 0::numeric
        WHEN p_in.ib_parent_id IS NULL THEN 0::numeric
        ELSE get_investor_ib_pct(ari.investor_id, p_fund_id, p_period_end)
      END AS r_ib_rate

    FROM all_relevant_investors ari
    JOIN profiles p_in ON p_in.id = ari.investor_id
  ),
  computed_alloc AS (
    SELECT 
      ra.*,
      ROUND((ra.r_gross * ra.r_fee_pct / 100)::numeric, 8) AS r_fee,
      ROUND((ra.r_gross * ra.r_ib_rate / 100)::numeric, 8) AS r_ib
    FROM raw_alloc ra
  ),
  final_alloc_p0 AS (
    SELECT 
      ca.*,
      (ca.r_gross - ca.r_fee - ca.r_ib) AS r_net
    FROM computed_alloc ca
  ),
  totals AS (
     SELECT 
       COALESCE(SUM(ca.r_gross), 0) as r_sum_gross,
       COALESCE(SUM(ca.r_fee), 0) as r_total_fees_credit
     FROM final_alloc_p0 ca
  ),
  ib_credits AS (
     SELECT r_ib_parent_id, SUM(r_ib) as total_ib_credit
     FROM final_alloc_p0
     WHERE r_ib_parent_id IS NOT NULL
     GROUP BY r_ib_parent_id
  ),
  final_alloc_p1 AS (
    SELECT 
      fa.*,
      CASE 
        WHEN fa.r_investor_id = v_fees_account_id THEN 
          fa.r_net + (v_total_month_yield - (SELECT r_sum_gross FROM totals))
        ELSE 
          fa.r_net
      END AS r_net_final
    FROM final_alloc_p0 fa
  )
  SELECT 
    p1.r_investor_id,
    p1.r_investor_name,
    p1.r_investor_email,
    p1.r_account_type,
    p1.r_ib_parent_id,
    p1.r_current_value,
    p1.r_share,
    p1.r_gross,
    p1.r_fee_pct,
    p1.r_fee,
    p1.r_ib_rate,
    p1.r_ib,
    p1.r_net_final,
    CASE WHEN p1.r_investor_id = v_fees_account_id THEN (SELECT r_total_fees_credit FROM totals) ELSE 0::numeric END,
    COALESCE(ic.total_ib_credit, 0::numeric)
  FROM final_alloc_p1 p1
  LEFT JOIN ib_credits ic ON ic.r_ib_parent_id = p1.r_investor_id;
END;
$function$;

-- 3. Refactor apply_segmented_yield_distribution_v5 for 1:1 credits
CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5(
    p_fund_id uuid,
    p_recorded_aum numeric,
    p_period_end date,
    p_purpose public.aum_purpose DEFAULT 'reporting'::public.aum_purpose,
    p_admin_id uuid DEFAULT NULL,
    p_distribution_date date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_period_start date;
  v_tx_date date;
  v_is_month_end boolean;
  v_lock_key bigint;
  v_distribution_id uuid;
  v_opening_aum numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_allocation_count int := 0;
  v_residual numeric := 0;
  v_alloc RECORD;
  v_yield_tx_id uuid;
  v_fee_tx_id uuid;
  v_ib_tx_id uuid;
  v_fee_credit_tx_id uuid;
  v_ib_credit_tx_id uuid;
  v_tx_result json;
  v_yield_percentage numeric;
  v_fees_account_id uuid;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  v_admin := COALESCE(p_admin_id, (SELECT id FROM profiles WHERE email = 'system@indigo.yield' LIMIT 1));

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE profiles.account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN RAISE EXCEPTION 'Fund not found'; END IF;

  v_tx_date := COALESCE(p_distribution_date, p_period_end);
  v_is_month_end := (p_period_end = (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date);

  IF p_purpose = 'reporting'::aum_purpose THEN
    v_period_start := GREATEST(date_trunc('month', p_period_end)::date, COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date));
  ELSE
    v_period_start := p_period_end;
  END IF;

  v_lock_key := ('x' || substr(md5('yield_dist' || p_fund_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

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
    p_fund_id, v_tx_date, v_tx_date, v_period_start, p_period_end,
    p_recorded_aum, v_opening_aum, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    'applied'::yield_distribution_status, v_admin,
    'flat_position_proportional_v7_1to1', p_purpose, v_is_month_end, 0
  ) RETURNING id INTO v_distribution_id;

  FOR v_alloc IN SELECT * FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end) LOOP
    IF v_alloc.gross_amount != 0 THEN
      v_tx_result := apply_investor_transaction(v_alloc.investor_id, p_fund_id, 'YIELD', v_alloc.gross_amount, v_tx_date, 'YLD-' || substring(v_distribution_id::text, 1, 8), v_admin, 'Yield distribution for ' || p_period_end::text, p_purpose, v_distribution_id);
      v_yield_tx_id := (v_tx_result->>'transaction_id')::uuid;
    ELSE
      v_yield_tx_id := NULL;
    END IF;

    IF v_alloc.fee_amount > 0 THEN
      v_tx_result := apply_investor_transaction(v_alloc.investor_id, p_fund_id, 'FEE', v_alloc.fee_amount, v_tx_date, 'FEE-' || substring(v_distribution_id::text, 1, 8), v_admin, 'Management fee deduction', p_purpose, v_distribution_id);
      v_fee_tx_id := (v_tx_result->>'transaction_id')::uuid;

      v_tx_result := apply_investor_transaction(v_fees_account_id, p_fund_id, 'FEE_CREDIT', v_alloc.fee_amount, v_tx_date, 'FCR-' || substring(v_distribution_id::text, 1, 8), v_admin, 'Fee credit from ' || v_alloc.investor_name, p_purpose, v_distribution_id);
      v_fee_credit_tx_id := (v_tx_result->>'transaction_id')::uuid;
    ELSE
      v_fee_tx_id := NULL; v_fee_credit_tx_id := NULL;
    END IF;

    IF v_alloc.ib_amount > 0 THEN
      v_tx_result := apply_investor_transaction(v_alloc.investor_id, p_fund_id, 'IB', v_alloc.ib_amount, v_tx_date, 'IB-' || substring(v_distribution_id::text, 1, 8), v_admin, 'IB commission deduction', p_purpose, v_distribution_id);
      v_ib_tx_id := (v_tx_result->>'transaction_id')::uuid;

      IF v_alloc.ib_parent_id IS NOT NULL THEN
        v_tx_result := apply_investor_transaction(v_alloc.ib_parent_id, p_fund_id, 'IB_CREDIT', v_alloc.ib_amount, v_tx_date, 'IBC-' || substring(v_distribution_id::text, 1, 8), v_admin, 'IB credit from ' || v_alloc.investor_name, p_purpose, v_distribution_id);
        v_ib_credit_tx_id := (v_tx_result->>'transaction_id')::uuid;
      ELSE v_ib_credit_tx_id := NULL; END IF;
    ELSE
      v_ib_tx_id := NULL; v_ib_credit_tx_id := NULL;
    END IF;

    INSERT INTO yield_allocations (
      distribution_id, investor_id, fund_id, position_value_at_calc, ownership_pct, adb_share, gross_amount, fee_pct, fee_amount, ib_pct, ib_amount, net_amount, fee_credit, ib_credit, transaction_id, fee_transaction_id, ib_transaction_id, fee_credit_transaction_id, ib_credit_transaction_id
    ) VALUES (
      v_distribution_id, v_alloc.investor_id, p_fund_id, v_alloc.current_value, v_alloc.share * 100, v_alloc.share, v_alloc.gross_amount, v_alloc.fee_pct, v_alloc.fee_amount, v_alloc.ib_rate, v_alloc.ib_amount, v_alloc.net_amount, v_alloc.fee_credit, v_alloc.ib_credit, v_yield_tx_id, v_fee_tx_id, v_ib_tx_id, v_fee_credit_tx_id, v_ib_credit_tx_id
    );

    IF v_alloc.fee_amount > 0 THEN
      INSERT INTO platform_fee_ledger (yield_distribution_id, fund_id, investor_id, investor_name, gross_yield_amount, fee_percentage, fee_amount, effective_date, asset, transaction_id, created_by)
      VALUES (v_distribution_id, p_fund_id, v_alloc.investor_id, v_alloc.investor_name, v_alloc.gross_amount, v_alloc.fee_pct, v_alloc.fee_amount, v_tx_date, v_fund.asset, v_fee_credit_tx_id, v_admin);
    END IF;

    IF v_alloc.ib_amount > 0 AND v_alloc.ib_parent_id IS NOT NULL THEN
      INSERT INTO ib_commission_ledger (investor_id, fund_id, transaction_id, commission_rate, commission_amount, tx_date, created_by)
      VALUES (v_alloc.ib_parent_id, p_fund_id, v_ib_credit_tx_id, v_alloc.ib_rate, v_alloc.ib_amount, v_tx_date, v_admin);
    END IF;

    v_total_gross := v_total_gross + v_alloc.gross_amount;
    v_total_net := v_total_net + v_alloc.net_amount;
    v_total_fees := v_total_fees + v_alloc.fee_amount;
    v_total_ib := v_total_ib + v_alloc.ib_amount;
    v_allocation_count := v_allocation_count + 1;
  END LOOP;

  IF v_opening_aum > 0 THEN v_yield_percentage := ROUND((v_total_month_yield / v_opening_aum) * 100, 6); ELSE v_yield_percentage := 0; END IF;
  v_residual := v_total_month_yield - v_total_gross;

  UPDATE yield_distributions SET gross_yield = v_total_gross, gross_yield_amount = v_total_gross, total_net_amount = v_total_net, total_fee_amount = v_total_fees, total_ib_amount = v_total_ib, net_yield = v_total_net, total_fees = v_total_fees, total_ib = v_total_ib, dust_amount = COALESCE(v_residual, 0), opening_aum = v_opening_aum, closing_aum = p_recorded_aum, yield_percentage = v_yield_percentage, allocation_count = v_allocation_count, status = 'applied' WHERE id = v_distribution_id;

  RETURN jsonb_build_object('success', true, 'distribution_id', v_distribution_id, 'gross_yield', v_total_gross, 'net_yield', v_total_net, 'total_fees', v_total_fees, 'total_ib', v_total_ib, 'investor_count', v_allocation_count)::json;
END;
$function$;

-- 4. Refactor void_transaction for recursive credit cascades (V7)
CREATE OR REPLACE FUNCTION public.void_transaction(
    p_transaction_id uuid,
    p_admin_id uuid,
    p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_tx RECORD;
  v_alloc RECORD;
  v_daily_aum_voided int := 0;
  v_fee_allocations_voided int := 0;
  v_ib_ledger_voided int := 0;
  v_platform_fee_voided int := 0;
  v_yield_allocations_voided int := 0;
  v_ib_allocations_voided int := 0;
  v_credits_voided int := 0;
  v_date date;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('void_tx'), hashtext(p_transaction_id::text));
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF v_tx.is_voided THEN RAISE EXCEPTION 'Already voided'; END IF;

  IF check_historical_lock(v_tx.fund_id, v_tx.tx_date) THEN
    RAISE EXCEPTION 'Historical lock violation.';
  END IF;

  UPDATE transactions_v2 SET is_voided = true, voided_at = now(), voided_by = p_admin_id WHERE id = p_transaction_id;

  UPDATE fund_daily_aum SET is_voided = true, voided_at = now(), voided_by = p_admin_id
  WHERE fund_id = v_tx.fund_id AND is_voided = false AND aum_date = v_tx.tx_date AND source IN ('tx_sync','tx_position_sync','auto_heal_sync','trigger:position_sync');
  GET DIAGNOSTICS v_daily_aum_voided = ROW_COUNT;

  IF v_tx.type = 'YIELD' THEN
    SELECT * INTO v_alloc FROM yield_allocations WHERE transaction_id = p_transaction_id AND is_voided = false;
    IF FOUND THEN
        IF v_alloc.fee_credit_transaction_id IS NOT NULL THEN
            UPDATE transactions_v2 SET is_voided = true, voided_at = now(), voided_by = p_admin_id, void_reason = 'Cascade void from yield' WHERE id = v_alloc.fee_credit_transaction_id AND is_voided = false;
            v_credits_voided := v_credits_voided + 1;
        END IF;
        IF v_alloc.ib_credit_transaction_id IS NOT NULL THEN
            UPDATE transactions_v2 SET is_voided = true, voided_at = now(), voided_by = p_admin_id, void_reason = 'Cascade void from yield' WHERE id = v_alloc.ib_credit_transaction_id AND is_voided = false;
            v_credits_voided := v_credits_voided + 1;
        END IF;
        IF v_alloc.distribution_id IS NOT NULL THEN
            UPDATE yield_distributions SET
              gross_yield = gross_yield - v_alloc.gross_amount,
              gross_yield_amount = gross_yield_amount - v_alloc.gross_amount,
              total_net_amount = total_net_amount - v_alloc.net_amount,
              total_fee_amount = total_fee_amount - v_alloc.fee_amount,
              total_ib_amount = total_ib_amount - v_alloc.ib_amount,
              net_yield = net_yield - v_alloc.net_amount,
              total_fees = total_fees - v_alloc.fee_amount,
              total_ib = total_ib - v_alloc.ib_amount,
              allocation_count = allocation_count - 1
            WHERE id = v_alloc.distribution_id;
        END IF;
        UPDATE yield_allocations SET is_voided = true WHERE id = v_alloc.id;
        v_yield_allocations_voided := 1;
    END IF;
  END IF;

  FOR v_date IN SELECT DISTINCT aum_date FROM fund_daily_aum WHERE fund_id = v_tx.fund_id AND aum_date >= v_tx.tx_date AND is_voided = false ORDER BY aum_date LOOP
    PERFORM recalculate_fund_aum_for_date(v_tx.fund_id, v_date, 'transaction'::aum_purpose, p_admin_id);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'transaction_id', p_transaction_id, 'credits_voided', v_credits_voided);
END;
$function$;
