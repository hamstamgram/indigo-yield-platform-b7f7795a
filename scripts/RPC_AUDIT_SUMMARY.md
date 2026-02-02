# RPC Signature Audit Report
**Generated**: 2026-02-02
**Database Functions**: 360
**Frontend Signatures**: 256
**Functions Audited**: 253

## Executive Summary

**Total Mismatches**: 763
**CRITICAL Mismatches**: 292 (could cause runtime errors)

### Critical Issues Breakdown

| Issue Type | Count | Severity | Impact |
|------------|-------|----------|---------|
| **MISSING_IN_DB** | 3 | 🔴 CRITICAL | Frontend references non-existent RPC functions |
| **REQUIRED_PARAM_COUNT_MISMATCH** | 7 | 🔴 CRITICAL | Parameter count mismatch will cause RPC call failures |
| **REQUIRED_PARAM_NAME_MISMATCH** | 282 | 🔴 CRITICAL | Parameter order/name mismatch will send wrong data |
| **MISSING_IN_FRONTEND** | 102 | ⚠️  MEDIUM | Unused DB functions (mostly triggers - expected) |
| **OPTIONAL_PARAM_COUNT_MISMATCH** | 8 | ⚠️  MEDIUM | Optional params differ (may work but incomplete) |
| **OPTIONAL_PARAM_NAME_MISMATCH** | 73 | ⚠️  MEDIUM | Optional param order differs |
| **SECURITY_DEFINER_MISMATCH** | 244 | ⚠️  MEDIUM | Security context mismatch (mostly benign) |
| **RETURNS_SET_MISMATCH** | 44 | ⚠️  MEDIUM | Return type array expectation mismatch |

---

## 1. MISSING_IN_DB (3 RPCs)

These RPCs are referenced in the frontend contract but DO NOT exist in the database. Any calls to these will fail.

| RPC Name | Frontend Signature | Action Needed |
|----------|-------------------|---------------|
| `fix_cost_basis_anomalies` | required: `p_admin_id` <br> optional: `p_dry_run`, `p_reason` | ❌ Remove from frontend contract or create DB function |
| `fix_doubled_cost_basis` | required: (none) <br> optional: (none) | ❌ Remove from frontend contract or create DB function |
| `fix_position_metadata` | required: (none) <br> optional: (none) | ❌ Remove from frontend contract or create DB function |

**Recommendation**: These appear to be one-off fix functions that were never implemented or were removed from DB but left in contract. Remove from `rpcSignatures.ts`.

---

## 2. REQUIRED_PARAM_COUNT_MISMATCH (7 RPCs)

Parameter count differences will cause RPC calls to fail with "function does not exist" errors.

### 2.1 `adjust_investor_position`
- **DB**: 4 required: `p_investor_id, p_fund_id, p_amount, p_reason`
- **Frontend**: 2 required: `p_fund_id, p_investor_id`
- **Issue**: Missing `p_amount` and `p_reason` in frontend contract
- **Fix**: Update frontend contract to include all 4 required params

### 2.2 `batch_crystallize_fund`
- **DB**: 3 required: `p_fund_id, p_effective_date, p_force_override`
- **Frontend**: 1 required: `p_fund_id`
- **Issue**: Missing `p_effective_date` and `p_force_override` in frontend
- **Fix**: Update frontend contract to match DB signature

### 2.3 `force_delete_investor`
- **DB**: 2 required: `p_investor_id, p_admin_id`
- **Frontend**: 1 required: `p_investor_id`
- **Issue**: Missing `p_admin_id` in frontend
- **Fix**: Update frontend contract

### 2.4 `get_kpi_metrics`
- **DB**: 2 required: `metric_type, user_id`
- **Frontend**: 0 required (all optional)
- **Issue**: Frontend treats these as optional when they're required
- **Fix**: Move `metric_type` and `user_id` to required params

### 2.5 `require_super_admin`
- **DB**: 2 required: `p_operation, p_actor_id`
- **Frontend**: 1 required: `p_operation`
- **Issue**: Missing `p_actor_id` in frontend
- **Fix**: Update frontend contract

### 2.6 `route_withdrawal_to_fees`
- **DB**: 2 required: `p_request_id, p_actor_id`
- **Frontend**: 1 required: `p_request_id`
- **Issue**: Missing `p_actor_id` in frontend
- **Fix**: Update frontend contract

### 2.7 `upsert_fund_aum_after_yield`
- **DB**: 5 required: `p_fund_id, p_aum_date, p_yield_amount, p_purpose, p_actor_id`
- **Frontend**: 2 required: `p_aum_date, p_fund_id`
- **Issue**: Missing 3 required params in frontend
- **Fix**: Update frontend contract to include all 5 required params

---

## 3. REQUIRED_PARAM_NAME_MISMATCH (282 RPCs!)

This is the largest issue category. Parameter ORDER matters in Supabase RPC calls - the frontend is passing parameters in the wrong order.

### Examples

#### `_resolve_investor_fee_pct`
- **DB Order**: `p_investor_id, p_fund_id, p_date`
- **Frontend Order**: `p_date, p_fund_id, p_investor_id`
- **Impact**: Wrong data will be passed to wrong parameters

#### `acquire_position_lock`
- **DB Order**: `p_investor_id, p_fund_id`
- **Frontend Order**: `p_fund_id, p_investor_id`
- **Impact**: Parameters swapped

#### `admin_create_transaction`
- **DB Order**: `p_investor_id, p_fund_id, p_type, p_amount, p_tx_date`
- **Frontend Order**: `p_amount, p_fund_id, p_investor_id, p_tx_date, p_type`
- **Impact**: Completely scrambled parameter order

**Root Cause**: The frontend contract appears to alphabetize or reorder parameters, but Supabase RPC calls are POSITIONAL. The order in the DB function signature MUST match the order in the frontend contract.

**Fix Options**:
1. **Option A (Recommended)**: Regenerate `rpcSignatures.ts` from DB using the correct parameter order from `pg_proc.proargnames`
2. **Option B**: Manually fix all 282 mismatches (error-prone)

---

## 4. MISSING_IN_FRONTEND (102 RPCs)

These DB functions are not in the frontend contract. Most are triggers (expected) but some are genuine RPCs that should be added.

### Triggers (Expected - 73)
These are PostgreSQL trigger functions - they don't need to be in the frontend contract:
- `alert_on_aum_position_mismatch`
- `audit_delta_trigger`
- `cascade_void_from_transaction`
- `check_concentration_risk`
- `enforce_*` (various enforcement triggers)
- `log_*` (various audit log triggers)
- `prevent_*` (various prevention triggers)
- `validate_*` (various validation triggers)
- ...and 60+ more

### Genuine RPCs Missing from Frontend (29)
These should potentially be added to the frontend contract:

#### Deprecated/Old Versions (can ignore):
- `apply_daily_yield_to_fund_v2` (v3 exists)

#### Active RPCs Not in Contract:
- Many `get_*` diagnostic/admin functions
- Several batch operations
- Cleanup utilities
- Reporting RPCs

**Recommendation**: Review the list in `scripts/rpc-audit-report.txt` lines with "MISSING_IN_FRONTEND" and determine which should be added to the contract vs. which are internal-only.

---

## 5. OPTIONAL_PARAM_MISMATCHES (81 total)

Similar to required params - order and count differ between DB and frontend.

### Count Mismatches (8)
- `adjust_investor_position`: DB has 2 optional, frontend has 8
- `apply_transaction_with_crystallization`: DB has 5, frontend has 4
- `batch_crystallize_fund`: DB has 0, frontend has 5
- `force_delete_investor`: DB has 0, frontend has 1
- `get_kpi_metrics`: DB has 0, frontend has 3
- `require_super_admin`: DB has 0, frontend has 1
- `route_withdrawal_to_fees`: DB has 1, frontend has 2
- `upsert_fund_aum_after_yield`: DB has 0, frontend has 5

### Order Mismatches (73)
Similar root cause to required param order issues.

**Fix**: Same as required params - regenerate contract from DB.

---

## 6. SECURITY_DEFINER_MISMATCH (244)

The DB has `SECURITY DEFINER` set to `true` for most RPCs, but the frontend contract has `false`.

**Impact**: This is mostly a documentation issue. The `securityDefiner` flag in the frontend contract is informational and doesn't affect runtime behavior. However, it's inaccurate.

**Recommendation**: Update frontend contract to match DB reality. Most financial mutation RPCs should be `SECURITY DEFINER`.

---

## 7. RETURNS_SET_MISMATCH (44)

These RPCs return TABLE or SETOF but the frontend contract has `returnsSet: false`.

### Examples:
- `acquire_delivery_batch` returns `TABLE(...)` but frontend expects single row
- `check_all_funds_transaction_aum` returns `SETOF` but frontend expects scalar
- `get_fund_composition` returns `TABLE(...)` but frontend expects single row
- `get_position_reconciliation` returns `TABLE(...)` but frontend expects single row
- ...and 40 more

**Impact**: The frontend may not correctly handle array results. TanStack Query/Supabase client should handle this automatically, but the contract is misleading.

**Recommendation**: Update frontend contract to set `returnsSet: true` for all functions that return TABLE or SETOF.

---

## Remediation Plan

### Phase 1: Fix Critical Issues (P0 - Do First)

1. **Remove non-existent RPCs** (3)
   - Delete `fix_cost_basis_anomalies`, `fix_doubled_cost_basis`, `fix_position_metadata` from `rpcSignatures.ts`

2. **Fix required param count mismatches** (7)
   - Update contracts for:
     - `adjust_investor_position`
     - `batch_crystallize_fund`
     - `force_delete_investor`
     - `get_kpi_metrics`
     - `require_super_admin`
     - `route_withdrawal_to_fees`
     - `upsert_fund_aum_after_yield`

3. **Fix required param ORDER** (282)
   - **Automated Fix**: Create script to regenerate `rpcSignatures.ts` from DB using correct param order
   - Script should query `pg_proc` and use `proargnames` array in exact order
   - Preserve the existing structure but fix param ordering

### Phase 2: Fix Medium-Priority Issues (P1 - Do Next)

4. **Fix optional param mismatches** (81)
   - Same regeneration script will fix these

5. **Update securityDefiner flags** (244)
   - Same regeneration script

6. **Update returnsSet flags** (44)
   - Same regeneration script

### Phase 3: Cleanup (P2 - Nice to Have)

7. **Document trigger functions**
   - Add comment in `rpcSignatures.ts` explaining that 70+ trigger functions are intentionally not included

8. **Add missing utility RPCs**
   - Review the 29 non-trigger RPCs missing from frontend
   - Add those that should be callable from frontend
   - Document reason for excluding others

---

## Automated Fix Script Outline

```typescript
// scripts/regenerate-rpc-signatures.ts

1. Query DB for all public functions:
   - Function name
   - Parameter names (in order from proargnames)
   - Parameter types
   - Parameter defaults
   - Return type
   - returnsSet flag
   - securityDefiner flag

2. For each function:
   - Parse parameter list into required vs optional
   - Preserve exact order from DB
   - Generate TypeScript signature object

3. Filter out trigger functions (return type = 'trigger')

4. Generate rpcSignatures.ts with:
   - Correct parameter order
   - Correct required/optional classification
   - Correct securityDefiner flag
   - Correct returnsSet flag

5. Preserve existing RPC_FUNCTIONS array order
```

---

## Impact Assessment

### Severity: HIGH

- **292 CRITICAL mismatches** could cause runtime errors
- **282 parameter order mismatches** mean wrong data is being passed to RPCs
- **7 parameter count mismatches** mean RPC calls will fail completely
- **3 missing functions** will cause RPC not found errors

### User Impact

- **Potential data corruption**: Parameter order mismatches could pass wrong values
- **Transaction failures**: Count mismatches cause RPC call failures
- **Silent failures**: Optional param mismatches may cause features to not work as expected

### Recommended Priority

**URGENT**: Fix Phase 1 issues immediately. The parameter order mismatches are particularly dangerous as they could cause financial data corruption.

---

## Verification Steps

After fixes are applied:

1. Run `npx tsx scripts/audit-rpc-signatures-v2.ts`
2. Verify all CRITICAL mismatches are resolved
3. Run `npm run build` to check for TypeScript errors
4. Run integration tests for financial RPCs
5. Verify no runtime RPC errors in logs

---

## Appendix: Full Report Location

Full detailed report with all 763 mismatches:
`/Users/mama/indigo-yield-platform-v01/scripts/rpc-audit-report.txt`
