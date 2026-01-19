# Fee Functions Reference

## Fee Types and Storage

| Fee Type | Storage Location | Column | Has Schedule Support |
|----------|------------------|--------|---------------------|
| Platform Fee (INDIGO) | `investor_fee_schedule` + `profiles` fallback | `fee_pct` | Yes |
| IB Commission | `profiles` only | `ib_percentage` | No |

## Platform Fee Resolution

The `_resolve_investor_fee_pct(investor_id, fund_id, date)` function resolves platform fees:

1. Check `investor_fee_schedule` for fund-specific entry (matching fund_id, within date range)
2. Check `investor_fee_schedule` for global entry (fund_id IS NULL, within date range)
3. Fallback to `profiles.fee_pct`
4. Default: 20%

### investor_fee_schedule Table

```sql
investor_id UUID     -- The investor
fund_id     UUID     -- NULL for global, specific UUID for fund-targeted
fee_pct     NUMERIC  -- Percentage (e.g., 18 for 18%)
start_date  DATE     -- When this rate becomes effective
end_date    DATE     -- NULL for currently active, set when superseded
```

## IB Commission Resolution

IB commission is read directly from `profiles.ib_percentage`:

- No schedule table - single value per investor
- No fund-specific overrides
- Default: 0% (no IB commission)

The `ib_parent_id` column on `profiles` determines which IB receives the commission.

## Fee Calculation in Yield Distribution

Both fees are calculated as **independent percentages of GROSS yield** (not cascading):

```
gross_yield = new_aum - previous_aum

platform_fee = gross_yield × (fee_pct / 100)
ib_fee       = gross_yield × (ib_percentage / 100)

net_yield = gross_yield - platform_fee - ib_fee
```

### ⚠️ CRITICAL: IB is NOT a percentage of the platform fee

**CORRECT** (both fees from GROSS):
```
Gross Yield: 355 XRP
Indigo Fee (18%): 355 × 0.18 = 63.90 XRP
IB Fee (2%):      355 × 0.02 =  7.10 XRP
Total Fees:                    71.00 XRP
Net to Investor:              284.00 XRP
```

**WRONG** (IB as percentage of fee):
```
❌ IB Fee = Indigo Fee × (ib_pct / 100)  -- THIS IS INCORRECT
```

### Worked Example

| Investor | Gross Yield | Indigo % | IB % | Indigo Credit | IB Credit | Net Yield |
|----------|-------------|----------|------|---------------|-----------|-----------|
| Alice    | 1,000 USDC  | 18%      | 0%   | 180 USDC      | 0 USDC    | 820 USDC  |
| Bob      | 1,000 USDC  | 18%      | 2%   | 180 USDC      | 20 USDC   | 800 USDC  |
| Charlie  | 500 USDC    | 15%      | 5%   | 75 USDC       | 25 USDC   | 400 USDC  |

## Database Functions

### _resolve_investor_fee_pct(investor_id, fund_id, date)

- **Type**: Internal helper (called by yield distribution RPCs)
- **Purpose**: Resolves platform fee percentage
- **Returns**: Decimal fee percentage

### route_withdrawal_to_fees(request_id, reason)

- **Type**: Mutation RPC
- **Frontend**: `withdrawalService.routeToFees()`
- **Purpose**: Routes approved withdrawal to INDIGO FEES account
- **Creates**: INTERNAL_WITHDRAWAL + INTERNAL_CREDIT transaction pair

### internal_route_to_fees(...)

- **Type**: Mutation RPC
- **Frontend**: `internalRouteService.executeInternalRoute()`
- **Purpose**: Admin-initiated transfer to INDIGO FEES account

## Database Triggers

| Trigger | Table | Purpose |
|---------|-------|---------|
| `trg_auto_close_previous_fee_schedule` | `investor_fee_schedule` | Auto-closes previous entries when new one inserted |
| `trg_audit_fee_schedule_changes` | `investor_fee_schedule` | Logs changes to audit_log |
| `trg_enforce_fees_account_zero_fee` | `profiles` | Ensures INDIGO FEES account has 0% fee |

## Frontend Services

| Service | Location | Purpose |
|---------|----------|---------|
| `feeScheduleService` | `services/shared/` | CRUD for platform fee schedules |
| `feesService` | `services/admin/` | Fee overview dashboard data |
| `internalRouteService` | `services/admin/` | Route funds to INDIGO FEES |

## INDIGO FEES Account

All collected fees are routed to the central INDIGO FEES account:

- **UUID**: `169bb053-36cb-4f6e-93ea-831f0dfeaf1d`
- **account_type**: `fees_account`
- **fee_pct**: Always 0% (enforced by trigger)

The account accumulates:
- Platform fees from yield distribution
- IB commissions from yield distribution
- Routed withdrawals (fee settlements)

## Related Memory References

- `memory/accounting/yield-fee-calculation-standard` - Fee calculation rules
- `memory/accounting/yield-fee-logic-v6` - Hierarchical fee lookup
- `memory/features/fee-routing-indigo-fees-account` - INDIGO FEES routing
- `memory/features/investor-fee-schedule-management` - Fee schedule UI
