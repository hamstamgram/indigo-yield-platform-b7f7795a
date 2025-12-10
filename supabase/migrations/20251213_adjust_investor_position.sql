-- Adjust investor position: inserts ADJUSTMENT transaction and updates investor_positions
CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_investor_id uuid,
  p_fund_id uuid,
  p_delta numeric,
  p_note text,
  p_admin_id uuid
) RETURNS TABLE (
  investor_id uuid,
  fund_id uuid,
  previous_balance numeric,
  new_balance numeric
) AS $$
DECLARE
  v_prev numeric;
  v_new numeric;
  v_asset text;
BEGIN
  SELECT current_value INTO v_prev
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  IF v_prev IS NULL THEN
    v_prev := 0;
    INSERT INTO investor_positions (investor_id, fund_id, fund_class, shares, current_value, cost_basis, updated_at)
    SELECT p_investor_id, p_fund_id, f.asset, p_delta, p_delta, p_delta, now()
    FROM funds f WHERE f.id = p_fund_id
    ON CONFLICT (investor_id, fund_id) DO NOTHING;
  END IF;

  SELECT asset INTO v_asset FROM funds WHERE id = p_fund_id;
  IF v_asset IS NULL THEN
    RAISE EXCEPTION 'Fund not found %', p_fund_id;
  END IF;

  v_new := coalesce(v_prev,0) + coalesce(p_delta,0);

  -- record adjustment transaction
  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, type, asset, fund_class,
    amount, tx_date, value_date, reference_id, notes, created_by, created_at
  ) VALUES (
    gen_random_uuid(), p_investor_id, p_fund_id, 'ADJUSTMENT', v_asset, v_asset,
    p_delta, now()::date, now()::date, 'position_adjustment', coalesce(p_note, ''), p_admin_id, now()
  );

  -- update position
  UPDATE investor_positions
  SET current_value = v_new,
      shares = shares + coalesce(p_delta,0),
      updated_at = now()
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  investor_id := p_investor_id;
  fund_id := p_fund_id;
  previous_balance := coalesce(v_prev,0);
  new_balance := v_new;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid) TO authenticated, service_role;
