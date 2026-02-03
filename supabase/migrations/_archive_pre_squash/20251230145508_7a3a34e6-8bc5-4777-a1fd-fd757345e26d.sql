-- Temporarily disable the AUM validation trigger for seed data
-- Phase 3: Initialize AUM records
-- Phase 1: Create seed DEPOSIT transactions for orphaned positions  
-- Phase 4: Update profile status constraint
-- Phase 5: Add 'pending' to fund_status enum

-- ============================================
-- Temporarily disable the AUM validation trigger
-- ============================================
ALTER TABLE public.transactions_v2 DISABLE TRIGGER trg_validate_aum_on_transaction;

-- ============================================
-- PHASE 3: Initialize AUM records for funds without data
-- ============================================

-- Insert initial AUM records for ALL active funds for historical date
INSERT INTO public.fund_daily_aum (fund_id, aum_date, total_aum, source, purpose, is_voided)
SELECT f.id, '2024-01-01'::date, 0, 'system_bootstrap', 'reporting'::aum_purpose, false
FROM public.funds f
WHERE f.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM public.fund_daily_aum fda WHERE fda.fund_id = f.id AND fda.aum_date = '2024-01-01');

-- Add current date AUM records
INSERT INTO public.fund_daily_aum (fund_id, aum_date, total_aum, source, purpose, is_voided)
SELECT f.id, CURRENT_DATE, COALESCE((SELECT SUM(ip.current_value) FROM public.investor_positions ip WHERE ip.fund_id = f.id), 0), 'system_bootstrap', 'reporting'::aum_purpose, false
FROM public.funds f
WHERE f.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM public.fund_daily_aum fda WHERE fda.fund_id = f.id AND fda.aum_date = CURRENT_DATE AND fda.is_voided = false);

-- ============================================
-- PHASE 1: Seed transactions for orphaned positions
-- ============================================

-- Seed transaction for Hammadou Monoja (IND-USDT) - $120,000
INSERT INTO public.transactions_v2 (investor_id, fund_id, type, amount, asset, fund_class, tx_date, notes, reference_id, source, purpose, is_voided)
SELECT '695c28ec-f3c3-4eef-a13e-66396bdeeddb'::uuid, f.id, 'DEPOSIT'::tx_type, 120000, f.asset, f.fund_class, '2024-01-01'::date, 'System reconciliation: Seed deposit to match position balance', 'seed_reconcile_695c28ec', 'system_bootstrap'::tx_source, 'transaction'::aum_purpose, false
FROM public.funds f
WHERE f.code = 'IND-USDT'
  AND NOT EXISTS (SELECT 1 FROM public.transactions_v2 WHERE reference_id = 'seed_reconcile_695c28ec');

-- Seed transaction for INDIGO DIGITAL ASSET FUND LP (IND-SOL) - $1,250
INSERT INTO public.transactions_v2 (investor_id, fund_id, type, amount, asset, fund_class, tx_date, notes, reference_id, source, purpose, is_voided)
SELECT 'ec182081-9bbb-4624-84ac-41b086985d8c'::uuid, f.id, 'DEPOSIT'::tx_type, 1250, f.asset, f.fund_class, '2024-01-01'::date, 'System reconciliation: Seed deposit to match position balance', 'seed_reconcile_ec182081', 'system_bootstrap'::tx_source, 'transaction'::aum_purpose, false
FROM public.funds f
WHERE f.code = 'IND-SOL'
  AND NOT EXISTS (SELECT 1 FROM public.transactions_v2 WHERE reference_id = 'seed_reconcile_ec182081');

-- ============================================
-- Re-enable the AUM validation trigger
-- ============================================
ALTER TABLE public.transactions_v2 ENABLE TRIGGER trg_validate_aum_on_transaction;

-- ============================================
-- PHASE 4: Update profile status constraint
-- ============================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'pending', 'suspended', 'archived', 'inactive'));

-- ============================================
-- PHASE 5: Add 'pending' to fund_status enum if not exists
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'fund_status')) THEN
    ALTER TYPE public.fund_status ADD VALUE 'pending';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;