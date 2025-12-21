-- INDIGO Platform Constraints and Indexes
-- Generated: 2024-12-21
-- Source: pg_indexes, information_schema.table_constraints

-- ============================================================================
-- UNIQUE CONSTRAINTS (Critical for Idempotency)
-- ============================================================================

-- 1. One performance record per investor/fund/period/purpose
ALTER TABLE public.investor_fund_performance
    ADD CONSTRAINT investor_fund_performance_unique_with_purpose 
    UNIQUE (period_id, investor_id, fund_name, purpose);

-- 2. One statement per investor per period
ALTER TABLE public.generated_statements
    ADD CONSTRAINT unique_investor_period 
    UNIQUE (investor_id, period_id);

-- 3. One fee allocation per distribution/fund/investor/account
ALTER TABLE public.fee_allocations
    ADD CONSTRAINT fee_allocations_unique 
    UNIQUE (distribution_id, fund_id, investor_id, fees_account_id);

-- 4. One IB allocation per distribution/source/ib
ALTER TABLE public.ib_allocations
    ADD CONSTRAINT ib_allocations_idempotency 
    UNIQUE (distribution_id, source_investor_id, ib_investor_id);

-- 5. Unique transaction reference IDs
ALTER TABLE public.transactions_v2
    ADD CONSTRAINT idx_transactions_v2_reference_id_unique 
    UNIQUE (reference_id);

-- 6. One period per year/month
ALTER TABLE public.statement_periods
    ADD CONSTRAINT statement_periods_year_month_key 
    UNIQUE (year, month);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Access logs
CREATE INDEX idx_access_logs_user ON public.access_logs 
    USING btree (user_id, created_at DESC);

-- Admin invites
CREATE INDEX idx_admin_invites_code ON public.admin_invites 
    USING btree (invite_code);
CREATE INDEX idx_admin_invites_email ON public.admin_invites 
    USING btree (email);

-- Audit log
CREATE INDEX idx_audit_log_actor ON public.audit_log 
    USING btree (actor_user);
CREATE INDEX idx_audit_log_date ON public.audit_log 
    USING btree (created_at DESC);
CREATE INDEX idx_audit_log_entity ON public.audit_log 
    USING btree (entity, entity_id, created_at DESC);

-- Balance adjustments
CREATE INDEX idx_balance_adjustments_user ON public.balance_adjustments 
    USING btree (user_id, created_at DESC);

-- Benchmarks
CREATE INDEX idx_benchmarks_symbol_date ON public.benchmarks 
    USING btree (symbol, date DESC);

-- Daily NAV
CREATE INDEX idx_daily_nav_fund_date ON public.daily_nav 
    USING btree (fund_id, nav_date DESC);
CREATE INDEX idx_daily_nav_purpose ON public.daily_nav 
    USING btree (purpose, is_month_end);

-- Daily rates
CREATE INDEX idx_daily_rates_date ON public.daily_rates 
    USING btree (rate_date DESC);

-- Data edit audit
CREATE INDEX idx_data_edit_audit_import ON public.data_edit_audit 
    USING btree (import_id) WHERE import_id IS NOT NULL;
CREATE INDEX idx_data_edit_audit_table ON public.data_edit_audit 
    USING btree (table_name, edited_at DESC);

-- Documents
CREATE INDEX idx_documents_period ON public.documents 
    USING btree (period_start, period_end);
CREATE INDEX idx_documents_user_type ON public.documents 
    USING btree (user_id, type);

-- Fee allocations
CREATE UNIQUE INDEX fee_allocations_unique ON public.fee_allocations 
    USING btree (distribution_id, fund_id, investor_id, fees_account_id);
CREATE INDEX idx_fee_allocations_distribution ON public.fee_allocations 
    USING btree (distribution_id);
CREATE INDEX idx_fee_allocations_fund ON public.fee_allocations 
    USING btree (fund_id);
CREATE INDEX idx_fee_allocations_investor ON public.fee_allocations 
    USING btree (investor_id);
CREATE INDEX idx_fee_allocations_period ON public.fee_allocations 
    USING btree (period_end);

-- Fee calculations
CREATE INDEX idx_fee_calculations_investor ON public.fee_calculations 
    USING btree (investor_id, calculation_date DESC);

-- Fees
CREATE INDEX idx_fees_investor_id ON public.fees 
    USING btree (investor_id);

-- Investor fund performance
CREATE INDEX idx_investor_fund_performance_period ON public.investor_fund_performance 
    USING btree (period_id);
CREATE INDEX idx_investor_fund_performance_investor ON public.investor_fund_performance 
    USING btree (investor_id);

-- Transactions
CREATE INDEX idx_transactions_v2_investor_date ON public.transactions_v2 
    USING btree (investor_id, tx_date DESC);
CREATE INDEX idx_transactions_v2_purpose ON public.transactions_v2 
    USING btree (purpose);

-- ============================================================================
-- PRIMARY KEYS (All tables have UUID primary keys)
-- ============================================================================
-- All tables use: id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY

-- ============================================================================
-- FOREIGN KEY RELATIONSHIPS (Key tables)
-- ============================================================================

-- investor_fund_performance
ALTER TABLE public.investor_fund_performance
    ADD CONSTRAINT investor_fund_performance_investor_id_fkey 
    FOREIGN KEY (investor_id) REFERENCES public.profiles(id);
ALTER TABLE public.investor_fund_performance
    ADD CONSTRAINT investor_fund_performance_period_id_fkey 
    FOREIGN KEY (period_id) REFERENCES public.statement_periods(id);

-- generated_statements
ALTER TABLE public.generated_statements
    ADD CONSTRAINT generated_statements_investor_id_fkey 
    FOREIGN KEY (investor_id) REFERENCES public.profiles(id);
ALTER TABLE public.generated_statements
    ADD CONSTRAINT generated_statements_period_id_fkey 
    FOREIGN KEY (period_id) REFERENCES public.statement_periods(id);

-- fee_allocations
ALTER TABLE public.fee_allocations
    ADD CONSTRAINT fee_allocations_fund_id_fkey 
    FOREIGN KEY (fund_id) REFERENCES public.funds(id);
ALTER TABLE public.fee_allocations
    ADD CONSTRAINT fee_allocations_investor_id_fkey 
    FOREIGN KEY (investor_id) REFERENCES public.profiles(id);

-- ib_allocations
ALTER TABLE public.ib_allocations
    ADD CONSTRAINT ib_allocations_source_investor_id_fkey 
    FOREIGN KEY (source_investor_id) REFERENCES public.profiles(id);
ALTER TABLE public.ib_allocations
    ADD CONSTRAINT ib_allocations_ib_investor_id_fkey 
    FOREIGN KEY (ib_investor_id) REFERENCES public.profiles(id);
