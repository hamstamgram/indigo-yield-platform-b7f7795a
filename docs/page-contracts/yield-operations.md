# Yield Operations Page Contract

## Route
`/admin/operations/yield`

## Component
`src/pages/admin/YieldOperationsPage.tsx`

## Purpose
Admin interface for previewing and applying yield distributions to funds.

---

## Data Sources

### Primary Tables
| Table | Purpose |
|-------|---------|
| `funds` | Fund list for selection |
| `yield_distributions` | Historical distributions |
| `investor_positions` | Position values for preview |
| `profiles` | Investor details for preview |
| `fee_allocations` | Fee breakdown (post-distribution) |
| `ib_allocations` | IB commissions (post-distribution) |

### RPCs Used
| RPC | When Called |
|-----|-------------|
| `preview_daily_yield_to_fund_v2` | On preview button click |
| `apply_daily_yield_to_fund_v2` | On apply button click |

---

## Join Logic

### Preview Data
```typescript
// Returned by preview RPC as JSON
{
  investors: [{
    investor_id,
    investor_name,
    current_balance,
    ownership_pct,
    gross_yield,
    fee_amount,
    fee_pct,
    net_yield,
    ib_parent_id,
    ib_commission
  }],
  totals: {
    gross_yield,
    total_fees,
    total_ib,
    platform_fee,
    net_to_investors
  }
}
```

### Historical Distributions
```sql
SELECT 
  yd.*,
  f.code as fund_code,
  f.name as fund_name,
  p.email as created_by_email
FROM yield_distributions yd
JOIN funds f ON f.id = yd.fund_id
LEFT JOIN profiles p ON p.id = yd.created_by
WHERE yd.status != 'voided'
ORDER BY yd.effective_date DESC, yd.created_at DESC;
```

---

## Filters

| Filter | Type | Default | Purpose |
|--------|------|---------|---------|
| `fund_id` | UUID select | First active fund | Selects target fund |
| `target_date` | Date picker | Today | Distribution date |
| `purpose` | Enum select | 'reporting' | transaction vs reporting |

---

## Aggregation Rules

### Preview Summary
```
gross_yield = input amount
net_to_investors = Σ (investor.gross_yield - investor.fee_amount)
total_fees = Σ investor.fee_amount
total_ib = Σ ib_commissions
platform_fee = total_fees - total_ib
```

### Validation
```
gross_yield = net_to_investors + total_fees ± 0.01
```

---

## Precision Rules

| Asset Type | Decimal Places | Display |
|------------|----------------|---------|
| BTC | 8 | 0.00000000 |
| ETH | 8 | 0.00000000 |
| USDT/USDC | 6 | 0.000000 |
| USD Display | 2 | 0.00 |
| Percentages | 4 | 0.0000% |

---

## Cache Invalidation

### After Apply
Invalidate these query keys:
- `['funds']`
- `['fund-daily-aum', fundId]`
- `['investor-positions']`
- `['investor-positions', fundId]`
- `['transactions']`
- `['yield-distributions']`
- `['fee-allocations']`
- `['ib-allocations']`
- `['dashboard-stats']`

---

## State Management

### Local State
```typescript
const [selectedFund, setSelectedFund] = useState<string | null>(null);
const [targetDate, setTargetDate] = useState<Date>(new Date());
const [grossAmount, setGrossAmount] = useState<string>('');
const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
const [isApplying, setIsApplying] = useState(false);
```

### React Query Keys
```typescript
const fundsQuery = useQuery({ queryKey: ['funds', 'active'] });
const distributionsQuery = useQuery({ 
  queryKey: ['yield-distributions', selectedFund] 
});
```

---

## Error Handling

| Error | User Message | Recovery |
|-------|--------------|----------|
| Fund has no positions | "No investors in this fund" | Select different fund |
| Distribution already exists | "Yield already applied for this date" | Choose different date |
| Conservation check fails | "Calculation error - amounts don't balance" | Contact support |
| RPC failure | Toast with error message | Retry |

---

## Accessibility

- Date picker is keyboard accessible
- Preview table has proper ARIA labels
- Apply button requires confirmation dialog
- Loading states announced to screen readers
