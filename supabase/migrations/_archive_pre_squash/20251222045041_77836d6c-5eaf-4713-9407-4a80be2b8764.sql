-- =====================================================
-- GO-LIVE FIXES: IB Roles, IB_CREDIT Visibility, Report Runs Columns
-- =====================================================

-- 1. Fix missing IB roles for users who are IB parents
-- IB users MUST have both 'ib' and 'investor' roles

-- Add 'ib' role for IB parents who don't have it
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT p.ib_parent_id, 'ib'::app_role
FROM profiles p
WHERE p.ib_parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.ib_parent_id AND ur.role = 'ib'
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Add 'investor' role for IB parents who don't have it
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT p.ib_parent_id, 'investor'::app_role
FROM profiles p
WHERE p.ib_parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.ib_parent_id AND ur.role = 'investor'
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Fix IB_CREDIT visibility - must be admin_only, NOT investor_visible
UPDATE transactions_v2
SET visibility_scope = 'admin_only'
WHERE type = 'IB_CREDIT' 
  AND visibility_scope = 'investor_visible';

-- 3. Add missing columns to report_runs table for delivery tracking
DO $$ 
BEGIN
  -- Add eligible_count column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'report_runs' AND column_name = 'eligible_count'
  ) THEN
    ALTER TABLE report_runs ADD COLUMN eligible_count integer DEFAULT 0;
  END IF;
  
  -- Add queued_count column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'report_runs' AND column_name = 'queued_count'
  ) THEN
    ALTER TABLE report_runs ADD COLUMN queued_count integer DEFAULT 0;
  END IF;
  
  -- Add sent_count column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'report_runs' AND column_name = 'sent_count'
  ) THEN
    ALTER TABLE report_runs ADD COLUMN sent_count integer DEFAULT 0;
  END IF;
  
  -- Add failed_count column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'report_runs' AND column_name = 'failed_count'
  ) THEN
    ALTER TABLE report_runs ADD COLUMN failed_count integer DEFAULT 0;
  END IF;
  
  -- Add provider column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'report_runs' AND column_name = 'provider'
  ) THEN
    ALTER TABLE report_runs ADD COLUMN provider text DEFAULT 'mailersend';
  END IF;
  
  -- Add run_type column if not exists (generation vs delivery)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'report_runs' AND column_name = 'run_type'
  ) THEN
    ALTER TABLE report_runs ADD COLUMN run_type text DEFAULT 'generation';
  END IF;
END $$;

-- 4. Create index for faster delivery queue lookups
CREATE INDEX IF NOT EXISTS idx_statement_email_delivery_period_status 
ON statement_email_delivery(period_id, status);

-- 5. Verify fixes (informational)
-- After migration, run these queries to verify:
-- SELECT * FROM user_roles WHERE role = 'ib';
-- SELECT visibility_scope, COUNT(*) FROM transactions_v2 WHERE type = 'IB_CREDIT' GROUP BY visibility_scope;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'report_runs';