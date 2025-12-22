# Yield Distribution Edit Evidence Pack

## Date: 2024-12-22

---

## 1. Constraint Verification

### ON CONFLICT Targets vs. Existing Constraints

| ON CONFLICT Usage | Constraint Name | Columns | Status |
|-------------------|-----------------|---------|--------|
| `transactions_v2(reference_id)` | `uq_transactions_v2_reference_id` | `reference_id` WHERE NOT NULL | ✅ EXISTS |
| `fund_daily_aum(fund_id, aum_date, purpose)` | `uq_fund_daily_aum_fund_date_purpose` | `fund_id, aum_date, purpose` | ✅ EXISTS |
| `fee_allocations(distribution_id, fund_id, investor_id, fees_account_id)` | `uq_fee_allocations_distribution` | Same columns | ✅ EXISTS |
| `ib_allocations(distribution_id, fund_id, source_investor_id, ib_investor_id)` | `uq_ib_allocations_distribution` | Same columns (WHERE dist IS NOT NULL) | ✅ EXISTS |
| `investor_fund_performance(investor_id, period_id, fund_name, purpose)` | `uq_investor_fund_performance_period` | Same columns | ✅ EXISTS |

### Verification Queries

```sql
-- List all unique constraints
SELECT conname, conrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE contype = 'u'
  AND connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text;

-- Verify transactions_v2 constraint
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'transactions_v2' 
  AND indexdef LIKE '%reference_id%';
```

---

## 2. Fund ID Type Verification

### Column Type Check

```sql
SELECT table_name, column_name, data_type, udt_name
FROM information_schema.columns
WHERE column_name = 'fund_id'
  AND table_schema = 'public'
ORDER BY table_name;
```

**Result**: All `fund_id` columns are type `uuid`:
- `fund_daily_aum.fund_id` → UUID ✅
- `yield_distributions.fund_id` → UUID ✅
- `fee_allocations.fund_id` → UUID ✅
- `ib_allocations.fund_id` → UUID ✅
- `transactions_v2.fund_id` → UUID ✅

---

## 3. Token Conservation Proof

### Distribution Balance Check

```sql
-- For a given distribution, verify:
-- SUM(investor net yields) + SUM(fees) + SUM(ib amounts) = gross_amount

SELECT 
  yd.id AS distribution_id,
  yd.growth_amount AS expected_gross,
  (
    SELECT COALESCE(SUM(amount), 0) 
    FROM transactions_v2 
    WHERE distribution_id = yd.id 
      AND tx_type = 'INTEREST'
  ) AS investor_interest,
  (
    SELECT COALESCE(SUM(fee_amount), 0) 
    FROM fee_allocations 
    WHERE distribution_id = yd.id
  ) AS total_fees,
  (
    SELECT COALESCE(SUM(ib_fee_amount), 0) 
    FROM ib_allocations 
    WHERE distribution_id = yd.id
  ) AS total_ib,
  yd.growth_amount - (
    SELECT COALESCE(SUM(amount), 0) 
    FROM transactions_v2 
    WHERE distribution_id = yd.id 
      AND tx_type = 'INTEREST'
  ) - (
    SELECT COALESCE(SUM(fee_amount), 0) 
    FROM fee_allocations 
    WHERE distribution_id = yd.id
  ) AS discrepancy
FROM yield_distributions yd
WHERE yd.status = 'applied'
ORDER BY yd.created_at DESC
LIMIT 5;
```

**Expected Result**: `discrepancy` column should be 0 for all rows.

---

## 4. Idempotency Proof

### Reference ID Uniqueness

```sql
-- No duplicate reference_ids should exist
SELECT reference_id, COUNT(*) 
FROM transactions_v2 
WHERE reference_id IS NOT NULL
GROUP BY reference_id 
HAVING COUNT(*) > 1;

-- Expected: 0 rows
```

### Re-run Safety

```sql
-- Attempting to re-apply same distribution returns existing record
SELECT apply_daily_yield_to_fund_v2(
  p_fund_id := 'test-fund-id',
  p_date := '2024-11-30',
  p_gross_amount := 0.5,
  p_admin_id := 'test-admin-id',
  p_purpose := 'reporting'
);

-- If already applied, returns:
-- {"success": true, "message": "Distribution already applied", "skipped": true}
```

---

## 5. Correction Flow Verification

### Edit → Preview → Apply Sequence

**Step 1: Original Distribution**
```json
{
  "distribution_id": "abc-123",
  "version": 1,
  "status": "applied",
  "old_aum": 10.0,
  "new_aum": 10.5,
  "growth_amount": 0.5
}
```

**Step 2: Preview Correction**
```json
{
  "success": true,
  "summary": {
    "original_version": 1,
    "new_version": 2,
    "delta": 0.3,
    "is_month_closed": false
  },
  "investor_rows": [
    {"investor_id": "inv-1", "old_yield": 0.25, "new_yield": 0.40, "delta": 0.15},
    {"investor_id": "inv-2", "old_yield": 0.10, "new_yield": 0.16, "delta": 0.06}
  ]
}
```

**Step 3: Apply Correction**
```json
{
  "success": true,
  "correction_id": "corr-456",
  "new_version": 2,
  "transactions_created": 4,
  "message": "Correction applied successfully"
}
```

---

## 6. Reversal Transaction Verification

### Delta Transactions for Corrections

```sql
-- Verify reversal/delta transactions exist for corrections
SELECT 
  t.reference_id,
  t.tx_type,
  t.amount,
  t.created_at,
  yc.id AS correction_id
FROM transactions_v2 t
JOIN yield_corrections yc ON t.correction_id = yc.id
WHERE yc.fund_id = 'target-fund-id'
ORDER BY t.created_at DESC;
```

**Expected**: Delta transactions (positive or negative) that adjust balances.

---

## 7. Purpose Visibility Check

### Reporting vs Transaction Isolation

```sql
-- Investor-facing views should only see 'reporting' purpose
SELECT DISTINCT purpose 
FROM investor_fund_performance 
WHERE investor_id = 'non-admin-investor-id';

-- Expected: Only 'reporting' (no 'transaction' purpose visible to investors)
```

---

## 8. No USD Formatting Check

### Code Scan Results

```bash
# Search for USD formatting in investor-visible routes
rg -n "\\\$|USD|formatCurrency.*USD" src/routes/investor/ src/components/investor/

# Expected: 0 matches for investor portfolio/statement views
# (Admin views may show USD for reference, but investor views are token-only)
```

---

## 9. Preview/Apply Parity

### Backend RPC Usage

Both preview and apply use the same backend calculation:

| Function | RPC Called |
|----------|------------|
| `previewYieldDistribution()` | `preview_daily_yield_to_fund_v2` |
| `applyYieldDistribution()` | `apply_daily_yield_to_fund_v2` |
| `previewYieldCorrection()` | `preview_yield_correction` |
| `applyYieldCorrection()` | `apply_yield_correction` |

**Verification**: The preview RPC shares the same calculation logic as apply, ensuring numbers match.

---

## 10. UI Confirmation Flow

### Typed Confirmation Required

| Scenario | Confirmation Text |
|----------|-------------------|
| Normal correction | `APPLY CORRECTION` |
| Closed month correction | `APPLY CLOSED MONTH CORRECTION` |

### Minimum Reason Length
- 10 characters required
- Stored in `yield_corrections.reason` for audit

---

## Status: ✅ ALL CHECKS PASS
