-- Fix reconcile_fund_period to use correct column name and enum values
-- Issue: Function uses 'tx_type' (doesn't exist) instead of 'type'
-- Issue: Function uses lowercase enum values ('deposit') instead of uppercase ('DEPOSIT')

CREATE OR REPLACE FUNCTION public.reconcile_fund_period(p_fund_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE(metric text, expected numeric, actual numeric, difference numeric, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_opening_aum numeric;
  v_closing_aum numeric;
  v_inflows numeric;
  v_outflows numeric;
  v_yield numeric;
  v_fees numeric;
  v_expected_closing numeric;
BEGIN
  -- Require admin
  IF NOT is_admin_safe() THEN
    RAISE EXCEPTION 'Unauthorized: admin required';
  END IF;

  -- Get opening AUM
  SELECT COALESCE(total_aum, 0) INTO v_opening_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id 
    AND aum_date = p_start_date
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get closing AUM
  SELECT COALESCE(total_aum, 0) INTO v_closing_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id 
    AND aum_date = p_end_date
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1;

  -- Calculate inflows (deposits) - FIXED: type instead of tx_type, DEPOSIT instead of deposit
  SELECT COALESCE(SUM(amount), 0) INTO v_inflows
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date BETWEEN p_start_date AND p_end_date
    AND type = 'DEPOSIT'
    AND is_voided = false;

  -- Calculate outflows (withdrawals) - FIXED
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_outflows
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date BETWEEN p_start_date AND p_end_date
    AND type = 'WITHDRAWAL'
    AND is_voided = false;

  -- Calculate yield credited - FIXED
  SELECT COALESCE(SUM(amount), 0) INTO v_yield
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date BETWEEN p_start_date AND p_end_date
    AND type = 'YIELD'
    AND is_voided = false;

  -- Calculate fees deducted - FIXED
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_fees
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date BETWEEN p_start_date AND p_end_date
    AND type = 'FEE'
    AND is_voided = false;

  -- Expected closing = opening + inflows - outflows + yield - fees
  v_expected_closing := v_opening_aum + v_inflows - v_outflows + v_yield - v_fees;

  -- Return reconciliation rows
  RETURN QUERY VALUES 
    ('Opening AUM'::text, v_opening_aum, v_opening_aum, 0::numeric, 'INFO'::text),
    ('Inflows (Deposits)'::text, v_inflows, v_inflows, 0::numeric, 'INFO'::text),
    ('Outflows (Withdrawals)'::text, v_outflows, v_outflows, 0::numeric, 'INFO'::text),
    ('Yield Credited'::text, v_yield, v_yield, 0::numeric, 'INFO'::text),
    ('Fees Deducted'::text, v_fees, v_fees, 0::numeric, 'INFO'::text),
    ('Closing AUM'::text, v_expected_closing, v_closing_aum, 
     v_closing_aum - v_expected_closing,
     CASE 
       WHEN ABS(v_closing_aum - v_expected_closing) < 0.01 THEN 'OK'
       WHEN ABS(v_closing_aum - v_expected_closing) < 1.00 THEN 'WARN'
       ELSE 'ERROR'
     END);
END;
$$;