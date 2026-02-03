-- Migration: Remove AUM deviation blocker from yield crystallization
--
-- Problem: validate_aum_against_positions_at_date blocks crystallization
-- when entered AUM deviates >10% from position sum. This prevents legitimate
-- yield operations (e.g. first yield for small positions).
--
-- Fix: Always return valid=true. Keep deviation info as advisory, not a gate.

CREATE OR REPLACE FUNCTION public.validate_aum_against_positions_at_date(
  p_fund_id uuid,
  p_aum_value numeric,
  p_event_date date,
  p_max_deviation_pct numeric DEFAULT 0.10,
  p_context text DEFAULT 'unknown'
)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_actual_position_sum numeric;
  v_deviation numeric;
BEGIN
  -- Prefer daily balance snapshot when available
  SELECT COALESCE(SUM(idb.end_of_day_balance), 0)
  INTO v_actual_position_sum
  FROM investor_daily_balance idb
  JOIN profiles pr ON idb.investor_id = pr.id
  WHERE idb.fund_id = p_fund_id
    AND idb.balance_date = p_event_date
    AND pr.account_type = 'investor';

  -- Fallback to transaction-derived balances if no daily snapshot
  IF v_actual_position_sum = 0 THEN
    SELECT COALESCE(SUM(t.amount), 0)
    INTO v_actual_position_sum
    FROM transactions_v2 t
    JOIN profiles pr ON t.investor_id = pr.id
    WHERE t.fund_id = p_fund_id
      AND t.tx_date <= p_event_date
      AND NOT t.is_voided
      AND pr.account_type = 'investor';
  END IF;

  -- Allow empty funds
  IF v_actual_position_sum = 0 THEN
    RETURN jsonb_build_object(
      'valid', true,
      'actual_position_sum', v_actual_position_sum,
      'entered_aum', p_aum_value,
      'deviation_pct', 0,
      'message', 'No positions in fund for date - validation skipped'
    );
  END IF;

  v_deviation := ABS(p_aum_value - v_actual_position_sum) / v_actual_position_sum;

  -- Always return valid. Deviation is advisory, not a gate.
  RETURN jsonb_build_object(
    'valid', true,
    'actual_position_sum', v_actual_position_sum,
    'entered_aum', p_aum_value,
    'deviation_pct', ROUND(v_deviation * 100, 2),
    'context', p_context
  );
END;
$$;
