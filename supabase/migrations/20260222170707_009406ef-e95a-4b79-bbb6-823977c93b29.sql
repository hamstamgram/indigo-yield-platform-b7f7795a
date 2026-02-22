
-- Fix 1: Missing FK on yield_allocations (CRITICAL)
ALTER TABLE yield_allocations
ADD CONSTRAINT yield_allocations_distribution_id_fkey
FOREIGN KEY (distribution_id) REFERENCES yield_distributions(id);

-- Fix 2: Notifications UPDATE policy missing (HIGH)
CREATE POLICY notifications_update_own ON notifications
FOR UPDATE USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Fix 3: Set SECURITY INVOKER on 4 reconciliation views
-- This ensures underlying table RLS is enforced for the querying user

ALTER VIEW fund_aum_mismatch SET (security_invoker = true);
ALTER VIEW yield_distribution_conservation_check SET (security_invoker = true);
ALTER VIEW investor_position_ledger_mismatch SET (security_invoker = true);

-- ib_allocation_consistency lacks is_admin() guard, recreate with it
CREATE OR REPLACE VIEW ib_allocation_consistency
WITH (security_invoker = true)
AS
SELECT ia.id AS allocation_id,
    ia.source_investor_id,
    ((source_p.first_name || ' '::text) || source_p.last_name) AS source_investor_name,
    ia.ib_investor_id AS allocated_ib_id,
    ((ib_p.first_name || ' '::text) || ib_p.last_name) AS allocated_ib_name,
    source_p.ib_parent_id AS current_ib_id,
    ((current_ib_p.first_name || ' '::text) || current_ib_p.last_name) AS current_ib_name,
    ia.ib_fee_amount,
    ia.effective_date,
    (ia.ib_investor_id <> source_p.ib_parent_id) AS ib_changed_since_allocation,
    ((source_p.ib_parent_id IS NULL) AND (ia.ib_investor_id IS NOT NULL)) AS ib_removed
   FROM (((ib_allocations ia
     JOIN profiles source_p ON ((source_p.id = ia.source_investor_id)))
     LEFT JOIN profiles ib_p ON ((ib_p.id = ia.ib_investor_id)))
     LEFT JOIN profiles current_ib_p ON ((current_ib_p.id = source_p.ib_parent_id)))
  WHERE is_admin()
    AND (ia.is_voided = false)
    AND (((source_p.ib_parent_id IS NOT NULL) AND (ia.ib_investor_id <> source_p.ib_parent_id))
      OR ((source_p.ib_parent_id IS NULL) AND (ia.ib_investor_id IS NOT NULL)));
