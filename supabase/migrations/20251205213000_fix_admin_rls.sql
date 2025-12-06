
-- Fix Admin RLS Access
-- Ensures that users with is_admin=true can access all investor data

-- 1. Update check_is_admin function to be strictly based on profiles
CREATE OR REPLACE FUNCTION public.check_is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = user_id 
    AND is_admin = true
  );
END;
$$;

-- 2. Update/Ensure RLS Policies for Investors Table
DROP POLICY IF EXISTS "Admins can view all investors" ON public.investors;
CREATE POLICY "Admins can view all investors"
  ON public.investors FOR SELECT
  TO authenticated
  USING (check_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all investors" ON public.investors;
CREATE POLICY "Admins can update all investors"
  ON public.investors FOR UPDATE
  TO authenticated
  USING (check_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert investors" ON public.investors;
CREATE POLICY "Admins can insert investors"
  ON public.investors FOR INSERT
  TO authenticated
  WITH CHECK (check_is_admin(auth.uid()));

-- 3. Update/Ensure RLS Policies for Transactions
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (check_is_admin(auth.uid()));

-- 4. Update/Ensure RLS Policies for Reports
DROP POLICY IF EXISTS "Admins can view all reports" ON public.investor_monthly_reports;
CREATE POLICY "Admins can view all reports"
  ON public.investor_monthly_reports FOR SELECT
  TO authenticated
  USING (check_is_admin(auth.uid()));

-- 5. Update/Ensure RLS Policies for Positions
DROP POLICY IF EXISTS "Admins can view all positions" ON public.investor_positions;
CREATE POLICY "Admins can view all positions"
  ON public.investor_positions FOR SELECT
  TO authenticated
  USING (check_is_admin(auth.uid()));
