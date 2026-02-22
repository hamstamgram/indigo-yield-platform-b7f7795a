-- Forcefully rebuild the function to clear any PostgREST cache anomalies
-- and ensure explicit casting and argument resolution match perfectly.

CREATE OR REPLACE FUNCTION public.void_fund_daily_aum(
    p_record_id uuid,
    p_reason text,
    p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_record RECORD;
  v_dist_id uuid;
  v_distribution_ids uuid[];
  v_voided_dist_count integer := 0;
BEGIN
  -- Set canonical flags for all possible trigger namespaces
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Admin validation using V6 helper
  IF NOT is_admin() THEN 
    IF NOT check_is_admin(p_admin_id) THEN
       RAISE EXCEPTION 'Access denied: admin only';
    END IF;
  END IF;

  -- Get AUM record
  SELECT * INTO v_record FROM fund_daily_aum WHERE id = p_record_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
  IF v_record.is_voided THEN RAISE EXCEPTION 'Record is already voided'; END IF;
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A reason of at least 5 characters is required';
  END IF;

  -- Step 1: Collect distribution IDs
  v_distribution_ids := ARRAY(
    SELECT id FROM yield_distributions
    WHERE fund_id = v_record.fund_id
      AND effective_date = v_record.aum_date
      AND purpose::text = v_record.purpose::text
      AND is_voided = false
  );

  -- Step 2: Void via V6 Distribution RPC
  IF v_distribution_ids IS NOT NULL THEN
    FOREACH v_dist_id IN ARRAY v_distribution_ids LOOP
      PERFORM void_yield_distribution(v_dist_id, p_admin_id, 'Cascade from fund_daily_aum void: ' || p_reason);
      v_voided_dist_count := v_voided_dist_count + 1;
    END LOOP;
  END IF;

  -- Step 3: Void the AUM record itself
  UPDATE fund_daily_aum
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = p_reason
  WHERE id = p_record_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'void_fund_daily_aum', 'fund_daily_aum', p_record_id::TEXT, p_admin_id,
    jsonb_build_object('fund_id', v_record.fund_id, 'aum_date', v_record.aum_date,
                       'total_aum', v_record.total_aum, 'purpose', v_record.purpose),
    jsonb_build_object('is_voided', true, 'reason', p_reason),
    jsonb_build_object('note', 'V6 Cascade Void', 'voided_distributions', v_voided_dist_count)
  );

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', v_record.fund_id,
    'aum_date', v_record.aum_date,
    'purpose', v_record.purpose,
    'voided_at', NOW(),
    'cascade_voided_distributions', v_voided_dist_count,
    'message', 'AUM record voided with V6 distribution cascade.'
  );
END;
$function$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
