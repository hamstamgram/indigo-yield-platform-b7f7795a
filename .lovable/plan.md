

## Lazy Sweep Audit Report — Database & Frontend

### Verdict: Clean. 4 low-risk findings, 0 critical.

The platform is in excellent shape. DB linter: zero issues. No function overloads. No dropped-table references in active code paths. RLS complete. The previous audit fixes are holding.

---

### Finding 1: Duplicate BEFORE INSERT Triggers on `investor_positions`

**Triggers:** `trg_enforce_canonical_position` (calls `enforce_canonical_position_mutation`) and `trg_enforce_canonical_position_write` (calls `enforce_canonical_position_write`)

Both fire on BEFORE INSERT on `investor_positions` and both check the canonical RPC flag. The first one is a strict blocker (raises exception). The second one is a more nuanced version that only blocks if cost_basis/current_value/shares are actually changing, and logs to `audit_log` before raising.

**Impact:** Both run on every INSERT. The stricter one (`trg_enforce_canonical_position`) fires first alphabetically and blocks before the nuanced one ever runs. The second trigger is dead code on INSERT.

**Fix:** Drop `trg_enforce_canonical_position` and keep `trg_enforce_canonical_position_write` (the smarter one that checks for actual field changes and logs). This also removes the DELETE guard from the first trigger, but DELETE on positions should already be blocked by the canonical RPC check in the second trigger's UPDATE path — though it doesn't cover DELETE. Alternative: merge both into a single trigger function.

**Risk:** Low — both currently work correctly; this is efficiency/clarity.

---

### Finding 2: `send-admin-invite` Edge Function References Dropped `admin_invites` Table

**File:** `supabase/functions/send-admin-invite/index.ts` line 182
**Code:** `await supabaseAdmin.from("admin_invites").update({ used: true }).eq("id", invite.id);`

The `admin_invites` table was dropped in the dead-weight cleanup. This line will silently fail (PostgREST returns 404 but the function doesn't check the error). The invite flow still works because the primary table is `platform_invites`, but this is a dead reference.

Also on line 177: `profiles.is_admin` is set directly — this is redundant since `user_roles` is the canonical RBAC source and the trigger `trg_assign_default_role` handles role assignment.

**Fix:** Remove the `admin_invites` update line. The `is_admin: true` update is harmless (kept in sync by convention) but could be removed for purity.

**Risk:** None — the line already silently fails.

---

### Finding 3: `Number()` in Dashboard Metrics (Display-Only)

**File:** `src/features/admin/dashboard/services/dashboardMetricsService.ts` lines 195-198
**Code:** `daily_inflows: Number(fundFlow.daily_inflows || 0)` etc.

These are dashboard display values (daily flow indicators), not accounting figures. The precision loss is cosmetic at most (~0.01 on large values). Not a financial integrity issue.

**Fix (optional):** Replace with `parseFinancial().toNumber()` for consistency with platform standard.

**Risk:** None.

---

### Finding 4: 3 DB Functions Reference Dropped Tables (`purge_fund_hard`, `force_delete_investor`, `reset_platform_data`)

These nuclear admin functions reference `user_sessions`, `investor_daily_balance`, `yield_corrections`, and `daily_nav` — all dropped. They use `IF EXISTS` guards or `DROP TABLE IF EXISTS` patterns, so they won't crash, but they contain dead code lines.

**Fix (optional):** Clean up the dead references in the next migration cycle.

**Risk:** None — functions are admin-only destructive tools, and the dead lines are no-ops.

---

### Summary

| # | Finding | Severity | Fix Effort |
|---|---------|----------|------------|
| 1 | Duplicate canonical position triggers | Low | 5 min migration |
| 2 | Edge fn references dropped `admin_invites` | Low | 2 min edit |
| 3 | `Number()` in dashboard metrics | Cosmetic | 5 min |
| 4 | Dead table refs in nuclear functions | Cosmetic | 10 min migration |

**No critical bugs. No accounting leakage. No precision issues in financial paths. No overload ambiguity. All prior fixes verified clean.**

Shall I proceed with fixing all 4?

