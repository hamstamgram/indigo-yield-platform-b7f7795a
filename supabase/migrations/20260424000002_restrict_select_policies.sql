-- Migration: restrict overly permissive SELECT policies on financial data tables
-- Fixes H4 from pre-launch security audit

-- Restrict fund_aum_events to admin-only
DROP POLICY IF EXISTS "fund_aum_events_select_all" ON "public"."fund_aum_events";
CREATE POLICY "fund_aum_events_select_admin" ON "public"."fund_aum_events"
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Restrict fund_yield_snapshots to admin-only
DROP POLICY IF EXISTS "fund_yield_snapshots_select_all" ON "public"."fund_yield_snapshots";
CREATE POLICY "fund_yield_snapshots_select_admin" ON "public"."fund_yield_snapshots"
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Restrict error_code_metadata to admin-only
DROP POLICY IF EXISTS "error_metadata_read" ON "public"."error_code_metadata";
CREATE POLICY "error_metadata_read_admin" ON "public"."error_code_metadata"
  FOR SELECT TO authenticated
  USING (public.is_admin());
