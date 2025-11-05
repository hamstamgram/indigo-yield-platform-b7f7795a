-- ========================================
-- EMERGENCY MIGRATION: ENABLE ROW-LEVEL SECURITY
-- Date: November 3, 2025
-- Priority: P0 - CRITICAL
-- Time to execute: ~30 seconds
-- ========================================

-- CRITICAL: This enables RLS on all tables to prevent data leaks
-- Currently ALL 26 investors can see each other's data
-- After this migration, users can ONLY see their own data

BEGIN;

-- ==========================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE cryptocurrency_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_cron_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Historical AUM" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 2: VERIFY EXISTING POLICIES ARE CORRECT
-- ==========================================

-- Note: Policies already exist in your database (26 total)
-- We're just enabling RLS to enforce them

-- ==========================================
-- STEP 3: ADD MISSING CRITICAL POLICIES
-- ==========================================

-- Ensure assets are viewable by all authenticated users
DROP POLICY IF EXISTS "assets_select_all" ON assets;
CREATE POLICY "assets_select_all"
  ON assets FOR SELECT
  TO authenticated
  USING (true);

-- Ensure prices are viewable by all authenticated users
DROP POLICY IF EXISTS "prices_select_all" ON prices;
CREATE POLICY "prices_select_all"
  ON prices FOR SELECT
  TO authenticated
  USING (true);

-- Ensure asset_prices are viewable by all authenticated users
DROP POLICY IF EXISTS "asset_prices_select_all" ON asset_prices;
CREATE POLICY "asset_prices_select_all"
  ON asset_prices FOR SELECT
  TO authenticated
  USING (true);

-- ==========================================
-- STEP 4: ADMIN BYPASS POLICIES
-- ==========================================

-- Admins can view all profiles
DROP POLICY IF EXISTS "admins_view_all_profiles" ON profiles;
CREATE POLICY "admins_view_all_profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can view all transactions
DROP POLICY IF EXISTS "admins_view_all_transactions" ON transactions;
CREATE POLICY "admins_view_all_transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can view all positions
DROP POLICY IF EXISTS "admins_view_all_positions" ON positions;
CREATE POLICY "admins_view_all_positions"
  ON positions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ==========================================
-- STEP 5: FORCE RLS (cannot be bypassed)
-- ==========================================

ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE positions FORCE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE wallets FORCE ROW LEVEL SECURITY;

COMMIT;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Run these to verify RLS is enabled:

-- Check all tables have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED (SECURITY RISK!)'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected: ALL tables show rls_enabled = true

-- List all active policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE
    WHEN cmd = 'SELECT' THEN '📖 Read'
    WHEN cmd = 'INSERT' THEN '➕ Create'
    WHEN cmd = 'UPDATE' THEN '✏️ Update'
    WHEN cmd = 'DELETE' THEN '🗑️ Delete'
    WHEN cmd = 'ALL' THEN '🔓 All Operations'
  END as operation_type
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected: 26+ policies visible

-- ==========================================
-- TEST QUERIES (Run as different users)
-- ==========================================

-- Test 1: Regular user should ONLY see their own data
-- SELECT * FROM profiles WHERE id != auth.uid();
-- Expected: 0 rows (blocked by RLS)

-- Test 2: Regular user CAN see their own data
-- SELECT * FROM profiles WHERE id = auth.uid();
-- Expected: 1 row (their profile)

-- Test 3: Admin should see ALL profiles
-- SELECT COUNT(*) FROM profiles;
-- Expected: 26 rows (if logged in as admin)

-- ==========================================
-- ROLLBACK INSTRUCTIONS (Emergency Only)
-- ==========================================

-- If this causes issues, you can temporarily disable RLS:
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- But this re-exposes data! Fix policies instead.
