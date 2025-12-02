-- Migration: Remove Withdrawal Limits System
-- Date: 2025-09-10
-- Description: Drop all objects related to withdrawal limits/violations and triggers

-- 1) Drop trigger enforcing limits on withdrawal_requests
DROP TRIGGER IF EXISTS trg_enforce_withdrawal_limits ON public.withdrawal_requests;
-- 2) Drop functions (use CASCADE to remove dependent grants/comments)
DROP FUNCTION IF EXISTS public.enforce_withdrawal_limits() CASCADE;
DROP FUNCTION IF EXISTS public.check_withdrawal_limits(UUID, UUID, TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.override_withdrawal_limit_violation(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_withdrawal_limit_violations(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_withdrawal_limit(UUID, NUMERIC, INTEGER, NUMERIC, BOOLEAN, TEXT) CASCADE;
-- 3) Drop tables (policies go away with table)
DROP TABLE IF EXISTS public.withdrawal_limit_violations CASCADE;
DROP TABLE IF EXISTS public.withdrawal_limits CASCADE;
-- Migration complete;
