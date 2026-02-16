

# Grand Simulation + Automated Monthly Reporting

Two edge functions to create: the Q4 Stress Test simulation followed by the automated monthly report scheduler.

---

## Part 1: Grand Simulation Edge Function

### Purpose
A deployable stress test that simulates a full fiscal quarter (4 months) against the live test database, verifying deposits, yield with fees/IB, compounding on fee wallets, mid-period top-ups, zero yield, and negative yield.

### Test Fund and Actors
- **Fund:** Euro Yield Fund (`IND-EURC`, id `58f8bcad-56b0-4369-a6c6-34c5d4aaa961`) -- confirmed zero active positions
- **Sam Johnson** (`a4e69247-...`): fee_pct=16%, IB parent = Ryan
- **Investor B (Anne Cecile Noique)** (`85101af0-...`): fee_pct=20%, IB parent = QA IB
- **INDIGO FEES** (`169bb053-...`): fee_pct=0%, fees_account
- **Ryan (IB)** (`61a8c8b1-...`): Sam's IB, fee_pct=20%

### Simulation Sequence

**Month 1 -- November (Foundation):**
1. Deposit 100,000 EURC for Sam
2. Deposit 50,000 EURC for Anne
3. Apply yield: recorded_aum = 165,000 (10% gross on 150,000 = 15,000 gross yield)
4. Checkpoint 1: Verify balances, fees, IB credits, conservation (sum = 165,000)

**Month 2 -- December (Compounding + Top-Up):**
1. Sam deposits +20,000 EURC (triggers crystallization)
2. Apply yield: 5% gross on new AUM (includes INDIGO/IB balances from Nov)
3. Checkpoint 2: Verify INDIGO FEES earned yield on its Nov capital (compounding proof)

**Month 3 -- January (Zero Yield):**
1. Apply yield with recorded_aum = current AUM (0% growth)
2. Checkpoint 3: All balances unchanged, no errors

**Month 4 -- February (Negative Yield):**
1. Apply yield with recorded_aum = current AUM * 0.98 (-2% loss)
2. Checkpoint 4: V5 engine skips negative segments -- balances unchanged

**Cleanup Phase:**
- Void all simulation transactions in reverse order (configurable via `cleanup=true` query param)

### Output
JSON with full transaction ledger, 4 checkpoint verdicts, conservation check, compounding proof, and overall PASS/FAIL verdict.

### Pass/Fail Criteria
1. Zero Dust: sum of closing balances = fund AUM to 8 decimal places
2. Compounding Proven: INDIGO FEES shows positive yield change in December
3. Zero Yield Safe: January balances = December balances exactly
4. Negative Yield Safe: February balances = January balances (V5 skips losses)
5. Conservation: gross yield = net yield + fees + IB at every checkpoint

---

## Part 2: Monthly Report Scheduler Edge Function

### Purpose
Automate end-of-month report generation and email delivery via pg_cron.

### How It Works
1. pg_cron fires on days 28-31 at 23:00 UTC
2. The function checks if today is actually the last day of the month
3. Calls `generate-fund-performance` (calculates MTD/QTD/YTD/ITD + generates HTML statements)
4. Calls `process-report-delivery-queue` (emails statements to investors)
5. Logs results to `admin_alerts`

### Authentication
- pg_cron cannot send JWTs, so the function validates a shared `CRON_SECRET` header
- Uses `SUPABASE_SERVICE_ROLE_KEY` internally to call downstream functions

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/grand-simulation/index.ts` | CREATE | Q4 stress test simulation |
| `supabase/functions/monthly-report-scheduler/index.ts` | CREATE | Automated monthly reporting orchestrator |
| `supabase/config.toml` | MODIFY | Add `verify_jwt = false` for both new functions |

## Secret Required

A `CRON_SECRET` must be added for the monthly-report-scheduler. The grand-simulation function uses standard JWT admin auth (no new secrets needed).

## Post-Deployment Steps (Manual)

After deployment, the following SQL must be run in the Supabase SQL Editor to schedule the cron job:

```text
SELECT cron.schedule(
  'monthly-report-generation',
  '0 23 28-31 * *',
  $$ SELECT net.http_post(
    url := 'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/monthly-report-scheduler',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>","x-cron-secret":"<CRON_SECRET>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id; $$
);
```

## Execution Plan

1. Create `grand-simulation/index.ts` -- the full simulation engine
2. Create `monthly-report-scheduler/index.ts` -- the cron orchestrator
3. Update `config.toml` with both new function entries
4. Deploy both functions
5. Invoke grand-simulation to run the stress test
6. Review results and share the ledger output

