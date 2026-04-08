
-- Migration 2: P2 + P3 + P4 — Config & Policy Cleanup

-- P2: Drop system_config_read (exposes config to all authenticated users)
DROP POLICY IF EXISTS "system_config_read" ON public.system_config;

-- P4: Drop redundant system_config_write (system_config_admin_all already covers ALL)
DROP POLICY IF EXISTS "system_config_write" ON public.system_config;

-- P3: Add investor_position_snapshots SELECT policy for investors
CREATE POLICY "investor_position_snapshots_select_own"
ON public.investor_position_snapshots
FOR SELECT
USING (investor_id = (SELECT auth.uid()));
