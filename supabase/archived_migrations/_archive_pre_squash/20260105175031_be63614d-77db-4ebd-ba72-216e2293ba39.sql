-- ============================================
-- Phase 1: Drop deprecated v2 functions
-- ============================================
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, aum_purpose, uuid);
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(uuid, date, numeric, aum_purpose);
DROP FUNCTION IF EXISTS public.complete_withdrawal_legacy(uuid, uuid, numeric, text, uuid);
DROP FUNCTION IF EXISTS public.distribute_yield_v2(uuid, date, date, numeric, uuid);

-- ============================================
-- Phase 1.2: Fix v3 function overload conflicts
-- Drop any duplicate overloads and keep canonical signatures
-- ============================================

-- First check for and drop duplicate preview_daily_yield_to_fund_v3 overloads
-- The canonical signature is: (p_fund_id uuid, p_yield_date date, p_new_aum numeric, p_purpose aum_purpose)
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v3(uuid, date, numeric, aum_purpose, uuid);

-- Drop any apply_daily_yield_to_fund_v3 without admin_id param (if exists)
-- The canonical signature is: (p_fund_id uuid, p_yield_date date, p_new_aum numeric, p_purpose aum_purpose, p_admin_id uuid)
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v3(uuid, date, numeric, aum_purpose);

-- ============================================
-- Phase 1.3: Fix has_role function conflict
-- Keep only the (uuid, text) signature
-- ============================================
DROP FUNCTION IF EXISTS public.has_role(text);

-- ============================================
-- Phase 1.4: Fix internal_route_to_fees overloads  
-- Keep only the signature we actually use
-- ============================================
DROP FUNCTION IF EXISTS public.internal_route_to_fees(uuid, uuid, numeric, text, text, uuid);