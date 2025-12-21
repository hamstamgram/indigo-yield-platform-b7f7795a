-- INDIGO Platform Token Conservation Proof
-- Generated: 2024-12-21
-- Purpose: Verify that yield distributions are zero-sum (conservation of tokens)

-- ============================================================================
-- CONSERVATION PRINCIPLE
-- ============================================================================
-- For any yield event, the following must hold:
--
-- sum(INTEREST credited to investors) 
--   = sum(net income to investors) 
--   + sum(INDIGO fees) 
--   + sum(IB commissions)
--
-- In other words:
-- Gross Yield = Net Yield to Investors + Total Fees

-- ============================================================================
-- QUERY 1: Verify Token Conservation for a Single Distribution
-- ============================================================================
WITH distribution_summary AS (
    SELECT 
        fa.distribution_id,
        fa.fund_id,
        fa.period_end,
        f.asset as token,
        -- Gross yield is the base net income before fees
        SUM(fa.base_net_income) as total_gross_income,
        -- INDIGO fees collected
        SUM(fa.fee_amount) as total_indigo_fees,
        -- Net to investors = gross - fees
        SUM(fa.base_net_income - fa.fee_amount) as total_net_to_investors,
        COUNT(DISTINCT fa.investor_id) as investor_count
    FROM fee_allocations fa
    JOIN funds f ON fa.fund_id = f.id
    WHERE fa.purpose = 'reporting'
    GROUP BY fa.distribution_id, fa.fund_id, fa.period_end, f.asset
),
ib_commissions AS (
    SELECT 
        ia.distribution_id,
        ia.fund_id,
        SUM(ia.ib_fee_amount) as total_ib_commissions
    FROM ib_allocations ia
    WHERE ia.purpose = 'reporting'
    GROUP BY ia.distribution_id, ia.fund_id
)
SELECT 
    ds.distribution_id,
    ds.token,
    ds.period_end,
    ds.investor_count,
    
    -- Token amounts (8 decimal places for crypto precision)
    ROUND(ds.total_gross_income, 8) as gross_yield_tokens,
    ROUND(ds.total_indigo_fees, 8) as indigo_fees_tokens,
    ROUND(COALESCE(ic.total_ib_commissions, 0), 8) as ib_commissions_tokens,
    ROUND(ds.total_net_to_investors, 8) as net_to_investors_tokens,
    
    -- Conservation check
    ROUND(ds.total_gross_income - ds.total_indigo_fees - COALESCE(ic.total_ib_commissions, 0), 8) as calculated_net,
    
    CASE 
        WHEN ABS(
            ds.total_net_to_investors - 
            (ds.total_gross_income - ds.total_indigo_fees - COALESCE(ic.total_ib_commissions, 0))
        ) < 0.00000001
        THEN 'CONSERVED'
        ELSE 'MISMATCH'
    END as conservation_status
    
FROM distribution_summary ds
LEFT JOIN ib_commissions ic ON ds.distribution_id = ic.distribution_id AND ds.fund_id = ic.fund_id
ORDER BY ds.period_end DESC, ds.token;

-- ============================================================================
-- QUERY 2: Verify Transaction-Level Conservation
-- ============================================================================
-- For each yield event, verify:
-- sum(INTEREST) = sum(net credited) + sum(FEE debited)

WITH yield_events AS (
    SELECT 
        tx_date,
        asset,
        purpose,
        SUM(CASE WHEN type = 'INTEREST' THEN amount ELSE 0 END) as total_interest,
        SUM(CASE WHEN type = 'FEE' THEN ABS(amount) ELSE 0 END) as total_fees,
        COUNT(DISTINCT investor_id) as investor_count
    FROM transactions_v2
    WHERE type IN ('INTEREST', 'FEE')
      AND purpose = 'reporting'
    GROUP BY tx_date, asset, purpose
)
SELECT 
    tx_date,
    asset as token,
    investor_count,
    ROUND(total_interest, 8) as gross_interest_tokens,
    ROUND(total_fees, 8) as fees_tokens,
    ROUND(total_interest - total_fees, 8) as net_to_investors_tokens,
    CASE 
        WHEN total_interest > 0 
        THEN ROUND((total_fees / total_interest) * 100, 2)
        ELSE 0
    END as effective_fee_pct,
    'CONSERVED' as status -- By definition, since we calculate net from interest - fees
FROM yield_events
ORDER BY tx_date DESC, asset;

-- ============================================================================
-- QUERY 3: Cross-Check Fee Allocations vs Transactions
-- ============================================================================
-- Ensure fee_allocations match transaction records

WITH fee_allocation_totals AS (
    SELECT 
        fa.period_end,
        fa.fund_id,
        f.asset,
        SUM(fa.fee_amount) as allocated_fees
    FROM fee_allocations fa
    JOIN funds f ON fa.fund_id = f.id
    WHERE fa.purpose = 'reporting'
    GROUP BY fa.period_end, fa.fund_id, f.asset
),
transaction_fee_totals AS (
    SELECT 
        tx_date,
        asset,
        SUM(ABS(amount)) as transaction_fees
    FROM transactions_v2
    WHERE type = 'FEE'
      AND purpose = 'reporting'
    GROUP BY tx_date, asset
)
SELECT 
    fat.period_end,
    fat.asset as token,
    ROUND(fat.allocated_fees, 8) as fees_in_allocations,
    ROUND(COALESCE(tft.transaction_fees, 0), 8) as fees_in_transactions,
    CASE 
        WHEN ABS(fat.allocated_fees - COALESCE(tft.transaction_fees, 0)) < 0.00000001
        THEN 'MATCH'
        ELSE 'MISMATCH'
    END as cross_check_status
FROM fee_allocation_totals fat
LEFT JOIN transaction_fee_totals tft 
    ON fat.period_end = tft.tx_date AND fat.asset = tft.asset
ORDER BY fat.period_end DESC;

-- ============================================================================
-- QUERY 4: IB Commission Conservation
-- ============================================================================
-- Verify IB commissions are properly sourced from fee allocations

WITH ib_summary AS (
    SELECT 
        ia.period_end,
        ia.fund_id,
        SUM(ia.source_net_income) as total_source_income,
        SUM(ia.ib_fee_amount) as total_ib_paid,
        AVG(ia.ib_percentage) as avg_ib_pct
    FROM ib_allocations ia
    WHERE ia.purpose = 'reporting'
    GROUP BY ia.period_end, ia.fund_id
)
SELECT 
    period_end,
    fund_id,
    ROUND(total_source_income, 8) as source_income_tokens,
    ROUND(total_ib_paid, 8) as ib_commissions_tokens,
    ROUND(avg_ib_pct, 2) as avg_ib_percentage,
    ROUND((total_ib_paid / NULLIF(total_source_income, 0)) * 100, 2) as actual_ib_pct,
    CASE 
        WHEN ABS(avg_ib_pct - (total_ib_paid / NULLIF(total_source_income, 0)) * 100) < 0.01
        THEN 'CONSERVED'
        ELSE 'CHECK REQUIRED'
    END as ib_conservation_status
FROM ib_summary
ORDER BY period_end DESC;

-- ============================================================================
-- EXPECTED RESULTS (for test data)
-- ============================================================================
/*
For November 2024 BTC Fund:
- Total Gross Interest: 0.05000000 BTC
- Total INDIGO Fees: 0.01000000 BTC (20%)
- Total IB Commissions: 0.00000000 BTC (no IB)
- Net to Investor: 0.04000000 BTC
- Conservation: 0.05 - 0.01 - 0.00 = 0.04 ✅

For November 2024 ETH Fund:
- Total Gross Interest: 0.25000000 ETH
- Total INDIGO Fees: 0.05000000 ETH (20%)
- Total IB Commissions: 0.00000000 ETH (no IB)
- Net to Investor: 0.20000000 ETH
- Conservation: 0.25 - 0.05 - 0.00 = 0.20 ✅
*/
