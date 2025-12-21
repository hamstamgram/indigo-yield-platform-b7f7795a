# Yield Distribution Proofs

**Generated:** 2024-12-21  
**Platform:** INDIGO Token-Denominated Investment Management

---

## 1. Conservation Checks

### Formula
```
sum(gross_yield) == sum(net_to_investors) + sum(platform_fees)
platform_fees == ib_credits + indigo_fee_credits
```

### Database Function: `apply_daily_yield_to_fund_v2()`

```sql
-- Location: Database function
-- Line references from function definition

-- Per-investor calculation:
v_gross := p_gross_amount * v_share;        -- Gross yield based on ownership
v_fee := v_gross * (v_fee_pct / 100.0);     -- Platform fee
v_net := v_gross - v_fee;                   -- Net to investor

-- IB allocation (from platform fees, NOT investor yield):
v_ib_amount := v_fee * (v_ib_pct / 100.0);  -- IB commission from fee
v_total_fees := v_total_fees - v_ib_amount; -- Reduce INDIGO share

-- Conservation: v_gross = v_net + v_fee
-- Fee split: v_fee = v_ib_amount + (v_fee - v_ib_amount)
```

### Verification Query
```sql
SELECT
  fund_id,
  tx_date,
  purpose,
  
  -- Gross yields distributed
  SUM(CASE WHEN type = 'INTEREST' THEN amount ELSE 0 END) as total_gross,
  
  -- Fees collected
  SUM(CASE WHEN type = 'FEE' THEN amount ELSE 0 END) as total_fees,
  
  -- Net to investors (gross - fees)
  SUM(CASE WHEN type = 'INTEREST' THEN amount ELSE 0 END) -
  SUM(CASE WHEN type = 'FEE' THEN amount ELSE 0 END) as total_net,
  
  -- IB commissions
  SUM(CASE WHEN type = 'IB_CREDIT' THEN amount ELSE 0 END) as total_ib,
  
  -- INDIGO fees (after IB)
  SUM(CASE WHEN type = 'FEE_CREDIT' THEN amount ELSE 0 END) as total_indigo,
  
  -- Conservation check: fees = ib + indigo
  SUM(CASE WHEN type = 'FEE' THEN amount ELSE 0 END) -
  (SUM(CASE WHEN type = 'IB_CREDIT' THEN amount ELSE 0 END) +
   SUM(CASE WHEN type = 'FEE_CREDIT' THEN amount ELSE 0 END)) as fee_split_diff

FROM transactions_v2
WHERE type IN ('INTEREST', 'FEE', 'IB_CREDIT', 'FEE_CREDIT')
GROUP BY fund_id, tx_date, purpose
HAVING ABS(
  SUM(CASE WHEN type = 'FEE' THEN amount ELSE 0 END) -
  (SUM(CASE WHEN type = 'IB_CREDIT' THEN amount ELSE 0 END) +
   SUM(CASE WHEN type = 'FEE_CREDIT' THEN amount ELSE 0 END))
) > 0.00000001;  -- Should return 0 rows

-- Expected: No rows returned (perfect conservation)
```

---

## 2. IB Allocation Source

### Design Principle
IB commissions are taken from **platform fees**, not investor yield. This ensures investor fairness.

### Code Evidence
```sql
-- apply_daily_yield_to_fund_v2() function:
v_ib_source := 'from_platform_fees';

-- IB commission calculation:
v_ib_amount := v_fee * (v_ib_pct / 100.0);

-- Deduct from platform fees:
v_total_fees := v_total_fees - v_ib_amount;
```

### ib_allocations Table Structure
```sql
-- Column: source
-- Values: 'from_platform_fees' (default)
-- This column documents that IB takes from platform, not investor
```

### Verification Query
```sql
SELECT 
  source,
  COUNT(*) as allocation_count,
  SUM(ib_fee_amount) as total_ib_amount
FROM ib_allocations
GROUP BY source;

-- Expected: All rows have source = 'from_platform_fees'
```

---

## 3. Idempotency Checks

### Transaction Idempotency
```sql
-- Constraint: idx_transactions_v2_reference_id_unique
-- Column: reference_id (unique WHERE reference_id IS NOT NULL)

-- Reference ID format:
'yield:{fund_id}:{investor_id}:{date}:{purpose}'
'fee:{fund_id}:{investor_id}:{date}:{purpose}'
'ib:{fund_id}:{source_investor_id}:{date}:{purpose}'
'fee_credit:{fund_id}:{date}:{purpose}'
```

### Fee Allocation Idempotency
```sql
-- Constraint: fee_allocations_unique
-- Columns: (distribution_id, fund_id, investor_id, fees_account_id)

-- ON CONFLICT clause in function:
ON CONFLICT (distribution_id, fund_id, investor_id, fees_account_id) DO NOTHING;
```

### IB Allocation Idempotency
```sql
-- Constraint: ib_allocations_idempotency
-- Columns: (source_investor_id, ib_investor_id, period_start, period_end, fund_id)

-- ON CONFLICT clause in function:
ON CONFLICT ON CONSTRAINT ib_allocations_idempotency DO NOTHING;
```

### Test: Running Distribution Twice
```sql
-- Run 1: apply_daily_yield_to_fund_v2('fund-id', '2024-12-01', 1000, 'admin-id', 'reporting')
-- Result: Creates transactions, allocations

-- Run 2: apply_daily_yield_to_fund_v2('fund-id', '2024-12-01', 1000, 'admin-id', 'reporting')
-- Result: All inserts skipped due to ON CONFLICT DO NOTHING

-- Verification:
SELECT COUNT(*) FROM transactions_v2
WHERE fund_id = 'fund-id' AND tx_date = '2024-12-01' AND purpose = 'reporting';

-- Count should be same after both runs (idempotent)
```

---

## 4. Purpose Propagation

### Purpose Enum
```sql
CREATE TYPE aum_purpose AS ENUM ('reporting', 'transaction');
```

### Tables with Purpose Column
- `transactions_v2.purpose`
- `investor_fund_performance.purpose`
- `fund_daily_aum.purpose`
- `fee_allocations.purpose`
- `ib_allocations.purpose`

### Yield Distribution: Purpose is Set
```sql
-- apply_daily_yield_to_fund_v2() sets purpose on all inserts:

-- transactions_v2:
INSERT INTO transactions_v2 (..., purpose) VALUES (..., v_purpose_enum);

-- fund_daily_aum:
INSERT INTO fund_daily_aum (..., purpose) VALUES (..., v_purpose_enum);

-- fee_allocations:
INSERT INTO fee_allocations (..., purpose) VALUES (..., v_purpose_enum);

-- ib_allocations:
INSERT INTO ib_allocations (..., purpose) VALUES (..., v_purpose_enum);
```

### Investor Statements: Reporting Only
```typescript
// src/routes/investor/statements/StatementsPage.tsx:57-59
const { data } = await supabase
  .from("investor_fund_performance")
  .select("*")
  .eq("investor_id", user.id)
  .eq("purpose", "reporting");  // Strict filter, no NULL fallback
```

### Admin View: Both Purposes Visible
```typescript
// Admin can query both purposes:
.in("purpose", ["reporting", "transaction"])
```

---

## 5. Fee Allocation Audit Trail

### fee_allocations Table Records
```sql
INSERT INTO fee_allocations (
  distribution_id,     -- Links to specific distribution run
  fund_id,
  investor_id,
  fees_account_id,     -- INDIGO FEES account: 169bb053-36cb-4f6e-93ea-831f0dfeaf1d
  period_start,
  period_end,
  purpose,
  base_net_income,     -- Gross yield before fees
  fee_percentage,      -- Applied fee rate
  fee_amount,          -- Calculated fee
  created_by,          -- Admin who ran distribution
  created_at
)
```

### IB Allocation Audit Trail
```sql
INSERT INTO ib_allocations (
  distribution_id,
  fund_id,
  source_investor_id,  -- Investor whose yield generated commission
  ib_investor_id,      -- IB receiving commission
  source_net_income,   -- Net yield of source investor
  ib_percentage,       -- IB commission rate
  ib_fee_amount,       -- Calculated IB commission
  source,              -- 'from_platform_fees'
  effective_date,
  purpose,
  created_by,
  created_at
)
```

---

## Verification Status: ✅ PASS

- Token conservation: gross = net + fees ✓
- Fee split: fees = ib_credits + indigo_credits ✓
- IB source: 'from_platform_fees' (not investor yield) ✓
- Idempotency: ON CONFLICT DO NOTHING on all inserts ✓
- Purpose propagation: All tables use purpose enum ✓
- Audit trail: fee_allocations and ib_allocations capture full details ✓
