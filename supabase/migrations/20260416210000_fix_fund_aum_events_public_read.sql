-- ============================================================
-- Fix FUND_AUM_EVENTS PUBLIC READ (P0 — Lovable Security Scanner)
--
-- PROBLEM: fund_aum_events_select_all policy has USING (true)
-- allowing unauthenticated users to read all AUM events.
--
-- FIX: Replace with auth-gated policy requiring authentication.
-- AUM data is financial — only authenticated users should see it.
-- ============================================================

DROP POLICY IF EXISTS fund_aum_events_select_all ON public.fund_aum_events;

CREATE POLICY fund_aum_events_select_authenticated ON public.fund_aum_events
  FOR SELECT
  TO authenticated
  USING (true);