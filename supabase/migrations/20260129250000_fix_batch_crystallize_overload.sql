-- Ensure canonical RPC context is always set in batch_crystallize_fund (force_override overload).

CREATE OR REPLACE FUNCTION public.batch_crystallize_fund(
  p_fund_id uuid,
  p_target_date date DEFAULT CURRENT_DATE,
  p_new_total_aum numeric DEFAULT NULL::numeric,
  p_admin_id uuid DEFAULT NULL::uuid,
  p_dry_run boolean DEFAULT true,
  p_force_override boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin uuid;
  v_position RECORD;
  v_results jsonb := '[]'::jsonb;
  v_processed int := 0;
  v_failed int := 0;
  v_aum numeric;
  v_fund_code text;
  v_integrity_violations int := 0;
BEGIN
  -- Ensure canonical mutation flag for all operations
  PERFORM public.set_canonical_rpc(true);

  -- Validate admin
  v_admin := COALESCE(p_admin_id, auth.uid());
  IF NOT is_admin() AND v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;
  
  -- Get fund code for logging
  SELECT code INTO v_fund_code FROM funds WHERE id = p_fund_id;

  -- Get AUM
  IF p_new_total_aum IS NOT NULL THEN
    v_aum := p_new_total_aum;
  ELSE
    SELECT total_aum INTO v_aum
    FROM fund_daily_aum
    WHERE fund_id = p_fund_id
      AND aum_date <= p_target_date
      AND is_voided = false
    ORDER BY aum_date DESC
    LIMIT 1;
  END IF;

  IF v_aum IS NULL OR v_aum = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No AUM data available for fund on target date'
    );
  END IF;

  -- Process each stale position
  FOR v_position IN
    SELECT ip.investor_id, ip.fund_id, ip.current_value, ip.last_yield_crystallization_date
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id
      AND ip.is_active = true
      AND (
        ip.last_yield_crystallization_date IS NULL
        OR ip.last_yield_crystallization_date < p_target_date
      )
    ORDER BY ip.current_value DESC
  LOOP
    BEGIN
      -- Re-enable canonical flag before each operation (savepoints may reset it)
      PERFORM public.set_canonical_rpc(true);
      
      IF p_dry_run THEN
        -- Preview only
        v_results := v_results || jsonb_build_object(
          'investor_id', v_position.investor_id,
          'action', 'would_crystallize',
          'current_value', v_position.current_value,
          'last_crystal_date', v_position.last_yield_crystallization_date
        );
      ELSE
        -- Update the position's last_yield_crystallization_date
        UPDATE investor_positions
        SET last_yield_crystallization_date = p_target_date,
            updated_at = NOW()
        WHERE investor_id = v_position.investor_id
          AND fund_id = p_fund_id;

        v_results := v_results || jsonb_build_object(
          'investor_id', v_position.investor_id,
          'action', 'crystallized',
          'current_value', v_position.current_value
        );
      END IF;

      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_results := v_results || jsonb_build_object(
        'investor_id', v_position.investor_id,
        'action', 'failed',
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'dry_run', p_dry_run,
    'fund_id', p_fund_id,
    'fund_code', v_fund_code,
    'target_date', p_target_date,
    'aum_used', v_aum,
    'processed', v_processed,
    'failed', v_failed,
    'integrity_violations', v_integrity_violations,
    'details', v_results
  );
END;
$function$;
