-- Fix update_fund_daily_aum_with_recalc to include SET search_path = public
-- This resolves the "Function Search Path Mutable" security linter warning

CREATE OR REPLACE FUNCTION public.update_fund_daily_aum_with_recalc(p_record_id uuid, p_new_total_aum numeric, p_reason text, p_admin_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_record RECORD;
  v_old_aum NUMERIC;
  v_void_result JSONB;
  v_apply_result JSONB;
BEGIN
  SELECT * INTO v_record FROM fund_daily_aum WHERE id = p_record_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Record not found'); END IF;
  IF v_record.is_voided THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot edit voided record'); END IF;
  
  v_old_aum := v_record.total_aum;
  
  INSERT INTO yield_edit_audit (record_id, record_type, edited_by, previous_values, new_values, edit_reason)
  VALUES (p_record_id, 'fund_daily_aum', p_admin_id, jsonb_build_object('total_aum', v_old_aum),
    jsonb_build_object('total_aum', p_new_total_aum, 'action', 'recalculate'), p_reason);
  
  SELECT void_fund_daily_aum(p_record_id, 'Edit recalculation: ' || p_reason, p_admin_id) INTO v_void_result;
  IF NOT (v_void_result->>'success')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to void: ' || (v_void_result->>'error'));
  END IF;
  
  SELECT apply_daily_yield_to_fund_v3(v_record.fund_id, v_record.aum_date, p_new_total_aum, p_admin_id, v_record.purpose::text) INTO v_apply_result;
  IF NOT (v_apply_result->>'success')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to apply: ' || (v_apply_result->>'error'));
  END IF;
  
  RETURN jsonb_build_object('success', true, 'record_id', p_record_id, 'old_aum', v_old_aum, 'new_aum', p_new_total_aum, 'updated_at', NOW());
END;
$function$;