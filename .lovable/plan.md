

# Database Architecture Audit Report

## Executive Summary

40 tables, 28 views, ~1.2 GB of audit data accumulated in 3 weeks. The schema is functionally complete but has four systemic issues: **inconsistent admin-check functions**, **redundant/overlapping RLS policies**, **zero foreign keys on the schema** (all FK references are orphaned), and **audit table bloat** (774 MB in 22 days with no archival).

---

## Finding 1: ZERO Enforced Foreign Keys (Critical)

**Problem:** The `information_schema.table_constraints` query for FK type returns **0 rows**. Despite `pg_constraint` reporting FK counts per table, the actual FK metadata shows every single `*_id` UUID column across all 40 tables lacks a real foreign key constraint.

Over **90 UUID columns** named `investor_id`, `fund_id`, `period_id`, `distribution_id`, `transaction_id`, etc. have no referential integrity enforcement. This means:
- Orphaned records can exist silently (e.g., a `fee_allocation` referencing a deleted fund)
- CASCADE deletes don't work — data cleanup is fully manual
- The integrity views (`v_orphaned_positions`, `v_fee_allocation_orphans`, etc.) exist as compensating controls, which confirms the team is aware

**Recommendation:** Add FK constraints to the most critical financial relationships first:
1. `transactions_v2.fund_id → funds.id`
2. `transactions_v2.investor_id → profiles.id`
3. `yield_distributions.fund_id → funds.id`
4. `fee_allocations.distribution_id → yield_distributions.id`
5. `investor_positions.fund_id → funds.id` and `investor_positions.investor_id → profiles.id`

Use `NOT VALID` initially to avoid locking tables, then `VALIDATE CONSTRAINT` in a separate migration.

---

## Finding 2: Four Different Admin-Check Functions (Critical)

**Problem:** RLS policies across the database use **four different functions** to check admin status:

| Function | Used by |
|----------|---------|
| `is_admin()` | 25+ tables (most common) |
| `is_admin_for_jwt()` | `assets`, `audit_log`, `statements` |
| `is_admin_safe()` | `profiles`, `investor_emails`, `rate_limit_config`, `transactions_v2`, `yield_distributions` |
| `check_is_admin(auth.uid())` | `data_edit_audit`, `statement_periods`, `statements`, `support_tickets` |

This creates confusion about which function to use, potential security inconsistencies (do they all check the same thing?), and maintenance burden.

**Recommendation:** Audit the implementation of all four functions. If they are functionally equivalent, standardize on one (likely `is_admin()`) and migrate all policies. If they differ (e.g., `is_admin_safe()` avoids recursion), document why and reduce to at most two.

---

## Finding 3: Redundant/Overlapping RLS Policies (High)

**Problem:** Several tables have overlapping policies that grant the same access through multiple paths:

**`statements` (6 policies):**
- `statements_admin_all` (ALL via `check_is_admin`) — already covers SELECT, INSERT, UPDATE, DELETE
- `statements_select_admin` (SELECT via `is_admin_for_jwt`) — redundant with ALL
- `statements_insert_admin` (INSERT via `is_admin_for_jwt`) — redundant with ALL
- `statements_update_admin` (UPDATE via `is_admin_for_jwt`) — redundant with ALL
- `statements_delete_admin` (DELETE via `is_admin_for_jwt`) — redundant with ALL
- Only `statements_select_own` is unique

**`withdrawal_requests` (5 policies):**
- `withdrawal_requests_admin_manage` (ALL) covers everything
- Two SELECT policies for investors: `Users can view own withdrawal requests` and `investors_view_own_withdrawals` — doing the same thing

**`statement_periods` (3 policies):**
- Two ALL policies (`Admins can manage statement periods` via `is_admin()` and `statement_periods_admin` via `check_is_admin()`) — fully redundant

**Recommendation:** For each table, keep the single broadest admin policy (the ALL policy) and remove the per-command duplicates. Consolidate duplicate investor SELECT policies.

---

## Finding 4: Audit Log Bloat — 774 MB in 22 Days (High)

**Problem:** `audit_log` has 623K rows (774 MB) and `data_edit_audit` has 78K rows (458 MB), totaling **1.23 GB** accumulated since March 17. At this rate, the database will reach several GB within months.

There is no partitioning, no archival policy, and no TTL mechanism.

**Recommendation:**
1. **Immediate**: Add a partitioning strategy (range partition by `created_at` month)
2. **Short-term**: Create an archival function that moves records older than 90 days to a `audit_log_archive` table or exports to storage
3. **Investigate**: 623K rows in 22 days (~28K/day) seems excessive for a platform with 46 profiles — check if triggers are logging too aggressively (e.g., every SELECT or every RLS check)

---

## Finding 5: Missing Unique Constraints on Financial Tables (Medium)

**Problem:** Several financial tables lack unique constraints that would prevent duplicate entries:

| Table | Missing constraint |
|-------|-------------------|
| `fund_daily_aum` | No unique on `(fund_id, aum_date, purpose)` — allows duplicate AUM entries for the same fund/date |
| `platform_fee_ledger` | No unique on `(yield_distribution_id, investor_id)` — allows double-charging |
| `ib_commission_ledger` | No unique on `(yield_distribution_id, source_investor_id, ib_id)` |
| `investor_positions` | No unique on `(investor_id, fund_id)` — could allow duplicate position rows |

The application layer may prevent duplicates, but database-level enforcement is the last line of defense for financial data.

**Recommendation:** Add unique constraints (or unique partial indexes excluding voided records) to each of these tables.

---

## Finding 6: Unused Tables (Low)

**Problem:** Several tables have 0 rows and appear unused:

| Table | Rows | Purpose |
|-------|------|---------|
| `admin_alerts` | 0 | Alert system — possibly unimplemented |
| `report_schedules` | 0 | Scheduled reports — unimplemented |
| `investor_device_tokens` | 0 | Push notifications — unimplemented |
| `user_sessions` | 0 | Session tracking — unused |
| `documents` | 0 | Document storage — unused |
| `global_fee_settings` | 0 | Fee config — using `investor_fee_schedule` instead? |
| `investor_emails` | 0 | Multi-email — using `profiles.email` instead? |

**Recommendation:** Audit whether these are planned features or dead schema. Mark unused tables with a comment or archive them to reduce cognitive overhead.

---

## Finding 7: 28 Diagnostic Views — No Ownership Documentation (Low)

The database has 28 views, roughly split between:
- **Investor-facing**: `investor_positions_with_funds`, `investor_transactions_view`, `monthly_statements_view`
- **Integrity/diagnostic**: `v_orphaned_positions`, `v_cost_basis_mismatch`, `v_ledger_reconciliation`, etc.

These are valuable but undocumented. No comments indicate which views are used by the app vs. which are admin-only diagnostic tools.

**Recommendation:** Add `COMMENT ON VIEW` for each, indicating whether it's app-facing, admin-diagnostic, or deprecated.

---

## Ordered Action Plan

| Priority | Action | Impact | Risk |
|----------|--------|--------|------|
| **P0** | Standardize admin-check functions to 1-2 canonical functions | Eliminates security ambiguity | Medium (policy rewrite) |
| **P1** | Remove redundant RLS policies on `statements`, `withdrawal_requests`, `statement_periods` | Cleaner policy evaluation, fewer plan nodes | Low |
| **P2** | Add unique constraints to `fund_daily_aum`, `platform_fee_ledger`, `ib_commission_ledger`, `investor_positions` | Prevents duplicate financial records | Medium (validate existing data first) |
| **P3** | Add FK constraints (with `NOT VALID`) to core financial tables | Referential integrity | Low (NOT VALID avoids locks) |
| **P4** | Investigate audit_log volume (28K rows/day) and add archival | Prevents DB bloat | Low |
| **P5** | Document or archive unused 0-row tables | Reduces cognitive overhead | None |
| **P6** | Add `COMMENT ON VIEW` to all 28 views | Documentation | None |

