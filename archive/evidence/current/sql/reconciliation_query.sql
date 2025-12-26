-- Evidence Pack: Token-Denominated Reconciliation Query
-- NO USD CONVERSIONS - All values in native token units

-- This query produces reconciliation data for verification
-- Formula: Beginning + Additions - Redemptions + Net Income - Fees - IB Commission = Ending

WITH reconciliation_data AS (
    SELECT 
        p.full_name AS investor_name,
        p.id AS investor_id,
        ifp.fund_name,
        sp.year,
        sp.month,
        sp.id AS period_id,
        
        -- All values in TOKEN units (no USD conversion)
        COALESCE(ifp.mtd_beginning_balance, 0) AS beginning_balance_token,
        COALESCE(ifp.mtd_additions, 0) AS additions_token,
        COALESCE(ifp.mtd_redemptions, 0) AS redemptions_token,
        COALESCE(ifp.mtd_ending_balance, 0) AS ending_balance_token,
        COALESCE(ifp.mtd_net_income, 0) AS net_income_token,
        
        -- Get fees for this investor/fund/period
        COALESCE((
            SELECT SUM(fa.fee_amount)
            FROM fee_allocations fa
            JOIN funds f ON f.id = fa.fund_id
            WHERE fa.investor_id = p.id
              AND fa.period_start <= sp.period_end
              AND fa.period_end >= sp.period_start
              AND f.name = ifp.fund_name
        ), 0) AS fees_token,
        
        -- Get IB commissions for this investor/fund/period
        COALESCE((
            SELECT SUM(iba.ib_fee_amount)
            FROM ib_allocations iba
            JOIN funds f ON f.id = iba.fund_id
            WHERE iba.source_investor_id = p.id
              AND iba.period_start <= sp.period_end
              AND iba.period_end >= sp.period_start
              AND f.name = ifp.fund_name
        ), 0) AS ib_commission_token,
        
        ifp.mtd_rate_of_return AS ror_pct
        
    FROM investor_fund_performance ifp
    JOIN profiles p ON p.id = ifp.investor_id
    JOIN statement_periods sp ON sp.id = ifp.period_id
    WHERE ifp.purpose = 'reporting'
      AND p.is_admin = false
      AND p.full_name NOT ILIKE '%INDIGO FEES%'
      AND p.full_name NOT ILIKE '%fees account%'
    ORDER BY p.full_name, ifp.fund_name, sp.year DESC, sp.month DESC
)
SELECT 
    investor_name,
    fund_name,
    year || '-' || LPAD(month::text, 2, '0') AS period,
    
    -- Token-denominated values (NO USD)
    ROUND(beginning_balance_token::numeric, 8) AS beginning_balance,
    ROUND(additions_token::numeric, 8) AS additions,
    ROUND(redemptions_token::numeric, 8) AS redemptions,
    ROUND(ending_balance_token::numeric, 8) AS ending_balance,
    ROUND(net_income_token::numeric, 8) AS net_income,
    ROUND(fees_token::numeric, 8) AS fees,
    ROUND(ib_commission_token::numeric, 8) AS ib_commission,
    
    -- Reconciliation check
    -- Formula: Beginning + Additions - Redemptions + Net Income = Ending
    -- (Fees and IB are already deducted from net_income in our model)
    CASE 
        WHEN ABS(
            beginning_balance_token + additions_token - redemptions_token + net_income_token 
            - ending_balance_token
        ) < 0.00000001 THEN 'PASS ✓'
        ELSE 'FAIL ✗ (diff: ' || ROUND((
            beginning_balance_token + additions_token - redemptions_token + net_income_token 
            - ending_balance_token
        )::numeric, 8)::text || ')'
    END AS reconcile_check,
    
    -- Rate of Return (handle zero beginning balance)
    CASE 
        WHEN beginning_balance_token = 0 THEN 'N/A (zero start)'
        ELSE ROUND((net_income_token / beginning_balance_token * 100)::numeric, 4)::text || '%'
    END AS ror_calculated,
    
    ROUND(ror_pct::numeric, 4) || '%' AS ror_stored

FROM reconciliation_data
LIMIT 50;
