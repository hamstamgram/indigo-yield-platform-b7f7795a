-- Fix search_path for approve_withdrawal (security best practice)
CREATE OR REPLACE FUNCTION public.approve_withdrawal(
  p_request_id UUID,
  p_approved_amount NUMERIC(28,10) DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request RECORD;
  v_final_amount NUMERIC(28,10);
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();

  -- ===== ADVISORY LOCK: Prevent concurrent approval attempts =====
  PERFORM pg_advisory_xact_lock(hashtext('withdrawal:' || p_request_id::text));

  -- Get request details
  SELECT * INTO v_request 
  FROM public.withdrawal_requests 
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN 
    RAISE EXCEPTION 'Can only approve pending requests. Current status: %', v_request.status;
  END IF;

  -- Determine approval amount
  v_final_amount := COALESCE(p_approved_amount, v_request.requested_amount);
  
  -- Validate amount
  IF v_final_amount <= 0 THEN 
    RAISE EXCEPTION 'Approved amount must be greater than zero';
  END IF;
  
  IF v_final_amount > v_request.requested_amount THEN 
    RAISE EXCEPTION 'Approved amount cannot exceed requested amount';
  END IF;

  -- Update request
  UPDATE public.withdrawal_requests
  SET 
    status = 'approved',
    approved_amount = v_final_amount,
    approved_by = auth.uid(),
    approved_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  -- Log action
  PERFORM public.log_withdrawal_action(
    p_request_id, 
    'approve', 
    jsonb_build_object(
      'approved_amount', v_final_amount,
      'requested_amount', v_request.requested_amount,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$$;