-- Evidence Pack: Purpose Column Null Counts
-- Verifies that all purpose columns are populated (no nulls)

-- 1. Count null purpose in transactions_v2
SELECT 
    'transactions_v2' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(*) FILTER (WHERE purpose IS NULL) AS null_purpose_count,
    COUNT(*) FILTER (WHERE purpose = 'reporting') AS reporting_count,
    COUNT(*) FILTER (WHERE purpose = 'transaction') AS transaction_count
FROM transactions_v2;

-- 2. Count null purpose in investor_fund_performance
SELECT 
    'investor_fund_performance' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(*) FILTER (WHERE purpose IS NULL) AS null_purpose_count,
    COUNT(*) FILTER (WHERE purpose = 'reporting') AS reporting_count,
    COUNT(*) FILTER (WHERE purpose = 'transaction') AS transaction_count
FROM investor_fund_performance;

-- 3. Count null purpose in fund_daily_aum
SELECT 
    'fund_daily_aum' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(*) FILTER (WHERE purpose IS NULL) AS null_purpose_count,
    COUNT(*) FILTER (WHERE purpose = 'reporting') AS reporting_count,
    COUNT(*) FILTER (WHERE purpose = 'transaction') AS transaction_count
FROM fund_daily_aum;

-- 4. Count null purpose in fee_allocations
SELECT 
    'fee_allocations' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(*) FILTER (WHERE purpose IS NULL) AS null_purpose_count,
    COUNT(*) FILTER (WHERE purpose = 'reporting') AS reporting_count,
    COUNT(*) FILTER (WHERE purpose = 'transaction') AS transaction_count
FROM fee_allocations;

-- 5. Count null purpose in ib_allocations
SELECT 
    'ib_allocations' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(*) FILTER (WHERE purpose IS NULL) AS null_purpose_count,
    COUNT(*) FILTER (WHERE purpose = 'reporting') AS reporting_count,
    COUNT(*) FILTER (WHERE purpose = 'transaction') AS transaction_count
FROM ib_allocations;

-- 6. Combined summary
SELECT 
    table_name,
    total_rows,
    null_purpose_count,
    CASE 
        WHEN null_purpose_count = 0 THEN 'PASS ✓'
        ELSE 'FAIL ✗ - Backfill required'
    END AS status
FROM (
    SELECT 'transactions_v2' AS table_name, COUNT(*) AS total_rows, COUNT(*) FILTER (WHERE purpose IS NULL) AS null_purpose_count FROM transactions_v2
    UNION ALL
    SELECT 'investor_fund_performance', COUNT(*), COUNT(*) FILTER (WHERE purpose IS NULL) FROM investor_fund_performance
    UNION ALL
    SELECT 'fund_daily_aum', COUNT(*), COUNT(*) FILTER (WHERE purpose IS NULL) FROM fund_daily_aum
    UNION ALL
    SELECT 'fee_allocations', COUNT(*), COUNT(*) FILTER (WHERE purpose IS NULL) FROM fee_allocations
    UNION ALL
    SELECT 'ib_allocations', COUNT(*), COUNT(*) FILTER (WHERE purpose IS NULL) FROM ib_allocations
) AS combined;
