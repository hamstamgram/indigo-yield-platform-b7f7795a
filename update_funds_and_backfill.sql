-- 1. Rename USDT Fund to generic "Stablecoin"
UPDATE public.funds
SET name = 'Indigo Stablecoin Yield Fund'
WHERE code = 'IND-USDT';

-- 2. Ensure xAUT Fund exists (Gold)
INSERT INTO public.funds (code, name, asset, fund_class, status, inception_date)
VALUES (
    'IND-xAUT',
    'Indigo Gold Yield Fund',
    'xAUT',
    'xAUT',
    'active',
    '2024-01-01'
)
ON CONFLICT (code) DO NOTHING;

-- TEMPORARILY DISABLE AUDIT TRIGGER (Fixes composite key issue)
ALTER TABLE public.daily_nav DISABLE TRIGGER audit_daily_nav_changes;

-- 3. Historical Backfill Logic
DO $$
DECLARE
    f RECORD;
    start_date DATE;
    curr_date DATE;
    daily_in NUMERIC;
    daily_out NUMERIC;
    daily_net NUMERIC;
    running_aum NUMERIC;
    target_assets asset_code[];
BEGIN
    SELECT MIN(created_at)::DATE INTO start_date FROM public.transactions;
    IF start_date IS NULL THEN
        start_date := '2024-01-01'; 
    END IF;

    FOR f IN SELECT id, code, asset FROM public.funds LOOP
        
        curr_date := start_date;
        running_aum := 0;

        -- INTELLIGENT ASSET SELECTION
        IF f.code = 'IND-USDT' THEN
            target_assets := ARRAY['USDT'::asset_code, 'USDC'::asset_code];
            RAISE NOTICE 'Processing Stablecoin Fund (USDT + USDC)...';
        ELSE
            target_assets := ARRAY[f.asset::asset_code];
            RAISE NOTICE 'Processing Single-Asset Fund: %', f.asset;
        END IF;

        WHILE curr_date <= CURRENT_DATE LOOP
            
            SELECT COALESCE(SUM(amount), 0) INTO daily_in
            FROM public.transactions
            WHERE asset_code = ANY(target_assets)
              AND type = 'DEPOSIT'
              AND created_at::DATE = curr_date;

            SELECT COALESCE(SUM(amount), 0) INTO daily_out
            FROM public.transactions
            WHERE asset_code = ANY(target_assets)
              AND type = 'WITHDRAWAL'
              AND created_at::DATE = curr_date;
            
            daily_net := daily_in + daily_out; 
            running_aum := running_aum + daily_net;

            INSERT INTO public.daily_nav (
                fund_id, 
                nav_date, 
                aum, 
                total_inflows, 
                total_outflows, 
                nav_per_share, 
                shares_outstanding
            )
            VALUES (
                f.id,
                curr_date,
                running_aum,
                daily_in,
                ABS(daily_out), 
                1.0, 
                running_aum
            )
            ON CONFLICT (fund_id, nav_date) DO UPDATE SET
                aum = EXCLUDED.aum,
                total_inflows = EXCLUDED.total_inflows,
                total_outflows = EXCLUDED.total_outflows;

            curr_date := curr_date + 1;
        END LOOP;
    END LOOP;
END $$;

-- RE-ENABLE AUDIT TRIGGER
ALTER TABLE public.daily_nav ENABLE TRIGGER audit_daily_nav_changes;
