-- Evidence Pack: Minimal Seed Dataset for Reconciliation Testing
-- Creates test data for 2 investors × 2 funds × 2 periods
-- ALL VALUES IN TOKEN UNITS - NO USD

-- ============================================
-- STEP 1: Create test statement periods
-- ============================================
INSERT INTO statement_periods (id, year, month, period_start, period_end, status)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 2024, 11, '2024-11-01', '2024-11-30', 'closed'),
    ('22222222-2222-2222-2222-222222222222', 2024, 12, '2024-12-01', '2024-12-31', 'open')
ON CONFLICT (year, month) DO NOTHING;

-- ============================================
-- STEP 2: Create test investors (if not exist)
-- ============================================
-- Note: In production, use actual investor IDs from profiles table
-- This is for testing purposes only

-- Get existing investor IDs for testing:
-- SELECT id, full_name FROM profiles WHERE is_admin = false LIMIT 2;

-- ============================================
-- STEP 3: Insert test performance data
-- ============================================
-- Using placeholder investor IDs - replace with actual IDs

-- Investor 1, BTC Fund, November 2024
INSERT INTO investor_fund_performance (
    id, investor_id, period_id, fund_name, purpose,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, 
    mtd_ending_balance, mtd_net_income, mtd_rate_of_return
) VALUES (
    gen_random_uuid(),
    'REPLACE_WITH_INVESTOR_1_ID',
    '11111111-1111-1111-1111-111111111111',
    'BTC',
    'reporting',
    1.50000000,    -- Beginning: 1.5 BTC
    0.25000000,    -- Additions: 0.25 BTC
    0.00000000,    -- Redemptions: 0 BTC
    1.78500000,    -- Ending: 1.785 BTC
    0.03500000,    -- Net Income: 0.035 BTC
    2.3333         -- RoR: 2.33%
) ON CONFLICT DO NOTHING;

-- Investor 1, BTC Fund, December 2024
INSERT INTO investor_fund_performance (
    id, investor_id, period_id, fund_name, purpose,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, 
    mtd_ending_balance, mtd_net_income, mtd_rate_of_return
) VALUES (
    gen_random_uuid(),
    'REPLACE_WITH_INVESTOR_1_ID',
    '22222222-2222-2222-2222-222222222222',
    'BTC',
    'reporting',
    1.78500000,    -- Beginning: 1.785 BTC (= prev ending)
    0.00000000,    -- Additions: 0 BTC
    0.10000000,    -- Redemptions: 0.1 BTC
    1.72755000,    -- Ending: 1.72755 BTC
    0.04255000,    -- Net Income: 0.04255 BTC
    2.3838         -- RoR: 2.38%
) ON CONFLICT DO NOTHING;

-- Investor 1, ETH Fund, November 2024
INSERT INTO investor_fund_performance (
    id, investor_id, period_id, fund_name, purpose,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, 
    mtd_ending_balance, mtd_net_income, mtd_rate_of_return
) VALUES (
    gen_random_uuid(),
    'REPLACE_WITH_INVESTOR_1_ID',
    '11111111-1111-1111-1111-111111111111',
    'ETH',
    'reporting',
    25.00000000,   -- Beginning: 25 ETH
    5.00000000,    -- Additions: 5 ETH
    0.00000000,    -- Redemptions: 0 ETH
    30.75000000,   -- Ending: 30.75 ETH
    0.75000000,    -- Net Income: 0.75 ETH
    3.0000         -- RoR: 3%
) ON CONFLICT DO NOTHING;

-- Investor 2, BTC Fund, November 2024
INSERT INTO investor_fund_performance (
    id, investor_id, period_id, fund_name, purpose,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, 
    mtd_ending_balance, mtd_net_income, mtd_rate_of_return
) VALUES (
    gen_random_uuid(),
    'REPLACE_WITH_INVESTOR_2_ID',
    '11111111-1111-1111-1111-111111111111',
    'BTC',
    'reporting',
    0.50000000,    -- Beginning: 0.5 BTC
    0.00000000,    -- Additions: 0 BTC
    0.00000000,    -- Redemptions: 0 BTC
    0.51165000,    -- Ending: 0.51165 BTC
    0.01165000,    -- Net Income: 0.01165 BTC
    2.3300         -- RoR: 2.33%
) ON CONFLICT DO NOTHING;

-- Investor 2, SOL Fund, November 2024
INSERT INTO investor_fund_performance (
    id, investor_id, period_id, fund_name, purpose,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, 
    mtd_ending_balance, mtd_net_income, mtd_rate_of_return
) VALUES (
    gen_random_uuid(),
    'REPLACE_WITH_INVESTOR_2_ID',
    '11111111-1111-1111-1111-111111111111',
    'SOL',
    'reporting',
    100.00000000,  -- Beginning: 100 SOL
    50.00000000,   -- Additions: 50 SOL
    20.00000000,   -- Redemptions: 20 SOL
    134.50000000,  -- Ending: 134.5 SOL
    4.50000000,    -- Net Income: 4.5 SOL
    4.5000         -- RoR: 4.5%
) ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 4: Verification Query
-- ============================================
-- Run reconciliation_query.sql after seeding to verify

-- Quick verification:
SELECT 
    fund_name,
    mtd_beginning_balance AS begin_token,
    mtd_additions AS add_token,
    mtd_redemptions AS red_token,
    mtd_net_income AS income_token,
    mtd_ending_balance AS end_token,
    -- Reconcile check
    CASE 
        WHEN ABS(
            mtd_beginning_balance + mtd_additions - mtd_redemptions + mtd_net_income 
            - mtd_ending_balance
        ) < 0.00000001 THEN 'PASS ✓'
        ELSE 'FAIL ✗'
    END AS reconcile
FROM investor_fund_performance
WHERE purpose = 'reporting'
ORDER BY fund_name, period_id;
