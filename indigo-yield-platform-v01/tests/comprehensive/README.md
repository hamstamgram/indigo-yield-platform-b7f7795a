# Comprehensive Transaction & Yield Test Suite

## Business Rules Summary

### Critical Flow: AUM → Crystallize → Transaction

When any transaction occurs:

```
1. SET AUM (opening balance for the day/operation)
   ↓
2. CRYSTALLIZE YIELD for ALL investors at CURRENT ownership %
   ↓
3. APPLY TRANSACTION (deposit/withdrawal/etc)
   ↓
4. RECALCULATE ownership percentages
```

### Why This Order Matters

**Example:**
- Fund has 100 ETH total AUM
- Investor A: 60 ETH (60% ownership)
- Investor B: 40 ETH (40% ownership)
- Accrued yield: 1 ETH

**Correct Flow (crystallize first):**
1. Set AUM = 100 ETH
2. Crystallize yield:
   - A gets: 1 ETH × 60% = 0.6 ETH
   - B gets: 1 ETH × 40% = 0.4 ETH
3. Investor A deposits 50 ETH
4. New positions:
   - A: 60 + 0.6 + 50 = 110.6 ETH
   - B: 40 + 0.4 = 40.4 ETH
5. New ownership: A=73.3%, B=26.7%

**Wrong Flow (no crystallization):**
- A deposits 50 ETH first
- New ownership: A=73.3%, B=26.7%
- Then yield distributed at NEW ownership
- B gets LESS yield than earned (unfair!)

### Fund Currency Isolation

Each fund operates in its own native token:
- IND-BTC: All values in BTC
- IND-ETH: All values in ETH
- IND-SOL: All values in SOL
- IND-USDT: All values in USDT
- IND-XRP: All values in XRP

**NEVER aggregate values across funds!**

### Fees Account as Investor

**Critical Business Rule**: The INDIGO fees account is treated as a **regular investor**:
- Platform fees are deposited into the fees account
- The fees account receives yield distributions proportionally
- The fees account compounds like any other investor account
- All yield distribution tests must verify fees account receives its share

---

## Test Structure (Implemented)

```
tests/comprehensive/
├── transactions/
│   ├── deposit.spec.ts           # Deposit flow tests
│   └── withdrawal.spec.ts        # Withdrawal flow tests
├── yields/
│   ├── yield-calculation.spec.ts     # Math & precision
│   ├── yield-crystallization.spec.ts # Crystallization triggers
│   └── yield-distribution.spec.ts    # NEW: Multi-investor yield + fees account
├── reconciliation/
│   └── position-reconciliation.spec.ts # Position = Σ transactions, AUM checks
├── edge-cases/
│   └── error-handling.spec.ts    # Invalid inputs, boundaries, security
├── scenarios/
│   └── month-simulation.spec.ts  # Full month simulation
├── ib/
│   └── ib-commission.spec.ts     # NEW: IB referrals & commissions
├── investors/
│   └── investor-lifecycle.spec.ts # NEW: Full investor lifecycle
├── void/
│   └── void-transaction.spec.ts  # NEW: Void operations & audit
├── withdrawals/
│   └── withdrawal-workflow.spec.ts # NEW: Full withdrawal workflow
├── fees/
│   └── fee-operations.spec.ts    # NEW: Fee routing to fees account
├── reports/
│   └── report-generation.spec.ts # NEW: Reports & statements
├── periods/
│   └── period-snapshot.spec.ts   # NEW: Period locking & snapshots
├── admin/
│   └── admin-operations.spec.ts  # NEW: Admin & system config
└── data-integrity/
    └── integrity-checks.spec.ts  # NEW: Full system integrity
```

---

## Test Suite Details

### 1. Deposit Tests (`transactions/deposit.spec.ts`)
- Basic deposit flow for all 5 fund types
- Multi-date deposits
- Position calculation verification
- Amount precision (NUMERIC 28,10)
- Audit trail verification
- Error handling

### 2. Withdrawal Tests (`transactions/withdrawal.spec.ts`)
- Basic withdrawal flow for all 5 fund types
- Partial vs full withdrawal
- Yield crystallization on withdrawal
- Multi-date withdrawals
- Amount validation (cannot exceed balance)
- Error handling and edge cases
- Transaction integrity verification

### 3. Yield Calculation Tests (`yields/yield-calculation.spec.ts`)
- Daily yield application (single/multiple investors)
- Ownership percentage calculations
- Fee deduction verification
- Month-end scenarios
- Precision handling (10 decimal places)
- Dust handling
- Conservation laws (yield in = yield out)

### 4. Yield Crystallization Tests (`yields/yield-crystallization.spec.ts`)
- Crystallization on withdrawal (anti-dilution)
- Crystallization on deposit
- Month-end crystallization
- Date accuracy tests
- Multiple crystallizations in same month
- Zero yield crystallization
- Visibility scope transitions

### 5. Position Reconciliation Tests (`reconciliation/position-reconciliation.spec.ts`)
- Position = SUM(transactions) verification
- Multi-fund position isolation
- Voided transaction exclusion
- AUM = SUM(positions) verification
- Ownership percentage validation (sum = 100%)
- Precision and rounding tests
- Full ledger reconciliation
- Transaction chain integrity

### 6. Edge Cases & Error Handling (`edge-cases/error-handling.spec.ts`)
- Invalid input validation (negative, zero, invalid UUIDs)
- Boundary conditions (min/max amounts, precision limits)
- Business rule enforcement (overdraft prevention)
- Cross-fund protection (no contamination)
- Concurrent transaction safety (race conditions)
- Date edge cases (leap years, year boundaries)
- State transition validation (inactive investors)
- Position consistency after errors
- Audit trail completeness
- SQL injection prevention

### 7. Month Simulation (`scenarios/month-simulation.spec.ts`)
- Full January 2026 simulation
- Multiple transactions across dates
- Ownership percentage transitions
- Anti-dilution verification
- Position reconciliation across time

### 8. Yield Distribution Tests (`yields/yield-distribution.spec.ts`)
- Multi-investor yield allocation
- **Fees account treated as regular investor**
- Fee deduction and routing
- Conservation laws (gross yield = allocations + fees)
- IB commission integration
- Investor-level allocation verification
- Zero-balance investor handling

### 9. IB Commission Tests (`ib/ib-commission.spec.ts`)
- IB profile creation and management
- Referral tracking and assignment
- Commission rate configuration
- Commission calculation from referred investor yield
- Commission ledger integrity
- IB payout processing
- Multi-IB scenarios
- Commission allocation records
- Edge cases (inactive IBs, zero balances)

### 10. Investor Lifecycle Tests (`investors/investor-lifecycle.spec.ts`)
- Investor creation (standard, with referral, with IB)
- Profile updates (name, email, contact info)
- Status transitions (pending → active → inactive)
- KYC status management (pending → approved/rejected)
- Tax status management
- Position management across funds
- Investor deletion (standard with zero balance)
- Force deletion with cleanup
- Audit trail verification

### 11. Void Transaction Tests (`void/void-transaction.spec.ts`)
- Basic void operations
- Void impact analysis (position recalculation)
- Void and reissue workflow
- Voiding withdrawals
- Voiding yield allocations
- Audit trail for voids
- Cascading effects
- Void restrictions (locked periods)
- Position integrity after void

### 12. Withdrawal Workflow Tests (`withdrawals/withdrawal-workflow.spec.ts`)
- Full lifecycle: request → approve → process → complete
- Rejection flow with reason
- Cancellation handling
- Yield crystallization before withdrawal
- Route withdrawal to fees account
- Multi-fund withdrawal
- Partial vs full withdrawal
- Withdrawal status tracking
- Amount validation (cannot exceed balance)

### 13. Fee Operations Tests (`fees/fee-operations.spec.ts`)
- **Fees account as regular investor**
- Fee routing to fees account (deposits)
- **Fees account receives yield proportionally**
- **Fees account compounds over distributions**
- Fee schedule management
- Fee conservation laws
- Fee calculation verification
- Platform fees vs IB commissions

### 14. Report Generation Tests (`reports/report-generation.spec.ts`)
- Statement period management
- Generated reports listing
- Generated statements listing
- Report delivery tracking (email)
- Delivery status breakdown
- Report change logging
- Performance reports
- Historical NAV data
- Document storage
- Retry and manual delivery operations

### 15. Period Snapshot Tests (`periods/period-snapshot.spec.ts`)
- Period lock status checking
- Fund period snapshot generation
- Period locking (prevents backdated transactions)
- Rejection of transactions in locked periods
- Period unlocking
- Investor period snapshots
- Ownership percentage at period end
- Period-based reconciliation
- Accounting periods management
- Position snapshots

### 16. Admin Operations Tests (`admin/admin-operations.spec.ts`)
- Admin status checks (is_admin, is_super_admin)
- User role management
- Admin profile listing
- Pending approvals workflow
- Operation approvals
- System configuration
- 2FA policy management
- Rate limit configuration
- Audit logging (access logs, bypass attempts)
- Admin alerts
- Integrity monitoring
- Session management
- Admin invites and investor invites
- Support tickets

### 17. Data Integrity Tests (`data-integrity/integrity-checks.spec.ts`)
- **Position-Transaction Reconciliation**
  - Position = SUM(non-voided transactions)
  - All investors, all funds
- **AUM Validation**
  - Fund AUM = SUM(investor positions)
  - AUM consistency across time
- **Orphaned Record Detection**
  - Transactions without investors
  - Positions without investors
  - Yield allocations without distributions
- **Duplicate Detection**
  - Duplicate transactions
  - Duplicate positions
- **Void Integrity**
  - Voided transactions excluded from positions
  - Void audit trail complete
- **Yield Distribution Integrity**
  - Gross yield = SUM(allocations) + fees
  - No negative allocations
- **Balance Chain Verification**
  - balance_before → balance_after continuity
- **Ownership Validation**
  - Total ownership = 100% per fund
- **Full Ledger Reconciliation**
  - Cross-fund consistency

---

## Running Tests

```bash
# Environment variables required
export VITE_SUPABASE_URL="https://nkfimvovosdehmyyjubn.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"
export TEST_ADMIN_EMAIL="testadmin@indigo.fund"
export TEST_ADMIN_PASSWORD="<admin_password>"

# All comprehensive tests
npx playwright test tests/comprehensive/

# By category - Core Financial Operations
npx playwright test tests/comprehensive/transactions/    # Deposits & withdrawals
npx playwright test tests/comprehensive/yields/          # Yield calculation & distribution
npx playwright test tests/comprehensive/fees/            # Fee operations & fees account
npx playwright test tests/comprehensive/reconciliation/  # Position reconciliation

# By category - Investor & IB Management
npx playwright test tests/comprehensive/investors/       # Investor lifecycle
npx playwright test tests/comprehensive/ib/              # IB commissions & referrals
npx playwright test tests/comprehensive/withdrawals/     # Withdrawal workflow

# By category - Operations & Admin
npx playwright test tests/comprehensive/void/            # Void transactions
npx playwright test tests/comprehensive/periods/         # Period locking & snapshots
npx playwright test tests/comprehensive/admin/           # Admin operations
npx playwright test tests/comprehensive/reports/         # Report generation

# By category - Validation
npx playwright test tests/comprehensive/data-integrity/  # Full system integrity
npx playwright test tests/comprehensive/edge-cases/      # Error handling
npx playwright test tests/comprehensive/scenarios/       # Full month simulation

# Single test file
npx playwright test tests/comprehensive/fees/fee-operations.spec.ts

# With verbose output
npx playwright test tests/comprehensive/ --reporter=list

# Generate HTML report
npx playwright test tests/comprehensive/ --reporter=html

# Run specific test by name
npx playwright test -g "fees account receives yield"
```

---

## Test Data Requirements

Tests use these existing entities (do not delete):
- **Funds**: IND-BTC, IND-ETH, IND-SOL, IND-USDT, IND-XRP
- **Profiles**: Various test investors in profiles table
- **Admin**: testadmin@indigo.fund for created_by

Tests create and clean up their own:
- Transactions (via `transactions_v2`)
- Positions (via `investor_positions`)
- Yield distributions (via `yield_distributions`, `yield_allocations`)
- Fund daily AUM (via `fund_daily_aum`)

---

## Canonical RPC Functions Tested

### Core Transaction Functions
| Function | Purpose |
|----------|---------|
| `apply_deposit_with_crystallization` | Deposit with yield crystallization |
| `apply_withdrawal_with_crystallization` | Withdrawal with yield crystallization |
| `apply_daily_yield_to_fund_v3` | Daily yield distribution |
| `reconcile_investor_position` | Position recalculation |
| `recompute_investor_position` | Trigger-based position update |

### Void & Correction Functions
| Function | Purpose |
|----------|---------|
| `void_transaction` | Mark transaction as voided |
| `void_transaction_with_reissue` | Void and create replacement |
| `get_void_impact_analysis` | Preview void effects |

### IB & Commission Functions
| Function | Purpose |
|----------|---------|
| `calculate_ib_commission` | Calculate IB commission amount |
| `process_ib_payout` | Process IB commission payout |
| `get_ib_commission_summary` | IB commission reporting |

### Period & Snapshot Functions
| Function | Purpose |
|----------|---------|
| `is_period_locked` | Check if period is locked |
| `lock_fund_period_snapshot` | Lock period for reconciliation |
| `unlock_fund_period_snapshot` | Unlock period |
| `generate_fund_period_snapshot` | Generate period snapshot |
| `get_period_ownership` | Get ownership at period end |

### Admin & Integrity Functions
| Function | Purpose |
|----------|---------|
| `is_admin` | Check admin status |
| `is_super_admin` | Check super admin status |
| `run_integrity_monitoring` | Run system integrity checks |
| `get_user_admin_status` | Get detailed admin status |

### Withdrawal Workflow Functions
| Function | Purpose |
|----------|---------|
| `approve_withdrawal` | Approve pending withdrawal |
| `reject_withdrawal` | Reject pending withdrawal |
| `process_withdrawal` | Process approved withdrawal |
| `cancel_withdrawal` | Cancel withdrawal request |

### Report Functions
| Function | Purpose |
|----------|---------|
| `get_statement_period_summary` | Period summary for statements |
| `queue_statement_deliveries` | Queue statements for delivery |
| `get_delivery_stats` | Delivery statistics |
| `get_historical_nav` | Historical NAV data |

---

## Key Test Assertions

### Position Reconciliation
```typescript
// Position must equal sum of non-voided transactions
const calculatedPosition = transactions
  .filter(t => !t.is_voided)
  .reduce((sum, t) => {
    if (['DEPOSIT', 'YIELD', 'INTEREST'].includes(t.type)) return sum + t.amount;
    if (['WITHDRAWAL', 'FEE'].includes(t.type)) return sum - t.amount;
    return sum;
  }, 0);

expect(storedPosition).toBeCloseTo(calculatedPosition, 10);
```

### Ownership Percentage
```typescript
// Total ownership must equal 100%
const totalOwnership = positions.reduce((sum, p) => sum + p.ownership_pct, 0);
expect(totalOwnership).toBeCloseTo(100, 8);
```

### Anti-Dilution
```typescript
// Yield crystallization before transaction
const yieldBefore = investor.accrued_yield;
const ownershipBefore = investor.ownership_pct;

await performDeposit(newInvestor, fund, amount, date);

// Original investor's crystallized yield should use OLD ownership %
const crystallizedYield = yieldBefore * ownershipBefore / 100;
expect(investor.crystallized_yield).toBeCloseTo(crystallizedYield, 10);
```

---

## CI/CD Integration

```yaml
# .github/workflows/comprehensive-tests.yml
name: Comprehensive E2E Tests

on:
  push:
    branches: [main, develop]
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Run Comprehensive Tests
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npx playwright test tests/comprehensive/ --reporter=github
```

---

## Success Criteria

| Suite | Target Pass Rate | Priority |
|-------|------------------|----------|
| **Data Integrity** | 100% | CRITICAL |
| Transactions | 100% | CRITICAL |
| Yields | 100% | CRITICAL |
| Fees | 100% | CRITICAL |
| Reconciliation | 100% | CRITICAL |
| Withdrawals | 100% | HIGH |
| Investors | 100% | HIGH |
| IB | 100% | HIGH |
| Void | 100% | HIGH |
| Periods | 100% | MEDIUM |
| Admin | 95%+ | MEDIUM |
| Reports | 95%+ | MEDIUM |
| Edge Cases | 95%+ | MEDIUM |
| Scenarios | 100% | HIGH |

### Priority Definitions

- **CRITICAL**: Financial accuracy tests. Any failure indicates potential money-related bugs.
- **HIGH**: Core workflow tests. Failures affect user-facing operations.
- **MEDIUM**: Operational tests. Failures may affect admin/reporting functions.

Any failure in **CRITICAL** suites requires immediate investigation before deployment.

### Fees Account Verification

The following tests MUST pass to verify fees account behavior:
- `fees/fee-operations.spec.ts` - "should route fees to fees account"
- `fees/fee-operations.spec.ts` - "fees account should receive yield like investor"
- `fees/fee-operations.spec.ts` - "should compound fees account yield"
- `yields/yield-distribution.spec.ts` - "should apply yield to fees account"
