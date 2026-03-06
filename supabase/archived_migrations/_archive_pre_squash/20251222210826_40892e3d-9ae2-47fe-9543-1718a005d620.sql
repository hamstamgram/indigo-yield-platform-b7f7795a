-- Route Withdrawal to INDIGO FEES RPC
-- Creates paired internal transactions (admin-only visibility)

CREATE OR REPLACE FUNCTION public.route_withdrawal_to_fees(
  p_withdrawal_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_withdrawal RECORD;
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d'::uuid;
  v_reference_id TEXT;
  v_debit_tx_id UUID;
  v_credit_tx_id UUID;
  v_fund_asset TEXT;
  v_processed_amount NUMERIC;
BEGIN
  -- Check if user is admin
  SELECT auth.uid() INTO v_admin_id;
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = v_admin_id 
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Get withdrawal details
  SELECT wr.*, f.asset, f.fund_class
  INTO v_withdrawal
  FROM withdrawal_requests wr
  JOIN funds f ON f.id = wr.fund_id
  WHERE wr.id = p_withdrawal_id;

  IF v_withdrawal IS NULL THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  -- Only allow routing for approved or processing withdrawals
  IF v_withdrawal.status NOT IN ('approved', 'processing', 'completed') THEN
    RAISE EXCEPTION 'Withdrawal must be approved or processing to route to fees';
  END IF;

  -- Use processed_amount if available, otherwise requested_amount
  v_processed_amount := COALESCE(v_withdrawal.processed_amount, v_withdrawal.requested_amount);
  v_fund_asset := COALESCE(v_withdrawal.asset, v_withdrawal.fund_class, 'UNITS');
  
  -- Create idempotent reference ID
  v_reference_id := 'route_to_fees:' || p_withdrawal_id::text;

  -- Check if already routed (idempotency)
  IF EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = v_reference_id || ':debit' LIMIT 1) THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_routed', true,
      'message', 'Withdrawal already routed to INDIGO FEES'
    );
  END IF;

  -- Create INTERNAL_WITHDRAWAL from investor (debit - admin-only)
  v_debit_tx_id := gen_random_uuid();
  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, 
    reference_id, notes, visibility_scope, created_by, source
  ) VALUES (
    v_debit_tx_id,
    v_withdrawal.investor_id,
    v_withdrawal.fund_id,
    'INTERNAL_WITHDRAWAL',
    v_fund_asset,
    v_fund_asset,
    v_processed_amount,
    CURRENT_DATE,
    v_reference_id || ':debit',
    COALESCE(p_admin_notes, 'Internal routing to INDIGO FEES for withdrawal ' || p_withdrawal_id::text),
    'admin_only',
    v_admin_id,
    'internal_routing'
  );

  -- Create INTERNAL_CREDIT to INDIGO FEES (credit - admin-only)
  v_credit_tx_id := gen_random_uuid();
  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, 
    reference_id, notes, visibility_scope, created_by, source
  ) VALUES (
    v_credit_tx_id,
    v_indigo_fees_id,
    v_withdrawal.fund_id,
    'INTERNAL_CREDIT',
    v_fund_asset,
    v_fund_asset,
    v_processed_amount,
    CURRENT_DATE,
    v_reference_id || ':credit',
    'Fee routing from investor withdrawal ' || p_withdrawal_id::text,
    'admin_only',
    v_admin_id,
    'internal_routing'
  );

  -- Positions are automatically recomputed by trigger

  -- Log audit entry
  INSERT INTO audit_log (entity, entity_id, action, actor_user, new_values)
  VALUES (
    'withdrawal_requests',
    p_withdrawal_id,
    'route_to_fees',
    v_admin_id,
    jsonb_build_object(
      'debit_tx_id', v_debit_tx_id,
      'credit_tx_id', v_credit_tx_id,
      'amount', v_processed_amount,
      'from_investor', v_withdrawal.investor_id,
      'to_fees_account', v_indigo_fees_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'debit_tx_id', v_debit_tx_id,
    'credit_tx_id', v_credit_tx_id,
    'amount', v_processed_amount,
    'message', 'Withdrawal routed to INDIGO FEES successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.route_withdrawal_to_fees(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.route_withdrawal_to_fees IS 'Routes a withdrawal to INDIGO FEES account. Creates paired INTERNAL_WITHDRAWAL (from investor) and INTERNAL_CREDIT (to fees) transactions with admin-only visibility. Idempotent by withdrawal_id.';