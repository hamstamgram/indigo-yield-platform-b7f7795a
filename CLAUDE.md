# Indigo Yield Platform

> **Project**: Indigo Yield Platform  
> **Type**: Crypto Yield/Investment Platform  
> **Stack**: React 18 + TypeScript + Vite + Tailwind CSS + Supabase (Lovable Cloud)

## Architecture

- **Frontend**: React SPA with React Router, TanStack Query, Zustand
- **Backend**: Supabase (PostgreSQL + Edge Functions + RLS)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Auth**: Supabase Auth with RBAC (investor/admin/super_admin)

## Core Documentation

| Topic | Location |
|-------|----------|
| Architecture | `docs/ARCHITECTURE.md` |
| Platform Inventory (Schema/RPCs/Views) | `docs/PLATFORM_INVENTORY.md` |
| Admin Guide | `docs/ADMIN_GUIDE.md` |
| Finance/Accounting Logic | `docs/CFO_ACCOUNTING_GUIDE.md` |
| Operations Manual | `docs/OPERATIONS_MANUAL.md` |
| Incident Playbook | `docs/INCIDENT_PLAYBOOK.md` |
| Flow Diagrams | `docs/flows/` |
| Page Contracts | `docs/page-contracts/` |

## Key Conventions

- **Types**: Import from `@/types/domains/` (fund, transaction, position, etc.)
- **Services**: Import from `@/services/` (admin, investor, shared)
- **Contracts**: RPC signatures in `src/contracts/rpcSignatures.ts`
- **DB Enums**: Mapped in `src/contracts/dbEnums.ts`

## Development Guidelines

- **Security**: Financial data platform - never log PII or secrets
- **RLS**: All tables have Row Level Security enabled
- **Audit**: All mutations logged to `audit_log` table
- **Testing**: Run `npm run build` before committing
- **Data Integrity**: Always fix root causes, not symptoms. We need PERFECT data, not reconciliation workarounds. If position != SUM(transactions), fix the transaction data - don't adjust reconciliation views to hide the problem.

## Testing & Session History

| Topic | Location |
|-------|----------|
| Comprehensive Test Report | `tests/COMPREHENSIVE_TEST_REPORT.md` |
| Test Screenshots | `tests/screenshots/` |
| Test Session Log | `tests/SESSION_LOG.md` |

### Key Decisions & Fixes Applied

1. **Yield Conservation Fix (Jan 24, 2026)**
   - Root cause: `yield_distributions` had `gross_yield` but missing `total_net_amount`, `total_fee_amount`
   - Fix: Use `set_canonical_rpc(true)` to bypass triggers, update totals, create `fee_allocations` records
   - Affected: IND-USDT Jan 23, IND-USDT Jan 24, IND-BTC Jan 25 (voided)

2. **Canonical Mutation Trigger**
   - The `enforce_canonical_yield_mutation` trigger blocks direct updates to `yield_distributions`
   - Bypass pattern: `PERFORM set_canonical_rpc(true); UPDATE ...; PERFORM set_canonical_rpc(false);`

3. **Conservation Check View**
   - Uses `fee_allocations` table and `summary_json.total_net_interest`, NOT the `total_net_amount` column
   - Both must be populated for conservation check to pass

## QA Test Credentials

**ALWAYS use these credentials for UI testing. Create new ones if they don't work.**

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Admin | qa.admin@indigo.fund | QaTest2026! | Full admin access |
| Investor | qa.investor@indigo.fund | QaTest2026! | Has 5000 USDT position, referred by QA IB |
| IB | qa.ib@indigo.fund | QaTest2026! | Refers QA Investor (5% commission) |

**UI Testing Rule**: Every testing session MUST include UI testing via Playwright. Always:
1. Log in with QA credentials above
2. Test Admin portal (if admin work was done)
3. Test Investor portal (if investor data was affected)
4. Test IB portal (if IB/commission work was done)
5. Take screenshots of key flows

If credentials fail, recreate them using the pattern in this session's history.

## Archived Documentation

Historical audit reports, AI artifacts, and completed plans are in `docs/_archive/`.
These are NOT authoritative - use the canonical docs listed above.
