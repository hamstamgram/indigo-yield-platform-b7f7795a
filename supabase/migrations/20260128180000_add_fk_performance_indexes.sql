-- ================================================================
-- Migration: Add Performance Indexes for Foreign Keys
-- Date: 2026-01-28
-- Severity: LOW (performance optimization)
-- Description: Add indexes for frequently-used FK columns on
--              high-traffic tables to improve query performance.
-- ================================================================

BEGIN;

-- ============================================================================
-- TRANSACTIONS_V2 INDEXES
-- ============================================================================

-- Index for approved_by lookups (approval audit queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_v2_approved_by 
ON public.transactions_v2 (approved_by) 
WHERE approved_by IS NOT NULL;

-- Index for created_by lookups (admin who created transaction)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_v2_created_by 
ON public.transactions_v2 (created_by) 
WHERE created_by IS NOT NULL;

-- Index for voided_by lookups (void audit queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_v2_voided_by 
ON public.transactions_v2 (voided_by) 
WHERE voided_by IS NOT NULL;

-- Index for voided_by_profile_id (newer void tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_v2_voided_by_profile 
ON public.transactions_v2 (voided_by_profile_id) 
WHERE voided_by_profile_id IS NOT NULL;

-- ============================================================================
-- FUND_DAILY_AUM INDEXES
-- ============================================================================

-- Index for created_by lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fund_daily_aum_created_by 
ON public.fund_daily_aum (created_by) 
WHERE created_by IS NOT NULL;

-- Index for updated_by lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fund_daily_aum_updated_by 
ON public.fund_daily_aum (updated_by) 
WHERE updated_by IS NOT NULL;

-- Index for voided_by lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fund_daily_aum_voided_by 
ON public.fund_daily_aum (voided_by) 
WHERE voided_by IS NOT NULL;

-- Index for voided_by_profile_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fund_daily_aum_voided_by_profile 
ON public.fund_daily_aum (voided_by_profile_id) 
WHERE voided_by_profile_id IS NOT NULL;

-- ============================================================================
-- YIELD_DISTRIBUTIONS INDEXES
-- ============================================================================

-- Index for voided_by lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_yield_distributions_voided_by 
ON public.yield_distributions (voided_by) 
WHERE voided_by IS NOT NULL;

-- Index for dust_receiver_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_yield_distributions_dust_receiver 
ON public.yield_distributions (dust_receiver_id) 
WHERE dust_receiver_id IS NOT NULL;

-- ============================================================================
-- YIELD_ALLOCATIONS INDEXES
-- ============================================================================

-- Index for ib_transaction_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_yield_allocations_ib_transaction 
ON public.yield_allocations (ib_transaction_id) 
WHERE ib_transaction_id IS NOT NULL;

-- ============================================================================
-- INVESTOR_YIELD_EVENTS INDEXES
-- ============================================================================

-- Index for created_by lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investor_yield_events_created_by 
ON public.investor_yield_events (created_by) 
WHERE created_by IS NOT NULL;

-- Index for made_visible_by lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investor_yield_events_visible_by 
ON public.investor_yield_events (made_visible_by) 
WHERE made_visible_by IS NOT NULL;

-- Index for voided_by lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investor_yield_events_voided_by 
ON public.investor_yield_events (voided_by) 
WHERE voided_by IS NOT NULL;

-- ============================================================================
-- WITHDRAWAL_REQUESTS INDEXES
-- ============================================================================

-- Index for approved_by lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawal_requests_approved_by 
ON public.withdrawal_requests (approved_by) 
WHERE approved_by IS NOT NULL;

-- Index for created_by lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawal_requests_created_by 
ON public.withdrawal_requests (created_by) 
WHERE created_by IS NOT NULL;

-- Index for rejected_by lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawal_requests_rejected_by 
ON public.withdrawal_requests (rejected_by) 
WHERE rejected_by IS NOT NULL;

-- Index for cancelled_by lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawal_requests_cancelled_by 
ON public.withdrawal_requests (cancelled_by) 
WHERE cancelled_by IS NOT NULL;

-- ============================================================================
-- LOG COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Successfully created 18 performance indexes for FK columns';
END $$;

COMMIT;
