# Comprehensive Transaction Tests

This directory contains comprehensive database-level tests for transaction operations on the Indigo Yield Platform.

## Overview

These tests verify the core financial operations by directly testing database functions and RPC calls using the Supabase client. They are **not UI tests** - they test the business logic layer directly.

## Test Files

### `deposit.spec.ts`

Comprehensive tests for the `apply_deposit_with_crystallization` RPC function.

**Test Coverage:**

1. **Basic Deposit Flow** (5 tests)
   - Deposits to each fund type (IND-BTC, IND-ETH, IND-SOL, IND-USDT, IND-XRP)
   - Transaction type verification
   - Position value updates

2. **Multi-Date Deposits** (4 tests)
   - Deposits on Day 1 of month
   - Deposits on Day 15 of month
   - Deposits on last day of month
   - Effective date verification

3. **Position Calculations** (3 tests)
   - New position creation with first deposit
   - Subsequent deposits increase position value
   - Multiple investors in same fund have independent positions

4. **Amount Precision** (3 tests)
   - Whole numbers: 100, 1000, 10000
   - Decimals: 0.001, 0.00001, 123.456789
   - NUMERIC(28,10) precision verification

5. **Error Handling** (7 tests)
   - Negative amount (should fail)
   - Zero amount (should fail)
   - Non-existent investor_id (should fail)
   - Non-existent fund_id (should fail)
   - Asset mismatch verification
   - Missing transaction-purpose AUM (should fail)

6. **Audit Trail** (4 tests)
   - Audit log entry creation
   - Balance tracking (balance_before, balance_after)
   - Crystallization recording
   - Audit metadata verification

**Total Tests:** 26

## Prerequisites

### 1. Environment Variables

Create a `.env.test.local` file in the project root:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://nkfimvovosdehmyyjubn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here

# Database Direct Connection (optional, for advanced tests)
DATABASE_URL=postgresql://postgres.nkfimvovosdehmyyjubn@aws-0-us-east-2.pooler.supabase.com:5432/postgres

# Test Admin Credentials (must have is_admin() = true)
TEST_ADMIN_EMAIL=testadmin@indigo.fund
TEST_ADMIN_PASSWORD=Indigo!Admin2026#Secure
```

### 2. Database Setup

Ensure the following funds exist in your database:

```sql
-- Verify funds exist
SELECT id, code, name, asset FROM funds
WHERE code IN ('IND-BTC', 'IND-ETH', 'IND-SOL', 'IND-USDT', 'IND-XRP');
```

If funds are missing, seed them:

```sql
INSERT INTO funds (code, name, asset, fund_class, inception_date, status)
VALUES
  ('IND-BTC', 'Indigo Bitcoin Fund', 'BTC', 'A', '2026-01-01', 'active'),
  ('IND-ETH', 'Indigo Ethereum Fund', 'ETH', 'A', '2026-01-01', 'active'),
  ('IND-SOL', 'Indigo Solana Fund', 'SOL', 'A', '2026-01-01', 'active'),
  ('IND-USDT', 'Indigo USDT Fund', 'USDT', 'A', '2026-01-01', 'active'),
  ('IND-XRP', 'Indigo XRP Fund', 'XRP', 'A', '2026-01-01', 'active')
ON CONFLICT (code) DO NOTHING;
```

### 3. Admin User

Create a test admin user with proper permissions:

```sql
-- Create admin user (via Supabase Auth)
-- Then update their profile
UPDATE profiles
SET user_type = 'ADMIN'
WHERE email = 'testadmin@indigo.fund';
```

Verify admin status:

```sql
-- This should return true
SELECT is_admin() FROM profiles WHERE email = 'testadmin@indigo.fund' LIMIT 1;
```

## Running the Tests

### Run All Comprehensive Transaction Tests

```bash
npx playwright test tests/comprehensive/transactions/
```

### Run Only Deposit Tests

```bash
npx playwright test tests/comprehensive/transactions/deposit.spec.ts
```

### Run with UI (Headed Mode)

```bash
npx playwright test tests/comprehensive/transactions/deposit.spec.ts --headed
```

### Run Specific Test Suite

```bash
# Run only basic deposit flow tests
npx playwright test tests/comprehensive/transactions/deposit.spec.ts -g "Basic Deposit Flow"

# Run only error handling tests
npx playwright test tests/comprehensive/transactions/deposit.spec.ts -g "Error Handling"

# Run only audit trail tests
npx playwright test tests/comprehensive/transactions/deposit.spec.ts -g "Audit Trail"
```

### Run in Debug Mode

```bash
npx playwright test tests/comprehensive/transactions/deposit.spec.ts --debug
```

### Run with Verbose Output

```bash
npx playwright test tests/comprehensive/transactions/deposit.spec.ts --reporter=list
```

## Test Results

Tests will output to:

- **Console:** Real-time test results with detailed logging
- **HTML Report:** `test-reports/playwright/index.html`
- **JSON Results:** `test-reports/playwright/results.json`

View HTML report:

```bash
npx playwright show-report test-reports/playwright
```

## Understanding Test Failures

### Common Failure Scenarios

1. **Authentication Failure**
   ```
   Error: Admin authentication failed
   ```
   **Fix:** Verify `TEST_ADMIN_EMAIL` and `TEST_ADMIN_PASSWORD` are correct and the user exists.

2. **Missing Funds**
   ```
   Error: No test funds found
   ```
   **Fix:** Run the fund seeding SQL from the prerequisites section.

3. **RLS Policy Rejection**
   ```
   Error: Only administrators can apply deposits
   ```
   **Fix:** Ensure the test user has `user_type = 'ADMIN'` in the profiles table.

4. **Missing AUM Record**
   ```
   Error: No transaction-purpose AUM record exists
   ```
   **Fix:** This is expected behavior. The test creates AUM records via `ensure_preflow_aum`.

5. **Foreign Key Violation**
   ```
   Error: violates foreign key constraint
   ```
   **Fix:** Ensure test investor IDs exist in the profiles table.

## Test Data Cleanup

The tests are designed to be **additive** - they create new records but do not delete existing data.

To clean up test data manually:

```sql
-- View test transactions
SELECT * FROM transactions_v2
WHERE notes LIKE '%Test deposit%'
ORDER BY created_at DESC
LIMIT 50;

-- Clean up test data (CAUTION: This deletes data!)
DELETE FROM transactions_v2 WHERE notes LIKE '%Test deposit%';
DELETE FROM investor_positions WHERE investor_id LIKE '99999999-9999%';
```

## Continuous Integration

These tests are designed to run in CI/CD pipelines.

### GitHub Actions Example

```yaml
name: Comprehensive Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - name: Run Comprehensive Tests
        run: npx playwright test tests/comprehensive/
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          TEST_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
          TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
```

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Add console.log success messages
4. Document expected behavior in comments
5. Update this README with new test coverage

## License

MIT - Indigo Yield Platform
