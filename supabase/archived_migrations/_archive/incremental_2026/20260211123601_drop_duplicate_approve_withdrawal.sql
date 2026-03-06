-- Drop the old 4-param overload that conflicts with the 6-param version
-- The 6-param version has defaults for p_is_full_exit and p_send_precision
-- so it handles all calls that the 4-param version would have handled
DROP FUNCTION IF EXISTS public.approve_and_complete_withdrawal(uuid, numeric, text, text);
