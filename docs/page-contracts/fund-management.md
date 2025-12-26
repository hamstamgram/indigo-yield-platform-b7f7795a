# Fund Management Page Contract

## Route
`/admin/funds`

## Component
`src/pages/admin/FundsPage.tsx`

## Purpose
Admin interface for viewing and managing fund configurations, AUM, and performance.

---

## Data Sources

### Primary Tables
| Table | Purpose |
|-------|---------|
| `funds` | Fund definitions |
| `fund_daily_aum` | AUM history |
| `investor_positions` | Position aggregates |
| `yield_distributions` | Distribution history |
| `fund_configurations` | Config history |
| `fund_fee_history` | Fee changes |

---

## Join Logic

### Fund List with Metrics
```sql
SELECT 
  f.*,
  COALESCE(fda.total_aum, 0) as current_aum,
  COALESCE(pos.investor_count, 0) as investor_count,
  COALESCE(yd.mtd_yield, 0) as mtd_yield,
  COALESCE(yd.ytd_yield, 0) as ytd_yield
FROM funds f
LEFT JOIN (
  SELECT fund_id, total_aum
  FROM fund_daily_aum
  WHERE aum_date = CURRENT_DATE AND purpose = 'transaction'
) fda ON fda.fund_id = f.id
LEFT JOIN (
  SELECT fund_id, COUNT(DISTINCT investor_id) as investor_count
  FROM investor_positions
  WHERE current_value > 0
  GROUP BY fund_id
) pos ON pos.fund_id = f.id
LEFT JOIN (
  SELECT 
    fund_id,
    SUM(CASE WHEN effective_date >= date_trunc('month', CURRENT_DATE) 
        THEN gross_yield ELSE 0 END) as mtd_yield,
    SUM(CASE WHEN effective_date >= date_trunc('year', CURRENT_DATE) 
        THEN gross_yield ELSE 0 END) as ytd_yield
  FROM yield_distributions
  WHERE status = 'applied'
  GROUP BY fund_id
) yd ON yd.fund_id = f.id
WHERE f.status = 'active'
ORDER BY current_aum DESC;
```

### Fund Detail
```sql
SELECT 
  f.*,
  fda.total_aum,
  fda.nav_per_share,
  fda.total_shares
FROM funds f
LEFT JOIN fund_daily_aum fda ON fda.fund_id = f.id 
  AND fda.aum_date = CURRENT_DATE
  AND fda.purpose = 'transaction'
WHERE f.id = :fund_id;
```

---

## Filters

| Filter | Type | Default | Purpose |
|--------|------|---------|---------|
| `status` | Select | 'active' | Fund status filter |
| `asset` | Multi-select | All | Filter by asset type |
| `search` | Text | Empty | Search fund name/code |

---

## Aggregation Rules

### Platform Totals
```
total_aum = Σ fund.current_aum (active funds)
total_investors = Σ fund.investor_count (unique across funds)
total_funds = COUNT active funds
```

### Fund Performance
```
mtd_return = mtd_yield / opening_aum × 100
ytd_return = ytd_yield / jan_1_aum × 100
```

---

## Precision Rules

| Field | Decimals | Format |
|-------|----------|--------|
| AUM | 2 | $X,XXX,XXX.XX |
| NAV per share | 8 | X.XXXXXXXX |
| Shares | 8 | X.XXXXXXXX |
| Fee bps | 0 | XXX bps |
| Returns | 2 | X.XX% |

---

## Cache Invalidation

### After Fund Update
- `['funds']`
- `['fund', fundId]`
- `['fund-daily-aum', fundId]`

### After Fee Change
- `['fund-fee-history', fundId]`
- `['fund', fundId]`

---

## State Management

### React Query Keys
```typescript
const fundsQuery = useQuery({ 
  queryKey: ['funds', { status: 'active' }] 
});
const fundDetailQuery = useQuery({ 
  queryKey: ['fund', selectedFundId],
  enabled: !!selectedFundId
});
const aumHistoryQuery = useQuery({ 
  queryKey: ['fund-daily-aum', selectedFundId, dateRange],
  enabled: !!selectedFundId
});
```

---

## Actions

| Action | RLS Check | Audit |
|--------|-----------|-------|
| View | Authenticated | No |
| Create | is_admin() | Yes |
| Update | is_admin() | Yes |
| Deactivate | is_admin() | Yes |
| Change fees | is_admin() | Yes (fund_fee_history) |

---

## Error Handling

| Error | User Message | Recovery |
|-------|--------------|----------|
| Fund has positions | "Cannot delete fund with positions" | Deactivate instead |
| Duplicate code | "Fund code already exists" | Use different code |
| Invalid fees | "Fees must be 0-10000 bps" | Correct input |

---

## Accessibility

- Fund cards are keyboard accessible
- Fee inputs have validation messages
- Status changes require confirmation
- AUM charts have data tables
