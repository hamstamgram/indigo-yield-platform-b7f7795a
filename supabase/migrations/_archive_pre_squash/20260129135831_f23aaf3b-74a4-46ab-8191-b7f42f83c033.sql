-- Security Fix: Convert v_orphaned_transactions to SECURITY INVOKER
-- This ensures the view respects the caller's RLS context

-- Drop and recreate the view with security_invoker=on
DROP VIEW IF EXISTS public.v_orphaned_transactions;

CREATE VIEW public.v_orphaned_transactions
WITH (security_invoker = on)
AS
SELECT 
    t.id,
    t.investor_id,
    t.fund_id,
    t.type::text AS type,
    t.amount,
    t.tx_date
FROM transactions_v2 t
LEFT JOIN profiles p ON p.id = t.investor_id
WHERE t.investor_id IS NOT NULL AND p.id IS NULL;

-- Add comment documenting the security fix
COMMENT ON VIEW public.v_orphaned_transactions IS 'Orphaned transactions view. Uses security_invoker=on to respect caller RLS context. Fixed 2026-01-29.';

-- Ensure the policies targeting {public} role are correctly restricted
-- The policies already require auth.uid() which implicitly requires authentication
-- But let's add explicit role restriction to the policies for extra safety

-- For profiles table: Update policies to only apply to authenticated role
DROP POLICY IF EXISTS "Users can view own profile + admin access" ON public.profiles;
CREATE POLICY "Users can view own profile + admin access" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING ((auth.uid() = id) OR is_admin());

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING ((id = auth.uid()) OR is_admin_safe());

DROP POLICY IF EXISTS "allow_own_profile_insert" ON public.profiles;
CREATE POLICY "allow_own_profile_insert" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "ib_can_read_referral_profiles" ON public.profiles;
CREATE POLICY "ib_can_read_referral_profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (ib_parent_id = auth.uid());

DROP POLICY IF EXISTS "no_profile_deletes" ON public.profiles;
CREATE POLICY "no_profile_deletes" 
ON public.profiles 
FOR DELETE 
TO authenticated 
USING (false);

DROP POLICY IF EXISTS "profiles_admin_full_access" ON public.profiles;
CREATE POLICY "profiles_admin_full_access" 
ON public.profiles 
FOR ALL 
TO authenticated 
USING (is_admin()) 
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING ((id = auth.uid()) OR is_admin()) 
WITH CHECK ((id = auth.uid()) OR is_admin());

-- For investor_positions table: Update policies to only apply to authenticated role
DROP POLICY IF EXISTS "Admins can manage investor_positions" ON public.investor_positions;
CREATE POLICY "Admins can manage investor_positions" 
ON public.investor_positions 
FOR ALL 
TO authenticated 
USING (is_admin());

DROP POLICY IF EXISTS "investors_view_own_positions" ON public.investor_positions;
CREATE POLICY "investors_view_own_positions" 
ON public.investor_positions 
FOR SELECT 
TO authenticated 
USING ((investor_id = auth.uid()) OR is_admin());

DROP POLICY IF EXISTS "ib_view_referral_positions" ON public.investor_positions;
CREATE POLICY "ib_view_referral_positions" 
ON public.investor_positions 
FOR SELECT 
TO authenticated 
USING (investor_id IN (
    SELECT id FROM profiles WHERE ib_parent_id = auth.uid()
));

-- For user_totp_settings table: Update policies to only apply to authenticated role
DROP POLICY IF EXISTS "Users can view their own TOTP settings" ON public.user_totp_settings;
CREATE POLICY "Users can view their own TOTP settings" 
ON public.user_totp_settings 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own TOTP settings" ON public.user_totp_settings;
CREATE POLICY "Users can insert their own TOTP settings" 
ON public.user_totp_settings 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own TOTP settings" ON public.user_totp_settings;
CREATE POLICY "Users can update their own TOTP settings" 
ON public.user_totp_settings 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all TOTP settings" ON public.user_totp_settings;
CREATE POLICY "Admins can view all TOTP settings" 
ON public.user_totp_settings 
FOR ALL 
TO authenticated 
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));