-- Down migration: Rollback comprehensive RLS policies
-- This file reverts changes made in 20250109_comprehensive_rls_policies.sql

-- Drop all policies created in the up migration

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update_all" ON public.profiles;

-- Transactions policies
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_admin_all" ON public.transactions;

-- Portfolios policies
DROP POLICY IF EXISTS "portfolios_select_own" ON public.portfolios;
DROP POLICY IF EXISTS "portfolios_update_own" ON public.portfolios;
DROP POLICY IF EXISTS "portfolios_admin_all" ON public.portfolios;

-- Positions policies
DROP POLICY IF EXISTS "positions_select_own" ON public.positions;
DROP POLICY IF EXISTS "positions_admin_all" ON public.positions;

-- Statements policies
DROP POLICY IF EXISTS "statements_select_own" ON public.statements;
DROP POLICY IF EXISTS "statements_admin_all" ON public.statements;

-- Audit log policies
DROP POLICY IF EXISTS "audit_log_admin_only" ON public.audit_log;

-- Withdrawal requests policies
DROP POLICY IF EXISTS "withdrawal_requests_select_own" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "withdrawal_requests_insert_own" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "withdrawal_requests_admin_all" ON public.withdrawal_requests;

-- Note: After running this down migration, the tables will have NO RLS policies
-- This should only be run in emergency rollback scenarios
-- You'll need to restore previous policies or create new ones after rollback
