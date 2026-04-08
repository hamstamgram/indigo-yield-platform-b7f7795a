

# Remediation Plan: P0 Blockers + P1 Fixes

## P0-NEW-1: Backfill 6 investors missing `user_roles` rows

**Problem:** 6 real investors (confirmed via live query) have no `user_roles` entry. Any RLS path using `has_role()` silently excludes them.

**Fix:** Migration that inserts `user` role for all profiles that lack a `user_roles` row:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'user'::app_role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.id IS NULL
  AND p.is_system_account = false
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## P0-NEW-2: `audit_leakage_report()` uncallable by service_role

**Problem:** Function starts with `IF NOT public.is_admin() THEN RAISE EXCEPTION`. `is_admin()` checks `auth.uid()` which is NULL for service_role/cron/edge callers. Same issue exists in `run_invariant_checks()`.

**Fix:** Rewrite the guard in both functions to allow service_role bypass:

```sql
IF current_user NOT IN ('postgres','supabase_admin')
   AND NOT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user)
   AND NOT public.is_admin()
THEN
  RAISE EXCEPTION 'UNAUTHORIZED: Admin access required';
END IF;
```

This preserves the admin check for normal users while allowing cron/service_role callers through.

---

## P1-1: `toggleAdminStatus` writes `profiles.is_admin` directly

**Problem:** Two functions in the codebase do `.update({ is_admin: !currentStatus })` on profiles — this will now throw against the `protect_profile_sensitive_fields` trigger.

**Files to fix:**
- `src/services/shared/profileService.ts` line 120-128
- `src/features/admin/investors/services/adminUsersService.ts` lines 39-46

**Fix:** Replace both with an RPC call to `update_admin_role` (already exists in DB). The function should call `supabase.rpc('update_admin_role', { target_user_id, new_role })` instead of direct profile update.

---

## P1-2: Drop 4 duplicate indexes

**Confirmed duplicates from live query:**

| Keep | Drop | Table |
|------|------|-------|
| `idx_transactions_v2_fund_date` (fund_id, tx_date DESC) | `idx_tx_v2_fund_date` (identical) | transactions_v2 |
| `idx_transactions_v2_reference_id_fund_unique` (fund_id, reference_id) | `idx_transactions_v2_reference_unique` (reference_id only — subset) | transactions_v2 |
| `idx_positions_fund_active` (fund_id, is_active) partial | `idx_investor_positions_fund` (fund_id only — subset) | investor_positions |
| `idx_fee_allocations_distribution` | `idx_fee_alloc_distribution` (identical) | fee_allocations |

**Fix:** Single migration with 4 `DROP INDEX IF EXISTS` statements.

---

## P1-3 & P1-4: RLS performance warnings

Deferred — these are optimization items (auth_rls_initplan wrapping, policy consolidation) that don't block go-live. Can be addressed in Gate 2.

---

## Implementation Order

1. **Migration A** — Backfill user_roles + fix ensure_admin/audit_leakage_report/run_invariant_checks service_role bypass
2. **Migration B** — Drop 4 duplicate indexes
3. **Code fix** — Rewrite `toggleAdminStatus` in both services to use `update_admin_role` RPC
4. **Update gate-0-report.md** — Mark P0-NEW-1 and P0-NEW-2 as resolved

