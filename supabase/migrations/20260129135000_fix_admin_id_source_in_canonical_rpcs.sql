-- Use auth.uid() as authoritative admin id for canonical transaction RPCs
CREATE OR REPLACE FUNCTION public.apply_deposit_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_closing_aum numeric,
  p_effective_date date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL::text,
  p_purpose text DEFAULT 'transaction'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
  v_tx_id uuid;
  v_fund_asset text;
  v_fund_class text;
  v_trigger_reference text;
  v_crystallization_result jsonb;
  v_snapshot_id uuid;
  v_post_flow_aum numeric;
  v_event_ts timestamptz;
  v_admin_id uuid;
BEGIN
  -- ADVISORY LOCK: Prevent concurrent deposits/withdrawals on same fund
  PERFORM pg_advisory_xact_lock(hashtext('crystallize:' || p_fund_id::text));

  PERFORM public.set_canonical_rpc(true);
  PERFORM public.require_admin('apply deposit with crystallization');
  v_admin_id := auth.uid();

  -- Use now() for real-time transactions to ensure unique ordering
  v_event_ts := CASE 
    WHEN p_effective_date = CURRENT_DATE THEN now()
    ELSE (p_effective_date || ' 23:59:59.999')::timestamptz
  END;

  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM public.funds
  WHERE id = p_fund_id;

  v_trigger_reference := 'DEP-' || p_investor_id::text || '-' || to_char(p_effective_date, 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  v_crystallization_result := crystallize_yield_before_flow(
    p_fund_id,
    p_closing_aum,
    'deposit',
    v_trigger_reference,
    v_event_ts,
    v_admin_id,
    p_purpose::aum_purpose
  );

  IF NOT (v_crystallization_result->>'success')::boolean THEN
    RETURN v_crystallization_result::json;
  END IF;

  v_snapshot_id := (v_crystallization_result->>'snapshot_id')::uuid;

  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    reference_id, notes, created_by, is_voided, purpose, visibility_scope, meta, source
  ) VALUES (
    p_fund_id, p_investor_id, 'DEPOSIT', p_amount, p_effective_date,
    v_fund_asset, v_fund_class, v_trigger_reference,
    COALESCE(p_notes, 'Deposit with crystallization'),
    v_admin_id, false, p_purpose::aum_purpose, 'investor_visible',
    jsonb_build_object('crystallization_snapshot_id', v_snapshot_id),
    'rpc_canonical'
  ) RETURNING id INTO v_tx_id;

  v_post_flow_aum := p_closing_aum + p_amount;

  IF v_snapshot_id IS NOT NULL THEN
    UPDATE fund_aum_events SET post_flow_aum = v_post_flow_aum WHERE id = v_snapshot_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'crystallization', v_crystallization_result
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_withdrawal_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_new_total_aum numeric,
  p_tx_date date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL::text,
  p_purpose text DEFAULT 'transaction'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
  v_tx_id uuid;
  v_fund_asset text;
  v_fund_class text;
  v_trigger_reference text;
  v_crystallization_result jsonb;
  v_snapshot_id uuid;
  v_post_flow_aum numeric;
  v_event_ts timestamptz;
  v_admin_id uuid;
BEGIN
  -- ADVISORY LOCK: Prevent concurrent deposits/withdrawals on same fund
  PERFORM pg_advisory_xact_lock(hashtext('crystallize:' || p_fund_id::text));

  PERFORM public.set_canonical_rpc(true);
  PERFORM public.require_admin('apply withdrawal with crystallization');
  v_admin_id := auth.uid();

  v_event_ts := CASE 
    WHEN p_tx_date = CURRENT_DATE THEN now()
    ELSE (p_tx_date || ' 23:59:59.998')::timestamptz
  END;

  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM public.funds
  WHERE id = p_fund_id;

  v_trigger_reference := 'WDR-' || p_investor_id::text || '-' || to_char(p_tx_date, 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  v_crystallization_result := crystallize_yield_before_flow(
    p_fund_id,
    p_new_total_aum,
    'withdrawal',
    v_trigger_reference,
    v_event_ts,
    v_admin_id,
    p_purpose::aum_purpose
  );

  IF NOT (v_crystallization_result->>'success')::boolean THEN
    RETURN v_crystallization_result::json;
  END IF;

  v_snapshot_id := (v_crystallization_result->>'snapshot_id')::uuid;

  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    reference_id, notes, created_by, is_voided, purpose, visibility_scope, source
  ) VALUES (
    p_fund_id, p_investor_id, 'WITHDRAWAL', -ABS(p_amount), p_tx_date,
    v_fund_asset, v_fund_class, v_trigger_reference,
    COALESCE(p_notes, 'Withdrawal with crystallization'),
    v_admin_id, false, p_purpose::aum_purpose, 'investor_visible',
    'rpc_canonical'
  ) RETURNING id INTO v_tx_id;

  v_post_flow_aum := p_new_total_aum - ABS(p_amount);

  IF v_snapshot_id IS NOT NULL THEN
    UPDATE fund_aum_events SET post_flow_aum = v_post_flow_aum WHERE id = v_snapshot_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'crystallization', v_crystallization_result
  );
END;
$function$;
