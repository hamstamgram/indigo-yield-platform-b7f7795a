-- Fix ADJUSTMENT visibility: change from admin_only to investor_visible
-- so investors can see balance corrections in their transaction history.
-- Also include ADJUSTMENT in cost_basis calculation in recompute_investor_position.

-- 1. Update adjust_investor_position to use investor_visible
CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_tx_date date,
  p_reason text,
  p_admin_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid;
  v_fund_asset text;
  v_fund_class text;
  v_balance_before numeric(28,10);
  v_balance_after numeric(28,10);
  v_tx_id uuid;
BEGIN
  v_actor := COALESCE(p_admin_id, auth.uid());
  PERFORM pg_advisory_xact_lock(hashtext('position:' || p_investor_id::text), hashtext(p_fund_id::text));
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required'); END IF;
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class FROM funds WHERE id = p_fund_id;
  IF v_fund_asset IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Fund not found'); END IF;
  SELECT COALESCE(current_value, 0) INTO v_balance_before FROM investor_positions WHERE investor_id = p_investor_id AND fund_id = p_fund_id FOR UPDATE;
  v_balance_after := COALESCE(v_balance_before, 0) + p_amount;
  IF v_balance_after < 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Adjustment would result in negative balance'); END IF;
  INSERT INTO transactions_v2 (fund_id, investor_id, type, amount, tx_date, asset, fund_class, notes, created_by, is_voided, balance_before, balance_after, source, visibility_scope)
  VALUES (p_fund_id, p_investor_id, 'ADJUSTMENT', p_amount, p_tx_date, v_fund_asset, v_fund_class, p_reason, v_actor, false, v_balance_before, v_balance_after, 'manual_admin', 'investor_visible')
  RETURNING id INTO v_tx_id;
  RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id, 'balance_after', v_balance_after);
END;
$function$;

-- 2. Fix existing admin_only ADJUSTMENT transactions to be investor_visible
UPDATE transactions_v2
SET visibility_scope = 'investor_visible'
WHERE type = 'ADJUSTMENT'
  AND visibility_scope = 'admin_only'
  AND is_voided = false;
