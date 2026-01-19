# Database View Inventory

**Last Updated:** 2026-01-19  
**Phase 5 Cleanup:** Dropped 17 unused views

---

## Summary

| Category | Count | Purpose |
|----------|-------|---------|
| Materialized Views | 2 | Cached aggregates for performance |
| Investor-Facing Views | 1 | Dashboard data |
| Admin Integrity Views | 8 | Data integrity monitoring |
| Risk Alert Views | 2 | Risk monitoring |
| Smoke Test Views | 6 | Automated testing |
| Workflow Views | 2 | Approval workflows |

---

## Materialized Views (2)

| View | Purpose | Refresh | Used By |
|------|---------|---------|---------|
| `mv_fund_summary` | Fund aggregate statistics | Manual | `useRiskAlerts.ts` |
| `mv_daily_platform_metrics` | Daily platform KPIs | Cron | `useRiskAlerts.ts` |

---

## Investor-Facing Views (1)

| View | Purpose | Used By |
|------|---------|---------|
| `v_live_investor_balances` | Current positions and values per investor | `useInvestorData.ts` |

---

## Admin Integrity Views (8)

| View | Purpose | Used By |
|------|---------|---------|
| `v_crystallization_dashboard` | Crystallization gaps requiring action | `integrityOperationsService.ts` |
| `v_crystallization_gaps` | Position yield gaps by days behind | `integrityOperationsService.ts`, smoke tests |
| `v_ledger_reconciliation` | Ledger balance verification | `integrityOperationsService.ts`, `systemAdminService.ts` |
| `fund_aum_mismatch` | AUM vs position sum validation | `integrityService.ts`, smoke tests |
| `investor_position_ledger_mismatch` | Position ledger validation | `integrityService.ts`, smoke tests |
| `yield_distribution_conservation_check` | Yield distribution math validation | `integrityService.ts`, smoke tests |
| `ib_allocation_consistency` | IB allocation consistency check | `integrityService.ts` |
| `v_potential_duplicate_profiles` | Duplicate profile detection | `integrityOperationsService.ts` |

---

## Risk Alert Views (2)

| View | Purpose | Used By |
|------|---------|---------|
| `v_liquidity_risk` | Fund liquidity assessment | `useRiskAlerts.ts` |
| `v_concentration_risk` | Investor concentration analysis | `useRiskAlerts.ts` |

---

## Smoke Test Views (6)

| View | Purpose | Used By |
|------|---------|---------|
| `v_transaction_distribution_orphans` | TX-distribution link issues | `db-smoke-test.sh` |
| `v_fee_allocation_orphans` | Fee allocation orphans | `db-smoke-test.sh` |
| `v_position_transaction_variance` | Position transaction variance | `check-ledger-reconciliation.js` |
| `v_transaction_sources` | Transaction source analysis | `db-smoke-test.sh` |
| `v_orphaned_positions` | Positions without valid investors | `systemAdminService.ts` |
| `v_fee_calculation_orphans` | Fee calculation orphans | `systemAdminService.ts` |

---

## Workflow Views (2)

| View | Purpose | Used By |
|------|---------|---------|
| `v_pending_approvals` | Pending approval items | `approvalService.ts` |
| `v_approval_history` | Completed approval history | `approvalService.ts` |

---

## Dropped Views (Phase 5)

The following 17 views were dropped as unused:

| View | Reason |
|------|--------|
| `v_security_definer_audit` | Diagnostic only, no callers |
| `v_adb_verification` | No frontend callers |
| `v_orphaned_user_roles` | No frontend callers |
| `position_ledger_reconciliation_v2` | Superseded |
| `v_position_ledger_reconciliation` | Superseded |
| `v_ledger_position_mismatches` | Superseded |
| `v_merge_candidates` | No frontend callers |
| `v_duplicate_transactions` | No frontend callers |
| `v_missing_withdrawal_transactions` | No frontend callers |
| `v_orphaned_transactions` | No frontend callers |
| `v_ib_allocation_orphans` | No frontend callers |
| `v_aum_purpose_issues` | No frontend callers |
| `v_yield_allocation_violations` | No frontend callers |
| `v_position_crystallization_status` | No frontend callers |
| `platform_fees_collected` | No frontend callers |
| `audit_events_v` | No frontend callers |
| `monthly_fee_summary` | No frontend callers |

---

## SECURITY DEFINER Views

See `docs/SECURITY_DEFINER_VIEWS.md` for the complete list of views that intentionally use SECURITY DEFINER for admin integrity dashboards.

---

## Related Documentation

- `docs/SECURITY_DEFINER_VIEWS.md` - Security definer justification
- `docs/patterns/IB_FUNCTIONS.md` - IB function patterns
- `scripts/db-smoke-test.sh` - Smoke test script
