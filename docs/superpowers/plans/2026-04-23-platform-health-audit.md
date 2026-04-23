# Platform Health Audit & Remediation Plan
## Indigo Yield — Comprehensive Frontend, Backend, Database Verification

**Date:** 2026-04-23
**Scope:** Full platform — frontend, backend Edge Functions, database schema, triggers, financial precision
**Goal:** Zero decimal display bugs, zero data orphans, zero financial precision loss, zero silent failures

---

## 1. Executive Summary

### Already Completed (PR 1–3)
| PR | Scope | Status |
|---|---|---|
| PR 1 | Withdrawal components: 6 files fixed (Create, Reject, Approve, Details, NumericInput, RequestForm) | ✅ Merged |
| PR 2 | Investor portal + admin tables: formatAssetValue, formatAssetAmount, formatters/index, FormattedNumber | ✅ Merged |
| PR 3 | Prevention layer: FinancialString branded type, ESLint rule `no-native-number-on-money`, migration guide | ✅ Merged |

### Database Integrity — Current Findings
| Check | Result | Action |
|---|---|---|
| Void cascade (parent→child) | ✅ Working — zero orphans | None |
| Yield dists missing `aum_record_id` | ⚠️ 4 active records | Backfill or accept |
| Yield allocs voided without `voided_at` | ⚠️ 8 records half-voided | Fix trigger + backfill |
| IB allocs voided without `voided_at` | ⚠️ 2 records half-voided | Fix trigger + backfill |

### Remaining Risk Areas
1. **Frontend:** Unchecked components outside withdrawals/investor portal (funds, reports, settings, charts)
2. **Backend:** Edge Functions may still use `Number()` / `parseFloat()` on monetary values
3. **Database:** Triggers/functions may compute with `numeric` → cast to `float8` silently
4. **End-to-end:** Decimal precision may be lost in API serialization (JSON number vs string)

---

## 2. Domain Decomposition

### 2.1 Frontend Domains

```
src/
├── features/
│   ├── admin/           # Admin portal (funds, investors, transactions, withdrawals, yield, reports)
│   ├── investor/        # Investor portal (dashboard, positions, yield history, withdrawals)
│   ├── auth/            # Login, MFA, password reset
│   └── shared/          # Cross-cutting components (tables, forms, dialogs)
├── components/
│   ├── common/          # NumericInput, FormattedNumber, DataTable, Charts
│   └── ui/              # shadcn/ui primitives
├── utils/
│   ├── financial.ts     # parseFinancial, sumFinancials, formatFinancialDisplay
│   ├── assets.ts        # formatAssetAmount, formatAdminNumber
│   └── formatters/      # formatAssetValue, formatters/index
├── types/
│   └── financial.ts     # FinancialString, fromDbValue, fromDecimal
└── lib/
    ├── supabase.ts      # Client setup
    └── security/        # CSP headers
```

**Flows to verify per domain:**

| Domain | Key Flows | Financial Data Surfaces |
|---|---|---|
| Admin → Withdrawals | Create, approve, reject, list, details | amount, balance_before, balance_after |
| Admin → Funds | AUM history, fund settings, class mgmt | closing_aum, opening_aum, post_flow_aum |
| Admin → Transactions | List, create, void, details | amount, balance_before, balance_after |
| Admin → Yield | Distributions, allocations, monthly close | gross_yield, net_yield, fee_amount, ib_amount |
| Admin → Reports | PDF/Excel export, charts | All monetary fields |
| Admin → Investors | Positions, yield events, IB tree | position_value, net_yield_amount, ib_fee_amount |
| Investor → Dashboard | Portfolio value, yield summary, recent activity | All summary numbers |
| Investor → Yield | Monthly yield breakdown, fee details | gross_yield, fee_amount, net_yield |
| Investor → Withdrawals | Request, history, status | amount, fee_amount |
| Shared → Tables | Sorting, filtering, CSV export | All columns with numeric data |
| Shared → Charts | Recharts integration | Tooltip values, axis labels |
| Shared → Forms | Validation, auto-fill, blur formatting | Input values, max amounts |

### 2.2 Backend Domains (Supabase)

```
supabase/
├── functions/           # Edge Functions (Deno)
│   ├── withdrawals/
│   ├── distributions/
│   ├── transactions/
│   ├── reports/
│   └── auth/
├── migrations/          # Schema evolution
├── triggers/            # Database triggers (if in SQL files)
└── policies/            # RLS policies
```

**Backend verification targets:**

| Domain | What to Check |
|---|---|
| Edge Functions | No `Number()`, `parseFloat()`, `+value` on monetary params/results |
| RPC/Functions | Return monetary values as `text` or `numeric`, never JSON number |
| Triggers | Cascade void propagates all columns (`voided_at`, `voided_by`, `void_reason`) |
| Constraints | Foreign keys enforce referential integrity |
| RLS | Policies don't leak voided/orphaned data to wrong roles |

### 2.3 Database Domains

```
public schema
├── Core Transactional
│   ├── transactions_v2         ← master ledger
│   ├── yield_distributions     ← yield generation header
│   ├── yield_allocations       ← per-investor yield split
│   ├── fee_allocations         ← management/performance fees
│   ├── ib_allocations          ← introducing broker fees
│   └── fund_aum_events         ← AUM snapshots
├── Investor-facing
│   ├── investor_yield_events   ← visible yield history
│   └── investor_positions      ← current holdings
├── Operational
│   ├── withdrawals             ← withdrawal requests
│   ├── investors               ← investor profiles
│   ├── funds                   ← fund definitions
│   └── admin_alerts            ← system integrity alerts
└── Audit & Config
    ├── admin_integrity_runs    ← automated checks
    └── settings                ← platform configuration
```

---

## 3. Feature & Flow Mapping

### 3.1 Critical Financial Flows

Each flow below must be traced end-to-end: DB → Edge Function → Frontend → Display

```
Flow A: Yield Distribution (Monthly Close)
├── DB: yield_distributions.created
│   └── triggers: create yield_allocations, fee_allocations, ib_allocations
│   └── triggers: create transactions_v2 entries
│   └── triggers: create fund_aum_events
├── Edge Function: POST /distributions
│   └── params: effective_date, fund_id, purpose
│   └── returns: distribution_id, gross_yield (as text)
├── Frontend: Admin → Yield → Create Distribution
│   └── displays: gross_yield, net_yield, total_fees, total_ib
│   └── validation: sum of allocations == gross_yield
└── Frontend: Investor → Yield History
    └── displays: gross_yield, fee_amount, net_yield

Flow B: Withdrawal Request
├── DB: withdrawals.created (status = pending)
│   └── trigger: reserve balance in investor_positions
├── Edge Function: POST /withdrawals
│   └── params: amount (as text string), asset, investor_id
│   └── validation: amount <= available_balance (Decimal comparison)
│   └── returns: withdrawal_id, requested_amount (as text)
├── Frontend: Investor → Withdrawals → Request
│   └── input: NumericInput with Decimal formatting
│   └── display: available_balance, requested_amount, fee_estimate
└── Admin: Approve/Reject
    └── updates: transactions_v2 (debit), investor_positions (release/commit)
    └── display: final amount, fee, net_to_investor

Flow C: Transaction Void
├── DB: transactions_v2.is_voided = true
│   └── trigger: void linked yield_allocations (set is_voided, voided_at, voided_by)
│   └── trigger: void linked fee_allocations
│   └── trigger: void linked ib_allocations
│   └── trigger: void linked fund_aum_events
│   └── trigger: void linked investor_yield_events
│   └── trigger: reverse balance in investor_positions
├── Edge Function: POST /transactions/:id/void
│   └── params: void_reason
│   └── validation: transaction exists, not already voided
│   └── returns: voided transaction (amount as text)
└── Frontend: Admin → Transactions → Void
    └── display: original amount, voided_at, void_reason
    └── cascade view: list of all child records voided

Flow D: AUM Reporting
├── DB: fund_aum_events created (opening_aum, closing_aum)
│   └── trigger: update yield_distributions.aum_record_id
├── Edge Function: GET /funds/:id/aum
│   └── returns: array of { date, closing_aum: text, opening_aum: text }
├── Frontend: Admin → Funds → AUM History
│   └── table: closing_aum with commas, 2+ decimal places
│   └── chart: Recharts line chart with formatted tooltips
└── Frontend: Investor → Dashboard
    └── card: "Current AUM" with formatted number
```

### 3.2 Data Integrity Flows

```
Flow E: Orphan Detection
├── Scheduled Edge Function: daily integrity run
│   └── queries: all orphan checks (see Section 6)
│   └── inserts: admin_alerts if orphans found
└── Admin: Alerts dashboard
    └── displays: severity, count, affected tables

Flow F: Cascade Void Audit
├── Trigger: on transactions_v2.is_voided = true
│   └── MUST set: voided_at = now(), voided_by = auth.uid(), void_reason = COALESCE(...)
│   └── MUST cascade to: yield_allocations, fee_allocations, ib_allocations, fund_aum_events, investor_yield_events
│   └── MUST NOT: leave child with is_voided=true AND voided_at IS NULL
└── Validation Query: run after every void operation in tests
```

---

## 4. Verification Matrix

### 4.1 Frontend Verification

For every file in `src/` that touches monetary values:

| Check | How | Tool |
|---|---|---|
| No `Number(amount)` | grep -r "Number(" src/ | Manual + ESLint |
| No `parseFloat(amount)` | grep -r "parseFloat(" src/ | Manual + ESLint |
| No `toNum(amount)` | grep -r "toNum(" src/ | ESLint rule |
| No `.toLocaleString()` on money | grep -r "toLocaleString(" src/ | ESLint rule |
| Uses `parseFinancial()` for math | grep -r "parseFinancial(" src/ | Code review |
| Uses `formatAssetAmount()` for display | grep -r "formatAssetAmount(" src/ | Code review |
| Uses `FinancialString` type for props | grep -r "FinancialString" src/ | TypeScript |
| NumericInput preserves precision | Manual test: 0.00000001 | Playwright |
| Blur formatting doesn't strip zeros | Manual test: "1.23000000" → "1.23000000" | Playwright |
| CSV/Excel export uses string values | Check export handlers | Code review |
| Chart tooltips format correctly | Hover on Recharts | Playwright |

**Component inventory to audit:**

```
src/features/admin/
  funds/           # ALL components with AUM, amounts
  investors/       # ALL components with positions, yields
  transactions/    # ALL components with amounts, balances
  yield/           # ALL components with gross/net/fee/ib amounts
  reports/         # PDF generation, Excel export
  withdrawals/     # ✅ Already fixed (PR 1)

src/features/investor/
  dashboard/       # Portfolio cards, yield summary
  positions/       # Position values, P&L
  yield/           # Monthly breakdown
  withdrawals/     # Request form, history

src/components/common/
  NumericInput.tsx     # ✅ Fixed
  FormattedNumber.tsx  # ✅ Fixed
  DataTable/           # Check column formatters
  Charts/              # Check tooltip formatters
```

### 4.2 Backend Verification

For every Edge Function in `supabase/functions/`:

| Check | How | Tool |
|---|---|---|
| No `Number()` on request body amounts | grep -r "Number(" supabase/functions/ | Code review |
| No `parseFloat()` on params | grep -r "parseFloat(" supabase/functions/ | Code review |
| Uses `Decimal` for arithmetic | grep -r "Decimal" supabase/functions/ | Code review |
| Returns monetary values as `text` | Check return types / JSON serialization | Code review |
| Validates amounts with `z.string()` not `z.number()` | Check Zod schemas | Code review |

**Function inventory to audit:**

```
supabase/functions/
  withdrawals/
  distributions/
  transactions/
  reports/
  auth/
  integrity/     # Orphan detection, health checks
```

### 4.3 Database Verification

| Check | Query | Severity |
|---|---|---|
| Orphan yield_allocations | `WHERE distribution_id NOT IN (SELECT id FROM yield_distributions)` | CRITICAL |
| Orphan fee_allocations | `WHERE distribution_id NOT IN (SELECT id FROM yield_distributions)` | CRITICAL |
| Orphan ib_allocations | `WHERE distribution_id NOT IN (SELECT id FROM yield_distributions)` | CRITICAL |
| Orphan transactions (missing investor) | `WHERE investor_id IS NOT NULL AND investor_id NOT IN (SELECT id FROM investors)` | HIGH |
| Half-voided yield_allocations | `WHERE is_voided = true AND voided_at IS NULL` | HIGH |
| Half-voided ib_allocations | `WHERE is_voided = true AND voided_at IS NULL` | HIGH |
| Half-voided fee_allocations | `WHERE is_voided = true AND voided_at IS NULL` | HIGH |
| Missing aum_record in yield_distributions | `WHERE aum_record_id IS NOT NULL AND aum_record_id NOT IN (SELECT id FROM fund_aum_events)` | MEDIUM |
| Transactions with `distribution_id` to voided dist | `WHERE distribution_id IS NOT NULL AND EXISTS (SELECT 1 FROM yield_distributions WHERE id = distribution_id AND is_voided = true) AND is_voided = false` | HIGH |
| RLS policy gaps on voided data | Review all policies for `is_voided = false` filters | HIGH |

### 4.4 End-to-End Decimal Precision Test Cases

| Test Case | Input (DB) | Expected Display | Risk |
|---|---|---|---|
| Small decimals | "0.00000001" | "0.00000001" | JS number rounds to 0 |
| Trailing zeros | "1.23000000" | "1.23000000" | `.toFixed()` strips zeros |
| Large amounts | "123456789.12345678" | "123,456,789.12345678" | `toLocaleString` loses precision |
| Negative yield | "-1379.5221127646" | "-1,379.5221127646" | Sign + precision |
| Zero | "0" | "0" | Edge case |
| Very large | "999999999999.99999999" | "999,999,999,999.99999999" | Scientific notation risk |
| Test amount | "330500.42058676" | "330,500.42058676" | Specific user-reported case |

---

## 5. Tooling & Skills

### 5.1 Skills to Invoke

| Skill | When | Purpose |
|---|---|---|
| `investigate` | Before each fix | Root-cause analysis of any bug found |
| `review` | After each code change | Multi-perspective code review |
| `qa` | After each phase | Playwright + manual verification |
| `health` | End of each phase | Check typecheck, lint, test coverage |
| `ship` | End of each PR | Commit, push, deploy |
| `document-release` | After each PR | Update docs, changelog |

### 5.2 Agents to Deploy

| Agent | Scope | Parallel? |
|---|---|---|
| `code-reviewer` | Every file changed | Yes, per PR |
| `security-auditor` | Auth, financial, RLS code | Yes, per PR |
| `database-specialist` | Schema, triggers, migrations | Sequential |
| `frontend-architect` | Component architecture review | Yes |
| `test-automator` | Write tests for each fix | Yes |
| `docs-architect` | Update patterns, API docs | After each PR |

### 5.3 Automated Enforcement

| Layer | Tool | Catches |
|---|---|---|
| Compile-time | TypeScript `FinancialString` brand | `Number(amount)`, `parseFloat(amount)` |
| Lint-time | ESLint `no-native-number-on-money` | `toNum()`, `Number()`, `parseFloat()`, `.toLocaleString()` |
| Test-time | Vitest unit tests | `formatAssetAmount` precision, `parseFinancial` edge cases |
| E2E-time | Playwright | Visual decimal display, input blur behavior |
| CI-time | GitHub Actions | `tsc --noEmit`, `eslint`, `vitest`, `playwright` |
| Runtime | Integrity Edge Function | Orphan detection daily |

---

## 6. Execution Phases

### Phase 1: Frontend Decimal Sweep (Remaining)
**Goal:** Every monetary display in the frontend uses `formatAssetAmount` or `formatFinancialDisplay`

1. **Inventory:** Use `grep` to find all `toNum(`, `Number(`, `parseFloat(`, `.toLocaleString()` in `src/`
2. **Categorize:** Map each hit to a domain/flow from Section 2
3. **Fix:** Replace with `parseFinancial` + `formatAssetAmount` pattern
4. **Type:** Add `FinancialString` to props where applicable
5. **Test:** Add unit tests for formatters; add Playwright tests for critical flows
6. **Review:** Use `code-reviewer` + `security-auditor` agents
7. **Ship:** PR per domain (admin-funds, admin-transactions, admin-yield, investor-all)

### Phase 2: Backend Edge Function Audit
**Goal:** No monetary value is ever parsed or computed as a JS `number` in Edge Functions

1. **Inventory:** List all `.ts` files in `supabase/functions/`
2. **Audit:** Check each for `Number()`, `parseFloat()`, `+param`, arithmetic on string amounts
3. **Fix:** Replace with `Decimal.js` (Deno-compatible)
4. **Schema:** Ensure RPC returns `text` for monetary fields, not `numeric` (JSON number)
5. **Test:** Write Deno unit tests for each function
6. **Review:** Use `code-reviewer` agent
7. **Ship:** PR per function group

### Phase 3: Database Trigger & Function Fix
**Goal:** Cascade void is atomic and complete; zero half-voided records

1. **Inspect:** Read current trigger definitions
2. **Fix:** Update cascade void trigger to set ALL columns (`voided_at`, `voided_by`, `voided_by_profile_id`, `void_reason`)
3. **Backfill:** Migration to fix existing 8 yield_allocations + 2 ib_allocations
4. **Constraint:** Consider adding `CHECK (is_voided = false OR voided_at IS NOT NULL)`
5. **Test:** Write SQL-level tests (pgTAP or manual assertions)
6. **Review:** Use `database-specialist` agent
7. **Ship:** Single migration PR

### Phase 4: Database Integrity Deep Dive
**Goal:** Automated daily detection of orphans, inconsistencies, precision loss

1. **Edge Function:** Create `integrity-check` Edge Function with all queries from Section 4.3
2. **Scheduling:** Add to cron or invoke from admin dashboard
3. **Alerts:** Write findings to `admin_alerts` table
4. **Dashboard:** Admin page to view integrity run results
5. **Test:** Verify function catches injected orphan data
6. **Ship:** PR with function + dashboard + tests

### Phase 5: End-to-End Flow Validation
**Goal:** Complete critical flows with real data, verify no precision loss at any step

1. **Golden Path:** Run `npm run test:golden` (Playwright)
2. **Manual:** Create distribution → verify all amounts → void → verify cascade
3. **Decimal Test:** Use `330500.42058676` as test amount throughout
4. **Cross-browser:** Chrome, Firefox, Safari
5. **Export Test:** PDF/Excel exports preserve full precision
6. **Review:** Use `qa` skill + `e2e-runner` agent
7. **Ship:** No code changes, just verification report

### Phase 6: Automated Prevention Layer Hardening
**Goal:** Never regress on financial precision

1. **ESLint:** Expand `no-native-number-on-money` to catch more patterns
2. **Husky:** Pre-commit hook runs `eslint --rulesdir .eslint/rules`
3. **CI:** GitHub Action runs full test suite + integrity checks
4. **Documentation:** Update `docs/patterns/financial-formatting.md` with new findings
5. **Onboarding:** Add financial formatting to developer onboarding checklist
6. **Ship:** PR with rule updates + docs

---

## 7. Deliverables

| Deliverable | Format | Owner |
|---|---|---|
| Frontend component audit report | Markdown + checklist | Assistant |
| Edge function audit report | Markdown + checklist | Assistant |
| Database trigger documentation | SQL comments + markdown | Assistant |
| Integrity check Edge Function | TypeScript/Deno | Assistant |
| Integrity admin dashboard | React + TypeScript | Assistant |
| Migration: fix half-voided records | SQL migration | Assistant |
| Migration: backfill missing aum_record_id | SQL migration (optional) | Assistant |
| Updated ESLint rule | JavaScript | Assistant |
| E2E decimal precision tests | Playwright | Assistant |
| Platform health runbook | Markdown | Assistant |

---

## 8. Test Amount Reference

**330,500.42058676**
- This amount must display correctly everywhere: inputs, tables, charts, PDFs, Excel exports
- It must never be rounded to `330500.42` or `330500.4205868`
- It must never be parsed as a JS number (which would give `330500.42058675997`)
- Test path: Input → Edge Function (as string) → DB (NUMERIC) → Edge Function (as string) → Frontend → Display

---

## 9. Success Criteria

- [ ] `grep -r "toNum(" src/` returns zero results
- [ ] `grep -r "Number(" src/` returns zero results on monetary values
- [ ] `grep -r "parseFloat(" src/` returns zero results on monetary values
- [ ] `grep -r "\.toLocaleString()" src/` returns zero results on monetary values
- [ ] All monetary props typed as `FinancialString`
- [ ] All formatters use `Decimal.js` internally
- [ ] Zero orphans in database (automated check passes)
- [ ] Zero half-voided records
- [ ] All 4 yield_distributions missing `aum_record_id` either backfilled or accepted
- [ ] `npm run test:golden` passes
- [ ] Playwright decimal precision tests pass
- [ ] Integrity check runs daily with zero alerts
