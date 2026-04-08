
DROP FUNCTION IF EXISTS public.void_completed_withdrawal(uuid, text);

CREATE FUNCTION public.void_completed_withdrawal(
  p_withdrawal_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request record;
  v_admin_id uuid;
  v_voided_tx_count int := 0;
  v_voided_dust_credit_count int := 0;
  v_fees_account_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;
  v_admin_id := auth.uid();

  SELECT * INTO v_request FROM withdrawal_requests WHERE id = p_withdrawal_id FOR UPDATE;
  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal not found');
  END IF;

  IF v_request.status NOT IN ('completed', 'pending', 'approved', 'processing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot void withdrawal with status: ' || v_request.status);
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Void all related transactions for the withdrawing investor
  UPDATE transactions_v2
  SET is_voided = true, voided_by_profile_id = v_admin_id, voided_at = NOW(),
      void_reason = p_reason
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id
    AND type IN ('WITHDRAWAL', 'DUST_SWEEP')
    AND is_voided = false
    AND (
      reference_id LIKE '%' || p_withdrawal_id::text || '%'
      OR reference_id LIKE 'WDR-' || v_request.investor_id::text || '%'
    );
  GET DIAGNOSTICS v_voided_tx_count = ROW_COUNT;

  -- Void dust credits on the Indigo Fees account (different investor_id)
  UPDATE transactions_v2
  SET is_voided = true, voided_by_profile_id = v_admin_id, voided_at = NOW(),
      void_reason = p_reason
  WHERE type IN ('DUST_SWEEP', 'IB_CREDIT')
    AND fund_id = v_request.fund_id
    AND is_voided = false
    AND investor_id != v_request.investor_id
    AND (
      reference_id = 'dust-credit-' || p_withdrawal_id::text
      OR reference_id LIKE 'dust-credit-' || p_withdrawal_id::text || '%'
      OR reference_id = 'DUST_RECV:' || p_withdrawal_id::text
    );
  GET DIAGNOSTICS v_voided_dust_credit_count = ROW_COUNT;

  -- Update withdrawal status to cancelled
  UPDATE withdrawal_requests
  SET status = 'cancelled',
      cancellation_reason = p_reason,
      cancelled_by = v_admin_id,
      cancelled_at = NOW(),
      admin_notes = COALESCE(admin_notes, '') || ' [VOIDED: ' || p_reason || ']',
      updated_at = NOW()
  WHERE id = p_withdrawal_id;

  -- Recompute investor position
  PERFORM recompute_investor_position(v_request.investor_id, v_request.fund_id);

  -- If we voided dust credits on the fees account, recompute that position too
  IF v_voided_dust_credit_count > 0 THEN
    SELECT id INTO v_fees_account_id FROM profiles 
    WHERE is_system_account = true AND email ILIKE '%fees%' LIMIT 1;
    IF v_fees_account_id IS NOT NULL THEN
      PERFORM recompute_investor_position(v_fees_account_id, v_request.fund_id);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', p_withdrawal_id,
    'previous_status', v_request.status,
    'voided_transactions', v_voided_tx_count,
    'voided_dust_credits', v_voided_dust_credit_count,
    'investor_id', v_request.investor_id,
    'fund_id', v_request.fund_id
  );
END;
$$;

-- Data fix: void orphaned dust credit with canonical guard bypass
DO $$
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  
  UPDATE transactions_v2
  SET is_voided = true, 
      voided_at = NOW(),
      void_reason = 'Data fix: orphaned dust credit from voided withdrawal d4e7ee28'
  WHERE id = '2cbbd551-c5d5-4dcd-997a-84d96f20ba20'
    AND is_voided = false;

  PERFORM recompute_investor_position(
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
  );
END;
$$;
