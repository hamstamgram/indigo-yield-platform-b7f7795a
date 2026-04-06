

# Cleanup Remaining Test Data

## Problem
The previous cleanup migration removed child records (transactions, allocations, profiles, etc.) but left behind:
- **158 yield_distributions** referencing 5 TEST funds
- **158 fund_daily_aum** records for TEST funds
- **5 TEST funds** (status: `deprecated`)

This causes "Unknown Fund" in the Yield Distributions page because `useFunds(true)` filters to `active` status only, so the deprecated TEST funds aren't in the fund lookup map.

## Fix — Single Migration

One migration that deletes in dependency order:

1. **DELETE `fund_daily_aum`** where `fund_id` in the 5 TEST fund IDs
2. **DELETE `yield_distributions`** where `fund_id` in the 5 TEST fund IDs
3. **DELETE `funds`** where `id` in the 5 TEST fund IDs

No trigger/RLS bypasses needed — these tables allow admin DELETE via RLS, and the migration runs as superuser.

### TEST Fund IDs
```
00746a0e-6054-4474-981c-0853d5d4f9b7  (TEST-BTC)
44cb78f6-0ab8-4449-87f0-8d6a8af29c2d  (TEST-ETH)
b0f083b2-936c-4221-aacc-6988e70c2870  (TEST-SOL)
ec01a77f-549d-4df1-aa67-b8f415e26775  (TEST-USDT)
14e0f00a-fb6b-4350-b2e5-ff0cb19fb214  (TEST-XRP)
```

### Expected Result
- Yield Distributions page shows only production data (45 distributions across 5 real funds)
- No more "Unknown Fund" entries
- Total rows deleted: ~321 (158 + 158 + 5)

