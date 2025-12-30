-- Cleanup migration: Drop empty/legacy tables and columns
-- This migration removes deprecated structures safely

-- 1. Drop audit_events_v view that depends on audit_logs
DROP VIEW IF EXISTS public.audit_events_v;

-- 2. Drop empty audit_logs table (0 records - code now uses audit_log with 1849 records)
DROP TABLE IF EXISTS public.audit_logs;

-- 3. Drop withdrawal_audit_log VIEW (not a table, 0 records)
DROP VIEW IF EXISTS public.withdrawal_audit_log;

-- 4. Drop legacy fee_percentage column from profiles (code now uses fee_pct)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS fee_percentage;

-- 5. Recreate audit_events_v view using the correct audit_log table
CREATE OR REPLACE VIEW public.audit_events_v AS
SELECT 
  id as event_id,
  actor_user as user_id,
  old_values,
  new_values,
  meta,
  created_at,
  actor_user,
  entity as source_table,
  action as operation,
  entity,
  entity_id
FROM public.audit_log;