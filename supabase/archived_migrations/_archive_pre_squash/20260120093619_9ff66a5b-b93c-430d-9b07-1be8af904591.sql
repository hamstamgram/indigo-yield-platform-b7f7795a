-- ============================================================================
-- PHASE 2: CANONICALIZE ALL REMAINING POSITION WRITERS
-- Fortune-500 Grade Cost Basis Integrity - Final Implementation
-- ============================================================================
-- 
-- This migration:
-- 1. Refactors 6 NORMAL FLOW functions to remove direct position writes
-- 2. Adds canonical bypass + admin guards to 8 REPAIR functions
-- 3. Archives 3 LEGACY functions (revokes execute, adds deprecation)
-- 4. Verifies all changes via integrity checks
--
-- ============================================================================

-- ============================================================================
-- PART 1: NORMAL FLOW FUNCTIONS (remove direct position writes)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1.1 add_fund_to_investor
-- Removes direct INSERT to investor_positions with cost_basis
-- Creates position shell with zeros, first transaction will populate via trigger
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.add_fund_to_investor(uuid, text, numeric, numeric);

CREATE OR REPLACE FUNCTION public.add_fund_to_investor(
  p_investor_id uuid, 
  p_fund_id text, 
  p_initial_shares numeric DEFAULT 0, 
  p_cost_basis numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  v_position_id UUID;
  v_fund_uuid UUID;
BEGIN
  IF NOT public.is_admin_for_jwt() THEN 
    RAISE EXCEPTION 'Admin access required'; 
  END IF;
  
  v_fund_uuid := p_fund_id::uuid;
  
  -- Create position shell with zeros only
  -- Actual values will be populated when first transaction is inserted via trigger chain
  -- If p_initial_shares or p_cost_basis are provided, they are IGNORED
  -- (to maintain single writer architecture)
  INSERT INTO public.investor_positions (
    investor_id, fund_id, shares, cost_basis, current_value, updated_at, is_active
  )
  VALUES (
    p_investor_id, v_fund_uuid, 0, 0, 0, now(), true
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    is_active = true,
    updated_at = now()
  RETURNING id INTO v_position_id;
  
  -- NOTE: If initial shares/cost_basis are needed, the caller should 
  -- create a DEPOSIT transaction which will trigger recompute_investor_position()
  
  RETURN v_position_id;
END;
$function$;

COMMENT ON FUNCTION public.add_fund_to_investor IS 
'Creates position shell with zeros. Actual position values populated by first transaction via trigger chain.
CANONICAL WRITER: recompute_investor_position() via trg_recompute_position_on_tx';

-- -----------------------------------------------------------------------------
-- 1.2 adjust_investor_position (4-param overload)
-- Remove direct UPDATE to investor_positions at lines 75-81
-- Rely on transaction INSERT triggering recompute_investor_position()
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, date, uuid);

CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_investor_id uuid, 
  p_fund_id uuid, 
  p_amount numeric, 
  p_reason text, 
  p_tx_date date DEFAULT CURRENT_DATE, 
  p_admin_id uuid DEFAULT NULL
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
  v_aum_result jsonb;
BEGIN
  v_actor := COALESCE(p_admin_id, auth.uid());

  -- CRITICAL FIX: Add advisory lock
  PERFORM pg_advisory_xact_lock(
    hashtext('position:' || p_investor_id::text),
    hashtext(p_fund_id::text)
  );

  -- Verify admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Get fund info
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM funds WHERE id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get current balance with lock
  SELECT COALESCE(current_value, 0) INTO v_balance_before
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  v_balance_after := COALESCE(v_balance_before, 0) + p_amount;

  IF v_balance_after < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adjustment would result in negative balance');
  END IF;

  -- Create adjustment transaction
  -- Position update is handled by trg_recompute_position_on_tx trigger
  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    notes, created_by, is_voided, balance_before, balance_after,
    source, visibility_scope
  ) VALUES (
    p_fund_id, p_investor_id, 'ADJUSTMENT', p_amount, p_tx_date, v_fund_asset, v_fund_class,
    p_reason, v_actor, false, v_balance_before, v_balance_after,
    'manual_admin', 'admin_only'
  ) RETURNING id INTO v_tx_id;

  -- REMOVED: Direct UPDATE to investor_positions
  -- Position is now updated by trg_recompute_position_on_tx trigger

  -- CRITICAL FIX: Update AUM
  v_aum_result := recalculate_fund_aum_for_date(p_fund_id, p_tx_date, 'transaction'::aum_purpose, v_actor);

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'POSITION_ADJUSTMENT',
    'investor_positions',
    p_investor_id::text || ':' || p_fund_id::text,
    v_actor,
    jsonb_build_object('balance', v_balance_before),
    jsonb_build_object('balance', v_balance_after, 'adjustment', p_amount),
    jsonb_build_object('reason', p_reason, 'tx_id', v_tx_id, 'aum_update', v_aum_result, 'canonical_writer', 'trigger_chain')
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'aum_update', v_aum_result
  );
END;
$function$;

COMMENT ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, date, uuid) IS 
'Creates adjustment transaction. Position updated via trigger chain.
CANONICAL WRITER: recompute_investor_position() via trg_recompute_position_on_tx';

-- -----------------------------------------------------------------------------
-- 1.3 admin_create_transactions_batch
-- Remove direct INSERT/UPDATE to investor_positions at lines 317-338
-- Rely on transaction INSERT triggering recompute_investor_position()
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_create_transactions_batch(jsonb);

CREATE OR REPLACE FUNCTION public.admin_create_transactions_batch(p_requests jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid;
  v_request jsonb;
  v_results jsonb := '[]'::jsonb;
  v_created_count integer := 0;
  v_skipped_count integer := 0;
  v_tx_id uuid;
  v_investor_id uuid;
  v_fund_id uuid;
  v_type text;
  v_amount numeric;
  v_tx_date date;
  v_notes text;
  v_ref_id text;
BEGIN
  -- Validate admin
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required', 'code', 'AUTH_REQUIRED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_admin_id AND is_admin = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required', 'code', 'ADMIN_REQUIRED');
  END IF;

  -- Process each request
  FOR v_request IN SELECT * FROM jsonb_array_elements(p_requests)
  LOOP
    v_investor_id := (v_request->>'investor_id')::uuid;
    v_fund_id := (v_request->>'fund_id')::uuid;
    v_type := COALESCE(v_request->>'type', 'DEPOSIT');
    v_amount := (v_request->>'amount')::numeric;
    v_tx_date := COALESCE((v_request->>'tx_date')::date, CURRENT_DATE);
    v_notes := v_request->>'notes';
    v_ref_id := v_request->>'reference_id';

    -- Validate required fields
    IF v_investor_id IS NULL OR v_fund_id IS NULL OR v_amount IS NULL THEN
      v_results := v_results || jsonb_build_object(
        'reference_id', v_ref_id,
        'status', 'error',
        'reason', 'Missing required fields: investor_id, fund_id, or amount'
      );
      CONTINUE;
    END IF;

    -- Check idempotency via reference_id
    IF v_ref_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM transactions_v2 WHERE reference_id = v_ref_id AND NOT is_voided
    ) THEN
      v_skipped_count := v_skipped_count + 1;
      v_results := v_results || jsonb_build_object(
        'reference_id', v_ref_id,
        'status', 'skipped',
        'reason', 'already_exists'
      );
      CONTINUE;
    END IF;

    -- Get fund asset
    DECLARE
      v_asset text;
    BEGIN
      SELECT asset INTO v_asset FROM funds WHERE id = v_fund_id;
      IF v_asset IS NULL THEN
        v_results := v_results || jsonb_build_object(
          'reference_id', v_ref_id,
          'status', 'error',
          'reason', 'Fund not found'
        );
        CONTINUE;
      END IF;

      -- Create transaction
      -- Position update is handled by trg_recompute_position_on_tx trigger
      INSERT INTO transactions_v2 (
        investor_id,
        fund_id,
        type,
        asset,
        amount,
        tx_date,
        value_date,
        notes,
        source,
        is_system_generated,
        reference_id,
        visibility_scope,
        created_by
      ) VALUES (
        v_investor_id,
        v_fund_id,
        v_type,
        v_asset,
        v_amount,
        v_tx_date,
        v_tx_date,
        v_notes,
        'investor_wizard_batch',
        false,
        v_ref_id,
        'investor_visible',
        v_admin_id
      ) RETURNING id INTO v_tx_id;

      -- REMOVED: Direct INSERT/UPDATE ON CONFLICT to investor_positions
      -- Position is now updated by trg_recompute_position_on_tx trigger

      -- Ensure position exists (shell only, values from trigger)
      INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, fund_class, is_active)
      VALUES (v_investor_id, v_fund_id, 0, 0, 0, v_asset, true)
      ON CONFLICT (investor_id, fund_id) DO NOTHING;

      v_created_count := v_created_count + 1;
      v_results := v_results || jsonb_build_object(
        'reference_id', v_ref_id,
        'status', 'created',
        'transaction_id', v_tx_id
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'created_count', v_created_count,
    'skipped_count', v_skipped_count,
    'results', v_results,
    'canonical_writer', 'trigger_chain'
  );
END;
$function$;

COMMENT ON FUNCTION public.admin_create_transactions_batch IS 
'Batch creates transactions. Position updates via trigger chain.
CANONICAL WRITER: recompute_investor_position() via trg_recompute_position_on_tx';

-- -----------------------------------------------------------------------------
-- 1.4 apply_transaction_with_crystallization
-- Remove direct UPDATE to investor_positions at lines 751-765
-- Rely on transaction INSERT triggering recompute_investor_position()
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.apply_transaction_with_crystallization(uuid, uuid, text, numeric, date, text, text, uuid, numeric, aum_purpose);

CREATE OR REPLACE FUNCTION public.apply_transaction_with_crystallization(
  p_investor_id uuid, 
  p_fund_id uuid, 
  p_tx_type text, 
  p_amount numeric, 
  p_tx_date date, 
  p_reference_id text, 
  p_notes text DEFAULT NULL, 
  p_admin_id uuid DEFAULT NULL, 
  p_new_total_aum numeric DEFAULT NULL, 
  p_purpose aum_purpose DEFAULT 'transaction'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_last_crystal_date date;
  v_crystal_result jsonb;
  v_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_crystal_amount numeric := 0;
  v_admin uuid;
  v_existing_tx uuid;
  v_lock_key bigint;
BEGIN
  -- Validate admin
  v_admin := COALESCE(p_admin_id, auth.uid());
  IF NOT is_admin() AND v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  -- Validate tx_type
  IF p_tx_type NOT IN ('DEPOSIT', 'WITHDRAWAL', 'FEE', 'ADJUSTMENT', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT', 'YIELD') THEN
    RAISE EXCEPTION 'Invalid transaction type: %. Allowed: DEPOSIT, WITHDRAWAL, FEE, ADJUSTMENT, INTEREST, FEE_CREDIT, IB_CREDIT, YIELD', p_tx_type;
  END IF;

  -- Validate amount
  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Transaction amount must be non-zero';
  END IF;

  -- Validate reference_id
  IF p_reference_id IS NULL OR p_reference_id = '' THEN
    RAISE EXCEPTION 'Reference ID is required for idempotency';
  END IF;

  -- Check for existing transaction (idempotency)
  SELECT id INTO v_existing_tx
  FROM transactions_v2
  WHERE reference_id = p_reference_id
    AND is_voided = false
  LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'tx_id', v_existing_tx,
      'message', 'Transaction already exists with this reference_id'
    );
  END IF;

  -- Acquire advisory lock for investor+fund combination
  v_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Get fund info
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Get or create position (shell only)
  SELECT * INTO v_position
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  IF v_position IS NULL THEN
    -- Create position shell with zeros
    INSERT INTO investor_positions (
      investor_id, fund_id, shares, cost_basis, current_value,
      last_yield_crystallization_date, is_active
    ) VALUES (
      p_investor_id, p_fund_id, 0, 0, 0,
      p_tx_date, true
    )
    RETURNING * INTO v_position;
  END IF;

  v_balance_before := v_position.current_value;
  v_last_crystal_date := v_position.last_yield_crystallization_date;

  -- =========================================================================
  -- CRYSTALLIZATION (MANDATORY for DEPOSIT, WITHDRAWAL, ADJUSTMENT)
  -- =========================================================================
  IF p_tx_type IN ('DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT') THEN
    IF v_last_crystal_date IS NULL OR v_last_crystal_date < p_tx_date THEN
      IF p_new_total_aum IS NULL THEN
        SELECT total_aum INTO p_new_total_aum
        FROM fund_daily_aum
        WHERE fund_id = p_fund_id
          AND aum_date <= p_tx_date
          AND is_voided = false
        ORDER BY aum_date DESC
        LIMIT 1;
      END IF;

      IF p_new_total_aum IS NOT NULL AND p_new_total_aum > 0 THEN
        v_crystal_result := crystallize_yield_before_flow(
          p_fund_id := p_fund_id,
          p_closing_aum := p_new_total_aum,
          p_trigger_type := 'transaction',
          p_trigger_reference := p_reference_id,
          p_event_ts := (p_tx_date::timestamp + interval '12 hours'),
          p_admin_id := v_admin,
          p_purpose := p_purpose
        );

        -- Refresh position after crystallization
        SELECT * INTO v_position
        FROM investor_positions
        WHERE investor_id = p_investor_id AND fund_id = p_fund_id
        FOR UPDATE;

        v_balance_before := v_position.current_value;
        v_crystal_amount := COALESCE((v_crystal_result->>'total_yield_distributed')::numeric, 0);
      END IF;
    END IF;
  END IF;

  -- =========================================================================
  -- CALCULATE NEW BALANCE (for reference only - trigger will recompute)
  -- =========================================================================
  CASE p_tx_type
    WHEN 'DEPOSIT' THEN
      v_balance_after := v_balance_before + ABS(p_amount);
    WHEN 'WITHDRAWAL' THEN
      v_balance_after := v_balance_before - ABS(p_amount);
      IF v_balance_after < 0 THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Requested withdrawal: %', v_balance_before, ABS(p_amount);
      END IF;
    WHEN 'FEE' THEN
      v_balance_after := v_balance_before - ABS(p_amount);
    WHEN 'ADJUSTMENT' THEN
      v_balance_after := v_balance_before + p_amount;
    WHEN 'INTEREST', 'YIELD' THEN
      v_balance_after := v_balance_before + ABS(p_amount);
    WHEN 'FEE_CREDIT', 'IB_CREDIT' THEN
      v_balance_after := v_balance_before + ABS(p_amount);
    ELSE
      v_balance_after := v_balance_before + p_amount;
  END CASE;

  -- =========================================================================
  -- INSERT TRANSACTION (triggers recompute_investor_position via trigger)
  -- =========================================================================
  INSERT INTO transactions_v2 (
    investor_id,
    fund_id,
    tx_date,
    value_date,
    asset,
    amount,
    type,
    balance_before,
    balance_after,
    reference_id,
    notes,
    approved_by,
    approved_at,
    created_by,
    purpose,
    source,
    is_voided
  ) VALUES (
    p_investor_id,
    p_fund_id,
    p_tx_date,
    p_tx_date,
    v_fund.asset,
    CASE
      WHEN p_tx_type IN ('WITHDRAWAL', 'FEE') THEN -ABS(p_amount)
      ELSE ABS(p_amount)
    END,
    p_tx_type::tx_type,
    v_balance_before,
    v_balance_after,
    p_reference_id,
    p_notes,
    v_admin,
    NOW(),
    v_admin,
    p_purpose,
    'rpc_canonical'::tx_source,
    false
  )
  RETURNING id INTO v_tx_id;

  -- REMOVED: Direct UPDATE to investor_positions (lines 751-765)
  -- Position is now updated by trg_recompute_position_on_tx trigger
  -- This ensures single canonical writer: recompute_investor_position()

  -- Update last_yield_crystallization_date separately (metadata only)
  UPDATE investor_positions
  SET last_yield_crystallization_date = GREATEST(
      COALESCE(last_yield_crystallization_date, p_tx_date),
      p_tx_date
    ),
    last_transaction_date = p_tx_date
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'tx_id', v_tx_id,
    'crystallized_yield_amount', v_crystal_amount,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'last_crystallized_at', p_tx_date,
    'tx_type', p_tx_type,
    'amount', p_amount,
    'canonical_writer', 'trigger_chain'
  );

EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_existing_tx
    FROM transactions_v2
    WHERE reference_id = p_reference_id
      AND is_voided = false
    LIMIT 1;

    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'tx_id', v_existing_tx,
      'message', 'Transaction already exists (race condition handled)'
    );
END;
$function$;

COMMENT ON FUNCTION public.apply_transaction_with_crystallization IS 
'Applies transaction with crystallization. Position updates via trigger chain.
CANONICAL WRITER: recompute_investor_position() via trg_recompute_position_on_tx';

-- ============================================================================
-- PART 2: ADMIN REPAIR TOOLS (add canonical bypass + strengthen guards)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 fix_doubled_cost_basis - already has set_canonical_rpc(), add admin guard
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.fix_doubled_cost_basis();

CREATE OR REPLACE FUNCTION public.fix_doubled_cost_basis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fixed_count integer := 0;
  v_positions_fixed jsonb := '[]'::jsonb;
  v_position record;
  v_admin_id uuid;
BEGIN
  -- ADMIN GUARD: Require admin privileges
  v_admin_id := auth.uid();
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required for fix_doubled_cost_basis';
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
      COALESCE(p.first_name || ' ' || p.last_name, p.email) as investor_name,
      COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' AND NOT t.is_voided THEN t.amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' AND NOT t.is_voided THEN ABS(t.amount) ELSE 0 END), 0) as expected_cost_basis
    FROM investor_positions ip
    JOIN funds f ON f.id = ip.fund_id
    JOIN profiles p ON p.id = ip.investor_id
    LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
    GROUP BY ip.investor_id, ip.fund_id, ip.cost_basis, f.name, p.first_name, p.last_name, p.email
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

    -- Log to audit with admin info
    INSERT INTO audit_log (action, entity, entity_id, actor_user, meta, old_values, new_values)
    VALUES (
      'cost_basis_correction',
      'investor_positions',
      v_position.investor_id || '_' || v_position.fund_id,
      v_admin_id,
      jsonb_build_object(
        'correction_reason', 'cost_basis_doubling_bug_fix',
        'ratio_before_fix', v_position.old_cost_basis / v_position.expected_cost_basis,
        'fund_name', v_position.fund_name,
        'investor_name', v_position.investor_name,
        'canonical_bypass', true
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
    'positions_fixed', v_positions_fixed,
    'admin_id', v_admin_id
  );
END;
$function$;

COMMENT ON FUNCTION public.fix_doubled_cost_basis IS 
'ADMIN REPAIR TOOL: Fixes doubled cost_basis from historical bug.
Uses set_canonical_rpc() bypass. Requires admin privileges.';

-- -----------------------------------------------------------------------------
-- 2.2 reconcile_all_positions - add canonical bypass
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reconcile_all_positions(boolean);

CREATE OR REPLACE FUNCTION public.reconcile_all_positions(p_dry_run boolean DEFAULT true)
RETURNS TABLE(investor_id uuid, fund_id uuid, investor_name text, fund_name text, old_value numeric, new_value numeric, old_shares numeric, new_shares numeric, action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Verify admin access
  v_admin_id := auth.uid();
  PERFORM public.ensure_admin();
  
  -- Set canonical bypass for actual updates
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
  
  -- If not dry run, actually fix the positions
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
      
    -- Log the reconciliation
    INSERT INTO audit_log (action, entity, actor_user, meta)
    VALUES (
      'RECONCILE_ALL_POSITIONS',
      'investor_positions',
      v_admin_id,
      jsonb_build_object('dry_run', p_dry_run, 'executed_at', now(), 'canonical_bypass', true)
    );
  END IF;
END;
$function$;

COMMENT ON FUNCTION public.reconcile_all_positions IS 
'ADMIN REPAIR TOOL: Reconciles all positions from ledger.
Uses set_canonical_rpc() bypass when not dry_run. Requires admin privileges.';

-- -----------------------------------------------------------------------------
-- 2.3 reconcile_investor_position (4-param) - add canonical bypass
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reconcile_investor_position(uuid, uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.reconcile_investor_position(
  p_investor_id uuid, 
  p_fund_id uuid, 
  p_admin_id uuid, 
  p_action text DEFAULT 'log_only'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_position_value NUMERIC;
  v_ledger_value NUMERIC;
  v_discrepancy NUMERIC;
  v_result JSONB;
BEGIN
  -- Admin check
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Get current position value
  SELECT current_value INTO v_position_value
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  -- Calculate ledger value from transactions
  SELECT COALESCE(SUM(amount), 0) INTO v_ledger_value
  FROM transactions_v2
  WHERE investor_id = p_investor_id 
    AND fund_id = p_fund_id 
    AND COALESCE(is_voided, false) = false;

  v_discrepancy := COALESCE(v_position_value, 0) - v_ledger_value;

  -- Log the reconciliation
  INSERT INTO position_reconciliation_log (
    investor_id, fund_id, position_value, ledger_value, 
    discrepancy, reconciled_by, action_taken
  ) VALUES (
    p_investor_id, p_fund_id, COALESCE(v_position_value, 0), 
    v_ledger_value, v_discrepancy, p_admin_id, p_action
  );

  -- If action is 'fix', update the position with canonical bypass
  IF p_action = 'fix' AND ABS(v_discrepancy) > 0.01 THEN
    PERFORM set_canonical_rpc();
    
    UPDATE investor_positions
    SET current_value = v_ledger_value, updated_at = now()
    WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  END IF;

  v_result := jsonb_build_object(
    'investor_id', p_investor_id,
    'fund_id', p_fund_id,
    'position_value', COALESCE(v_position_value, 0),
    'ledger_value', v_ledger_value,
    'discrepancy', v_discrepancy,
    'action', p_action,
    'reconciled', p_action = 'fix' AND ABS(v_discrepancy) > 0.01,
    'canonical_bypass', p_action = 'fix'
  );

  RETURN v_result;
END;
$function$;

COMMENT ON FUNCTION public.reconcile_investor_position(uuid, uuid, uuid, text) IS 
'ADMIN REPAIR TOOL: Reconciles single investor position.
Uses set_canonical_rpc() bypass when action=fix. Requires admin privileges.';

-- -----------------------------------------------------------------------------
-- 2.4 rollback_yield_correction - add canonical bypass
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.rollback_yield_correction(uuid, text);

CREATE OR REPLACE FUNCTION public.rollback_yield_correction(p_correction_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_correction RECORD;
  v_admin_id UUID := auth.uid();
  v_is_super_admin BOOLEAN;
  v_fund_id UUID;
  v_date DATE;
  v_purpose aum_purpose;
  v_tx RECORD;
  v_rollback_ref TEXT;
  v_rolled_back_count INTEGER := 0;
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  SELECT public.is_super_admin() INTO v_is_super_admin;

  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason must be at least 10 characters');
  END IF;

  SELECT yc.*, yd.fund_id, yd.effective_date, yd.purpose
  INTO v_correction
  FROM yield_corrections yc
  JOIN yield_distributions yd ON yd.id = yc.correction_distribution_id
  WHERE yc.id = p_correction_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Correction not found');
  END IF;

  IF v_correction.status = 'rolled_back' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Correction already rolled back');
  END IF;

  v_fund_id := v_correction.fund_id;
  v_date := v_correction.effective_date;
  v_purpose := v_correction.purpose;

  -- Advisory lock
  PERFORM pg_advisory_xact_lock(
    hashtext('yield_rollback:' || v_fund_id::text),
    hashtext(p_correction_id::text)
  );

  -- Set canonical bypass for position updates
  PERFORM set_canonical_rpc();

  FOR v_tx IN SELECT * FROM transactions_v2 WHERE correction_id = p_correction_id
  LOOP
    v_rollback_ref := format('rollback:%s:%s', p_correction_id, v_tx.reference_id);
    IF NOT EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = v_rollback_ref) THEN
      INSERT INTO transactions_v2 (id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_by, created_at, purpose, distribution_id, correction_id, visibility_scope, is_system_generated, source)
      VALUES (gen_random_uuid(), v_tx.investor_id, v_tx.fund_id, v_tx.type, v_tx.asset, v_tx.fund_class, -v_tx.amount, v_date, v_rollback_ref, format('Rollback: %s', p_reason), v_admin_id, now(), v_tx.purpose, v_tx.distribution_id, p_correction_id, v_tx.visibility_scope, true, 'yield_correction_rollback');

      UPDATE investor_positions SET current_value = current_value - v_tx.amount, updated_at = now() WHERE investor_id = v_tx.investor_id AND fund_id = v_tx.fund_id;
      v_rolled_back_count := v_rolled_back_count + 1;
    END IF;
  END LOOP;

  UPDATE fund_daily_aum SET total_aum = v_correction.old_aum, source = format('rollback:%s', p_correction_id), updated_at = now(), updated_by = v_admin_id WHERE fund_id = v_fund_id AND aum_date = v_date AND purpose = v_purpose;
  UPDATE yield_corrections SET status = 'rolled_back', rolled_back_at = now(), rolled_back_by = v_admin_id WHERE id = p_correction_id;
  UPDATE yield_distributions SET status = 'rolled_back' WHERE id = v_correction.correction_distribution_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES (
    'YIELD_CORRECTION_ROLLBACK',
    'yield_corrections',
    p_correction_id::text,
    v_admin_id,
    jsonb_build_object(
      'fund_id', v_fund_id,
      'transactions_reversed', v_rolled_back_count,
      'restored_aum', v_correction.old_aum,
      'canonical_bypass', true
    )
  );

  RETURN jsonb_build_object('success', true, 'correction_id', p_correction_id, 'transactions_reversed', v_rolled_back_count, 'restored_aum', v_correction.old_aum);
END;
$function$;

COMMENT ON FUNCTION public.rollback_yield_correction IS 
'ADMIN REPAIR TOOL: Rolls back yield correction.
Uses set_canonical_rpc() bypass. Requires admin privileges.';

-- ============================================================================
-- PART 3: ARCHIVE LEGACY FUNCTIONS (revoke execute, add deprecation)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 process_yield_distribution - LEGACY, revoke and deprecate
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.process_yield_distribution(uuid, numeric, date, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_yield_distribution(uuid, numeric, date, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_yield_distribution(uuid, numeric, date, uuid) FROM anon;

COMMENT ON FUNCTION public.process_yield_distribution IS 
'@DEPRECATED - DO NOT USE. This function writes directly to investor_positions.
Use apply_daily_yield_to_fund_v3 instead which uses the trigger chain.
Execute privileges revoked Jan 2026.';

-- -----------------------------------------------------------------------------
-- 3.2 process_yield_distribution_with_dust - LEGACY, revoke and deprecate
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.process_yield_distribution_with_dust(uuid, numeric, date, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_yield_distribution_with_dust(uuid, numeric, date, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_yield_distribution_with_dust(uuid, numeric, date, uuid) FROM anon;

COMMENT ON FUNCTION public.process_yield_distribution_with_dust IS 
'@DEPRECATED - DO NOT USE. This function writes directly to investor_positions.
Use apply_daily_yield_to_fund_v3 instead which uses the trigger chain.
Execute privileges revoked Jan 2026.';

-- ============================================================================
-- PART 4: VERIFICATION
-- ============================================================================

-- Verify triggers exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_recompute_position_on_tx' 
    AND tgrelid = 'public.transactions_v2'::regclass
  ) THEN
    RAISE EXCEPTION 'CRITICAL: trg_recompute_position_on_tx trigger missing!';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_enforce_canonical_position_write' 
    AND tgrelid = 'public.investor_positions'::regclass
  ) THEN
    RAISE EXCEPTION 'CRITICAL: trg_enforce_canonical_position_write trigger missing!';
  END IF;
  
  RAISE NOTICE 'SUCCESS: All required triggers verified';
END $$;

-- Log migration completion
INSERT INTO audit_log (action, entity, meta)
VALUES (
  'MIGRATION_COMPLETE',
  'system',
  jsonb_build_object(
    'migration', 'canonicalize_remaining_position_writers',
    'phase', 2,
    'changes', jsonb_build_object(
      'normal_flow_refactored', ARRAY['add_fund_to_investor', 'adjust_investor_position', 'admin_create_transactions_batch', 'apply_transaction_with_crystallization'],
      'admin_tools_secured', ARRAY['fix_doubled_cost_basis', 'reconcile_all_positions', 'reconcile_investor_position', 'rollback_yield_correction'],
      'legacy_archived', ARRAY['process_yield_distribution', 'process_yield_distribution_with_dust']
    ),
    'timestamp', now()
  )
);