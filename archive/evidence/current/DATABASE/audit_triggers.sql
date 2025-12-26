-- Audit Triggers Query
-- List all triggers on key tables

SELECT 
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN (
    'fund_daily_aum',
    'investor_fund_performance',
    'transactions_v2',
    'withdrawal_requests',
    'investor_positions',
    'fee_allocations',
    'ib_allocations'
)
ORDER BY event_object_table, trigger_name;

-- Note: Auditing may be done via:
-- 1. log_data_edit() trigger function
-- 2. audit_investor_fund_performance_changes() trigger
-- 3. Application-level logging to audit_log table
