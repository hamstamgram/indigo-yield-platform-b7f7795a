-- Add RLS policies for admin_invites if not exists
-- Allow super_admins to manage invites (existing policies may already exist)

-- First check if we need to add delete policy
DO $$
BEGIN
  -- Add delete policy for super_admins if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_invites' 
    AND policyname = 'Super admins can delete invites'
  ) THEN
    CREATE POLICY "Super admins can delete invites"
    ON public.admin_invites
    FOR DELETE
    TO authenticated
    USING (has_role(auth.uid(), 'super_admin'::app_role));
  END IF;
END $$;

-- Create system_health_check function for admin use
CREATE OR REPLACE FUNCTION public.system_health_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  db_ok boolean := false;
  last_yield_run timestamp;
  last_report_run timestamp;
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Basic DB check
  BEGIN
    PERFORM 1;
    db_ok := true;
  EXCEPTION WHEN OTHERS THEN
    db_ok := false;
  END;

  -- Get last yield distribution run
  SELECT MAX(created_at) INTO last_yield_run
  FROM fee_allocations
  LIMIT 1;

  -- Get last report generation
  SELECT MAX(created_at) INTO last_report_run
  FROM generated_reports
  LIMIT 1;

  result := jsonb_build_object(
    'database', jsonb_build_object('status', CASE WHEN db_ok THEN 'operational' ELSE 'down' END),
    'last_yield_distribution', last_yield_run,
    'last_report_generation', last_report_run,
    'checked_at', now()
  );

  RETURN result;
END;
$$;

-- Grant execute to authenticated users (function itself checks admin status)
GRANT EXECUTE ON FUNCTION public.system_health_check() TO authenticated;