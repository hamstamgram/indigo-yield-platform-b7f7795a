-- Migration: Fix High Water Mark Logic on Withdrawals
-- Date: 2025-12-03
-- Description: Updates `handle_ledger_transaction` to proportionally reduce High Water Mark (HWM) 
--              when a withdrawal occurs. This prevents investors from having an unreachable HWM 
--              after partial withdrawals.

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
    v_hwm_reduction NUMERIC;
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
                high_water_mark,
                updated_at
            ) VALUES (
                p_investor_id,
                p_fund_id,
                p_amount, -- Assuming 1.0 NAV for new deposits
                p_amount, -- Initial Value
                p_amount, -- Initial Cost Basis
                p_amount, -- Initial HWM matches deposit
                NOW()
            );
        ELSE
            -- Update Existing Position
            UPDATE public.investor_positions
            SET
                shares = shares + p_amount,
                current_value = current_value + p_amount,
                cost_basis = cost_basis + p_amount, 
                high_water_mark = COALESCE(high_water_mark, 0) + p_amount, -- HWM increases by deposit amount
                updated_at = NOW()
            WHERE id = v_position.id;
        END IF;

    ELSIF p_type = 'WITHDRAWAL' THEN
        IF v_position IS NULL OR v_position.current_value < p_amount THEN
            RAISE EXCEPTION 'Insufficient funds for withdrawal. Available: %, Requested: %', 
                COALESCE(v_position.current_value, 0), p_amount;
        END IF;

        -- EXPERT LOGIC: Proportional Reductions
        -- When withdrawing, we reduce Cost Basis and High Water Mark proportionally to the withdrawal value.
        
        -- Ratio of withdrawal to total value
        IF v_position.current_value > 0 THEN
            v_ratio := p_amount / v_position.current_value;
        ELSE
            v_ratio := 1;
        END IF;

        -- Calculate reductions
        v_cost_basis_reduction := v_position.cost_basis * v_ratio;
        v_hwm_reduction := COALESCE(v_position.high_water_mark, v_position.current_value) * v_ratio;
        v_realized_pnl_event := p_amount - v_cost_basis_reduction;

        -- Update Position
        UPDATE public.investor_positions
        SET
            shares = GREATEST(0, shares - p_amount),
            current_value = GREATEST(0, current_value - p_amount),
            cost_basis = GREATEST(0, cost_basis - v_cost_basis_reduction),
            high_water_mark = GREATEST(0, COALESCE(high_water_mark, 0) - v_hwm_reduction), -- Reduce HWM proportionally
            realized_pnl = COALESCE(realized_pnl, 0) + v_realized_pnl_event,
            updated_at = NOW()
        WHERE id = v_position.id;
    END IF;
END;
$$;
