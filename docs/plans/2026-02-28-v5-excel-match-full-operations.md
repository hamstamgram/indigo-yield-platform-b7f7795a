# V5 Excel Match - Full Platform Operations Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Indigo Yield Platform produce identical financial results to the Excel spreadsheet for all 48 fund-months, verified end-to-end through the UI.

**Architecture:** Fix V5 yield engine (opening-balance allocation, segment boundaries, investor discovery, dust routing), configure IB commission schedules with fund-specific activation dates, void all 409 direct-seeded yields, replay all 48 fund-months via Playwright MCP automation through the Admin UI, verify every investor portal page and statement.

**Tech Stack:** PostgreSQL (Supabase), React/TypeScript, Playwright MCP, V5 segmented yield engine

---

## Pre-Requisites (Already Done)

Three SQL migrations have been written and are ready to apply:

1. `supabase/migrations/20260228_fix_v5_opening_balance_allocation.sql` (740 lines)
   - Change A: Opening-balance-only allocation (snapshot before flows, allocate to opening holders)
   - Change B: Segment boundary `>=` instead of `>`
   - Change C: Transactions-based investor discovery (no is_active gate)
   - Change D: Dust routing to fees_account (no fee/IB on dust)
   - Change E: IB comment fix (from NET -> from GROSS)

2. `supabase/migrations/20260228_fix_v5_preview_match_apply.sql` (386 lines)
   - Same 5 changes applied to the preview function

3. `supabase/migrations/20260228_ib_commission_schedule_activation_dates.sql` (294 lines)
   - Fund-specific IB activation dates for all 5 IB relationships
   - `investor_fee_schedule` entries for pre-activation combined rates
   - `profiles.ib_percentage = NULL` for IB-sourced investors

## Key References

| Item | Value |
|------|-------|
| Fund IDs | BTC=0a048d9b, ETH=717614a2, SOL=7574bc81, USDT=8ef9dc49, XRP=2c123c4f |
| Admin UUID | a16a7e50-fefd-4bfe-897c-d16279b457c2 |
| Admin Login | adriel@indigo.fund / TestAdmin2026! |
| Investor Login | qa.investor@indigo.fund / QaTest2026! |
| DB Connection | `PGPASSFILE=temp_pgpass psql "postgresql://postgres.nkfimvovosdehmyyjubn@aws-0-us-east-2.pooler.supabase.com:6543/postgres"` |
| Seed Data | `scripts/seed-data/performance.json` (153 segments), `scripts/seed-data/fund-balances.json` (1573 records) |
| IB Schedule UI | Already exists at `src/features/admin/investors/components/shared/IBScheduleSection.tsx` (mounted in InvestorSettingsTab) |
| IB Schedule Service | `src/services/admin/ibScheduleService.ts` (CRUD: get, add, delete) |
| Fee Schedule Service | `src/services/admin/feeScheduleService.ts` (CRUD: get, add, delete, update) |

## Yield Waterfall (Excel-Matching Formula)

```
Recorded AUM (from wallet balance)
  |
  +-- Gross Yield = Recorded AUM - SUM(opening_balances) - SUM(flows_in_segment)
  |
  +-- Per-Investor Allocation (proportional to opening_balance):
  |     +-- Fee = gross_allocation * fee_pct / 100
  |     +-- IB  = gross_allocation * ib_pct / 100  (from GROSS, additive)
  |     +-- Net = gross_allocation - fee - ib
  |
  +-- Dust (rounding residual) -> fees_account (no fee/IB)
  |
  +-- Conservation: gross = SUM(net) + SUM(fee) + SUM(ib) + dust
```

---

### Task 1: Apply 3 SQL Migrations to Production

**Files:**
- Apply: `supabase/migrations/20260228_fix_v5_opening_balance_allocation.sql`
- Apply: `supabase/migrations/20260228_fix_v5_preview_match_apply.sql`
- Apply: `supabase/migrations/20260228_ib_commission_schedule_activation_dates.sql`

**Step 1: Apply V5 apply function fix**

Run:
```bash
PGPASSFILE=temp_pgpass psql "postgresql://postgres.nkfimvovosdehmyyjubn@aws-0-us-east-2.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/20260228_fix_v5_opening_balance_allocation.sql
```
Expected: `CREATE OR REPLACE FUNCTION` success message

**Step 2: Apply V5 preview function fix**

Run:
```bash
PGPASSFILE=temp_pgpass psql "postgresql://postgres.nkfimvovosdehmyyjubn@aws-0-us-east-2.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/20260228_fix_v5_preview_match_apply.sql
```
Expected: `CREATE OR REPLACE FUNCTION` success message

**Step 3: Apply IB commission schedule activation dates**

Run:
```bash
PGPASSFILE=temp_pgpass psql "postgresql://postgres.nkfimvovosdehmyyjubn@aws-0-us-east-2.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/20260228_ib_commission_schedule_activation_dates.sql
```
Expected: INSERT/UPDATE success messages

**Step 4: Verify migrations applied**

Run:
```sql
-- Verify V5 apply function exists with latest changes
SELECT prosrc LIKE '%opening_balance%' AS has_opening_balance
FROM pg_proc WHERE proname = 'apply_segmented_yield_distribution_v5';
-- Expected: true

-- Verify IB schedule entries
SELECT COUNT(*) FROM ib_commission_schedule;
-- Expected: 13 (fund-specific entries for 5 IB relationships)

-- Verify fee schedule entries
SELECT COUNT(*) FROM investor_fee_schedule;
-- Expected: >= 10 (pre-activation combined rates + post-activation base rates)
```

**Step 5: Commit**

```bash
git add supabase/migrations/20260228_fix_v5_opening_balance_allocation.sql \
        supabase/migrations/20260228_fix_v5_preview_match_apply.sql \
        supabase/migrations/20260228_ib_commission_schedule_activation_dates.sql
git commit -m "feat: fix V5 engine to match Excel spreadsheet

- Opening-balance-only allocation (no yield for same-segment depositors)
- Segment boundary >= instead of >
- Transactions-based investor discovery (no is_active gate)
- Dust routing to fees_account
- Fund-specific IB activation dates for all 5 IB relationships
- Pre-activation combined fee rates via investor_fee_schedule"
```

---

### Task 2: Set System to Backfill Mode

**Step 1: Switch to backfill mode**

Run:
```sql
UPDATE system_config SET value = '"backfill"' WHERE key = 'system_mode';
SELECT value FROM system_config WHERE key = 'system_mode';
```
Expected: `"backfill"`

Note: This disables `enforce_economic_date` trigger so we can insert historical data. MUST be restored to `"live"` at the end.

---

### Task 3: Void All Direct-Seeded Yield Transactions

**Files:**
- Modify: `transactions_v2` (void 409+ YIELD, FEE_CREDIT, IB_CREDIT)
- Auto-updates: `investor_positions` (via `trg_ledger_sync`)

**Step 1: Count transactions to void**

Run:
```sql
SELECT type, COUNT(*) FROM transactions_v2
WHERE type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT') AND is_voided = false
GROUP BY type ORDER BY type;
```
Expected: YIELD ~409, possibly FEE_CREDIT and IB_CREDIT rows too

**Step 2: Void all YIELD transactions (BTC fund first)**

Run:
```sql
DO $$ BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  UPDATE transactions_v2
  SET is_voided = true, voided_at = NOW(),
      voided_by = 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid
  WHERE type = 'YIELD' AND is_voided = false
    AND fund_id = '0a048d9b-4ead-4c78-876a-8735e5bfae1e';
END; $$;
```
Expected: UPDATE count (BTC YIELD transactions voided)

**Step 3: Repeat for remaining funds**

Run same pattern for ETH (717614a2), SOL (7574bc81), USDT (8ef9dc49), XRP (2c123c4f).

**Step 4: Void all FEE_CREDIT and IB_CREDIT transactions**

Run:
```sql
DO $$ BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  UPDATE transactions_v2
  SET is_voided = true, voided_at = NOW(),
      voided_by = 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid
  WHERE type IN ('FEE_CREDIT', 'IB_CREDIT') AND is_voided = false;
END; $$;
```

**Step 5: Void any existing yield_distributions**

Run:
```sql
DO $$ BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  UPDATE yield_distributions
  SET is_voided = true, voided_at = NOW()
  WHERE is_voided = false;
END; $$;
```

**Step 6: Verify clean state**

Run:
```sql
SELECT type, COUNT(*) FROM transactions_v2
WHERE type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT') AND is_voided = false
GROUP BY type;
-- Expected: 0 rows

SELECT COUNT(*) FROM yield_distributions WHERE is_voided = false;
-- Expected: 0
```

---

### Task 4: Recompute All Positions and AUM

**Step 1: Recompute all investor positions**

Run:
```sql
SELECT recompute_investor_position(
  p_investor_id := ip.investor_id,
  p_fund_id := ip.fund_id
)
FROM investor_positions ip;
```
Expected: All positions recalculated from DEP/WD transactions only

**Step 2: Recalculate AUM for all funds (both purposes)**

Run:
```sql
SELECT recalculate_fund_aum_for_date(
  f.id, CURRENT_DATE, 'transaction'::aum_purpose
)
FROM funds f WHERE f.status = 'active';

SELECT recalculate_fund_aum_for_date(
  f.id, CURRENT_DATE, 'reporting'::aum_purpose
)
FROM funds f WHERE f.status = 'active';
```

**Step 3: Verify integrity**

Run:
```sql
SELECT * FROM v_ledger_reconciliation;          -- Must be empty
SELECT * FROM fund_aum_mismatch;                -- Must be empty
SELECT * FROM v_orphaned_positions;             -- Must be empty
SELECT * FROM v_orphaned_transactions;          -- Must be empty
```

---

### Task 5: Verify Withdrawal Dates Against Spreadsheet

**Files:**
- Read: `scripts/seed-data/transactions.json`
- Query: `transactions_v2` in production DB

**Step 1: Extract withdrawal dates from seed data**

Run:
```bash
node -e "
const txs = require('./scripts/seed-data/transactions.json');
const wds = txs.filter(t => t.type === 'withdrawal');
wds.forEach(w => console.log(w.date, w.fund, w.investorName, w.amount));
"
```

**Step 2: Compare against DB withdrawal transactions**

Run:
```sql
SELECT t.tx_date, f.asset, p.first_name, p.last_name, t.amount
FROM transactions_v2 t
JOIN funds f ON f.id = t.fund_id
JOIN profiles p ON p.id = t.investor_id
WHERE t.type = 'WITHDRAWAL' AND t.is_voided = false
ORDER BY t.tx_date, f.asset;
```

**Step 3: Fix any date mismatches**

If dates differ, create a targeted migration to fix `tx_date` values.

---

### Task 6: Create Crystallization Markers Script

**Files:**
- Create: `scripts/create-crystallization-markers.ts`
- Read: `scripts/seed-data/performance.json`
- Read: `scripts/seed-data/transactions.json`

**Step 1: Write the crystallization markers script**

This script reads `performance.json` to find multi-segment months (same fund+month appearing more than once), then creates `yield_distributions` records with `distribution_type = 'transaction'` at each segment boundary date. This gives V5 the segment boundaries it needs.

For each multi-segment month:
1. Find the transaction(s) from `transactions.json` that match the flow amount
2. Create a crystallization-type `yield_distributions` record at that date
3. The V5 engine will then detect these as segment boundaries

```typescript
// scripts/create-crystallization-markers.ts
// Reads performance.json, finds multi-segment months,
// creates yield_distributions markers at flow dates
// so V5 can build correct segments.
```

Key logic:
- Group performance.json entries by `{month, fund}`
- For groups with 2+ entries (multi-segment months), the transition points are flow dates
- Match each flow to a transaction in `transactions.json` by fund+amount
- Create `yield_distributions` record with `distribution_type = 'deposit'` or `'withdrawal'`
- Set `effective_date` to the transaction date
- Must bypass canonical mutation trigger

**Step 2: Run the script**

Run: `npx tsx scripts/create-crystallization-markers.ts`
Expected: Markers created for each multi-segment boundary

**Step 3: Verify markers**

Run:
```sql
SELECT yd.effective_date, yd.distribution_type, f.asset, yd.period_end
FROM yield_distributions yd
JOIN funds f ON f.id = yd.fund_id
WHERE yd.is_voided = false
ORDER BY yd.effective_date;
```

---

### Task 7: Replay All 48 Fund-Months via Playwright MCP

**Files:**
- Use: Playwright MCP (browser automation)
- Reference: `scripts/seed-data/performance.json` (AUM values per segment)
- Reference: `scripts/seed-data/fund-balances.json` (expected balances)

This is the core replay. For EACH of the 48 fund-months, chronologically:

1. Navigate to Admin > Yield Operations
2. Select the fund
3. Enter the period end date (last day of month)
4. Enter the recorded AUM (last segment's `closingAum` from performance.json)
5. Click Preview
6. Verify preview shows reasonable values
7. Click Apply
8. Verify conservation identity for the distribution
9. Compare investor balances against `fund-balances.json`
10. Stop immediately on any mismatch > dust tolerance

**Month Schedule (48 fund-months):**

| Month | Funds |
|-------|-------|
| 2024-07 | BTC (inception, deposits only - may be zero yield) |
| 2024-08 | BTC (2 segments) |
| 2024-09 | BTC, USDT |
| 2024-10 | BTC, USDT, ETH |
| 2024-11 | BTC (negative), USDT, ETH |
| 2024-12 | BTC, USDT, ETH |
| 2025-01 through 2025-05 | BTC, USDT, ETH (+ SOL from 2025-04, + XRP from 2025-11) |
| 2025-06 through 2026-01 | All active funds |

**Step 1: Prepare AUM schedule**

Extract from performance.json the closing AUM for each fund-month (use last segment's `closingAum` for multi-segment months).

**Step 2: Automate via Playwright MCP**

For each fund-month in chronological order:
- Navigate to yield input form
- Fill in fund, date, AUM
- Preview, then apply
- Verify after each

**Step 3: Verify after EACH distribution**

After each apply:
```sql
-- Conservation check
SELECT yd.id, f.asset, yd.period_end,
  yd.gross_yield_amount,
  yd.total_net_amount + yd.total_fee_amount + yd.total_ib_amount + COALESCE(yd.dust_amount, 0) AS components_sum,
  yd.gross_yield_amount - (yd.total_net_amount + yd.total_fee_amount + yd.total_ib_amount + COALESCE(yd.dust_amount, 0)) AS residual
FROM yield_distributions yd
JOIN funds f ON f.id = yd.fund_id
WHERE yd.is_voided = false
ORDER BY yd.period_end DESC, f.asset
LIMIT 1;
-- residual MUST be exactly 0
```

**Step 4: On mismatch, stop and diagnose**

If any investor balance differs from fund-balances.json beyond dust tolerance:
1. Document: investor, fund, month, expected vs actual, diff
2. Check fee %, IB %, allocation proportion
3. Fix root cause (V5 engine or data)
4. Void that distribution, recompute positions, re-apply
5. Continue

---

### Task 8: Full Integrity Audit

**Step 1: Run all 6 integrity views**

Run:
```sql
SELECT 'v_ledger_reconciliation' AS view, COUNT(*) FROM v_ledger_reconciliation
UNION ALL
SELECT 'fund_aum_mismatch', COUNT(*) FROM fund_aum_mismatch
UNION ALL
SELECT 'yield_distribution_conservation_check', COUNT(*) FROM yield_distribution_conservation_check
UNION ALL
SELECT 'v_orphaned_positions', COUNT(*) FROM v_orphaned_positions
UNION ALL
SELECT 'v_orphaned_transactions', COUNT(*) FROM v_orphaned_transactions
UNION ALL
SELECT 'v_fee_calculation_orphans', COUNT(*) FROM v_fee_calculation_orphans;
```
ALL must return 0.

**Step 2: Run invariant checks**

Run:
```sql
SELECT * FROM run_invariant_checks();
```
All 16 checks must PASS.

**Step 3: Per-distribution conservation audit**

Run:
```sql
SELECT yd.id, f.asset, yd.period_end,
  yd.gross_yield_amount,
  yd.total_net_amount, yd.total_fee_amount, yd.total_ib_amount, yd.dust_amount,
  yd.gross_yield_amount - (yd.total_net_amount + yd.total_fee_amount + yd.total_ib_amount + COALESCE(yd.dust_amount, 0)) AS residual
FROM yield_distributions yd
JOIN funds f ON f.id = yd.fund_id
WHERE yd.is_voided = false
ORDER BY yd.period_end, f.asset;
```
ALL residuals must be exactly 0.

**Step 4: Per-investor fee verification**

Run:
```sql
SELECT p.first_name, p.last_name, f.asset, yd.period_end,
  fa.fee_percentage, fa.fee_amount,
  ya.gross_yield AS investor_gross,
  CASE WHEN ya.gross_yield > 0 THEN ROUND(fa.fee_amount / ya.gross_yield * 100, 2) ELSE 0 END AS actual_fee_pct
FROM yield_allocations ya
JOIN fee_allocations fa ON fa.distribution_id = ya.distribution_id AND fa.investor_id = ya.investor_id
JOIN yield_distributions yd ON yd.id = ya.distribution_id
JOIN funds f ON f.id = yd.fund_id
JOIN profiles p ON p.id = ya.investor_id
WHERE yd.is_voided = false AND ya.gross_yield > 0
ORDER BY yd.period_end, f.asset, p.last_name;
```

**Step 5: IB commission verification**

Run:
```sql
SELECT sp.first_name || ' ' || sp.last_name AS source_investor,
  ip.first_name || ' ' || ip.last_name AS ib_recipient,
  ia.ib_percentage, ia.ib_fee_amount,
  f.asset, yd.period_end
FROM ib_allocations ia
JOIN yield_distributions yd ON yd.id = ia.distribution_id
JOIN funds f ON f.id = yd.fund_id
JOIN profiles sp ON sp.id = ia.source_investor_id
JOIN profiles ip ON ip.id = ia.ib_investor_id
WHERE yd.is_voided = false
ORDER BY yd.period_end, f.asset, sp.last_name;
```

---

### Task 9: Verify Investor Portal Pages via Playwright MCP

**Step 1: Log in as test investor**

Navigate to the platform, log in with qa.investor@indigo.fund / QaTest2026!

**Step 2: Verify Overview page**

- Check balance displays correctly (3 decimal places)
- Check YTD Return shows a value (not always zero)
- Take screenshot

**Step 3: Verify Yield History page**

- Check yield entries appear (one per month per fund)
- Check amounts match expected net yield
- Check no cross-currency summing issues
- Take screenshot

**Step 4: Verify Portfolio page**

- Check per-fund positions display
- Check current_value matches expected
- Take screenshot

**Step 5: Verify Transactions page**

- Check DEPOSIT, WITHDRAWAL, and YIELD transactions appear
- Check YIELD visibility (should be `investor_visible` for reporting purpose)
- Take screenshot

**Step 6: Verify Statements page**

- Check monthly statements generate
- Check statement amounts match yield distributions
- Take screenshot

---

### Task 10: Restore System Mode and Final Smoke Test

**Step 1: Restore live mode**

Run:
```sql
UPDATE system_config SET value = '"live"' WHERE key = 'system_mode';
SELECT value FROM system_config WHERE key = 'system_mode';
```
Expected: `"live"`

**Step 2: Admin portal smoke test via Playwright MCP**

Navigate and verify:
- Dashboard: fund cards show correct AUM, investor counts
- Investors: all investors listed with correct balances
- Transactions: YIELD, FEE_CREDIT, IB_CREDIT transactions visible
- Yield Distributions: all 48 distributions listed
- IB Management: IB relationships visible
- System Health: all green
- Integrity: all views empty

**Step 3: Run tsc**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Run build**

Run: `npm run build`
Expected: Clean build

---

### Task 11: Document Results

**Step 1: Create summary report**

Document:
- Total yield distributions applied: 48
- Total yield_allocations created: X
- Total fee_allocations created: X
- Total ib_allocations created: X
- Conservation violations: 0
- Balance mismatches: X (all within dust tolerance)
- Integrity views: all empty
- Invariant checks: 16/16 PASS
- Investor portal: all pages verified
- Statements: verified

**Step 2: Commit all changes**

```bash
git add -A
git commit -m "feat: complete V5 Excel match - all 48 fund-months replayed and verified"
```

---

## Risk Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| V5 segments without crystallization markers | HIGH | Task 6 creates markers from performance.json before replay |
| Fee % mismatch in pre-activation months | HIGH | Migration 3 adds investor_fee_schedule with combined rates |
| Investor positions corrupted after void | MEDIUM | Task 4 recomputes from ledger; integrity views verify |
| Multi-segment AUM doesn't match | MEDIUM | Use last segment closingAum; verify after each distribution |
| Rounding differences | LOW | 3-decimal investor display; dust to fees_account; conservation audit |

## Success Criteria

- All 48 fund-months replayed through V5 engine via Admin UI
- Conservation identity holds (residual = 0) for every distribution
- All investor balances match fund-balances.json within dust tolerance
- All 6 integrity views return 0 rows
- All 16 invariant checks PASS
- All investor portal pages display correct data
- System restored to live mode
- tsc and build clean
