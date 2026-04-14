-- Allow admins (not only super_admin) to use bulk transaction void operations.
-- This unblocks the existing Admin Transactions bulk-void dialog for operational reversals.

CREATE OR REPLACE FUNCTION public.void_transactions_bulk(
  p_transaction_ids uuid[],
  p_admin_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
  v_tx_id uuid;
  v_single_result jsonb;
BEGIN
  -- Admin check: any admin or super_admin can bulk void
  IF NOT public.check_is_admin(p_admin_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_ADMIN',
      'message', 'Admin access required for bulk void operations'
    );
  END IF;

  -- Validate array size
  v_count := array_length(p_transaction_ids, 1);
  IF v_count IS NULL OR v_count < 1 OR v_count > 50 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_BATCH_SIZE',
      'message', 'Batch size must be between 1 and 50'
    );
  END IF;

  -- Validate reason
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_REASON',
      'message', 'Reason must be at least 3 characters'
    );
  END IF;

  -- Validate none are already voided
  IF EXISTS (
    SELECT 1
    FROM public.transactions_v2
    WHERE id = ANY(p_transaction_ids)
      AND is_voided = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_VOIDED',
      'message', 'One or more transactions are already voided'
    );
  END IF;

  -- Verify all IDs exist
  IF (SELECT count(*) FROM public.transactions_v2 WHERE id = ANY(p_transaction_ids)) <> v_count THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_FOUND',
      'message', 'One or more transactions not found'
    );
  END IF;

  -- Void each transaction via canonical single-void RPC
  FOREACH v_tx_id IN ARRAY p_transaction_ids LOOP
    v_single_result := public.void_transaction(v_tx_id, p_admin_id, '[BULK] ' || trim(p_reason));

    IF COALESCE((v_single_result->>'success')::boolean, false) IS DISTINCT FROM true THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', COALESCE(v_single_result->>'error_code', 'BULK_VOID_FAILED'),
        'message', COALESCE(v_single_result->>'message', format('Failed to void transaction %s', v_tx_id))
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'count', v_count,
    'transaction_ids', to_jsonb(p_transaction_ids),
    'message', format('%s transaction(s) voided successfully', v_count)
  );
END;
$function$;