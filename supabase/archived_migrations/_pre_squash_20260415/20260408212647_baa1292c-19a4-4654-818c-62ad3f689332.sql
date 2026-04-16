
-- ============================================================
-- Migration C: RLS InitPlan optimization + Policy consolidation + View fix
-- ============================================================

-- 1. ib_allocations: wrap auth.uid() in read policy
DROP POLICY IF EXISTS "ib_allocations_read_policy" ON public.ib_allocations;
CREATE POLICY "ib_allocations_read_policy" ON public.ib_allocations
  FOR SELECT USING (is_admin() OR (ib_investor_id = (SELECT auth.uid())));

-- 2. investor_device_tokens: wrap auth.uid() in insert + delete
DROP POLICY IF EXISTS "investor_device_tokens_insert" ON public.investor_device_tokens;
CREATE POLICY "investor_device_tokens_insert" ON public.investor_device_tokens
  FOR INSERT TO authenticated WITH CHECK (investor_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "investor_device_tokens_delete" ON public.investor_device_tokens;
CREATE POLICY "investor_device_tokens_delete" ON public.investor_device_tokens
  FOR DELETE TO authenticated USING (investor_id = (SELECT auth.uid()));

-- 3. notifications: wrap auth.uid() in update (USING + WITH CHECK) and delete
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- 4. transactions_v2: wrap auth.uid() in investor read policy
DROP POLICY IF EXISTS "investor_transactions_read_policy" ON public.transactions_v2;
CREATE POLICY "investor_transactions_read_policy" ON public.transactions_v2
  FOR SELECT USING (
    ((investor_id = (SELECT auth.uid()) AND (visibility_scope = 'investor_visible'::visibility_scope OR visibility_scope IS NULL))
    OR is_admin())
  );

-- 5. user_sessions: wrap auth.uid() in self/insert/update
DROP POLICY IF EXISTS "user_sessions_self" ON public.user_sessions;
CREATE POLICY "user_sessions_self" ON public.user_sessions
  FOR SELECT USING (
    ((SELECT auth.uid()) = user_id) OR
    (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])))
  );

DROP POLICY IF EXISTS "user_sessions_insert" ON public.user_sessions;
CREATE POLICY "user_sessions_insert" ON public.user_sessions
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_sessions_update" ON public.user_sessions;
CREATE POLICY "user_sessions_update" ON public.user_sessions
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- 6. yield_distributions: consolidate 2 SELECT policies into 1 with wrapped auth.uid()
DROP POLICY IF EXISTS "admin_yield_select" ON public.yield_distributions;
DROP POLICY IF EXISTS "investor_yield_read_own_fund" ON public.yield_distributions;
CREATE POLICY "yield_distributions_select" ON public.yield_distributions
  FOR SELECT USING (
    is_admin() OR
    EXISTS (SELECT 1 FROM investor_positions ip
            WHERE ip.fund_id = yield_distributions.fund_id
              AND ip.investor_id = (SELECT auth.uid())
              AND ip.is_active = true)
  );

-- 7. Fix v_missing_withdrawal_transactions false positives
CREATE OR REPLACE VIEW public.v_missing_withdrawal_transactions
WITH (security_invoker = true)
AS
SELECT wr.id AS withdrawal_request_id,
       wr.investor_id,
       wr.fund_id,
       wr.requested_amount,
       wr.processed_amount,
       wr.status,
       wr.processed_at
FROM withdrawal_requests wr
LEFT JOIN transactions_v2 t
  ON t.investor_id = wr.investor_id
  AND t.fund_id = wr.fund_id
  AND t.type IN ('WITHDRAWAL'::tx_type, 'INTERNAL_WITHDRAWAL'::tx_type)
  AND t.is_voided = false
  AND t.created_at >= wr.request_date
  AND NOT (t.reference_id LIKE 'DUST_SWEEP_OUT:%'
        OR t.reference_id LIKE 'DUST_RECV:%'
        OR t.reference_id LIKE 'dust-sweep-%'
        OR t.reference_id LIKE 'dust-credit-%')
WHERE wr.status = 'completed'::withdrawal_status
  AND t.id IS NULL;
