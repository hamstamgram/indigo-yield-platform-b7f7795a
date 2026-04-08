
# Comprehensive Platform Verification Checklist
## For Senior Dev, CTO, and CFO Sign-Off

---

## DISCOVERED BUGS (to fix before verification)

### BUG A: `run_integrity_pack()` is BROKEN — crashes on every call (CRITICAL)

The function inserts `status = 'running'` into `admin_integrity_runs`, but the table has a CHECK constraint that only allows `'pass'` or `'fail'`. Every call to "Run Full Check" on the Operations page crashes immediately.

**Fix**: Migration to add `'running'` and `'warning'` to the CHECK constraint:
```sql
ALTER TABLE admin_integrity_runs DROP CONSTRAINT admin_integrity_runs_status_check;
ALTER TABLE admin_integrity_runs ADD CONSTRAINT admin_integrity_runs_status_check 
  CHECK (status = ANY (ARRAY['pass','fail','running','warning']));
```

### BUG B: Investor `cancelWithdrawalRequest` bypasses state machine (MODERATE)

`src/features/investor/withdrawals/services/investorWithdrawalService.ts` line 97 does a direct `.update({ status: 'cancelled' })`. While the guard allows `pending → cancelled` without the canonical flag today, this bypasses audit logging. Should use `cancel_withdrawal_by_admin_v2` or a dedicated investor cancel RPC.

**Fix**: Replace direct update with RPC call (or create a lightweight `cancel_withdrawal_by_investor` RPC).

### BUG C: `MonthlyReportsTable` uses `Number()` for financial edits (MINOR)

Line 106 uses `Number(editValue)` which loses precision for values with >15 significant digits. Should use `parseFinancial()` and pass as string to the RPC.

**Fix**: Replace `Number(editValue)` with `parseFinancial(editValue).toString()` and pass as string.

### BUG D: `fundService.ts` uses `Number()` for AUM display (MINOR)

Lines 157, 186, 215 use `Number(f.total_aum || 0)` which loses precision for large AUM values. These are display-only but violate the precision standard.

**Fix**: Replace with `parseFinancial(f.total_aum || 0).toNumber()`.

---

## DATABASE HEALTH (current status: ALL CLEAN)

| Check | Result |
|-------|--------|
| Ledger reconciliation | 0 violations |
| Cost basis mismatch | 0 violations |
| Position-transaction variance | 0 violations |
| Yield conservation | 0 violations |
| Missing withdrawal transactions | 0 violations |
| Orphaned positions | 0 |
| Orphaned fee allocations | 0 |
| Orphaned IB allocations | 0 |
| Orphaned platform fee ledger | 0 |
| Orphaned IB commission ledger | 0 |
| Active positions with zero value | 0 |
| NULL investor/fund/amount in txns | 0 |
| Positive withdrawal amounts | 0 |
| Zero-value deposits | 0 |

---

## VERIFICATION CHECKLIST

### LAYER 1: Database Integrity (CFO + CTO)
- [ ] Fix BUG A, then run `run_integrity_pack()` — must return `status = 'pass'`
- [ ] All 5 integrity views return 0 rows (confirmed above)
- [ ] No orphaned records across fee_allocations, ib_allocations, platform_fee_ledger, ib_commission_ledger
- [ ] All `completed` withdrawal_requests have matching non-voided transactions
- [ ] All active positions have non-zero current_value or cost_basis
- [ ] Withdrawal amounts are negative in transactions_v2
- [ ] No NULL investor_id, fund_id, or amount in non-voided transactions

### LAYER 2: State Machine Guards (CTO + Senior Dev)
- [ ] Direct `.update({ status: 'completed' })` on withdrawal_requests is blocked (guard trigger fires)
- [ ] Direct `.update({ status: 'approved' })` on withdrawal_requests is blocked
- [ ] `completed → cancelled` only works via canonical RPC (void_completed_withdrawal)
- [ ] `cancelled → pending` only works via canonical RPC (restore_withdrawal_by_admin_v2)
- [ ] `rejected → pending` only works via canonical RPC (restore_withdrawal_by_admin_v2)
- [ ] Direct position field updates are blocked by `trg_enforce_canonical_position_write`
- [ ] Fix BUG B so investor cancel also has audit trail

### LAYER 3: Precision Integrity (CFO + Senior Dev)
- [ ] No `parseFloat()` or raw `Number()` on financial amounts in mutation paths
- [ ] Fix BUG C (MonthlyReportsTable Number() on financial edit)
- [ ] Fix BUG D (fundService Number() on AUM)
- [ ] All RPC amount parameters use `as unknown as number` string cast pattern
- [ ] Yield preview and apply use `ROUND(..., 18)` — confirmed in DB functions
- [ ] UI renders financial values via `parseFinancial().toNumber()` or `Decimal.js`

### LAYER 4: RPC Security (CTO)
- [ ] All SECURITY DEFINER functions have `SET search_path = public`
- [ ] All mutation RPCs include `check_is_admin()` or `is_admin()` guard
- [ ] `anon` and `PUBLIC` roles cannot EXECUTE mutation RPCs
- [ ] `authenticated` non-admin users cannot execute admin RPCs (internal is_admin check)
- [ ] No direct table mutations bypass RPC gateway for financial tables

### LAYER 5: Data Visibility & Leakage (CTO + Senior Dev)
- [ ] Investor transactions query filters `visibility_scope = 'investor_visible'` (fixed)
- [ ] Investor performance query filters `purpose = 'reporting'` (fixed)
- [ ] RLS on all financial tables verified (fee_allocations, ib_allocations, platform_fee_ledger, etc.)
- [ ] System accounts (INDIGO FEES) not visible to investor queries
- [ ] DUST_SWEEP, FEE_CREDIT, IB_CREDIT transactions not shown in investor UI

### LAYER 6: Withdrawal Lifecycle E2E (All three)
- [ ] Investor submits withdrawal → appears as `pending`
- [ ] Admin approves partial withdrawal → position decremented, status `completed`
- [ ] Admin approves full exit → crystallize → dust sweep → position deactivated
- [ ] Admin voids completed withdrawal → position restored, status `cancelled`
- [ ] Admin void & reissue → old voided, new request created and completed
- [ ] Admin rejects withdrawal → status `rejected` with audit trail
- [ ] Admin restores rejected withdrawal → status back to `pending`
- [ ] Route to fees → DUST_SWEEP transactions created, status `completed`

### LAYER 7: Yield Lifecycle E2E (All three)
- [ ] Preview returns per-investor breakdown with fees and IB
- [ ] Apply creates YIELD + FEE_CREDIT + IB_CREDIT transactions atomically
- [ ] Conservation identity: gross = sum(allocations) within asset-specific tolerance
- [ ] Void distribution cascades to fee_allocations, ib_allocations, platform_fee_ledger, ib_commission_ledger
- [ ] Voided yield transactions have `is_voided = true`
- [ ] AUM refreshed after yield application

### LAYER 8: Deposit Lifecycle (Senior Dev)
- [ ] First investment creates position with correct cost_basis
- [ ] Top-up increments existing position
- [ ] Crystallization fires before deposit if yield exists
- [ ] Transaction visible in investor portal

### LAYER 9: Audit Trail (CFO)
- [ ] All financial mutations log to audit_log
- [ ] Audit log is immutable (UPDATE/DELETE blocked by RLS)
- [ ] Void operations record old_values/new_values diff
- [ ] Export CSV works from admin UI
- [ ] actor_user populated for all admin actions

### LAYER 10: Cross-Portal Consistency (All three)
- [ ] Admin investor detail balance = investor dashboard balance
- [ ] Admin transaction count = investor transaction count
- [ ] Yield distribution net amount = investor yield history amount
- [ ] Statement balances match live position values
- [ ] Fund AUM = sum of active investor positions for that fund

---

## IMPLEMENTATION

4 fixes required before checklist can pass:

1. **Migration**: Fix `admin_integrity_runs` CHECK constraint to allow `'running'` and `'warning'`
2. **Migration or code**: Create investor-side cancel RPC or route through existing one
3. **Code**: `MonthlyReportsTable.tsx` — replace `Number()` with `parseFinancial()`
4. **Code**: `fundService.ts` — replace `Number()` with `parseFinancial()`

After fixes, run the full 10-layer checklist. Estimated verification time: 60-90 minutes manual, or automated via the E2E suite + integrity pack.
