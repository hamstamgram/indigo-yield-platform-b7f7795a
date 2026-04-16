
-- BUG 1 (P0): Add yield_allocations and fee_allocations to void_yield_distribution cascade
-- BUG 3 (P1): Fix position deactivation on full exit when dust = 0

-- Re-create void_yield_distribution with allocation voiding
DROP FUNCTION IF EXISTS public.void_yield_distribution(uuid, uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.void_yield_distribution(
  p_distribution_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Administrative void',
  p_void_crystals boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dist RECORD;
  v_voided_txs int := 0;
  v_voided_allocs int := 0;
  v_voided_crystals int := 0;
  v_crystal RECORD;
  v_tx RECORD;
  v_affected_investor RECORD;
BEGIN
  -- P0 Security: Verify caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Advisory lock to prevent concurrent void of the same distribution
  PERFORM pg_advisory_xact_lock(hashtext('void_yd:' || p_distribution_id::text));

  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  IF v_dist IS NULL THEN RAISE EXCEPTION 'Distribution not found: %', p_distribution_id; END IF;
  IF v_dist.is_voided THEN RETURN json_build_object('success', true, 'message', 'Already voided'); END IF;

  IF p_void_crystals THEN
    FOR v_crystal IN SELECT id, effective_date FROM yield_distributions WHERE consolidated_into_id = p_distribution_id AND NOT is_voided
    LOOP
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
        UPDATE investor_yield_events SET is_voided = true
        WHERE reference_id LIKE 'YLD:' || v_dist.fund_id || ':' || v_crystal.effective_date::text || ':%'
          AND is_voided = false;
      END IF;

      UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        void_reason = 'Cascade void from distribution ' || p_distribution_id::text,
        consolidated_into_id = NULL
      WHERE id = v_crystal.id;
      v_voided_crystals := v_voided_crystals + 1;
    END LOOP;
  ELSE
    UPDATE yield_distributions SET consolidated_into_id = NULL WHERE consolidated_into_id = p_distribution_id AND NOT is_voided;
  END IF;

  -- Void YIELD transactions
  FOR v_tx IN SELECT id, investor_id, amount FROM transactions_v2
    WHERE (reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
        OR reference_id LIKE 'yield_v5_' || p_distribution_id::text || '_%')
      AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- Void FEE_CREDIT transactions
  FOR v_tx IN SELECT id FROM transactions_v2
    WHERE (reference_id = 'fee_credit_' || p_distribution_id::text
        OR reference_id = 'fee_credit_v5_' || p_distribution_id::text)
      AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- Void IB_CREDIT transactions (pattern match + fallback by distribution_id)
  FOR v_tx IN SELECT id FROM transactions_v2
    WHERE (
      reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_credit_v5_' || p_distribution_id::text || '_%'
      OR (distribution_id = p_distribution_id AND type = 'IB_CREDIT')
    )
    AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- Void allocation tables (BUG 1 FIX: added yield_allocations and fee_allocations)
  UPDATE yield_allocations SET is_voided = true WHERE distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE fee_allocations SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id WHERE distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE platform_fee_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_commission_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_allocations SET is_voided = true WHERE distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id, void_reason = p_reason WHERE id = p_distribution_id;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
    UPDATE investor_yield_events SET is_voided = true
    WHERE trigger_transaction_id IN (SELECT id FROM transactions_v2 WHERE distribution_id = p_distribution_id AND is_voided = true)
      AND NOT is_voided;
  END IF;

  -- Recompute positions for all affected investors
  FOR v_affected_investor IN
    SELECT DISTINCT investor_id FROM transactions_v2
    WHERE distribution_id = p_distribution_id
      AND investor_id IS NOT NULL
  LOOP
    PERFORM recompute_investor_position(v_affected_investor.investor_id, v_dist.fund_id);
  END LOOP;

  -- Recompute AUM for the distribution's effective date
  BEGIN
    PERFORM recalculate_fund_aum_for_date(v_dist.fund_id, v_dist.effective_date);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta) VALUES (
    p_admin_id, 'YIELD_DISTRIBUTION_VOIDED', 'yield_distributions', p_distribution_id::text,
    jsonb_build_object('status', v_dist.status, 'gross_yield', v_dist.gross_yield),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object('voided_txs', v_voided_txs, 'voided_crystals', v_voided_crystals, 'void_crystals_requested', p_void_crystals, 'fund_id', v_dist.fund_id)
  );

  RETURN json_build_object('success', true, 'distribution_id', p_distribution_id, 'voided_transactions', v_voided_txs, 'voided_crystals', v_voided_crystals);
END;
$function$;

-- Re-apply grants
REVOKE ALL ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) TO service_role;

-- BUG 3: Fix approve_and_complete_withdrawal - deactivate position on full exit even when dust = 0
CREATE OR REPLACE FUNCTION "public"."approve_and_complete_withdrawal"("p_request_id" "uuid", "p_processed_amount" numeric DEFAULT NULL::numeric, "p_tx_hash" "text" DEFAULT NULL::"text", "p_admin_notes" "text" DEFAULT NULL::"text", "p_is_full_exit" boolean DEFAULT false, "p_send_precision" integer DEFAULT 3) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin_id uuid;
  v_request record;
  v_fund record;
  v_final_amount numeric(28,10);
  v_balance numeric(28,10);
  v_pending_sum numeric(28,10);
  v_tx_id uuid;
  v_reference_id text;
  v_dust numeric(28,10);
  v_dust_tx_id uuid;
  v_dust_credit_tx_id uuid;
  v_fees_account_id uuid;
  v_crystal_result jsonb;
  v_closing_aum numeric(28,10);
  v_tx_date date;
BEGIN
  -- Require admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin access required';
  END IF;
  v_admin_id := auth.uid();

  -- Advisory lock to prevent concurrent operations on same withdrawal
  PERFORM pg_advisory_xact_lock(hashtext('withdrawal:' || p_request_id::text));

  -- Fetch and lock the withdrawal request
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND: Withdrawal request % not found', p_request_id;
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'INVALID_STATE: Can only approve pending requests. Current status: %', v_request.status;
  END IF;

  -- Use settlement_date from the withdrawal request, fallback to CURRENT_DATE
  v_tx_date := COALESCE(v_request.settlement_date, CURRENT_DATE);

  -- Get fund details for asset column
  SELECT * INTO v_fund
  FROM public.funds
  WHERE id = v_request.fund_id;

  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'FUND_NOT_FOUND: Fund % not found', v_request.fund_id;
  END IF;

  -- If full exit, auto-crystallize yield first
  IF p_is_full_exit THEN
    BEGIN
      SELECT COALESCE(SUM(ip.current_value), 0) INTO v_closing_aum
      FROM investor_positions ip
      WHERE ip.fund_id = v_request.fund_id AND ip.is_active = true;

      SELECT public.crystallize_yield_before_flow(
        v_request.fund_id,
        v_closing_aum,
        'withdrawal',
        'full-exit:' || p_request_id::text,
        NOW(),
        v_admin_id
      ) INTO v_crystal_result;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Check investor balance (re-read after potential crystallization)
  SELECT COALESCE(current_value, 0) INTO v_balance
  FROM public.investor_positions
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id;

  IF v_balance IS NULL OR v_balance <= 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Investor has no active position in this fund';
  END IF;

  -- Determine final amount
  IF p_is_full_exit THEN
    v_final_amount := TRUNC(v_balance, p_send_precision);
    v_dust := v_balance - v_final_amount;

    IF v_final_amount <= 0 THEN
      v_dust := v_balance;
      v_final_amount := 0;
    END IF;
  ELSE
    v_final_amount := COALESCE(p_processed_amount, v_request.requested_amount);
    v_dust := 0;
  END IF;

  IF v_final_amount <= 0 AND v_dust <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: No amount to process';
  END IF;

  IF NOT p_is_full_exit AND v_final_amount > v_request.requested_amount THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Processed amount cannot exceed requested amount';
  END IF;

  -- Check for other pending withdrawals (exclude current request)
  SELECT COALESCE(SUM(requested_amount), 0) INTO v_pending_sum
  FROM public.withdrawal_requests
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id
    AND status IN ('approved', 'processing')
    AND id <> p_request_id;

  IF NOT p_is_full_exit AND v_final_amount > (v_balance - v_pending_sum) THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Amount % exceeds available balance % (position: %, other pending: %)',
      v_final_amount, (v_balance - v_pending_sum), v_balance, v_pending_sum;
  END IF;

  -- Generate deterministic reference ID
  v_reference_id := 'WDR-' || v_request.investor_id || '-' || to_char(v_tx_date, 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8);

  -- Bypass canonical mutation trigger for direct insert
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Create WITHDRAWAL transaction in ledger (only if send amount > 0)
  IF v_final_amount > 0 THEN
    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source,
      tx_hash
    ) VALUES (
      v_request.fund_id,
      v_request.investor_id,
      'WITHDRAWAL',
      -ABS(v_final_amount),
      v_tx_date,
      v_fund.asset,
      v_reference_id,
      COALESCE(p_admin_notes, 'Withdrawal approved and completed'),
      v_admin_id,
      false,
      'investor_visible',
      'rpc_canonical',
      p_tx_hash
    ) RETURNING id INTO v_tx_id;
  END IF;

  -- If full exit with dust, create DUST_SWEEP transactions
  IF p_is_full_exit AND v_dust > 0 THEN
    SELECT id INTO v_fees_account_id
    FROM public.profiles
    WHERE account_type = 'fees_account'
    LIMIT 1;

    IF v_fees_account_id IS NULL THEN
      RAISE EXCEPTION 'FEES_ACCOUNT_NOT_FOUND: No fees_account profile exists';
    END IF;

    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source
    ) VALUES (
      v_request.fund_id,
      v_request.investor_id,
      'DUST_SWEEP',
      -ABS(v_dust),
      v_tx_date,
      v_fund.asset,
      'dust-sweep-' || p_request_id::text,
      'Full exit dust routed to INDIGO Fees (' || v_dust::text || ' ' || v_fund.asset || ')',
      v_admin_id,
      false,
      'admin_only',
      'rpc_canonical'
    ) RETURNING id INTO v_dust_tx_id;

    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source
    ) VALUES (
      v_request.fund_id,
      v_fees_account_id,
      'DUST_SWEEP',
      ABS(v_dust),
      v_tx_date,
      v_fund.asset,
      'dust-credit-' || p_request_id::text,
      'Dust received from full exit of ' || v_request.investor_id::text,
      v_admin_id,
      false,
      'admin_only',
      'rpc_canonical'
    ) RETURNING id INTO v_dust_credit_tx_id;
  END IF;

  -- BUG 3 FIX: Unconditionally deactivate position on full exit
  -- Previously only deactivated inside the dust > 0 block, missing zero-dust cases
  IF p_is_full_exit THEN
    UPDATE public.investor_positions
    SET is_active = false, updated_at = NOW()
    WHERE investor_id = v_request.investor_id
      AND fund_id = v_request.fund_id
      AND current_value <= 0;
  END IF;

  -- trg_ledger_sync fires automatically for each INSERT above

  -- Update withdrawal request to completed
  UPDATE public.withdrawal_requests
  SET
    status = 'completed',
    approved_amount = v_final_amount,
    approved_by = v_admin_id,
    approved_at = NOW(),
    processed_amount = v_final_amount,
    processed_at = NOW(),
    tx_hash = p_tx_hash,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW(),
    version = COALESCE(version, 0) + 1
  WHERE id = p_request_id;

  -- Audit logging
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'complete',
    jsonb_build_object(
      'processed_amount', v_final_amount,
      'requested_amount', v_request.requested_amount,
      'tx_hash', p_tx_hash,
      'transaction_id', v_tx_id,
      'reference_id', v_reference_id,
      'completed_by', v_admin_id,
      'flow', CASE WHEN p_is_full_exit THEN 'full_exit_dust_sweep' ELSE 'approve_and_complete' END,
      'dust_amount', v_dust,
      'dust_tx_id', v_dust_tx_id,
      'dust_credit_tx_id', v_dust_credit_tx_id,
      'full_exit', p_is_full_exit,
      'send_precision', p_send_precision,
      'settlement_date', v_tx_date
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'reference_id', v_reference_id,
    'processed_amount', v_final_amount,
    'dust_amount', v_dust,
    'dust_tx_id', v_dust_tx_id,
    'full_exit', p_is_full_exit,
    'settlement_date', v_tx_date
  );
END;
$$;
