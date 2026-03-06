-- ============================================================
-- Fix Function Overload Conflicts - Drop enum-based versions
-- Keep only the TEXT-based versions that return JSONB
-- ============================================================

-- Drop the enum-based preview function (returns TABLE, not JSONB)
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v3(uuid, date, numeric, aum_purpose);

-- Drop the enum-based apply function (old signature with enum parameter in wrong position)
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v3(uuid, date, numeric, aum_purpose, uuid);

-- Also drop the short apply signature if it exists
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v3(uuid, date, numeric, aum_purpose);

-- Verify: After this migration, only these signatures should remain:
-- preview_daily_yield_to_fund_v3(uuid, date, numeric, text) -> RETURNS JSONB
-- apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, text) -> RETURNS JSONB