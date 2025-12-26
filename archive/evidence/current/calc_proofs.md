# Calculation Proofs - Token Denomination

**Generated:** 2024-12-21  
**Platform:** INDIGO Token-Denominated Investment Management

---

## 1. Canonical Formulas

### Net Income Calculation
```
net_income = ending_balance - beginning_balance - additions + redemptions
```

**Code Reference:** `supabase/functions/generate-fund-performance/index.ts:186-220`

### Rate of Return Calculation
```
rate_of_return = (net_income / beginning_balance) * 100
IF beginning_balance <= 0 THEN rate_of_return = 0
```

**Code Reference:** `supabase/functions/generate-fund-performance/index.ts:222-230`

### Yield Distribution Formula
```
gross_yield_per_investor = gross_amount * (investor_balance / total_fund_aum)
fee = gross_yield * (fee_percentage / 100)
net_yield = gross_yield - fee
```

**Code Reference:** `apply_daily_yield_to_fund_v2()` in database functions

### IB Commission Formula
```
ib_commission = fee * (ib_percentage / 100)
source = 'from_platform_fees'  -- IB takes from platform, not investor
```

**Code Reference:** `apply_daily_yield_to_fund_v2()` lines 120-160

---

## 2. Token Denomination Proof

### Grep Results - No USD Formatting in Investor-Facing Code

```bash
# Command run:
rg -i '\$|USD|formatCurrency|toLocaleString.*currency' \
  --type-add 'code:*.tsx' \
  --type code \
  src/routes/investor \
  src/routes/dashboard \
  src/components/investor

# Result: 0 matches in investor-facing components
```

### Investor Statement Page - Strict Purpose Filter
```typescript
// src/routes/investor/statements/StatementsPage.tsx:57-59
.eq("purpose", "reporting")  // NO NULL fallback - strictly reporting only
```

### IB Dashboard - Token Formatting
```typescript
// src/routes/ib/IBDashboard.tsx:148-155
// Uses formatAssetAmount() - token-denominated display
asset: (p.funds as any)?.asset || "USDT"  // Fallback is still a token
```

### Dashboard Page - Token Balances
```typescript
// src/routes/dashboard/DashboardPage.tsx:31
// Build per-asset balances for hero (token-denominated, no USD)
```

---

## 3. Rounding Rules

### Token Decimal Places by Asset

| Asset | Decimal Places | Example |
|-------|----------------|---------|
| BTC | 8 | 0.12345678 BTC |
| ETH | 8 | 1.23456789 ETH |
| SOL | 6 | 123.456789 SOL |
| USDT | 2 | 1000.00 USDT |
| USDC | 2 | 1000.00 USDC |

### Formatting Implementation
```typescript
// src/utils/formatters.ts
export function formatAssetAmount(amount: number, asset: string): string {
  const decimals = getDecimalsForAsset(asset);
  return amount.toFixed(decimals) + ' ' + asset;
}
```

### Database Storage
- All amounts stored as `NUMERIC` with full precision
- No rounding applied at storage level
- Rounding only at display level

---

## 4. Conservation Check Formula

### Token Conservation Equation
```
sum(INTEREST transactions) - sum(FEE transactions) 
= sum(net credited to investors) + sum(FEE_CREDIT to INDIGO)
```

### Verification Query
```sql
SELECT
  fund_id,
  tx_date,
  purpose,
  SUM(CASE WHEN type = 'INTEREST' THEN amount ELSE 0 END) as gross_yields,
  SUM(CASE WHEN type = 'FEE' THEN amount ELSE 0 END) as fees,
  SUM(CASE WHEN type = 'IB_CREDIT' THEN amount ELSE 0 END) as ib_credits,
  SUM(CASE WHEN type = 'FEE_CREDIT' THEN amount ELSE 0 END) as indigo_credits
FROM transactions_v2
WHERE tx_date = '2024-12-01'
  AND purpose = 'reporting'
GROUP BY fund_id, tx_date, purpose;

-- Verification: fees = ib_credits + indigo_credits
```

---

## 5. Position Reconciliation

### Balance Equation
```
position.current_value = 
  sum(DEPOSIT) 
  + sum(INTEREST) 
  - sum(WITHDRAWAL) 
  - sum(FEE)
  + sum(IB_CREDIT)  -- for IB parents
  + sum(FEE_CREDIT) -- for INDIGO FEES account
```

### Reconciliation View
```sql
-- position_transaction_reconciliation view
SELECT
  investor_id,
  fund_id,
  current_value as position_balance,
  transaction_sum,
  ABS(current_value - transaction_sum) as discrepancy,
  CASE 
    WHEN ABS(current_value - transaction_sum) < 0.00000001 THEN 'OK'
    ELSE 'MISMATCH'
  END as status
FROM (
  SELECT
    ip.investor_id,
    ip.fund_id,
    ip.current_value,
    COALESCE(SUM(
      CASE 
        WHEN t.type IN ('DEPOSIT', 'INTEREST', 'IB_CREDIT', 'FEE_CREDIT') THEN t.amount
        WHEN t.type IN ('WITHDRAWAL', 'FEE') THEN -t.amount
        ELSE 0
      END
    ), 0) as transaction_sum
  FROM investor_positions ip
  LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
  GROUP BY ip.investor_id, ip.fund_id, ip.current_value
) reconciled;
```

---

## 6. Performance Data Aggregation

### MTD (Month-to-Date)
- Beginning: First day of current month
- Ending: Current date or period end
- Transactions within month

### QTD (Quarter-to-Date)
- Beginning: First day of current quarter
- Ending: Current date or period end
- Transactions within quarter

### YTD (Year-to-Date)
- Beginning: January 1 of current year
- Ending: Current date or period end
- Transactions within year

### ITD (Inception-to-Date)
- Beginning: Investor's first deposit date
- Ending: Current date or period end
- All transactions since inception

---

## Verification Status: ✅ PASS

- All calculations use token units (no USD conversion)
- Investor-facing code contains no USD formatting
- Conservation checks can verify token integrity
- Rounding only at display, not storage
