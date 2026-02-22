
# Audit Report: Active Bugs in Used Functions

After systematically reviewing all active service files, database logs, RLS policies, and RPC call sites, here are the remaining bugs -- strictly limited to actively used code paths.

---

## BUG-1: `deleteNotification` will always fail silently (HIGH)

**File**: `src/services/shared/notificationService.ts` line 47
**Problem**: The `notifications` table has a DELETE policy: `notifications_delete_policy` with `USING (false)`. This means ALL deletes are blocked by RLS. The `deleteNotification` function calls `.delete()` which will silently return zero affected rows (Supabase doesn't throw on 0-row RLS-blocked deletes).

**Active callers**: `useDeleteNotification` hook, `useNotifications.archiveNotification`, notification list UI.

**Impact**: Users click "delete" or "archive" on a notification and nothing happens. The UI optimistically removes it but on next fetch it reappears.

**Fix**: Either:
- Change the DELETE policy to `USING (user_id = auth.uid())` to allow users to delete their own, OR
- Replace `deleteNotification` with a "soft delete" approach (e.g., set a `dismissed_at` timestamp) since the policy intentionally blocks hard deletes for audit reasons.

---

## BUG-2: `parseFloat` used for financial amounts in `recordedYieldsService.ts` (MEDIUM)

**File**: `src/services/admin/recordedYieldsService.ts` lines 186-189
**Problem**: Uses `parseFloat()` to convert yield distribution amounts (`gross_yield`, `net_yield`, `total_fees`, `total_ib`). Per platform standards, `parseFloat()` is prohibited for financial values because JavaScript floats lose precision beyond 17 significant digits. The database stores these as `NUMERIC(28,10)`.

**Impact**: Yield totals displayed on the Recorded Yields page could show incorrect values for large amounts (e.g., a fund with >100M in yield). Display-only -- does not corrupt data.

**Fix**: Replace `parseFloat(String(...))` with `parseFinancial(...)` from `@/utils/financial` (already imported by the module). Return string type for `gross_yield`, `net_yield`, `total_fees`, `total_ib` in the `YieldRecord` interface.

---

## BUG-3: `parseFloat` in `depositService.ts` notification (LOW)

**File**: `src/services/investor/depositService.ts` line 194
**Problem**: `parseFloat(String(amount))` used to pass deposit amount to notification. This is for display in a notification toast only, so impact is cosmetic.

**Fix**: Replace with `parseFinancial(amount).toNumber()` for consistency, though this is non-critical since it's notification display only.

---

## BUG-4: `parseFloat` in `feeSettingsService.ts` for global fee percentage (LOW)

**File**: `src/services/admin/feeSettingsService.ts` line 26
**Problem**: `parseFloat(val)` used for the global platform fee percentage. This is a small number (0.20 = 20%) so precision loss is unlikely, but it violates the standard.

**Fix**: Replace with `parseFinancial(val).toNumber()`.

---

## Summary

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | HIGH | `notificationService.ts` | `deleteNotification` always blocked by RLS `false` policy |
| 2 | MEDIUM | `recordedYieldsService.ts` | `parseFloat` on financial amounts loses precision |
| 3 | LOW | `depositService.ts` | `parseFloat` on notification amount |
| 4 | LOW | `feeSettingsService.ts` | `parseFloat` on fee percentage |

### Note on previously fixed issues
- The `visibility_scope` column DOES exist on `transactions_v2` (confirmed via DB query) -- so references to it in `investorPortalService.ts` and `adminTransactionHistoryService.ts` are correct.
- The `notifications` UPDATE policy was successfully added in the prior fix.
- The `feesService.ts` operator precedence fix was successfully applied.
- The `as any` casts in `adminTransactionHistoryService.ts` (unvoid/bulk) are for RPCs pending type generation -- these are documented known bypasses, not bugs.

### Recommended fix order
1. BUG-1 (notification delete) -- functional breakage visible to users
2. BUG-2 (parseFloat in yields) -- precision risk on financial display
3. BUGs 3-4 -- standard compliance, low risk
