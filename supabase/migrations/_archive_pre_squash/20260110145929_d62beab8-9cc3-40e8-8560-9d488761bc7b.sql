-- Fix the rate_limits insert policy to be more restrictive
-- This should only allow inserts from SECURITY DEFINER functions

DROP POLICY IF EXISTS "rate_limits_insert_system" ON rate_limits;

-- Only allow inserts via the check_rate_limit function (which is SECURITY DEFINER)
-- Regular users cannot directly insert into rate_limits
CREATE POLICY "rate_limits_no_direct_insert" ON rate_limits
  FOR INSERT WITH CHECK (false);

-- The check_rate_limit function bypasses RLS via SECURITY DEFINER
-- so it can still insert records