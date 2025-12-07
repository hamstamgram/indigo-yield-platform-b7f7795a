CREATE OR REPLACE FUNCTION get_fund_composition(p_fund_id UUID, p_date DATE)
RETURNS TABLE (
    investor_name TEXT,
    email TEXT,
    balance NUMERIC,
    ownership_pct NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (p.first_name || ' ' || p.last_name) as investor_name,
        p.email,
        idb.balance,
        idb.ownership_percentage * 100 as ownership_pct -- Return as 0-100 scale
    FROM 
        public.investor_daily_balances idb
    JOIN 
        public.profiles p ON p.id = idb.investor_id
    WHERE 
        idb.fund_id = p_fund_id
        AND idb.nav_date = p_date
    ORDER BY 
        idb.balance DESC;
END;
$$;
