
-- ============================================================================
-- PART 1: Drop duplicate adjust_investor_position function
-- ============================================================================

-- Drop the legacy signature (with p_amount instead of p_delta)
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, date, text, uuid);
