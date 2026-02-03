-- Fix 1: validate_pre_yield_aum (Fix %.2f usage)
CREATE OR REPLACE FUNCTION public.validate_pre_yield_aum(p_fund_id uuid, p_tolerance_percentage numeric DEFAULT 1.0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_reconciliation JSONB;
  v_recorded_aum NUMERIC(28,10);
  v_calculated_aum NUMERIC(28,10);
  v_discrepancy_pct NUMERIC(10,4);
  v_is_valid BOOLEAN;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_warnings TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check AUM reconciliation
  SELECT check_aum_reconciliation(p_fund_id, 0.01) INTO v_reconciliation;

  v_recorded_aum := (v_reconciliation->>'recorded_aum')::NUMERIC;
  v_calculated_aum := (v_reconciliation->>'calculated_aum')::NUMERIC;

  -- Calculate percentage discrepancy
  IF v_calculated_aum > 0 THEN
    v_discrepancy_pct := ABS(v_recorded_aum - v_calculated_aum) / v_calculated_aum * 100;
  ELSIF v_recorded_aum > 0 THEN
    v_discrepancy_pct := 100;
  ELSE
    v_discrepancy_pct := 0;
  END IF;

  v_is_valid := TRUE;

  -- Check for zero AUM
  IF v_calculated_aum <= 0 THEN
    v_errors := array_append(v_errors,
      format('Cannot apply yield: Calculated AUM is %s. Ensure positions are populated.', v_calculated_aum));
    v_is_valid := FALSE;
  END IF;

  -- Check for significant discrepancy
  IF v_discrepancy_pct > p_tolerance_percentage THEN
    v_errors := array_append(v_errors,
      -- FIX: Use %s instead of %.2f
      format('AUM discrepancy of %s%% exceeds tolerance of %s%%. Recorded: %s, Calculated: %s. Run reconciliation first.',
             ROUND(v_discrepancy_pct, 2), ROUND(p_tolerance_percentage, 2), v_recorded_aum, v_calculated_aum));
    v_is_valid := FALSE;
  END IF;

  -- Check for positions with zero value that have non-voided transactions
  IF EXISTS (
    SELECT 1
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value = 0
      AND EXISTS (
        SELECT 1
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id
          AND t.fund_id = ip.fund_id
          AND t.is_voided = false
          AND t.type IN ('DEPOSIT', 'YIELD', 'INTEREST')
      )
  ) THEN
    v_warnings := array_append(v_warnings,
      'Some positions have zero value but non-voided inflow transactions. Consider reconciliation.');
  END IF;

  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'recorded_aum', v_recorded_aum,
    'calculated_aum', v_calculated_aum,
    'discrepancy_percentage', v_discrepancy_pct,
    'tolerance_percentage', p_tolerance_percentage,
    'errors', v_errors,
    'warnings', v_warnings,
    'checked_at', now()
  );
END;
$function$;

-- Fix 2: validate_aum_against_positions (Fix %.1f usage)
CREATE OR REPLACE FUNCTION public.validate_aum_against_positions(p_fund_id uuid, p_aum_value numeric, p_max_deviation_pct numeric DEFAULT 0.10, p_context text DEFAULT 'unknown'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actual_position_sum numeric;
  v_deviation numeric;
BEGIN
  -- Calculate actual position sum from investor accounts only
  SELECT COALESCE(SUM(ip.current_value), 0)
  INTO v_actual_position_sum
  FROM investor_positions ip
  JOIN profiles pr ON ip.investor_id = pr.id
  WHERE ip.fund_id = p_fund_id
    AND ip.current_value > 0
    AND pr.account_type = 'investor';

  -- Allow empty funds
  IF v_actual_position_sum = 0 THEN
    RETURN jsonb_build_object(
      'valid', true,
      'actual_position_sum', v_actual_position_sum,
      'entered_aum', p_aum_value,
      'deviation_pct', 0,
      'message', 'No positions in fund - validation skipped'
    );
  END IF;

  -- Calculate deviation
  v_deviation := ABS(p_aum_value - v_actual_position_sum) / v_actual_position_sum;

  IF v_deviation > p_max_deviation_pct THEN
    RETURN jsonb_build_object(
      'valid', false,
      'actual_position_sum', v_actual_position_sum,
      'entered_aum', p_aum_value,
      'deviation_pct', ROUND(v_deviation * 100, 2),
      'max_deviation_pct', ROUND(p_max_deviation_pct * 100, 2),
      'context', p_context,
      -- FIX: Use %s instead of %.1f and %.0f
      'error', format(
        'AUM validation failed in %s: Entered AUM (%s) deviates by %s%% from actual position sum (%s). Maximum allowed is %s%%.',
        p_context,
        ROUND(p_aum_value::numeric, 4),
        ROUND(v_deviation * 100, 1),
        ROUND(v_actual_position_sum::numeric, 4),
        ROUND(p_max_deviation_pct * 100, 0)
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'actual_position_sum', v_actual_position_sum,
    'entered_aum', p_aum_value,
    'deviation_pct', ROUND(v_deviation * 100, 2),
    'context', p_context
  );
END;
$function$;
