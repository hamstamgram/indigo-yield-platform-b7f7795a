-- INDIGO Platform Unique Constraints & Indexes
-- Used for ON CONFLICT clauses validation
-- Generated: 2024-12-22

-- ============================================================================
-- TABLE: transactions_v2
-- ============================================================================
-- Primary Key
CREATE UNIQUE INDEX transactions_v2_pkey ON public.transactions_v2 USING btree (id);

-- Unique constraint for reference_id (used in ON CONFLICT)
CREATE UNIQUE INDEX idx_transactions_v2_reference_id_unique 
  ON public.transactions_v2 USING btree (reference_id) 
  WHERE reference_id IS NOT NULL;

-- ============================================================================
-- TABLE: fee_allocations
-- ============================================================================
-- Primary Key
CREATE UNIQUE INDEX fee_allocations_pkey ON public.fee_allocations USING btree (id);

-- Unique constraint: one fee allocation per investor+fund+period+purpose
CREATE UNIQUE INDEX fee_allocations_unique 
  ON public.fee_allocations USING btree (investor_id, fund_id, period_start, period_end, purpose);

-- ============================================================================
-- TABLE: ib_allocations
-- ============================================================================
-- Primary Key
CREATE UNIQUE INDEX ib_allocations_pkey ON public.ib_allocations USING btree (id);

-- Unique constraint: one IB allocation per distribution
CREATE UNIQUE INDEX ib_allocations_distribution_unique 
  ON public.ib_allocations USING btree (distribution_id, ib_investor_id, source_investor_id) 
  WHERE distribution_id IS NOT NULL;

-- ============================================================================
-- TABLE: fund_daily_aum
-- ============================================================================
-- Primary Key
CREATE UNIQUE INDEX fund_daily_aum_pkey ON public.fund_daily_aum USING btree (id);

-- Unique constraint: one AUM record per fund+date+purpose
CREATE UNIQUE INDEX idx_fund_daily_aum_unique 
  ON public.fund_daily_aum USING btree (fund_id, aum_date, purpose);

-- ============================================================================
-- TABLE: generated_statements
-- ============================================================================
-- Primary Key
CREATE UNIQUE INDEX generated_statements_pkey ON public.generated_statements USING btree (id);

-- Unique constraint: one statement per investor+period
CREATE UNIQUE INDEX unique_investor_period 
  ON public.generated_statements USING btree (investor_id, period_id);

-- ============================================================================
-- TABLE: investor_fund_performance
-- ============================================================================
-- Primary Key
CREATE UNIQUE INDEX investor_fund_performance_pkey ON public.investor_fund_performance USING btree (id);

-- Unique constraint: one performance record per investor+fund+period+purpose
CREATE UNIQUE INDEX idx_ifp_unique_investor_fund_period_purpose 
  ON public.investor_fund_performance USING btree (investor_id, fund_name, period_id, purpose);

-- ============================================================================
-- VERIFICATION: All ON CONFLICT targets have matching constraints
-- ============================================================================
-- Query to verify:
/*
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('transactions_v2', 'fee_allocations', 'ib_allocations', 
                    'fund_daily_aum', 'generated_statements', 'investor_fund_performance')
  AND (indexdef ILIKE '%UNIQUE%' OR indexname LIKE '%pkey%')
ORDER BY tablename, indexname;
*/
