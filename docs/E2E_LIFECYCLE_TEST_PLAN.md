# Indigo Yield — E2E Lifecycle Test Plan

**Date**: 2026-04-09
**Status**: In Progress

---

## Context

Running full lifecycle E2E tests against **local Supabase** to verify every trigger works without disturbing production. Tests replay the XRP fund lifecycle from the Excel source of truth.

## Local Setup (DONE)

1. Docker Desktop started
2. `supabase start` — 36 tables, 318 functions, all migrations applied
3. Local Supabase: `http://127.0.0.1:54321`
4. `.env.local` created pointing app at local Supabase
5. Test admin user created: `admin@test.local / TestAdmin2026!` (super_admin role)
6. Dev server running on `http://localhost:8080`

## Local Supabase Keys

- **ANON_KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
- **SERVICE_ROLE_KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU`
- **Admin ID**: `cd60cf98-8ae8-436d-b53c-d1b3cbca3c47`

## XRP Fund Lifecycle (from Excel + Production DB)

### Investors

| Name | Email | Fee % | IB % | IB Broker | Account Type |
|------|-------|-------|------|-----------|--------------|
| Sam Johnson | sam.johnson@test.local | 16% | 4% | Ryan | investor |
| Ryan Van Der Wall | ryan.vanderwall@test.local | 20% | — | — | ib |
| Indigo Fees | fees@test.local | 0% | — | — | fees_account |

### Timeline (Deposits)

| Date | Investor | Type | Amount | Running AUM |
|------|----------|------|--------|-------------|
| 2025-11-17 | Sam | DEPOSIT | 135,003 | 135,003 |
| 2025-11-25 | Sam | DEPOSIT | 49,000 | 184,003 |
| 2025-11-30 | **YIELD** | month_end | gross=355 | 184,358 |
| 2025-11-30 | Sam | DEPOSIT | 45,000 | 229,358 |
| 2025-12-08 | Sam | DEPOSIT | 49,500 | 278,858 |
| 2025-12-15 | **YIELD** | transaction | gross=487.80 | ~279,346 |
| 2025-12-15 | Sam | DEPOSIT | 50,100 | ~329,446 |
| 2025-12-31 | **YIELD** | month_end | gross=1,156.32 | ~330,602 |
| 2026-01-02 | Sam | WITHDRAWAL | -330,500.42 | ~102 |
| 2026-01-05 | Indigo Fees | DEPOSIT | 253.136 | ~355 |
| 2026-01-05 | Ryan | DEPOSIT | 63.284 | ~418 |
| 2026-01-31 | **YIELD** | month_end | gross=0.60 | ~419 |

### Yield Distribution Details (from production)

| Period | Type | Gross | Fees | IB | Net | Allocations |
|--------|------|-------|------|-----|-----|-------------|
| Nov 2025 | month_end | 355.00 | 56.80 | 14.20 | 284.00 | 1 (Sam) |
| Dec 15 | transaction | 487.80 | 78.05 | 19.51 | 390.24 | 3 |
| Dec 2025 | month_end | 1,156.32 | 185.02 | 46.25 | 925.05 | 3 |
| Jan 2026 | month_end | 0.60 | 0.12 | 0.00 | 0.48 | 2 |

### Final Positions (production reference)

| Investor | Current Value | Cost Basis |
|----------|--------------|------------|
| Indigo Fees | 576.51 | 253.14 |
| Ryan | 143.90 | 63.28 |
| Sam | 330,202.11 | 328,603.00 |

### Conservation Rule
For every distribution: `gross = net + fees + ib` (to 12 decimal places)

## Test File

`tests/e2e/xrp-lifecycle.spec.ts` — 14 tests:

| Block | Test | What it verifies |
|-------|------|------------------|
| A1 | Create fund | Fund creation via REST API |
| A2 | Create investors | Profiles, positions, fee/IB schedules |
| B1-B2 | Deposits | apply_investor_transaction RPC, position updates |
| C1 | Nov yield | apply_adb_yield_distribution_v3, fee conservation |
| D1-D3 | More deposits + crystallization | Mid-month deposits, transaction yields |
| E1 | Dec yield | Month-end distribution with 3 allocations |
| F1 | Sam withdrawal | Full exit, position reduction |
| G1 | Post-withdrawal deposits | Fees + IB capital injection |
| H1 | Jan yield | Small yield on remaining positions |
| I1 | Reconciliation | audit_leakage_report, v_cost_basis_mismatch, v_ledger_reconciliation |
| I2 | Fee conservation | gross = net + fees + ib for all distributions |
| J1-J4 | UI smoke | Admin dashboard, yields, investors, transactions pages load without JS errors |

## Key RPCs Used

| RPC | Purpose |
|-----|---------|
| `apply_investor_transaction` | Deposits and withdrawals |
| `apply_adb_yield_distribution_v3` | Yield distribution (gross amount based) |
| `apply_segmented_yield_distribution_v5` | Alternative yield (AUM-based) |
| `apply_deposit_with_crystallization` | Deposit + snapshot |
| `apply_withdrawal_with_crystallization` | Withdrawal + snapshot |
| `audit_leakage_report` | Integrity check |

## Run Command

```bash
# Ensure local Supabase is running
supabase start

# Start dev server with local env
npx vite --host localhost --port 8080

# Run tests
npx playwright test tests/e2e/xrp-lifecycle.spec.ts --project=chromium
```

## After Tests Pass

1. Delete test files: `rm -rf tests/ playwright.config.ts`
2. Delete `.env.local`
3. Stop local Supabase: `supabase stop`
4. Restore `.env` pointing to production

## BTC Boosted / BTC TAC / ETH TAC Note

Per user: "BTC Boosted and TAC same for ETH are treated like deposits and withdrawals in the BTC fund and ETH fund." These legacy programs' capital flows are recorded as deposits/withdrawals in the main yield funds, not as separate fund operations.

---

*Last updated: 2026-04-09*
