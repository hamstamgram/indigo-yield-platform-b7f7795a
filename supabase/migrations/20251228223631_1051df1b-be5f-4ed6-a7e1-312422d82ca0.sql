-- COMPLETE FIX: Drop ALL functions with CASCADE where needed

-- Drop trigger-dependent function with CASCADE
DROP FUNCTION IF EXISTS public.validate_transaction_type() CASCADE;

-- Drop other functions
DROP FUNCTION IF EXISTS public.route_withdrawal_to_fees(uuid, text);
DROP FUNCTION IF EXISTS public.complete_withdrawal(uuid, text);
DROP FUNCTION IF EXISTS public.admin_create_transaction(uuid, uuid, text, numeric, date, text, text, uuid);
DROP FUNCTION IF EXISTS public.get_funds_with_aum();
DROP FUNCTION IF EXISTS public.get_reporting_eligible_investors(uuid, date);
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text);
DROP FUNCTION IF EXISTS public.add_fund_to_investor(uuid, text, numeric, numeric);

-- 1. add_fund_to_investor
CREATE FUNCTION public.add_fund_to_investor(p_investor_id uuid, p_fund_id text, p_initial_shares numeric DEFAULT 0, p_cost_basis numeric DEFAULT 0)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_position_id UUID;
BEGIN
  IF NOT public.is_admin_for_jwt() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  INSERT INTO public.investor_positions (investor_id, fund_id, shares, cost_basis, current_value, updated_at)
  VALUES (p_investor_id, p_fund_id::uuid, p_initial_shares, p_cost_basis, p_cost_basis, now())
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET shares = investor_positions.shares + EXCLUDED.shares, cost_basis = investor_positions.cost_basis + EXCLUDED.cost_basis, updated_at = now()
  RETURNING id INTO v_position_id;
  RETURN v_position_id;
END;
$function$;

-- 2. adjust_investor_position
CREATE FUNCTION public.adjust_investor_position(
  p_investor_id uuid, p_fund_id uuid, p_delta numeric,
  p_note text DEFAULT ''::text, p_admin_id uuid DEFAULT NULL::uuid,
  p_tx_type text DEFAULT 'ADJUSTMENT'::text, p_tx_date date DEFAULT CURRENT_DATE,
  p_reference_id text DEFAULT NULL::text
)
RETURNS TABLE(out_success boolean, out_transaction_id uuid, out_old_balance numeric, out_new_balance numeric, out_message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_current_value numeric; v_new_balance numeric; v_tx_id uuid; v_fund_asset text; v_fund_class text; v_final_reference_id text;
BEGIN
  IF p_investor_id IS NULL THEN RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, NULL::numeric, 'investor_id required'::text; RETURN; END IF;
  IF p_fund_id IS NULL THEN RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, NULL::numeric, 'fund_id required'::text; RETURN; END IF;
  IF p_delta IS NULL OR p_delta = 0 THEN RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, NULL::numeric, 'delta must be non-zero'::text; RETURN; END IF;

  SELECT f.asset, f.fund_class INTO v_fund_asset, v_fund_class FROM public.funds f WHERE f.id = p_fund_id;
  IF v_fund_asset IS NULL THEN RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, NULL::numeric, 'Fund not found'::text; RETURN; END IF;

  SELECT COALESCE(ip.current_value, 0) INTO v_current_value FROM public.investor_positions ip WHERE ip.investor_id = p_investor_id AND ip.fund_id = p_fund_id;
  v_current_value := COALESCE(v_current_value, 0);
  v_new_balance := v_current_value + p_delta;

  IF v_new_balance < 0 THEN RETURN QUERY SELECT false, NULL::uuid, v_current_value, v_new_balance, format('Insufficient: %s', v_current_value)::text; RETURN; END IF;

  v_final_reference_id := COALESCE(p_reference_id, 'adj_' || p_investor_id::text || '_' || extract(epoch from now())::text);
  SELECT id INTO v_tx_id FROM public.transactions_v2 WHERE reference_id = v_final_reference_id;
  IF v_tx_id IS NOT NULL THEN RETURN QUERY SELECT true, v_tx_id, v_current_value, v_current_value, 'Already exists'::text; RETURN; END IF;

  INSERT INTO public.transactions_v2 (investor_id, fund_id, type, amount, asset, tx_date, notes, reference_id, created_by, is_voided)
  VALUES (p_investor_id, p_fund_id, COALESCE(p_tx_type, 'ADJUSTMENT')::tx_type, p_delta, v_fund_asset, COALESCE(p_tx_date, CURRENT_DATE), p_note, v_final_reference_id, p_admin_id, false)
  RETURNING id INTO v_tx_id;

  INSERT INTO public.investor_positions (investor_id, fund_id, current_value, cost_basis, fund_class, shares, updated_at)
  VALUES (p_investor_id, p_fund_id, v_new_balance, CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END, v_fund_class, 0, now())
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET current_value = v_new_balance, cost_basis = investor_positions.cost_basis + CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END, updated_at = now();

  RETURN QUERY SELECT true, v_tx_id, v_current_value, v_new_balance, 'Success'::text;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text) TO authenticated;

-- 3. admin_create_transaction
CREATE FUNCTION public.admin_create_transaction(
  p_investor_id uuid, p_fund_id uuid, p_type text, p_amount numeric,
  p_tx_date date DEFAULT CURRENT_DATE, p_notes text DEFAULT NULL,
  p_reference_id text DEFAULT NULL, p_admin_id uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_tx_id uuid; v_fund_asset text; v_fund_class text; v_current_value numeric; v_new_value numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class FROM public.funds WHERE id = p_fund_id;
  IF v_fund_asset IS NULL THEN RAISE EXCEPTION 'Fund not found'; END IF;
  SELECT COALESCE(current_value, 0) INTO v_current_value FROM public.investor_positions WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  v_new_value := COALESCE(v_current_value, 0) + p_amount;

  INSERT INTO public.transactions_v2 (investor_id, fund_id, type, amount, asset, fund_class, tx_date, notes, reference_id, created_by, is_voided)
  VALUES (p_investor_id, p_fund_id, p_type::tx_type, p_amount, v_fund_asset, v_fund_class, p_tx_date, p_notes, p_reference_id, COALESCE(p_admin_id, auth.uid()), false)
  RETURNING id INTO v_tx_id;

  INSERT INTO public.investor_positions (investor_id, fund_id, current_value, cost_basis, fund_class, shares, updated_at)
  VALUES (p_investor_id, p_fund_id, v_new_value, CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END, v_fund_class, 0, now())
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET current_value = v_new_value, cost_basis = investor_positions.cost_basis + CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END, updated_at = now();

  RETURN v_tx_id;
END;
$function$;

-- 4. get_funds_with_aum
CREATE FUNCTION public.get_funds_with_aum()
RETURNS TABLE(fund_id uuid, fund_name text, fund_code text, asset text, fund_class text, status text, total_aum numeric, investor_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT f.id, f.name, f.code, f.asset, f.fund_class, f.status::text, COALESCE(SUM(ip.current_value), 0), COUNT(DISTINCT ip.investor_id)
  FROM public.funds f LEFT JOIN public.investor_positions ip ON ip.fund_id = f.id AND ip.current_value > 0
  GROUP BY f.id ORDER BY f.name;
END;
$function$;

-- 5. validate_transaction_type trigger function AND recreate trigger
CREATE FUNCTION public.validate_transaction_type()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_current_value numeric;
BEGIN
  IF NEW.type IN ('WITHDRAWAL', 'FEE', 'REDEMPTION') AND NEW.amount > 0 THEN NEW.amount := -ABS(NEW.amount); END IF;
  IF NEW.type IN ('WITHDRAWAL', 'REDEMPTION') THEN
    SELECT COALESCE(current_value, 0) INTO v_current_value FROM public.investor_positions WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
    IF COALESCE(v_current_value, 0) + NEW.amount < 0 THEN RAISE EXCEPTION 'Insufficient balance: %', v_current_value; END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Recreate the trigger that was dropped with CASCADE
CREATE TRIGGER trg_validate_tx_type
  BEFORE INSERT OR UPDATE ON public.transactions_v2
  FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_type();

-- 6. complete_withdrawal
CREATE FUNCTION public.complete_withdrawal(p_request_id uuid, p_tx_hash text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_request RECORD; v_tx_id uuid;
BEGIN
  PERFORM public.ensure_admin();
  SELECT * INTO v_request FROM public.withdrawal_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_request.status != 'processing' THEN RAISE EXCEPTION 'Can only complete processing requests'; END IF;

  INSERT INTO public.transactions_v2 (investor_id, fund_id, type, amount, asset, fund_class, tx_date, notes, reference_id, created_by, is_voided)
  VALUES (v_request.investor_id, v_request.fund_id, 'WITHDRAWAL', -ABS(v_request.processed_amount), v_request.asset, v_request.fund_class, CURRENT_DATE, 'Withdrawal: ' || COALESCE(p_tx_hash, 'N/A'), 'wd_' || p_request_id::text, auth.uid(), false)
  RETURNING id INTO v_tx_id;

  UPDATE public.investor_positions SET current_value = current_value - ABS(v_request.processed_amount), updated_at = now() WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id;
  UPDATE public.withdrawal_requests SET status = 'completed', completed_at = NOW(), tx_hash = p_tx_hash, transaction_id = v_tx_id WHERE id = p_request_id;
  PERFORM public.log_withdrawal_action(p_request_id, 'complete', jsonb_build_object('tx_hash', p_tx_hash));
  RETURN TRUE;
END;
$function$;

-- 7. route_withdrawal_to_fees
CREATE FUNCTION public.route_withdrawal_to_fees(p_request_id uuid, p_reason text DEFAULT 'Fee routing')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_request RECORD; v_fees_account_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  PERFORM public.ensure_admin();
  SELECT * INTO v_request FROM public.withdrawal_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_request.status NOT IN ('approved', 'processing') THEN RAISE EXCEPTION 'Invalid status'; END IF;

  INSERT INTO public.transactions_v2 (investor_id, fund_id, type, amount, asset, fund_class, tx_date, notes, reference_id, created_by, is_voided)
  VALUES (v_request.investor_id, v_request.fund_id, 'FEE', -ABS(v_request.processed_amount), v_request.asset, v_request.fund_class, CURRENT_DATE, p_reason, 'fee_route_' || p_request_id::text, auth.uid(), false);

  INSERT INTO public.transactions_v2 (investor_id, fund_id, type, amount, asset, fund_class, tx_date, notes, reference_id, created_by, is_voided)
  VALUES (v_fees_account_id, v_request.fund_id, 'FEE_CREDIT', ABS(v_request.processed_amount), v_request.asset, v_request.fund_class, CURRENT_DATE, 'Fee from ' || LEFT(v_request.investor_id::text, 8), 'fee_credit_' || p_request_id::text, auth.uid(), false);

  UPDATE public.investor_positions SET current_value = current_value - ABS(v_request.processed_amount), updated_at = now() WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id;
  UPDATE public.investor_positions SET current_value = current_value + ABS(v_request.processed_amount), updated_at = now() WHERE investor_id = v_fees_account_id AND fund_id = v_request.fund_id;
  UPDATE public.withdrawal_requests SET status = 'completed', completed_at = NOW() WHERE id = p_request_id;
  RETURN TRUE;
END;
$function$;

-- 8. get_reporting_eligible_investors
CREATE FUNCTION public.get_reporting_eligible_investors(p_fund_id uuid DEFAULT NULL, p_as_of_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(investor_id uuid, investor_name text, email text, fund_id uuid, fund_name text, current_value numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT ip.investor_id, COALESCE(pr.first_name || ' ' || pr.last_name, pr.email)::text, pr.email, ip.fund_id, f.name, ip.current_value
  FROM public.investor_positions ip JOIN public.profiles pr ON pr.id = ip.investor_id JOIN public.funds f ON f.id = ip.fund_id
  WHERE ip.current_value > 0 AND COALESCE(pr.include_in_reporting, true) AND (p_fund_id IS NULL OR ip.fund_id = p_fund_id)
  ORDER BY pr.email, f.name;
END;
$function$;

NOTIFY pgrst, 'reload schema';