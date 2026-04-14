-- PS-3: Add runtime warnings to dangerous repair functions
-- Goal: Emit warnings when admin repair functions are invoked
-- Context: Operational safety - operators should know they are using admin functions

BEGIN;

-- 1. Add runtime warning to recompute_investor_position
CREATE OR REPLACE FUNCTION "public"."recompute_investor_position"("p_investor_id" "uuid", "p_fund_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_value numeric(38,18);
  v_cost_basis numeric(38,18);
BEGIN
  RAISE NOTICE 'ADMIN REPAIR: Recomputing position for investor % in fund %', p_investor_id, p_fund_id;
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN -1 * ABS(amount)
      ELSE amount
    END
  ), 0) INTO v_current_value
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND investor_id = p_investor_id
    AND is_voided = false;

  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN ABS(amount)
      WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN -1 * ABS(amount)
      WHEN type = 'ADJUSTMENT' THEN amount
      ELSE 0
    END
  ), 0) INTO v_cost_basis
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND investor_id = p_investor_id
    AND is_voided = false;

  IF v_cost_basis < 0 THEN
    v_cost_basis := 0;
  END IF;

  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active, updated_at)
  VALUES (p_investor_id, p_fund_id, v_current_value, v_cost_basis, 0, v_current_value > 0, now())
  ON CONFLICT (investor_id, fund_id)
  DO UPDATE SET
    current_value = EXCLUDED.current_value,
    cost_basis = EXCLUDED.cost_basis,
    is_active = EXCLUDED.is_active,
    updated_at = now();
END;
$$;

-- 2. Add runtime warning to repair_all_positions (NUCLEAR WARNING)
CREATE OR REPLACE FUNCTION "public"."repair_all_positions"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin_id uuid;
  v_count integer := 0;
  v_result jsonb;
BEGIN
  RAISE WARNING 'NUCLEAR OPERATION: Repairing ALL positions in database - this may take significant time';
  PERFORM public.ensure_admin();
  v_admin_id := auth.uid();
  PERFORM set_canonical_rpc(true);

  WITH RECALC AS (
    SELECT 
      t.investor_id, 
      t.fund_id,
      COALESCE(SUM(
        CASE 
          WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN t.amount
          WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(t.amount)
          ELSE 0
        END
      ), 0) as recalculated_value
    FROM transactions_v2 t
    WHERE NOT t.is_voided
    GROUP BY t.investor_id, t.fund_id
  )
  UPDATE investor_positions ip
  SET 
    current_value = rec.recalculated_value,
    updated_at = NOW()
  FROM RECALC rec
  WHERE ip.investor_id = rec.investor_id 
    AND ip.fund_id = rec.fund_id
    AND ip.current_value != rec.recalculated_value;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO audit_log (action, entity, actor_user, meta)
  VALUES (
    'REPAIR_ALL_POSITIONS',
    'investor_positions',
    v_admin_id,
    jsonb_build_object('positions_repaired', v_count, 'executed_at', now(), 'canonical_bypass', true)
  );

  v_result := jsonb_build_object('repaired', v_count, 'status', 'complete');
  RETURN v_result;
END;
$$;

-- 3. Add runtime warning to reconcile_all_positions
CREATE OR REPLACE FUNCTION "public"."reconcile_all_positions"("p_dry_run" boolean DEFAULT true) RETURNS TABLE("investor_id" "uuid", "fund_id" "uuid", "investor_name" "text", "fund_name" "text", "old_value" numeric, "new_value" numeric, "old_shares" numeric, "new_shares" numeric, "action" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  IF NOT p_dry_run THEN
    RAISE WARNING 'ADMIN REPAIR: Running reconcile_all_positions with fixes - this will update %', 
      (SELECT COUNT(*) FROM investor_positions);
  ELSE
    RAISE NOTICE 'ADMIN REPAIR: Running reconcile_all_positions in DRY RUN mode';
  END IF;
  
  v_admin_id := auth.uid();
  PERFORM public.ensure_admin();
  
  IF NOT p_dry_run THEN
    PERFORM set_canonical_rpc();
  END IF;
  
  RETURN QUERY
  WITH ledger_balances AS (
    SELECT 
      t.investor_id, 
      t.fund_id,
      COALESCE(SUM(
        CASE 
          WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN t.amount
          WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(t.amount)
          ELSE 0
        END
      ), 0) as balance
    FROM transactions_v2 t
    WHERE NOT t.is_voided
    GROUP BY t.investor_id, t.fund_id
  ),
  mismatches AS (
    SELECT 
      ip.investor_id,
      ip.fund_id,
      COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown') as investor_name,
      COALESCE(f.name, 'Unknown Fund') as fund_name,
      ip.current_value as old_value,
      COALESCE(lb.balance, 0) as new_value,
      ip.shares as old_shares,
      COALESCE(lb.balance, 0) as new_shares,
      CASE WHEN p_dry_run THEN 'WOULD_UPDATE' ELSE 'UPDATED' END as action
    FROM investor_positions ip
    LEFT JOIN ledger_balances lb ON ip.investor_id = lb.investor_id AND ip.fund_id = lb.fund_id
    LEFT JOIN profiles p ON ip.investor_id = p.id
    LEFT JOIN funds f ON ip.fund_id = f.id
    WHERE ABS(ip.current_value - COALESCE(lb.balance, 0)) > 0.0001
  )
  SELECT * FROM mismatches;
  
  IF NOT p_dry_run THEN
    WITH ledger_balances AS (
      SELECT 
        t.investor_id, 
        t.fund_id,
        COALESCE(SUM(
          CASE 
            WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN t.amount
            WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(t.amount)
            ELSE 0
          END
        ), 0) as balance
      FROM transactions_v2 t
      WHERE NOT t.is_voided
      GROUP BY t.investor_id, t.fund_id
    )
    UPDATE investor_positions ip
    SET 
      current_value = lb.balance,
      shares = lb.balance,
      updated_at = NOW()
    FROM ledger_balances lb
    WHERE ip.investor_id = lb.investor_id 
      AND ip.fund_id = lb.fund_id
      AND ABS(ip.current_value - lb.balance) > 0.0001;
      
    INSERT INTO audit_log (action, entity, actor_user, meta)
    VALUES (
      'RECONCILE_ALL_POSITIONS',
      'investor_positions',
      v_admin_id,
      jsonb_build_object('dry_run', p_dry_run, 'executed_at', now(), 'canonical_bypass', true)
    );
  END IF;
END;
$$;

-- 4. Ensure void_transaction has warning (check existing and update if needed)
-- Read existing function to see if warning is already present
-- (This is informational - the function already has cascade logic)

COMMENT ON FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") IS 
  'ADMIN ONLY: Void single transaction. WARNING: This cascades to ALL related yields, allocations, and AUM. Document invocation reason.';

COMMENT ON FUNCTION "public"."unvoid_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") IS 
  'ADMIN ONLY: Restore voided transaction. Reverses void cascade. Document invocation reason.';

COMMIT;

-- Verify changes
DO $$
BEGIN
  RAISE NOTICE 'PS-3 Runtime Warnings: Migration complete';
  RAISE NOTICE 'Warning: This adds RAISE NOTICE/WARNING to 3 repair functions';
END $$;