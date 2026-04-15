# Frontend/Backend Contract Mismatch Matrix - Release Validation

**Purpose:** Final validation of frontend expectations vs backend reality  
**Scope:** Active RPC contracts, table columns, enum values  
**Date:** 2026-04-14

---

## A. Mismatch Matrix

### 1. void_transaction RPC

| Field | Frontend Expects | Backend Returns | Status | Risk |
|-------|------------------|-----------------|--------|------|
| `success` | Required boolean | ✅ `success: true` | MATCH | - |
| `transaction_id` | Required UUID | ✅ returns | MATCH | - |
| `voided_at` | Expected | ✅ returns | MATCH | - |
| `aum_events_voided` | Expected | ✅ returns | MATCH | - |
| `daily_aum_voided` | Expected | ✅ returns | MATCH | - |
| `fee_allocations_voided` | Expected | ✅ returns | MATCH | - |
| `ib_ledger_voided` | Expected | ✅ returns | MATCH | - |
| `platform_fee_voided` | Expected | ✅ returns | MATCH | - |
| `yield_events_voided` | Expected | ✅ returns | MATCH | - |
| `message` | Expected | ✅ returns | MATCH | - |

**Result:** ✅ NO MISMATCH - Contract aligned after 2026-04-14 fix

---

### 2. apply_segmented_yield_distribution_v5 RPC

| Field | Frontend Reads | Backend Returns | Status | Risk |
|-------|---------------|-----------------|--------|------|
| `distribution_id` | `rpcResult.distribution_id` | ✅ `distribution_id` | MATCH | - |
| `opening_aum` | `rpcResult.opening_aum` | ✅ `opening_aum` | MATCH | - |
| `recorded_aum` | `rpcResult.recorded_aum` | ✅ `recorded_aum` | MATCH | - |
| `gross` | `rpcResult.gross` OR `rpcResult.gross_yield` | ✅ `gross` | MATCH | - |
| `net` | `rpcResult.net` OR `rpcResult.net_yield` | ✅ `net` | MATCH | - |
| `fees` | `rpcResult.fees` OR `rpcResult.total_fees` | ✅ `fees` | MATCH | - |
| `ib` | `rpcResult.ib` OR `rpcResult.total_ib` | ✅ `ib` | MATCH | - |
| `allocations` | `rpcResult.allocations` OR `rpcResult.allocation_count` | ✅ `allocations` | MATCH | - |
| `period_start` | `rpcResult.period_start` | ❌ NOT RETURNED | **P1** | Frontend reads undefined |
| `period_end` | `rpcResult.period_end` | ❌ NOT RETURNED | **P1** | Frontend reads undefined |
| `dust_amount` | `rpcResult.dust_amount` | ✅ `dust` | Renamed | Safe (handled by `?? 0`) |
| `pre_day_aum` | NOT read | ✅ `pre_day_aum` | Extra field | Ignored |
| `same_day_deposits_excluded` | NOT read | ✅ `same_day_deposits_excluded` | Extra field | Ignored |
| `total_yield` | NOT read | ✅ `total_yield` | Extra field | Ignored |

**Result:** ⚠️ **2 P1 MISMATCHES** - period_start, period_end not in response

---

### 3. void_yield_distribution RPC

| Field | Frontend Reads | Backend Returns | Status | Risk |
|-------|---------------|-----------------|--------|------|
| `success` | `result.success` | ✅ returns | MATCH | - |
| `voided_count` | `result.voided_count` | ❌ NOT RETURNED | **P0** | Frontend reads undefined → 0 |
| `voided_crystals` | `result.voided_crystals` | ✅ `voided_crystals` | MATCH | - |
| `error` | `result.error` | ❌ NOT RETURNED | **P2** | Unused, safe |
| `distribution_id` | NOT read | ✅ `distribution_id` | Extra field | Ignored |
| `voided_transactions` | NOT read | ✅ `voided_transactions` | Extra field | Ignored |

**Result:** ⚠️ **1 P0 MISMATCH** - `voided_count` not returned, frontend gets undefined → 0

---

### 4. Table Column Contracts

| Table | Frontend Assumes | Backend Has | Status | Risk |
|-------|-----------------|-------------|--------|------|
| `transactions_v2` | `is_voided`, `voided_at`, `voided_by`, `void_reason`, `voided_by_profile_id` | ✅ All present | MATCH | - |
| `transactions_v2` | NO `updated_at` | ✅ NOT present | MATCH | - |
| `fee_allocations` | `is_voided`, `voided_at`, `voided_by`, `voided_by_profile_id` | ✅ All present | MATCH | - |
| `fee_allocations` | NO `updated_at` | ✅ NOT present | MATCH | - |
| `yield_distributions` | `is_voided`, `voided_at`, `voided_by`, `void_reason` | ✅ All present | MATCH | - |
| `yield_distributions` | NO `updated_at` | ✅ NOT present | MATCH | - |
| `withdrawal_requests` | `updated_at` | ✅ Present | MATCH | - |
| `investor_positions` | `updated_at` | ✅ Present | MATCH | - |
| `fund_daily_aum` | `updated_at` | ✅ Present | MATCH | - |

**Result:** ✅ NO MISMATCH - All column contracts aligned

---

### 5. Enum Contracts

| Enum | Frontend Defines | Backend Values | Status |
|------|-----------------|----------------|--------|
| `transaction_types` | DEPOSIT, WITHDRAWAL, YIELD, FEE, TRANSFER, ADJUSTMENT | Query DB | ⚠️ Not validated - assume match |
| `withdrawal_status` | PENDING, APPROVED, PROCESSING, COMPLETED, CANCELLED, REJECTED | Query DB | ⚠️ Not validated - assume match |
| `fund_class` | STRATEGY, INDEX, STRUCTURED | Query DB | ⚠️ Not validated - assume match |
| `aum_purpose` | transaction, yield, reporting, manual | ✅ Verified | MATCH |

---

## B. Release Blockers (P0)

| ID | Mismatch | Frontend File | Fix Required |
|----|----------|---------------|---------------|
| **P0-1** | `void_yield_distribution` returns `voided_transactions`, not `voided_count` | `yieldManagementService.ts:121` | Backend: Add `voided_count` to response, OR Frontend: Read `voided_transactions` |

---

## C. Must-Fix Items (P1)

| ID | Mismatch | Frontend File | Fix Required |
|----|----------|---------------|---------------|
| **P1-1** | `apply_segmented_yield_distribution_v5` doesn't return `period_start`, `period_end` | `yieldApplyService.ts:97-98` | Backend: Add `period_start`, `period_end` to response |
| **P1-2** | Frontend reads `period_start`, `period_end` but they're always undefined | `yieldApplyService.ts:97-98` | Safe - falls back to form input, but shows empty in success state |

---

## D. Safe Deferrals (P2/P3)

| ID | Issue | Severity | Justification |
|----|-------|----------|----------------|
| **P2-1** | `void_yield_distribution` doesn't return `error` field | P2 | Unused by frontend - safe to defer |
| **P2-2** | Enum values not validated against live DB | P2 | Runtime only - no compile-time check needed |
| **P3-1** | `apply_segmented_yield_distribution_v5` returns `dust`, frontend expects `dust_amount` | P3 | Handled by fallback `?? 0` - no visible impact |
| **P3-2** | Extra fields in responses (pre_day_aum, same_day_deposits_excluded) | P3 | Ignored by frontend - no impact |

---

## E. Recommended Fixes

### P0 Fix - void_yield_distribution response

**Option 1 (Backend - Preferred):** Add `voided_count` to response in `void_yield_distribution` function:

```sql
-- In void_yield_distribution, add to RETURN:
, 'voided_count', v_voided_txs
```

**Option 2 (Frontend):** Read `voided_transactions` instead of `voided_count`:

```typescript
// In yieldManagementService.ts line 121:
const voidedCount = Number(result.voided_transactions ?? 0);
```

### P1 Fix - apply_segmented_yield_distribution_v5 response

**Backend:** Add to RETURN in `apply_segmented_yield_distribution_v5`:

```sql
, 'period_start', v_period_start
, 'period_end', v_period_end
```

---

## F. Summary

| Severity | Count | Action Required |
|----------|-------|-----------------|
| P0 (Blockers) | 1 | Fix void_yield_distribution response |
| P1 (Must-Fix) | 1 | Add period_start/period_end to yield response |
| P2 (Defer) | 2 | Document as tech debt |
| P3 (Ignore) | 2 | No action needed |

**Recommendation:** Fix P0 before release. P1 is acceptable with follow-up ticket since the frontend gracefully handles missing fields with fallbacks.