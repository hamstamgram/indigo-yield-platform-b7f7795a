# IB Overview Page Contract

## Route
`/admin/ib`

## Component
`src/pages/admin/IBOverviewPage.tsx`

## Purpose
Admin dashboard for Introducing Broker (IB) network management, showing referral relationships and commission tracking.

---

## Data Sources

### Primary Tables
| Table | Purpose |
|-------|---------|
| `profiles` | IB and investor profiles |
| `ib_allocations` | Commission records |
| `investor_positions` | Referral AUM |
| `yield_distributions` | Distribution links |

### Derived Data
| Calculation | Source |
|-------------|--------|
| Referral count | COUNT profiles WHERE ib_parent_id = X |
| Referral AUM | Σ positions.current_value WHERE investor.ib_parent_id = X |
| Pending commissions | Σ ib_allocations WHERE payout_status = 'pending' |
| Paid commissions | Σ ib_allocations WHERE payout_status = 'paid' |

---

## Join Logic

### IB List with Metrics
```sql
WITH ib_metrics AS (
  SELECT 
    ib.id as ib_id,
    COUNT(DISTINCT ref.id) as referral_count,
    COALESCE(SUM(ip.current_value), 0) as referral_aum
  FROM profiles ib
  LEFT JOIN profiles ref ON ref.ib_parent_id = ib.id
  LEFT JOIN investor_positions ip ON ip.investor_id = ref.id
  WHERE ib.ib_percentage > 0 OR EXISTS (
    SELECT 1 FROM profiles WHERE ib_parent_id = ib.id
  )
  GROUP BY ib.id
),
ib_commissions AS (
  SELECT 
    ib_investor_id,
    SUM(CASE WHEN payout_status = 'pending' THEN ib_fee_amount ELSE 0 END) as pending,
    SUM(CASE WHEN payout_status = 'paid' THEN ib_fee_amount ELSE 0 END) as paid
  FROM ib_allocations
  WHERE is_voided = false
  GROUP BY ib_investor_id
)
SELECT 
  p.id,
  p.email,
  p.first_name || ' ' || p.last_name as name,
  p.ib_percentage,
  COALESCE(m.referral_count, 0) as referral_count,
  COALESCE(m.referral_aum, 0) as referral_aum,
  COALESCE(c.pending, 0) as pending_commissions,
  COALESCE(c.paid, 0) as paid_commissions
FROM profiles p
LEFT JOIN ib_metrics m ON m.ib_id = p.id
LEFT JOIN ib_commissions c ON c.ib_investor_id = p.id
WHERE m.ib_id IS NOT NULL OR p.ib_percentage > 0
ORDER BY referral_aum DESC NULLS LAST;
```

### Referrals for Specific IB
```sql
SELECT 
  p.id,
  p.email,
  p.first_name || ' ' || p.last_name as name,
  p.onboarding_date,
  COALESCE(SUM(ip.current_value), 0) as total_aum,
  COUNT(DISTINCT ip.fund_id) as funds_invested
FROM profiles p
LEFT JOIN investor_positions ip ON ip.investor_id = p.id
WHERE p.ib_parent_id = :ib_id
GROUP BY p.id, p.email, p.first_name, p.last_name, p.onboarding_date
ORDER BY total_aum DESC;
```

---

## Filters

| Filter | Type | Default | Purpose |
|--------|------|---------|---------|
| `search` | Text | Empty | Search IB name/email |
| `has_referrals` | Boolean | true | Only IBs with referrals |
| `has_pending` | Boolean | false | Only IBs with pending payouts |

---

## Aggregation Rules

### Network Totals
```
total_ibs = COUNT DISTINCT ib_investor_id in ib_allocations
total_referrals = COUNT profiles WHERE ib_parent_id IS NOT NULL
total_referral_aum = Σ positions.current_value WHERE investor.ib_parent_id IS NOT NULL
total_pending = Σ ib_allocations.ib_fee_amount WHERE payout_status = 'pending'
total_paid = Σ ib_allocations.ib_fee_amount WHERE payout_status = 'paid'
```

### Per-IB Metrics
```
referral_count = COUNT referrals
referral_aum = Σ referral positions
pending = Σ pending ib_allocations
paid = Σ paid ib_allocations
lifetime = pending + paid
```

---

## Precision Rules

| Field | Decimals | Format |
|-------|----------|--------|
| AUM values | 2 | $X,XXX,XXX.XX |
| Commission amounts | 2 | $X,XXX.XX |
| IB percentage | 2 | XX.XX% |
| Referral count | 0 | Integer |

---

## Cache Invalidation

### After IB Assignment
- `['ib-overview']`
- `['ib-referrals', ibId]`
- `['investor', investorId]`

### After Payout
- `['ib-allocations']`
- `['ib-overview']`
- `['ib-commissions', ibId]`

---

## State Management

### React Query Keys
```typescript
const ibListQuery = useQuery({ 
  queryKey: ['ib-overview'] 
});
const referralsQuery = useQuery({ 
  queryKey: ['ib-referrals', selectedIbId],
  enabled: !!selectedIbId
});
const commissionsQuery = useQuery({ 
  queryKey: ['ib-commissions', selectedIbId],
  enabled: !!selectedIbId
});
```

---

## Tab Structure

| Tab | Content |
|-----|---------|
| Overview | IB list with metrics |
| Referrals | Selected IB's referral list |
| Commissions | Commission history |
| Payouts | Payout management |

---

## Error Handling

| Error | User Message | Recovery |
|-------|--------------|----------|
| No IBs found | "No introducing brokers yet" | Show empty state |
| Commission calc error | Toast with details | Contact support |
| Payout failure | Toast with retry | Retry button |

---

## Accessibility

- Tables are keyboard navigable
- IB percentage inputs have validation
- Payout confirmation is focus-trapped
- Commission history is paginated
