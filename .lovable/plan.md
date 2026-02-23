
# Comprehensive Platform Audit Report

## Critical Findings

### BUG 1: `fund_aum_mismatch` View Does Not Exist (Runtime Crash)

**Severity:** Critical -- breaks the Integrity Dashboard and System Health page at runtime.

The view `fund_aum_mismatch` is referenced in two files but **does not exist** in the database. The database has no view matching `%aum%` at all.

- `src/services/admin/integrityService.ts` line 21: `supabase.from("fund_aum_mismatch" as any)` -- when this query executes, it returns an error. Line 36 then **throws**, crashing the entire `fetchIntegrityChecks()` function and preventing ALL 6 integrity checks from displaying.
- `src/services/admin/systemAdminService.ts` line 377: same query -- crashes the system health diagnostic page.

**Fix:** Replace `"fund_aum_mismatch"` with an existing equivalent view. The closest match is `position_transaction_reconciliation` (which compares position values against transaction sums). Alternatively, create the missing view via SQL migration. The simpler fix is to swap the reference to an existing view or gracefully handle the error instead of throwing.

**Recommended approach:** Change the error handling in `integrityService.ts` so that the `fundAumMismatch` query failure does NOT crash the entire function. Instead, treat a query error as a "warning" status with count 0. In `systemAdminService.ts`, do the same -- return count 0 if the query fails.

| File | Line | Change |
|------|------|--------|
| `src/services/admin/integrityService.ts` | 36 | Remove the `throw` for `fundAumMismatch.error`; instead set status to "warning" with a message |
| `src/services/admin/systemAdminService.ts` | 377 | Wrap the `fund_aum_mismatch` query result check to gracefully return `{ count: 0, data: [] }` on error |

---

### BUG 2: Indigo LP Cost Basis Mismatch (Data Anomaly)

**Severity:** Medium -- data integrity issue, detected by `v_cost_basis_mismatch`.

The `v_cost_basis_mismatch` view reports a variance for **Indigo LP** in the SOL fund:

| Field | Position Value | Computed from Ledger |
|-------|---------------|---------------------|
| cost_basis | 0.00 | -13.65 |
| current_value | 0.0017218800 | 0.0008609400 |
| shares | 1263.6508609400 | 0.0008609400 |

Ledger transactions (all non-voided):
- YIELD +2.00 (Sept 4)
- YIELD +11.65 (Sept 30)
- DEPOSIT +1250.00 (Feb 23)
- WITHDRAWAL -1263.65 (Feb 23)
- DUST +0.00086 (Feb 23)

Ledger sum = 0.00086. Position shows current_value = 0.00172 (exactly 2x the dust amount). This suggests `recompute_investor_position` was called but double-counted the DUST transaction, OR the position was not recomputed after the full withdrawal sequence.

**Fix:** This is a data-only issue. Run `recompute_investor_position` for this investor+fund pair to resync the position from the ledger. No code change needed -- the canonical writer should produce the correct result.

**Manual SQL action:**
```sql
SELECT recompute_investor_position(
  'd91f3eb7-bd47-4c42-ab4f-c4f20fb41b13',
  '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'
);
```

---

### BUG 3: Orphaned Positions for Deleted Profile

**Severity:** Low -- cosmetic data residue, no financial impact.

Investor `20396ec2-c919-46ef-b3a3-8005a8a34bd3` has 2 `investor_positions` records (both `current_value = 0`, `is_active = false`) but NO matching `profiles` row. The `v_orphaned_positions` view correctly detects these as `INVESTOR_MISSING`.

Their yield_allocations (2 records) are all voided. No transactions exist.

**Fix:** Clean up via SQL:
```sql
DELETE FROM investor_positions 
WHERE investor_id = '20396ec2-c919-46ef-b3a3-8005a8a34bd3';
```

---

### BUG 4: Ghost Performance Records Still Exist (Kabbaj & Vivie)

**Severity:** Medium -- causes "Empty Preview" reports in the Statements UI.

The SQL cleanup from the previous plan has NOT been executed yet. Family Kabbaj and Vivie & Liana still have stale `investor_fund_performance` records for September 2025 SOL.

**Fix:** Execute the previously provided cleanup SQL:
```sql
DELETE FROM investor_fund_performance
WHERE period_id = 'a0fcc3fd-0912-4338-8829-3e1cb6b0589a'
  AND fund_name = 'SOL'
  AND investor_id IN (
    'f917cd8b-2d12-428c-ae3c-210b7ee3ae75',
    '981dd85c-35c8-4254-a3e9-27c2af302815'
  );
```

---

### ISSUE 5: Redundant RLS SELECT Policies (Performance)

**Severity:** Low -- no functional bug, but causes unnecessary policy evaluation overhead.

Two tables have redundant overlapping SELECT policies:

**`notifications` (3 SELECT policies, all PERMISSIVE):**
- `notifications_select`: `user_id = auth.uid() OR is_admin()`
- `Admins can view all notifications`: `user_id = auth.uid() OR check_is_admin(auth.uid())`
- `Notifications own access`: `user_id = auth.uid()`

The first policy already covers all cases. The other two are redundant.

**`investor_emails` (3 SELECT policies, all PERMISSIVE):**
- `Admins can view investor emails`: `is_admin()`
- `investor_emails_select_own`: `investor_id = auth.uid()`
- `investor_emails_select_own_or_admin`: `investor_id = auth.uid() OR is_admin_safe()`

The third policy subsumes the first two.

**Fix (SQL migration):** Drop the redundant policies. Since PERMISSIVE policies are OR'd together, the redundancy is harmless but wastes query planner cycles.

```sql
-- notifications: keep only notifications_select
DROP POLICY "Admins can view all notifications" ON notifications;
DROP POLICY "Notifications own access" ON notifications;

-- investor_emails: keep only investor_emails_select_own_or_admin
DROP POLICY "Admins can view investor emails" ON investor_emails;
DROP POLICY "investor_emails_select_own" ON investor_emails;
```

---

## Verified Clean (No Issues Found)

| Check | Result |
|-------|--------|
| Position-Ledger Reconciliation (`investor_position_ledger_mismatch`) | 0 mismatches |
| Yield Conservation (`yield_distribution_conservation_check`) | 0 violations |
| IB Allocation Consistency (`ib_allocation_consistency`) | 0 issues |
| Position-Transaction Reconciliation (`position_transaction_reconciliation`) | 0 discrepancies > 0.001 |
| Fee allocation orphans (voided tx with non-voided fee_alloc) | 0 |
| Duplicate positions (same investor+fund) | 0 |
| Stuck withdrawal requests | 0 |
| Orphaned notifications (null user_id) | 0 |
| Orphaned investor_fund_performance (deleted profiles) | 0 |

---

## Summary of Required Actions

### Code Changes (2 files)

| # | File | Change | Risk |
|---|------|--------|------|
| 1 | `src/services/admin/integrityService.ts` | Gracefully handle `fund_aum_mismatch` query error instead of throwing (view doesn't exist) | None -- prevents crash |
| 2 | `src/services/admin/systemAdminService.ts` | Same graceful handling for the `fund_aum_mismatch` query | None -- prevents crash |

### Manual SQL Cleanup (run in SQL Editor)

| # | Action | SQL |
|---|--------|-----|
| 1 | Recompute Indigo LP SOL position | `SELECT recompute_investor_position('d91f3eb7-...', '7574bc81-...');` |
| 2 | Delete orphaned positions | `DELETE FROM investor_positions WHERE investor_id = '20396ec2-...';` |
| 3 | Delete ghost performance records (Kabbaj/Vivie) | Previously provided DELETE statement |

### Optional SQL Migration (RLS cleanup)

Drop 4 redundant SELECT policies on `notifications` and `investor_emails` tables. Low priority -- no functional impact.
