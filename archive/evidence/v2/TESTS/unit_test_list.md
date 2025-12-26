# Unit Test Inventory

## Test Files

### 1. `tests/unit/services/transactionIdempotency.test.ts`
| Test ID | Test Name | Description |
|---------|-----------|-------------|
| TI-01 | Consistent reference_id | Same inputs generate same reference_id |
| TI-02 | Unique reference_id | Different inputs generate different IDs |
| TI-03 | Reference_id components | All required fields included in ID |
| TI-04 | Duplicate detection | Identifies existing transactions |
| TI-05 | Empty set handling | Works with no existing transactions |
| TI-06 | Case sensitivity | Reference IDs are case-sensitive |
| TI-07 | INTERNAL_CREDIT validation | Validates new tx_type enum values |
| TI-08 | Invalid type rejection | Rejects unknown transaction types |
| TI-09 | Batch filtering | Filters duplicates from batch |
| TI-10 | All duplicates case | Returns empty for all-duplicate batch |

### 2. `tests/unit/utils/tokenFormatting.test.ts`
| Test ID | Test Name | Description |
|---------|-----------|-------------|
| TF-01 | Module exports | Functions are exported correctly |
| TF-02 | BTC formatting | 8 decimal places, BTC symbol |
| TF-03 | USDT formatting | 2 decimal places, USDT symbol |
| TF-04 | ETH formatting | Appropriate precision |
| TF-05 | Zero amounts | Handles 0 correctly |
| TF-06 | Negative amounts | Handles negatives correctly |
| TF-07 | No dollar sign | Never outputs $ as currency |
| TF-08 | No currency style | Doesn't use Intl currency format |
| TF-09 | BTC asset config | Returns correct decimals/symbol |
| TF-10 | USDT asset config | Returns correct decimals/symbol |
| TF-11 | Unknown asset fallback | Handles unknown assets gracefully |
| TF-12 | Large numbers | Handles 1B+ values |
| TF-13 | Small numbers | Handles 0.00000001 values |
| TF-14 | Null/undefined | Doesn't throw for edge cases |

### 3. `tests/unit/utils/tokenFormatting.test.ts` (Existing - Updated)
Original placeholder tests replaced with comprehensive coverage.

## Total Unit Test Count

| Category | Tests |
|----------|-------|
| Transaction Idempotency | 10 |
| Token Formatting | 14 |
| **TOTAL** | **24** |

## Running Tests

```bash
# Run all unit tests
npm run test

# Run specific test file
npm run test -- tests/unit/services/transactionIdempotency.test.ts

# Run with coverage
npm run test -- --coverage

# Run in watch mode
npm run test -- --watch
```

## Key Assertions

### Transaction Idempotency
- `reference_id` format: `{wizard_type}_{investor_id}_{fund_id}_{date}_{amount}`
- Duplicate detection via Set lookup
- Batch filtering removes existing transactions
- Validates `INTERNAL_CREDIT` and `INTERNAL_WITHDRAWAL` types

### Token Formatting
- No `$` symbol as currency prefix
- No `USD` in output (except USDT/USDC tokens)
- Correct decimal places per asset:
  - BTC: 8 decimals
  - ETH: 8 decimals  
  - USDT/USDC: 2 decimals
  - SOL: 8 decimals
- Graceful handling of edge cases

## Coverage Targets

| Area | Target | Current |
|------|--------|---------|
| Statements | 80% | TBD |
| Branches | 75% | TBD |
| Functions | 80% | TBD |
| Lines | 80% | TBD |
