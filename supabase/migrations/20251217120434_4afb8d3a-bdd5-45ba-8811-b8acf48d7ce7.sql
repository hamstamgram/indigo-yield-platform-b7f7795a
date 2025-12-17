-- Drop the recursive policy causing infinite recursion
DROP POLICY IF EXISTS "Profiles visible to self and admin" ON public.profiles;

-- Create a new policy that uses the SECURITY DEFINER function to avoid recursion
CREATE POLICY "Profiles visible to self and admin" ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR public.is_admin_safe()
);