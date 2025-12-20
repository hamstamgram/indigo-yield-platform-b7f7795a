-- Add RLS policy to allow admins to update any profile
CREATE POLICY "admins_can_update_any_profile" ON public.profiles
FOR UPDATE TO authenticated
USING (is_admin_safe())
WITH CHECK (is_admin_safe());