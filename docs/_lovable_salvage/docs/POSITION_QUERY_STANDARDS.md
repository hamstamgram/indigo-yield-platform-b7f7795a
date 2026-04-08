# Position Query Standards

## Overview

This document defines the standard patterns for querying the `investor_positions` table to ensure consistent AUM calculations and investor counts across the platform.

## Core Rules

### Rule 1: Filter by Account Type

**Always** filter positions by `account_type = 'investor'` when:
- Calculating AUM for display
- Counting investors in a fund
- Showing ownership composition
- Distributing yield

**Why?** The positions table contains entries for:
- `investor` - Real investor accounts (include these)
- `fees_account` - Fee collection accounts (exclude these)
- `ib_account` - Introducing broker accounts (exclude these)

### Rule 2: Filter by Balance

**Always** filter by `current_value > 0` or `shares > 0` when showing active positions.

**Exception:** Data integrity checks may need to see zero-balance positions.

## Canonical Pattern

```typescript
// Step 1: Fetch positions with balance filter
const { data: positions } = await supabase
  .from("investor_positions")
  .select("investor_id, current_value, ...")
  .eq("fund_id", fundId)
  .gt("current_value", 0);

// Step 2: Fetch profiles to filter by account_type
const investorIds = [...new Set((positions || []).map(p => p.investor_id))];
const { data: profiles } = await supabase
  .from("profiles")
  .select("id, account_type")
  .in("id", investorIds.length > 0 ? investorIds : ['none']);

// Step 3: Create investor set
const investorSet = new Set(
  (profiles || [])
    .filter(p => p.account_type === 'investor')
    .map(p => p.id)
);

// Step 4: Filter positions
const investorPositions = (positions || []).filter(p => investorSet.has(p.investor_id));
```

## Authoritative Source

The `get_funds_with_aum` RPC function is the gold standard. It correctly:
- Filters by `account_type = 'investor'`
- Excludes zero-balance positions
- Returns accurate investor counts

## Services Updated

The following services have been updated to follow this pattern:

| Service | Function |
|---------|----------|
| `dashboardMetricsService` | `getFundInvestorComposition` |
| `yieldHistoryService` | `getFundInvestorCompositionWithYield` |
| `yieldHistoryService` | `getActiveFundsWithAUM` |
| `yieldHistoryService` | `getCurrentFundAUM` |
| `depositWithYieldService` | `getCurrentFundAum` |
| `investorPositionService` | `getPositionsByFund` |

## Exceptions

These cases may intentionally skip the `account_type` filter:
- `dataIntegrityService` - Needs to check all positions for consistency
- Admin cleanup operations - May need to see fee account positions

## Related Memory

See memory: `accounting/crystallize-before-flows-model-v3` for yield calculation context.
