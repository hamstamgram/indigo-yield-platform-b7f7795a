-- Phase 3: Database hardening and cleanup

-- 1. Fix search_path on update_delivery_updated_at function
CREATE OR REPLACE FUNCTION public.update_delivery_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. Backfill any NULL user_id values in tables with RLS before adding constraints
-- For audit_logs, set NULL user_id to system placeholder or delete orphaned rows
UPDATE public.audit_logs 
SET user_id = '00000000-0000-0000-0000-000000000000' 
WHERE user_id IS NULL;

UPDATE public.deposits 
SET user_id = created_by 
WHERE user_id IS NULL AND created_by IS NOT NULL;

UPDATE public.report_access_logs 
SET user_id = '00000000-0000-0000-0000-000000000000' 
WHERE user_id IS NULL;

-- 3. Add NOT NULL constraints after backfill (these tables use RLS with user_id)
ALTER TABLE public.audit_logs 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.deposits 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.report_access_logs 
ALTER COLUMN user_id SET NOT NULL;

-- 4. Add comment explaining the system user placeholder
COMMENT ON TABLE public.audit_logs IS 'Audit log for database changes. user_id 00000000-0000-0000-0000-000000000000 indicates system-generated entries.';