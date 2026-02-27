# Fresh Seed Plan — Indigo Yield Platform
**Date:** 2026-02-25  
**Status:** DB wiped (transactions=0, positions=0, distributions=0). Profiles + fee schedules + IB schedules kept.

---

## Ground Rules (from Excel + Ba)

### R1 — Period End Date Normalization
Excel dates are event dates, NOT period-end dates. Always use last day of the month as `period_end` / `tx_date` for reporting rows.
- Excel says Sep 27 → platform uses Sep 30
- Excel says Dec 14 → platform uses Dec 31

### R2 — Event Types
Each column in the Excel is one of:
- **Flow event** (gross_pct = null/1.0/0 AND topup ≠ 0): deposit or withdrawal — apply via RPC before yield
- **Yield event** (gross_pct > 0 and not 1.0): yield distribution — apply via V5 engine
- **Top-up on reporting day**: deposit that happens SAME day as a yield event → apply yield FIRST, then deposit

### R3 — Full Withdrawal Dust Routing
When an investor fully withdraws:
1. Platform records WITHDRAWAL for the exact amount the investor receives
2. The delta between investor's position and withdrawn amount = dust → credited to Indigo Fees position
3. The UI "withdrawal amount" field = what investor gets; the rest auto-routes to Indigo Fees

### R4 — IB Activation Dates
All IB relationships activate from the FIRST month they appear in the Excel investor cell (not a fixed global date).
- Babak → Lars (ETH): Lars first appears with a value in the Sep 2025 column → activates Sep 2025
- Sam Johnson → Ryan Van Der Wall: Ryan first appears with non-zero value → check per fund
- Paul Johnson → Alex Jacobs: Alex first appears with non-zero value → check per fund

### R5 — Negative Yield Months
Some months have gross_pct = 0 (fund lost nothing / no yield). These are NOT yield distribution events — skip them. The Excel shows the running balance carried forward unchanged.
- A `topup = -X` with `gross_pct = 0` = pure withdrawal event, no yield.

### R6 — Multi-Segment Months  
Multiple events in the same month = multiple segments. Each segment uses the `aum_after` of the PREVIOUS row as its opening AUM. Yield is allocated to opening-balance holders only (before flows applied in that segment).

---

## Execution Plan

### Phase 1: Extract & Parse Excel (script: `scripts/extract-excel-v2.ts`)

For each fund sheet, extract in chronological order:
1. All flow events (deposits/withdrawals) with exact amounts and investor breakdowns from comments
2. All yield events with gross_pct, aum_before (= previous aum_after), aum_after
3. Map to period_end (last day of month)
4. Flag top-up-on-reporting-day events

Output: `scripts/seed-data/excel-events-v2.json`
Format per event:
```json
{
  "fund": "BTC",
  "date": "2024-08-01",
  "period_end": "2024-08-31",
  "type": "yield" | "deposit" | "withdrawal",
  "gross_pct": 0.006343,
  "aum_before": 3.468,
  "aum_after": 3.49,
  "investor_amounts": {"Jose Molla": 3.4856, "Kyle Gulamerian": 0.0, ...},
  "comment": "..."
}
```

### Phase 2: Seed Deposits & Withdrawals

Chronologically per fund, apply deposits/withdrawals using canonical RPCs:
- `apply_deposit_with_crystallization(p_investor_id, p_fund_id, p_amount, p_economic_date, p_reference_id)`
- `apply_withdrawal_with_crystallization(p_investor_id, p_fund_id, p_amount, p_economic_date, p_reference_id)`

For full withdrawals: amount = investor's position at that date. Dust auto-routes to Indigo Fees.

Set system_mode = 'backfill' before seeding historical data.

### Phase 3: Replay Yield Distributions

For each yield event in chronological order:
1. If same date has a top-up: run yield FIRST, then deposit
2. Call `apply_segmented_yield_distribution_v5` with:
   - `p_fund_id`
   - `p_period_end` = last day of month (normalized)
   - `p_recorded_aum` = aum_after from Excel
3. Verify conservation: gross = net + fee + ib + dust
4. Stop on any violation

### Phase 4: Post-Yield Top-ups

Apply any deposits that were flagged as "top-up on same reporting day" AFTER the yield for that period is confirmed.

### Phase 5: Integrity Audit

```sql
SELECT * FROM v_ledger_reconciliation;          -- must be 0
SELECT * FROM fund_aum_mismatch;                -- must be 0
SELECT * FROM yield_distribution_conservation_check; -- must be 0
SELECT * FROM v_orphaned_positions;             -- must be 0
```

### Phase 6: Balance Verification

Compare final investor_positions.current_value against last column in Excel for each investor/fund.
Tolerance: 0.01% or 1 satoshi dust.

### Phase 7: Restore system_mode = 'live'

---

## Fund Event Counts (from Excel parse above)

| Fund | Total Events | Flow Events | Yield Events |
|------|-------------|-------------|--------------|
| BTC  | 78          | ~30         | ~48          |
| ETH  | 34 cols     | ~10         | ~24          |
| USDT | 32 cols     | ~12         | ~20          |
| SOL  | 14 cols     | ~5          | ~9           |
| XRP  | 8 cols      | ~3          | ~5           |

---

## Investor → Profile UUID Map

Needs to be built by querying profiles table and fuzzy-matching Excel names:
- "Indigo Fees" → profiles where role='admin' or name contains 'fee'
- "INDIGO DIGITAL ASSET FUND LP" → exact match or contains 'indigo' + 'fund'
- "danielle Richetta" = "Danielle Richetta" (case-insensitive)
- "Kabbaj" / "Family Kabbaj" / "Kabbaj Fam" → same profile

---

## Known Complexities

1. **BTC sheet has two sections**: rows 1-20 = original investors, rows 22-40 = duplicate section. Use ONLY first section (rows 1-20).
2. **ETH Jul 2025**: massive withdrawal (-178.37 ETH from INDIGO Main Fund) on 2025-07-31 — this is a WITHDRAWAL event with gross_pct=0. Do NOT create yield for this segment.
3. **XRP Jan 2026**: Sam Johnson full withdrawal (-330,500.42 XRP) on 2026-01-02. The Jan 2026 yield (gross_pct=0.003507984683) was on 2026-01-01. Apply yield first (Jan 1), then withdrawal (Jan 2).
4. **BTC Dec 2024**: Kyle/Matthias/Danielle move to Boosted Program (-11.5681 BTC) on Dec 14. This reduces the fund significantly.
5. **SOL Jan 2026**: Sam Johnson full withdrawal (-4873.15 SOL) on Jan 2, after yield on Jan 1.

---

## Success Criteria

- All investor_positions match Excel last-column values within 0.01%
- All yield distributions: conservation_check = true
- All 6 integrity views = 0
- system_mode = 'live'
- Build clean
