-- Fix: allow 'running' and 'warning' status values in admin_integrity_runs
ALTER TABLE public.admin_integrity_runs DROP CONSTRAINT IF EXISTS admin_integrity_runs_status_check;
ALTER TABLE public.admin_integrity_runs ADD CONSTRAINT admin_integrity_runs_status_check 
  CHECK (status = ANY (ARRAY['pass','fail','running','warning']));