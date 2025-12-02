-- MIGRATION: Fund Distribution System
-- Implements "Top-Down" Yield Calculation logic via Postgres Functions

BEGIN;

-- 1. Ensure FUNDS table has tracking columns
-- If table exists, we add columns safely. If not, we create it.
CREATE TABLE IF NOT EXISTS public.funds (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    code text NOT NULL, -- e.g. "BTC-YIELD"
    asset_symbol text NOT NULL, -- e.g. "BTC"
    total_aum numeric DEFAULT 0,
    share_price numeric DEFAULT 1.0, -- Tracks unit value if used, or 1.0 if direct AUM mapping
    status text DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Transaction Helper: Get Net Flows for a Period
-- Returns the sum of deposits and withdrawals for a specific fund and month
CREATE OR REPLACE FUNCTION get_fund_net_flows(
    p_fund_id uuid, 
    p_start_date timestamp, 
    p_end_date timestamp
)
RETURNS TABLE (
    total_deposits numeric,
    total_withdrawals numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(amount) FILTER (WHERE type = 'DEPOSIT'), 0) as total_deposits,
        COALESCE(SUM(amount) FILTER (WHERE type = 'WITHDRAWAL'), 0) as total_withdrawals
    FROM transactions_v2
    -- Note: We assume transactions link to investors, who link to funds via positions
    -- Or transactions have a fund_id column. For this logic, we assume we query via investor relationships.
    -- To simplify: strict implementation requires transactions to have 'fund_id' or 'asset_code' matching the fund.
    WHERE 
        (
            -- Direct link if column exists
            asset = (SELECT asset_symbol FROM funds WHERE id = p_fund_id) 
        )
        AND status = 'completed'
        AND occurred_at >= p_start_date 
        AND occurred_at <= p_end_date;
END;
$$;

-- 3. THE CORE ENGINE: Distribute Yield
-- Calculates yield based on AUM delta and distributes pro-rata
CREATE OR REPLACE FUNCTION distribute_monthly_yield(
    p_fund_id uuid,
    p_report_month date, -- e.g. '2025-10-01'
    p_new_aum numeric,
    p_admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_aum numeric;
    v_deposits numeric;
    v_withdrawals numeric;
    v_yield_pot numeric;
    v_investor_record record;
    v_share_ratio numeric;
    v_investor_yield numeric;
    v_investor_new_balance numeric;
    v_count integer := 0;
    v_fund_asset_code text;
BEGIN
    -- A. Get Fund Details
    SELECT total_aum, asset_symbol INTO v_old_aum, v_fund_asset_code
    FROM funds WHERE id = p_fund_id;

    -- B. Get Net Flows for the month
    -- Assumes 'get_fund_net_flows' logic inline for simplicity/robustness
    SELECT 
        COALESCE(SUM(amount) FILTER (WHERE type = 'DEPOSIT'), 0),
        COALESCE(SUM(amount) FILTER (WHERE type = 'WITHDRAWAL'), 0)
    INTO v_deposits, v_withdrawals
    FROM transactions_v2
    WHERE asset = v_fund_asset_code
    AND status = 'completed'
    AND date_trunc('month', occurred_at) = date_trunc('month', p_report_month);

    -- C. Calculate the "Yield Pot"
    -- Formula: New = Old + NetFlows + Yield
    -- Therefore: Yield = New - (Old + NetFlows)
    v_yield_pot := p_new_aum - (v_old_aum + v_deposits - v_withdrawals);

    -- Safety Check: Prevent infinite yield if old AUM is 0
    IF v_old_aum <= 0 THEN
        RAISE EXCEPTION 'Cannot distribute yield: Previous Fund AUM is 0.';
    END IF;

    -- D. Loop through Active Investors
    FOR v_investor_record IN 
        SELECT * FROM investor_positions 
        WHERE fund_id = p_fund_id AND status = 'active'
    LOOP
        -- 1. Calculate Ownership % (Pro-Rata)
        -- Based on their balance BEFORE this month's yield
        v_share_ratio := v_investor_record.shares / v_old_aum;

        -- 2. Calculate their specific yield amount
        v_investor_yield := v_yield_pot * v_share_ratio;

        -- 3. Calculate New Balance
        -- Note: We assume 'shares' tracks the raw unit balance
        v_investor_new_balance := v_investor_record.shares + v_investor_yield; 
        -- (Note: In a real system, you'd also add/sub their specific deposits/withdrawals for the month here if not already applied to 'shares')
        -- For this logic, we assume 'shares' was updated real-time by deposits, so we just add yield.

        -- 4. Update Position (Live View)
        UPDATE investor_positions
        SET 
            shares = shares + v_investor_yield,
            total_yield_earned = total_yield_earned + v_investor_yield,
            updated_at = now()
        WHERE id = v_investor_record.id;

        -- 5. Create Monthly Report Record (Static History)
        INSERT INTO investor_monthly_reports (
            investor_id,
            report_month,
            asset_code,
            opening_balance,
            additions, -- Should query specific investor txns
            withdrawals, -- Should query specific investor txns
            yield_earned,
            closing_balance,
            edited_by
        ) VALUES (
            v_investor_record.investor_id,
            p_report_month,
            v_fund_asset_code,
            v_investor_record.shares, -- Opening (Approx for this logic demo)
            0, -- Placeholder: Requires per-investor flow query
            0, -- Placeholder
            v_investor_yield,
            v_investor_new_balance,
            p_admin_id
        )
        ON CONFLICT (investor_id, report_month, asset_code) 
        DO UPDATE SET
            yield_earned = EXCLUDED.yield_earned,
            closing_balance = EXCLUDED.closing_balance,
            updated_at = now();
            
        v_count := v_count + 1;
    END LOOP;

    -- E. Update Master Fund AUM
    UPDATE funds 
    SET total_aum = p_new_aum, updated_at = now()
    WHERE id = p_fund_id;

    RETURN json_build_object(
        'success', true,
        'yield_distributed', v_yield_pot,
        'investors_updated', v_count,
        'new_aum', p_new_aum
    );
END;
$$;

COMMIT;
