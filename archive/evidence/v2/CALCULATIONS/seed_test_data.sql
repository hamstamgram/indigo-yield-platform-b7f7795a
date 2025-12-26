-- INDIGO Platform Reconciliation Test Data Seed Script
-- Generated: 2024-12-21
-- Purpose: Create deterministic test data for reconciliation verification
-- 
-- THIS SCRIPT CREATES:
-- - 2 Test Investors: Test Investor A, Test Investor B
-- - 2 Funds: BTC Yield Fund, ETH Yield Fund
-- - 2 Periods: November 2024, December 2024
-- - Transactions: Deposits, Yields (Interest), Fees, Redemptions
--
-- All amounts are in TOKEN units (BTC/ETH), NOT USD

-- ============================================================================
-- STEP 1: Create Statement Periods
-- ============================================================================
INSERT INTO statement_periods (id, year, month, period_name, period_end_date, status)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 2024, 11, 'November 2024', '2024-11-30', 'CLOSED'),
    ('22222222-2222-2222-2222-222222222222', 2024, 12, 'December 2024', '2024-12-31', 'OPEN')
ON CONFLICT (year, month) DO NOTHING;

-- ============================================================================
-- STEP 2: Get or Create Test Investors
-- (Use existing profiles or create test ones)
-- ============================================================================
-- NOTE: Replace these UUIDs with actual test investor IDs from your database
-- For this seed script, we assume these profiles exist or will be created

-- Test Investor A: Standard investor with deposits and yields
-- Test Investor B: IB investor with referral commissions

-- ============================================================================
-- STEP 3: Insert Test Transactions for Investor A - BTC Fund
-- ============================================================================

-- November 2024 - Investor A - BTC Fund
-- Beginning Balance: 0 BTC (new investor)
-- + Deposit: 10.00000000 BTC on Nov 1
-- + Interest: 0.05000000 BTC (0.5% yield)
-- - Fee: 0.01000000 BTC (20% of yield)
-- = Ending Balance: 10.04000000 BTC

INSERT INTO transactions_v2 (investor_id, fund_id, asset, type, amount, tx_date, purpose, reference_id, notes)
SELECT 
    p.id,
    f.id,
    'BTC',
    'DEPOSIT',
    10.00000000,
    '2024-11-01',
    'reporting',
    'TEST-A-BTC-DEP-NOV-001',
    'Test seed: Initial deposit'
FROM profiles p
CROSS JOIN funds f
WHERE p.display_name LIKE '%Test Investor A%' 
  AND f.asset = 'BTC'
ON CONFLICT (reference_id) DO NOTHING;

INSERT INTO transactions_v2 (investor_id, fund_id, asset, type, amount, tx_date, purpose, reference_id, notes)
SELECT 
    p.id,
    f.id,
    'BTC',
    'INTEREST',
    0.05000000,
    '2024-11-30',
    'reporting',
    'TEST-A-BTC-INT-NOV-001',
    'Test seed: November yield'
FROM profiles p
CROSS JOIN funds f
WHERE p.display_name LIKE '%Test Investor A%' 
  AND f.asset = 'BTC'
ON CONFLICT (reference_id) DO NOTHING;

INSERT INTO transactions_v2 (investor_id, fund_id, asset, type, amount, tx_date, purpose, reference_id, notes)
SELECT 
    p.id,
    f.id,
    'BTC',
    'FEE',
    -0.01000000,
    '2024-11-30',
    'reporting',
    'TEST-A-BTC-FEE-NOV-001',
    'Test seed: November performance fee'
FROM profiles p
CROSS JOIN funds f
WHERE p.display_name LIKE '%Test Investor A%' 
  AND f.asset = 'BTC'
ON CONFLICT (reference_id) DO NOTHING;

-- December 2024 - Investor A - BTC Fund
-- Beginning Balance: 10.04000000 BTC
-- + Interest: 0.05020000 BTC (0.5% yield)
-- - Fee: 0.01004000 BTC (20% of yield)
-- - Redemption: 2.00000000 BTC
-- = Ending Balance: 8.08016000 BTC

INSERT INTO transactions_v2 (investor_id, fund_id, asset, type, amount, tx_date, purpose, reference_id, notes)
SELECT 
    p.id,
    f.id,
    'BTC',
    'INTEREST',
    0.05020000,
    '2024-12-31',
    'reporting',
    'TEST-A-BTC-INT-DEC-001',
    'Test seed: December yield'
FROM profiles p
CROSS JOIN funds f
WHERE p.display_name LIKE '%Test Investor A%' 
  AND f.asset = 'BTC'
ON CONFLICT (reference_id) DO NOTHING;

INSERT INTO transactions_v2 (investor_id, fund_id, asset, type, amount, tx_date, purpose, reference_id, notes)
SELECT 
    p.id,
    f.id,
    'BTC',
    'FEE',
    -0.01004000,
    '2024-12-31',
    'reporting',
    'TEST-A-BTC-FEE-DEC-001',
    'Test seed: December performance fee'
FROM profiles p
CROSS JOIN funds f
WHERE p.display_name LIKE '%Test Investor A%' 
  AND f.asset = 'BTC'
ON CONFLICT (reference_id) DO NOTHING;

INSERT INTO transactions_v2 (investor_id, fund_id, asset, type, amount, tx_date, purpose, reference_id, notes)
SELECT 
    p.id,
    f.id,
    'BTC',
    'REDEMPTION',
    -2.00000000,
    '2024-12-15',
    'reporting',
    'TEST-A-BTC-RED-DEC-001',
    'Test seed: Partial redemption'
FROM profiles p
CROSS JOIN funds f
WHERE p.display_name LIKE '%Test Investor A%' 
  AND f.asset = 'BTC'
ON CONFLICT (reference_id) DO NOTHING;

-- ============================================================================
-- STEP 4: Insert Test Transactions for Investor B - ETH Fund
-- ============================================================================

-- November 2024 - Investor B - ETH Fund
-- Beginning Balance: 0 ETH (new investor)
-- + Deposit: 50.00000000 ETH on Nov 5
-- + Interest: 0.25000000 ETH (0.5% yield)
-- - Fee: 0.05000000 ETH (20% of yield)
-- = Ending Balance: 50.20000000 ETH

INSERT INTO transactions_v2 (investor_id, fund_id, asset, type, amount, tx_date, purpose, reference_id, notes)
SELECT 
    p.id,
    f.id,
    'ETH',
    'DEPOSIT',
    50.00000000,
    '2024-11-05',
    'reporting',
    'TEST-B-ETH-DEP-NOV-001',
    'Test seed: Initial deposit'
FROM profiles p
CROSS JOIN funds f
WHERE p.display_name LIKE '%Test Investor B%' 
  AND f.asset = 'ETH'
ON CONFLICT (reference_id) DO NOTHING;

INSERT INTO transactions_v2 (investor_id, fund_id, asset, type, amount, tx_date, purpose, reference_id, notes)
SELECT 
    p.id,
    f.id,
    'ETH',
    'INTEREST',
    0.25000000,
    '2024-11-30',
    'reporting',
    'TEST-B-ETH-INT-NOV-001',
    'Test seed: November yield'
FROM profiles p
CROSS JOIN funds f
WHERE p.display_name LIKE '%Test Investor B%' 
  AND f.asset = 'ETH'
ON CONFLICT (reference_id) DO NOTHING;

INSERT INTO transactions_v2 (investor_id, fund_id, asset, type, amount, tx_date, purpose, reference_id, notes)
SELECT 
    p.id,
    f.id,
    'ETH',
    'FEE',
    -0.05000000,
    '2024-11-30',
    'reporting',
    'TEST-B-ETH-FEE-NOV-001',
    'Test seed: November performance fee'
FROM profiles p
CROSS JOIN funds f
WHERE p.display_name LIKE '%Test Investor B%' 
  AND f.asset = 'ETH'
ON CONFLICT (reference_id) DO NOTHING;

-- December 2024 - Investor B - ETH Fund
-- Beginning Balance: 50.20000000 ETH
-- + Deposit: 10.00000000 ETH (additional deposit)
-- + Interest: 0.30100000 ETH (0.5% yield on 60.20 avg)
-- - Fee: 0.06020000 ETH (20% of yield)
-- = Ending Balance: 60.44080000 ETH

INSERT INTO transactions_v2 (investor_id, fund_id, asset, type, amount, tx_date, purpose, reference_id, notes)
SELECT 
    p.id,
    f.id,
    'ETH',
    'DEPOSIT',
    10.00000000,
    '2024-12-01',
    'reporting',
    'TEST-B-ETH-DEP-DEC-001',
    'Test seed: Additional deposit'
FROM profiles p
CROSS JOIN funds f
WHERE p.display_name LIKE '%Test Investor B%' 
  AND f.asset = 'ETH'
ON CONFLICT (reference_id) DO NOTHING;

INSERT INTO transactions_v2 (investor_id, fund_id, asset, type, amount, tx_date, purpose, reference_id, notes)
SELECT 
    p.id,
    f.id,
    'ETH',
    'INTEREST',
    0.30100000,
    '2024-12-31',
    'reporting',
    'TEST-B-ETH-INT-DEC-001',
    'Test seed: December yield'
FROM profiles p
CROSS JOIN funds f
WHERE p.display_name LIKE '%Test Investor B%' 
  AND f.asset = 'ETH'
ON CONFLICT (reference_id) DO NOTHING;

INSERT INTO transactions_v2 (investor_id, fund_id, asset, type, amount, tx_date, purpose, reference_id, notes)
SELECT 
    p.id,
    f.id,
    'ETH',
    'FEE',
    -0.06020000,
    '2024-12-31',
    'reporting',
    'TEST-B-ETH-FEE-DEC-001',
    'Test seed: December performance fee'
FROM profiles p
CROSS JOIN funds f
WHERE p.display_name LIKE '%Test Investor B%' 
  AND f.asset = 'ETH'
ON CONFLICT (reference_id) DO NOTHING;

-- ============================================================================
-- STEP 5: Insert investor_fund_performance records
-- These are the expected calculated values for verification
-- ============================================================================

-- November 2024 - Investor A - BTC
INSERT INTO investor_fund_performance (
    investor_id, period_id, fund_name, purpose,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, mtd_net_income, mtd_ending_balance, mtd_rate_of_return,
    qtd_beginning_balance, qtd_additions, qtd_redemptions, qtd_net_income, qtd_ending_balance, qtd_rate_of_return,
    ytd_beginning_balance, ytd_additions, ytd_redemptions, ytd_net_income, ytd_ending_balance, ytd_rate_of_return,
    itd_beginning_balance, itd_additions, itd_redemptions, itd_net_income, itd_ending_balance, itd_rate_of_return
)
SELECT 
    p.id,
    '11111111-1111-1111-1111-111111111111',
    'BTC',
    'reporting',
    -- MTD: 0 + 10 - 0 + 0.04 = 10.04
    0.00000000, 10.00000000, 0.00000000, 0.04000000, 10.04000000, 0.00,
    -- QTD: Same as MTD (Q4 start is Oct)
    0.00000000, 10.00000000, 0.00000000, 0.04000000, 10.04000000, 0.00,
    -- YTD: Same as MTD (new in Nov)
    0.00000000, 10.00000000, 0.00000000, 0.04000000, 10.04000000, 0.00,
    -- ITD: Same as MTD (inception)
    0.00000000, 10.00000000, 0.00000000, 0.04000000, 10.04000000, 0.40
FROM profiles p
WHERE p.display_name LIKE '%Test Investor A%'
ON CONFLICT (period_id, investor_id, fund_name, purpose) DO UPDATE SET
    mtd_beginning_balance = EXCLUDED.mtd_beginning_balance,
    mtd_additions = EXCLUDED.mtd_additions,
    mtd_redemptions = EXCLUDED.mtd_redemptions,
    mtd_net_income = EXCLUDED.mtd_net_income,
    mtd_ending_balance = EXCLUDED.mtd_ending_balance;

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to confirm the reconciliation formula holds
-- ============================================================================

-- Formula: beginning + additions - redemptions + net_income = ending

-- Query 1: Verify November 2024 Investor A BTC
/*
SELECT 
    'Investor A - BTC - Nov 2024' as test_case,
    mtd_beginning_balance as beginning,
    mtd_additions as additions,
    mtd_redemptions as redemptions,
    mtd_net_income as net_income,
    mtd_ending_balance as ending,
    (mtd_beginning_balance + mtd_additions - mtd_redemptions + mtd_net_income) as calculated_ending,
    CASE 
        WHEN ABS(mtd_ending_balance - (mtd_beginning_balance + mtd_additions - mtd_redemptions + mtd_net_income)) < 0.00001
        THEN 'PASS'
        ELSE 'FAIL'
    END as reconciliation_status
FROM investor_fund_performance ifp
JOIN profiles p ON ifp.investor_id = p.id
JOIN statement_periods sp ON ifp.period_id = sp.id
WHERE p.display_name LIKE '%Test Investor A%'
  AND sp.month = 11 AND sp.year = 2024
  AND ifp.fund_name = 'BTC';
*/
