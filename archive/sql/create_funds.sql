-- 1. Identify Assets from Transactions and Create Funds
DO $$
DECLARE
    r RECORD;
    fund_uuid UUID;
BEGIN
    FOR r IN SELECT DISTINCT asset_code FROM public.transactions LOOP
        -- Generate a deterministic name/code
        -- e.g. 'BTC' -> 'Indigo Bitcoin Yield Fund', 'IND-BTC'
        
        INSERT INTO public.funds (code, name, asset, fund_class, status, inception_date)
        VALUES (
            'IND-' || r.asset_code,
            'Indigo ' || r.asset_code || ' Yield Fund',
            r.asset_code,
            r.asset_code, -- fund_class seems to match asset based on constraints
            'active',
            '2024-01-01' -- Default inception, or min transaction date
        )
        ON CONFLICT (code) DO NOTHING;
        
        RAISE NOTICE 'Ensured Fund exists for asset: %', r.asset_code;
    END LOOP;
END $$;
