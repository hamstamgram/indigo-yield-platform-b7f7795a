-- Fix the non-date variant of AUM validation (used by apply_transaction_with_crystallization, etc.)
CREATE OR REPLACE FUNCTION public.validate_aum_against_positions(
  p_fund_id uuid,
  p_aum_value numeric,
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
  SELECT COALESCE(SUM(ip.current_value), 0)
  INTO v_actual_position_sum
  FROM investor_positions ip
  JOIN profiles pr ON ip.investor_id = pr.id
  WHERE ip.fund_id = p_fund_id
    AND ip.current_value > 0
    AND pr.account_type = 'investor';

  IF v_actual_position_sum = 0 THEN
    RETURN jsonb_build_object(
      'valid', true,
      'actual_position_sum', v_actual_position_sum,
      'entered_aum', p_aum_value,
      'deviation_pct', 0,
      'message', 'No positions in fund - validation skipped'
    );
  END IF;

  v_deviation := ABS(p_aum_value - v_actual_position_sum) / v_actual_position_sum;

  RETURN jsonb_build_object(
    'valid', true,
    'actual_position_sum', v_actual_position_sum,
    'entered_aum', p_aum_value,
    'deviation_pct', ROUND(v_deviation * 100, 2),
    'context', p_context
  );
END;
$$;;
