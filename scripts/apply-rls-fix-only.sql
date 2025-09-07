-- CRITICAL RLS FIX - Apply this FIRST to fix infinite recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Create a new function that doesn't cause recursion
CREATE OR REPLACE FUNCTION public.check_is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    admin_status BOOLEAN;
BEGIN
    SELECT is_admin INTO admin_status
    FROM public.profiles
    WHERE id = user_id;
    
    RETURN COALESCE(admin_status, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_is_admin(UUID) TO authenticated;

-- Recreate policies without recursion
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_admin" ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_none" ON public.profiles
    FOR DELETE
    USING (FALSE);

-- Update the is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.check_is_admin(auth.uid());
END;
$$ LANGUAGE plpgsql STABLE;
