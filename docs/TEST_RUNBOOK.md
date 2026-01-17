# Test Runbook

Zero-Error Full-Stack Contract Testing Harness

## Overview

This test harness ensures EVERY operation works end-to-end by validating contracts between frontend expectations and backend reality. It catches mismatches before they reach production.

## Quick Start

```bash
# Run the full test suite
npm run test:full

# Or run individual steps
npm run schema:snapshot      # Generate schema from DB
npm run contracts:verify     # Verify frontend contracts
npm run contracts:scan       # Scan frontend for invalid queries
npm run seed:golden          # Seed test data
npm run flows:run            # Run business flow tests
npm run test:e2e             # Run Playwright E2E tests
```

## Test Pipeline

```
┌─────────────────┐
│  1. Schema      │  Generate schema-snapshot.json from live DB
│     Snapshot    │  Extracts: tables, columns, enums, functions, views
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Contract    │  Compare snapshot against frontend contracts
│     Verify      │  Files: dbSchema.ts, dbEnums.ts, rpcSignatures.ts
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Query       │  Scan TS/TSX for invalid DB access patterns
│     Scan        │  Catches: bad columns, invalid enums, protected mutations
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Golden      │  Create deterministic test data
│     Seed        │  Fund: TEST-ALPHA, Investors: Alice/Bob/Carol
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. Flow        │  Execute business flows via RPC
│     Pack        │  Yield preview, position reconciliation, integrity checks
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  6. E2E         │  Playwright browser tests
│     Tests       │  Full user journey through UI
└─────────────────┘
```

## Components

### 1. Schema Snapshot Generator

**File:** `scripts/contracts/generate-schema-snapshot.ts`

Connects to the database and extracts complete schema truth:
- Tables + columns + types + nullability + defaults
- Primary keys (including composite PK detection)
- Foreign keys (relationships)
- Enums + values
- Views + columns
- RPC functions + argument list + types + defaults

**Output:** `artifacts/schema-snapshot.json`

```bash
npm run schema:snapshot
```

### 2. Contract Verification

**File:** `scripts/contracts/verify-schema-against-frontend.ts`

Compares schema snapshot against frontend contracts:

| Contract File | What It Contains |
|---------------|------------------|
| `src/contracts/dbSchema.ts` | Table definitions, columns, primary keys |
| `src/contracts/dbEnums.ts` | Enum values (TX_TYPE, AUM_PURPOSE, etc.) |
| `src/contracts/rpcSignatures.ts` | RPC function names |

**Fails if:**
- Frontend references a table/column that does not exist
- Frontend expects "id" where PK is composite
- Frontend uses enum value not present in DB (e.g., FIRST_INVESTMENT in DB calls)
- RPC name missing or signature mismatch

```bash
npm run contracts:verify
```

### 3. Frontend Query Scanner

**File:** `scripts/contracts/scan-frontend-queries.ts`

Scans all TS/TSX files in `src/` for:
- `.select()` strings with columns not in schema
- `.from().join()` referencing non-existent relations
- Any raw `.from().insert/update/delete` on protected tables
- `.rpc()` calls outside `src/lib/rpc.ts` gateway

**Protected Tables** (direct mutations forbidden):
- transactions_v2
- yield_distributions
- yield_allocations
- fee_allocations
- ib_allocations
- fund_daily_aum
- investor_positions

```bash
npm run contracts:scan
```

### 4. Golden Path Seeder

**File:** `scripts/seed/seed-golden-path.ts`

Creates deterministic test data with stable UUIDs:

| Entity | ID (UUID) | Details |
|--------|-----------|---------|
| Fund Alpha | `00000000-0000-4000-a000-000000000001` | TEST-ALPHA, USDT |
| Admin | `00000000-0000-4000-a000-000000000010` | test-admin |
| Indigo Fees | `00000000-0000-4000-a000-000000000020` | fees_account |
| Alice | `00000000-0000-4000-a000-000000000100` | 15k USDT, 20% fee |
| Bob | `00000000-0000-4000-a000-000000000101` | 25k USDT, IB relationship |
| Carol | `00000000-0000-4000-a000-000000000102` | 40k USDT, VIP (15% fee) |
| Dave (IB) | `00000000-0000-4000-a000-000000000200` | 5% commission |

**Total AUM:** 80,000 USDT

```bash
npm run seed:golden
```

### 5. Flow Pack Runner

**File:** `scripts/flows/run-flow-pack.ts`

Executes complete business flows via RPC calls:

1. **Yield Distribution Flow**
   - Get current AUM
   - Preview yield (0.5% daily return)
   - Verify math: gross - fees - IB = net
   - Verify IB commission for Bob
   - Check for conflicts

2. **Position Reconciliation Flow**
   - Get investor position
   - Run reconciliation RPC
   - Get position as-of date

3. **Admin Permission Check**
   - Verify `is_admin` RPC
   - Verify admin profile

4. **Integrity View Checks**
   - v_ledger_reconciliation
   - v_position_transaction_variance
   - v_yield_conservation_check

5. **Transaction Query Validation**
   - Query with valid tx_type values
   - Verify FIRST_INVESTMENT is rejected

```bash
npm run flows:run
```

### 6. Playwright E2E Tests

**File:** `tests/e2e/golden-path.spec.ts`

Browser-based tests for full user journey:
- Application loads
- Admin can log in
- Fund list displays TEST-ALPHA
- Yield preview page loads without errors
- Preview yield shows correct calculations
- Investor positions show correct data
- No critical console errors during navigation
- API calls return valid responses
- Form validation works
- Logout redirects to login

```bash
npm run test:e2e
```

## NPM Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "schema:snapshot": "npx ts-node --esm scripts/contracts/generate-schema-snapshot.ts",
    "contracts:verify": "npx ts-node --esm scripts/contracts/verify-schema-against-frontend.ts",
    "contracts:scan": "npx ts-node --esm scripts/contracts/scan-frontend-queries.ts",
    "seed:golden": "npx ts-node --esm scripts/seed/seed-golden-path.ts",
    "flows:run": "npx ts-node --esm scripts/flows/run-flow-pack.ts",
    "test:e2e": "playwright test tests/e2e/golden-path.spec.ts",
    "test:contracts": "npm run schema:snapshot && npm run contracts:verify && npm run contracts:scan",
    "test:full": "npm run test:contracts && npm run seed:golden && npm run flows:run"
  }
}
```

## CI/CD Integration

The test pipeline runs automatically on:
- Pull requests to `main` or `develop`
- Pushes to `main`
- Manual trigger (workflow_dispatch)

**Workflow:** `.github/workflows/golden-path.yml`

**Jobs:**
1. `db-integrity` - Database migrations and integrity checks
2. `contract-validation` - Schema snapshot and contract verification
3. `flow-pack-tests` - Seed data and run flow packs
4. `golden-path-tests` - Playwright E2E tests
5. `integrity-monitor` - Integrity view validation
6. `summary` - Report results and fail if critical jobs fail

## Common Issues & Fixes

### "invalid input value for enum tx_type: FIRST_INVESTMENT"

**Cause:** SQL functions reference `FIRST_INVESTMENT` which is UI-only.

**Fix:** Use `DEPOSIT` for database operations. `FIRST_INVESTMENT` belongs in `UI_TX_TYPE_VALUES`, not `TX_TYPE_VALUES`.

### "column yd.yield_date does not exist"

**Cause:** `yield_distributions` table uses `effective_date` or `period_start`, not `yield_date`.

**Fix:** Migration adds `yield_date` column with sync trigger:
```sql
ALTER TABLE yield_distributions ADD COLUMN yield_date date;
UPDATE yield_distributions SET yield_date = COALESCE(effective_date, period_start);
```

### "Table has composite PK but frontend expects 'id'"

**Cause:** Tables like `investor_positions` use `(investor_id, fund_id)` as PK.

**Fix:** Update `DB_TABLES` in `dbSchema.ts` to use correct `primaryKey` array.

### "RPC outside gateway"

**Cause:** Direct `.rpc()` calls outside `src/lib/rpc.ts`.

**Fix:** Import and use typed wrappers from the RPC gateway.

## Maintenance

### Adding New Tables

1. Add table definition to `src/contracts/dbSchema.ts`
2. Run `npm run schema:snapshot` to verify
3. Run `npm run contracts:verify` to validate

### Adding New Enums

1. Add enum values to `src/contracts/dbEnums.ts`
2. Distinguish between DB enums (`TX_TYPE_VALUES`) and UI-only (`UI_TX_TYPE_VALUES`)
3. Run `npm run contracts:verify` to validate

### Adding New RPCs

1. Add function name to `src/contracts/rpcSignatures.ts`
2. Create typed wrapper in `src/lib/rpc.ts`
3. Run `npm run flows:run` to test

## Troubleshooting

### Schema snapshot fails

Check environment variables:
```bash
echo $VITE_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### E2E tests fail to log in

Set test credentials:
```bash
export TEST_ADMIN_EMAIL=admin@test.indigo.com
export TEST_ADMIN_PASSWORD=testpassword123
```

### Flow pack shows 0 AUM

Run the golden path seeder first:
```bash
npm run seed:golden
```

## Exit Codes

| Script | Exit 0 | Exit 1 |
|--------|--------|--------|
| schema:snapshot | Snapshot generated | DB connection failed |
| contracts:verify | All contracts valid | Mismatches found |
| contracts:scan | No violations | Errors found |
| seed:golden | Data seeded | Seeding failed |
| flows:run | All flows pass | Flow failures |
| test:e2e | All tests pass | Test failures |

---

**Zero drift. Zero surprises. Every operation proven working.**
