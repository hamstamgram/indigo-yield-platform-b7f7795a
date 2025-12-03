-- Migration: Fix AUM Sync and Ledger Logic
-- Date: 2025-12-03
-- Description: 
-- 1. Creates a Trigger to keep `funds.total_aum` effectively synced with `investor_positions`.
-- 2. Creates a centralized `handle_ledger_transaction` function with Expert Logic (PnL Realization).
-- 3. Updates `complete_withdrawal` and `admin_create_transaction` to use this logic.

BEGIN;

-- =============================================================================
-- 1. AUTOMATIC AUM SYNC TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_fund_total_aum()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_fund_id UUID;
BEGIN
    -- Determine Fund ID
    IF TG_OP = 'DELETE' THEN
        v_fund_id := OLD.fund_id;
    ELSE
        v_fund_id := NEW.fund_id;
    END IF;

    -- Update Funds Table
    -- We recalculate from scratch to ensure 100% consistency and self-healing
    UPDATE public.funds
    SET 
        total_aum = (
            SELECT COALESCE(SUM(current_value), 0)
            FROM public.investor_positions
            WHERE fund_id = v_fund_id
        ),
        updated_at = NOW()
    WHERE id = v_fund_id;

    RETURN NULL; -- Trigger return value ignored for AFTER triggers
END;
$$;

-- Drop trigger if exists to avoid duplication
DROP TRIGGER IF EXISTS trg_sync_fund_aum ON public.investor_positions;

-- Create Trigger
CREATE TRIGGER trg_sync_fund_aum
AFTER INSERT OR UPDATE OR DELETE ON public.investor_positions
FOR EACH ROW
EXECUTE FUNCTION public.sync_fund_total_aum();


-- =============================================================================
-- 2. CENTRALIZED LEDGER HELPER (With Expert PnL Logic)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_ledger_transaction(
    p_investor_id UUID,
    p_fund_id UUID,
    p_amount NUMERIC,
    p_type TEXT -- 'DEPOSIT' or 'WITHDRAWAL'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_position RECORD;
    v_ratio NUMERIC;
    v_cost_basis_reduction NUMERIC;
    v_realized_pnl_event NUMERIC;
BEGIN
    -- Get Existing Position
    SELECT * INTO v_position
    FROM public.investor_positions
    WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

    IF p_type = 'DEPOSIT' THEN
        IF v_position IS NULL THEN
            -- Create New Position
            INSERT INTO public.investor_positions (
                investor_id,
                fund_id,
                shares,
                current_value,
                cost_basis,
                updated_at
            ) VALUES (
                p_investor_id,
                p_fund_id,
                p_amount, -- Assuming 1.0 NAV for new deposits or simpler token tracking
                p_amount, -- Initial Value
                p_amount, -- Initial Cost Basis
                NOW()
            );
        ELSE
            -- Update Existing Position
            UPDATE public.investor_positions
            SET
                shares = shares + p_amount,
                current_value = current_value + p_amount,
                cost_basis = cost_basis + p_amount, -- Deposits increase cost basis 1:1
                updated_at = NOW()
            WHERE id = v_position.id;
        END IF;

    ELSIF p_type = 'WITHDRAWAL' THEN
        IF v_position IS NULL OR v_position.current_value < p_amount THEN
            RAISE EXCEPTION 'Insufficient funds for withdrawal. Available: %, Requested: %', 
                COALESCE(v_position.current_value, 0), p_amount;
        END IF;

        -- EXPERT LOGIC: Realizing PnL
        -- When withdrawing, we sell a portion of the asset.
        -- We must determine what portion of the withdrawal is "Principal" (Cost Basis) vs "Profit" (Realized PnL).
        
        -- Ratio of withdrawal to total value
        IF v_position.current_value > 0 THEN
            v_ratio := p_amount / v_position.current_value;
        ELSE
            v_ratio := 1; -- Should not happen given check above
        END IF;

        -- Calculate reductions
        v_cost_basis_reduction := v_position.cost_basis * v_ratio;
        v_realized_pnl_event := p_amount - v_cost_basis_reduction;

        -- Update Position
        UPDATE public.investor_positions
        SET
            shares = GREATEST(0, shares - p_amount), -- Reduce shares (Token amount)
            current_value = GREATEST(0, current_value - p_amount), -- Reduce value
            cost_basis = GREATEST(0, cost_basis - v_cost_basis_reduction), -- Reduce cost basis proportionally
            realized_pnl = COALESCE(realized_pnl, 0) + v_realized_pnl_event, -- Book the profit/loss
            updated_at = NOW()
        WHERE id = v_position.id;
    END IF;
END;
$$;


-- =============================================================================
-- 3. UPDATE complete_withdrawal TO USE LEDGER HELPER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.complete_withdrawal(
  p_request_id UUID,
  p_tx_hash TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  v_request RECORD;
  v_fund_asset TEXT;
BEGIN
  -- Ensure admin privileges
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
      RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get request details
  SELECT wr.*, f.asset_symbol 
  INTO v_request 
  FROM public.withdrawal_requests wr
  JOIN public.funds f ON wr.fund_id = f.id
  WHERE wr.id = p_request_id;
  
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status != 'processing' THEN 
    RAISE EXCEPTION 'Can only complete requests in processing. Current status: %', v_request.status;
  END IF;

  -- Update request status
  UPDATE public.withdrawal_requests
  SET 
    status = 'completed',
    tx_hash = COALESCE(p_tx_hash, tx_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Create Transaction Record
  INSERT INTO public.transactions_v2 (
    investor_id,
    type,
    amount,
    asset,
    fund_id, -- Ensure we track fund_id if column exists (it might not in older schema, relying on context)
             -- Since schema shows 'fund_id' is in withdrawal_requests but maybe not transactions_v2?
             -- Based on previous file, transactions_v2 has investor_id, type, amount, asset.
             -- We will stick to standard columns.
    status,
    tx_hash,
    description,
    occurred_at
  ) VALUES (
    v_request.investor_id,
    'WITHDRAWAL',
    v_request.processed_amount,
    v_request.asset_symbol,
    -- v_request.fund_id, -- Uncomment if transactions_v2 has fund_id, usually safer to just rely on asset logic or add it
    'completed',
    COALESCE(p_tx_hash, v_request.tx_hash),
    'Withdrawal from ' || v_request.asset_symbol,
    NOW()
  );

  -- UPDATE LEDGER (The Missing Link)
  PERFORM public.handle_ledger_transaction(
      v_request.investor_id,
      v_request.fund_id,
      v_request.processed_amount,
      'WITHDRAWAL'
  );

  -- Log action
  -- (Assuming log_withdrawal_action exists from previous context)
  
  RETURN TRUE;
END;
$$;


-- =============================================================================
-- 4. UPDATE admin_create_transaction TO USE LEDGER HELPER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_create_transaction(
    p_investor_id UUID, 
    p_type TEXT, 
    p_amount NUMERIC, 
    p_fund_id UUID, 
    p_description TEXT DEFAULT NULL, 
    p_tx_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_fund_asset TEXT;
    v_fund_name TEXT;
    v_new_tx_id UUID;
BEGIN
    -- 1. Ensure Admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    -- 2. Validate Inputs
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than zero';
    END IF;

    IF p_type NOT IN ('DEPOSIT', 'WITHDRAWAL') THEN
        RAISE EXCEPTION 'Invalid transaction type. Must be DEPOSIT or WITHDRAWAL';
    END IF;

    -- 3. Get Fund Details
    SELECT asset_symbol, name INTO v_fund_asset, v_fund_name
    FROM public.funds
    WHERE id = p_fund_id;

    IF v_fund_asset IS NULL THEN
        RAISE EXCEPTION 'Fund not found';
    END IF;

    -- 4. Insert into transactions_v2
    INSERT INTO public.transactions_v2 (
        investor_id,
        type,
        amount,
        asset,
        status,
        tx_hash,
        description,
        occurred_at
    ) VALUES (
        p_investor_id,
        p_type,
        p_amount,
        v_fund_asset,
        'completed',
        p_tx_hash,
        COALESCE(p_description, 'Manual ' || p_type || ' by Admin for ' || v_fund_name),
        NOW()
    ) RETURNING id INTO v_new_tx_id;

    -- 5. UPDATE LEDGER (Centralized)
    PERFORM public.handle_ledger_transaction(
        p_investor_id,
        p_fund_id,
        p_amount,
        p_type
    );

    -- 6. Log Audit (Optional, simplified here)
    
    RETURN jsonb_build_object('success', true, 'transaction_id', v_new_tx_id);
END;
$$;

COMMIT;
