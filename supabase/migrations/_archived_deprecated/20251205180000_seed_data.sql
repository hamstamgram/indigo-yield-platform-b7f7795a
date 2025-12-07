
-- Seed Data Migration
-- Populates public.transactions with sample data for 'testinvestor@indigo.fund'
-- Then re-runs the backfill logic to update daily_nav and investor_monthly_reports

DO $$
DECLARE
    v_investor_id UUID;
    v_fund_btc UUID;
    v_fund_eth UUID;
    v_fund_usdt UUID;
BEGIN
    -- 1. Get Investor ID
    SELECT id INTO v_investor_id FROM public.investors WHERE email = 'testinvestor@indigo.fund';
    
    IF v_investor_id IS NULL THEN
        RAISE NOTICE 'Test investor not found, skipping seed data.';
        RETURN;
    END IF;

    -- 2. Get Fund IDs (Assuming funds exist, if not, they should be created via create_funds.sql logic or manual)
    -- We will rely on asset codes if funds table lookup fails or just use asset_code in transactions
    -- But daily_nav links to funds.id.
    SELECT id INTO v_fund_btc FROM public.funds WHERE asset = 'BTC';
    SELECT id INTO v_fund_eth FROM public.funds WHERE asset = 'ETH';
    SELECT id INTO v_fund_usdt FROM public.funds WHERE asset = 'USDT';

    -- Ensure Funds Exist (Safety)
    IF v_fund_btc IS NULL THEN
        INSERT INTO public.funds (code, name, asset, fund_class, status, inception_date) VALUES ('IND-BTC', 'Indigo Bitcoin Yield Fund', 'BTC', 'BTC', 'active', '2024-01-01') RETURNING id INTO v_fund_btc;
    END IF;
    IF v_fund_eth IS NULL THEN
        INSERT INTO public.funds (code, name, asset, fund_class, status, inception_date) VALUES ('IND-ETH', 'Indigo Ethereum Yield Fund', 'ETH', 'ETH', 'active', '2024-01-01') RETURNING id INTO v_fund_eth;
    END IF;
    IF v_fund_usdt IS NULL THEN
        INSERT INTO public.funds (code, name, asset, fund_class, status, inception_date) VALUES ('IND-USDT', 'Indigo USDT Yield Fund', 'USDT', 'USDT', 'active', '2024-01-01') RETURNING id INTO v_fund_usdt;
    END IF;

    -- 3. Insert Transactions (Backdated)
    
    -- BTC: Deposit 1.5 BTC in Jan 2024
    INSERT INTO public.transactions (investor_id, asset_code, amount, type, status, created_at, confirmed_at)
    VALUES (v_investor_id, 'BTC', 1.5, 'DEPOSIT', 'confirmed', '2024-01-15 10:00:00+00', '2024-01-15 10:00:00+00');

    -- BTC: Withdrawal 0.2 BTC in Mar 2024
    INSERT INTO public.transactions (investor_id, asset_code, amount, type, status, created_at, confirmed_at)
    VALUES (v_investor_id, 'BTC', -0.2, 'WITHDRAWAL', 'confirmed', '2024-03-20 14:30:00+00', '2024-03-20 14:30:00+00');

    -- ETH: Deposit 50 ETH in Feb 2024
    INSERT INTO public.transactions (investor_id, asset_code, amount, type, status, created_at, confirmed_at)
    VALUES (v_investor_id, 'ETH', 50.0, 'DEPOSIT', 'confirmed', '2024-02-10 09:15:00+00', '2024-02-10 09:15:00+00');

    -- USDT: Deposit 100,000 USDT in Jan 2024
    INSERT INTO public.transactions (investor_id, asset_code, amount, type, status, created_at, confirmed_at)
    VALUES (v_investor_id, 'USDT', 100000.0, 'DEPOSIT', 'confirmed', '2024-01-05 11:00:00+00', '2024-01-05 11:00:00+00');

    RAISE NOTICE 'Seeded transactions for testinvestor.';

END $$;

-- 4. Re-Run Backfill Logic (Daily NAV & Monthly Reports) to reflect new data
DO $$
DECLARE
    curr_date DATE;
    end_date DATE := CURRENT_DATE;
    start_date DATE;
    month_start DATE;
    month_end DATE;
BEGIN
    -- Get start date from transactions
    SELECT MIN(created_at)::DATE INTO start_date FROM public.transactions;
    IF start_date IS NULL THEN start_date := '2024-01-01'; END IF;
    
    curr_date := start_date;

    RAISE NOTICE 'Re-Running Daily NAV Backfill from % to %', start_date, end_date;

    -- Loop through every day
    WHILE curr_date <= end_date LOOP
        
        -- Insert or Update Daily NAV for each fund
        INSERT INTO public.daily_nav (fund_id, nav_date, aum, total_inflows, total_outflows, created_at)
        SELECT 
            f.id as fund_id,
            curr_date as nav_date,
            -- AUM: Sum of ALL transactions up to this date
            COALESCE((
                SELECT SUM(amount) 
                FROM public.transactions t_all 
                WHERE (
                    (f.code = 'IND-USDT' AND t_all.asset_code IN ('USDT', 'USDC')) OR
                    (f.code != 'IND-USDT' AND t_all.asset_code::text = f.asset)
                ) AND t_all.created_at::DATE <= curr_date
            ), 0) as aum,
            -- Inflows: Sum of DEPOSITS ON this date
            COALESCE((
                SELECT SUM(amount) 
                FROM public.transactions t_in 
                WHERE (
                    (f.code = 'IND-USDT' AND t_in.asset_code IN ('USDT', 'USDC')) OR
                    (f.code != 'IND-USDT' AND t_in.asset_code::text = f.asset)
                ) AND t_in.created_at::DATE = curr_date AND t_in.type = 'DEPOSIT'
            ), 0) as total_inflows,
            -- Outflows: Sum of WITHDRAWALS ON this date (Absolute value)
            ABS(COALESCE((
                SELECT SUM(amount) 
                FROM public.transactions t_out 
                WHERE (
                    (f.code = 'IND-USDT' AND t_out.asset_code IN ('USDT', 'USDC')) OR
                    (f.code != 'IND-USDT' AND t_out.asset_code::text = f.asset)
                ) AND t_out.created_at::DATE = curr_date AND t_out.type = 'WITHDRAWAL'
            ), 0)) as total_outflows,
            NOW()
        FROM 
            public.funds f
        GROUP BY 
            f.id
        ON CONFLICT (fund_id, nav_date) 
        DO UPDATE SET 
            aum = EXCLUDED.aum,
            total_inflows = EXCLUDED.total_inflows,
            total_outflows = EXCLUDED.total_outflows;

        curr_date := curr_date + 1;
    END LOOP;

    -- Re-Run Monthly Reports Backfill
    curr_date := start_date;
    WHILE curr_date <= end_date LOOP
        month_start := DATE_TRUNC('month', curr_date);
        month_end := (DATE_TRUNC('month', curr_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

        -- Insert/Update Reports for every Investor
        INSERT INTO public.investor_monthly_reports (
            investor_id, 
            report_month, 
            asset_code, 
            opening_balance, 
            additions, 
            withdrawals, 
            closing_balance, 
            yield_earned, 
            created_at, 
            updated_at
        )
        SELECT 
            t.investor_id,
            month_start as report_month,
            t.asset_code,
            -- Opening Balance
            COALESCE((
                SELECT SUM(amount)
                FROM public.transactions t2
                WHERE t2.investor_id = t.investor_id
                  AND t2.asset_code = t.asset_code
                  AND t2.created_at < month_start
            ), 0) as opening_balance,
            -- Additions
            COALESCE((
                SELECT SUM(amount)
                FROM public.transactions t3
                WHERE t3.investor_id = t.investor_id
                  AND t3.asset_code = t.asset_code
                  AND t3.created_at >= month_start
                  AND t3.created_at <= month_end + INTERVAL '1 day'
                  AND t3.type = 'DEPOSIT'
            ), 0) as additions,
            -- Withdrawals
            ABS(COALESCE((
                SELECT SUM(amount)
                FROM public.transactions t4
                WHERE t4.investor_id = t.investor_id
                  AND t4.asset_code = t.asset_code
                  AND t4.created_at >= month_start
                  AND t4.created_at <= month_end + INTERVAL '1 day'
                  AND t4.type = 'WITHDRAWAL'
            ), 0)) as withdrawals,
            0 as closing_balance, 
            0 as yield_earned,
            NOW(),
            NOW()
        FROM 
            public.transactions t
        WHERE 
            t.created_at <= month_end + INTERVAL '1 day'
        GROUP BY 
            t.investor_id, t.asset_code
        ON CONFLICT (investor_id, report_month, asset_code) 
        DO UPDATE SET
            opening_balance = EXCLUDED.opening_balance,
            additions = EXCLUDED.additions,
            withdrawals = EXCLUDED.withdrawals,
            closing_balance = EXCLUDED.opening_balance + EXCLUDED.additions - EXCLUDED.withdrawals + investor_monthly_reports.yield_earned,
            updated_at = NOW();

        curr_date := curr_date + INTERVAL '1 month';
    END LOOP;

    RAISE NOTICE 'Seed Data and Backfill Complete.';
END $$;
