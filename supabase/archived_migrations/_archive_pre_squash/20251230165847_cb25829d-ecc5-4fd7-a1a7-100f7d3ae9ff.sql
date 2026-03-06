
-- =============================================================
-- COMPREHENSIVE FIX: Ledger vs Position Divergence Prevention
-- =============================================================
-- FIXES:
-- 1. adjust_investor_position: Fix shares handling + add invariant check
-- 2. void_transaction: Recompute counterparty positions (INDIGO FEES)
-- 3. route_withdrawal_to_fees: Use proper UPSERT for INDIGO FEES position
-- 4. Add reconcile_all_positions admin RPC
-- 5. Add email uniqueness constraint
-- =============================================================

-- PHASE 1: Fix adjust_investor_position RPC
-- Problem: shares was set to 0 on INSERT and not updated on CONFLICT
CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_investor_id uuid, 
  p_fund_id uuid, 
  p_delta numeric, 
  p_note text DEFAULT ''::text, 
  p_admin_id uuid DEFAULT NULL::uuid, 
  p_tx_type text DEFAULT 'ADJUSTMENT'::text, 
  p_tx_date date DEFAULT CURRENT_DATE, 
  p_reference_id text DEFAULT NULL::text
)
RETURNS TABLE(out_success boolean, out_transaction_id uuid, out_old_balance numeric, out_new_balance numeric, out_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  v_current_value numeric; 
  v_current_shares numeric;
  v_current_cost_basis numeric;
  v_new_balance numeric; 
  v_new_shares numeric;
  v_new_cost_basis numeric;
  v_tx_id uuid; 
  v_fund_asset text; 
  v_fund_class text; 
  v_final_reference_id text;
  v_ledger_balance numeric;
BEGIN
  -- Validation
  IF p_investor_id IS NULL THEN 
    RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, NULL::numeric, 'investor_id required'::text; 
    RETURN; 
  END IF;
  IF p_fund_id IS NULL THEN 
    RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, NULL::numeric, 'fund_id required'::text; 
    RETURN; 
  END IF;
  IF p_delta IS NULL OR p_delta = 0 THEN 
    RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, NULL::numeric, 'delta must be non-zero'::text; 
    RETURN; 
  END IF;

  -- Get fund details
  SELECT f.asset, f.fund_class INTO v_fund_asset, v_fund_class 
  FROM public.funds f WHERE f.id = p_fund_id;
  IF v_fund_asset IS NULL THEN 
    RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, NULL::numeric, 'Fund not found'::text; 
    RETURN; 
  END IF;

  -- Get current position values
  SELECT 
    COALESCE(ip.current_value, 0), 
    COALESCE(ip.shares, 0),
    COALESCE(ip.cost_basis, 0)
  INTO v_current_value, v_current_shares, v_current_cost_basis
  FROM public.investor_positions ip 
  WHERE ip.investor_id = p_investor_id AND ip.fund_id = p_fund_id;
  
  v_current_value := COALESCE(v_current_value, 0);
  v_current_shares := COALESCE(v_current_shares, 0);
  v_current_cost_basis := COALESCE(v_current_cost_basis, 0);
  
  -- Calculate new values
  v_new_balance := v_current_value + p_delta;
  v_new_shares := v_current_shares + p_delta;  -- FIX: shares always updated by delta
  v_new_cost_basis := v_current_cost_basis + CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END;

  -- Prevent negative balance
  IF v_new_balance < 0 THEN 
    RETURN QUERY SELECT false, NULL::uuid, v_current_value, v_new_balance, format('Insufficient: %s', v_current_value)::text; 
    RETURN; 
  END IF;

  -- Idempotency check
  v_final_reference_id := COALESCE(p_reference_id, 'adj_' || p_investor_id::text || '_' || extract(epoch from now())::text);
  SELECT id INTO v_tx_id FROM public.transactions_v2 WHERE reference_id = v_final_reference_id;
  IF v_tx_id IS NOT NULL THEN 
    RETURN QUERY SELECT true, v_tx_id, v_current_value, v_current_value, 'Already exists'::text; 
    RETURN; 
  END IF;

  -- Insert transaction
  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, type, amount, asset, tx_date, notes, reference_id, created_by, is_voided
  )
  VALUES (
    p_investor_id, p_fund_id, COALESCE(p_tx_type, 'ADJUSTMENT')::tx_type, p_delta, 
    v_fund_asset, COALESCE(p_tx_date, CURRENT_DATE), p_note, v_final_reference_id, p_admin_id, false
  )
  RETURNING id INTO v_tx_id;

  -- FIX: Properly update position with correct shares logic
  INSERT INTO public.investor_positions (
    investor_id, fund_id, current_value, cost_basis, fund_class, shares, updated_at
  )
  VALUES (
    p_investor_id, 
    p_fund_id, 
    v_new_balance, 
    CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END, 
    v_fund_class, 
    p_delta,  -- FIX: new position starts with delta as shares (not 0!)
    now()
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET 
    current_value = v_new_balance,
    cost_basis = v_new_cost_basis,
    shares = v_new_shares,  -- FIX: update shares!
    updated_at = now();

  -- INVARIANT CHECK: Verify position matches ledger after mutation
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
      ELSE 0
    END
  ), 0)
  INTO v_ledger_balance
  FROM public.transactions_v2
  WHERE investor_id = p_investor_id 
    AND fund_id = p_fund_id 
    AND is_voided = false;
  
  IF ABS(v_new_balance - v_ledger_balance) > 0.0001 THEN
    RAISE EXCEPTION 'INVARIANT VIOLATION: Position (%) != Ledger (%). Rolling back.', v_new_balance, v_ledger_balance;
  END IF;

  RETURN QUERY SELECT true, v_tx_id, v_current_value, v_new_balance, 'Success'::text;
END;
$function$;


-- PHASE 2: Fix void_transaction to recompute counterparty positions
-- Problem: When voiding FEE/FEE_CREDIT, counterparty (INDIGO FEES) position was not recomputed
CREATE OR REPLACE FUNCTION public.void_transaction(p_transaction_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tx RECORD;
  v_admin_id UUID := auth.uid();
  v_counterparty_tx RECORD;
  v_fees_account_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  -- Verify admin
  IF NOT check_is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get transaction
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  -- Check if already voided
  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided';
  END IF;
  
  -- Require reason
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Void reason must be at least 3 characters';
  END IF;
  
  -- Update transaction to voided
  UPDATE transactions_v2
  SET is_voided = true,
      voided_at = now(),
      voided_by = v_admin_id,
      void_reason = p_reason
  WHERE id = p_transaction_id;
  
  -- Recompute position for affected investor/fund
  PERFORM recompute_investor_position(v_tx.investor_id, v_tx.fund_id);
  
  -- FIX: For FEE transactions, also void the corresponding FEE_CREDIT and recompute INDIGO FEES position
  IF v_tx.type = 'FEE' AND v_tx.reference_id IS NOT NULL THEN
    -- Find the corresponding FEE_CREDIT transaction
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE reference_id LIKE 'fee_credit_%' 
      AND fund_id = v_tx.fund_id
      AND type = 'FEE_CREDIT'
      AND investor_id = v_fees_account_id
      AND tx_date = v_tx.tx_date
      AND ABS(amount) = ABS(v_tx.amount)
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      -- Void the counterparty transaction
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      -- Recompute INDIGO FEES position
      PERFORM recompute_investor_position(v_fees_account_id, v_tx.fund_id);
    END IF;
  END IF;
  
  -- FIX: For FEE_CREDIT transactions, also void the corresponding FEE and recompute source position
  IF v_tx.type = 'FEE_CREDIT' AND v_tx.investor_id = v_fees_account_id THEN
    -- Find the corresponding FEE transaction
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE type = 'FEE'
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND ABS(amount) = ABS(v_tx.amount)
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      -- Void the counterparty transaction
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      -- Recompute source investor position
      PERFORM recompute_investor_position(v_counterparty_tx.investor_id, v_tx.fund_id);
    END IF;
  END IF;
  
  -- FIX: Handle INTERNAL_WITHDRAWAL/INTERNAL_CREDIT pairs similarly
  IF v_tx.type = 'INTERNAL_WITHDRAWAL' THEN
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE type = 'INTERNAL_CREDIT'
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND amount = ABS(v_tx.amount)
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      PERFORM recompute_investor_position(v_counterparty_tx.investor_id, v_tx.fund_id);
    END IF;
  END IF;
  
  IF v_tx.type = 'INTERNAL_CREDIT' THEN
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE type = 'INTERNAL_WITHDRAWAL'
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND ABS(amount) = v_tx.amount
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      PERFORM recompute_investor_position(v_counterparty_tx.investor_id, v_tx.fund_id);
    END IF;
  END IF;
  
  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES (
    'VOID_TRANSACTION', 
    'transactions_v2', 
    p_transaction_id::text, 
    v_admin_id,
    jsonb_build_object(
      'id', v_tx.id,
      'investor_id', v_tx.investor_id,
      'fund_id', v_tx.fund_id,
      'type', v_tx.type,
      'amount', v_tx.amount,
      'tx_date', v_tx.tx_date,
      'is_voided', false,
      'is_system_generated', v_tx.is_system_generated
    ),
    jsonb_build_object(
      'is_voided', true, 
      'voided_at', now(),
      'voided_by', v_admin_id,
      'void_reason', p_reason,
      'counterparty_voided', v_counterparty_tx IS NOT NULL
    )
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'transaction_id', p_transaction_id,
    'investor_id', v_tx.investor_id,
    'fund_id', v_tx.fund_id,
    'voided_amount', v_tx.amount,
    'counterparty_voided', v_counterparty_tx IS NOT NULL
  );
END;
$function$;


-- PHASE 3: Fix route_withdrawal_to_fees to use proper UPSERT for INDIGO FEES
-- Problem: UPDATE followed by IF NOT FOUND INSERT can race or fail silently
CREATE OR REPLACE FUNCTION public.route_withdrawal_to_fees(p_request_id uuid, p_reason text DEFAULT 'Fee routing'::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  v_request RECORD; 
  v_fund_asset TEXT;
  v_fund_class TEXT;
  v_amount NUMERIC;
  v_fees_account_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_investor_position RECORD;
  v_shares_to_transfer NUMERIC;
  v_cost_basis_to_transfer NUMERIC;
  v_reference_id TEXT;
  v_ledger_balance_investor NUMERIC;
  v_ledger_balance_fees NUMERIC;
BEGIN
  PERFORM public.ensure_admin();
  
  -- Build reference_id for idempotency check
  v_reference_id := 'fee_route_' || p_request_id::text;
  
  -- IDEMPOTENCY CHECK: Prevent duplicate execution
  IF EXISTS (
    SELECT 1 FROM public.transactions_v2 
    WHERE reference_id = v_reference_id
  ) THEN
    RAISE NOTICE 'Fee routing already processed for request %', p_request_id;
    RETURN FALSE;
  END IF;
  
  -- Get withdrawal request
  SELECT * INTO v_request FROM public.withdrawal_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Request not found: %', p_request_id; 
  END IF;
  IF v_request.status NOT IN ('approved', 'processing') THEN 
    RAISE EXCEPTION 'Invalid status for fee routing: %', v_request.status; 
  END IF;
  
  -- Get the amount to use (approved_amount, or fallback to requested_amount)
  v_amount := COALESCE(v_request.approved_amount, v_request.requested_amount);
  IF v_amount IS NULL OR v_amount <= 0 THEN 
    RAISE EXCEPTION 'Invalid withdrawal amount: %', v_amount; 
  END IF;
  
  -- Get asset and fund_class from fund
  SELECT f.asset, f.fund_class INTO v_fund_asset, v_fund_class 
  FROM public.funds f WHERE f.id = v_request.fund_id;
  IF v_fund_asset IS NULL THEN
    v_fund_asset := v_request.fund_class;
  END IF;
  IF v_fund_class IS NULL THEN
    v_fund_class := v_request.fund_class;
  END IF;
  IF v_fund_asset IS NULL THEN
    RAISE EXCEPTION 'Cannot determine asset for fund_id: %', v_request.fund_id;
  END IF;

  -- Get investor's current position for shares calculation
  SELECT shares, current_value, cost_basis 
  INTO v_investor_position
  FROM public.investor_positions 
  WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id;
  
  -- Validate sufficient balance
  IF v_investor_position.current_value IS NULL OR v_investor_position.current_value < v_amount THEN
    RAISE EXCEPTION 'Insufficient balance: has %, needs %', 
      COALESCE(v_investor_position.current_value, 0), v_amount;
  END IF;
  
  -- Calculate shares to transfer proportionally
  IF v_investor_position.current_value > 0 THEN
    v_shares_to_transfer := v_investor_position.shares * (v_amount / v_investor_position.current_value);
    v_cost_basis_to_transfer := COALESCE(v_investor_position.cost_basis, 0) * (v_amount / v_investor_position.current_value);
  ELSE
    v_shares_to_transfer := v_amount;
    v_cost_basis_to_transfer := v_amount;
  END IF;

  -- Create FEE transaction (debit from investor)
  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, type, amount, asset, fund_class, 
    tx_date, notes, reference_id, created_by, is_voided
  )
  VALUES (
    v_request.investor_id, v_request.fund_id, 'FEE', -ABS(v_amount), 
    v_fund_asset, v_fund_class, CURRENT_DATE, 
    p_reason, v_reference_id, auth.uid(), false
  );

  -- Create FEE_CREDIT transaction (credit to fees account)
  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, type, amount, asset, fund_class, 
    tx_date, notes, reference_id, created_by, is_voided
  )
  VALUES (
    v_fees_account_id, v_request.fund_id, 'FEE_CREDIT', ABS(v_amount), 
    v_fund_asset, v_fund_class, CURRENT_DATE, 
    'Fee routing from ' || LEFT(v_request.investor_id::text, 8), 
    'fee_credit_' || p_request_id::text, auth.uid(), false
  );

  -- FIX: Use proper UPSERT for investor position (deduct from investor)
  INSERT INTO public.investor_positions (
    investor_id, fund_id, fund_class, shares, current_value, cost_basis, created_at, updated_at
  )
  VALUES (
    v_request.investor_id, v_request.fund_id, v_fund_class,
    -ABS(v_shares_to_transfer), -ABS(v_amount), 0, NOW(), NOW()
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = investor_positions.current_value - ABS(v_amount),
    shares = investor_positions.shares - ABS(v_shares_to_transfer),
    cost_basis = GREATEST(0, COALESCE(investor_positions.cost_basis, 0) - ABS(v_cost_basis_to_transfer)),
    updated_at = NOW();
  
  -- FIX: Use proper UPSERT for INDIGO FEES position (credit to fees account)
  INSERT INTO public.investor_positions (
    investor_id, fund_id, fund_class, shares, current_value, cost_basis, created_at, updated_at
  )
  VALUES (
    v_fees_account_id, v_request.fund_id, v_fund_class,
    ABS(v_shares_to_transfer), ABS(v_amount), 0, NOW(), NOW()
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = investor_positions.current_value + ABS(v_amount),
    shares = investor_positions.shares + ABS(v_shares_to_transfer),
    updated_at = NOW();

  -- INVARIANT CHECK: Verify investor position matches ledger
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
      ELSE 0
    END
  ), 0) INTO v_ledger_balance_investor
  FROM public.transactions_v2
  WHERE investor_id = v_request.investor_id 
    AND fund_id = v_request.fund_id 
    AND is_voided = false;

  -- Check investor position matches ledger
  IF ABS((SELECT current_value FROM investor_positions WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id) - v_ledger_balance_investor) > 0.0001 THEN
    RAISE EXCEPTION 'INVARIANT VIOLATION: Investor position != ledger after fee routing';
  END IF;

  -- INVARIANT CHECK: Verify INDIGO FEES position matches ledger
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
      ELSE 0
    END
  ), 0) INTO v_ledger_balance_fees
  FROM public.transactions_v2
  WHERE investor_id = v_fees_account_id 
    AND fund_id = v_request.fund_id 
    AND is_voided = false;

  IF ABS((SELECT current_value FROM investor_positions WHERE investor_id = v_fees_account_id AND fund_id = v_request.fund_id) - v_ledger_balance_fees) > 0.0001 THEN
    RAISE EXCEPTION 'INVARIANT VIOLATION: INDIGO FEES position != ledger after fee routing';
  END IF;
  
  -- Mark withdrawal as completed
  UPDATE public.withdrawal_requests 
  SET 
    status = 'completed', 
    processed_at = NOW(),
    processed_amount = v_amount,
    updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN TRUE;
END;
$function$;


-- PHASE 4: Add admin-only reconcile_all_positions RPC
CREATE OR REPLACE FUNCTION public.reconcile_all_positions(p_dry_run boolean DEFAULT true)
RETURNS TABLE(
  investor_id uuid, 
  fund_id uuid, 
  investor_name text,
  fund_name text,
  old_value numeric, 
  new_value numeric, 
  old_shares numeric,
  new_shares numeric,
  action text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify admin access
  PERFORM public.ensure_admin();
  
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
      auth.uid(),
      jsonb_build_object('dry_run', p_dry_run, 'executed_at', now())
    );
  END IF;
END;
$function$;


-- PHASE 5: Add email uniqueness constraint (if not exists)
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_profiles_email_unique_lower'
  ) THEN
    CREATE UNIQUE INDEX idx_profiles_email_unique_lower 
    ON profiles (LOWER(TRIM(email))) 
    WHERE email IS NOT NULL AND email != '';
  END IF;
END $$;


-- PHASE 6: Run immediate reconciliation for known affected accounts
-- Fix h.monoja and INDIGO FEES positions
DO $$
DECLARE
  v_hmonoja_id uuid := '695c28ec-f3c3-4eef-a13e-66396bdeeddb';
  v_fees_account_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_btc_fund_id uuid := '0a048d9b-c4cf-46eb-b428-59e10307df93';
BEGIN
  -- Recompute h.monoja's BTC position
  PERFORM recompute_investor_position(v_hmonoja_id, v_btc_fund_id);
  
  -- Recompute INDIGO FEES BTC position
  PERFORM recompute_investor_position(v_fees_account_id, v_btc_fund_id);
  
  RAISE NOTICE 'Reconciled positions for h.monoja and INDIGO FEES';
END $$;
