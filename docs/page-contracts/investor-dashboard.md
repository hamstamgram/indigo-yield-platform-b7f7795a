# Page Contract: Investor Dashboard

## Route
- **Path**: `/dashboard`
- **Component**: `src/pages/investor/Dashboard.tsx`
- **Guard**: `AuthGuard` (any authenticated user)

## Purpose
Investor's main overview showing portfolio value, recent activity, and quick access to key features.

---

## Data Sources

### Primary Tables
| Table | Purpose |
|-------|---------|
| `profiles` | Investor profile data |
| `investor_positions` | Current holdings |
| `transactions_v2` | Recent transactions |
| `funds` | Fund details |
| `investment_summary` | Cached summary (optional) |

### Portfolio Summary Query
```sql
SELECT 
  ip.fund_id,
  f.name AS fund_name,
  f.code AS fund_code,
  f.asset,
  ip.current_value,
  ip.cost_basis,
  ip.unrealized_pnl,
  ip.shares,
  ip.last_transaction_date
FROM investor_positions ip
JOIN funds f ON ip.fund_id = f.id
WHERE ip.investor_id = auth.uid()
  AND ip.current_value > 0
ORDER BY ip.current_value DESC;
```

### Recent Transactions Query
```sql
SELECT 
  t.id,
  t.transaction_type,
  t.amount,
  t.tx_date,
  f.name AS fund_name,
  f.code AS fund_code
FROM transactions_v2 t
JOIN funds f ON t.fund_id = f.id
WHERE t.investor_id = auth.uid()
  AND t.is_voided = false
ORDER BY t.tx_date DESC
LIMIT 10;
```

---

## RLS Policies
- `investor_positions`: `investor_id = auth.uid()`
- `transactions_v2`: `investor_id = auth.uid()`
- `profiles`: `id = auth.uid()`

---

## Aggregations
```sql
-- Portfolio totals
SELECT 
  SUM(current_value) AS total_value,
  SUM(cost_basis) AS total_invested,
  SUM(unrealized_pnl) AS total_unrealized_pnl,
  COUNT(DISTINCT fund_id) AS fund_count
FROM investor_positions
WHERE investor_id = auth.uid()
  AND current_value > 0;
```

---

## Precision Rules
| Field | Decimals | Format |
|-------|----------|--------|
| Portfolio value | 2 | Currency (USD) |
| Position value | 2-8 | Asset-specific |
| PnL | 2 | Currency |
| Percentage change | 2 | Percentage |

---

## Cache Invalidation

### React Query Keys
```typescript
['portfolio-summary', userId]
['investor-positions', userId]
['recent-transactions', userId]
['investment-summary', userId]
```

### Invalidate After (via realtime or polling)
| Event | Keys to Invalidate |
|-------|-------------------|
| New transaction | All keys above |
| Yield distribution | `portfolio-summary`, `investor-positions` |

---

## Actions
| Action | RLS Check | Audit |
|--------|-----------|-------|
| View dashboard | `auth.uid() = investor_id` | No |
| Navigate to portfolio | - | No |
| Navigate to statements | - | No |

---

## Notes
- Dashboard only shows non-zero positions
- Recent transactions limited to 10 items
- Real-time updates via Supabase subscriptions (optional)
