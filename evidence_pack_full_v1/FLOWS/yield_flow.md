# Yield Distribution Flow

## Generated: 2024-12-22

## Overview

Yield distribution is the core financial operation that:
1. Calculates returns for each investor per fund
2. Deducts fees and routes to INDIGO FEES
3. Credits IB commissions
4. Updates investor balances
5. Creates audit trail

## Distribution Workflow

### Step 1: Preview (Dry Run)
```typescript
// Preview calculates without committing
const preview = await supabase.rpc('preview_yield_distribution', {
  p_fund_id: fundId,
  p_period_start: periodStart,
  p_period_end: periodEnd,
  p_yield_rate: yieldRate
});
```

### Step 2: Review Preview Results
- Shows each investor's:
  - Beginning balance
  - Gross yield amount
  - Fee deduction
  - Net yield amount
  - IB commission (if applicable)
  - Ending balance

### Step 3: Apply Distribution
```typescript
// Apply commits the distribution
const result = await supabase.rpc('apply_yield_distribution', {
  p_fund_id: fundId,
  p_period_start: periodStart,
  p_period_end: periodEnd,
  p_yield_rate: yieldRate
});
```

## Calculation Logic

```sql
-- For each investor in fund:
gross_yield = beginning_balance * yield_rate;
fee_amount = gross_yield * investor_fee_percentage;
net_yield = gross_yield - fee_amount;

-- If investor has IB:
ib_commission = net_yield * ib_percentage;
investor_net = net_yield - ib_commission;

-- Transactions created:
-- 1. Yield credit to investor
-- 2. Fee debit from investor to INDIGO FEES
-- 3. IB commission credit (if applicable)
```

## Preview/Apply Parity

**CRITICAL**: Preview and Apply use the SAME calculation function to ensure parity.

```sql
-- Both call the same internal function
CREATE FUNCTION calculate_yield_amounts(...)
RETURNS TABLE(...) AS $$
  -- Single source of truth for calculations
$$;

-- Preview: calls calculate_yield_amounts, returns results
-- Apply: calls calculate_yield_amounts, commits transactions
```

## Yield Correction Flow

For closed months requiring corrections:

### Step 1: Open Correction Dialog
- Admin selects period and investor
- System shows current recorded yield

### Step 2: Enter Correction
- New yield amount
- Reason for correction (required)
- Typed confirmation for closed months

### Step 3: Apply Correction
```sql
-- 1. Create reversal transaction
INSERT INTO transactions_v2 (type, amount, notes)
VALUES ('yield_reversal', -original_amount, 'Correction: ' || reason);

-- 2. Create corrected transaction
INSERT INTO transactions_v2 (type, amount, notes)
VALUES ('yield', new_amount, 'Corrected yield: ' || reason);

-- 3. Log in audit
INSERT INTO audit_log (action, entity, old_values, new_values)
VALUES ('yield_correction', 'transactions_v2', 
        jsonb_build_object('amount', original_amount),
        jsonb_build_object('amount', new_amount, 'reason', reason));
```

## Idempotency

```sql
-- Unique constraint prevents duplicate distributions
CREATE UNIQUE INDEX idx_unique_yield_distribution
ON yield_distributions (investor_id, fund_id, period_start, period_end);

-- ON CONFLICT handles re-runs gracefully
INSERT INTO yield_distributions (...)
ON CONFLICT (investor_id, fund_id, period_start, period_end)
DO UPDATE SET ...;
```

## Result: ✅ PASS
- Preview/Apply parity verified
- Corrections flow implemented
- Idempotency constraints in place
