# Indigo Yield Platform

> **Project**: Crypto Yield/Investment Platform
> **Stack**: React 18 + TypeScript + Vite + Tailwind CSS + Supabase (Lovable Cloud)
> **Stage**: Soft Launch (Small AUM) | Solo Founder | Managed Hosting
> **Deep Analysis**: `docs/PLATFORM_DEEP_ANALYSIS.md` (2200-line full audit + roadmap)

## Architecture

- **Frontend**: React SPA, React Router, TanStack Query (NO Zustand/Redux)
- **Backend**: Supabase PostgreSQL + RLS + RPC stored procedures
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth**: Supabase Auth with RBAC: `super_admin > admin > ib > investor`
- **State**: React Query exclusively (5min stale, 10min cache, centralized query keys)
- **Real-time**: Supabase subscriptions invalidate React Query cache

### Data Flow (Every User Action)
```
Component -> Custom Hook (useQuery/useMutation) -> Service Function (gateway)
  -> Supabase RPC or .from() query -> PostgreSQL (RLS + Triggers) -> Response
  -> React Query Cache Invalidation -> UI Re-render
```

### Key Metrics
- 115+ routes | 90+ pages | 200+ components | 60+ hooks | 90+ service files | 500+ functions
- 20+ DB tables | 12+ views | 15+ triggers | 17+ RPCs | 9 enums

## Portal Structure

### Investor Portal (`/investor/*`) - 20+ routes
| Area | Route | Key Hook | Service |
|------|-------|----------|---------|
| Overview | `/investor` | `usePerAssetStats` | `investorPositionService` |
| Portfolio | `/investor/portfolio` | `usePerAssetStats` | `investorPortfolioService` |
| Transactions | `/investor/transactions` | `useInvestorTransactionsList` | `transactionsV2Service` |
| Statements | `/investor/statements` | `useMonthlyStatements` | `statementsService` |
| Withdraw | `/withdrawals/new` | `useSubmitWithdrawal` | `investorWithdrawalService` |
| Yield History | `/investor/yield-history` | `useInvestorYieldEvents` | `investorYieldService` |
| Settings | `/investor/settings` | `useInvestorProfileSettings` | `profileSettingsService` |

### Admin Portal (`/admin/*`) - 40+ routes
| Area | Route | Key Hook | Service |
|------|-------|----------|---------|
| Dashboard | `/admin` | `useAdminStats` | `adminStatsService` |
| Investors | `/admin/investors` | `useUnifiedInvestors` | `investorDetailService` |
| Investor Detail | `/admin/investors/:id` | `useInvestorDetail` | `investorDetailService` |
| Transactions | `/admin/transactions` | `useTransactions` | `transactionDetailsService` |
| New Transaction | `/admin/transactions/new` | `useCreateAdminTransaction` | RPC: `apply_transaction_with_crystallization` |
| Withdrawals | `/admin/withdrawals` | `useWithdrawals` | `approvalService` |
| Yield Ops | `/admin/yield` | `useYieldRecords` | `yieldDistributionService` |
| Yield Distributions | `/admin/yield-distributions` | `useYieldDistributions` | `yieldDistributionService` |
| Funds | `/admin/funds` | `useFunds` | `fundService` |
| Fees | `/admin/fees` | `useFeeTransactions` | `feesService` |
| Reports | `/admin/investor-reports` | `useAdminInvestorReports` | `reportService` |
| System Health | `/admin/system-health` | `useSystemHealth` | `systemHealthService` |
| Integrity | `/admin/integrity` | `useIntegrityChecks` | `integrityService` |
| Audit Logs | `/admin/audit-logs` | `useAuditLogs` | `auditLogService` |
| IB Management | `/admin/ib-management` | `useIBSettings` | `ibUsersService` |

### IB Portal (`/ib/*`) - DEPRECATED (all routes redirect to `/investor`)
IB portal pages and ibService removed. IB management is admin-only via `/admin/ib-management`.
IB allocation logic remains active in the yield distribution engine.

## Database Schema

### Core Tables
| Table | PK | Purpose | Protection |
|-------|-----|---------|-----------|
| `transactions_v2` | `id` (uuid) | Ledger of record (SOURCE OF TRUTH) | Immutable key fields, delta audit |
| `investor_positions` | `(investor_id, fund_id)` COMPOSITE | Derived balances (auto-synced from ledger) | Trigger-driven only via `trg_ledger_sync` |
| `funds` | `id` | Fund definitions | `mgmt_fee_bps = 0` CHECK constraint |
| `profiles` | `id` (= auth.users.id) | User accounts | `created_at` immutable |
| `yield_distributions` | `id` | Yield events | Canonical RPC guard blocks direct DML |
| `yield_allocations` | `id` | Per-investor yield breakdown | UNIQUE `(distribution_id, investor_id)` |
| `fee_allocations` | `id` | Per-investor fees | Immutable key fields |
| `ib_allocations` | `id` | IB commissions | Immutable key fields |
| `withdrawal_requests` | `id` | Withdrawal state machine | Delta audit |
| `fund_daily_aum` | `id` | Dual-track AUM snapshots | UNIQUE `(fund_id, aum_date, purpose)` |
| `audit_log` | `id` | Delta audit trail | FULLY IMMUTABLE - no updates/deletes |

### Key Column Patterns
- `transactions_v2`: `investor_id`, `fund_id`, `type` (tx_type enum UPPERCASE), `amount` (numeric 28,10), `tx_date`, `reference_id` (UNIQUE idempotency), `is_voided`, `visibility_scope`
- `investor_positions`: `investor_id`, `fund_id`, `current_value` (DERIVED), `cost_basis`, `shares`, `is_active` - NO `.id` column
- `profiles`: `account_type` (investor/ib/fees_account), `is_admin`, `fee_pct`, `ib_parent_id`, `ib_percentage`
- `fund_daily_aum`: `purpose` enum (`transaction` vs `reporting`) - DUAL TRACK

### Database Enums (import from `src/contracts/dbEnums.ts`)
| Enum | Key Values |
|------|-----------|
| `tx_type` | DEPOSIT, WITHDRAWAL, YIELD, FEE_CREDIT, IB_CREDIT, ADJUSTMENT |
| `asset_code` | BTC, ETH, USDT, USDC, SOL, XRP, ADA, EURC, xAUT |
| `fund_status` | active, inactive, suspended, deprecated, pending |
| `withdrawal_status` | pending, approved, processing, completed, rejected, cancelled |
| `aum_purpose` | transaction, reporting |
| `account_type` | investor, ib, fees_account |
| `visibility_scope` | investor_visible, admin_only |
| `tx_source` | manual_admin, yield_distribution, fee_allocation, ib_allocation, crystallization, ... |
| `yield_distribution_status` | draft, applied, voided, previewed, corrected, rolled_back |

### Critical RPCs
| RPC | Purpose | Tables Written |
|-----|---------|---------------|
| `apply_adb_yield_distribution_v3` | Apply ADB yield distribution | yield_distributions, yield_allocations, fee_allocations, ib_allocations, transactions_v2 |
| `preview_adb_yield_distribution_v3` | Preview yield (read-only) | None |
| `apply_transaction_with_crystallization` | Deposit/withdrawal with yield crystallization | transactions_v2, investor_positions (trigger) |

| `crystallize_yield_before_flow` | Distribute accrued yield before deposit/withdrawal | investor_yield_events, transactions_v2 |
| `void_yield_distribution` | Void + cascade to all related records | yield_distributions, yield_allocations, fee_allocations, ib_allocations, transactions_v2 |
| `void_transaction` | Void a transaction | transactions_v2, investor_positions (trigger) |
| `recompute_investor_position` | Rebuild position from ledger | investor_positions |
| `recalculate_fund_aum_for_date` | Rebuild AUM from positions | fund_daily_aum |
| `validate_aum_against_positions` | Check AUM vs positions | None (read-only) |
| `get_funds_with_aum` | Get funds with latest AUM | None (read-only) |
| `is_admin` | Check admin status | None (read-only) |

### Key Triggers
| Trigger | Table | Purpose |
|---------|-------|---------|
| `trg_ledger_sync` | transactions_v2 | Auto-updates investor_positions.current_value from ledger |
| `enforce_canonical_yield_mutation` | yield_distributions | Blocks direct DML (must use RPC) |
| `delta_audit_*` | transactions_v2, investor_positions, yield_distributions, withdrawal_requests | Delta audit logging |
| `protect_*_immutable` | transactions_v2, profiles, fee_allocations, ib_allocations, audit_log | Protect key fields from changes |
| `sync_ib_allocations_from_commission_ledger` | ib_commission_ledger | Auto-create ib_allocations |

### Integrity Views (all should return EMPTY when healthy)
- `v_ledger_reconciliation` - Position vs SUM(transactions) drift
- `fund_aum_mismatch` - Fund AUM vs SUM(positions)
- `yield_distribution_conservation_check` - gross = net + fees + ib
- `v_orphaned_positions` / `v_orphaned_transactions` / `v_fee_calculation_orphans`

## Service Layer (`src/services/`)

### Organization
```
services/
  admin/     (40+ files) - Yield, transactions, investors, funds, fees, reports
  investor/  (10+ files) - Positions, portfolio, withdrawals, transactions
  shared/    (20+ files) - Profiles, notifications, audit, storage, statements
  ib/        (4 files)   - Commissions, referrals, allocations
  core/      (7 files)   - API client, health, session, integrity
  auth/      (3 files)   - Auth, invites
  notifications/ (4 files) - Yield/deposit/withdrawal notifications
  reports/   (4 files)   - Report engine, PDF/Excel generators
```

### Gateway Pattern (MANDATORY)
```typescript
// CORRECT: Component -> Hook -> Service -> Supabase
const { data } = useInvestorPositions(investorId);
// Hook calls: investorPositionService.getInvestorPositions()
// Service calls: supabase.from('investor_positions').select(...)

// WRONG: Component -> Supabase directly (NEVER do this)
```

### Type-Safe RPC Wrapper
```typescript
import { callRPC } from "@/lib/supabase/typedRPC";
const { data, error } = await callRPC("recompute_investor_position", {
  p_fund_id: fundId, p_investor_id: investorId
});
```

## Financial Engine

### Yield Waterfall
```
Gross Yield (New AUM - Previous AUM)
  +-- Platform Fee = gross * fee_pct (default 30%)
  |     +-- IB Commission = gross * ib_pct (from gross, NOT additional)
  |     +-- Remaining -> INDIGO fees_account
  +-- Dust (rounding residual) -> fees_account
  +-- Net Yield = gross - fee_amount -> investor position
```

### Conservation Identity (MUST ALWAYS HOLD)
```
gross_yield = total_net_amount + total_fee_amount + total_ib_amount + dust_amount
```

### ADB (Average Daily Balance) - PERMANENT allocation method
- Time-weighted: investors who deposit mid-period get proportionally less yield
- Example: Alice has 100 BTC for 30 days (ADB=3000), Bob has 50 BTC for 16 days (ADB=800)
- Alice gets 3000/3800 of yield, Bob gets 800/3800

### Crystallization
- Distributes accrued yield BEFORE every deposit/withdrawal
- Prevents new depositors from getting credit for yield earned before their deposit
- Triggered automatically by `crystallize_yield_before_flow()` RPC

### Fee Hierarchy (per investor)
1. `profiles.fee_percentage` (custom override) - if set
2. `investor_fee_schedule` table (date-based) - if exists
3. `funds.fee_bps / 100` (fund default, typically 30%) - fallback

### Dual AUM System (CRITICAL - currently only founder understands)
| Purpose | When Used | Frequency |
|---------|-----------|-----------|
| `transaction` | Deposits, withdrawals, yield crystallization | Daily/real-time |
| `reporting` | Month-end snapshots, investor statements | Monthly |

### Financial Precision
- Database: `NUMERIC(28,10)` - 10 decimal precision
- TypeScript: `string` type for amounts (never `number`)
- Calculations: `Decimal.js` library
- Dust tolerances: BTC/ETH: 0.00000001, USDT/USDC: 0.0001

### Idempotency
- Every mutation uses deterministic `reference_id` with UNIQUE constraint
- Patterns: `deposit-{date}-{investor}-{fund}`, `yield-{dist_id}-{investor}`, `fee_credit-{dist_id}`

## Security

### RLS (Every Table)
| Table | Admin | Investor/IB |
|-------|-------|-------------|
| transactions_v2 | ALL | SELECT own + investor_visible only |
| investor_positions | ALL | SELECT own |
| withdrawal_requests | ALL | INSERT/SELECT/UPDATE own (pending only) |
| yield/fee/ib_allocations | ALL | None (admin-only) |
| audit_log | SELECT only | None |
| profiles | ALL | SELECT/UPDATE own |

### Protected Tables (never mutate directly)
- `investor_positions` - driven by `trg_ledger_sync` trigger only
- `yield_distributions` - canonical RPC guard blocks direct DML
- `audit_log` - fully immutable, no updates or deletes
- `transactions_v2` - immutable key fields (created_at, reference_id, investor_id, fund_id)

### Canonical RPC Bypass (migrations/fixes only)
```sql
DO $$ BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  UPDATE yield_distributions SET is_voided = true WHERE ...;
END; $$;
```

## Critical Rules

1. **Never use JavaScript `Number` for money** - Use `Decimal.js` in TS, `numeric(28,10)` in SQL
2. **Never mutate protected tables directly** - Use RPCs
3. **Never skip audit logging** - Every financial mutation creates audit_log entry (via triggers)
4. **Never call `supabase.rpc()` from components** - Use service gateway pattern
5. **Never hardcode enum values** - Import from `src/contracts/dbEnums.ts`
6. **Never disable RLS** or remove `is_admin()` gates
7. **Never commit `.env` files** or log PII/secrets
8. **No console.log in production code**
9. **No emojis in code, comments, or documentation**
10. **Scope discipline** - Never change code beyond what was asked
11. **Full-stack completeness** - Every SQL migration MUST have matching UI wiring in the same PR. Never create a backend table/RPC/trigger without the corresponding frontend component, service, hook, and route. If a migration adds a feature, the UI must be functional before the task is declared complete.

## Known Risks & Tech Debt

| Risk | Severity | Detail |
|------|----------|--------|
| Solo founder dependency | CRITICAL | All knowledge in one person - this doc is mitigation |
| Yield miscalculation edge cases | CRITICAL | No automated test suite for yield scenarios |
| Service layer complexity | HIGH | 90+ files, hard to navigate. Consolidation needed |
| Inconsistent patterns | HIGH | Some hooks still call supabase.from() directly (not service gateway) |
| Test coverage gaps | HIGH | No automated tests for critical financial flows |
| Investor UX complexity | HIGH | Early feedback: "too complex/confusing" |
| IB system overhead | MEDIUM | May be deprecated, adds ~15% codebase complexity |
| TypeScript financial types | LOW | Uses `number` in some interfaces (should be `string`) |

### Potentially Unused Features (verify before removing)
- `/admin/onboarding`, `/admin/duplicates` (routes removed; `/admin/maintenance`, `/admin/bypass-attempts` redirect to `/admin`)
- `reportEngine.ts`, `excelGenerator.ts` (behind disabled CUSTOM_REPORTS feature flag)
- `commandPaletteService.ts` (wired up but low usage - verify if needed)

## Development Conventions

- **Types**: `@/types/domains/` | **Services**: `@/services/` | **Contracts**: `src/contracts/`
- **DB Enums**: `src/contracts/dbEnums.ts` | **RPC Sigs**: `src/contracts/rpcSignatures.ts`
- **Route guards**: `ProtectedRoute`, `AdminRoute`, `InvestorRoute` (IB routes redirect to `/investor`)
- **Code splitting**: All routes use `React.lazy()` with `<RouteSuspense>`
- **Query keys**: Centralized in `src/constants/queryKeys.ts`

## Core Documentation

| Topic | Location |
|-------|----------|
| Full Deep Analysis (2200 lines) | `docs/PLATFORM_DEEP_ANALYSIS.md` |
| Architecture | `docs/ARCHITECTURE.md` |
| Platform Inventory | `docs/PLATFORM_INVENTORY.md` |
| Finance/Accounting | `docs/CFO_ACCOUNTING_GUIDE.md` |
| Operations Manual | `docs/OPERATIONS_MANUAL.md` |
| Incident Playbook | `docs/INCIDENT_PLAYBOOK.md` |
| Financial Rulebook | `docs/FINANCIAL_RULEBOOK.md` |
| Flow Diagrams | `docs/flows/` |
| Page Contracts | `docs/page-contracts/` |
| Function Patterns | `docs/patterns/` |

## Preferred Agents

| Agent | Use For |
|-------|---------|
| `verify-app` | Post-change verification (tsc, build, contracts, tests) |
| `indigo-finance` | Yield calculations, AUM, crystallization, transactions |
| `planner` | Feature implementation planning |
| `code-reviewer` | Quality and security review |
| `database-reviewer` | Database/Supabase review |
| `build-error-resolver` | Fix build errors |
| `e2e-runner` | Playwright E2E testing |

## Verification

Before declaring any task complete:
```bash
npx tsc --noEmit
```
For significant changes, invoke `verify-app` agent for full sequence (tsc, contracts, SQL hygiene, build, tests, UI smoke).

## Git Workflow
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- Small, focused commits
- All tests must pass before merge
