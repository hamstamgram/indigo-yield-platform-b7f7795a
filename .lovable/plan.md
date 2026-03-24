

# Full Impact Analysis: BTC Withdrawal Date Fix

## Summary

The wrong dates are confined to the `withdrawal_requests` table metadata only. The underlying `transactions_v2` ledger entries already have the correct `tx_date` values (Nov/Dec 2024). This means:

- **Statements and reports**: NOT affected (they read from `transactions_v2.tx_date`)
- **Investor portal withdrawal history**: AFFECTED (reads `withdrawal_requests.request_date`)
- **Admin withdrawals table**: AFFECTED (displays `request_date`)
- **Admin investor detail withdrawals tab**: AFFECTED (displays `request_date`)
- **Admin dashboard pending/recent withdrawals**: AFFECTED (reads `request_date`)
- **Withdrawal details drawer**: AFFECTED (shows `request_date` and `processed_at`)
- **CSV export**: AFFECTED (exports `request_date`)
- **Admin action bar counts**: NOT affected (only counts pending status)

## Impact Map

| Surface | Data Source | Affected? | What Shows Wrong |
|---------|-----------|-----------|------------------|
| **Admin Withdrawals Table** | `withdrawal_requests.request_date` | Yes | Date column shows Mar 2026 instead of Nov/Dec 2024 |
| **Admin Withdrawal Details Drawer** | `request_date` + `processed_at` | Yes | Both dates wrong |
| **Admin Investor Activity Tab** | `withdrawal_requests.request_date` | Yes | Withdrawal cards show wrong date |
| **Admin Dashboard** | `withdrawal_requests.request_date` | Yes | Recent withdrawals widget |
| **Investor Withdrawal History** | `withdrawal_requests.request_date` | Yes | Each card shows wrong date |
| **Investor Overview** | `withdrawal_requests.request_date` | Yes | Recent activity feed |
| **CSV Export** | `withdrawal_requests.request_date` | Yes | Exported date column |
| **Investor Statements** | `transactions_v2.tx_date` | No | Already correct |
| **Performance Reports** | `investor_fund_performance` | No | Already correct |
| **Revenue/Fee Pages** | `transactions_v2.tx_date` | No | Already correct |
| **Reconciliation Views** | `transactions_v2` | No | Already correct |

## The Fix

**No code changes needed.** All these surfaces read `request_date` and `processed_at` directly from the `withdrawal_requests` table. Correcting the 5 rows in the database fixes every affected surface automatically.

This is purely a data correction — part of the same migration already planned.

### Data Corrections (5 rows)

| Request ID | Field | Current | Correct |
|---|---|---|---|
| `964dec83...` | `request_date`, `processed_at` | 2026-03-20 | **2024-11-09** |
| `f78d35be...` | `request_date`, `processed_at` | 2026-03-20 | **2024-12-14** |
| `bc37d3f9...` | `request_date`, `processed_at` | 2026-03-24 | **2024-12-15** |
| `7dcf819b...` | `request_date`, `processed_at` | 2026-03-24 | **2024-12-15** |
| `ed3a039d...` | `request_date`, `processed_at` | 2026-03-24 | **2024-12-15** |

Additionally, `created_at`, `approved_at`, and `settlement_date` on these rows should be checked and corrected to match.

## Platform-Wide Prevention

To prevent this from happening again in the future, the `CreateWithdrawalDialog` and withdrawal creation flow should default `request_date` to the admin-specified transaction date rather than `NOW()`. This is already handled correctly in the unified withdrawal flow (`approve_and_complete_withdrawal` RPC), but the manual admin creation path may still use `NOW()`.

## Combined Migration

This date fix is included in the same migration as:
1. Upgrade all 12 functions to `numeric(38,18)`
2. Rebuild all positions from ledger
3. Fix 5 BTC withdrawal_request dates (+ related timestamp fields)
4. Ryan's DUST_SWEEP correction

## Files to Change

| Type | Detail |
|------|--------|
| Migration | UPDATE 5 `withdrawal_requests` rows: `request_date`, `processed_at`, `approved_at`, `settlement_date`, `created_at` to match historical dates |
| No code changes | All UI components already read from the corrected fields |

