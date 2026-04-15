# Void System Standardization — Implementation Plan

**Spec:** [2026-04-15-void-system-standardization-design.md](../specs/2026-04-15-void-system-standardization-design.md)
**Date:** 2026-04-15

---

## Migration 1: Fix `fund_aum_events.voided_by_profile_id` (Phase 1)

**File:** `supabase/migrations/20260616000000_fix_fund_aum_events_void_columns.sql`

1. ALTER `voided_by_profile_id` from TEXT to UUID:
   ```sql
   ALTER TABLE fund_aum_events
   ALTER COLUMN voided_by_profile_id TYPE uuid USING voided_by_profile_id::uuid;
   ```
2. ADD FK constraint:
   ```sql
   ALTER TABLE fund_aum_events
   ADD CONSTRAINT fund_aum_events_voided_by_profile_id_fkey
   FOREIGN KEY (voided_by_profile_id) REFERENCES profiles(id);
   ```
3. CREATE sync trigger:
   ```sql
   CREATE TRIGGER trg_fund_aum_events_sync_voided_by
   BEFORE INSERT OR UPDATE ON fund_aum_events
   FOR EACH ROW
   EXECUTE FUNCTION sync_fund_aum_events_voided_by_profile();
   ```

---

## Migration 2: Add `voided_by_profile_id` to 4 tables (Phase 2)

**File:** `supabase/migrations/20260616000001_add_voided_by_profile_id_standardize.sql`

For each of `ib_commission_ledger`, `platform_fee_ledger`, `investor_yield_events`, `yield_distributions`:
1. ADD COLUMN `voided_by_profile_id UUID NULL`
2. ADD FK to `profiles(id)`
3. CREATE sync trigger function (reuse pattern from existing sync functions)
4. CREATE BEFORE INSERT OR UPDATE trigger
5. BACKFILL: `UPDATE <table> SET voided_by_profile_id = voided_by WHERE is_voided = TRUE AND voided_by IS NOT NULL AND voided_by_profile_id IS NULL`

---

## Migration 3: Add `void_reason` to 3 tables (Phase 3)

**File:** `supabase/migrations/20260616000002_add_void_reason_standardize.sql`

For each of `fee_allocations`, `ib_allocations`, `investor_yield_events`:
1. ADD COLUMN `void_reason TEXT NULL`

---

## Migration 4: Update `void_transaction` RPC (Phase 4a)

**File:** `supabase/migrations/20260616000003_update_void_transaction_rpc.sql`

Changes to `void_transaction`:
- Step 5 (fee_allocations): add `void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT`
- Step 6 (ib_commission_ledger): add `voided_by_profile_id = p_admin_id`
- Step 7 (platform_fee_ledger): add `voided_by_profile_id = p_admin_id`
- Step 8 (investor_yield_events): add `voided_by_profile_id = p_admin_id, void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT`

---

## Migration 5: Update `void_yield_distribution` RPC (Phase 4b)

**File:** `supabase/migrations/20260616000004_update_void_yield_distribution_rpc.sql`

Fix ALL cascade UPDATEs to set full void columns:
- `transactions_v2`: add `voided_by_profile_id = p_admin_id, void_reason = ...`
- `platform_fee_ledger`: add `voided_at = NOW(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id, void_reason = ...`
- `ib_commission_ledger`: add `voided_at = NOW(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id, void_reason = ...`
- `ib_allocations`: add `voided_at = NOW(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id`
- `investor_yield_events`: add `voided_at = NOW(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id`
- `yield_distributions`: add `voided_by_profile_id = p_admin_id`
- Crystal loop: same fixes

---

## Migration 6: Update `void_fund_daily_aum` RPC (Phase 4c)

**File:** `supabase/migrations/20260616000005_update_void_fund_daily_aum_rpc.sql`

Fix ALL cascade UPDATEs to set `voided_by_profile_id`:
- `yield_distributions` (Step 2): add `voided_by_profile_id = p_admin_id`
- `transactions_v2` (Step 5): add `voided_by_profile_id = p_admin_id`
- `fee_allocations` (Step 7): add `voided_by_profile_id = p_admin_id, void_reason = ...`
- `ib_allocations` (Step 8): add `voided_by_profile_id = p_admin_id`
- `ib_commission_ledger` (Step 9): add `voided_by_profile_id = p_admin_id`
- `platform_fee_ledger` (Step 10): add `voided_by_profile_id = p_admin_id`
- `fund_daily_aum` (Step 12): add `voided_by_profile_id = p_admin_id`
- No-distributions edge case: add `voided_by_profile_id = p_admin_id`

---

## Migration 7: Update `void_investor_yield_events_for_distribution` (Phase 4d)

**File:** `supabase/migrations/20260616000006_update_void_yield_events_rpc.sql`

Add `voided_by_profile_id = p_admin_id, void_reason = p_reason` to the UPDATE.

---

## Step 8: Regenerate TypeScript types (Phase 5)

Run `supabase gen types typescript` and update `src/integrations/supabase/types.ts`.

---

## Execution Order

```
Migration 1 (schema fix)     → can run independently
Migration 2 (add columns)    → can run independently  
Migration 3 (add columns)    → can run independently
Migration 4 (void_transaction RPC)  → depends on 1, 2, 3
Migration 5 (void_yield_distribution RPC) → depends on 2, 3
Migration 6 (void_fund_daily_aum RPC) → depends on 2, 3
Migration 7 (void_yield_events RPC) → depends on 2, 3
Step 8 (type regen)           → depends on all above
```

Migrations 1-3 are safe to apply in any order. Migrations 4-7 require 1-3 to be applied first.

## Verification Queries

After all migrations:
```sql
-- Every void-capable table has all 5 void columns
SELECT table_name,
  bool_and(column_name = 'is_voided') AS has_is_voided,
  bool_and(column_name = 'voided_by_profile_id') AS has_profile_id
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('transactions_v2','fund_aum_events','fund_daily_aum',
    'fee_allocations','ib_allocations','ib_commission_ledger',
    'platform_fee_ledger','investor_yield_events','yield_distributions')
  AND column_name IN ('voided_by_profile_id')
GROUP BY table_name;
-- Expected: 9 rows, all TRUE
```
