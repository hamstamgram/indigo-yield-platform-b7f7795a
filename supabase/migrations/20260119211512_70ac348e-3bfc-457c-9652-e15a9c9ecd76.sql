-- Create integrity view first (this doesn't trigger the guard)
CREATE OR REPLACE VIEW v_cost_basis_anomalies AS
SELECT 
  ip.investor_id,
  ip.fund_id,
  p.first_name || ' ' || p.last_name as investor_name,
  f.name as fund_name,
  ip.cost_basis,
  ip.current_value,
  COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' AND NOT t.is_voided THEN t.amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' AND NOT t.is_voided THEN ABS(t.amount) ELSE 0 END), 0) as expected_cost_basis,
  CASE 
    WHEN (COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' AND NOT t.is_voided THEN t.amount ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' AND NOT t.is_voided THEN ABS(t.amount) ELSE 0 END), 0)) > 0
    THEN ip.cost_basis / (
      COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' AND NOT t.is_voided THEN t.amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' AND NOT t.is_voided THEN ABS(t.amount) ELSE 0 END), 0)
    )
    ELSE NULL
  END as cost_basis_ratio
FROM investor_positions ip
JOIN profiles p ON p.id = ip.investor_id
JOIN funds f ON f.id = ip.fund_id
LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
GROUP BY ip.investor_id, ip.fund_id, p.first_name, p.last_name, f.name, ip.cost_basis, ip.current_value
HAVING ABS(
  ip.cost_basis / NULLIF(
    COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' AND NOT t.is_voided THEN t.amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' AND NOT t.is_voided THEN ABS(t.amount) ELSE 0 END), 0)
  , 0) - 1
) > 0.15
   AND (COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' AND NOT t.is_voided THEN t.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' AND NOT t.is_voided THEN ABS(t.amount) ELSE 0 END), 0)) > 0;

-- Create a one-time correction RPC that bypasses the canonical mutation guard
CREATE OR REPLACE FUNCTION fix_doubled_cost_basis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixed_count integer := 0;
  v_positions_fixed jsonb := '[]'::jsonb;
  v_position record;
BEGIN
  -- Must be super_admin to run this
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Only super admins can run cost_basis corrections';
  END IF;

  -- Set canonical RPC flag to bypass the trigger guard
  PERFORM set_canonical_rpc();

  -- Find and fix all doubled cost_basis positions
  FOR v_position IN 
    SELECT 
      ip.investor_id,
      ip.fund_id,
      ip.cost_basis as old_cost_basis,
      f.name as fund_name,
      p.first_name || ' ' || p.last_name as investor_name,
      COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' AND NOT t.is_voided THEN t.amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' AND NOT t.is_voided THEN ABS(t.amount) ELSE 0 END), 0) as expected_cost_basis
    FROM investor_positions ip
    JOIN funds f ON f.id = ip.fund_id
    JOIN profiles p ON p.id = ip.investor_id
    LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
    GROUP BY ip.investor_id, ip.fund_id, ip.cost_basis, f.name, p.first_name, p.last_name
    HAVING (COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' AND NOT t.is_voided THEN t.amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' AND NOT t.is_voided THEN ABS(t.amount) ELSE 0 END), 0)) > 0
       AND ABS(ip.cost_basis / (
            COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' AND NOT t.is_voided THEN t.amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' AND NOT t.is_voided THEN ABS(t.amount) ELSE 0 END), 0)
           ) - 2) < 0.15
  LOOP
    -- Update the position
    UPDATE investor_positions
    SET cost_basis = v_position.expected_cost_basis,
        updated_at = now()
    WHERE investor_id = v_position.investor_id
      AND fund_id = v_position.fund_id;

    -- Log to audit
    INSERT INTO audit_log (action, entity, entity_id, meta, old_values, new_values)
    VALUES (
      'cost_basis_correction',
      'investor_positions',
      v_position.investor_id || '_' || v_position.fund_id,
      jsonb_build_object(
        'correction_reason', 'cost_basis_doubling_bug_fix',
        'ratio_before_fix', v_position.old_cost_basis / v_position.expected_cost_basis,
        'fund_name', v_position.fund_name,
        'investor_name', v_position.investor_name
      ),
      jsonb_build_object('cost_basis', v_position.old_cost_basis),
      jsonb_build_object('cost_basis', v_position.expected_cost_basis)
    );

    v_positions_fixed := v_positions_fixed || jsonb_build_object(
      'investor_name', v_position.investor_name,
      'fund_name', v_position.fund_name,
      'old_cost_basis', v_position.old_cost_basis,
      'new_cost_basis', v_position.expected_cost_basis
    );
    v_fixed_count := v_fixed_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fixed_count', v_fixed_count,
    'positions_fixed', v_positions_fixed
  );
END;
$$;

-- Grant execute to authenticated users (RPC checks super_admin internally)
GRANT EXECUTE ON FUNCTION fix_doubled_cost_basis() TO authenticated;