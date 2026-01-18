# Yield Crystallization Test Suite

## Overview

This directory contains comprehensive E2E tests for the **Yield Crystallization** feature of the Indigo Yield Platform.

## What is Yield Crystallization?

Yield crystallization is the process of "locking in" accrued yield and making it a permanent part of an investor's position balance. It occurs at specific trigger points:

1. **Withdrawal** - Before processing a withdrawal
2. **Deposit** - Before processing a new deposit (for existing positions)
3. **Month-End** - Monthly batch crystallization for all investors
4. **Manual** - Admin-initiated crystallization (edge cases)

## Test File Structure

### `yield-crystallization.spec.ts`

Comprehensive test suite covering all crystallization scenarios.

## Test Coverage

### 1. Crystallization on Withdrawal
- ✅ Crystallize yield before withdrawal
- ✅ Partial withdrawal with yield crystallization
- ✅ Same-day withdrawal (zero yield)
- ✅ Transaction ordering (YIELD before WITHDRAWAL)
- ✅ Position balance accuracy

### 2. Crystallization on Deposit
- ✅ Crystallize yield before new deposit
- ✅ First investment (no crystallization)
- ✅ Transaction ordering (YIELD before DEPOSIT)
- ✅ Position balance accuracy

### 3. Month-End Crystallization
- ✅ Batch crystallization for all investors
- ✅ Visibility scope transition (admin_only → investor_visible)
- ✅ Partial month calculation (mid-month deposits)

### 4. Crystallization Date Accuracy
- ✅ 14-day scenario: Deposit Jan 1, Withdraw Jan 15
- ✅ 30-day scenario: Deposit Jan 1, Month-end Jan 31
- ✅ 16-day scenario: Deposit Jan 15, Month-end Jan 31
- ✅ Period start/end date verification

### 5. Multiple Crystallizations in Same Month
- ✅ Independent crystallization events
- ✅ Accurate balance through multiple crystallizations
- ✅ Scenario: Deposit → Withdraw → Deposit → Month-end

### 6. Zero Yield Crystallization
- ✅ Same-day deposit/withdrawal (0 days)
- ✅ Zero yield rate handling
- ✅ Rounding to zero (micro-amounts)

### 7. Visibility Scope
- ✅ Initial visibility (admin_only)
- ✅ Transition to investor_visible after month-end finalization
- ✅ Investor can see visible yield events
- ✅ made_visible_at and made_visible_by tracking

### 8. Edge Cases
- ✅ Crystallization across month boundaries
- ✅ Idempotency (no duplicate events on retry)

## Database Schema

### Key Tables

#### `investor_yield_events`
Stores crystallization records.

```sql
CREATE TABLE investor_yield_events (
  id UUID PRIMARY KEY,
  investor_id UUID NOT NULL,
  fund_id UUID NOT NULL,
  event_date DATE NOT NULL,
  trigger_type TEXT NOT NULL, -- 'withdrawal', 'deposit', 'month_end'
  trigger_transaction_id UUID,

  -- Yield calculation
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  days_in_period INTEGER NOT NULL,
  fund_yield_pct NUMERIC(10,4),

  -- Amounts
  investor_balance NUMERIC(20,8),
  gross_yield_amount NUMERIC(20,8),
  fee_amount NUMERIC(20,8),
  fee_pct NUMERIC(10,4),
  net_yield_amount NUMERIC(20,8),

  -- Fund context
  fund_aum_before NUMERIC(20,8),
  fund_aum_after NUMERIC(20,8),
  investor_share_pct NUMERIC(10,6),

  -- Visibility
  visibility_scope TEXT DEFAULT 'admin_only', -- 'admin_only' | 'investor_visible'
  made_visible_at TIMESTAMPTZ,
  made_visible_by UUID,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  is_voided BOOLEAN DEFAULT FALSE,
  voided_at TIMESTAMPTZ,
  voided_by UUID,

  reference_id TEXT
);
```

#### `investor_positions`
Tracks `last_yield_crystallization_date` and `cumulative_yield_earned`.

```sql
ALTER TABLE investor_positions ADD COLUMN last_yield_crystallization_date DATE;
ALTER TABLE investor_positions ADD COLUMN cumulative_yield_earned NUMERIC(20,8) DEFAULT 0;
```

## Expected Behavior

### Crystallization Flow

```
1. Transaction Initiated (WITHDRAWAL or DEPOSIT)
   ↓
2. Check if yield needs crystallization
   - Get last_yield_crystallization_date from investor_positions
   - Calculate days since last crystallization
   ↓
3. If days > 0, create yield event
   - Calculate gross_yield_amount
   - Calculate fee_amount (based on fee_pct)
   - Calculate net_yield_amount = gross - fee
   ↓
4. Create YIELD transaction
   - Insert into transactions_v2
   - Type = 'YIELD'
   - Amount = net_yield_amount
   - Created BEFORE the triggering transaction
   ↓
5. Update investor_positions
   - current_value += net_yield_amount
   - cumulative_yield_earned += net_yield_amount
   - last_yield_crystallization_date = event_date
   ↓
6. Insert investor_yield_events record
   - trigger_type = 'withdrawal' | 'deposit' | 'month_end'
   - visibility_scope = 'admin_only' (initially)
   ↓
7. Continue with original transaction (WITHDRAWAL or DEPOSIT)
```

### Month-End Finalization Flow

```
1. Generate month-end crystallization for all positions
   - visibility_scope = 'admin_only'
   ↓
2. Admin reviews yield events
   ↓
3. Admin finalizes/approves month-end
   ↓
4. Update all month-end yield events:
   - visibility_scope = 'investor_visible'
   - made_visible_at = NOW()
   - made_visible_by = admin_user_id
   ↓
5. Investors can now see their month-end yield
```

## Running the Tests

### Run all yield crystallization tests
```bash
npx playwright test tests/comprehensive/yields/yield-crystallization.spec.ts
```

### Run specific test suite
```bash
npx playwright test tests/comprehensive/yields/yield-crystallization.spec.ts -g "Crystallization on Withdrawal"
```

### Run with headed browser (debug mode)
```bash
npx playwright test tests/comprehensive/yields/yield-crystallization.spec.ts --headed
```

### Generate HTML report
```bash
npx playwright test tests/comprehensive/yields/yield-crystallization.spec.ts --reporter=html
npx playwright show-report
```

## Test Data

### Date Scenarios
- **January 2026**: Primary test month
  - Jan 1: Month start, deposits
  - Jan 10: Mid-month withdrawal
  - Jan 15: Mid-month transaction
  - Jan 20: Late-month deposit
  - Jan 31: Month-end crystallization

### Yield Rates
- Daily: 0.1% (for testing)
- Monthly: ~3.0%
- Annual: ~36.5%

## Implementation Notes

### TODO Items

The test file includes several `TODO` comments for helper function implementations:

1. **setupInvestorWithYield**: Create investor, deposit, and wait for yield accrual
2. **executeWithdrawal**: Execute withdrawal via API (triggers crystallization)
3. **executeDeposit**: Execute deposit via API (triggers crystallization for existing positions)
4. **runMonthEndCrystallization**: Trigger month-end batch crystallization
5. **finalizeMonthEndYield**: Update visibility scope to investor_visible

These functions should integrate with your existing API endpoints or database procedures.

### Database Connection

The tests use the Supabase connection string:
```
postgresql://postgres.nkfimvovosdehmyyjubn@aws-0-us-east-2.pooler.supabase.com:5432/postgres
```

Ensure the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables are set.

## Assertions

The tests verify:

1. **Data Integrity**
   - Yield events are created with correct trigger_type
   - Period calculations are accurate (days_in_period)
   - Amount calculations are correct (gross, fee, net)

2. **Transaction Ordering**
   - YIELD transaction is created BEFORE triggering transaction
   - created_at timestamps are in correct order

3. **Position Accuracy**
   - current_value = old_value + yield ± transaction
   - last_yield_crystallization_date is updated
   - cumulative_yield_earned tracks total yield

4. **Visibility Control**
   - Initial visibility is admin_only
   - Month-end finalization makes yield investor_visible
   - Investors only see visible yield events

## Expected Results

All tests should pass, demonstrating:
- Correct yield crystallization on all triggers
- Accurate date range calculations
- Proper transaction ordering
- Visibility scope management
- Balance accuracy through multiple crystallizations

## Troubleshooting

### Common Issues

1. **Helper functions not implemented**
   - Solution: Implement the TODO functions to interact with your API

2. **Database connection errors**
   - Solution: Verify environment variables are set correctly

3. **Test data conflicts**
   - Solution: Ensure cleanup functions properly reset test state

4. **Timing issues**
   - Solution: Use proper wait functions from assertHelper

## Related Documentation

- [Withdrawal Flow](../../docs/workflows/FC-006-Unit-Redemption-Process.md)
- [Investor Onboarding](../../docs/workflows/FC-001-Investor-Onboarding-Flow.md)
- [Database Schema](../../src/contracts/dbSchema.ts)
- [Transaction Types](../../src/contracts/dbEnums.ts)

## Support

For questions or issues with the yield crystallization tests, contact the platform development team.
