
-- ============================================================
-- COST_BASIS INTEGRITY FIX - COMPREHENSIVE MIGRATION
-- Implements: Canonical projection, enforcement guards, repair tools
-- ============================================================

-- ============================================================
-- PHASE 0: DROP EXISTING FUNCTIONS THAT NEED SIGNATURE CHANGES
-- ============================================================
DROP FUNCTION IF EXISTS public.recompute_investor_position(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.run_integrity_pack() CASCADE;

-- ============================================================
-- PHASE 1: CANONICAL PROJECTION FUNCTIONS
-- ============================================================

-- 1.1 Read-only projection function
CREATE OR REPLACE FUNCTION public.compute_position_from_ledger(
  p_investor_id uuid,
  p_fund_id uuid,
  p_as_of timestamptz DEFAULT now()
)
RETURNS jsonb AS $$
DECLARE
  v_deposits numeric;
  v_withdrawals numeric;
  v_yield numeric;
  v_fees numeric;
  v_ib_credits numeric;
  v_current_value numeric;
  v_cost_basis numeric;
  v_shares numeric;
BEGIN
  -- Calculate all components from ledger
  SELECT
    COALESCE(SUM(CASE WHEN type = 'DEPOSIT' AND NOT is_voided THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' AND NOT is_voided THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type IN ('YIELD', 'INTEREST') AND NOT is_voided THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type IN ('FEE', 'IB_DEBIT') AND NOT is_voided THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type IN ('IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT') AND NOT is_voided THEN amount ELSE 0 END), 0)
  INTO v_deposits, v_withdrawals, v_yield, v_fees, v_ib_credits
  FROM transactions_v2
  WHERE investor_id = p_investor_id 
    AND fund_id = p_fund_id
    AND created_at <= p_as_of;

  -- Policy: cost_basis = deposits - withdrawals (excludes yield/fees)
  v_cost_basis := v_deposits - v_withdrawals;
  
  -- Policy: current_value = deposits - withdrawals + yield - fees + credits
  v_current_value := v_deposits - v_withdrawals + v_yield - v_fees + v_ib_credits;
  
  -- shares = current_value (1:1 NAV model)
  v_shares := v_current_value;

  RETURN jsonb_build_object(
    'investor_id', p_investor_id,
    'fund_id', p_fund_id,
    'as_of', p_as_of,
    'breakdown', jsonb_build_object(
      'deposits', v_deposits,
      'withdrawals', v_withdrawals,
      'yield', v_yield,
      'fees', v_fees,
      'ib_credits', v_ib_credits
    ),
    'computed', jsonb_build_object(
      'cost_basis', v_cost_basis,
      'current_value', v_current_value,
      'shares', v_shares
    )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 1.2 Write function with audit trail
CREATE OR REPLACE FUNCTION public.rebuild_position_from_ledger(
  p_investor_id uuid,
  p_fund_id uuid,
  p_admin_id uuid,
  p_reason text,
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb AS $$
DECLARE
  v_computed jsonb;
  v_old_position record;
  v_new_cost_basis numeric;
  v_new_current_value numeric;
  v_new_shares numeric;
BEGIN
  -- Admin check
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Get computed values
  v_computed := compute_position_from_ledger(p_investor_id, p_fund_id);
  
  v_new_cost_basis := (v_computed->'computed'->>'cost_basis')::numeric;
  v_new_current_value := (v_computed->'computed'->>'current_value')::numeric;
  v_new_shares := (v_computed->'computed'->>'shares')::numeric;

  -- Get old values
  SELECT * INTO v_old_position
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Position not found'
    );
  END IF;

  IF NOT p_dry_run THEN
    -- Set canonical flag to bypass guards
    PERFORM set_canonical_rpc(true);
    
    UPDATE investor_positions
    SET cost_basis = v_new_cost_basis,
        current_value = v_new_current_value,
        shares = v_new_shares,
        updated_at = now()
    WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

    -- Reset flag
    PERFORM set_canonical_rpc(false);

    -- Audit log
    INSERT INTO audit_log (action, entity, entity_id, actor_user, meta, old_values, new_values)
    VALUES (
      'position_rebuild_from_ledger',
      'investor_positions',
      p_investor_id::text || '_' || p_fund_id::text,
      p_admin_id,
      jsonb_build_object('reason', p_reason, 'breakdown', v_computed->'breakdown'),
      jsonb_build_object(
        'cost_basis', v_old_position.cost_basis,
        'current_value', v_old_position.current_value,
        'shares', v_old_position.shares
      ),
      jsonb_build_object(
        'cost_basis', v_new_cost_basis,
        'current_value', v_new_current_value,
        'shares', v_new_shares
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'dry_run', p_dry_run,
    'old', jsonb_build_object(
      'cost_basis', v_old_position.cost_basis,
      'current_value', v_old_position.current_value,
      'shares', v_old_position.shares
    ),
    'new', jsonb_build_object(
      'cost_basis', v_new_cost_basis,
      'current_value', v_new_current_value,
      'shares', v_new_shares
    ),
    'breakdown', v_computed->'breakdown'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- PHASE 2: REMOVE SILENT AUTO-HEAL (BLOCK, DON'T HEAL)
-- ============================================================

DROP TRIGGER IF EXISTS trg_auto_heal_position ON transactions_v2;
DROP FUNCTION IF EXISTS auto_heal_position_from_ledger() CASCADE;

-- ============================================================
-- PHASE 3: ENFORCEMENT GUARD - BLOCK NON-CANONICAL WRITES
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_canonical_position_write()
RETURNS trigger AS $$
BEGIN
  -- Check if this is a canonical RPC call
  IF current_setting('app.canonical_rpc', true) = 'true' OR
     current_setting('indigo.canonical_rpc', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Check if cost_basis, current_value, or shares are actually changing
  IF TG_OP = 'UPDATE' THEN
    IF OLD.cost_basis IS NOT DISTINCT FROM NEW.cost_basis AND
       OLD.current_value IS NOT DISTINCT FROM NEW.current_value AND
       OLD.shares IS NOT DISTINCT FROM NEW.shares THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Block the write and log
  INSERT INTO audit_log (action, entity, entity_id, meta)
  VALUES (
    'BLOCKED_DIRECT_POSITION_WRITE',
    'investor_positions',
    COALESCE(NEW.investor_id::text, 'unknown') || '_' || COALESCE(NEW.fund_id::text, 'unknown'),
    jsonb_build_object(
      'attempted_cost_basis', NEW.cost_basis,
      'attempted_current_value', NEW.current_value,
      'attempted_shares', NEW.shares,
      'old_cost_basis', CASE WHEN TG_OP = 'UPDATE' THEN OLD.cost_basis ELSE NULL END,
      'old_current_value', CASE WHEN TG_OP = 'UPDATE' THEN OLD.current_value ELSE NULL END,
      'session_user', session_user,
      'blocked_at', now()
    )
  );

  RAISE EXCEPTION 'Direct writes to investor_positions (cost_basis, current_value, shares) are blocked. Use canonical RPCs which call recompute_investor_position.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_canonical_position_write ON investor_positions;

CREATE TRIGGER trg_enforce_canonical_position_write
  BEFORE INSERT OR UPDATE ON investor_positions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_canonical_position_write();

-- ============================================================
-- PHASE 4: CANONICAL recompute_investor_position WITH FLAG
-- ============================================================

CREATE OR REPLACE FUNCTION public.recompute_investor_position(
  p_investor_id uuid,
  p_fund_id uuid
)
RETURNS void AS $$
DECLARE
  v_deposits numeric;
  v_withdrawals numeric;
  v_yield numeric;
  v_fees numeric;
  v_ib_credits numeric;
  v_cost_basis numeric;
  v_current_value numeric;
  v_shares numeric;
BEGIN
  -- Calculate all components from ledger
  SELECT
    COALESCE(SUM(CASE WHEN type = 'DEPOSIT' AND NOT is_voided THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' AND NOT is_voided THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type IN ('YIELD', 'INTEREST') AND NOT is_voided THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type IN ('FEE', 'IB_DEBIT') AND NOT is_voided THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type IN ('IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT') AND NOT is_voided THEN amount ELSE 0 END), 0)
  INTO v_deposits, v_withdrawals, v_yield, v_fees, v_ib_credits
  FROM transactions_v2
  WHERE investor_id = p_investor_id 
    AND fund_id = p_fund_id;

  -- Policy: cost_basis = deposits - withdrawals
  v_cost_basis := v_deposits - v_withdrawals;
  
  -- Policy: current_value = deposits - withdrawals + yield - fees + credits
  v_current_value := v_deposits - v_withdrawals + v_yield - v_fees + v_ib_credits;
  
  -- shares = current_value (1:1 NAV)
  v_shares := v_current_value;

  -- Set canonical flag to bypass enforcement trigger
  PERFORM set_canonical_rpc(true);

  -- Upsert the position
  INSERT INTO investor_positions (investor_id, fund_id, cost_basis, current_value, shares, updated_at)
  VALUES (p_investor_id, p_fund_id, v_cost_basis, v_current_value, v_shares, now())
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    cost_basis = EXCLUDED.cost_basis,
    current_value = EXCLUDED.current_value,
    shares = EXCLUDED.shares,
    updated_at = now();

  -- Reset flag
  PERFORM set_canonical_rpc(false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- PHASE 5: SINGLE CANONICAL TRIGGER ON transactions_v2
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_recompute_position()
RETURNS trigger AS $$
DECLARE
  v_investor_id uuid;
  v_fund_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_investor_id := OLD.investor_id;
    v_fund_id := OLD.fund_id;
  ELSE
    v_investor_id := NEW.investor_id;
    v_fund_id := NEW.fund_id;
  END IF;

  IF v_investor_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  PERFORM public.recompute_investor_position(v_investor_id, v_fund_id);

  IF TG_OP = 'UPDATE' AND 
     (OLD.investor_id IS DISTINCT FROM NEW.investor_id OR OLD.fund_id IS DISTINCT FROM NEW.fund_id) THEN
    IF OLD.investor_id IS NOT NULL THEN
      PERFORM public.recompute_investor_position(OLD.investor_id, OLD.fund_id);
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_recompute_position_on_tx ON transactions_v2;
DROP TRIGGER IF EXISTS trg_auto_recompute_position ON transactions_v2;

CREATE TRIGGER trg_recompute_position_on_tx
  AFTER INSERT OR UPDATE OR DELETE ON transactions_v2
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_position();

-- ============================================================
-- PHASE 6: ENHANCED INTEGRITY VIEW
-- ============================================================

DROP VIEW IF EXISTS v_cost_basis_mismatch CASCADE;

CREATE OR REPLACE VIEW v_cost_basis_mismatch AS
SELECT 
  ip.investor_id,
  ip.fund_id,
  f.code AS fund_code,
  p.email AS investor_email,
  TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS investor_name,
  ip.cost_basis AS position_cost_basis,
  computed.cost_basis AS computed_cost_basis,
  ip.current_value AS position_current_value,
  computed.current_value AS computed_current_value,
  ip.shares AS position_shares,
  computed.shares AS computed_shares,
  ip.cost_basis - computed.cost_basis AS cost_basis_variance,
  ip.current_value - computed.current_value AS current_value_variance,
  CASE 
    WHEN computed.cost_basis > 0 
    THEN ROUND(((ip.cost_basis - computed.cost_basis) / computed.cost_basis * 100)::numeric, 2)
    ELSE 0 
  END AS cost_basis_variance_pct
FROM investor_positions ip
JOIN funds f ON f.id = ip.fund_id
JOIN profiles p ON p.id = ip.investor_id
CROSS JOIN LATERAL (
  SELECT 
    COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' AND NOT t.is_voided THEN t.amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' AND NOT t.is_voided THEN ABS(t.amount) ELSE 0 END), 0) AS cost_basis,
    COALESCE(SUM(CASE 
      WHEN t.type IN ('DEPOSIT', 'YIELD', 'INTEREST', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT') AND NOT t.is_voided THEN t.amount
      WHEN t.type IN ('WITHDRAWAL', 'FEE', 'IB_DEBIT', 'INTERNAL_WITHDRAWAL') AND NOT t.is_voided THEN t.amount
      ELSE 0
    END), 0) AS current_value,
    COALESCE(SUM(CASE 
      WHEN t.type IN ('DEPOSIT', 'YIELD', 'INTEREST', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT') AND NOT t.is_voided THEN t.amount
      WHEN t.type IN ('WITHDRAWAL', 'FEE', 'IB_DEBIT', 'INTERNAL_WITHDRAWAL') AND NOT t.is_voided THEN t.amount
      ELSE 0
    END), 0) AS shares
  FROM transactions_v2 t
  WHERE t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
) computed
WHERE ABS(ip.cost_basis - computed.cost_basis) > 0.01 
   OR ABS(ip.current_value - computed.current_value) > 0.01
   OR ABS(ip.shares - computed.shares) > 0.01;

-- ============================================================
-- PHASE 7: AUDITED REPAIR FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.fix_cost_basis_anomalies(
  p_admin_id uuid,
  p_reason text DEFAULT 'Ledger projection repair',
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb AS $$
DECLARE
  v_fixed_count integer := 0;
  v_positions_fixed jsonb := '[]'::jsonb;
  v_position record;
  v_rebuild_result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  FOR v_position IN 
    SELECT * FROM v_cost_basis_mismatch
  LOOP
    v_rebuild_result := rebuild_position_from_ledger(
      v_position.investor_id,
      v_position.fund_id,
      p_admin_id,
      p_reason,
      p_dry_run
    );

    v_positions_fixed := v_positions_fixed || jsonb_build_object(
      'investor_name', v_position.investor_name,
      'fund_code', v_position.fund_code,
      'old_cost_basis', v_position.position_cost_basis,
      'new_cost_basis', v_position.computed_cost_basis,
      'old_current_value', v_position.position_current_value,
      'new_current_value', v_position.computed_current_value,
      'dry_run', p_dry_run,
      'result', v_rebuild_result
    );
    v_fixed_count := v_fixed_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fixed_count', v_fixed_count,
    'dry_run', p_dry_run,
    'positions', v_positions_fixed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- PHASE 8: INTEGRITY PACK WITH COST_BASIS CHECK
-- ============================================================

CREATE OR REPLACE FUNCTION public.run_integrity_pack()
RETURNS jsonb AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_check_count integer;
BEGIN
  -- Cost basis mismatch check
  SELECT COUNT(*) INTO v_check_count FROM v_cost_basis_mismatch;
  v_result := v_result || jsonb_build_object(
    'cost_basis_mismatch', jsonb_build_object(
      'count', v_check_count,
      'status', CASE WHEN v_check_count = 0 THEN 'pass' ELSE 'fail' END,
      'severity', 'error'
    )
  );

  -- Ledger reconciliation check
  SELECT COUNT(*) INTO v_check_count FROM v_ledger_reconciliation WHERE ABS(variance) > 0.01;
  v_result := v_result || jsonb_build_object(
    'ledger_reconciliation', jsonb_build_object(
      'count', v_check_count,
      'status', CASE WHEN v_check_count = 0 THEN 'pass' ELSE 'fail' END,
      'severity', 'error'
    )
  );

  -- Orphaned positions check
  SELECT COUNT(*) INTO v_check_count FROM v_orphaned_positions;
  v_result := v_result || jsonb_build_object(
    'orphaned_positions', jsonb_build_object(
      'count', v_check_count,
      'status', CASE WHEN v_check_count = 0 THEN 'pass' ELSE 'warn' END,
      'severity', 'warning'
    )
  );

  -- Yield conservation check
  SELECT COUNT(*) INTO v_check_count FROM v_yield_conservation_violations;
  v_result := v_result || jsonb_build_object(
    'yield_conservation', jsonb_build_object(
      'count', v_check_count,
      'status', CASE WHEN v_check_count = 0 THEN 'pass' ELSE 'fail' END,
      'severity', 'error'
    )
  );

  RETURN jsonb_build_object(
    'run_at', now(),
    'checks', v_result,
    'overall_status', CASE 
      WHEN v_result @> '{"cost_basis_mismatch":{"status":"fail"}}' THEN 'fail'
      WHEN v_result @> '{"ledger_reconciliation":{"status":"fail"}}' THEN 'fail'
      WHEN v_result @> '{"yield_conservation":{"status":"fail"}}' THEN 'fail'
      ELSE 'pass'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION compute_position_from_ledger(uuid, uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION rebuild_position_from_ledger(uuid, uuid, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION fix_cost_basis_anomalies(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION run_integrity_pack() TO authenticated;
GRANT EXECUTE ON FUNCTION recompute_investor_position(uuid, uuid) TO authenticated;
