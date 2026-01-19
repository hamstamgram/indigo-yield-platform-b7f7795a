# SECURITY DEFINER Views Documentation

**Last Updated:** 2026-01-19  
**Status:** Intentional - All views are authorized for admin use  
**Phase 5 Update:** Reduced from 40 to ~23 views after cleanup

---

## Overview

These ~23 views use `SECURITY DEFINER` to bypass Row Level Security (RLS) for admin integrity dashboards. This is **intentional** and **by design** to allow cross-investor data aggregation for system health monitoring.

> **Note:** 17 unused SECURITY DEFINER views were dropped in Phase 5. See `docs/patterns/VIEW_INVENTORY.md` for the dropped view list.

All SECURITY DEFINER views are:
- **Read-only** (no mutations possible)
- **Admin-only access** (protected by route guards in the frontend)
- **Aggregated/computed data** (not exposing raw PII)
- **Necessary for integrity checks** (RLS bypass required for cross-investor queries)

---

## View Inventory

### Reconciliation & Integrity Views

| View Name | Purpose | Access Control | Risk Level |
|-----------|---------|----------------|------------|
| `fund_aum_mismatch` | Detects when fund AUM ≠ Σ positions | Admin route only | Low |
| `aum_position_reconciliation` | Compares AUM snapshots to position sums | Admin route only | Low |
| `v_ledger_reconciliation` | Ensures ledger entries balance | Admin route only | Low |
| `v_crystallization_dashboard` | Shows yield gaps requiring crystallization | Admin route only | Low |
| `v_yield_conservation_check` | Verifies yield distribution math | Admin route only | Low |
| `v_yield_conservation_violations` | Lists distributions failing conservation | Admin route only | Low |
| `yield_distribution_conservation_check` | Yield allocation sum verification | Admin route only | Low |

### Orphan Detection Views

| View Name | Purpose | Access Control | Risk Level |
|-----------|---------|----------------|------------|
| `v_orphaned_transactions` | Transactions without valid positions | Admin route only | Low |
| `v_transaction_distribution_orphans` | TX-distribution link issues | Admin route only | Low |
| `v_period_orphans` | Periods without required snapshots | Admin route only | Low |

### Fund & AUM Views

| View Name | Purpose | Access Control | Risk Level |
|-----------|---------|----------------|------------|
| `mv_fund_summary` | Materialized fund aggregate stats | Admin route only | Low |
| `v_fund_aum_position_status` | Fund AUM health status | Admin route only | Low |
| `v_aum_snapshot_health` | AUM snapshot coverage analysis | Admin route only | Low |
| `v_liquidity_risk` | Fund liquidity assessment | Admin route only | Low |

### Investor Analytics Views

| View Name | Purpose | Access Control | Risk Level |
|-----------|---------|----------------|------------|
| `v_investor_kpis` | Investor performance metrics | Admin route only | Medium |
| `profiles_display` | Non-sensitive profile data for display | Authenticated users | Low |

### Platform Metrics

| View Name | Purpose | Access Control | Risk Level |
|-----------|---------|----------------|------------|
| `mv_daily_platform_metrics` | Materialized daily platform stats | Admin route only | Low |

---

## Security Justification

### Why SECURITY DEFINER?

1. **Cross-Investor Aggregation**: Integrity checks must sum positions across ALL investors. Standard RLS would filter to only the querying user's data.

2. **Admin-Only Context**: These views are only called from admin routes, which have:
   - Frontend route guards requiring `role = 'admin'` or `role = 'super_admin'`
   - Server-side `is_admin()` checks in RPC functions

3. **Read-Only Nature**: Views cannot modify data. Even if accessed, they only reveal aggregate/computed metrics.

4. **Audit Trail**: All admin actions are logged in `audit_log` table with `actor_user` identification.

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Unauthorized access | Route guards + `is_admin()` RPC checks |
| Data leakage | Views return computed aggregates, not raw PII |
| Session hijacking | Standard Supabase auth + refresh token rotation |
| Privilege escalation | Role changes require `is_super_admin()` |

---

## Access Control Matrix

| View Category | Regular User | Investor | Admin | Super Admin |
|---------------|--------------|----------|-------|-------------|
| Reconciliation Views | ❌ | ❌ | ✅ | ✅ |
| Orphan Detection | ❌ | ❌ | ✅ | ✅ |
| Fund Analytics | ❌ | ❌ | ✅ | ✅ |
| Investor KPIs | ❌ | Own data only* | ✅ | ✅ |
| Platform Metrics | ❌ | ❌ | ✅ | ✅ |

*Investors can see their own data via RLS-filtered queries, not through SECURITY DEFINER views.

---

## Linter Warnings

The database linter flags these 40 views with warnings like:

```
SECURITY DEFINER function or view detected: public.fund_aum_mismatch
```

**These warnings are acknowledged and intentional.** The views are:
- Documented in this file
- Protected by application-layer access control
- Required for admin integrity dashboards

---

## Adding New SECURITY DEFINER Views

Before creating a new SECURITY DEFINER view:

1. **Justify the need**: Document why RLS bypass is required
2. **Limit scope**: Only expose necessary columns/aggregates
3. **Add to this document**: Update the inventory table
4. **Review access**: Ensure admin-only routes protect the view
5. **Avoid mutations**: Views should never modify data

---

## Related Documentation

- `docs/GO_LIVE_RPC_AUDIT.md` - RPC security audit
- `docs/GO_LIVE_RPC_AUDIT_APPENDICES.md` - Detailed security proofs
- `docs/POSITION_QUERY_STANDARDS.md` - Position query best practices
- `.serena/memories/security/platform-hardening-summary` - Security summary
