# Evidence Pack Index
**Generated:** 2024-12-21
**Environment:** Production Supabase (nkfimvovosdehmyyjubn)
**Platform:** INDIGO Token-Denominated Investment Management

---

## Verification Summary

| Category | Status | Files |
|----------|--------|-------|
| Frontend Routes | ✅ Complete | routes_full.json |
| Button/Action Map | ✅ Complete | FRONTEND/button_map_full.md |
| Database Schema | ✅ Complete | DATABASE/schema_snapshot.sql |
| Constraints & Indexes | ✅ Complete | DATABASE/constraints_and_indexes.txt |
| RLS Policies | ✅ Complete | DATABASE/rls_policies_full.sql |
| Audit Triggers | ✅ Documented | DATABASE/audit_triggers.sql |
| Seed Data | ✅ Complete | CALCULATIONS/seed_minimal_dataset.sql |
| Reconciliation | ✅ Complete | CALCULATIONS/reconciliation.sql |
| Report Pipeline | ✅ Complete | CALCULATIONS/report_pipeline_proof.md |
| No USD Proof | ✅ Complete | NO_USD/no_usd_scan.txt |

---

## A) Overview

This evidence pack proves correctness of the INDIGO platform:
- **Token-denominated only**: No USD, $, or fiat anywhere
- **Purpose segregation**: `reporting` vs `transaction` purposes properly isolated
- **One report per period**: Enforced via unique constraint and code
- **RLS enforcement**: All tables protected with role-based policies
- **Idempotency**: All yield distributions, fee allocations protected

---

## B) FRONTEND Evidence

### B1) routes_full.json
Complete route inventory extracted from source code:
- 27+ admin routes with AdminRoute guard
- 12+ investor routes with ProtectedRoute guard
- 1 IB route with IBRoute guard
- 12 public routes (no auth required)

### B2) FRONTEND/button_map_full.md
Comprehensive UI action map covering:
- Every actionable button/link per page
- Handler function with file:line reference
- Backend call (RPC, Edge Function, or direct query)
- Tables read/written
- Role gate (admin, investor, ib, public)
- Confirmation gating (AlertDialog vs none)
- Idempotency mechanism

### B3) FRONTEND/screenshots_checklist.md
Manual verification steps for visual testing

---

## C) DATABASE Evidence

### C1) DATABASE/schema_snapshot.sql
SQL to query complete schema structure

### C2) DATABASE/constraints_and_indexes.txt
Key idempotency constraints:
- `unique_investor_period` on generated_statements (investor_id, period_id)
- `investor_fund_performance_unique_with_purpose` (investor_id, period_id, fund_name, purpose)
- `idx_transactions_v2_reference_id_unique` (reference_id)
- `fee_allocations_unique` (distribution_id, fund_id, investor_id, fees_account_id)
- `ib_allocations_idempotency` (source_investor_id, ib_investor_id, period_start, period_end, fund_id)

### C3) DATABASE/rls_policies_full.sql
Query to extract all RLS policies from pg_policies

### C4) DATABASE/rls_matrix.sql
Per-table security matrix showing who can SELECT/INSERT/UPDATE/DELETE

### C5) DATABASE/audit_triggers.sql
Trigger definitions for audit logging

---

## D) CALCULATIONS & DISTRIBUTION PROOFS

### D1) CALCULATIONS/seed_minimal_dataset.sql
Deterministic test dataset:
- 2 funds (BTC, ETH)
- 3 investors (Alice, Bob, Charlie)
- INDIGO FEES account (169bb053-36cb-4f6e-93ea-831f0dfeaf1d)
- 1 IB parent (Charlie) with referral (Alice)
- Deposits and fee schedules
- All token-denominated (no USD columns)

### D2) CALCULATIONS/run_distribution.sql
Script to execute yield distributions for both purposes

### D3) CALCULATIONS/reconciliation.sql
Token conservation proof:
- sum(INTEREST) - sum(FEE) = sum(net credited)
- fee_allocations split correctly to IB + INDIGO FEES
- Position deltas match transaction sums

### D4) CALCULATIONS/report_pipeline_proof.md
Complete reporting flow documentation:
- generate-fund-performance filters by purpose='reporting'
- investor_fund_performance stores with purpose='reporting'
- strictInsertStatement() rejects duplicates
- One report per investor per period enforced

---

## E) NO USD PROOF

### E1) NO_USD/no_usd_scan.txt
Ripgrep results showing no USD formatting in investor-facing code

### E2) NO_USD/enforce_no_usd.md
CI check recommendations

---

## F) Code Excerpts

### code_excerpts/investor_statement_filtering.md
Proof that investor statements ONLY read purpose='reporting' data

### code_excerpts/yield_distribution_purpose.md
Proof that yield distribution properly segregates by purpose

### code_excerpts/idempotency_mechanisms.md
Documentation of all idempotency mechanisms

---

## Reproduction Instructions

See README.md for step-by-step instructions to reproduce all evidence outputs.
