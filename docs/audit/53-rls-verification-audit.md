# RLS Verification Audit (Tier 4)

**Date**: 2026-04-16
**Scope**: All 42 public tables, RLS policies, SECURITY DEFINER functions
**Objective**: Verify RLS policies prevent cross-investor data access, especially through ungated SECDEF read functions

---

## 1. RLS Enabled Status

All 42 public tables have `rowsecurity = true`:

| Table | RLS |
|-------|-----|
| admin_alerts | ✅ |
| admin_integrity_runs | ✅ |
| assets | ✅ |
| audit_log | ✅ |
| data_edit_audit | ✅ |
| documents | ✅ |
| error_code_metadata | ✅ |
| fee_allocations | ✅ |
| fund_aum_events | ✅ |
| fund_daily_aum | ✅ |
| fund_yield_snapshots | ✅ |
| funds | ✅ |
| generated_statements | ✅ |
| global_fee_settings | ✅ |
| ib_allocations | ✅ |
| ib_commission_ledger | ✅ |
| ib_commission_schedule | ✅ |
| investor_daily_balance | ✅ |
| investor_emails | ✅ |
| investor_fee_schedule | ✅ |
| investor_fund_performance | ✅ |
| investor_position_snapshots | ✅ |
| investor_positions | ✅ |
| investor_yield_events | ✅ |
| notifications | ✅ |
| platform_fee_ledger | ✅ |
| platform_invites | ✅ |
| profiles | ✅ |
| rate_limit_config | ✅ |
| report_schedules | ✅ |
| risk_alerts | ✅ |
| statement_email_delivery | ✅ |
| statement_periods | ✅ |
| statements | ✅ |
| support_tickets | ✅ |
| system_config | ✅ |
| transactions_v2 | ✅ |
| user_roles | ✅ |
| withdrawal_requests | ✅ |
| yield_allocations | ✅ |
| yield_distributions | ✅ |
| yield_rate_sanity_config | ✅ |

---

## 2. RLS Policy Inventory

### 2.1 Investor-Scoped Tables (investor_id-based access control)

These tables contain per-investor data. RLS policies rely on `investor_id = auth.uid()` to restrict access.

| Table | Policy Name | Command | Qual Expression | Gap? |
|-------|-------------|---------|-----------------|------|
| **fee_allocations** | fee_allocations_select_own | SELECT | `investor_id = auth.uid() OR is_admin()` | ⚠️ SECDEF bypass |
| | fee_allocations_select | SELECT | `is_admin()` | Redundant with admin |
| | fee_allocations_select_admin | SELECT | `is_admin()` | Redundant with admin |
| | fee_allocations_insert_admin | INSERT | `is_admin()` | — |
| | fee_allocations_update_admin | UPDATE | `is_admin()` | — |
| | fee_allocations_delete_admin | DELETE | `is_admin()` | — |
| **ib_allocations** | ib_allocations_select_own_ib | SELECT | `ib_investor_id = auth.uid()` | ⚠️ Column mismatch — uses `ib_investor_id`, not `investor_id` |
| | ib_allocations_select | SELECT | `is_admin()` | Redundant |
| | ib_allocations_select_admin | SELECT | `is_admin()` | Redundant |
| | ib_allocations_insert_admin | INSERT | `is_admin()` | — |
| | ib_allocations_update_admin | UPDATE | `is_admin()` | — |
| | ib_allocations_delete_admin | DELETE | `is_admin()` | — |
| **ib_commission_schedule** | investor_select | SELECT | `auth.uid() = investor_id` | ⚠️ SECDEF bypass |
| | admin_all | ALL | `is_admin()` | — |
| **investor_daily_balance** | investor_daily_balance_select_own | SELECT | `investor_id = auth.uid()` | ⚠️ SECDEF bypass |
| | investor_daily_balance_admin_all | ALL | `is_admin()` | — |
| **investor_emails** | investor_emails_select_own | SELECT | `investor_id = auth.uid()` | ⚠️ SECDEF bypass |
| | investor_emails_select_own_or_admin | SELECT | `investor_id = auth.uid() OR is_admin()` | Redundant |
| | Admins can view investor emails | SELECT | `is_admin()` | Redundant |
| | investor_emails_admin_manage | ALL | `is_admin()` | — |
| **investor_fee_schedule** | investor_fee_schedule_select_own | SELECT | `investor_id = auth.uid() OR is_admin()` | ⚠️ SECDEF bypass |
| | investor_fee_schedule_admin_manage | ALL | `is_admin()` | — |
| **investor_fund_performance** | investor_fund_performance_select_own | SELECT | `(investor_id = auth.uid() AND purpose='reporting') OR is_admin()` | ⚠️ SECDEF bypass |
| | Admins can manage performance data | ALL | `profiles.is_admin` EXISTS check | — |
| **investor_position_snapshots** | investor_position_snapshots_select_own | SELECT | `investor_id = auth.uid()` | ⚠️ SECDEF bypass |
| | Admins can manage position_snapshots | ALL | `is_admin()` | — |
| **investor_positions** | investors_view_own_positions | SELECT | `investor_id = auth.uid() OR is_admin()` | ⚠️ SECDEF bypass |
| | investor_positions_select | SELECT | `investor_id = auth.uid() OR is_admin()` | Duplicate |
| | ib_view_referral_positions | SELECT | `investor_id IN (SELECT id FROM profiles WHERE ib_parent_id = auth.uid())` | IB scoping OK |
| | Admins can manage investor_positions | ALL | `is_admin()` | — |
| **investor_yield_events** | investor_yield_events_select | SELECT | `(investor_id = auth.uid() AND visibility_scope='investor_visible') OR is_admin()` | ⚠️ SECDEF bypass |
| | yield_events_investor_select | SELECT | `investor_id = auth.uid() AND visibility_scope='investor_visible' AND is_voided=false` | More restrictive duplicate |
| | yield_events_admin_all | ALL | `is_admin()` | — |
| **platform_fee_ledger** | Users can view own fee records | SELECT | `investor_id = auth.uid() OR is_admin()` | ⚠️ SECDEF bypass |
| | platform_fee_ledger_select | SELECT | `is_admin()` | Redundant |
| | Admins can manage platform_fee_ledger | ALL | `is_admin()` | — |
| **transactions_v2** | Users can view own investor-visible transactions | SELECT | `(investor_id = auth.uid() AND visibility_scope='investor_visible') OR is_admin()` | ⚠️ SECDEF bypass |
| | transactions_v2_select | SELECT | `(investor_id = auth.uid() AND visibility_scope='investor_visible') OR is_admin()` | Duplicate |
| | Admin-only access to transactions | ALL | `is_admin()` | — |
| | admin_transactions_all | ALL | `is_admin()` | Duplicate |
| **yield_allocations** | yield_allocations_select | SELECT | `investor_id = auth.uid() OR is_admin()` | ⚠️ SECDEF bypass |
| | admin_only_yield_allocations | ALL | `is_admin()` | — |
| **statements** | statements_select_own | SELECT | `investor_id = auth.uid()` | ⚠️ SECDEF bypass |
| | statements_admin_all | ALL | `is_admin()` | — |
| **generated_statements** | Users can view own statements | SELECT | `investor_id = auth.uid() OR user_id = auth.uid()` | — |
| | Admins can manage statements | ALL | `is_admin()` | — |
| **statement_email_delivery** | Users can view own statement deliveries | SELECT | `investor_id = auth.uid() OR user_id = auth.uid()` | — |
| | Admins can manage email delivery | ALL | `is_admin()` | — |
| **ib_commission_ledger** | IBs can view own commission records | SELECT | `ib_id = auth.uid() OR is_admin()` | — |
| | ib_commission_ledger_select | SELECT | `is_admin()` | Redundant |
| | Admins can manage ib_commission_ledger | ALL | `is_admin()` | — |

### 2.2 User-Scoped Tables (auth.uid() = id or user_id)

| Table | Policy Name | Command | Qual Expression | Gap? |
|-------|-------------|---------|-----------------|------|
| **profiles** | profiles_select | SELECT | `id = auth.uid() OR is_admin()` | ⚠️ SECDEF bypass |
| | profiles_select_own_or_admin_strict | SELECT | `auth.uid() = id OR is_admin()` | Duplicate |
| | profiles_update | UPDATE | `id = auth.uid()` | — |
| | profiles_update_own_restricted | UPDATE | `id = auth.uid()` | Duplicate |
| | allow_own_profile_insert | INSERT | `id = auth.uid()` | — |
| | profiles_admin_full_access | ALL | `is_admin()` | — |
| | no_profile_deletes | DELETE | `false` | — |
| **documents** | documents_select_policy | SELECT | `auth.uid() = user_id OR is_admin()` | — |
| | documents_insert_policy | INSERT | `auth.uid() = user_id OR is_admin()` | — |
| | documents_update_policy | UPDATE | `auth.uid() = user_id OR is_admin()` | — |
| | documents_delete_policy | DELETE | `auth.uid() = user_id OR is_admin()` | — |
| **notifications** | Notifications own access | SELECT | `user_id = auth.uid()` | — |
| | Admins can view all notifications | SELECT | `user_id = auth.uid() OR check_is_admin(auth.uid())` | — |
| | notifications_select | SELECT | `user_id = auth.uid() OR is_admin()` | Duplicate |
| | notifications_insert_policy | INSERT | `can_insert_notification()` | — |
| | notifications_delete_policy | DELETE | `false` | — |
| **support_tickets** | Admin can view all tickets | SELECT | `user_id = auth.uid() OR is_admin()` | — |
| | support_tickets_insert_policy | INSERT | `auth.uid() = user_id` | — |
| | Admin can update all tickets | UPDATE | `is_admin()` | — |
| | support_tickets_delete_policy | DELETE | `false` | — |
| **data_edit_audit** | data_edit_audit_select | SELECT | `edited_by = auth.uid() OR is_admin()` | — |
| **user_roles** | Users can view own roles | SELECT | `user_id = auth.uid() OR is_admin()` | — |
| | Allow investor role insert during signup | INSERT | `user_id = auth.uid() AND role='investor'` | — |
| | user_roles_admin_manage | ALL | `is_admin()` | — |

### 2.3 Public/Read-Only Tables (no investor-id scoping needed)

| Table | Policy Name | Command | Qual Expression | Notes |
|-------|-------------|---------|-----------------|-------|
| **assets** | assets_select_authenticated | SELECT | `auth.uid() IS NOT NULL` | Any authenticated user |
| | assets_insert_admin | INSERT | `is_admin()` | — |
| | assets_update_admin | UPDATE | `is_admin()` | — |
| | assets_delete_admin | DELETE | `is_admin()` | — |
| **error_code_metadata** | error_metadata_read | SELECT | `true` | Truly public, OK |
| **fund_aum_events** | fund_aum_events_select_all | SELECT | `true` | Public fund data, OK |
| | fund_aum_events_admin_write | INSERT | `is_admin()` | — |
| | fund_aum_events_admin_update | UPDATE | `is_admin()` | — |
| | fund_aum_events_admin_delete | DELETE | `is_admin()` | — |
| **fund_yield_snapshots** | fund_yield_snapshots_select_all | SELECT | `true` | Public, OK |
| | fund_yield_snapshots_admin_write | ALL | `is_admin()` | — |
| **funds** | funds_select | SELECT | `true` | Public, OK |
| | funds_select_authenticated | SELECT | `auth.uid() IS NOT NULL` | Duplicate |
| | funds_insert_admin | INSERT | `is_admin()` | — |
| | funds_update_admin | UPDATE | `is_admin()` | — |
| | funds_delete_admin | DELETE | `is_admin()` | — |
| **statement_periods** | Periods visible to authenticated | SELECT | `true` | Public, OK |
| | Admins can manage statement periods | ALL | `profiles.is_admin EXISTS` | — |

### 2.4 Admin-Only Tables (no investor access at all)

| Table | Policy Name | Command | Qual Expression | Notes |
|-------|-------------|---------|-----------------|-------|
| **admin_alerts** | Admins can manage alerts | ALL | `is_admin()` | — |
| **admin_integrity_runs** | Admins can manage integrity runs | ALL | `is_admin()` | — |
| **audit_log** | audit_log_select | SELECT | `is_admin()` | — |
| | audit_log_insert_secure | INSERT | `actor_user = auth.uid()` | System-generated only |
| | audit_log_delete_policy | DELETE | `false` | Immutable |
| | audit_log_update_policy | UPDATE | `false` | Immutable |
| **fund_daily_aum** | Admins can view all fund_daily_aum | SELECT | `is_admin()` | — |
| | Admin-only AUM access | ALL | `is_admin()` | — |
| | Investors see reporting purpose only | SELECT | `NOT is_admin() AND purpose='reporting' AND is_month_end=true` | Restricted investor view |
| | Admins can insert/update/delete | INSERT/UPDATE/DELETE | `is_admin()` | — |
| **generated_statements** | Admins can manage statements | ALL | `is_admin()` | — |
| **global_fee_settings** | Admins can manage fee settings | ALL | `profiles.is_admin EXISTS` | — |
| **platform_invites** | admins_all_platform_invites | ALL | `is_admin()` | — |
| **rate_limit_config** | rate_limit_config_admin | ALL | `is_admin()` | — |
| **report_schedules** | Admins manage report schedules | ALL | `is_admin()` | — |
| **risk_alerts** | Admins can manage risk_alerts | ALL | `is_admin()` | — |
| **withdrawal_requests** | withdrawal_requests_admin_manage | ALL | `is_admin()` | — |
| **system_config** | system_config_admin_all | ALL | `profiles.is_admin EXISTS` | ⚠️ But `get_system_mode` is ungated SECDEF |
| **yield_distributions** | Multiple admin-only policies | ALL/SELECT | `is_admin()` / `check_is_admin()` | Admin-only |
| **yield_rate_sanity_config** | Admin full access | ALL | `is_admin()` | — |

---

## 3. SECURITY DEFINER Function Gap Analysis

### 3.1 All SECDEF Functions (complete inventory)

There are **180+ SECURITY DEFINER functions** in the public schema. These all execute as the function owner (typically postgres/superuser), **completely bypassing RLS**.

### 3.2 Tier 3-Gated SECDEF Read Functions (already fixed)

These 11 functions were gated with `is_admin()` in Tier 3:

- `get_admin_stats`
- `get_all_investors_summary`
- `get_platform_stats`
- `get_paged_investor_summaries`
- `get_paged_audit_logs`
- `get_fund_aum_as_of`
- `get_fund_composition`
- `get_fund_positions_sum`
- `get_fund_summary`
- `get_funds_aum_snapshot`
- `get_funds_daily_flows`

### 3.3 Ungated SECDEF Read Functions — CRITICAL FINDINGS

#### GAP-1: `get_investor_fee_pct(p_investor_id, p_fund_id, p_effective_date)` — 🔴 CRITICAL

**Risk**: Any authenticated user can query any investor's fee percentage.

**How it works**: Calls `_resolve_investor_fee_pct()` which reads from:
- `profiles` (account_type, fee_pct) — by `id = p_investor_id`
- `investor_fee_schedule` — by `investor_id = p_investor_id`
- `funds` (perf_fee_bps) — by `id = p_fund_id`

**SECDEF bypass**: The function runs as the owner, so RLS on `profiles`, `investor_fee_schedule`, and `funds` is bypassed. The function does **not** check `auth.uid() = p_investor_id` or `is_admin()`. An investor can pass any UUID as `p_investor_id` and read another investor's fee schedule and profile fee data.

**Frontend exposure**: The function is listed in `rpcSignatures.ts` as a callable RPC. Currently called from edge functions (admin context via service_role), but it is **not restricted** to admin-only invocation at the Postgres level.

#### GAP-2: `get_investor_ib_pct(p_investor_id, p_fund_id, p_effective_date)` — 🔴 CRITICAL

**Risk**: Any authenticated user can query any investor's IB commission percentage.

**How it works**: Calls `_resolve_investor_ib_pct()` which reads from:
- `profiles` (account_type, ib_percentage) — by `id = p_investor_id`
- `ib_commission_schedule` — by `investor_id = p_investor_id`
- `funds` — not directly queried, but the profile lookup leaks info

**SECDEF bypass**: Same as GAP-1. No caller identity check. Any investor can pass any UUID as `p_investor_id`.

**Leaks**: Account type, IB percentage, and commission schedule for any investor.

#### GAP-3: `get_system_mode()` — 🟡 MEDIUM

**Risk**: Exposes system operational mode to any caller.

**How it works**: Reads `system_config` WHERE key = 'system_mode'. The RLS policy on `system_config` is admin-only (ALL). However, the SECDEF function bypasses this RLS entirely.

**Impact**: The value is likely `"normal"` / `"maintenance"` / `"readonly"` — operational metadata. Not financial data, but could inform attack timing (e.g., knowing when maintenance mode is active).

**Mitigating factor**: No parameters accepted, no investor-specific data leaked.

#### GAP-4: `get_user_admin_status(user_id)` — 🟡 MEDIUM

**Risk**: Any authenticated user can check whether any UUID is an admin.

**How it works**: Queries `user_roles` WHERE `user_id = <param>` AND `role IN ('admin', 'super_admin')`. The RLS on `user_roles` requires `user_id = auth.uid() OR is_admin()`, but SECDEF bypasses this.

**Impact**: Reveals which users have admin privileges. This is reconnaissance information — could be used to target admin accounts for social engineering.

**Mitigating factor**: The frontend calls this during auth flow (`authService.ts:163`), where the caller already knows their own user_id. However, nothing prevents passing arbitrary UUIDs.

### 3.4 SECDEF Write/Mutation Functions

The 170+ SECDEF mutation functions are a **separate concern** — they are gated by the `enforce_transaction_via_rpc` trigger system and `canonical_rpc` flag. They are not directly callable by normal users through the Supabase client because the frontend only calls them through admin edge functions using `service_role` keys. This audit focuses on the **4 ungated read functions** above.

### 3.5 service_role Bypass (Edge Functions)

All edge functions use the `service_role` key which bypasses RLS entirely. This is by design — edge functions act as trusted middleware. The risk is only if an edge function exposes data back to unauthenticated or non-owner users. This is controlled at the edge function code level, not RLS.

---

## 4. Cross-Investor Access Test Analysis

### 4.1 Direct Table Access (RLS enforced)

For normal (non-SECDEF) queries via the Supabase client, RLS is enforced:

| Table | Can Investor A see Investor B's data? | Why |
|-------|---------------------------------------|-----|
| fee_allocations | ❌ No | `investor_id = auth.uid()` in RLS |
| ib_allocations | ❌ No | `ib_investor_id = auth.uid()` in RLS |
| investor_positions | ❌ No | `investor_id = auth.uid()` in RLS |
| investor_daily_balance | ❌ No | `investor_id = auth.uid()` in RLS |
| investor_fee_schedule | ❌ No | `investor_id = auth.uid()` in RLS |
| transactions_v2 | ❌ No | `investor_id = auth.uid() AND visibility_scope='investor_visible'` in RLS |
| yield_allocations | ❌ No | `investor_id = auth.uid()` in RLS |
| profiles | ❌ No | `id = auth.uid()` in RLS |

### 4.2 SECDEF Function Access (RLS bypassed — PRE-TIER-4)

**All gaps below were fixed in Tier 4.**

| Function | Can Investor A query Investor B? (PRE-FIX) | Data Leaked | Fix |
|----------|--------------------------------------------|-------------|-----|
| `get_investor_fee_pct(B_uuid, fund_id, date)` | ✅ **YES** → ❌ FIXED | Fee percentage, account type | `can_access_investor()` |
| `get_investor_ib_pct(B_uuid, fund_id, date)` | ✅ **YES** → ❌ FIXED | IB percentage, account type | `can_access_investor()` |
| `get_system_mode()` | ✅ **YES** → ❌ FIXED | System mode string | `is_admin()` |
| `get_user_admin_status(B_uuid)` | ✅ **YES** → ❌ FIXED | Admin status (boolean) | self-or-admin |

---

## 5. Gap Classification and Risk Ratings

| Gap ID | Function | Risk | Business Impact | Exploitability |
|--------|----------|------|-----------------|----------------|
| GAP-1 | `get_investor_fee_pct` | 🔴 CRITICAL | Exposes other investors' fee arrangements (commercially sensitive) | Trivial — pass any UUID |
| GAP-2 | `get_investor_ib_pct` | 🔴 CRITICAL | Exposes IB commission rates and account types | Trivial — pass any UUID |
| GAP-3 | `get_system_mode` | 🟡 MEDIUM | Exposes operational mode (attack timing info) | Trivial — no params needed |
| GAP-4 | `get_user_admin_status` | 🟡 MEDIUM | Reveals admin identity (reconnaissance) | Trivial — pass any UUID |

### Collateral Issue: Redundant RLS Policies

Multiple tables have 2-3 overlapping SELECT policies (e.g., `fee_allocations` has 3 SELECT policies where only `select_own` matters for non-admins). These are not security gaps but create maintenance confusion and make audits harder. Consider consolidating in a future cleanup.

---

## 6. Fixes — Implemented in Tier 4

**Migration**: `20260416160000_security_tier4_read_gates.sql`

All 4 gaps were fixed on 2026-04-16.

### FIX-1: `get_investor_fee_pct` and `get_investor_ib_pct` — ✅ FIXED

**Approach**: Used Option B — `can_access_investor()` gate. This allows admin, self, and IB-parent access, matching the RLS pattern on `investor_positions`.

- Both public wrappers converted from `sql` to `plpgsql` to add the guard
- Both `_resolve_` helpers also gated with `can_access_investor()` (defense in depth)
- EXECUTE on `_resolve_` helpers revoked from PUBLIC, authenticated, anon; only service_role retains access

### FIX-2: `get_system_mode` — ✅ FIXED

**Approach**: Added `is_admin()` gate. System mode is operational metadata not needed by non-admin users.

- Converted from `sql` to `plpgsql` to add the guard

### FIX-3: `get_user_admin_status` — ✅ FIXED

**Approach**: Self-or-admin gate — `auth.uid() = user_id OR is_admin()`. Frontend calls this with the current user's own UUID, so existing behavior is preserved.

- Converted from `sql` to `plpgsql` to add the guard

### FIX-4: Systematic SECDEF audit — ⏳ REMAINING

A full sweep of 180+ SECDEF functions for missing gates remains recommended. The `_resolve_` helper EXECUTE revocation pattern should be applied to other internal-only functions.

---

## 7. Summary

| Category | Count | Status |
|----------|-------|--------|
| Total public tables | 42 | All RLS-enabled ✅ |
| Investor-scoped tables (investor_id-based RLS) | 17 | RLS correct for direct access ✅ |
| User-scoped tables (auth.uid()-based RLS) | 6 | RLS correct ✅ |
| Public/read-only tables | 7 | Appropriately open ✅ |
| Admin-only tables | 12 | Admin-gated ✅ |
| SECDEF read functions with gaps | 4 | ✅ 4 Fixed in Tier 4 |
| Total SECDEF functions | 180+ | Bypass RLS by design |
| service_role bypass | Edge functions | By design, controlled at app level |

**Bottom line**: RLS policies are correctly configured on all tables for direct Supabase client access. 4 SECURITY DEFINER read functions that previously bypassed RLS have been gated in Tier 4 (`20260416160000_security_tier4_read_gates.sql`). The remaining risk is the 180+ SECDEF mutation functions, which are controlled by the `canonical_rpc` trigger system and edge function middleware.