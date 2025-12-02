-- Migration: Add Admin Create Transaction RPC
-- Date: 2025-11-24
-- Description: Adds `admin_create_transaction` RPC to allow admins to manually create
--              deposits and withdrawals in `transactions_v2`.

BEGIN;

-- Create RPC function
CREATE OR REPLACE FUNCTION public.admin_create_transaction(
    p_investor_id UUID,
    p_type TEXT, -- 'DEPOSIT' or 'WITHDRAWAL'
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
    PERFORM public.ensure_admin();

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
        'completed', -- Admin actions are immediate
        p_tx_hash,
        COALESCE(p_description, 'Manual ' || p_type || ' by Admin for ' || v_fund_name),
        NOW()
    ) RETURNING id INTO v_new_tx_id;

    -- 5. Update Investor Position (Live Ledger)
    -- If Deposit: Add shares
    -- If Withdrawal: Subtract shares
    -- Note: This assumes 1:1 share price for simplicity as per current logic.
    -- Real logic might require share price calculation.
    
    -- Check if position exists
    IF NOT EXISTS (SELECT 1 FROM public.investor_positions WHERE investor_id = p_investor_id AND fund_id = p_fund_id) THEN
        IF p_type = 'WITHDRAWAL' THEN
             RAISE EXCEPTION 'Cannot withdraw from non-existent position';
        END IF;
        
        -- Create new position for deposit
        INSERT INTO public.investor_positions (
            investor_id,
            fund_id,
            shares,
            total_yield_earned,
            status,
            created_at,
            updated_at
        ) VALUES (
            p_investor_id,
            p_fund_id,
            p_amount, -- Initial deposit
            0,
            'active',
            NOW(),
            NOW()
        );
    ELSE
        -- Update existing position
        UPDATE public.investor_positions
        SET 
            shares = shares + (CASE WHEN p_type = 'DEPOSIT' THEN p_amount ELSE -p_amount END),
            updated_at = NOW()
        WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
    END IF;

    -- 6. Log Audit Event
    INSERT INTO public.audit_log (
        actor_user,
        action,
        entity,
        entity_id,
        meta
    ) VALUES (
        auth.uid(),
        'ADMIN_CREATE_TRANSACTION',
        'transactions_v2',
        v_new_tx_id::TEXT,
        jsonb_build_object(
            'type', p_type,
            'amount', p_amount,
            'investor_id', p_investor_id,
            'fund_id', p_fund_id
        )
    );

    RETURN jsonb_build_object('success', true, 'transaction_id', v_new_tx_id);
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.admin_create_transaction(UUID, TEXT, NUMERIC, UUID, TEXT, TEXT) TO authenticated;

COMMIT;
