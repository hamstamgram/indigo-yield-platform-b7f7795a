-- Recalculate Positions from Transactions (Token Native)
-- Rule: All balances are in token units (BTC, ETH, etc.), NOT USD.

-- 1. Clear existing positions to avoid duplicates/stale data
TRUNCATE TABLE public.positions;

-- 2. Insert calculated positions
INSERT INTO public.positions (investor_id, asset_code, current_balance, principal, total_earned, updated_at)
SELECT 
    t.investor_id,
    t.asset_code,
    -- Current Balance: Simple Sum of all transaction amounts (Withdrawals are already negative in DB)
    SUM(t.amount) as current_balance,
    -- Principal: Sum of positive deposits only
    SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as principal,
    -- Total Earned: 0 for now (calculated separately via Statements usually)
    0 as total_earned,
    NOW()
FROM 
    public.transactions t
GROUP BY 
    t.investor_id, 
    t.asset_code
HAVING 
    SUM(t.amount) <> 0; -- Only insert if there is a non-zero balance

-- 3. Log the result
DO $$
DECLARE 
    row_count INT;
BEGIN
    SELECT count(*) INTO row_count FROM public.positions;
    RAISE NOTICE 'Successfully populated positions table with % records based on Token Native values.', row_count;
END $$;
