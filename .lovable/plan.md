

# Comprehensive Platform Verification Report

## Audit Methodology
- Supabase linter (20 warnings)
- Security scan (24 findings, 3 critical)
- All database triggers verified (50+ triggers, all enabled)
- Full TypeScript build: **0 errors**
- Dev server logs: **0 errors**
- Database integrity: 282 active transactions, 25 active positions, 36 active yield distributions, 5 active funds — all healthy
- Audit tables post-cleanup: 12K + 4.8K rows (down from 700K) — healthy

---

## CRITICAL (P0): Privilege Escalation via `user_roles` INSERT Policy

**Severity: CRITICAL — Exploitable NOW**

The `user_roles` table has an RLS policy called `Allow role insert during signup` with:
```sql
WITH CHECK (user_id = auth.uid())
```

This means **any authenticated user** can insert a row like:
```sql
INSERT INTO user_roles (user_id, role) VALUES (auth.uid(), 'admin');
```

...and instantly gain full admin access to the entire platform. Every table's RLS depends on `is_admin()` which queries this table.

**Fix:** Drop this policy. Role assignment must happen only via service_role (e.g., in a trigger on `auth.users` or via the `send-admin-invite` edge function). If signup requires a default `'user'` role, use a SECURITY DEFINER function that hardcodes the role value.

---

## CRITICAL (P0): Storage Bucket Policies Allow Cross-User File Access

Two storage policies allow any authenticated user to read all files in shared buckets:

1. `documents_bucket_authenticated_select` — grants SELECT on **all** objects in the `documents` bucket to any authenticated user
2. `statements_bucket_authenticated_select` — grants SELECT on **all** objects in the `statements` bucket to any authenticated user

The `statements` bucket has a correctly scoped `statements_select_own` policy (path-based), but the broad `authenticated_select` policy overrides it via OR logic.

**Fix:** Drop both `*_bucket_authenticated_select` policies. The `statements_select_own` + `statements_select_admin` policies already provide correct access. For `documents`, add a path-based ownership policy similar to statements.

---

## HIGH (P1): 20 Functions Missing `search_path`

20 PL/pgSQL functions lack `SET search_path = public`. None are `SECURITY DEFINER` (confirmed), so the immediate risk is lower — but trigger functions like `cascade_void_to_allocations`, `enforce_canonical_position_mutation`, `enforce_transaction_via_rpc`, and `validate_withdrawal_request` execute in security-sensitive contexts.

**Functions to fix:**
```text
acquire_position_lock          enforce_canonical_position_mutation
cascade_void_to_allocations    enforce_canonical_transaction_mutation
enforce_transaction_via_rpc    get_fees_account_for_fund
get_position_at_date           log_aum_position_mismatch
nightly_aum_reconciliation     preview_segmented_yield_distribution
set_position_is_active         sync_profile_role_from_profiles
sync_profile_role_from_roles   touch_updated_at
validate_ib_parent_has_role    validate_withdrawal_request
run_v6_e2e_simulation          run_v6_user_simulation
run_v6_user_simulation_isolated run_v6_void_simulation
```

**Fix:** Single migration adding `SET search_path = public` to all 20 functions via `ALTER FUNCTION ... SET search_path = public`.

---

## MEDIUM (P2): Redundant RLS Policies on `ib_commission_ledger` and `platform_fee_ledger`

Both tables have overlapping SELECT policies:
- `ib_commission_ledger`: An ALL admin policy + a separate admin SELECT policy + an IB self-select policy
- `platform_fee_ledger`: An ALL admin policy + a separate admin SELECT policy + a user self-select policy

The standalone admin SELECT policies are fully redundant with the ALL policy.

**Fix:** Drop `ib_commission_ledger_select` and `platform_fee_ledger_select`.

---

## Summary of Frontend / Backend Health

| Area | Status |
|------|--------|
| TypeScript build | 0 errors |
| Dev server | 0 errors |
| Console errors | None (only React Router v7 future flag warnings) |
| Database triggers | All 50+ enabled and operational |
| FK constraints (new) | Active on `transactions_v2`, `investor_positions`, `fee_allocations` |
| Unique indexes (new) | Active on `fund_daily_aum`, `platform_fee_ledger`, `ib_commission_ledger`, `investor_positions` |
| Audit cleanup | Successful (1.2 GB → ~32 MB) |
| Admin check functions | Standardized to `is_admin()` |
| Integrity data | 282 txns, 25 positions, 36 yields — no orphans detected |
| Edge functions | 18 functions deployed |

---

## Ordered Action Plan

| Priority | Action | Risk |
|----------|--------|------|
| **P0-A** | Drop `Allow role insert during signup` INSERT policy on `user_roles`; create a SECURITY DEFINER function for default role assignment during signup | Critical fix, low risk |
| **P0-B** | Drop `documents_bucket_authenticated_select` and `statements_bucket_authenticated_select` storage policies; add path-based ownership policy for documents | Critical fix, low risk |
| **P1** | Add `SET search_path = public` to all 20 unpatched functions | Low risk |
| **P2** | Drop 2 redundant admin SELECT policies on `ib_commission_ledger` and `platform_fee_ledger` | No risk |

The P0 items are actively exploitable security vulnerabilities that should be fixed immediately.

