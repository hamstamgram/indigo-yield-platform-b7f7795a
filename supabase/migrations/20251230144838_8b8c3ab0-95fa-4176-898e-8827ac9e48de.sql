-- Phase 3: Data Integrity Fixes Migration
-- This migration fixes known data integrity issues discovered during audit

-- 1. Update profiles_status_check constraint to allow 'archived' as valid status
-- (since it's already in use in the data)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('active', 'pending', 'suspended', 'archived'));

-- 2. Backfill missing fund_class on transactions_v2
UPDATE public.transactions_v2 t
SET fund_class = f.fund_class
FROM public.funds f
WHERE t.fund_id = f.id 
AND (t.fund_class IS NULL OR t.fund_class = '');

-- 3. Add is_voided filter index for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_v2_is_voided 
ON public.transactions_v2(is_voided) 
WHERE is_voided = false;