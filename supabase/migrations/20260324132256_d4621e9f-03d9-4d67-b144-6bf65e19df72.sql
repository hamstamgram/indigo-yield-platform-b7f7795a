-- Update calc_avg_daily_balance: ROUND(..., 8) -> ROUND(..., 18)
-- This ensures ADB calculations preserve full NUMERIC(38,18) precision
-- and match the apply/preview functions which already use 18dp.

CREATE OR REPLACE FUNCTION public.calc_avg_daily_balance(p_investor_id uuid, p_fund_id uuid, p_period_start date, p_period_end date)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result numeric := 0;
  v_total_weighted_balance numeric := 0;
  v_total_days int;
  v_current_balance numeric := 0;
  v_current_date date;
  v_next_date date;
  v_days_at_balance int;
  v_tx RECORD;
  v_initial_balance numeric;
BEGIN
  v_total_days := (p_period_end - p_period_start + 1);

  IF v_total_days <= 0 THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(
    (
      SELECT ps.current_value
      FROM investor_position_snapshots ps
      WHERE ps.investor_id = p_investor_id
        AND ps.fund_id = p_fund_id
        AND ps.snapshot_date = p_period_start - 1
      ORDER BY ps.created_at DESC
      LIMIT 1
    ),
    (
      SELECT COALESCE(SUM(
        CASE
          WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN t.amount
          WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT') THEN -ABS(t.amount)
          ELSE t.amount
        END
      ), 0)
      FROM transactions_v2 t
      WHERE t.investor_id = p_investor_id
        AND t.fund_id = p_fund_id
        AND t.tx_date < p_period_start
        AND t.is_voided = false
    )
  ) INTO v_initial_balance;

  v_current_balance := COALESCE(v_initial_balance, 0);
  v_current_date := p_period_start;

  FOR v_tx IN
    SELECT
      t.tx_date,
      SUM(
        CASE
          WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'INTERNAL_CREDIT') THEN t.amount
          WHEN t.type = 'ADJUSTMENT' THEN t.amount
          WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT') THEN -ABS(t.amount)
          ELSE 0
        END
      ) as daily_net_change
    FROM transactions_v2 t
    WHERE t.investor_id = p_investor_id
      AND t.fund_id = p_fund_id
      AND t.tx_date >= p_period_start
      AND t.tx_date <= p_period_end
      AND t.is_voided = false
    GROUP BY t.tx_date
    ORDER BY t.tx_date
  LOOP
    v_days_at_balance := v_tx.tx_date - v_current_date;

    IF v_days_at_balance > 0 THEN
      v_total_weighted_balance := v_total_weighted_balance + (v_current_balance * v_days_at_balance);
    END IF;

    v_current_balance := v_current_balance + v_tx.daily_net_change;
    v_current_date := v_tx.tx_date;
  END LOOP;

  v_days_at_balance := (p_period_end - v_current_date + 1);
  IF v_days_at_balance > 0 THEN
    v_total_weighted_balance := v_total_weighted_balance + (v_current_balance * v_days_at_balance);
  END IF;

  v_result := v_total_weighted_balance / v_total_days;

  RETURN ROUND(v_result, 18);
END;
$function$;