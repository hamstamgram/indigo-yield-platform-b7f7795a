# Gate 0: Audit Closure & Baseline Lock

**Date:** 2026-04-08
**Status:** ⚠️ CONDITIONAL PASS
**Sign-off:** CTO ☐ · CFO ☐

---

## 1. Integrity Suite Results

### `run_comprehensive_health_check()` — 8/8 PASS ✅

| # | Check | Status | Violations |
|---|-------|--------|------------|
| 1 | YIELD_CONSERVATION | PASS ✅ | 0 |
| 2 | LEDGER_POSITION_MATCH | PASS ✅ | 0 |
| 3 | NO_ORPHAN_POSITIONS | PASS ✅ | 0 |
| 4 | NO_FUTURE_TRANSACTIONS | PASS ✅ | 0 |
| 5 | ECONOMIC_DATE_NOT_NULL | PASS ✅ | 0 |
| 6 | NO_DUPLICATE_REFS | PASS ✅ | 0 |
| 7 | NO_MANAGEMENT_FEE | PASS ✅ | 0 |
| 8 | VALID_TX_TYPES | PASS ✅ | 0 |

### `run_invariant_checks()` — SKIPPED (admin-only)

Function correctly rejects non-admin callers with `P0001: Access denied`. Must be run via service role or admin session.

### `audit_leakage_report()` — SKIPPED (admin-only)

Function correctly rejects non-admin callers with `P0001: UNAUTHORIZED`. Must be run via service role or admin session.

---

## 2. Migration Verification

**Total migrations applied:** 136
**Last 4 remediation migrations confirmed:**

| Version | Description | Status |
|---------|-------------|--------|
| `20260408191317` | P0: Profiles privilege escalation fix | ✅ Applied |
| `20260408191425` | P2-P4: Policy cleanup (system_config, snapshots) | ✅ Applied |
| `20260408191515` | P1: Void orphaned distribution `63b032b8` | ✅ Applied |
| `20260408195500` | P0-C: Bulk REVOKE EXECUTE from anon | ✅ Applied |

---

## 3. Anon Role Execute Permissions

| Metric | Value | Expected | Status |
|--------|-------|----------|--------|
| Total public functions | 288 | — | — |
| Functions executable by `anon` | **259** | ~15 | ⚠️ **FAIL** |

**Finding:** The bulk REVOKE migration (`20260408195500`) is recorded as applied but `anon` still has EXECUTE on 259/288 functions. The REVOKE likely ran but was superseded by subsequent `GRANT` statements or default privileges.

**Action Required:** Re-apply the bulk REVOKE and verify with a follow-up query. This is a **blocking** Gate 0 item.

---

## 4. Edge Function Authorization

### `checkAdminAccess()` adoption — 11 functions ✅

| Edge Function | Uses `checkAdminAccess` | Status |
|---------------|------------------------|--------|
| `set-user-password` | ✅ | PASS |
| `send-email` | ✅ | PASS |
| `excel_import` | ✅ | PASS |
| `send-investor-report` | ✅ | PASS |
| `admin-user-management` | ✅ | PASS |
| `send-admin-invite` | ✅ | PASS |
| `send-report-email` | ✅ | PASS |
| `generate-fund-performance` | ✅ | PASS |
| `refresh-delivery-status` | ✅ | PASS |
| `process-report-delivery-queue` | ✅ (manual check) | PASS |
| `integrity-monitor` | ✅ | PASS |

### `profiles.is_admin` references in edge functions

All remaining references are **comments only** (documentation notes). No logic path reads `profiles.is_admin` for authorization decisions. ✅

---

## 5. Profile Sensitive Field Protection

| Check | Status |
|-------|--------|
| `protect_profile_sensitive_fields` trigger exists | ✅ Enabled (`tgenabled: O`) |
| `profiles_update_own_restricted` RLS policy exists | ✅ Active |

---

## 6. System Config Access

| Check | Status |
|-------|--------|
| `system_config_admin_all` RLS policy (admin-only) | ✅ Active |
| No public SELECT policy | ✅ Confirmed |

---

## 7. Trigger Inventory

**Total triggers on public tables:** 68+ (all enabled, `tgenabled: O`)

Key trigger groups verified:
- **profiles:** 10 triggers (role sync, audit, sensitive field protection, duplicate checks)
- **transactions_v2:** 17 triggers (immutability, canonical enforcement, cascade voids, ledger sync)
- **investor_positions:** 9 triggers (canonical writes, concentration risk, HWM)
- **withdrawal_requests:** 6 triggers (state machine guards, versioning, audit)

---

## Summary

| Area | Result |
|------|--------|
| Comprehensive Health Check (8 checks) | ✅ PASS |
| Migrations (4 remediation) | ✅ Applied |
| Edge Function Auth (11 functions) | ✅ PASS |
| Profile Field Protection | ✅ PASS |
| System Config Lockdown | ✅ PASS |
| Trigger Inventory | ✅ PASS |
| **Anon EXECUTE Permissions** | **⚠️ FAIL — 259 functions exposed** |

### Blocking Items

1. **Anon EXECUTE permissions:** Must re-apply bulk REVOKE and verify ≤15 functions accessible by `anon`. This is a P0 security requirement.

---

*Report generated: 2026-04-08*
*Next: Resolve anon permissions → re-verify → CTO + CFO sign-off*
