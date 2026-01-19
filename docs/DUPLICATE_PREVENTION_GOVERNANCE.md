# Duplicate Prevention Governance

> Created: 2026-01-19 (Post-Audit Cleanup)

This document establishes rules to prevent duplicate logic, conflicting processes, and code drift.

## Core Principles

### 1. One Domain, One Service

| Domain | Canonical Service | DO NOT duplicate in |
|--------|-------------------|---------------------|
| Fund CRUD | `services/admin/fundService.ts` | fundViewService (reads only) |
| Fund Views (investor) | `services/investor/fundViewService.ts` | - |
| Withdrawal Operations | `services/investor/withdrawalService.ts` | adminService ❌ |
| Positions Query | `services/investor/investorPositionService.ts` | positionService, adminService |
| Yield Distribution | `services/admin/yieldDistributionService.ts` | - |
| Portfolio Reads | `services/investor/investorPortfolioService.ts` | - |

### 2. RPC-Only for Financial Mutations

**NEVER use direct DB writes** (`db.update()`, `db.insert()`) for:
- `withdrawal_requests` - Use `approve_withdrawal`, `reject_withdrawal` RPCs
- `transactions_v2` - Use appropriate transaction RPCs
- `investor_positions` - Derived via triggers, never written directly
- `fund_aum_events` - Use yield distribution RPCs

**Why?** Direct writes bypass:
- RLS policies
- Audit logging triggers
- Business rule validation
- Data integrity constraints

### 3. Query Key Ownership

Each data entity has ONE query key factory:

```typescript
// ✅ Correct - single source
QUERY_KEYS.fundPositions(fundId)

// ❌ Wrong - duplicate keys for same data
QUERY_KEYS.investorPositions(id)
QUERY_KEYS.adminInvestorPositions(id)
QUERY_KEYS.positions(id)
```

### 4. Service Naming Conventions

| Pattern | Meaning | Example |
|---------|---------|---------|
| `*Service.ts` | Stateful class or function collection | `withdrawalService.ts` |
| `get*` | Read operation | `getFundById()` |
| `create*` / `update*` / `delete*` | Mutation | `createDeposit()` |
| `preview*` | Read-only calculation | `previewYieldDistribution()` |
| `apply*` | Write mutation | `applyYieldDistribution()` |

## Conflict Resolution Matrix

When you find duplicate implementations:

| Scenario | Action |
|----------|--------|
| Same name, same logic | Delete one, keep canonical |
| Same name, different return type | Rename with suffix (`WithYield`, `ForList`) |
| Same name, different behavior | Document and choose based on use case |
| Legacy vs new | Deprecate legacy with `@deprecated` comment |

## P0 Violations (Critical)

These patterns are **FORBIDDEN** and must be fixed immediately:

1. **Direct DB withdrawal mutations** - Use RPC layer only
2. **Multiple functions with same name exporting from barrel** - Causes import confusion
3. **Financial calculations in UI components** - Move to service layer

## Code Review Checklist

Before approving PR:

- [ ] No new duplicate function names in `/services`
- [ ] No direct writes to protected tables
- [ ] Query keys don't conflict with existing keys
- [ ] Financial math uses `Decimal.js` (not native JS)
- [ ] New RPC wrappers don't duplicate existing ones

## CI Checks (Recommended)

Add these to `.github/workflows/lint.yml`:

```yaml
- name: Detect duplicate function exports
  run: |
    # Find functions exported from multiple files with same name
    grep -rh "export.*function\|export const" src/services/ | \
      awk '{print $3}' | sort | uniq -d | head -20 && exit 1 || exit 0

- name: Detect direct DB writes to protected tables  
  run: |
    grep -r "db\.update.*withdrawal_requests\|db\.insert.*withdrawal_requests" src/services/ && exit 1 || exit 0
    grep -r "db\.update.*transactions_v2\|db\.insert.*transactions_v2" src/services/ && exit 1 || exit 0
```

## Documentation Rules

1. **One canonical spec per domain** (yield, fees, AUM)
2. **Archive old versions** with clear `DEPRECATED` headers
3. **Link to canonical** from any historical docs
4. **Update Architecture Verification doc** when adding new patterns

## See Also

- `docs/ARCHITECTURE_VERIFICATION.md` - Full architecture checklist
- `src/services/admin/index.ts` - Service barrel with conflict comments
- `src/constants/queryKeys.ts` - Query key factory
