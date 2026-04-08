# Indigo Platform: Testing, Consolidation, and IB Cleanup Plan

> **Priority Order:** Testing → Service Consolidation → IB Cleanup
> **Timeline:** No deadline ("when it's done")
> **Executor:** Solo founder
> **Process:** Verify locally, then push to git

---

## Workstream 1: Yield Engine Testing (CRITICAL)

### Goal
Add integration tests for the actual yield RPCs and database triggers - not just formula unit tests.

### Setup: Local Supabase Instance

```bash
# Install Supabase CLI if not present
brew install supabase/tap/supabase

# Initialize local instance (run from project root)
cd ~/indigo-yield-platform-v01
supabase init  # if not already done
supabase start

# Apply migrations to local instance
supabase db reset  # applies all migrations fresh
```

**Deliverable:** Local Supabase running with full schema, RPCs, and triggers.

---

### Phase 1A: SQL/RPC Integration Tests (10 scenarios)

Create: `tests/integration/yield-engine/`

| # | Scenario | Test File | Key Assertions |
|---|----------|-----------|----------------|
| 1 | Mid-period deposit | `adb-mid-deposit.test.ts` | Investor depositing day 15/30 gets 50% ADB weight |
| 2 | Mid-period withdrawal | `adb-mid-withdrawal.test.ts` | Withdrawing investor's ADB reflects partial period |
| 3 | Crystallization timing | `crystallization-before-flow.test.ts` | Yield distributed before deposit doesn't credit new funds |
| 4 | Multi-investor split | `multi-investor-adb.test.ts` | Sum of all investor yields = gross yield |
| 5 | IB commission waterfall | `ib-commission-waterfall.test.ts` | IB gets % of gross, INDIGO gets remainder |
| 6 | Zero-balance investor | `zero-balance-exclusion.test.ts` | Investor with 0 balance gets 0 yield |
| 7 | Dust accumulation | `dust-to-fees.test.ts` | Rounding residuals credited to fees_account |
| 8 | Void distribution cascade | `void-distribution.test.ts` | Voiding cascades to yield_allocations, fee_allocations, ib_allocations, transactions_v2 |
| 9 | Large numbers precision | `numeric-precision.test.ts` | NUMERIC(28,10) preserved through full flow |
| 10 | Fee override hierarchy | `fee-hierarchy.test.ts` | Custom fee > schedule > fund default |

**Test Pattern (each file):**

```typescript
import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const supabase = createClient(
  process.env.SUPABASE_LOCAL_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Yield Engine: [Scenario Name]', () => {
  beforeAll(async () => {
    // Seed test data: fund, investors, positions, AUM
  });

  afterAll(async () => {
    // Clean up test data
  });

  it('should [expected behavior]', async () => {
    // Call RPC: apply_adb_yield_distribution_v3
    // Assert: conservation identity holds
    // Assert: investor positions updated correctly
    // Assert: audit_log entries created
  });
});
```

**Conservation Identity (assert in every test):**
```sql
-- Must always hold
SELECT 
  gross_yield_amount = (
    total_net_amount + total_fee_amount + total_ib_amount + dust_amount
  ) AS conservation_holds
FROM yield_distributions
WHERE id = :distribution_id;
```

---

### Phase 1B: E2E Flow Tests (7 scenarios)

Create: `tests/e2e/yield-flows/`

| # | Flow | Test File | User Journey |
|---|------|-----------|--------------|
| 1 | Apply yield distribution | `admin-apply-yield.spec.ts` | Admin: preview → apply → verify success toast |
| 2 | Deposit with crystallization | `admin-deposit-crystallize.spec.ts` | Admin: new transaction → deposit → verify crystallization happened |
| 3 | Withdrawal with crystallization | `admin-withdrawal-crystallize.spec.ts` | Admin: new transaction → withdrawal → verify crystallization |
| 4 | Void yield distribution | `admin-void-yield.spec.ts` | Admin: find distribution → void → verify cascade |
| 5 | Void transaction | `admin-void-transaction.spec.ts` | Admin: find transaction → void → verify position recalc |
| 6 | Investor yield history | `investor-yield-history.spec.ts` | Investor: login → yield history → amounts match DB |
| 7 | Investor statements | `investor-statements.spec.ts` | Investor: login → statements → numbers reconcile |

**E2E Test Pattern:**

```typescript
import { test, expect } from '@playwright/test';
import { adminLogin, investorLogin } from '../fixtures/auth';
import { seedYieldScenario, cleanupScenario } from '../fixtures/yield';

test.describe('Admin: Apply Yield Distribution', () => {
  test.beforeAll(async () => {
    await seedYieldScenario('basic-multi-investor');
  });

  test.afterAll(async () => {
    await cleanupScenario('basic-multi-investor');
  });

  test('should preview and apply yield distribution', async ({ page }) => {
    await adminLogin(page);
    await page.goto('/admin/yield');
    
    // Select fund, date range
    // Click preview
    // Verify preview shows correct breakdown
    // Click apply
    // Verify success
    // Navigate to investor and verify yield credited
  });
});
```

---

### Phase 1C: CI Integration

Update `.github/workflows/test.yml`:

```yaml
jobs:
  unit-tests:
    # existing unit tests
    
  integration-tests:
    runs-on: ubuntu-latest
    services:
      supabase:
        # Use Supabase local or test project
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: supabase db reset
      - run: pnpm test:integration
      
  e2e-tests:
    needs: [unit-tests, integration-tests]
    # existing e2e setup
```

---

### Deliverables - Workstream 1

- [ ] Local Supabase instance configured and documented
- [ ] 10 SQL/RPC integration tests (all passing)
- [ ] 7 E2E flow tests (all passing)
- [ ] CI pipeline updated to run integration tests
- [ ] All tests green before proceeding to Workstream 2

---

## Workstream 2: Service Layer Consolidation

### Goal
Reduce 90+ service files to ~25 domain services using conservative facade pattern.

### Approach: Conservative (no breaking changes)

1. Create domain facades that re-export from existing files
2. Update new code to use facades
3. Mark old imports as deprecated (JSDoc)
4. DO NOT delete or move existing files yet

### Target Domain Structure

```
services/
  domains/
    yield/
      index.ts              # Facade: re-exports from files below
      distribution.ts       # Consolidates: yieldDistributionService, yieldRecordsService
      allocation.ts         # Consolidates: yieldAllocationService, feeAllocationService
      preview.ts            # Consolidates: previewService parts
    
    transactions/
      index.ts              # Facade
      ledger.ts             # Consolidates: transactionService, transactionsV2Service
      deposits.ts           # Consolidates: depositService parts
      withdrawals.ts        # Consolidates: withdrawalService, approvalService
    
    investors/
      index.ts              # Facade
      profiles.ts           # Consolidates: profileService, investorProfileService
      positions.ts          # Consolidates: investorPositionService, positionService
      portfolio.ts          # Consolidates: portfolioService, investorPortfolioService
    
    funds/
      index.ts              # Facade
      management.ts         # Consolidates: fundService, fundManagementService
      aum.ts                # Consolidates: aumService, fundAumService
    
    fees/
      index.ts              # Facade
      calculations.ts       # Consolidates: feeService, feeCalculationService
      allocations.ts        # Consolidates: feeAllocationService
    
    ib/
      index.ts              # Facade
      commissions.ts        # Consolidates: ibService, ibCommissionService
      allocations.ts        # Consolidates: ibAllocationService
    
    reports/
      index.ts              # Facade
      statements.ts         # Consolidates: statementService, reportService
      generation.ts         # Consolidates: pdfGenerator, excelGenerator
    
    admin/
      index.ts              # Facade
      stats.ts              # Consolidates: adminStatsService, dashboardService
      audit.ts              # Consolidates: auditLogService, integrityService
    
    auth/
      index.ts              # Facade (mostly unchanged)
    
    notifications/
      index.ts              # Facade (mostly unchanged)
```

### Facade Pattern Example

```typescript
// services/domains/yield/index.ts

// Re-export from existing files (no breaking changes)
export * from '../../admin/yieldDistributionService';
export * from '../../admin/yieldRecordsService';
export * from '../../admin/yieldAllocationService';

// New consolidated functions (use these going forward)
export { 
  previewYieldDistribution,
  applyYieldDistribution,
  voidYieldDistribution,
  getYieldHistory,
} from './distribution';

// Deprecation notice
/** @deprecated Use `import { ... } from '@/services/domains/yield'` instead */
export const MIGRATION_NOTICE = 'This module is being consolidated. Update imports.';
```

### Migration Steps

1. **Audit:** Map all 90+ files to target domains
2. **Create facades:** One domain at a time, starting with `yield/`
3. **Update new code:** All new features use domain imports
4. **Add deprecation comments:** Mark old direct imports
5. **Track usage:** `grep` for old import paths, track in migration doc
6. **Future cleanup:** (Out of scope) Delete old files when usage hits zero

---

### Deliverables - Workstream 2

- [ ] Domain facade structure created (`services/domains/`)
- [ ] 10 domain facades with re-exports
- [ ] Migration guide documenting old → new imports
- [ ] No breaking changes to existing code
- [ ] All tests still passing

---

## Workstream 3: IB Portal Cleanup

### Goal
Remove dead IB portal code. Keep commission engine (it's working and earning).

### What to REMOVE

```
src/pages/ib/                    # All IB portal pages (already redirecting)
src/features/ib/                 # IB-specific components (if unused)
src/components/ib/               # IB-specific UI (if unused)
src/hooks/useIB*.ts              # IB portal hooks (verify unused first)
```

### What to KEEP

```
src/services/ib/                 # Commission calculation (KEEP - earning money)
src/services/admin/ibUsersService.ts  # Admin IB management (KEEP)
Database: ib_allocations         # IB commission records (KEEP)
Database: ib_commission_ledger   # Commission ledger (KEEP)
RPC: IB-related yield logic      # In apply_adb_yield_distribution_v3 (KEEP)
profiles.ib_parent_id            # Investor-IB linkage (KEEP)
profiles.ib_percentage           # Commission rate (KEEP)
```

### Cleanup Steps

1. **Audit imports:** Find all references to IB portal code
   ```bash
   grep -r "from.*ib/" src/ --include="*.ts" --include="*.tsx"
   grep -r "IBPortal\|IBDashboard\|useIB" src/
   ```

2. **Verify redirects work:** All `/ib/*` routes redirect to `/investor`

3. **Remove dead code:**
   - Delete unused IB portal pages
   - Delete unused IB components
   - Delete unused IB hooks
   - Keep everything that touches commission calculation

4. **Update route config:** Clean up IB route definitions (keep redirects for bookmarks)

5. **Run tests:** Verify nothing broke

---

### Deliverables - Workstream 3

- [ ] IB portal pages deleted
- [ ] IB-specific components deleted (if unused)
- [ ] Commission engine untouched and tested
- [ ] All IB routes still redirect properly
- [ ] All tests passing
- [ ] ~15% codebase reduction

---

## Execution Order

```
Week 1-2: Workstream 1A (SQL/RPC tests)
  - Set up local Supabase
  - Implement 10 yield scenarios
  - All integration tests green

Week 3: Workstream 1B (E2E tests)
  - Implement 7 flow tests
  - Update CI pipeline
  - All E2E tests green

Week 4: Workstream 2 (Consolidation)
  - Create domain facades
  - Migration guide
  - No breaking changes

Week 5: Workstream 3 (IB Cleanup)
  - Audit and remove dead code
  - Verify commission engine
  - Final test pass

Week 5+: Push to git
  - All tests green
  - Manual smoke test
  - Commit and push
```

---

## Verification Checklist (Before Push)

```bash
# Type check
pnpm type-check

# Unit tests
pnpm test:unit

# Integration tests  
pnpm test:integration

# E2E tests
pnpm test:e2e

# Build
pnpm build

# Manual smoke test
# - Admin: create yield distribution
# - Investor: view yield history
# - IB commission: verify in admin
```

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Local Supabase drift from prod | Sync migrations regularly, test against prod clone monthly |
| Flaky E2E tests | Use stable selectors, add retry logic, seed deterministic data |
| Service consolidation breaks imports | Conservative approach - no deletions, only facades |
| IB cleanup removes working code | Audit thoroughly, grep for all references before delete |
| Solo execution = no review | Run verify-app agent before every push |

---

## Success Criteria

1. **Testing:** 10 integration + 7 E2E tests, all green, in CI
2. **Consolidation:** Domain facades exist, no breaking changes
3. **IB Cleanup:** Dead code removed, commission engine intact
4. **Final:** All tests pass, pushed to git

---

*Plan created: 2026-02-11*
*Last updated: 2026-02-11*
