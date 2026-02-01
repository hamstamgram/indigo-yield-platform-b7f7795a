# AUM Validation Fix Report

## Executive Summary

This report documents the root cause analysis and fixes for the **135003 XRP AUM inconsistency incident** and comprehensive validation gaps discovered across all financial functions.

## Root Cause Analysis

### The 135003 XRP Incident

**What happened:**
1. An admin created a manual deposit for Sam Johnson in the XRP fund
2. The admin entered `135003` as the "New Total AUM" instead of the correct value (~22,500)
3. The system accepted this value without validation
4. This incorrect AUM propagated to `fund_aum_events` table
5. Subsequent deposit attempts were blocked with "Gross yield amount cannot be negative" because the opening AUM was grossly inflated

**Root Cause:**
The `p_closing_aum` parameter in `apply_deposit_with_crystallization` was passed directly from admin UI input without any validation against actual position sums.

**Code Path:**
```
AdminManualTransaction.tsx (UI)
  └── depositWithYieldService.ts:162 (passes newTotalAum as p_closing_aum)
      └── apply_deposit_with_crystallization (RPC - NO VALIDATION)
          └── crystallize_yield_before_flow (RPC - NO VALIDATION)
              └── fund_aum_events (writes incorrect 135003 value)
```

## Comprehensive Fix

### 1. Helper Function Created

**`validate_aum_against_positions()`** - A reusable validation function:
- Calculates actual position sum from `investor_positions` (investor accounts only)
- Compares with entered AUM
- Returns validation result with deviation percentage
- Max allowed deviation: 10%

### 2. Functions Fixed (11 Total)

| Function | Risk Level | Fix Applied |
|----------|------------|-------------|
| `apply_deposit_with_crystallization` | CRITICAL | AUM validation before processing |
| `apply_withdrawal_with_crystallization` | CRITICAL | AUM validation before processing |
| `crystallize_yield_before_flow` | CRITICAL | AUM validation at start (ROOT CAUSE) |
| `apply_transaction_with_crystallization` | HIGH | AUM validation when manually provided |
| `set_fund_daily_aum` | HIGH | Validation for all purposes (not just 'reporting') |
| `replace_aum_snapshot` | HIGH | AUM validation before replacement |
| `apply_adb_yield_distribution` | HIGH | Yield amount (max 50%) + recorded_aum validation |
| `update_fund_daily_aum` | MEDIUM | AUM validation before update |
| `update_fund_daily_aum_with_recalc` | MEDIUM | AUM validation before update |
| `apply_yield_correction_v2` | MEDIUM | AUM validation before correction |

### 3. Frontend Validation Added

**`AdminManualTransaction.tsx`:**
- Shows expected AUM (current + deposit amount)
- Displays warning if entered AUM deviates >10% from expected
- Blocks submission if validation fails

### 4. Protected by Downstream Validation

These functions call the validated functions and are now protected:
- `complete_withdrawal` → calls `apply_withdrawal_with_crystallization`
- `void_and_reissue_transaction` → calls deposit/withdrawal functions
- `crystallize_month_end` → calls `crystallize_yield_before_flow`
- `batch_crystallize_fund` → calls `crystallize_yield_before_flow`

## Validation Logic

### AUM Validation
```sql
-- Calculate actual position sum (investor accounts only)
SELECT COALESCE(SUM(ip.current_value), 0)
FROM investor_positions ip
JOIN profiles pr ON ip.investor_id = pr.id
WHERE ip.fund_id = p_fund_id
  AND ip.current_value > 0
  AND pr.account_type = 'investor';

-- Compare with entered value
deviation = ABS(entered_aum - actual_sum) / actual_sum

-- Reject if deviation > 10%
IF deviation > 0.10 THEN
  RETURN error('AUM_VALIDATION_FAILED', ...)
END IF
```

### Yield Amount Validation
```sql
-- Max 50% yield per period (sanity check)
yield_pct = gross_yield_amount / previous_aum * 100

IF yield_pct > 50 THEN
  RETURN error('YIELD_AMOUNT_VALIDATION_FAILED', ...)
END IF
```

## Error Messages

### AUM Validation Failed
```json
{
  "success": false,
  "error": "AUM_VALIDATION_FAILED",
  "error_code": "AUM_DEVIATION_ERROR",
  "message": "AUM validation failed: Entered AUM (135003) deviates by 500.0% from actual position sum (22500). Maximum allowed is 10%.",
  "validation": {
    "actual_position_sum": 22500,
    "entered_aum": 135003,
    "deviation_pct": 500.0
  }
}
```

### Yield Amount Validation Failed
```json
{
  "success": false,
  "error": "YIELD_AMOUNT_VALIDATION_FAILED",
  "message": "Yield amount validation failed: 75.00% yield exceeds maximum allowed 50%.",
  "yield_pct": 75.0,
  "gross_yield_amount": 15000,
  "previous_aum": 20000
}
```

## Migrations Applied

1. `add_aum_validation_to_deposit_rpc` - Fixed deposit/withdrawal functions
2. `comprehensive_aum_validation_all_functions` - Fixed crystallization, AUM, yield functions
3. `add_validation_to_apply_transaction_with_crystallization` - Fixed generic transaction function
4. `add_validation_to_remaining_aum_functions` - Fixed update and correction functions

## Testing Recommendations

1. **Deposit with wrong AUM**: Try entering `newTotalAum = currentAUM * 10` - should be rejected
2. **Withdrawal with wrong AUM**: Same test for withdrawals
3. **Yield with excessive amount**: Try `gross_yield = previous_aum * 0.6` (60%) - should be rejected
4. **Edge cases**:
   - Empty fund (0 positions) - should allow any AUM
   - Small deviation (5%) - should pass
   - Boundary deviation (10.1%) - should fail

## Bypass Mechanisms

For legitimate scenarios where validation must be bypassed:

### Trusted Sources (Skip Validation)
The following sources are trusted and skip validation:
- `trigger_chain` - System triggers
- `yield_distribution` - Automated yield processing
- `crystallization` - Automated crystallization
- `position_sync` - Position synchronization

### Explicit Skip
Use `p_skip_validation = true` parameter (requires admin + audit log reason).

## Summary

**Problem**: Admin could enter any AUM value without validation
**Fix**: All AUM-accepting functions now validate against actual positions
**Prevention**: 10% maximum deviation enforced server-side + frontend warnings

This fix ensures data entry errors like the 135003 XRP incident cannot happen again.

---
*Report generated: 2026-01-24*
*Migrations: 4 applied*
*Functions fixed: 11*
