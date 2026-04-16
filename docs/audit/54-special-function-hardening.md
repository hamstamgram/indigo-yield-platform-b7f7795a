# Audit 54: Special Function Hardening Analysis + Frontend Route Protection Audit

**Date**: 2026-04-16
**Scope**: `get_system_mode()` and `get_user_admin_status()` security posture; admin frontend route guard inventory
**Status**: READ-ONLY analysis — no code changes

---

## Part A: `get_system_mode()` Analysis

### Function Definition

```sql
CREATE OR REPLACE FUNCTION public.get_system_mode()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT value::text FROM system_config WHERE key = 'system_mode';
$function$
```

### Key Properties

| Property | Value |
|----------|-------|
| Language | SQL (not plpgsql) |
| Security | SECURITY DEFINER — runs as postgres, bypasses RLS |
| Volatility | STABLE |
| Returns | Text (single row from `system_config`) |
| Admin gate | **None** — no `is_admin()` check |
| GRANTs | `anon`, `authenticated`, `service_role`, `PUBLIC` |

### What It Returns

Queries `system_config` table for `key = 'system_mode'`. As of audit date, the `system_config` table is **empty** — no `system_mode` row exists. The function returns NULL when no row is found.

Historical migration evidence (squash baseline) shows the function is used in triggers to check `get_system_mode() = '"live"'`, suggesting possible values: `"live"`, `"maintenance"`, `"readonly"`, or NULL (no row).

### Exploitation Assessment

**Could a non-admin user exploit knowing the system mode?**

| Scenario | Risk |
|----------|------|
| Mode = `"live"` | No direct exploit. Triggers use this to enforce period locks — knowing "live" vs "maintenance" doesn't help circumvent server-side controls. |
| Mode = `"maintenance"` or `"readonly"` | **Informational advantage only**. A user learns the system is in a special state but cannot modify it or bypass trigger-level enforcement (triggers run server-side regardless). |
| Mode = NULL (current state) | Function returns NULL — no information disclosed. |

### Frontend Usage

**`get_system_mode` is NOT called from any frontend source file.** It appears only in:
- Generated types (`types.ts`, `rpcSignatures.ts`) — type definitions only
- Migration SQL and archived migrations (trigger logic)
- Edge function type definitions (`database.types.ts`)

The function is exclusively used internally by database triggers (`enforce_transaction_via_rpc`, `enforce_period_lock_on_events`) to gate mutations when the system is in "live" mode.

### Recommendation: **Leave ungated** (LOW RISK)

Rationale:
1. Returns non-sensitive operational state (`"live"`, `"maintenance"`, etc.)
2. No frontend usage — adding admin gate would only affect internal trigger calls
3. Currently returns NULL (table empty) — no data disclosed
4. Even if populated, the value is low-sensitivity operational metadata
5. **Adding an `is_admin()` gate would BREAK trigger logic** — triggers call this function during mutation processing, and the triggering user may not be an admin (e.g., investor deposit triggers check system mode)

**Optional hardening**: Create a `get_system_mode_public()` that returns a safe subset (e.g., `"maintenance"` vs `"normal"`) while keeping `get_system_mode()` as the internal function. However, since there's no frontend call, this is unnecessary.

**Risk Rating**: LOW

---

## Part B: `get_user_admin_status(user_id)` Analysis

### Function Definition

```sql
CREATE OR REPLACE FUNCTION public.get_user_admin_status(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = get_user_admin_status.user_id
    AND role IN ('admin', 'super_admin')
  )
$function$
```

### Key Properties

| Property | Value |
|----------|-------|
| Language | SQL |
| Security | SECURITY DEFINER — runs as postgres, bypasses RLS |
| Volatility | STABLE |
| Returns | Boolean (admin/super_admin membership) |
| Admin gate | **None** — no `is_admin()` check |
| GRANTs | `anon`, `authenticated`, `service_role`, `PUBLIC` |
| Parameters | `user_id uuid` — **any** UUID, not restricted to `auth.uid()` |

### Can One User Check Another User's Admin Status?

**YES.** The function accepts an arbitrary `user_id` parameter with no restriction that it must be `auth.uid()`. Any authenticated user (or even anonymous user) can:

1. Enumerate user IDs and probe admin membership
2. Determine which users are admins or super admins
3. Build a map of admin identities

### Frontend Usage

The function is called in two patterns:

**Pattern 1: Login flow — checking own status** (acceptable)
- `authService.ts:162` — `getUserAdminStatus(userId)` — used during sign-in to determine redirect
- `useAuthFlow.ts:31` — calls after sign-in to route admin → `/admin`, investor → `/investor`
- `useAuthMutations.ts:40` — same login redirect logic

**Pattern 2: SuperAdminGuard — checking another user's status**
- `SuperAdminGuard.tsx:20` — `useSuperAdminCheck(user?.id)` — calls a separate function but the pattern exists

### Information Disclosure Risk

| Factor | Assessment |
|--------|------------|
| Can reveal who is an admin? | **YES** — any user_id can be probed |
| Is admin identity sensitive? | **MODERATE** — knowing who has admin access aids social engineering / targeted phishing |
| Can this be obtained elsewhere? | **PARTIALLY** — `user_roles` table has RLS; direct `SELECT FROM user_roles` is protected, but this function bypasses RLS via SECURITY DEFINER |
| Anonymous access? | **YES** — `anon` role has EXECUTE grant |

### Recommendation: **Add `auth.uid()` restriction** (MEDIUM RISK)

The function should restrict usage to checking the caller's own status. Two options:

**Option A (Preferred)**: Add `auth.uid()` guard — only allow users to check their own status:
```sql
CREATE OR REPLACE FUNCTION public.get_user_admin_status(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF user_id != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: can only check own admin status';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = get_user_admin_status.user_id
    AND role IN ('admin', 'super_admin')
  );
END;
$function$;
```

**Option B**: Revoke `anon` grant — require authentication at minimum (partial mitigation).

**Option C**: Replace with `is_current_user_admin()` — no parameter, always checks `auth.uid()` (cleanest but requires frontend changes).

**Risk Rating**: MEDIUM — admin identity disclosure enables targeted attacks

---

## Part C: Frontend Route Protection Audit

### Guarding Infrastructure

| Guard | File | Mechanism |
|-------|------|-----------|
| `AdminRoute` | `src/routing/AdminRoute.tsx` | Double-check: `useAuth().isAdmin` OR `useUserRole().isAdmin`; 3s timeout; redirects to `/login` or `/investor` |
| `AdminGuard` | `src/features/admin/shared/AdminGuard.tsx` | Component-level: `useAuth().isAdmin` check; renders "Access Denied" for non-admins |
| `SuperAdminGuard` | `src/features/admin/shared/SuperAdminGuard.tsx` | Component-level: admin + `useSuperAdminCheck()`; 5s timeout; renders fallback |
| `ProtectedRoute` | `src/routing/ProtectedRoute.tsx` | Auth-only (no admin check); used for investor routes |

### Admin Route Inventory

All routes under `/admin/*`:

| Route | Guard | Element Type | Status |
|-------|-------|-------------|--------|
| `/admin` | `AdminRoute` | AdminDashboard | **PROTECTED** |
| `/admin/investors` | `AdminRoute` | UnifiedInvestorsPage | **PROTECTED** |
| `/admin/investors/:id` | `AdminRoute` | InvestorManagement | **PROTECTED** |
| `/admin/investors/new` | None (redirect) | Navigate → `/admin/investors` | **SAFE** (redirect to guarded route) |
| `/admin/investors/:id/edit` | None (redirect) | RedirectToInvestor | **SAFE** (redirect to guarded route) |
| `/admin/expert-investor/:id` | None (redirect) | RedirectToInvestor | **SAFE** (redirect to guarded route) |
| `/admin/ledger` | `AdminRoute` | LedgerPage | **PROTECTED** |
| `/admin/transactions/new` | `AdminRoute` | AdminManualTransaction | **PROTECTED** |
| `/admin/transactions` | None (redirect) | Navigate → `/admin/ledger` | **SAFE** (redirect to guarded route) |
| `/admin/withdrawals` | None (redirect) | Navigate → `/admin/ledger?tab=withdrawals` | **SAFE** (redirect to guarded route) |
| `/admin/revenue` | `AdminRoute` | RevenuePage | **PROTECTED** |
| `/admin/fees` | None (redirect) | Navigate → `/admin/revenue` | **SAFE** (redirect to guarded route) |
| `/admin/ib-management` | None (redirect) | Navigate → `/admin/revenue?tab=ib` | **SAFE** (redirect to guarded route) |
| `/admin/yield-history` | `AdminRoute` | YieldHistoryPage | **PROTECTED** |
| `/admin/reports` | `AdminRoute` | ReportsConsolidatedPage | **PROTECTED** |
| `/admin/operations` | `AdminRoute` | OperationsPage | **PROTECTED** |
| `/admin/settings` | `AdminRoute` | AdminSettingsPage | **PROTECTED** |
| `/admin/reports/historical` | None (redirect) | Navigate → `/admin/reports?tab=historical` | **SAFE** (redirect to guarded route) |
| `/admin/deposits` | None (redirect) | Navigate → `/admin/ledger` | **SAFE** (redirect to guarded route) |
| `/admin/funds` | None (redirect) | Navigate → `/admin` | **SAFE** (redirect to guarded route) |
| `/admin/yield` | None (redirect) | Navigate → `/admin/yield-history` | **SAFE** (redirect to guarded route) |
| `/admin/yield-distributions` | None (redirect) | Navigate → `/admin/yield-history` | **SAFE** (redirect to guarded route) |
| `/admin/recorded-yields` | None (redirect) | Navigate → `/admin/yield-history` | **SAFE** (redirect to guarded route) |
| `/admin/monthly-data-entry` | None (redirect) | Navigate → `/admin/yield-history` | **SAFE** (redirect to guarded route) |
| `/admin/yield-settings` | None (redirect) | Navigate → `/admin/yield-history` | **SAFE** (redirect to guarded route) |
| `/admin/yields` | None (redirect) | Navigate → `/admin/yield-history` | **SAFE** (redirect to guarded route) |
| `/admin/yield-operations` | None (redirect) | Navigate → `/admin/yield-history` | **SAFE** (redirect to guarded route) |
| `/admin/requests` | None (redirect) | Navigate → `/admin/ledger?tab=withdrawals` | **SAFE** (redirect to guarded route) |
| `/admin/investor-reports` | None (redirect) | Navigate → `/admin/reports` | **SAFE** (redirect to guarded route) |
| `/admin/statements` | None (redirect) | Navigate → `/admin/reports` | **SAFE** (redirect to guarded route) |
| `/admin/email-tracking` | None (redirect) | Navigate → `/admin/reports` | **SAFE** (redirect to guarded route) |
| `/admin/system-health` | None (redirect) | Navigate → `/admin/operations` | **SAFE** (redirect to guarded route) |
| `/admin/integrity` | None (redirect) | Navigate → `/admin/operations?tab=integrity` | **SAFE** (redirect to guarded route) |
| `/admin/crystallization` | None (redirect) | Navigate → `/admin/operations?tab=crystallization` | **SAFE** (redirect to guarded route) |
| `/admin/audit-logs` | None (redirect) | Navigate → `/admin/operations?tab=audit` | **SAFE** (redirect to guarded route) |
| `/admin/audit` | None (redirect) | Navigate → `/admin/operations?tab=audit` | **SAFE** (redirect to guarded route) |
| `/admin/settings/tools` | None (redirect) | Navigate → `/admin/settings` | **SAFE** (redirect to guarded route) |
| `/admin/settings/admins` | None (redirect) | Navigate → `/admin/settings` | **SAFE** (redirect to guarded route) |
| `/admin/settings/invites` | None (redirect) | Navigate → `/admin/settings` | **SAFE** (redirect to guarded route) |
| `/admin/users` | None (redirect) | Navigate → `/admin/settings` | **SAFE** (redirect to guarded route) |
| `/admin/settings/audit` | None (redirect) | Navigate → `/admin/operations?tab=audit` | **SAFE** (redirect to guarded route) |

### Non-Admin Public Routes (potential concern)

| Route | Guard | Risk |
|-------|-------|------|
| `/admin-invite` | `ProtectedRoute` (auth-only, no admin check) | **LOW** — invite acceptance page, not admin panel |
| `/admin-invite-callback` | `ProtectedRoute` (auth-only, no admin check) | **LOW** — OAuth callback for invite flow |

These are public invite acceptance endpoints, not admin management pages. The actual admin privilege assignment happens server-side via edge functions with admin checks.

### Defense-in-Depth Layers

1. **Route-level**: `AdminRoute` component wraps all content-rendering admin routes
2. **Component-level**: `AdminGuard` and `SuperAdminGuard` provide in-page guards (used by YieldDistributionsPage, UnifiedInvestorsPage, AdminTransactionsPage, FeesOverviewPage, YieldHistoryPage, AdminSettings)
3. **RPC-level**: All mutation RPCs require `is_admin()` server-side
4. **RLS**: All tables enforce row-level security
5. **Data-level**: Even if a non-admin navigates to `/admin/*`, they see no data (queries return empty or errors via RLS)

### Can a Non-Admin Navigate Directly to `/admin/*` URLs?

**No (effectively)**. The `AdminRoute` component:
- Checks `useAuth().isAdmin` (from profile) OR `useUserRole().isAdmin` (direct user_roles query)
- Non-admins are redirected to `/investor`
- Even if the redirect fails, RLS blocks all data access
- Even if data leaks, all mutation RPCs require `is_admin()`

### Audit Finding Summary

| Category | Finding | Severity |
|----------|---------|----------|
| Route protection gaps | **None found** — all admin routes with content are guarded by `AdminRoute` | — |
| Redirect-only routes without guard | **Acceptable** — all redirect to guarded destinations; no content rendered | — |
| Duplicate guards | Some pages use both `AdminRoute` + `AdminGuard` — defense-in-depth, not a bug | INFO |
| Public `admin-invite` routes | Auth-only, no admin check — correct for invite acceptance flow | LOW |

---

## Risk Summary & Recommendations

| Function | Current Risk | Recommendation | Priority |
|----------|-------------|----------------|----------|
| `get_system_mode()` | **LOW** | Leave ungated. No frontend usage. Internal trigger dependency makes gating dangerous. | — |
| `get_user_admin_status()` | **MEDIUM** | Add `auth.uid()` restriction (Option A) or replace with parameterless `is_current_user_admin()` (Option C). Revoke `anon` grant immediately. | HIGH |
| Frontend routes | **LOW** | All content-rendering admin routes are guarded. No gaps found. | — |

### Immediate Actions (No Code Changes Required)

1. **Revoke `anon` EXECUTE on `get_user_admin_status`** — prevents unauthenticated probing
2. Consider revoking `anon` EXECUTE on `get_system_mode` — defense-in-depth (no frontend usage by anon)

### Future Hardening (Requires Migration)

1. Convert `get_user_admin_status` to plpgsql with `auth.uid()` guard (Option A)
2. Or create `is_current_user_admin()` parameterless variant (Option C)
3. Remove `PUBLIC` grant from both functions (use explicit role grants instead)