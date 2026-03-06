-- Add RLS policy for IB to read minimal referral profile info
-- This allows IBs to see profiles of investors they referred (where ib_parent_id = their id)

-- First check if policy exists and drop if needed
DROP POLICY IF EXISTS "ib_can_read_referral_profiles" ON profiles;

-- Create policy allowing IB to read their referrals' profiles
CREATE POLICY "ib_can_read_referral_profiles"
ON profiles FOR SELECT
USING (
  ib_parent_id = auth.uid()  -- IB can see their referrals
);