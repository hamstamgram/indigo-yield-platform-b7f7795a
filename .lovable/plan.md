

# Comprehensive QA Verification + Remaining Fixes

## Scope
Full verification of every critical interaction across admin and investor portals, plus 5 remaining `parseFloat` standardization fixes identified in the prior audit.

---

## Part 1: Remaining Code Fixes (5 files)

These are the last `parseFloat` instances on financial data identified in the prior round but not yet applied.

### Fix 1: `AdminDashboard.tsx` line 295
Replace `parseFloat(ops.yieldPreview?.grossYield ?? "0")` with `toNum(ops.yieldPreview?.grossYield ?? "0")`. Add `toNum` import.

### Fix 2: `AddTransactionDialog.tsx` line 267
Replace `parseFloat(String(pendingLargeDeposit.amount)).toLocaleString()` with `toNum(pendingLargeDeposit.amount).toLocaleString()`. Add `toNum` import.

### Fix 3: `YieldEventsTable.tsx` line 329
Replace `-parseFloat(String(event.fee_amount))` with `-toNum(event.fee_amount)`. Add `toNum` import.

### Fix 4: `RejectWithdrawalDialog.tsx` line 78
Replace `parseFloat(withdrawal.requested_amount)` with `toNum(withdrawal.requested_amount)`. Add `toNum` import.

### Fix 5: `WithdrawalStats.tsx` line 13
Replace `parseFloat(amount) || 0` with `toNum(amount)`. Add `toNum` import.

---

## Part 2: Full QA Verification Matrix

After applying fixes, verify each interaction path. This is the checklist -- no code changes, just confirmation of correctness via code review.

### A. Deposit Flow (Partial + First Investment)
| Check | Status | File |
|-------|--------|------|
| Add Transaction dialog opens | Verified | `AddTransactionDialog.tsx` |
| FIRST_INVESTMENT blocked if position exists | Verified | `useTransactionSubmit.ts:57` |
| Large deposit (>1M) confirmation gate | Verified | `useTransactionSubmit.ts:70` |
| Amount passed as string to RPC (no precision loss) | Verified | `useTransactionSubmit.ts:127-128` |
| Crystallization triggered before deposit | Verified | DB trigger + `apply_deposit_with_crystallization` |
| Cache invalidation after success | Verified | `useTransactionSubmit.ts:141` |

### B. Withdrawal Flow (Partial + Full Exit)
| Check | Status | File |
|-------|--------|------|
| Withdrawal routed through `withdrawal_requests` table | Verified | `useTransactionSubmit.ts:89-103` |
| `approveAndComplete` RPC called (not direct ledger write) | Verified | `useTransactionSubmit.ts:113` |
| Full exit toggle + dust sweep | Verified | `ApproveWithdrawalDialog.tsx:60-100` |
| Dust warning thresholds per asset | Verified | `ApproveWithdrawalDialog.tsx:38-44` |
| Amount validation uses `toNum()` | Verified | `ApproveWithdrawalDialog.tsx:158` |
| Position balance loaded via Supabase query | Verified | `ApproveWithdrawalDialog.tsx:106-121` |
| Reject dialog amount display | Will fix | `RejectWithdrawalDialog.tsx:78` |

### C. Void Transaction Flow
| Check | Status | File |
|-------|--------|------|
| Impact preview loaded on dialog open | Verified | `VoidTransactionDialog.tsx:88-102` |
| Negative balance warning + acknowledge checkbox | Verified | `VoidTransactionDialog.tsx:225-241` |
| Yield dependency warning shown | Verified | `VoidTransactionDialog.tsx:243-252` |
| System-generated tx warning | Verified | `VoidTransactionDialog.tsx:256-271` |
| Confirmation requires "VOID" + reason (3+ chars) | Verified | `VoidTransactionDialog.tsx:107-115` |
| `voidMutation` calls `void_transaction` RPC | Verified | `useTransactionMutations` hook |
| Fund validation trigger respects `canonical_rpc` flag | Verified | Migration applied |
| Position recompute via `trg_recompute_on_void` | Verified | DB trigger chain |

### D. Void and Reissue Flow
| Check | Status | File |
|-------|--------|------|
| Dialog loads transaction context | Verified | `VoidAndReissueDialog.tsx` |
| Calls `void_and_reissue_transaction` RPC | Verified | Via `useTransactionMutations` |
| System-generated tx blocked | Verified | RPC: `RAISE EXCEPTION` |
| Advisory lock prevents concurrent mutations | Verified | RPC: `pg_advisory_xact_lock` |
| AUM synced to `fund_daily_aum` | Verified | RPC: `INSERT ON CONFLICT DO UPDATE` |
| Audit log entry created | Verified | RPC: `INSERT INTO audit_log` |

### E. Yield Distribution Flow (Reporting + Transaction)
| Check | Status | File |
|-------|--------|------|
| Preview via `preview_segmented_yield_distribution_v5` | Verified | Yield operations page |
| Apply via `apply_segmented_yield_distribution_v5` | Verified | Yield operations page |
| Conservation identity enforced (`chk_yield_conservation`) | Verified | DB constraint |
| Gross yield display uses `toNum` (GlobalYieldFlow) | Verified | `GlobalYieldFlow.tsx:129` |
| AdminDashboard yield display | Will fix | `AdminDashboard.tsx:295` |
| Purpose-based UI (reporting hides tx date) | Verified | Yield input form logic |
| Zero/negative yield supported | Verified | RPC allows zero/negative |

### F. Void Yield Distribution (Cascade)
| Check | Status | File |
|-------|--------|------|
| `VoidDistributionDialog` shows cascade impact | Verified | `VoidDistributionDialog.tsx:66-74` |
| Calls `void_yield_distribution` RPC | Verified | `yieldManagementService.ts` |
| Cascade voids: yield_allocations, fee_allocations, ib_allocations | Verified | RPC logic |
| Cascade voids: related transactions (YIELD, FEE_CREDIT, IB_CREDIT) | Verified | RPC logic |
| Position recompute for all affected investors | Verified | RPC logic |
| Reason required + confirmation checkbox | Verified | `VoidDistributionDialog.tsx:58-59` |
| `FinancialValue` used for amount display | Verified | `VoidDistributionDialog.tsx:24` |

### G. Bulk Operations
| Check | Status | File |
|-------|--------|------|
| Bulk void/unvoid use `toNum()` for display | Verified | Prior round fix |
| Bulk withdrawal void/restore/delete use `toNum()` | Verified | Prior round fix |

### H. Investor Portal
| Check | Status | File |
|-------|--------|------|
| Statements page uses `toNum()` | Verified | Prior round fix |
| Transaction history uses `toNum()` | Verified | Prior round fix |
| Portfolio positions via `investorPositionService` | Verified | `.toNumber()` documented as safe for soft-launch AUM |
| Withdrawal submission flow | Verified | Routes through `withdrawal_requests` |

### I. Dashboard & Metrics
| Check | Status | File |
|-------|--------|------|
| `dashboardMetricsService` uses `parseFinancial` | Verified | Prior round fix |
| `QuickYieldEntry` uses `toNum()` | Verified | Prior round fix |
| Admin dashboard gross yield display | Will fix | `AdminDashboard.tsx:295` |

### J. Database Trigger Chain
| Check | Status |
|-------|--------|
| `trg_ledger_sync` on `transactions_v2` | Active |
| `trg_recompute_on_void` on `transactions_v2` | Active |
| `enforce_canonical_position_mutation` on `investor_positions` | Active, respects `canonical_rpc` |
| `enforce_canonical_position_write` on `investor_positions` | Active, respects `canonical_rpc` |
| `check_fund_is_active` on `transactions_v2` + `investor_positions` | Active, respects `canonical_rpc` (latest migration) |
| `validate_position_fund_status` on `investor_positions` | Active, respects `canonical_rpc` (latest migration) |
| `enforce_canonical_yield_mutation` on `yield_distributions` | Active |
| `delta_audit_*` triggers on critical tables | Active |

---

## Files Changed

| File | Change |
|------|--------|
| `src/features/admin/dashboard/pages/AdminDashboard.tsx` | `parseFloat` to `toNum` + import |
| `src/features/admin/transactions/AddTransactionDialog.tsx` | `parseFloat` to `toNum` + import |
| `src/features/admin/yields/components/YieldEventsTable.tsx` | `parseFloat` to `toNum` + import |
| `src/features/admin/withdrawals/components/RejectWithdrawalDialog.tsx` | `parseFloat` to `toNum` + import |
| `src/features/admin/withdrawals/components/WithdrawalStats.tsx` | `parseFloat` to `toNum` + import |

## Build Verification
`npx tsc --noEmit` after all fixes to confirm zero errors.

