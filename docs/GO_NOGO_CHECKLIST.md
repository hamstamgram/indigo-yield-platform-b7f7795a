# Go/No-Go Checklist
## Fortune-500 Grade Go-Live Certification

**Last Updated**: 2026-01-20  
**Status**: Active

---

## Objective Criteria

All criteria must pass for production deployment.

### 1. SQL Proof Suite ☐

| Test File | Status | Last Run |
|-----------|--------|----------|
| `fixtures_seed.sql` | ☐ Pass | - |
| `invariants.sql` | ☐ Pass | - |
| `flows_e2e.sql` | ☐ Pass | - |
| `determinism.sql` | ☐ Pass | - |
| `rpc_abuse.sql` | ☐ Pass | - |
| `performance_gates.sql` | ☐ Pass | - |
| `transaction_flows_e2e.sql` | ☐ Pass | - |

### 2. Integrity Checks ☐

| Check | Status |
|-------|--------|
| `run_integrity_pack()` returns `overall_status = 'pass'` | ☐ |
| `v_cost_basis_mismatch` returns 0 rows | ☐ |
| `aum_position_reconciliation` has no mismatches | ☐ |
| `v_yield_conservation_violations` returns 0 rows | ☐ |

### 3. Security Gates ☐

| Gate | Status |
|------|--------|
| All mutation RPCs have `is_admin()` guards | ☐ |
| All SECURITY DEFINER functions have proper search_path | ☐ |
| RLS enabled on all user-data tables | ☐ |
| No exposed admin endpoints without auth | ☐ |

### 4. Architecture Gates ☐

| Gate | Status |
|------|--------|
| Only `recompute_investor_position()` writes positions | ☐ |
| All transactions use `reference_id` for idempotency | ☐ |
| No direct writes to `investor_positions` allowed | ☐ |
| Crystallization required before all flows | ☐ |

### 5. Performance Gates ☐

| Gate | Status |
|------|--------|
| Required indexes exist on critical tables | ☐ |
| List endpoints accept LIMIT/OFFSET | ☐ |
| No sequential scans on large tables | ☐ |
| Query response times < 500ms for common operations | ☐ |

### 6. Determinism Gates ☐

| Gate | Status |
|------|--------|
| `get_fund_aum_as_of` returns consistent values | ☐ |
| No timezone drift in date handling | ☐ |
| Non-existent snapshots return NULL, not 0 | ☐ |
| Transaction ordering is deterministic | ☐ |

### 7. Documentation Gates ☐

| Document | Status | Approved By |
|----------|--------|-------------|
| `FINANCIAL_RULEBOOK.md` | ☐ | - |
| RPC Contract Manifest | ☐ | - |
| Data Flow Diagrams | ☐ | - |

---

## Decision Matrix

| All Criteria Pass | Decision |
|-------------------|----------|
| ✅ Yes | **GO** for production |
| ❌ No | **NO-GO** - resolve and retest |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| CFO / Fund Accounting Lead | | | |
| Principal Engineer | | | |
| Security Lead | | | |
| QA Lead | | | |

---

## How to Run Verification

### Local Development

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push --local

# Run full proof suite
psql "postgresql://postgres:postgres@localhost:54322/postgres" \
  -f tests/sql/fixtures_seed.sql \
  -f tests/sql/invariants.sql \
  -f tests/sql/flows_e2e.sql \
  -f tests/sql/determinism.sql \
  -f tests/sql/rpc_abuse.sql \
  -f tests/sql/performance_gates.sql

# Run integrity pack
psql "postgresql://postgres:postgres@localhost:54322/postgres" \
  -c "SELECT run_integrity_pack();"
```

### CI Pipeline

The `.github/workflows/golden-path.yml` workflow runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main`
- Manual workflow dispatch

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-20 | Initial checklist |
