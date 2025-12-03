-- ============================================================================
-- INDIGO YIELD PLATFORM - CRITICAL DATABASE FIXES
-- Generated: 2025-12-03
-- Priority: URGENT - Execute ASAP
-- ============================================================================
--
-- This script addresses the most critical security and data integrity issues
-- found in the database audit. Execute these changes in a maintenance window.
--
-- IMPORTANT: Review and test each section before applying to production!
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENABLE ROW LEVEL SECURITY (CRITICAL)
-- ============================================================================
-- These tables contain sensitive financial and personal data but lack RLS
-- ============================================================================

-- 1.1 Enable RLS on transactions_v2 (MOST CRITICAL!)
-- ----------------------------------------------------------------------------
ALTER TABLE transactions_v2 ENABLE ROW LEVEL SECURITY;

-- Users can only see their own transactions
CREATE POLICY "transactions_select_own" ON transactions_v2
  FOR SELECT USING (
    user_id = auth.uid() OR
    investor_id IN (SELECT id FROM investors WHERE profile_id = auth.uid())
  );

-- Admins can view all transactions
CREATE POLICY "transactions_admin_select" ON transactions_v2
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)
  );

-- Admins can insert transactions
CREATE POLICY "transactions_admin_insert" ON transactions_v2
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)
  );

-- Admins can update pending transactions only
CREATE POLICY "transactions_admin_update" ON transactions_v2
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)
    AND status = 'pending'
  );

-- No deletes allowed (audit trail preservation)
CREATE POLICY "transactions_no_delete" ON transactions_v2
  FOR DELETE USING (false);

-- 1.2 Enable RLS on nav_history (CRITICAL!)
-- ----------------------------------------------------------------------------
ALTER TABLE nav_history ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read NAV history
CREATE POLICY "nav_history_select_authenticated" ON nav_history
  FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update NAV
CREATE POLICY "nav_history_admin_write" ON nav_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)
  );

CREATE POLICY "nav_history_admin_update" ON nav_history
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)
  );

-- No deletes allowed
CREATE POLICY "nav_history_no_delete" ON nav_history
  FOR DELETE USING (false);

-- 1.3 Enable RLS on documents (CRITICAL!)
-- ----------------------------------------------------------------------------
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Users can only see their own documents
CREATE POLICY "documents_select_own" ON documents
  FOR SELECT USING (user_id = auth.uid());

-- Admins can see all documents
CREATE POLICY "documents_admin_select" ON documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)
  );

-- Admins can insert documents
CREATE POLICY "documents_admin_insert" ON documents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)
  );

-- Admins can update documents
CREATE POLICY "documents_admin_update" ON documents
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)
  );

-- Admins can delete documents
CREATE POLICY "documents_admin_delete" ON documents
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)
  );

-- 1.4 Enable RLS on balance_adjustments (CRITICAL!)
-- ----------------------------------------------------------------------------
ALTER TABLE balance_adjustments ENABLE ROW LEVEL SECURITY;

-- Users can view their own balance adjustments
CREATE POLICY "balance_adjustments_select_own" ON balance_adjustments
  FOR SELECT USING (
    user_id IN (SELECT profile_id FROM investors WHERE profile_id = auth.uid())
  );

-- Admins can view all balance adjustments
CREATE POLICY "balance_adjustments_admin_select" ON balance_adjustments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)
  );

-- Only admins can insert balance adjustments
CREATE POLICY "balance_adjustments_admin_insert" ON balance_adjustments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)
  );

-- No updates allowed (immutable audit trail)
CREATE POLICY "balance_adjustments_no_update" ON balance_adjustments
  FOR UPDATE USING (false);

-- No deletes allowed
CREATE POLICY "balance_adjustments_no_delete" ON balance_adjustments
  FOR DELETE USING (false);

-- 1.5 Enable RLS on access_logs
-- ----------------------------------------------------------------------------
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own access logs
CREATE POLICY "access_logs_select_own" ON access_logs
  FOR SELECT USING (user_id = auth.uid());

-- Admins can see all access logs
CREATE POLICY "access_logs_admin_select" ON access_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)
  );

-- System can insert (via service role)
CREATE POLICY "access_logs_system_insert" ON access_logs
  FOR INSERT WITH CHECK (true);

-- No updates or deletes allowed
CREATE POLICY "access_logs_no_update" ON access_logs
  FOR UPDATE USING (false);

CREATE POLICY "access_logs_no_delete" ON access_logs
  FOR DELETE USING (false);

-- 1.6 Enable RLS on fund_configurations
-- ----------------------------------------------------------------------------
ALTER TABLE fund_configurations ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read fund configurations
CREATE POLICY "fund_configurations_select_authenticated" ON fund_configurations
  FOR SELECT TO authenticated USING (true);

-- Only admins can modify
CREATE POLICY "fund_configurations_admin_all" ON fund_configurations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)
  );

-- 1.7 Enable RLS on fund_fee_history
-- ----------------------------------------------------------------------------
ALTER TABLE fund_fee_history ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read fee history
CREATE POLICY "fund_fee_history_select_authenticated" ON fund_fee_history
  FOR SELECT TO authenticated USING (true);

-- Only admins can insert (no updates/deletes for immutable history)
CREATE POLICY "fund_fee_history_admin_insert" ON fund_fee_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)
  );

CREATE POLICY "fund_fee_history_no_update" ON fund_fee_history
  FOR UPDATE USING (false);

CREATE POLICY "fund_fee_history_no_delete" ON fund_fee_history
  FOR DELETE USING (false);

-- 1.8 Enable RLS on notification_settings
-- ----------------------------------------------------------------------------
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own notification settings
CREATE POLICY "notification_settings_select_own" ON notification_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notification_settings_update_own" ON notification_settings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notification_settings_insert_own" ON notification_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can view all settings
CREATE POLICY "notification_settings_admin_select" ON notification_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)
  );

-- 1.9 Enable RLS on reminders
-- ----------------------------------------------------------------------------
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Users can manage their own reminders
CREATE POLICY "reminders_select_own" ON reminders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "reminders_insert_own" ON reminders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "reminders_update_own" ON reminders
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "reminders_delete_own" ON reminders
  FOR DELETE USING (user_id = auth.uid());

-- Admins can manage all reminders
CREATE POLICY "reminders_admin_all" ON reminders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND revoked_at IS NULL)
  );


-- ============================================================================
-- SECTION 2: ADD MISSING FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- 2.1 Add FKs to transactions_v2
-- ----------------------------------------------------------------------------
-- Note: These may fail if there are orphaned records. Clean data first!

-- Add FK for user_id (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transactions_v2_user_id_fkey'
  ) THEN
    ALTER TABLE transactions_v2
    ADD CONSTRAINT transactions_v2_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Add FK for investor_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transactions_v2_investor_id_fkey'
  ) THEN
    ALTER TABLE transactions_v2
    ADD CONSTRAINT transactions_v2_investor_id_fkey
    FOREIGN KEY (investor_id) REFERENCES investors(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Add FK for fund_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transactions_v2_fund_id_fkey'
  ) THEN
    ALTER TABLE transactions_v2
    ADD CONSTRAINT transactions_v2_fund_id_fkey
    FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Add FK for approved_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transactions_v2_approved_by_fkey'
  ) THEN
    ALTER TABLE transactions_v2
    ADD CONSTRAINT transactions_v2_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2.2 Add FKs to documents
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'documents_user_id_fkey'
  ) THEN
    ALTER TABLE documents
    ADD CONSTRAINT documents_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'documents_fund_id_fkey'
  ) THEN
    ALTER TABLE documents
    ADD CONSTRAINT documents_fund_id_fkey
    FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'documents_created_by_fkey'
  ) THEN
    ALTER TABLE documents
    ADD CONSTRAINT documents_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2.3 Add FKs to nav_history
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'nav_history_fund_id_fkey'
  ) THEN
    ALTER TABLE nav_history
    ADD CONSTRAINT nav_history_fund_id_fkey
    FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 2.4 Add FKs to balance_adjustments
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'balance_adjustments_user_id_fkey'
  ) THEN
    ALTER TABLE balance_adjustments
    ADD CONSTRAINT balance_adjustments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'balance_adjustments_fund_id_fkey'
  ) THEN
    ALTER TABLE balance_adjustments
    ADD CONSTRAINT balance_adjustments_fund_id_fkey
    FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'balance_adjustments_created_by_fkey'
  ) THEN
    ALTER TABLE balance_adjustments
    ADD CONSTRAINT balance_adjustments_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 2.5 Add FKs to access_logs
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'access_logs_user_id_fkey'
  ) THEN
    ALTER TABLE access_logs
    ADD CONSTRAINT access_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2.6 Add FKs to notification_settings
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notification_settings_user_id_fkey'
  ) THEN
    ALTER TABLE notification_settings
    ADD CONSTRAINT notification_settings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;


-- ============================================================================
-- SECTION 3: ADD MISSING INDEXES (PERFORMANCE)
-- ============================================================================

-- 3.1 Notifications - composite index for user queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC);

-- 3.2 Support requests - partial index for open tickets
CREATE INDEX IF NOT EXISTS idx_support_requests_status_open
ON support_requests(status, created_at DESC)
WHERE resolved_at IS NULL;

-- 3.3 Balance adjustments - fund lookup
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_fund
ON balance_adjustments(fund_id, created_at DESC);

-- 3.4 Documents - period lookup
CREATE INDEX IF NOT EXISTS idx_documents_fund_period
ON documents(fund_id, period_start, period_end);

-- 3.5 Pending email logs - status tracking
CREATE INDEX IF NOT EXISTS idx_pending_email_logs_status
ON pending_email_logs(status, created_at DESC);

-- 3.6 User activities - recent activity lookup
CREATE INDEX IF NOT EXISTS idx_user_activities_recent
ON user_activities(user_id, created_at DESC)
WHERE created_at > NOW() - INTERVAL '90 days';


-- ============================================================================
-- SECTION 4: ADD CHECK CONSTRAINTS (DATA INTEGRITY)
-- ============================================================================

-- 4.1 Balance adjustments - amount must not be zero
ALTER TABLE balance_adjustments
ADD CONSTRAINT balance_adjustments_amount_nonzero
CHECK (amount != 0);

-- 4.2 Benchmarks - price must be positive
ALTER TABLE benchmarks
ADD CONSTRAINT benchmarks_price_positive
CHECK (price_usd > 0);

-- 4.3 Daily rates - all rates must be positive
ALTER TABLE daily_rates
ADD CONSTRAINT daily_rates_positive
CHECK (
  btc_rate > 0 AND
  eth_rate > 0 AND
  sol_rate > 0 AND
  usdt_rate > 0 AND
  usdc_rate > 0 AND
  eurc_rate > 0
);

-- 4.4 NAV history - NAV must be positive
ALTER TABLE nav_history
ADD CONSTRAINT nav_history_nav_positive
CHECK (nav > 0);

-- 4.5 Investor positions - shares and values should be non-negative
ALTER TABLE investor_positions
ADD CONSTRAINT investor_positions_shares_positive
CHECK (shares >= 0);

ALTER TABLE investor_positions
ADD CONSTRAINT investor_positions_cost_basis_positive
CHECK (cost_basis >= 0);

ALTER TABLE investor_positions
ADD CONSTRAINT investor_positions_current_value_positive
CHECK (current_value >= 0);


-- ============================================================================
-- SECTION 5: CLEANUP - REMOVE REDUNDANT INDEXES
-- ============================================================================

-- These indexes are duplicates and can be safely removed
-- Only execute after verifying no custom queries rely on these specific index names

-- investor_emails table has duplicate indexes
DROP INDEX IF EXISTS investor_emails_email_idx; -- Covered by idx_investor_emails_email
DROP INDEX IF EXISTS investor_emails_investor_id_idx; -- Covered by idx_investor_emails_investor_id


-- ============================================================================
-- SECTION 6: ENABLE QUERY STATISTICS (MONITORING)
-- ============================================================================

-- Enable pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;


-- ============================================================================
-- SCRIPT COMPLETE
-- ============================================================================

-- Verify changes
SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN 'Enabled'
    ELSE 'DISABLED'
  END as rls_status
FROM pg_tables t
JOIN pg_class c ON t.tablename = c.relname
WHERE schemaname = 'public'
ORDER BY
  CASE WHEN rowsecurity THEN 1 ELSE 0 END,
  tablename;

-- Summary
SELECT
  'RLS Enabled' as metric,
  COUNT(*) FILTER (WHERE rowsecurity) as count
FROM pg_tables t
JOIN pg_class c ON t.tablename = c.relname
WHERE schemaname = 'public'
UNION ALL
SELECT
  'RLS Disabled' as metric,
  COUNT(*) FILTER (WHERE NOT rowsecurity) as count
FROM pg_tables t
JOIN pg_class c ON t.tablename = c.relname
WHERE schemaname = 'public';

-- ============================================================================
-- POST-DEPLOYMENT CHECKLIST
-- ============================================================================
-- [ ] Verify all RLS policies work correctly for test users
-- [ ] Verify all foreign keys are valid (no orphaned records)
-- [ ] Run ANALYZE on all modified tables
-- [ ] Monitor query performance for 24-48 hours
-- [ ] Update application code if needed to handle new constraints
-- [ ] Document all changes in change log
-- [ ] Schedule follow-up audit in 30 days
-- ============================================================================
