-- INDIGO Platform Schema Dump
-- Generated: 2024-12-21
-- Purpose: Real database schema evidence for verification pack

-- ============================================================================
-- TABLE: investor_fund_performance
-- Core table for storing calculated performance metrics per investor/fund/period
-- ============================================================================
CREATE TABLE public.investor_fund_performance (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    investor_id uuid NOT NULL REFERENCES public.profiles(id),
    period_id uuid NOT NULL REFERENCES public.statement_periods(id),
    fund_name text NOT NULL,
    purpose aum_purpose DEFAULT 'reporting'::aum_purpose,
    
    -- MTD (Month-to-Date) metrics
    mtd_beginning_balance numeric DEFAULT 0,
    mtd_additions numeric DEFAULT 0,
    mtd_redemptions numeric DEFAULT 0,
    mtd_net_income numeric DEFAULT 0,
    mtd_ending_balance numeric DEFAULT 0,
    mtd_rate_of_return numeric DEFAULT 0,
    
    -- QTD (Quarter-to-Date) metrics
    qtd_beginning_balance numeric DEFAULT 0,
    qtd_additions numeric DEFAULT 0,
    qtd_redemptions numeric DEFAULT 0,
    qtd_net_income numeric DEFAULT 0,
    qtd_ending_balance numeric DEFAULT 0,
    qtd_rate_of_return numeric DEFAULT 0,
    
    -- YTD (Year-to-Date) metrics
    ytd_beginning_balance numeric DEFAULT 0,
    ytd_additions numeric DEFAULT 0,
    ytd_redemptions numeric DEFAULT 0,
    ytd_net_income numeric DEFAULT 0,
    ytd_ending_balance numeric DEFAULT 0,
    ytd_rate_of_return numeric DEFAULT 0,
    
    -- ITD (Inception-to-Date) metrics
    itd_beginning_balance numeric DEFAULT 0,
    itd_additions numeric DEFAULT 0,
    itd_redemptions numeric DEFAULT 0,
    itd_net_income numeric DEFAULT 0,
    itd_ending_balance numeric DEFAULT 0,
    itd_rate_of_return numeric DEFAULT 0,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    PRIMARY KEY (id),
    CONSTRAINT investor_fund_performance_unique_with_purpose 
        UNIQUE (period_id, investor_id, fund_name, purpose)
);

-- ============================================================================
-- TABLE: generated_statements
-- Stores generated investor statements with one-per-period constraint
-- ============================================================================
CREATE TABLE public.generated_statements (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    investor_id uuid NOT NULL REFERENCES public.profiles(id),
    user_id uuid NOT NULL REFERENCES public.profiles(id),
    period_id uuid NOT NULL REFERENCES public.statement_periods(id),
    generated_by uuid NOT NULL REFERENCES public.profiles(id),
    fund_names text[] NOT NULL,
    html_content text NOT NULL,
    pdf_url text,
    created_at timestamptz DEFAULT now(),
    
    PRIMARY KEY (id),
    CONSTRAINT unique_investor_period UNIQUE (investor_id, period_id)
);

-- ============================================================================
-- TABLE: transactions_v2
-- Core transaction ledger with purpose separation
-- ============================================================================
CREATE TABLE public.transactions_v2 (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    investor_id uuid NOT NULL REFERENCES public.profiles(id),
    fund_id uuid REFERENCES public.funds(id),
    asset text NOT NULL,
    type text NOT NULL, -- DEPOSIT, WITHDRAWAL, INTEREST, FEE, etc.
    amount numeric NOT NULL,
    tx_date date NOT NULL,
    purpose aum_purpose DEFAULT 'reporting'::aum_purpose,
    reference_id text,
    notes text,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id),
    
    PRIMARY KEY (id),
    CONSTRAINT idx_transactions_v2_reference_id_unique UNIQUE (reference_id)
);

-- ============================================================================
-- TABLE: fee_allocations
-- Fee distribution records with idempotency constraint
-- ============================================================================
CREATE TABLE public.fee_allocations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    distribution_id uuid NOT NULL,
    fund_id uuid NOT NULL REFERENCES public.funds(id),
    investor_id uuid NOT NULL REFERENCES public.profiles(id),
    fees_account_id uuid NOT NULL DEFAULT '169bb053-36cb-4f6e-93ea-831f0dfeaf1d',
    base_net_income numeric NOT NULL,
    fee_amount numeric NOT NULL,
    fee_percentage numeric NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    purpose aum_purpose NOT NULL,
    credit_transaction_id uuid REFERENCES public.transactions_v2(id),
    debit_transaction_id uuid REFERENCES public.transactions_v2(id),
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id),
    
    PRIMARY KEY (id),
    CONSTRAINT fee_allocations_unique 
        UNIQUE (distribution_id, fund_id, investor_id, fees_account_id)
);

-- ============================================================================
-- TABLE: ib_allocations
-- IB commission records with idempotency constraint
-- ============================================================================
CREATE TABLE public.ib_allocations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    distribution_id uuid,
    period_id uuid REFERENCES public.statement_periods(id),
    fund_id uuid REFERENCES public.funds(id),
    source_investor_id uuid NOT NULL REFERENCES public.profiles(id),
    ib_investor_id uuid NOT NULL REFERENCES public.profiles(id),
    source_net_income numeric NOT NULL,
    ib_percentage numeric NOT NULL,
    ib_fee_amount numeric NOT NULL,
    period_start date,
    period_end date,
    effective_date date NOT NULL DEFAULT CURRENT_DATE,
    purpose aum_purpose NOT NULL DEFAULT 'reporting'::aum_purpose,
    source text,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id),
    
    PRIMARY KEY (id),
    CONSTRAINT ib_allocations_idempotency 
        UNIQUE (distribution_id, source_investor_id, ib_investor_id)
);

-- ============================================================================
-- TABLE: statement_periods
-- Period definitions for monthly statements
-- ============================================================================
CREATE TABLE public.statement_periods (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    year integer NOT NULL,
    month integer NOT NULL,
    period_name text NOT NULL,
    period_end_date date NOT NULL,
    status text DEFAULT 'OPEN',
    created_at timestamptz DEFAULT now(),
    
    PRIMARY KEY (id),
    CONSTRAINT statement_periods_year_month_key UNIQUE (year, month)
);

-- ============================================================================
-- ENUM: aum_purpose
-- Separates transaction/reporting contexts
-- ============================================================================
CREATE TYPE public.aum_purpose AS ENUM ('transaction', 'reporting');

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX idx_investor_fund_performance_period ON public.investor_fund_performance(period_id);
CREATE INDEX idx_investor_fund_performance_investor ON public.investor_fund_performance(investor_id);
CREATE INDEX idx_transactions_v2_investor_date ON public.transactions_v2(investor_id, tx_date DESC);
CREATE INDEX idx_transactions_v2_purpose ON public.transactions_v2(purpose);
CREATE INDEX idx_fee_allocations_period ON public.fee_allocations(period_end);
CREATE INDEX idx_fee_allocations_investor ON public.fee_allocations(investor_id);
CREATE INDEX idx_ib_allocations_period ON public.ib_allocations(period_id);
