

# Go-Live QA & Automation Plan

## Phase 1: Go-Live Readiness Report

Create `docs/GO_LIVE_READINESS.md` containing:

- **Audit Summary**: Yield engine parity (5 funds, 1627 checkpoints), fee schedule verification, IB model migration, backend function graph (337 RPCs, 101 triggers, 17 edge functions), UI pipeline (23 pages, Decimal.js throughout), production bug fixes (sync_ib_account_type, fund default 30%→20%, INDIGO LP fee 15%→0%).
- **E2E Test Scope**: Itemized ~70-step coverage list organized by Block A–G.
- **Production Data Baseline**: 5 active funds (BTC, ETH, SOL, USDT, XRP), 2 inactive (EURC, XAUT), ~40 active investors, fees account `b464a3f7-...`.
- **Test Data Cleanup Completed**: 3 migrations executed, ~17,982 test rows purged, 0 test entities remaining.

## Phase 2 & 3: Master Playwright Test Suite

Create `tests/e2e/golive-lifecycle.spec.ts` — a serial test suite that reuses the existing helper patterns from `yield-replay-btc.spec.ts` (login, waitForToast, addTransaction, recordYield) adapted for production funds.

### Technical Approach

- **Auth**: Login as production admin (env vars `QA_EMAIL`/`QA_PASSWORD`, falling back to `qa.admin@indigo.fund`). Since the QA admin was deleted, the test will need a valid admin credential — the suite will use env vars with no hardcoded fallback passwords.
- **DB Parity Snapshots**: After each major state change, query the Supabase REST API (same pattern as `cleanupFundData` in existing specs) and compare against UI-scraped values.
- **Screenshots**: `page.screenshot()` at key checkpoints saved to `test-results/`.
- **Selectors**: Use existing patterns — `getByRole`, `getByText`, `data-testid` where available, `h3:has-text()` for fund cards.

### Test Blocks

**Block A — Onboarding & Deposits (5 steps)**
- Navigate to `/admin/investors`, create new investor profile via UI
- Execute first deposit via New Transaction dialog on a real fund (e.g., BTC)
- Navigate to investor detail, create Fee Schedule entry (CRUD)
- Create IB Commission Schedule entry (CRUD)
- DB snapshot: verify `investor_positions`, `investor_fee_schedule`, `ib_commission_schedule` rows exist

**Block B — Routing & Adjustments (5 steps)**
- Create a withdrawal request, then Route to Fees → verify `INTERNAL_WITHDRAWAL` + `INTERNAL_CREDIT` transaction pair in DB
- Execute internal route between two investors → verify both positions update
- Execute manual position adjustment → verify `investor_positions.current_value` changes
- Trigger crystallize-before-withdrawal flow → verify `last_yield_crystallization_date` updates
- Screenshot + DB snapshot after each

**Block C — Yield & Time Locks (3 steps)**
- Record yield distribution on a fund (transaction purpose) via Record Yield dialog
- Attempt a backdated transaction before the yield date → verify Historical Lock blocks it (expect error toast)
- DB snapshot: verify `yield_distributions`, `yield_allocations`, `fee_allocations` rows

**Block D — Voids, Reissues & Cascades (4 steps)**
- Void a full-exit withdrawal → verify DUST_SWEEP pair also voided in `transactions_v2`
- Reissue the voided transaction → verify positions restored
- Bulk void multiple transactions → verify cascade (all linked allocations voided)
- Bulk unvoid → verify all restored

**Block E — Reconciliation & Notifications (3 steps)**
- Check notifications page for yield notification
- Navigate to `/admin/operations`, run AUM Reconciliation → verify positions sum matches fund AUM
- Run batch position reconciliation → verify zero discrepancies

**Block F — Risk Panels & Admin Actions (5 steps)**
- Navigate to risk/concentration panel → verify alerts render
- Check liquidity risk panel → verify withdrawal pressure calculations display
- Navigate to `/admin/investors` → verify IB badges on investor cards
- Navigate to `/admin` (Command Center) → verify all fund cards render
- Execute investor merge (preview + execute) → verify duplicate consolidated

**Block G — UI/UX Edge Cases (5 steps)**
- Period selector: switch to historical month → verify financial numbers update
- CSV export from portfolio and transactions pages
- Theme toggle (dark/light) → verify financial displays remain visible
- Navigate to `/investor` portal (switch user context) → verify portfolio renders
- Delete test investor created in Block A → verify full teardown

### Implementation Details

- Total file: ~800-1000 lines of TypeScript
- Uses `test.describe.serial()` to enforce ordering
- Each block is a `test.step()` within a single test (preserving browser state)
- DB queries via Supabase REST API with admin JWT (same pattern as existing specs)
- All financial assertions use string comparison with exact decimal formatting
- Screenshots saved to `test-results/golive-{block}-{step}.png`

### Files Created

| File | Purpose |
|---|---|
| `docs/GO_LIVE_READINESS.md` | Audit trail & readiness checklist |
| `tests/e2e/golive-lifecycle.spec.ts` | Master E2E lifecycle test (~70 steps) |

### Constraints

- The QA admin (`qa.admin@indigo.fund`) was deleted in the cleanup. The test suite will require valid admin credentials via `QA_EMAIL` and `QA_PASSWORD` env vars (e.g., an existing admin like `nathanael@indigo.fund` or `adriel@indigo.fund`).
- Tests operate against the live production data — Block A creates a test investor that Block G cleans up, leaving production state unchanged.
- No TEST funds exist anymore — all tests target real funds (BTC: `0a048d9b-...`, etc.)

