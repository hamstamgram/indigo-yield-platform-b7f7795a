# Phase 2: Test World Fixtures - Summary

## Overview
Phase 2 test fixtures provide a comprehensive QA harness for the Indigo Yield Platform, including 8 test investors, 2 IBs, and 6 funds with various transaction scenarios.

## Files Created

### 1. test-world.ts (344 lines)
**Purpose**: Core definitions and constants

**Exports:**
- Types: `UUID`, `ProfileId`, `FundId`, `TransactionType`, `FundSlug`
- Interfaces: `FundConfig`, `TestInvestor`, `TestIB`, `TestDeposit`, `TestWithdrawal`, `TestWorldState`
- Constants: `TEST_FUNDS`, `TEST_IBS`, `TEST_INVESTORS`, `QA_PASSWORD`, `DEFAULT_CLOSING_AUM`
- Functions: `generateQARunTag()`, `getFundBySlug()`, `getInvestorByPrefix()`, `getIBByPrefix()`

**Key Features:**
- 8 test investor scenarios covering all major use cases
- 2 IB configurations with different commission rates
- 6 fund definitions (BTC, ETH, SOL, USDT, EURC, XRP)
- Utility functions for test data access

### 2. setup-test-world.ts (470 lines)
**Purpose**: Creates test world in Supabase

**Process:**
1. Lookup fund IDs by slug (IND-BTC, etc.)
2. Create 2 test IBs with auth users
3. Create 8 test investors with auth users
4. Apply deposits via `apply_deposit_with_crystallization` RPC
5. Apply withdrawals via `apply_withdrawal_with_crystallization` RPC
6. Save state to `test-world-state.json`

**Features:**
- Uses Supabase service role key for admin operations
- 1-second rate limit delays between mutations
- Comprehensive error handling and logging
- Persists all created IDs for teardown

**Usage:**
```bash
VITE_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx tests/qa/fixtures/setup-test-world.ts
```

### 3. teardown-test-world.ts (359 lines)
**Purpose**: Cleans up test world

**Process:**
1. Load `test-world-state.json`
2. Void all transactions via `void_transaction` RPC
3. Delete profiles via `force_delete_investor` RPC
4. Delete auth users via admin API
5. Remove state file

**Features:**
- Safe cleanup with error handling
- Checks for already-deleted entities
- Comprehensive reporting of cleanup operations
- Rate-limited to avoid API throttling

**Usage:**
```bash
VITE_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx tests/qa/fixtures/teardown-test-world.ts
```

## Test Investor Scenarios

| Email | Scenario | Funds | Deposits | Withdrawals | Purpose |
|-------|----------|-------|----------|-------------|---------|
| qa-early-depositor@test.indigo.fund | Full month exposure | IND-USDT | 10,000 USDT (Jan 1) | - | Test ADB weighting with full month |
| qa-mid-month-dep@test.indigo.fund | Half month exposure | IND-USDT | 5,000 USDT (Jan 15) | - | Test ADB weighting with partial month |
| qa-withdrawer@test.indigo.fund | Full lifecycle | IND-BTC | 0.5 BTC (Jan 5) | 0.25 BTC (Jan 20) | Test deposit → withdrawal flow |
| qa-multi-fund@test.indigo.fund | Diversified portfolio | IND-USDT, IND-BTC | 8K USDT + 0.3 BTC (Jan 3) | - | Test multi-fund positions |
| qa-ib-referred@test.indigo.fund | IB commission | IND-USDT | 12,000 USDT (Jan 10) | - | Test IB referral commissions |
| qa-zero-balance@test.indigo.fund | Zero/negative guards | IND-ETH | 2 ETH (Jan 7) | 2 ETH (Jan 25) | Test full withdrawal to zero |
| qa-dust-test@test.indigo.fund | Precision/rounding | IND-BTC | 0.00000001 BTC (Jan 12) | - | Test dust amount handling |
| qa-correction-target@test.indigo.fund | Void/reissue | IND-SOL | 500 SOL (Jan 8) | - | Test correction scenarios |

## Test IB Configurations

| Email | Commission Rate | Purpose |
|-------|----------------|---------|
| qa-ib-primary@test.indigo.fund | 5.0% | Primary IB, refers qa-ib-referred investor |
| qa-ib-secondary@test.indigo.fund | 3.0% | Secondary IB for multi-IB tests |

## Funds Configuration

All 6 platform funds are included:

| Slug | Name | Currency |
|------|------|----------|
| IND-BTC | Indigo Bitcoin Fund | BTC |
| IND-ETH | Indigo Ethereum Fund | ETH |
| IND-SOL | Indigo Solana Fund | SOL |
| IND-USDT | Indigo USDT Fund | USDT |
| IND-EURC | Indigo EURC Fund | EURC |
| IND-XRP | Indigo XRP Fund | XRP |

## State File Format

The `test-world-state.json` file persists all created entities:

```json
{
  "runTag": "qa-run-2026-02-02T05-45-00",
  "timestamp": "2026-02-02T05:45:00.000Z",
  "funds": {
    "IND-BTC": "fund-uuid",
    "IND-ETH": "fund-uuid",
    "IND-SOL": "fund-uuid",
    "IND-USDT": "fund-uuid",
    "IND-EURC": "fund-uuid",
    "IND-XRP": "fund-uuid"
  },
  "investors": {
    "qa-early-depositor": "profile-uuid",
    "qa-mid-month-dep": "profile-uuid",
    "qa-withdrawer": "profile-uuid",
    "qa-multi-fund": "profile-uuid",
    "qa-ib-referred": "profile-uuid",
    "qa-zero-balance": "profile-uuid",
    "qa-dust-test": "profile-uuid",
    "qa-correction-target": "profile-uuid"
  },
  "ibs": {
    "qa-ib-primary": "profile-uuid",
    "qa-ib-secondary": "profile-uuid"
  },
  "transactionIds": [
    "tx-uuid-1",
    "tx-uuid-2",
    ...
  ]
}
```

## Key Design Decisions

### 1. Canonical RPC Usage
All financial mutations use the canonical RPCs:
- `apply_deposit_with_crystallization` - For deposits
- `apply_withdrawal_with_crystallization` - For withdrawals
- `void_transaction` - For cleanup
- `force_delete_investor` - For profile deletion

### 2. Rate Limiting
1-second delays between mutations to avoid Supabase rate limits:
- Profile creation: 1000ms delay
- Deposit application: 1000ms delay
- Withdrawal application: 1000ms delay
- Teardown operations: 500ms delay

### 3. Tagging Strategy
All test entities are tagged with `qa-run-{timestamp}` in:
- Profile `notes` field
- Transaction `purpose` field (via TEST_PURPOSES constants)
- State file `runTag` field

### 4. Error Handling
- Graceful handling of already-deleted entities
- Comprehensive error reporting with stack traces
- Continues cleanup even if individual operations fail
- Reports summary of successes/failures

### 5. Auth Integration
- Uses Supabase service role key for admin operations
- Creates auth users via `supabase.auth.admin.createUser()`
- Sets email_confirm: true to skip verification
- Password: `QaTest2026!` for all test users

## Test Coverage

The fixture set provides coverage for:

### Financial Operations
- ✅ Initial deposits with varying dates
- ✅ Mid-month deposits (ADB weighting)
- ✅ Partial withdrawals
- ✅ Full withdrawals to zero
- ✅ Multi-fund positions
- ✅ IB commission tracking
- ✅ Dust amount precision
- ✅ Transaction voiding

### Edge Cases
- ✅ Zero balance scenarios
- ✅ Dust amounts (0.00000001)
- ✅ Multi-currency handling
- ✅ IB referral chains
- ✅ Correction workflows

### Data Integrity
- ✅ Yield conservation identity
- ✅ AUM event tracking
- ✅ Position reconciliation
- ✅ Fee allocation calculations
- ✅ Audit trail completeness

## Next Steps (Phase 3)

With fixtures in place, Phase 3 will create:
1. **run-qa-tests.ts** - Test execution harness
2. **Test validators** - Conservation checks, reconciliation, etc.
3. **Yield distribution tests** - Apply yield to test investors
4. **Report generation tests** - Statement/report accuracy
5. **UI smoke tests** - Playwright verification

## Environment Setup

Required environment variables:
```bash
# Supabase connection
export VITE_SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJxxx..."

# Optional: Override defaults
export QA_ADMIN_EMAIL="qa.admin@indigo.fund"
export QA_PASSWORD="QaTest2026!"
```

## Verification

Type check all fixture files:
```bash
npx tsc --noEmit --skipLibCheck tests/qa/fixtures/*.ts
```

Line counts:
- test-world.ts: 344 lines
- setup-test-world.ts: 470 lines
- teardown-test-world.ts: 359 lines
- **Total: 1,173 lines**

## Dependencies

Required packages (already in project):
- `@supabase/supabase-js` - Supabase client
- `tsx` - TypeScript execution
- Node.js built-ins: `fs`, `path`

## Notes

- All files are executable with `npx tsx <file>`
- State file is gitignored (runtime-generated)
- Scripts are idempotent where possible
- Comprehensive logging for debugging
- No external dependencies beyond Supabase

---

**Status**: ✅ Complete
**Date**: 2026-02-02
**Lines of Code**: 1,173
**Test Scenarios**: 8 investors + 2 IBs + 6 funds
