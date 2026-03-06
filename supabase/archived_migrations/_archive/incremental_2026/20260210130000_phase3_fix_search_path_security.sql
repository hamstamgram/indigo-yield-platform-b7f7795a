-- Phase 3: Fix search_path security advisory for 2 functions
-- Supabase advisors flagged these functions with mutable search_path
-- Setting search_path = public prevents search_path manipulation attacks

ALTER FUNCTION crystallize_yield_before_flow SET search_path = public;
ALTER FUNCTION get_investor_fee_pct SET search_path = public;
