-- 1. Populate 'investors' from 'profiles'
INSERT INTO public.investors (profile_id, name, email, status, kyc_status, aml_status)
SELECT 
    id as profile_id,
    TRIM(first_name || ' ' || last_name) as name,
    email,
    'active',
    'approved',
    'approved'
FROM public.profiles
WHERE id NOT IN (SELECT profile_id FROM public.investors WHERE profile_id IS NOT NULL);

-- DISABLE TRIGGER for migration
ALTER TABLE public.investor_positions DISABLE TRIGGER audit_investor_positions_changes;

-- 2. Migrate Legacy Positions
INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, cost_basis, updated_at)
SELECT 
    inv.id as investor_id,
    f.id as fund_id,
    p.current_balance as shares,
    p.current_balance as current_value,
    p.principal as cost_basis,
    NOW()
FROM 
    public.positions p
JOIN 
    public.investors inv ON inv.profile_id = p.investor_id
JOIN 
    public.funds f ON (
        (f.code = 'IND-USDT' AND p.asset_code IN ('USDT', 'USDC')) OR
        (f.code != 'IND-USDT' AND f.asset = p.asset_code::text)
    )
ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    shares = EXCLUDED.shares,
    current_value = EXCLUDED.current_value,
    cost_basis = EXCLUDED.cost_basis,
    updated_at = NOW();

-- ENABLE TRIGGER
ALTER TABLE public.investor_positions ENABLE TRIGGER audit_investor_positions_changes;

-- 3. Verify
DO $$
DECLARE
    legacy_count INT;
    new_count INT;
BEGIN
    SELECT count(*) INTO legacy_count FROM public.positions;
    SELECT count(*) INTO new_count FROM public.investor_positions;
    
    RAISE NOTICE 'Migration Complete.';
    RAISE NOTICE 'Legacy Positions: %', legacy_count;
    RAISE NOTICE 'New Investor Positions: %', new_count;
END $$;