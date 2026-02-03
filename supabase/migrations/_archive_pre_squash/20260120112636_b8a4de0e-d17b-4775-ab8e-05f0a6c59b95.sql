-- ============================================================================
-- Update void_yield_distribution RPC to set voided_by_profile_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.void_yield_distribution(
  p_distribution_id uuid,
  p_admin_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dist RECORD;
  v_result json;
BEGIN
  PERFORM public.set_canonical_rpc(true);

  IF NOT public.is_admin(p_admin_id) THEN
    RETURN json_build_object('success', false, 'error', 'Admin privileges required');
  END IF;

  SELECT yd.*, t.id as transaction_id INTO v_dist
  FROM public.yield_distributions yd
  LEFT JOIN public.transactions_v2 t ON t.reference_id = 'yield:' || yd.id::text
  WHERE yd.id = p_distribution_id AND yd.is_voided = false;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Yield distribution not found or already voided');
  END IF;

  -- Void distribution with voided_by_profile_id
  UPDATE public.yield_distributions
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id, void_reason = p_reason
  WHERE id = p_distribution_id;

  -- Void related transaction with voided_by_profile_id
  IF v_dist.transaction_id IS NOT NULL THEN
    UPDATE public.transactions_v2
    SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id, void_reason = 'Yield distribution voided: ' || p_reason
    WHERE id = v_dist.transaction_id AND is_voided = false;
  END IF;

  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES ('VOID_YIELD_DISTRIBUTION', 'yield_distributions', p_distribution_id::text, p_admin_id, 
    jsonb_build_object('is_voided', false, 'net_yield', v_dist.net_yield),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason));

  RETURN json_build_object('success', true, 'distribution_id', p_distribution_id, 'original_amount', v_dist.net_yield, 'transaction_voided', v_dist.transaction_id IS NOT NULL);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM, 'error_code', SQLSTATE);
END;
$$;