# Page Contract: Investor Portfolio

## Route
- **Path**: `/investor/portfolio`
- **Component**: `src/pages/investor/Portfolio.tsx`
- **Guard**: `AuthGuard`

## Purpose
Detailed view of investor's holdings across all funds with performance metrics.

---

## Data Sources

### Primary Tables
| Table | Purpose |
|-------|---------|
| `investor_positions` | Current holdings (composite PK) |
| `funds` | Fund details and status |
| `transactions_v2` | Transaction history |
| `daily_nav` | Historical NAV for charts |
| `fund_daily_aum` | Fund performance data |

### Positions Query
```sql
SELECT 
  ip.investor_id,
  ip.fund_id,
  ip.shares,
  ip.cost_basis,
  ip.current_value,
  ip.unrealized_pnl,
  ip.realized_pnl,
  ip.high_water_mark,
  ip.mgmt_fees_paid,
  ip.perf_fees_paid,
  ip.last_transaction_date,
  ip.lock_until_date,
  f.name AS fund_name,
  f.code AS fund_code,
  f.asset,
  f.status AS fund_status,
  f.mgmt_fee_bps,
  f.perf_fee_bps
FROM investor_positions ip
JOIN funds f ON ip.fund_id = f.id
WHERE ip.investor_id = auth.uid()
ORDER BY ip.current_value DESC;
```

### Transaction History Query
```sql
SELECT 
  t.id,
  t.transaction_type,
  t.amount,
  t.tx_date,
  t.reference_id,
  t.notes,
  t.purpose,
  f.name AS fund_name
FROM transactions_v2 t
JOIN funds f ON t.fund_id = f.id
WHERE t.investor_id = auth.uid()
  AND t.is_voided = false
ORDER BY t.tx_date DESC;
```

---

## RLS Policies
All queries automatically filtered by `investor_id = auth.uid()`

---

## Aggregations
```sql
-- Portfolio metrics
SELECT 
  SUM(current_value) AS total_value,
  SUM(cost_basis) AS total_invested,
  SUM(unrealized_pnl) AS total_unrealized,
  SUM(realized_pnl) AS total_realized,
  SUM(mgmt_fees_paid) AS total_mgmt_fees,
  SUM(perf_fees_paid) AS total_perf_fees,
  CASE 
    WHEN SUM(cost_basis) > 0 
    THEN (SUM(current_value) - SUM(cost_basis)) / SUM(cost_basis) * 100
    ELSE 0 
  END AS total_return_pct
FROM investor_positions
WHERE investor_id = auth.uid();
```

---

## Filters
| Filter | Column | Type |
|--------|--------|------|
| Fund | `fund_id` | Select |
| Date range | Transaction `tx_date` | DatePicker |
| Transaction type | `transaction_type` | Multi-select |

---

## Precision Rules
| Field | Decimals | Format |
|-------|----------|--------|
| Position value | 2-8 | Asset-specific |
| Shares | 8 | Decimal |
| Fees | 2 | Currency |
| Return % | 2 | Percentage |

---

## Cache Invalidation

### React Query Keys
```typescript
['investor-positions', userId]
['investor-transactions', userId]
['portfolio-metrics', userId]
['fund-nav-history', fundId]
```

### Invalidate After
| Event | Keys to Invalidate |
|-------|-------------------|
| Deposit confirmed | All position keys |
| Withdrawal completed | All position keys |
| Yield distributed | All position keys |

---

## Actions
| Action | RLS Check | Audit |
|--------|-----------|-------|
| View portfolio | `auth.uid()` | No |
| Export transactions | `auth.uid()` | No |

---

## Important Notes

### Composite Key
**CRITICAL**: `investor_positions` has composite primary key `(investor_id, fund_id)`.
- Never use `.id` column - it doesn't exist
- Always reference positions by both columns

### Lock Period Display
If `lock_until_date > CURRENT_DATE`, show lock indicator with remaining days.

### Zero Positions
Positions with `current_value = 0` may be shown in "History" tab but hidden from main view.
