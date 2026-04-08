

# CTO/CFO Backend Audit — Findings and Remediation Plan

## Audit Methodology
Inspected all 200+ database functions, 68 triggers, RLS policies, and EXECUTE privilege grants. Ran live integrity checks against production data.

---

## Live Integrity Status (All Green)

| Check | Result |
|-------|--------|
| Position-to-ledger drift | **0 violations** |
| Asymmetric voids | **0 found** |
| Negative positions | **0 found** |
| Negative cost basis | **0 found** |
| Yield conservation drift | **0 violations** |
| Duplicate distributions | **0 found** |
| Tables without RLS | **0 found** |
| SECURITY DEFINER without search_path | **0 found** |
| Supabase linter | **0 warnings** |

---

## Issues Found

### P0-A: CRITICAL — `apply_backfill_yield` has NO admin check + callable by `anon`

`apply_backfill_yield` is a SECURITY DEFINER function that creates yield distributions, transactions, and fee allocations. It has **zero authorization checks** — no `is_admin()`, no role verification. Worse, the `anon` role has EXECUTE privilege on it.

**Impact:** An unauthenticated user with the anon key could fabricate yield distributions on any fund by calling `supabase.rpc('apply_backfill_yield', ...)`.

**Fix:** Add `is_admin()` check at function start + REVOKE EXECUTE from `anon` and `public`.

### P0-B: CRITICAL — `force_delete_investor` has NO admin check + callable by `anon`

Only checks `auth.uid() IS NOT NULL` (authentication) but **never verifies admin role**. Any authenticated user could delete any other investor's entire data history. Also callable by `anon` if a `p_admin_id` is supplied.

**Impact:** Complete data destruction of any investor account.

**Fix:** Add `is_admin()` check + REVOKE EXECUTE from `anon`.

### P0-C: CRITICAL — 200+ functions callable by `anon` role

The entire `public` schema function catalog is EXECUTEable by the `anon` role. This includes mutation RPCs like `apply_segmented_yield_distribution_v5`, `reset_platform_data`, `approve_withdrawal`, `void_yield_distribution`, etc. While many have internal `is_admin()` guards, the attack surface is unnecessarily wide.

**Fix:** Bulk REVOKE EXECUTE ON ALL FUNCTIONS from `anon`, then selectively GRANT back only the functions that legitimately need anon access (e.g., `create_profile_on_signup`, `assign_default_user_role`).

### P1-A: HIGH — `create_daily_position_snapshot` has dead SQL injection code

The function builds `v_fund_filter` via string concatenation (`' AND ip.fund_id = ''' || p_fund_id::text || ''''`) but **never uses it** — the actual query uses parameterized `(p_fund_id IS NULL OR ip.fund_id = p_fund_id)`. The dead concatenation code is harmless but misleading and should be removed.

### P1-B: HIGH — 13 functions reference `profiles.is_admin` column

Despite the migration that was supposed to fix this, the following functions still read `profiles.is_admin` in their body. Most use it for **data filtering** (not auth), but it creates coupling to a deprecated column:

- `create_profile_on_signup` — sets `is_admin = FALSE` (harmless, but references deprecated column)
- `apply_segmented_yield_distribution` (old v4) — uses `p.is_admin = false` to filter investors
- `approve_and_complete_withdrawal` — uses `p.is_admin` somewhere in body  
- `audit_leakage_report` — references in investor filtering
- `get_active_funds_summary` — filters by `p.account_type` (safe)
- `get_fund_composition` — filters by account_type (safe)
- `dispatch_report_delivery_run`, `export_investor_data`, `queue_statement_deliveries` — investor filtering
- `void_completed_withdrawal` — uses `is_system_account` not `is_admin` for fees lookup (safe)
- `run_v6_void_simulation` — test harness

### P2: MEDIUM — `create_daily_position_snapshot` has no admin check

Any authenticated user can trigger snapshot creation, which writes to `investor_position_snapshots`. Low risk since it only captures current state, but it should be admin-only.

### P3: LOW — `sync_profile_role_from_roles` still passes `p.is_admin` to `compute_profile_role`

The role sync trigger reads `profiles.is_admin` to compute a display role. This is the bidirectional sync — it's by design, but creates ongoing dependency on the deprecated column.

---

## Remediation Plan

### Migration 1: Critical Security (P0-A, P0-B, P0-C)

1. Add `IF NOT public.is_admin() THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;` to:
   - `apply_backfill_yield`
   - `force_delete_investor`
   - `create_daily_position_snapshot`
   - `crystallize_yield_before_flow`

2. Bulk REVOKE EXECUTE from `anon` on ALL public functions, then GRANT back only:
   - `create_profile_on_signup`, `assign_default_user_role` (signup triggers)
   - `can_insert_notification`, `can_access_notification` (RLS helpers)
   - `is_admin`, `check_is_admin`, `is_admin_safe`, `is_admin_for_jwt` (RLS helpers)
   - `compute_profile_role`, `check_email_uniqueness`, `check_duplicate_profile` (trigger helpers)
   - `get_system_mode` (public config)
   - Utility/pure functions (e.g., `build_error_response`, `build_success_response`)

3. REVOKE EXECUTE from `public` on critical mutation functions to close the default PUBLIC grant.

### Migration 2: Code Cleanup (P1-A, P1-B)

1. Remove dead `v_fund_filter` concatenation from `create_daily_position_snapshot`
2. Replace `p.is_admin = false` filters in `apply_segmented_yield_distribution` (old v4) with `user_roles` join pattern

### Estimated Scope

| Item | Count |
|------|-------|
| Functions needing admin check added | 4 |
| REVOKE statements | ~200 (bulk) |
| Selective GRANT-back | ~15 functions |
| Dead code removal | 1 function |
| `profiles.is_admin` filter patches | 2-3 functions |

### Risk

- **P0 fixes (REVOKE + admin checks):** Critical priority, low regression risk — strictly tightening permissions
- **Bulk REVOKE from anon:** Must whitelist trigger/RLS helper functions carefully to avoid breaking signup and auth flows
- **P1 patches:** Low risk, cosmetic improvements

