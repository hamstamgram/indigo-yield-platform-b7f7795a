
# Platform Precision Upgrade — COMPLETED

## What Was Done (Single Migration)

### Part 1: Upgraded 12 Functions to numeric(38,18)
All internal variable declarations and casts changed from `numeric(28,10)` to `numeric(38,18)`:
- `recompute_investor_position`, `fn_ledger_drives_position`, `approve_and_complete_withdrawal`
- `adjust_investor_position`, `can_withdraw`, `get_available_balance`
- `get_platform_flow_metrics`, `validate_yield_parameters`, `internal_route_to_fees`
- `route_withdrawal_to_fees`, `reconcile_investor_position_internal`, `void_and_reissue_full_exit`

### Part 2: Rebuilt All Positions
Looped through every distinct `(investor_id, fund_id)` in `transactions_v2` and called `recompute_investor_position`. All position drifts now read **exactly 0.000000000000000000**.

### Part 3: Fixed 5 BTC Withdrawal Dates
| Request ID | Before | After |
|---|---|---|
| `964dec83...` | 2026-03-20 | **2024-11-09** |
| `f78d35be...` | 2026-03-20 | **2024-12-14** |
| `bc37d3f9...` | 2026-03-24 | **2024-12-15** |
| `7dcf819b...` | 2026-03-24 | **2024-12-15** |
| `ed3a039d...` | 2026-03-24 | **2024-12-15** |

## Verification Results
- **All position drifts**: 0 (exact zero across all positions)
- **All 5 withdrawal dates**: Corrected to match ledger `tx_date`
- **No code changes needed**: All UI surfaces read from the corrected data

---

# Post-Upgrade Audit — COMPLETED

## Bugs Fixed

### BUG 1 (Critical): Admin "Add Transaction" withdrawal missing dates
- **File**: `useTransactionSubmit.ts`
- **Fix**: Added `settlement_date: data.tx_date` and `request_date: data.tx_date` to the `withdrawal_requests` insert
- **Impact**: Prevents future withdrawal date bugs when admins enter historical dates

### BUG 2 (Moderate): `void_and_reissue_full_exit` security check
- **Fix**: Replaced `profiles.is_admin` column check with `public.is_admin()` RPC
- **Impact**: Prevents potential privilege escalation via profile manipulation

### BUG 3 (Low): `reconcile_investor_position_internal` cost_basis mismatch
- **Fix**: Aligned cost_basis logic to use `ABS(amount)` for deposits and `-1 * ABS(amount)` for withdrawals, matching the canonical `recompute_investor_position`
- **Impact**: Ensures reconciliation produces identical results to the canonical writer

### Cosmetic: TypeScript precision comments
- **Fix**: Replaced all `NUMERIC(28,10)` references with `NUMERIC(38,18)` across 19 type files
- **Impact**: Documentation accuracy only
