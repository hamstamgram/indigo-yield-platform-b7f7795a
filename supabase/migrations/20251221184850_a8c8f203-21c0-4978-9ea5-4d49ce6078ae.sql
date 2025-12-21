-- Add RLS policies for fund management by admins
-- Allow admins to INSERT new funds
CREATE POLICY "funds_insert_admin" ON public.funds
FOR INSERT TO authenticated
WITH CHECK (is_admin());

-- Allow admins to UPDATE fund settings/status
CREATE POLICY "funds_update_admin" ON public.funds
FOR UPDATE TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Allow admins to DELETE funds (prefer soft delete via status change)
CREATE POLICY "funds_delete_admin" ON public.funds
FOR DELETE TO authenticated
USING (is_admin());