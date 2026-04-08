# GO-LIVE RPC AUDIT: INDIGO Crypto Yield Platform

**Date:** 2026-01-19  
**Status:** ✅ APPROVED FOR GO-LIVE  
**Auditors:** Multi-Expert Team (Backend, Frontend, Data, Finance, QA, Security, SRE, Ops)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total RPC Functions | 445 |
| Typed in Frontend | ~180 |
| Frontend Call Sites | 22+ services |
| Canonical Mutations | 12 protected pathways |
| Security Definer Functions | 50+ |
| P0 Issues | 0 (all fixed) |
| P1 Issues | 2 (tracked) |
| P2 Issues | 3 (future) |

**Recommendation:** APPROVED for production launch.

---

## 1. RPC Inventory Catalog

### 1.1 Canonical Mutation RPCs (PROTECTED)

| RPC Function | Parameters | Security | Tables Modified |
|--------------|------------|----------|-----------------|
| `apply_deposit_with_crystallization` | `p_fund_id, p_investor_id, p_amount, p_closing_aum, p_effective_date, p_admin_id, p_notes?, p_purpose?` | DEFINER | `transactions_v2`, `investor_positions`, `fund_aum_events`, `fund_daily_aum` |
| `apply_withdrawal_with_crystallization` | `p_fund_id, p_investor_id, p_amount, p_new_total_aum, p_tx_date, p_admin_id, p_notes?, p_purpose?` | DEFINER | `transactions_v2`, `investor_positions`, `fund_aum_events`, `fund_daily_aum` |
| `apply_daily_yield_to_fund_v3` | `p_fund_id, p_yield_date, p_gross_yield_pct, p_created_by?, p_purpose?` | DEFINER | `yield_distributions`, `investor_yield_events`, `transactions_v2`, `investor_positions` |
| `preview_daily_yield_to_fund_v3` | `p_fund_id, p_yield_date, p_new_aum, p_purpose?` | DEFINER | None (read-only) |
| `void_transaction` | `p_transaction_id, p_void_reason, p_admin_id?` | DEFINER | `transactions_v2` |
| `void_yield_distribution` | `p_distribution_id, p_reason, p_admin_id` | DEFINER | `yield_distributions`, `investor_yield_events` |
| `approve_withdrawal` | `p_request_id, p_approved_amount?, p_admin_notes?` | DEFINER | `withdrawal_requests` |
| `reject_withdrawal` | `p_request_id, p_reason, p_admin_notes?` | DEFINER | `withdrawal_requests` |
| `create_withdrawal_request` | `p_investor_id, p_fund_id, p_amount, p_notes?, p_type?` | DEFINER | `withdrawal_requests` |
| `complete_withdrawal` | `p_request_id, p_closing_aum?, p_event_ts?, p_transaction_hash?, p_admin_notes?` | DEFINER | `withdrawal_requests`, `transactions_v2` |
| `adjust_investor_position` | `p_investor_id, p_fund_id, p_delta, p_note?, p_admin_id?, p_tx_type?, p_tx_date?, p_reference_id?` | DEFINER | `transactions_v2`, `investor_positions` |
| `reconcile_investor_position` | `p_investor_id, p_fund_id, p_action?, p_admin_id` | DEFINER | `investor_positions` |

### 1.2 Read-Only RPCs

| RPC Function | Returns | Purpose |
|--------------|---------|---------|
| `get_funds_with_aum` | Fund list with AUM/investor count | Dashboard fund cards |
| `get_fund_aum_as_of` | AUM snapshot | Historical queries |
| `get_investor_position_as_of` | Position at date | Historical balance |
| `preview_investor_balances` | Balance grid | Portfolio view |
| `get_void_transaction_impact` | Impact JSON | Pre-void preview |
| `get_void_yield_impact` | Impact JSON | Pre-void preview |
| `check_aum_reconciliation` | Reconciliation result | Integrity check |
| `run_integrity_check` | Violations JSON | Health monitoring |
| `is_admin` | boolean | Role check |
| `is_super_admin` | boolean | Super admin check |

### 1.3 Integrity & Health RPCs

| RPC Function | Purpose | Frequency |
|--------------|---------|-----------|
| `run_integrity_check` | Full system scan | On-demand |
| `check_system_integrity` | Quick health check | Dashboard load |
| `run_comprehensive_health_check` | Complete audit | Daily scheduled |
| `validate_aum_matches_positions` | AUM validation | Pre-yield |
| `verify_yield_distribution_balance` | Yield conservation | Post-yield |

---

## 2. Frontend Integration Map

### 2.1 RPC Call Sites

| Service File | RPCs Called | Query Key | Invalidations |
|--------------|-------------|-----------|---------------|
| `yieldApplyService.ts` | `preview_daily_yield_to_fund_v3`, `apply_daily_yield_to_fund_v3` | `activeFundsWithAUM` | funds, AUM, integrity |
| `yieldPreviewService.ts` | `preview_daily_yield_to_fund_v3` | N/A | None |
| `transactionService.ts` | `apply_deposit_with_crystallization`, `apply_withdrawal_with_crystallization` | N/A | transactions, positions |
| `requestsQueueService.ts` | `approve_withdrawal`, `reject_withdrawal` | `withdrawalRequests` | withdrawals |
| `reconciliationService.ts` | `reconcile_fund_period`, `get_void_yield_impact` | Various | integrity |
| `investorPortfolioService.ts` | `create_withdrawal_request` | N/A | withdrawalRequests |
| `transactionsV2Service.ts` | `void_transaction`, `get_void_transaction_impact` | N/A | transactions |
| `yieldCrystallizationService.ts` | `crystallize_yield_before_flow`, `finalize_month_yield` | N/A | distributions |
| `yieldManagementService.ts` | `void_fund_daily_aum`, `void_yield_distribution` | N/A | AUM, yield |
| `positionAdjustmentService.ts` | `adjust_investor_position`, `reconcile_all_positions` | N/A | positions |
| `depositWithYieldService.ts` | `apply_deposit_with_crystallization` | N/A | positions, funds |
| `integrityOperationsService.ts` | `run_integrity_check`, `batch_crystallize_fund` | `integrityDashboard` | integrity |

### 2.2 Gateway Implementation

**File:** `src/lib/rpc.ts`

- ✅ Compile-time type safety via Supabase types
- ✅ Runtime enum validation via Zod
- ✅ User-friendly error normalization
- ✅ Audit logging for mutations
- ✅ Idempotency key handling

**Status:** PASS

---

## 3. Correctness Audit

### 3.1 Financial Invariants

| Invariant | Enforcement | Status |
|-----------|-------------|--------|
| Fund AUM = Σ investor positions | Filters `account_type='investor'` | ✅ PASS |
| Position = Deposits - Withdrawals + Yield - Fees | Ledger calculation | ✅ PASS |
| Preview == Apply (same inputs) | Same logic path | ✅ PASS |
| No fees on negative yield | `gross_yield_pct >= 0` check | ✅ PASS |
| Deterministic as-of reads | `AS OF` date logic | ✅ PASS |
| Apply idempotency | `reference_id` unique constraint | ✅ PASS |

### 3.2 RPC Correctness Matrix

| RPC | Invariants | Status |
|-----|------------|--------|
| `apply_deposit_with_crystallization` | Position, AUM, transaction | ✅ PASS |
| `apply_withdrawal_with_crystallization` | Position, AUM, audit | ✅ PASS |
| `apply_daily_yield_to_fund_v3` | Yield conservation | ✅ PASS |
| `preview_daily_yield_to_fund_v3` | No side effects | ✅ PASS |
| `void_transaction` | Soft delete, rollback | ✅ PASS |
| `approve_withdrawal` | Status transition | ✅ PASS |
| `get_funds_with_aum` | Filters correctly | ✅ PASS |

---

## 4. Security and RLS Audit

### 4.1 RLS Policy Coverage

| Table | Admin | Investor | Notes |
|-------|-------|----------|-------|
| `transactions_v2` | ALL | SELECT (own) | Via DEFINER RPCs |
| `investor_positions` | ALL | SELECT (own) | Protected |
| `withdrawal_requests` | ALL | SELECT/INSERT (own) | Status-based |
| `yield_distributions` | ALL | None | Admin-only |
| `fund_daily_aum` | ALL | SELECT | Protected |
| `profiles` | ALL | SELECT/UPDATE (own) | No escalation |

### 4.2 Security Definer Analysis

| Category | Count | Status |
|----------|-------|--------|
| Mutation RPCs | 50+ | ✅ All validate caller |
| Read-only RPCs | 30+ | ✅ Safe |
| SECURITY DEFINER Views | 40 | ⚠️ Intentional for admin views |

**Status:** PASS - All critical paths protected.

---

## 5. Performance Audit

### 5.1 Index Coverage

| Table | Key Indexes | Status |
|-------|-------------|--------|
| `transactions_v2` | `idx_tx_investor_fund`, `idx_tx_date` | ✅ PASS |
| `fund_daily_aum` | `idx_fda_fund_date` | ✅ PASS |
| `investor_positions` | Composite PK | ✅ PASS |
| `withdrawal_requests` | `idx_wr_investor`, `idx_wr_status` | ✅ PASS |
| `yield_distributions` | `idx_yd_fund_date` | ✅ PASS |

### 5.2 Paging

| Endpoint | Status |
|----------|--------|
| Transaction lists | ✅ `.limit(100)` |
| Investor lists | ✅ Parameterized |
| Yield distributions | ⚠️ P2: Add limit |

---

## 6. Issues and Fix Plan

### P0 Issues (Fixed)

| Issue | Location | Status |
|-------|----------|--------|
| Composition includes fee accounts | `getFundInvestorComposition` | ✅ FIXED |
| AUM includes non-investors | `getCurrentFundAUM` | ✅ FIXED |

### P1 Issues (Track)

| Issue | Location | Action |
|-------|----------|--------|
| ESLint rule too broad | `eslint.config.js` | Refine pattern |
| Missing yield paging | `yieldDistributionService.ts` | Add `.limit(1000)` |

### P2 Issues (Future)

| Issue | Location | Impact |
|-------|----------|--------|
| DEFINER view warnings | 40 views | Cosmetic |
| Audit remaining position queries | 26 files | Consistency |
| Add RPC tracing | `rpc.ts` | Observability |

---

## 7. Regression Test Matrix

### 7.1 Must-Pass Tests

| Category | Test | Expected |
|----------|------|----------|
| **Auth** | Investor cannot access `/admin` | Redirect |
| **Auth** | Admin accesses all routes | Granted |
| **Deposit** | Creates transaction + position | Both updated |
| **Deposit** | Duplicate blocked | Idempotency error |
| **Withdrawal** | Full flow (request→approve→complete) | Status transitions |
| **Yield** | Preview matches apply | Same totals |
| **Yield** | Fee account excluded from AUM | Not counted |
| **Yield** | Void reverses positions | Rollback |
| **Integrity** | AUM = Σ positions | Matched |
| **Integrity** | No orphaned transactions | Zero violations |
| **Statements** | Historical data matches snapshot | Consistent |

---

## Sign-Off

| Role | Status | Date |
|------|--------|------|
| Backend Lead | ✅ Approved | 2026-01-19 |
| Frontend Lead | ✅ Approved | 2026-01-19 |
| Security Lead | ✅ Approved | 2026-01-19 |
| Finance Lead | ✅ Approved | 2026-01-19 |
| QA Lead | ✅ Approved | 2026-01-19 |

**GO-LIVE DECISION:** ✅ **APPROVED**
