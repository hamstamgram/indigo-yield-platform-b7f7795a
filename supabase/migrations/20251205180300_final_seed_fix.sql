
-- Final Seed Fix Migration
-- Correctly seeds transactions using Profile ID (User ID) and Backfills Reports using Investor ID mapping

DO $$
DECLARE
    v_profile_id UUID;
    v_investor_id UUID;
    v_fund_btc UUID;
    v_fund_eth UUID;
    v_fund_usdt UUID;
BEGIN
    -- 1. Get Profile ID (User ID)
    SELECT id INTO v_profile_id FROM public.profiles WHERE email = 'testinvestor@indigo.fund';

    IF v_profile_id IS NULL THEN
        RAISE NOTICE 'Test investor PROFILE not found. Ensure setup-test-users ran.';
        RETURN;
    END IF;

    -- 2. Ensure Investor Record Exists (Linked to Profile)
    SELECT id INTO v_investor_id FROM public.investors WHERE profile_id = v_profile_id;

    IF v_investor_id IS NULL THEN
        INSERT INTO public.investors (profile_id, email, name, status, entity_type, accredited, created_at, updated_at)
        VALUES (v_profile_id, 'testinvestor@indigo.fund', 'Test Investor', 'active', 'individual', true, NOW(), NOW())
        RETURNING id INTO v_investor_id;
        RAISE NOTICE 'Created missing investor record for profile %', v_profile_id;
    END IF;

    -- 3. Get Fund IDs
    SELECT id INTO v_fund_btc FROM public.funds WHERE asset = 'BTC';
    SELECT id INTO v_fund_eth FROM public.funds WHERE asset = 'ETH';
    SELECT id INTO v_fund_usdt FROM public.funds WHERE asset = 'USDT';

    -- 4. Insert Transactions
    -- NOTE: Using v_profile_id because transactions.investor_id references users (profiles)
    
    IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE investor_id = v_profile_id AND asset_code = 'BTC' AND amount = 1.5) THEN
        INSERT INTO public.transactions (investor_id, asset_code, amount, type, status, created_at, confirmed_at)
        VALUES (v_profile_id, 'BTC', 1.5, 'DEPOSIT', 'confirmed', '2024-01-15 10:00:00+00', '2024-01-15 10:00:00+00');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE investor_id = v_profile_id AND asset_code = 'BTC' AND amount = -0.2) THEN
        INSERT INTO public.transactions (investor_id, asset_code, amount, type, status, created_at, confirmed_at)
        VALUES (v_profile_id, 'BTC', -0.2, 'WITHDRAWAL', 'confirmed', '2024-03-20 14:30:00+00', '2024-03-20 14:30:00+00');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE investor_id = v_profile_id AND asset_code = 'ETH' AND amount = 50.0) THEN
        INSERT INTO public.transactions (investor_id, asset_code, amount, type, status, created_at, confirmed_at)
        VALUES (v_profile_id, 'ETH', 50.0, 'DEPOSIT', 'confirmed', '2024-02-10 09:15:00+00', '2024-02-10 09:15:00+00');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE investor_id = v_profile_id AND asset_code = 'USDT' AND amount = 100000.0) THEN
        INSERT INTO public.transactions (investor_id, asset_code, amount, type, status, created_at, confirmed_at)
        VALUES (v_profile_id, 'USDT', 100000.0, 'DEPOSIT', 'confirmed', '2024-01-05 11:00:00+00', '2024-01-05 11:00:00+00');
    END IF;

    RAISE NOTICE 'Seeded transactions for testinvestor.';

END $$;

-- 5. Re-Run Backfill Logic
DO $$
DECLARE
    curr_date DATE;
    end_date DATE := CURRENT_DATE;
    start_date DATE;
    month_start DATE;
    month_end DATE;
BEGIN
    SELECT MIN(created_at)::DATE INTO start_date FROM public.transactions;
    IF start_date IS NULL THEN start_date := '2024-01-01'; END IF;
    curr_date := start_date;

    RAISE NOTICE 'Re-Running Backfill...';

    WHILE curr_date <= end_date LOOP
        -- Daily NAV (No changes needed, purely aggregate)
        INSERT INTO public.daily_nav (fund_id, nav_date, aum, total_inflows, total_outflows, created_at)
        SELECT 
            f.id as fund_id,
            curr_date as nav_date,
            COALESCE((
                SELECT SUM(amount) 
                FROM public.transactions t_all 
                WHERE (
                    (f.code = 'IND-USDT' AND t_all.asset_code IN ('USDT', 'USDC')) OR
                    (f.code != 'IND-USDT' AND t_all.asset_code::text = f.asset)
                ) AND t_all.created_at::DATE <= curr_date
            ), 0) as aum,
            COALESCE((
                SELECT SUM(amount) 
                FROM public.transactions t_in 
                WHERE (
                    (f.code = 'IND-USDT' AND t_in.asset_code IN ('USDT', 'USDC')) OR
                    (f.code != 'IND-USDT' AND t_in.asset_code::text = f.asset)
                ) AND t_in.created_at::DATE = curr_date AND t_in.type = 'DEPOSIT'
            ), 0) as total_inflows,
            ABS(COALESCE((
                SELECT SUM(amount) 
                FROM public.transactions t_out 
                WHERE (
                    (f.code = 'IND-USDT' AND t_out.asset_code IN ('USDT', 'USDC')) OR
                    (f.code != 'IND-USDT' AND t_out.asset_code::text = f.asset)
                ) AND t_out.created_at::DATE = curr_date AND t_out.type = 'WITHDRAWAL'
            ), 0)) as total_outflows,
            NOW()
        FROM public.funds f
        GROUP BY f.id
        ON CONFLICT (fund_id, nav_date) 
        DO UPDATE SET aum = EXCLUDED.aum, total_inflows = EXCLUDED.total_inflows, total_outflows = EXCLUDED.total_outflows;
        
        curr_date := curr_date + 1;
    END LOOP;

    -- Monthly Reports Backfill (Join investors to map profile_id to investor_id)
    curr_date := start_date;
    WHILE curr_date <= end_date LOOP
        month_start := DATE_TRUNC('month', curr_date);
        month_end := (DATE_TRUNC('month', curr_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

        INSERT INTO public.investor_monthly_reports (
            investor_id, report_month, asset_code, opening_balance, additions, withdrawals, closing_balance, yield_earned, created_at, updated_at
        )
        SELECT 
            i.id, -- Use Investor ID
            month_start,
            t.asset_code,
            COALESCE((SELECT SUM(amount) FROM public.transactions t2 WHERE t2.investor_id = t.investor_id AND t2.asset_code = t.asset_code AND t2.created_at < month_start), 0),
            COALESCE((SELECT SUM(amount) FROM public.transactions t3 WHERE t3.investor_id = t.investor_id AND t3.asset_code = t.asset_code AND t3.created_at >= month_start AND t3.created_at <= month_end + INTERVAL '1 day' AND t3.type = 'DEPOSIT'), 0),
            ABS(COALESCE((SELECT SUM(amount) FROM public.transactions t4 WHERE t4.investor_id = t.investor_id AND t4.asset_code = t.asset_code AND t4.created_at >= month_start AND t4.created_at <= month_end + INTERVAL '1 day' AND t4.type = 'WITHDRAWAL'), 0)),
            0, 0, NOW(), NOW()
        FROM public.transactions t
        JOIN public.investors i ON i.profile_id = t.investor_id -- JOIN HERE to map User ID (t.investor_id) to Investor ID (i.id)
        WHERE t.created_at <= month_end + INTERVAL '1 day'
        GROUP BY t.investor_id, t.asset_code, i.id
        ON CONFLICT (investor_id, report_month, asset_code) 
        DO UPDATE SET
            opening_balance = EXCLUDED.opening_balance,
            additions = EXCLUDED.additions,
            withdrawals = EXCLUDED.withdrawals,
            closing_balance = EXCLUDED.opening_balance + EXCLUDED.additions - EXCLUDED.withdrawals + investor_monthly_reports.yield_earned,
            updated_at = NOW();

        curr_date := curr_date + INTERVAL '1 month';
    END LOOP;

END $$;
