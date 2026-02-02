# Critical RPCs Requiring Immediate Fix

## Tier 0 - NON-EXISTENT (Delete from Contract)

| RPC | Status | Action |
|-----|--------|--------|
| `fix_cost_basis_anomalies` | ❌ Does not exist in DB | Remove from `rpcSignatures.ts` line ~100 |
| `fix_doubled_cost_basis` | ❌ Does not exist in DB | Remove from `rpcSignatures.ts` line ~101 |
| `fix_position_metadata` | ❌ Does not exist in DB | Remove from `rpcSignatures.ts` line ~102 |

## Tier 1 - WRONG PARAM COUNT (Will Fail at Runtime)

### `adjust_investor_position`
**Current Frontend**: `p_fund_id, p_investor_id` + 8 optional
**Actual DB**: `p_investor_id, p_fund_id, p_amount, p_reason` + 2 optional

**Fix**:
```typescript
adjust_investor_position: {
  requiredParams: ["p_investor_id", "p_fund_id", "p_amount", "p_reason"] as const,
  optionalParams: ["p_tx_date", "p_admin_id"] as const,
  securityDefiner: true, // also fix this
  returnsSet: false,
}
```

### `batch_crystallize_fund`
**Current Frontend**: `p_fund_id` + 5 optional
**Actual DB**: `p_fund_id, p_effective_date, p_force_override` + 0 optional

**Fix**:
```typescript
batch_crystallize_fund: {
  requiredParams: ["p_fund_id", "p_effective_date", "p_force_override"] as const,
  optionalParams: [] as const,
  securityDefiner: true,
  returnsSet: false,
}
```

### `force_delete_investor`
**Current Frontend**: `p_investor_id` + 1 optional
**Actual DB**: `p_investor_id, p_admin_id` + 0 optional

**Fix**:
```typescript
force_delete_investor: {
  requiredParams: ["p_investor_id", "p_admin_id"] as const,
  optionalParams: [] as const,
  securityDefiner: true,
  returnsSet: false,
}
```

### `get_kpi_metrics`
**Current Frontend**: 0 required + 3 optional
**Actual DB**: `metric_type, user_id` + 0 optional

**Fix**:
```typescript
get_kpi_metrics: {
  requiredParams: ["metric_type", "user_id"] as const,
  optionalParams: [] as const,
  securityDefiner: true,
  returnsSet: false,
}
```

### `require_super_admin`
**Current Frontend**: `p_operation` + 1 optional
**Actual DB**: `p_operation, p_actor_id` + 0 optional

**Fix**:
```typescript
require_super_admin: {
  requiredParams: ["p_operation", "p_actor_id"] as const,
  optionalParams: [] as const,
  securityDefiner: true,
  returnsSet: false,
}
```

### `route_withdrawal_to_fees`
**Current Frontend**: `p_request_id` + 2 optional
**Actual DB**: `p_request_id, p_actor_id` + 1 optional

**Fix**:
```typescript
route_withdrawal_to_fees: {
  requiredParams: ["p_request_id", "p_actor_id"] as const,
  optionalParams: ["p_reason"] as const,
  securityDefiner: true,
  returnsSet: false,
}
```

### `upsert_fund_aum_after_yield`
**Current Frontend**: `p_aum_date, p_fund_id` + 5 optional
**Actual DB**: `p_fund_id, p_aum_date, p_yield_amount, p_purpose, p_actor_id` + 0 optional

**Fix**:
```typescript
upsert_fund_aum_after_yield: {
  requiredParams: ["p_fund_id", "p_aum_date", "p_yield_amount", "p_purpose", "p_actor_id"] as const,
  optionalParams: [] as const,
  securityDefiner: true,
  returnsSet: false,
}
```

## Tier 2 - WRONG PARAM ORDER (High Risk of Data Corruption)

These are the most frequently used financial RPCs with parameter order issues:

### Financial Transactions

#### `admin_create_transaction`
**Frontend Order**: `p_amount, p_fund_id, p_investor_id, p_tx_date, p_type`
**DB Order**: `p_investor_id, p_fund_id, p_type, p_amount, p_tx_date`
**Risk**: HIGH - Amount and investor_id positions swapped

#### `apply_daily_yield_to_fund_v3`
**Frontend Order**: `p_fund_id, p_gross_yield_pct, p_yield_date`
**DB Order**: `p_fund_id, p_yield_date, p_gross_yield_pct`
**Risk**: HIGH - Yield date and amount swapped

#### `apply_deposit_with_crystallization`
**Frontend Order**: `p_admin_id, p_amount, p_closing_aum, p_effective_date, p_fund_id, p_investor_id`
**DB Order**: `p_fund_id, p_investor_id, p_amount, p_closing_aum, p_effective_date, p_admin_id`
**Risk**: HIGH - Completely scrambled

#### `apply_withdrawal_with_crystallization`
**Frontend Order**: `p_admin_id, p_amount, p_fund_id, p_investor_id, p_new_total_aum, p_tx_date`
**DB Order**: `p_fund_id, p_investor_id, p_amount, p_new_total_aum, p_tx_date, p_admin_id`
**Risk**: HIGH - Completely scrambled

### Position Management

#### `acquire_position_lock`
**Frontend Order**: `p_fund_id, p_investor_id`
**DB Order**: `p_investor_id, p_fund_id`
**Risk**: MEDIUM - Swapped identifiers

### Yield Operations

#### `apply_adb_yield_distribution_v3`
**Frontend Order**: `p_fund_id, p_gross_yield_amount, p_period_end, p_period_start`
**DB Order**: `p_fund_id, p_period_start, p_period_end, p_gross_yield_amount`
**Risk**: HIGH - Yield amount in wrong position

### Approval Workflows

#### `approve_withdrawal`
**Frontend Order**: `p_admin_id, p_request_id`
**DB Order**: `p_request_id, p_admin_id`
**Risk**: MEDIUM - Swapped identifiers

## Recommended Fix Strategy

### Option A: Manual Fix (High Effort, Error-Prone)
1. Fix Tier 0 (3 RPCs) - Delete them
2. Fix Tier 1 (7 RPCs) - Update param counts
3. Fix Tier 2 (sample above, 20+ RPCs) - Reorder params
4. Continue through remaining 260+ mismatches

**Estimated Time**: 8-12 hours
**Risk**: High (copy-paste errors, missing edge cases)

### Option B: Automated Regeneration (Recommended)
1. Create script to query `pg_proc` for ALL public functions
2. Parse `proargnames` array in exact order
3. Parse `proargdefaults` to determine required vs optional
4. Parse `prosecdef` and `proretset` flags
5. Regenerate entire `rpcSignatures.ts`
6. Run audit again to verify

**Estimated Time**: 2-3 hours
**Risk**: Low (systematic fix, easy to verify)

### Option C: Hybrid Approach
1. Manually fix Tier 0 and Tier 1 (10 RPCs, 30 min)
2. Deploy hotfix for critical issues
3. Schedule automated regeneration for full fix

**Estimated Time**: Initial 30 min, full fix 3-4 hours
**Risk**: Medium (temporary partial fix, but contains immediate damage)

## Impact if Not Fixed

### Data Corruption Risk
- **HIGH**: Financial transactions with wrong amounts/dates
- **HIGH**: Yield calculations with swapped parameters
- **HIGH**: Position updates with wrong investor/fund IDs

### Runtime Failures
- **MEDIUM**: 7 RPCs will fail with "function not found"
- **MEDIUM**: 3 RPCs will fail with "RPC does not exist"
- **LOW**: Optional param mismatches may cause silent failures

### Security Risk
- **LOW**: `securityDefiner` mismatch is informational only
- **LOW**: `returnsSet` mismatch may cause UI issues but not data issues

## Testing After Fix

1. **Unit Tests**: Run contract verification
   ```bash
   npm run contracts:verify
   ```

2. **Integration Tests**: Test critical financial flows
   - Create transaction
   - Apply yield
   - Process deposit
   - Process withdrawal
   - Crystallize position

3. **Audit Verification**: Re-run audit
   ```bash
   npx tsx scripts/audit-rpc-signatures-v2.ts
   ```

4. **Production Smoke Test**: Use QA credentials
   - Admin: Create transaction, apply yield
   - Investor: Check dashboard, verify balances
   - IB: Check commissions

---
**Priority**: 🔴 URGENT
**Estimated Fix Time**: 2-3 hours (Option B) or 30 min hotfix (Option C)
**Risk Level**: HIGH (data corruption possible)
**Recommended Approach**: Option C (hotfix + full regeneration)
