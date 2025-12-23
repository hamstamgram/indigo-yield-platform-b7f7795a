
-- Consolidate duplicate function overloads
-- Keep only the most complete/current signatures

-- 1. Drop all delete_withdrawal overloads
DROP FUNCTION IF EXISTS public.delete_withdrawal(uuid, text, boolean);
DROP FUNCTION IF EXISTS public.delete_withdrawal(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.delete_withdrawal(uuid, text, uuid);

-- 2. Drop all update_withdrawal overloads
DROP FUNCTION IF EXISTS public.update_withdrawal(uuid, numeric, text, text, text);
DROP FUNCTION IF EXISTS public.update_withdrawal(uuid, numeric, text, uuid);
DROP FUNCTION IF EXISTS public.update_withdrawal(uuid, text, text, uuid);

-- 3. Drop all apply_daily_yield_to_fund overloads
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund(text, date, numeric);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund(uuid, date, numeric, uuid);

-- Recreate delete_withdrawal with the most complete signature
CREATE OR REPLACE FUNCTION public.delete_withdrawal(
  p_withdrawal_id uuid, 
  p_reason text, 
  p_hard_delete boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_record withdrawal_requests%ROWTYPE;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'Reason is required for deletion';
  END IF;
  
  SELECT * INTO v_old_record
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;
  
  IF v_old_record.status = 'completed' THEN
    RAISE EXCEPTION 'Cannot delete completed withdrawal - use reversal transaction instead';
  END IF;
  
  IF p_hard_delete THEN
    INSERT INTO withdrawal_audit_log (request_id, action, actor_id, details)
    VALUES (
      p_withdrawal_id, 
      'cancel', 
      v_user_id,
      jsonb_build_object(
        'reason', p_reason,
        'hard_delete', true,
        'previous_status', v_old_record.status,
        'deleted_record', row_to_json(v_old_record)
      )
    );
    
    DELETE FROM withdrawal_requests WHERE id = p_withdrawal_id;
  ELSE
    UPDATE withdrawal_requests
    SET
      status = 'cancelled',
      cancellation_reason = p_reason,
      cancelled_by = v_user_id,
      updated_at = now()
    WHERE id = p_withdrawal_id;
    
    INSERT INTO withdrawal_audit_log (request_id, action, actor_id, details)
    VALUES (
      p_withdrawal_id, 
      'cancel', 
      v_user_id,
      jsonb_build_object(
        'reason', p_reason,
        'hard_delete', false,
        'previous_status', v_old_record.status
      )
    );
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$function$;

-- Recreate update_withdrawal with the most complete signature
CREATE OR REPLACE FUNCTION public.update_withdrawal(
  p_withdrawal_id uuid, 
  p_requested_amount numeric DEFAULT NULL, 
  p_withdrawal_type text DEFAULT NULL, 
  p_notes text DEFAULT NULL, 
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_record withdrawal_requests%ROWTYPE;
  v_user_id uuid;
  v_changes jsonb := '{}';
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  SELECT * INTO v_old_record
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;
  
  IF v_old_record.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Cannot edit withdrawal with status: %', v_old_record.status;
  END IF;
  
  IF p_requested_amount IS NOT NULL AND p_requested_amount != v_old_record.requested_amount THEN
    v_changes := v_changes || jsonb_build_object(
      'requested_amount', jsonb_build_object('old', v_old_record.requested_amount, 'new', p_requested_amount)
    );
  END IF;
  
  IF p_withdrawal_type IS NOT NULL AND p_withdrawal_type != v_old_record.withdrawal_type THEN
    v_changes := v_changes || jsonb_build_object(
      'withdrawal_type', jsonb_build_object('old', v_old_record.withdrawal_type, 'new', p_withdrawal_type)
    );
  END IF;
  
  IF p_notes IS NOT NULL AND COALESCE(p_notes, '') != COALESCE(v_old_record.notes, '') THEN
    v_changes := v_changes || jsonb_build_object(
      'notes', jsonb_build_object('old', v_old_record.notes, 'new', p_notes)
    );
  END IF;
  
  UPDATE withdrawal_requests
  SET
    requested_amount = COALESCE(p_requested_amount, requested_amount),
    withdrawal_type = COALESCE(p_withdrawal_type, withdrawal_type),
    notes = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE notes END,
    updated_at = now()
  WHERE id = p_withdrawal_id;
  
  INSERT INTO withdrawal_audit_log (request_id, action, actor_id, details)
  VALUES (
    p_withdrawal_id, 
    'update', 
    v_user_id,
    jsonb_build_object(
      'reason', p_reason,
      'changes', v_changes
    )
  );
  
  RETURN jsonb_build_object('success', true, 'changes', v_changes);
END;
$function$;

-- Recreate apply_daily_yield_to_fund with the V2 signature (most complete)
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund(
  p_fund_id uuid, 
  p_date date, 
  p_gross_amount numeric, 
  p_admin_id uuid
)
RETURNS TABLE(investor_id uuid, gross_amount numeric, fee_amount numeric, net_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric;
  v_asset text;
  v_ref text;
  rec record;
  v_fee_pct numeric;
  v_gross numeric;
  v_fee numeric;
  v_net numeric;
BEGIN
  IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN 
    RAISE EXCEPTION 'Gross amount must be positive'; 
  END IF;
  
  SELECT asset INTO v_asset FROM funds WHERE id = p_fund_id;
  SELECT SUM(current_value) INTO v_total FROM investor_positions WHERE fund_id = p_fund_id;
  
  IF v_total IS NULL OR v_total <= 0 THEN 
    RAISE EXCEPTION 'No positions or zero AUM'; 
  END IF;
  
  v_ref := concat('yield:', p_fund_id, ':', p_date::text);

  FOR rec IN SELECT ip.investor_id, ip.current_value FROM investor_positions ip WHERE ip.fund_id = p_fund_id AND ip.current_value > 0 LOOP
    v_fee_pct := public._resolve_investor_fee_pct(rec.investor_id, p_fund_id, p_date);
    v_gross := p_gross_amount * (rec.current_value / v_total);
    v_fee := v_gross * (v_fee_pct / 100.0);
    v_net := v_gross - v_fee;

    INSERT INTO transactions_v2 (investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at)
    VALUES (rec.investor_id, p_fund_id, 'INTEREST', v_asset, v_gross, p_date, v_ref, 'Yield distribution (gross)', now());

    IF v_fee <> 0 THEN
      INSERT INTO transactions_v2 (investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at)
      VALUES (rec.investor_id, p_fund_id, 'FEE', v_asset, -v_fee, p_date, v_ref, concat('Fee ', v_fee_pct, '%'), now());
    END IF;

    UPDATE investor_positions SET current_value = current_value + v_net, updated_at = now()
    WHERE investor_id = rec.investor_id AND fund_id = p_fund_id;

    investor_id := rec.investor_id; 
    gross_amount := v_gross; 
    fee_amount := v_fee; 
    net_amount := v_net;
    RETURN NEXT;
  END LOOP;
END;
$function$;
