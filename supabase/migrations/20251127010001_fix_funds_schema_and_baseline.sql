-- Fix funds table schema, add baseline function, and SECURE yield distribution

BEGIN;

-- 1. Add missing columns to funds table if they don't exist
DO $$
BEGIN
    -- Add total_aum if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funds' AND column_name = 'total_aum') THEN
        ALTER TABLE public.funds ADD COLUMN total_aum numeric DEFAULT 0;
    END IF;

    -- Add asset_symbol if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funds' AND column_name = 'asset_symbol') THEN
        ALTER TABLE public.funds ADD COLUMN asset_symbol text;
        
        -- Attempt to backfill from 'asset' column if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funds' AND column_name = 'asset') THEN
            UPDATE public.funds SET asset_symbol = asset WHERE asset_symbol IS NULL;
        END IF;

        -- Default to 'USD' if still null (safety)
        UPDATE public.funds SET asset_symbol = 'USD' WHERE asset_symbol IS NULL;
    END IF;
END $$;

-- 2. Create SECURE function to update AUM baseline without yield calculation
CREATE OR REPLACE FUNCTION update_fund_aum_baseline(
    p_fund_id uuid,
    p_new_aum numeric,
    p_admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Security Check: Ensure caller is a valid admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access Denied: Only admins can perform this action.';
    END IF;

    -- Update the Fund AUM directly
    UPDATE funds 
    SET 
        total_aum = p_new_aum, 
        updated_at = now()
    WHERE id = p_fund_id;

    RETURN json_build_object(
        'success', true,
        'new_aum', p_new_aum,
        'message', 'Baseline AUM updated successfully.'
    );
END;
$$;

-- 3. Patch/Secure the Yield Distribution Function
-- Redefining here ensures it has the Admin Security Check even if the previous migration was unsafe
CREATE OR REPLACE FUNCTION distribute_monthly_yield(
    p_fund_id uuid,
    p_report_month date,
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
    -- Security Check: Ensure caller is a valid admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access Denied: Only admins can distribute yield.';
    END IF;

    -- A. Get Fund Details
    SELECT total_aum, asset_symbol INTO v_old_aum, v_fund_asset_code
    FROM funds WHERE id = p_fund_id;

    -- B. Get Net Flows for the month
    -- Using inline logic to ensure we use the same secure context
    SELECT 
        COALESCE(SUM(amount) FILTER (WHERE type = 'DEPOSIT'), 0),
        COALESCE(SUM(amount) FILTER (WHERE type = 'WITHDRAWAL'), 0)
    INTO v_deposits, v_withdrawals
    FROM transactions_v2
    WHERE asset = v_fund_asset_code
    AND status = 'completed'
    AND date_trunc('month', occurred_at) = date_trunc('month', p_report_month);

    -- C. Calculate the "Yield Pot"
    v_yield_pot := p_new_aum - (v_old_aum + v_deposits - v_withdrawals);

    -- Safety Check
    IF v_old_aum <= 0 THEN
        RAISE EXCEPTION 'Cannot distribute yield: Previous Fund AUM is 0.';
    END IF;

    -- D. Loop through Active Investors
    FOR v_investor_record IN 
        SELECT * FROM investor_positions 
        WHERE fund_id = p_fund_id AND status = 'active'
    LOOP
        -- 1. Ownership %
        v_share_ratio := v_investor_record.shares / v_old_aum;

        -- 2. Specific yield
        v_investor_yield := v_yield_pot * v_share_ratio;

        -- 3. New Balance
        v_investor_new_balance := v_investor_record.shares + v_investor_yield; 

        -- 4. Update Position
        UPDATE investor_positions
        SET 
            shares = shares + v_investor_yield,
            total_yield_earned = total_yield_earned + v_investor_yield,
            updated_at = now()
        WHERE id = v_investor_record.id;

        -- 5. Create Monthly Report Record
        INSERT INTO investor_monthly_reports (
            investor_id,
            report_month,
            asset_code,
            opening_balance,
            additions, 
            withdrawals,
            yield_earned,
            closing_balance,
            edited_by
        ) VALUES (
            v_investor_record.investor_id,
            p_report_month,
            v_fund_asset_code,
            v_investor_record.shares, 
            0, -- Placeholder: flow query could be added here for precision
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