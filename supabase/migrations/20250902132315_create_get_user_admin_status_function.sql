-- Migration: Create get_user_admin_status RPC function
-- Version: 010
-- Date: 2025-09-02
-- Description: Creates RPC function to check if a user has admin privileges

-- Create function to get user admin status
CREATE OR REPLACE FUNCTION public.get_user_admin_status(user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if user exists and is admin
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = user_id 
        AND is_admin = TRUE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_admin_status(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_user_admin_status(UUID) IS 
'Returns true if the specified user has admin privileges, false otherwise. Used by the frontend AuthContext to determine admin access.';
