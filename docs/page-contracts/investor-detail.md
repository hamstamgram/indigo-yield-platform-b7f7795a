# Investor Detail Page Contract

## Route
`/admin/investors/:investorId`

## Component
`src/pages/admin/InvestorDetailPage.tsx`

## Purpose
Admin view of a single investor's complete profile, positions, transactions, and relationships.

---

## Data Sources

### Primary Tables
| Table | Purpose |
|-------|---------|
| `profiles` | Investor profile data |
| `investor_positions` | Current fund positions |
| `transactions_v2` | Transaction history |
| `funds` | Fund details for positions |
| `investor_fee_schedule` | Custom fee rates |
| `ib_allocations` | IB commissions earned (if IB) |
| `withdrawal_requests` | Withdrawal history |
| `generated_statements` | Statement history |

### Views Used
| View | Purpose |
|------|---------|
| `v_investor_kpis` | Aggregated KPIs |

---

## Join Logic

### Profile with IB Relationship
```sql
SELECT 
  p.*,
  ib.email as ib_parent_email,
  ib.first_name || ' ' || ib.last_name as ib_parent_name
FROM profiles p
LEFT JOIN profiles ib ON ib.id = p.ib_parent_id
WHERE p.id = :investor_id;
```

### Positions with Fund Details
```sql
SELECT 
  ip.*,
  f.code as fund_code,
  f.name as fund_name,
  f.asset,
  f.mgmt_fee_bps,
  f.perf_fee_bps
FROM investor_positions ip
JOIN funds f ON f.id = ip.fund_id
WHERE ip.investor_id = :investor_id
ORDER BY ip.current_value DESC;
```

### Transaction History
```sql
SELECT 
  t.*,
  f.code as fund_code,
  yd.effective_date as distribution_date
FROM transactions_v2 t
JOIN funds f ON f.id = t.fund_id
LEFT JOIN yield_distributions yd ON yd.id = t.distribution_id
WHERE t.investor_id = :investor_id
  AND t.is_voided = false
ORDER BY t.tx_date DESC, t.id DESC
LIMIT 100;
```

---

## Filters

| Filter | Type | Default | Purpose |
|--------|------|---------|---------|
| `transaction_type` | Multi-select | All | Filter transaction types |
| `fund_id` | Select | All | Filter by fund |
| `date_range` | Date range | Last 90 days | Transaction date filter |

---

## Aggregation Rules

### Total Portfolio Value
```
total_value = Σ positions.current_value
```

### Total Invested
```
total_invested = Σ positions.cost_basis
```

### Total Returns
```
total_returns = total_value - total_invested
return_pct = (total_returns / total_invested) × 100
```

### Transaction Totals
```
total_deposits = Σ transactions WHERE type = 'deposit'
total_withdrawals = Σ transactions WHERE type = 'withdrawal'
total_interest = Σ transactions WHERE type = 'interest'
total_fees = Σ transactions WHERE type = 'fee'
```

---

## Precision Rules

| Field | Decimals | Format |
|-------|----------|--------|
| Position values | 8 (crypto) / 2 (USD) | Currency formatted |
| Shares | 8 | Plain decimal |
| Percentages | 2 | X.XX% |
| Fee rates (bps) | 0 | XXX bps |

---

## Cache Invalidation

### After Position Update
- `['investor', investorId]`
- `['investor-positions', investorId]`
- `['transactions', investorId]`

### After IB Reassignment
- `['investor', investorId]`
- `['ib-referrals']`
- `['ib-overview']`

---

## State Management

### URL Parameters
```typescript
const { investorId } = useParams<{ investorId: string }>();
```

### React Query Keys
```typescript
const profileQuery = useQuery({ 
  queryKey: ['investor', investorId] 
});
const positionsQuery = useQuery({ 
  queryKey: ['investor-positions', investorId] 
});
const transactionsQuery = useQuery({ 
  queryKey: ['transactions', { investorId, limit: 100 }] 
});
```

---

## Tab Structure

| Tab | Content |
|-----|---------|
| Overview | Profile info, KPIs, positions summary |
| Transactions | Full transaction history with filters |
| Positions | Detailed position breakdown by fund |
| Documents | Statements and documents |
| IB Network | Referrals if investor is IB |
| Settings | Fee overrides, IB relationship |

---

## Error Handling

| Error | User Message | Recovery |
|-------|--------------|----------|
| Investor not found | "Investor not found" | Redirect to list |
| No positions | "No positions yet" | Show empty state |
| Transaction load fail | Toast with retry | Retry button |
