-- Allow regular admins to insert and update fund_daily_aum (not just super_admin)
-- This is needed so admins can record AUM before creating transactions

-- Drop existing super_admin-only policies if they exist
DROP POLICY IF EXISTS "Super Admin can insert fund_daily_aum" ON fund_daily_aum;
DROP POLICY IF EXISTS "Super Admin can update fund_daily_aum" ON fund_daily_aum;
DROP POLICY IF EXISTS "Admins can insert fund_daily_aum" ON fund_daily_aum;
DROP POLICY IF EXISTS "Admins can update fund_daily_aum" ON fund_daily_aum;

-- Create new policies that allow regular admins to insert and update
CREATE POLICY "Admins can insert fund_daily_aum"
ON fund_daily_aum FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update fund_daily_aum"
ON fund_daily_aum FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());