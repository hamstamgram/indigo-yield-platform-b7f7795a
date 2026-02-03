-- ============================================================================
-- Add Advisory Locks to Financial Transaction Functions
-- Phase 2 Completion: Race Condition Prevention
-- ============================================================================

-- 1. Update admin_create_transaction with advisory lock on investor+fund
DROP FUNCTION IF EXISTS public.admin_create_transaction(uuid, uuid, text, numeric, date, text, text, uuid);

CREATE OR REPLACE FUNCTION public.admin_create_transaction(
  p_investor_id uuid,
  p_fund_id uuid,
  p_type text,
  p_amount numeric,
  p_tx_date date,
  p_notes text,
  p_reference_id text,
  p_admin_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE 
  v_tx_id uuid; 
  v_fund_asset text; 
  v_fund_class text; 
  v_current_value numeric; 
  v_new_value numeric;
BEGIN
  IF NOT public.is_admin() THEN 
    RAISE EXCEPTION 'Admin access required'; 
  END IF;
  
  -- ===== ADVISORY LOCK: Prevent concurrent position updates =====
  -- Uses two-argument form: lock on investor_id + fund_id combination
  PERFORM pg_advisory_xact_lock(
    hashtext('position:' || p_investor_id::text),
    hashtext(p_fund_id::text)
  );
  
  IF p_type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    PERFORM public.require_super_admin('admin_create_transaction:' || p_type);
  END IF;
  
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class FROM public.funds WHERE id = p_fund_id;
  IF v_fund_asset IS NULL THEN 
    RAISE EXCEPTION 'Fund not found'; 
  END IF;
  
  SELECT COALESCE(current_value, 0) INTO v_current_value 
  FROM public.investor_positions 
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  
  v_new_value := COALESCE(v_current_value, 0) + p_amount;
  
  IF v_new_value < 0 THEN
    RAISE EXCEPTION 'Transaction would result in negative balance (%.8f)', v_new_value;
  END IF;

  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, type, amount, asset, fund_class, 
    tx_date, notes, reference_id, created_by, is_voided
  )
  VALUES (
    p_investor_id, p_fund_id, p_type::tx_type, p_amount, v_fund_asset, v_fund_class, 
    p_tx_date, p_notes, p_reference_id, COALESCE(p_admin_id, auth.uid()), false
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO public.investor_positions (
    investor_id, fund_id, current_value, cost_basis, fund_class, shares, updated_at
  )
  VALUES (
    p_investor_id, p_fund_id, v_new_value, 
    CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END, 
    v_fund_class, 0, now()
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET 
    current_value = v_new_value, 
    cost_basis = investor_positions.cost_basis + CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END, 
    updated_at = now();

  RETURN v_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_transaction(uuid, uuid, text, numeric, date, text, text, uuid) TO authenticated;

-- 2. Update approve_withdrawal with advisory lock on request_id
CREATE OR REPLACE FUNCTION public.approve_withdrawal(
  p_request_id UUID,
  p_approved_amount NUMERIC(28,10) DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_final_amount NUMERIC(28,10);
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();

  -- ===== ADVISORY LOCK: Prevent concurrent approval attempts =====
  -- Matches pattern used in complete_withdrawal
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

-- ============================================================================
-- Summary:
-- - admin_create_transaction: Advisory lock on position:{investor}:{fund}
-- - approve_withdrawal: Advisory lock on withdrawal:{request_id}
-- Both now match the locking patterns used in complete_withdrawal and 
-- apply_daily_yield_to_fund_v3
-- ============================================================================