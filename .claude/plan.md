# Engine Accuracy Test Plan - XRP & SOL Scenarios via Playwright MCP

## Objective
Validate the V5 event-driven yield engine (migration `20260219_fix_engine_event_driven_yield.sql`) matches Adriel's expected values by executing two fund scenarios through the admin UI using Playwright MCP browser automation.

## Interview Decisions

| Decision | Answer |
|----------|--------|
| Funds | Use EXISTING IND-SOL and IND-XRP funds |
| Existing data | Hard DELETE via SQL (user runs manually) |
| Execution order | XRP first, then SOL |
| Paul's deposit date | 04/09/2025 (same day as yield record) |
| Paul's fees | 13.5% fee + 1.5% IB for Alex Jacobs. Alex Jacobs: 20% fee (via investor_fee_schedule) |
| Sam's fees | 16% fee + 4% IB for Ryan Van Der Wall. Ryan Van Der Wall: 20% fee (via investor_fee_schedule) |
| Fee schedule effective date | Fund inception date |
| INDIGO LP | Regular investor profile with fee_pct=0 (fund's own capital) |
| IB relationships | Need to verify/configure before test |
| Backfill mode | User handles manually (switch before, restore after) |
| Event sequence (04/09) | Yield FIRST (crystallize INDIGO LP's yield from 02/09), THEN Paul's deposit |
| Same-day crystallization edge case | Test will reveal behavior |
| Post-report deposit (B4) | Test will reveal crystallization behavior |
| Verification scope | Admin portal only |
| Precision | Just verify engine works (conservation identity + ballpark values) |
| Cleanup SQL | Prepare script, user runs manually |
| Screenshots | Every step (maximum evidence) |
| App URL | https://indigo-yield-platform.lovable.app |

---

## Phase 0: Prerequisites (User-Executed)

### 0.1 Cleanup SQL Script (User Runs Manually)
```sql
-- CLEANUP: Hard delete all SOL and XRP fund data
-- Run in Supabase SQL editor BEFORE Playwright test

DO $$
DECLARE
  v_sol_fund_id uuid;
  v_xrp_fund_id uuid;
BEGIN
  -- Get fund IDs
  SELECT id INTO v_sol_fund_id FROM funds WHERE asset = 'SOL' LIMIT 1;
  SELECT id INTO v_xrp_fund_id FROM funds WHERE asset = 'XRP' LIMIT 1;

  -- Bypass canonical RPC guard
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Delete in dependency order
  -- 1. IB allocations
  DELETE FROM ib_allocations WHERE distribution_id IN (
    SELECT id FROM yield_distributions WHERE fund_id IN (v_sol_fund_id, v_xrp_fund_id)
  );

  -- 2. Fee allocations
  DELETE FROM fee_allocations WHERE distribution_id IN (
    SELECT id FROM yield_distributions WHERE fund_id IN (v_sol_fund_id, v_xrp_fund_id)
  );

  -- 3. Yield allocations
  DELETE FROM yield_allocations WHERE distribution_id IN (
    SELECT id FROM yield_distributions WHERE fund_id IN (v_sol_fund_id, v_xrp_fund_id)
  );

  -- 4. IB commission ledger
  DELETE FROM ib_commission_ledger WHERE fund_id IN (v_sol_fund_id, v_xrp_fund_id);

  -- 5. Investor yield events
  DELETE FROM investor_yield_events WHERE fund_id IN (v_sol_fund_id, v_xrp_fund_id);

  -- 6. Fund yield snapshots
  DELETE FROM fund_yield_snapshots WHERE fund_id IN (v_sol_fund_id, v_xrp_fund_id);

  -- 7. Yield distributions
  DELETE FROM yield_distributions WHERE fund_id IN (v_sol_fund_id, v_xrp_fund_id);

  -- 8. Transactions
  DELETE FROM transactions_v2 WHERE fund_id IN (v_sol_fund_id, v_xrp_fund_id);

  -- 9. Investor positions
  DELETE FROM investor_positions WHERE fund_id IN (v_sol_fund_id, v_xrp_fund_id);

  -- 10. Fund daily AUM
  DELETE FROM fund_daily_aum WHERE fund_id IN (v_sol_fund_id, v_xrp_fund_id);

  -- 11. Fund AUM events
  DELETE FROM fund_aum_events WHERE fund_id IN (v_sol_fund_id, v_xrp_fund_id);

  -- 12. Statement periods
  DELETE FROM statement_periods WHERE fund_id IN (v_sol_fund_id, v_xrp_fund_id);

  -- 13. Withdrawal requests for these funds
  DELETE FROM withdrawal_requests WHERE fund_id IN (v_sol_fund_id, v_xrp_fund_id);

  RAISE NOTICE 'Cleanup complete for SOL (%) and XRP (%)', v_sol_fund_id, v_xrp_fund_id;
END $$;
```

### 0.2 IB Relationship & Fee Schedule SQL (User Runs Manually)
```sql
-- Verify and configure IB relationships + fee schedules
-- Run AFTER cleanup, BEFORE Playwright test

DO $$
DECLARE
  v_sol_fund_id uuid;
  v_xrp_fund_id uuid;
  v_paul_id uuid := 'd1f8c666-...'; -- Paul Johnson profile ID (verify)
  v_alex_id uuid := 'd681a28c-...'; -- Alex Jacobs profile ID (verify)
  v_sam_id uuid := '2f7b8bb2-...';  -- Sam Johnson profile ID (verify)
  v_ryan_id uuid := 'f462d9e5-...'; -- Ryan Van Der Wall profile ID (verify)
  v_sol_inception date;
  v_xrp_inception date;
BEGIN
  SELECT id, inception_date INTO v_sol_fund_id, v_sol_inception FROM funds WHERE asset = 'SOL' LIMIT 1;
  SELECT id, inception_date INTO v_xrp_fund_id, v_xrp_inception FROM funds WHERE asset = 'XRP' LIMIT 1;

  -- Ensure IB parent relationships
  UPDATE profiles SET ib_parent_id = v_alex_id WHERE id = v_paul_id AND ib_parent_id IS DISTINCT FROM v_alex_id;
  UPDATE profiles SET ib_parent_id = v_ryan_id WHERE id = v_sam_id AND ib_parent_id IS DISTINCT FROM v_ryan_id;

  -- Ensure IB percentage on profiles (used as fallback)
  -- Paul -> Alex Jacobs IB at 1.5%
  UPDATE profiles SET ib_percentage = 1.5 WHERE id = v_paul_id AND ib_percentage IS DISTINCT FROM 1.5;
  -- Sam -> Ryan Van Der Wall IB at 4%
  UPDATE profiles SET ib_percentage = 4 WHERE id = v_sam_id AND ib_percentage IS DISTINCT FROM 4;

  -- Fee schedules for SOL fund
  -- Paul Johnson: 13.5% fee for SOL
  INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_percentage, effective_date)
  VALUES
    (v_paul_id, v_sol_fund_id, 13.5, COALESCE(v_sol_inception, '2025-01-01'))
  ON CONFLICT DO NOTHING;

  -- Alex Jacobs: 20% fee for SOL (IB account)
  INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_percentage, effective_date)
  VALUES
    (v_alex_id, v_sol_fund_id, 20, COALESCE(v_sol_inception, '2025-01-01'))
  ON CONFLICT DO NOTHING;

  -- Fee schedules for XRP fund
  -- Sam Johnson: 16% fee for XRP
  INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_percentage, effective_date)
  VALUES
    (v_sam_id, v_xrp_fund_id, 16, COALESCE(v_xrp_inception, '2025-01-01'))
  ON CONFLICT DO NOTHING;

  -- Ryan Van Der Wall: 20% fee for XRP (IB account)
  INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_percentage, effective_date)
  VALUES
    (v_ryan_id, v_xrp_fund_id, 20, COALESCE(v_xrp_inception, '2025-01-01'))
  ON CONFLICT DO NOTHING;

  -- Also set fee_pct on profiles as fallback
  UPDATE profiles SET fee_pct = 20 WHERE id = v_ryan_id AND (fee_pct IS NULL OR fee_pct != 20);
  UPDATE profiles SET fee_pct = 20 WHERE id = v_alex_id AND (fee_pct IS NULL OR fee_pct != 20);

  RAISE NOTICE 'IB relationships and fee schedules configured';
END $$;
```

### 0.3 Switch to Backfill Mode (User Runs Manually)
```sql
UPDATE system_config SET value = '"backfill"' WHERE key = 'system_mode';
```

---

## Phase 1: XRP Fund Scenario (Run First)

### Step B1: Create deposit - Sam Johnson +135,003 XRP (17/11/2025)
1. Navigate to `https://indigo-yield-platform.lovable.app`
2. Login as `adriel@indigo.fund` / `TestAdmin2026!`
3. Accept cookie consent banner
4. Remove PWA install banner if present
5. Navigate to Admin > Transactions > New Transaction (or Ledger > New)
6. Select Investor: Sam Johnson
7. Select Fund: XRP fund (IND-XRP)
8. Type: DEPOSIT
9. Amount: 135003
10. Date: 2025-11-17
11. Submit
12. **Screenshot**: Transaction confirmation
13. **Verify**: Navigate to Sam Johnson's investor detail page
14. **Screenshot**: Sam Johnson balance = 135,003 XRP

### Step B2: Create deposit - Sam Johnson +49,000 XRP (25/11/2025)
1. Navigate to New Transaction
2. Select: Sam Johnson, XRP, DEPOSIT, 49000, 2025-11-25
3. Submit (crystallization should trigger but produce 0 yield - no yield recorded between 17/11 and 25/11)
4. **Screenshot**: Transaction confirmation
5. **Verify**: Sam Johnson balance = 184,003 XRP
6. **Screenshot**: Balance verification

### Step B3: Yield Record - Reporting, 184,358 XRP (30/11/2025)
1. Navigate to Yield History / Yield Operations
2. Select Fund: XRP (IND-XRP)
3. Purpose: Reporting
4. Reporting Month: November 2025
5. New AUM: 184358
6. Click "Preview Yield Distribution"
7. **Screenshot**: Preview results showing allocation breakdown
8. **Verify preview**:
   - Fee structure: Sam 16% fee + 4% IB to Ryan, Ryan 20%
   - Sam Johnson gets yield (net ~284 XRP)
   - Ryan Van Der Wall gets IB (~14.20 XRP, 4% of Sam's gross)
   - INDIGO Fees gets fee (~56.80 XRP, 16% of Sam's gross - 4% IB)
   - Conservation: gross = net + fees + IB + dust
9. Click Apply/Confirm
10. **Screenshot**: Applied confirmation
11. Navigate to investor positions
12. **Verify & Screenshot**: Final positions:
    - Sam Johnson: ~184,287 XRP
    - Ryan Van Der Wall: ~14.20 XRP
    - INDIGO Fees: ~56.80 XRP
    - Total AUM: ~184,358 XRP

### Step B4: Create deposit - Sam Johnson +45,000 XRP (30/11/2025, after reporting)
1. Navigate to New Transaction
2. Select: Sam Johnson, XRP, DEPOSIT, 45000, 2025-11-30
3. Submit (test will reveal crystallization behavior)
4. **Screenshot**: Transaction confirmation + any crystallization notice
5. **Verify & Screenshot**: Sam Johnson balance ~229,287 XRP (184,287 + 45,000)

### Step B5: Yield Record - Transaction, 229,731 XRP (08/12/2025)
1. Navigate to Yield Operations
2. Select Fund: XRP
3. Purpose: Transaction
4. Date: 2025-12-08
5. New AUM: 229731
6. Preview
7. **Screenshot**: Preview breakdown
8. **Verify preview**:
   - Sam Johnson: ~+298.31 XRP
   - Ryan Van Der Wall: ~+14.93 XRP
   - INDIGO Fees: ~+59.76 XRP
9. Apply
10. **Screenshot**: Applied confirmation
11. **Verify & Screenshot**: Updated positions

### XRP Verification
1. Navigate to Yield Distributions page - verify all distributions listed
2. Navigate to Integrity/System Health page
3. **Screenshot**: Integrity check results (expect 0 violations)

---

## Phase 2: SOL Fund Scenario (Run Second)

### Step A1: Create deposit - INDIGO LP +1250 SOL (02/09/2025)
1. Navigate to New Transaction
2. Select: INDIGO DIGITAL ASSET FUND LP (or INDIGO LP), SOL fund, DEPOSIT, 1250, 2025-09-02
3. Submit
4. **Screenshot**: Transaction confirmation
5. **Verify & Screenshot**: INDIGO LP balance = 1250 SOL

### Step A2: Yield Record - Transaction, 1252 SOL (04/09/2025)
1. Navigate to Yield Operations
2. Select Fund: SOL (IND-SOL)
3. Purpose: Transaction
4. Date: 2025-09-04
5. New AUM: 1252
6. Preview
7. **Screenshot**: Preview showing INDIGO LP gets +2 SOL, fees = 0
8. Apply
9. **Screenshot**: Applied confirmation
10. **Verify & Screenshot**: INDIGO LP balance = 1252 SOL

### Step A3: Create deposit - Paul Johnson +234.17 SOL (04/09/2025)
1. Navigate to New Transaction
2. Select: Paul Johnson, SOL, DEPOSIT, 234.17, 2025-09-04
3. Submit (crystallization triggers - test will reveal if it produces yield or skips due to same-day)
4. **Screenshot**: Transaction confirmation + crystallization behavior
5. **Verify & Screenshot**: Paul Johnson balance = 234.17 SOL, Fund AUM ~ 1486.17

### Step A4: Yield Record - Reporting, 1500 SOL (30/09/2025)
1. Navigate to Yield Operations
2. Select Fund: SOL
3. Purpose: Reporting
4. Reporting Month: September 2025
5. New AUM: 1500
6. Preview
7. **Screenshot**: Preview allocation breakdown
8. **Verify preview** (cumulative including crystallizations):
   - Fee structure: INDIGO LP 0%, Paul 13.5% fee + 1.5% IB to Alex Jacobs, Alex 20%
   - INDIGO LP: should have total ~1263.65 SOL
   - Paul Johnson: ~236.02 SOL
   - Alex Jacobs: ~0.0327 SOL (IB commission at 1.5% of Paul's gross yield)
   - INDIGO Fees: ~0.2942 SOL (platform fee at 13.5% of Paul's gross - 1.5% IB)
   - Conservation identity holds
9. Apply
10. **Screenshot**: Applied confirmation
11. Navigate to positions
12. **Verify & Screenshot**: Final SOL positions match expected values
    - Total AUM = 1500 SOL

### SOL Verification
1. Navigate to Yield Distributions page - verify distributions
2. Navigate to Integrity page
3. **Screenshot**: Integrity check results

---

## Phase 3: Final Verification

1. Navigate to System Health / Integrity page
2. Run all integrity checks
3. **Screenshot**: All checks pass (0 violations for SOL + XRP)
4. Verify conservation identity holds for all yield distributions
5. **Screenshot**: Final summary

---

## Phase 4: Restore System (User Runs Manually)
```sql
UPDATE system_config SET value = '"live"' WHERE key = 'system_mode';
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Same-day yield + deposit (A2/A3) | Test reveals behavior. If double-count, document and fix engine. |
| Post-report deposit crystallization (B4) | Test reveals. If unexpected yield, document. |
| IB relationships not set | SQL in Phase 0.2 ensures correct setup. |
| Fee schedule not found by engine | Verify engine reads investor_fee_schedule before profiles.fee_pct. |
| Existing data contamination | Hard DELETE in Phase 0.1 ensures clean slate. |
| Backfill mode not enabled | User responsibility - remind before starting Playwright. |

## Playwright MCP Automation Notes

- Use `browser_navigate` for page navigation
- Use `browser_snapshot` to read page state and find interactive elements
- Use `browser_click` for buttons, dropdowns, radio selections
- Use `browser_fill_form` for text inputs
- Use `browser_take_screenshot` at every verification point
- Handle cookie consent: click "Accept All" button
- Handle PWA banner: remove via JS `document.querySelectorAll('[class*="fixed"]').forEach(el => { if (el.textContent?.includes('Install')) el.remove(); })`
- Login button text: "Access Portal ->" (not "Sign In")
- App URL: `https://indigo-yield-platform.lovable.app`
- Admin credentials: `adriel@indigo.fund` / `TestAdmin2026!`
