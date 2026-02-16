
# Grand Simulation: Q4 Fiscal Quarter Stress Test

## Overview

Create a Supabase Edge Function that simulates a full fiscal quarter (4 months) against the test database, exercising every edge case: deposits, yield with fees/IB, compounding on fee wallets, mid-period top-ups, zero yield, and negative yield. The function outputs a full transaction ledger log and pass/fail verdicts.

## Why an Edge Function?

Lovable cannot run Node.js scripts directly. The existing `scripts/flows/` files require a local dev environment. An edge function can be deployed, invoked via `curl`, and produces verifiable output against the real test database.

## Architecture

- **File:** `supabase/functions/grand-simulation/index.ts`
- **Auth:** Requires admin authentication (uses the caller's JWT)
- **Safety:** Uses a dedicated test fund created at simulation start, cleaned up at the end via void operations
- **Output:** JSON containing the full transaction ledger, checkpoint verdicts, and pass/fail summary

## The Simulation Sequence

### Setup Phase
1. Create a temporary test fund (or use an existing empty one) -- the simulation will use the **Euro Yield Fund** (`IND-EURC`, id `58f8bcad-...`) since it likely has zero positions, keeping the test isolated. If it has existing positions, the function will abort with a safety message.
2. Identify test actors:
   - **Investor A (Sam):** Use an existing investor profile
   - **Investor B (New):** Use a second existing investor profile
   - **INDIGO FEES:** `169bb053-36cb-4f6e-93ea-831f0dfeaf1d`
   - **IB (Ryan):** `61a8c8b1-88a9-486d-b10c-f7b2b353a41a` (IB for one of the investors)

### Month 1: November (Foundation)
1. Deposit 100,000 for Investor A (Sam) -- AUM becomes 100,000
2. Deposit 50,000 for Investor B -- AUM becomes 150,000
3. Apply yield: `p_recorded_aum = 165,000` (10% gross on 150,000 = 15,000 gross yield)
4. **Checkpoint 1:** Query all positions in the fund. Verify:
   - Sam net yield = 10,000 * 0.80 = 8,000 (20% fee). Balance = 108,000
   - Investor B net yield = 5,000 * 0.80 = 4,000 (20% fee). Balance = 54,000
   - INDIGO FEES = fee credits from yield
   - IB = commission credits (if Investor B has IB relationship)
   - Total AUM = sum of all positions = 165,000 (conservation check minus dust)

### Month 2: December (Compounding + Top-Up)
1. Dec 5: Sam deposits +20,000. Crystallization fires first (closing AUM = current positions sum + yield since Nov). Then deposit applied.
2. Dec 31: Apply yield: 5% gross on the new AUM (which now includes INDIGO FEES and IB balances from Nov).
3. **Checkpoint 2 (The Compounding Verify):**
   - INDIGO FEES must show a positive yield change (earned yield on its Nov fee capital)
   - IB must show a positive yield change (earned yield on its Nov commission capital)
   - If INDIGO only has `old_capital + new_fees` but no yield-on-capital, FAIL

### Month 3: January (Zero Yield)
1. Jan 31: Apply yield with `p_recorded_aum` = current AUM (0% growth)
2. **Checkpoint 3:**
   - All balances remain identical to Dec 31 values
   - No fees generated (0 gross yield = 0 fees)
   - System does not crash or error

### Month 4: February (Negative Yield / Loss)
1. Feb 28: Apply yield with `p_recorded_aum` = current AUM * 0.98 (-2% loss)
2. **Checkpoint 4:**
   - V5 engine skips negative segments (by design -- "gains only" policy)
   - All balances remain identical to Jan 31 values
   - No fees generated
   - System does not crash

### Cleanup Phase
- Void all transactions created during the simulation (reverse order)
- Or leave them for manual audit (configurable via query param `cleanup=true`)

## Output Format

The function returns a JSON object with:

```text
{
  "simulation": "Q4 Stress Test",
  "ledger": [
    { "date": "2025-11-01", "event": "DEPOSIT", "actor": "Sam", "opening": 0, "change": 100000, "closing": 100000, "fee": 0, "notes": "Initial deposit" },
    { "date": "2025-11-01", "event": "DEPOSIT", "actor": "Investor B", "opening": 0, "change": 50000, "closing": 50000, "fee": 0, "notes": "Initial deposit" },
    { "date": "2025-11-30", "event": "YIELD", "actor": "Sam", "opening": 100000, "change": 8000, "closing": 108000, "fee": 2000, "notes": "10% gross, 20% fee" },
    ...
  ],
  "checkpoints": [
    { "id": 1, "name": "November Foundation", "pass": true, "details": {...} },
    { "id": 2, "name": "December Compounding", "pass": true, "details": {...} },
    { "id": 3, "name": "January Zero Yield", "pass": true, "details": {...} },
    { "id": 4, "name": "February Negative Yield", "pass": true, "details": {...} }
  ],
  "conservation": {
    "total_aum_from_positions": 185000,
    "sum_of_all_balances": 185000,
    "dust": 0,
    "pass": true
  },
  "compounding_proven": true,
  "verdict": "PASS"
}
```

## Pass/Fail Criteria

1. **Zero Dust:** Sum of all closing balances equals fund total AUM to 8 decimal places
2. **Compounding Proven:** INDIGO FEES row for Dec 31 shows a positive yield change
3. **Zero Yield Safe:** Jan 31 balances exactly equal Dec 31 balances
4. **Negative Yield Safe:** Feb 28 balances exactly equal Jan 31 balances (V5 skips losses)
5. **Conservation:** At every checkpoint, gross yield = net yield + fees + IB commissions

## Technical Details

### Files to Create
| File | Purpose |
|------|---------|
| `supabase/functions/grand-simulation/index.ts` | Main simulation edge function |

### RPC Calls Used
- `apply_transaction_with_crystallization` -- for deposits
- `apply_segmented_yield_distribution_v5` -- for yield application
- `check_aum_reconciliation` -- for conservation verification
- Direct queries to `investor_positions`, `transactions_v2`, `fee_allocations`, `ib_allocations` for checkpoint verification

### Safety Measures
- The function checks that the target fund has zero active positions before starting
- All operations use unique `reference_id` values prefixed with `sim:q4:` for easy identification
- The function requires admin authentication
- A `dry_run` query parameter option previews the plan without executing

### Important Design Note on Negative Yield (Month 4)
The V5 engine follows a "gains only" policy. Negative yield segments are skipped, not distributed as losses. This means Month 4 will verify that the system gracefully handles the scenario by leaving balances unchanged, rather than deducting 2% from each wallet. This is the documented and intended behavior.
