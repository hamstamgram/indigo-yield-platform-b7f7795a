# QA Test World Fixtures

Phase 2 test fixtures for the Indigo Yield Platform QA harness.

## Files

### `test-world.ts`
Defines constants and types for the test world:
- **8 Test Investors**: Various scenarios (early depositor, mid-month, withdrawer, multi-fund, IB-referred, zero balance, dust test, correction target)
- **2 Test IBs**: Primary (5% commission) and Secondary (3% commission)
- **6 Funds**: IND-BTC, IND-ETH, IND-SOL, IND-USDT, IND-EURC, IND-XRP

### `setup-test-world.ts`
Setup script that creates the test world:
```bash
npx tsx tests/qa/fixtures/setup-test-world.ts
```

**Requirements:**
- `VITE_SUPABASE_URL` environment variable
- `SUPABASE_SERVICE_ROLE_KEY` environment variable

**What it does:**
1. Looks up fund IDs by slug
2. Creates 2 test IBs with commission rates
3. Creates 8 test investors (one referred by IB)
4. Applies deposits using `apply_deposit_with_crystallization` RPC
5. Applies withdrawals using `apply_withdrawal_with_crystallization` RPC
6. Saves state to `test-world-state.json`

**Rate limiting:**
- 1 second delay between mutations to avoid rate limits

### `teardown-test-world.ts`
Cleanup script that removes the test world:
```bash
npx tsx tests/qa/fixtures/teardown-test-world.ts
```

**What it does:**
1. Reads `test-world-state.json`
2. Voids all tagged transactions using `void_transaction` RPC
3. Deletes test profiles using `force_delete_investor` RPC
4. Deletes auth users
5. Removes state file

## Test Scenarios

| Investor | Scenario | Funds | Deposits | Withdrawals |
|----------|----------|-------|----------|-------------|
| qa-early-depositor | Full month exposure | IND-USDT | 10,000 USDT (Jan 1) | - |
| qa-mid-month-dep | Half month exposure | IND-USDT | 5,000 USDT (Jan 15) | - |
| qa-withdrawer | Full lifecycle | IND-BTC | 0.5 BTC (Jan 5) | 0.25 BTC (Jan 20) |
| qa-multi-fund | Diversified portfolio | IND-USDT, IND-BTC | 8,000 USDT + 0.3 BTC (Jan 3) | - |
| qa-ib-referred | IB commission test | IND-USDT | 12,000 USDT (Jan 10) | - |
| qa-zero-balance | Zero/negative guards | IND-ETH | 2 ETH (Jan 7) | 2 ETH (Jan 25) |
| qa-dust-test | Precision/rounding | IND-BTC | 0.00000001 BTC (Jan 12) | - |
| qa-correction-target | Void/reissue scenarios | IND-SOL | 500 SOL (Jan 8) | - |

## State File Format

`test-world-state.json`:
```json
{
  "runTag": "qa-run-2026-02-02T05-45-00",
  "timestamp": "2026-02-02T05:45:00.000Z",
  "funds": {
    "IND-BTC": "uuid",
    "IND-ETH": "uuid",
    ...
  },
  "investors": {
    "qa-early-depositor": "uuid",
    "qa-mid-month-dep": "uuid",
    ...
  },
  "ibs": {
    "qa-ib-primary": "uuid",
    "qa-ib-secondary": "uuid"
  },
  "transactionIds": ["uuid1", "uuid2", ...]
}
```

## Usage Example

```bash
# Setup test world
npx tsx tests/qa/fixtures/setup-test-world.ts

# Run QA tests (Phase 3)
npx tsx tests/qa/run-qa-tests.ts

# Teardown test world
npx tsx tests/qa/fixtures/teardown-test-world.ts
```

## Notes

- All test entities are tagged with `qa-run-{timestamp}` for easy cleanup
- Uses canonical RPCs (`apply_deposit_with_crystallization`, etc.)
- Includes 1-second rate limit delays between mutations
- QA admin user must exist (qa.admin@indigo.fund)
- All auth users have password: `QaTest2026!`
