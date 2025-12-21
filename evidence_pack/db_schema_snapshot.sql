-- INDIGO Database Schema Snapshot
-- Generated: 2024-12-21
-- Supabase Project: nkfimvovosdehmyyjubn

-- ============================================
-- CORE TRANSACTION TABLES
-- ============================================

-- transactions_v2: Primary transaction ledger (token-denominated)
-- Columns: id, investor_id, fund_id, type, asset, fund_class, amount, tx_date,
--          reference_id, notes, created_by, created_at, purpose, status
-- Key constraint: idx_transactions_v2_reference_id_unique (reference_id) WHERE reference_id IS NOT NULL

-- investor_positions: Current investor holdings (token-denominated)
-- Columns: investor_id, fund_id, fund_class, current_value, cost_basis, shares,
--          aum_percentage, lock_until_date, created_at, updated_at
-- Primary key: (investor_id, fund_id)

-- ============================================
-- PERFORMANCE & REPORTING TABLES
-- ============================================

-- investor_fund_performance: Period performance data (token-denominated)
-- Columns: id, investor_id, period_id, fund_name, purpose,
--          mtd_beginning_balance, mtd_ending_balance, mtd_additions, mtd_redemptions, mtd_net_income, mtd_rate_of_return,
--          qtd_beginning_balance, qtd_ending_balance, qtd_additions, qtd_redemptions, qtd_net_income, qtd_rate_of_return,
--          ytd_beginning_balance, ytd_ending_balance, ytd_additions, ytd_redemptions, ytd_net_income, ytd_rate_of_return,
--          itd_beginning_balance, itd_ending_balance, itd_additions, itd_redemptions, itd_net_income, itd_rate_of_return,
--          created_at, updated_at
-- Key constraint: investor_fund_performance_unique_with_purpose (investor_id, period_id, fund_name, purpose)

-- generated_statements: Investor statement documents
-- Columns: id, investor_id, user_id, period_id, fund_names, html_content, pdf_url, generated_by, created_at
-- Key constraint: unique_investor_period (investor_id, period_id)

-- statement_periods: Reporting periods
-- Columns: id, period_start_date, period_end_date, period_label, is_locked, created_at

-- ============================================
-- AUM & YIELD TABLES
-- ============================================

-- fund_daily_aum: Daily fund AUM snapshots (token-denominated)
-- Columns: id, fund_id, aum_date, total_aum, nav_per_share, total_shares,
--          purpose, is_month_end, source, as_of_date, created_by, created_at, updated_at, updated_by
-- Key constraint: fund_daily_aum_pkey (fund_id, aum_date, purpose)

-- ============================================
-- FEE & IB ALLOCATION TABLES
-- ============================================

-- fee_allocations: Platform fee records (token-denominated)
-- Columns: id, distribution_id, fund_id, investor_id, fees_account_id,
--          period_start, period_end, purpose, base_net_income,
--          fee_percentage, fee_amount, credit_transaction_id, debit_transaction_id,
--          created_by, created_at
-- Key constraint: fee_allocations_unique (distribution_id, fund_id, investor_id, fees_account_id)

-- ib_allocations: IB commission records (token-denominated)
-- Columns: id, distribution_id, fund_id, source_investor_id, ib_investor_id,
--          period_start, period_end, period_id, purpose, source_net_income,
--          ib_percentage, ib_fee_amount, source, effective_date, created_by, created_at
-- Key constraint: ib_allocations_idempotency (source_investor_id, ib_investor_id, period_start, period_end, fund_id)

-- ============================================
-- WITHDRAWAL TABLES
-- ============================================

-- withdrawal_requests: Investor withdrawal requests (token-denominated)
-- Columns: id, investor_id, fund_id, requested_amount, approved_amount,
--          status, admin_notes, cancellation_reason, cancelled_by, cancelled_at,
--          processed_at, processed_by, tx_hash, created_at, updated_at

-- withdrawal_audit_logs: Withdrawal action history
-- Columns: id, request_id, action, actor_id, metadata, created_at

-- ============================================
-- AUDIT & LOGGING TABLES
-- ============================================

-- audit_log: System-wide audit trail
-- Columns: id, action, entity, entity_id, actor_user, old_values, new_values, meta, created_at

-- data_edit_audit: Data modification history
-- Columns: id, table_name, record_id, operation, old_data, new_data,
--          import_related, import_id, edited_by, edited_at, edit_source, changed_fields

-- email_logs: Email delivery tracking
-- Columns: id, recipient, subject, template, status, message_id,
--          sent_at, delivered_at, error, metadata, created_at

-- ============================================
-- KEY CONSTRAINTS FOR IDEMPOTENCY
-- ============================================

-- Query to verify constraints:
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
AND tc.table_name IN (
    'transactions_v2',
    'investor_positions',
    'investor_fund_performance',
    'generated_statements',
    'fund_daily_aum',
    'fee_allocations',
    'ib_allocations',
    'withdrawal_requests'
)
ORDER BY tc.table_name, tc.constraint_name;

-- Expected output:
-- transactions_v2 | idx_transactions_v2_reference_id_unique | reference_id
-- investor_positions | investor_positions_pkey | investor_id, fund_id
-- investor_fund_performance | investor_fund_performance_unique_with_purpose | investor_id, period_id, fund_name, purpose
-- generated_statements | unique_investor_period | investor_id, period_id
-- fund_daily_aum | fund_daily_aum_pkey | fund_id, aum_date, purpose
-- fee_allocations | fee_allocations_unique | distribution_id, fund_id, investor_id, fees_account_id
-- ib_allocations | ib_allocations_idempotency | source_investor_id, ib_investor_id, period_start, period_end, fund_id

-- ============================================
-- RLS STATUS
-- ============================================

-- Query to verify RLS is enabled on all tables:
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- All 72 public tables have RLS enabled = true
