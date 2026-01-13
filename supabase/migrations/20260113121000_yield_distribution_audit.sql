-- ============================================================================
-- Migration: Add Audit Logging to process_yield_distribution
-- Created: 2026-01-13
-- Purpose: Ensure all bulk operations have proper audit trails
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_yield_distribution(
  p_fund_id uuid,
  p_gross_amount numeric,
  p_date date,
  p_admin_id uuid DEFAULT NULL
)
RETURNS TABLE(investor_id uuid, gross_amount numeric, fee_amount numeric, net_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_asset text;
  v_total numeric;
  v_ref text;
  v_fee_pct numeric;
  v_gross numeric;
  v_fee numeric;
  v_net numeric;
  rec record;
  v_distribution_count integer := 0;
  v_total_gross numeric := 0;
  v_total_fees numeric := 0;
  v_total_net numeric := 0;
BEGIN
  -- ========== ADVISORY LOCK: Prevent concurrent yield distributions for same fund ==========
  PERFORM pg_advisory_xact_lock(
    hashtext('yield_distribution:' || p_fund_id::text),
    hashtext(p_date::text)
  );

  IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN
    RAISE EXCEPTION 'Gross amount must be positive';
  END IF;

  SELECT asset INTO v_asset FROM funds WHERE id = p_fund_id;
  SELECT SUM(current_value) INTO v_total FROM investor_positions WHERE fund_id = p_fund_id;

  IF v_total IS NULL OR v_total <= 0 THEN
    RAISE EXCEPTION 'No positions or zero AUM';
  END IF;

  v_ref := concat('yield:', p_fund_id, ':', p_date::text);

  FOR rec IN
    SELECT ip.investor_id, ip.current_value
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    v_fee_pct := public._resolve_investor_fee_pct(rec.investor_id, p_fund_id, p_date);
    v_gross := p_gross_amount * (rec.current_value / v_total);
    v_fee := v_gross * (v_fee_pct / 100.0);
    v_net := v_gross - v_fee;

    INSERT INTO transactions_v2 (investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at)
    VALUES (rec.investor_id, p_fund_id, 'INTEREST', v_asset, v_gross, p_date, v_ref, 'Yield distribution (gross)', now());

    IF v_fee <> 0 THEN
      INSERT INTO transactions_v2 (investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at)
      VALUES (rec.investor_id, p_fund_id, 'FEE', v_asset, -v_fee, p_date, v_ref, concat('Fee ', v_fee_pct, '%'), now());
    END IF;

    UPDATE investor_positions
    SET current_value = current_value + v_net, updated_at = now()
    WHERE investor_id = rec.investor_id AND fund_id = p_fund_id;

    -- Track totals for audit
    v_distribution_count := v_distribution_count + 1;
    v_total_gross := v_total_gross + v_gross;
    v_total_fees := v_total_fees + v_fee;
    v_total_net := v_total_net + v_net;

    investor_id := rec.investor_id;
    gross_amount := v_gross;
    fee_amount := v_fee;
    net_amount := v_net;
    RETURN NEXT;
  END LOOP;

  -- ========== AUDIT LOG: Record the yield distribution operation ==========
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'YIELD_DISTRIBUTION',
    'funds',
    p_fund_id::text,
    p_admin_id,
    jsonb_build_object(
      'gross_amount_input', p_gross_amount,
      'distribution_date', p_date,
      'investors_count', v_distribution_count,
      'total_gross', v_total_gross,
      'total_fees', v_total_fees,
      'total_net', v_total_net,
      'reference', v_ref
    ),
    jsonb_build_object(
      'fund_id', p_fund_id,
      'fund_aum', v_total,
      'asset', v_asset
    )
  );

END;
$function$;

-- Add comment for documentation
COMMENT ON FUNCTION process_yield_distribution IS
'Distributes yield to all investors in a fund proportionally based on their positions.
Enhanced 2026-01-13: Added audit logging and optional admin_id parameter.';
