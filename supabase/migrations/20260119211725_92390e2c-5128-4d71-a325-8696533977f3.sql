-- FIX: Remove duplicate cost_basis accumulation in apply_deposit_with_crystallization
-- The trigger `trigger_recompute_position` already handles cost_basis correctly.
-- This RPC was doubling cost_basis by also doing `cost_basis = cost_basis + p_amount`

CREATE OR REPLACE FUNCTION public.apply_deposit_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_closing_aum numeric,
  p_effective_date date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_tx_id uuid;
  v_fund_asset text;
BEGIN
  -- Admin check
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can apply deposits'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Enable canonical mutation flag for this transaction
  PERFORM public.set_canonical_rpc(true);

  -- Get fund's base asset
  SELECT asset INTO v_fund_asset FROM funds WHERE id = p_fund_id;
  IF v_fund_asset IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Perform crystallization first (opening AUM is closing AUM minus the deposit)
  PERFORM public.crystallize_yield_before_flow(
    p_fund_id := p_fund_id,
    p_closing_aum := p_closing_aum - p_amount,  -- opening AUM before deposit
    p_event_ts := (p_effective_date::timestamp + interval '09:00:00'),
    p_admin_id := p_admin_id,
    p_trigger_type := 'deposit',
    p_trigger_reference := 'deposit:' || p_investor_id::text,
    p_purpose := p_purpose
  );

  -- Create the deposit transaction
  -- NOTE: Triggers (trg_recompute_position_on_tx, trg_auto_recompute_position) will
  -- automatically update/create investor_positions including cost_basis
  INSERT INTO public.transactions_v2 (
    investor_id,
    fund_id,
    type,
    amount,
    asset,
    tx_date,
    notes,
    created_by,
    is_system_generated,
    visibility_scope,
    purpose,
    source
  ) VALUES (
    p_investor_id,
    p_fund_id,
    'DEPOSIT'::public.tx_type,
    p_amount,
    v_fund_asset,
    p_effective_date,
    COALESCE(p_notes, 'Deposit via canonical RPC'),
    p_admin_id,
    false,
    'investor_visible'::visibility_scope,
    p_purpose,
    'rpc_canonical'::tx_source
  )
  RETURNING id INTO v_tx_id;

  -- Position is now handled by triggers (recompute_investor_position)
  -- DO NOT manually update cost_basis here to avoid doubling!
  
  -- Only update last_transaction_date which triggers don't handle
  UPDATE public.investor_positions
  SET last_transaction_date = p_effective_date
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  -- Return success with deposit transaction ID
  v_result := json_build_object(
    'success', true,
    'message', 'Deposit applied successfully',
    'deposit_tx_id', v_tx_id,
    'amount', p_amount,
    'investor_id', p_investor_id,
    'fund_id', p_fund_id
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION apply_deposit_with_crystallization IS 
'Process deposit with yield crystallization. ADMIN-only. Position updates handled by triggers to prevent cost_basis doubling.';