# Post-Merge Stabilization Tracker

**Merge Commit:** 45be22b3 (main)  
**Date:** 2026-04-13  
**Duration:** 3 business days (2026-04-14 through 2026-04-16)  
**Purpose:** Verify no hidden regressions from cleanup audit pass

---

## Daily Checklist (Run Each Day)

### Day 1: 2026-04-14 (Monday)

#### Morning Sync
- [ ] No user-reported issues overnight
- [ ] Alerts/monitoring clear for critical flows
- [ ] Database connectivity stable

#### Core Flow Validation
- [ ] **Investor listing screen** — loads without errors
- [ ] **Fund listing screen** — shows all funds correctly
- [ ] **Deposit flow** — deposit transaction completes successfully
- [ ] **AUM summary screen** — displays correct balances
- [ ] **Admin dashboard** — loads all widgets without errors

#### Post-Merge Specifics
- [ ] Hook consolidation side effects: useFunds() parameter changes not causing UI breaks
- [ ] View consolidation side effects: AUM screens rendering correctly after view drop (13 core views)
- [ ] Migration side effects: No cascading issues from dropped functions/tables

#### Issue Tracking
- [ ] Any regressions found → create ticket with label `regression:post-merge`
- [ ] Document symptom, flow, and reproduction steps
- [ ] Link to baseline/sign-off docs for context

---

### Day 2: 2026-04-15 (Tuesday)

#### Continued Validation
- [ ] **Withdrawal flow** — withdrawal transaction completes successfully
- [ ] **Yield operations** — yield preview and apply work correctly
- [ ] **Void/Unvoid flow** — transaction void/restore cycle works
- [ ] **Reporting screens** — reports generate without errors
- [ ] **Admin tools** — any screen touched by hook consolidation

#### Code Quality Checks
- [ ] Lint score stable (should be at 244 pre-existing problems)
- [ ] No new TypeScript errors (beyond pre-existing heap OOM issue)
- [ ] No console errors in browser dev tools

#### Regression Investigation
- [ ] If any failures → check docs/audit/BATCH_5_HOOK_CONSOLIDATION.md for useFunds() changes
- [ ] If any AUM failures → check docs/audit/BATCH_6_DROPPED_VIEWS_REFERENCE.md for view recovery
- [ ] If any void/unvoid failures → check docs/audit/BATCH_3_VOID_CANONICAL_API.md for regression tests

---

### Day 3: 2026-04-16 (Wednesday)

#### Final Validation
- [ ] Repeat all flows from Days 1-2 (full regression sweep)
- [ ] Check for timing-dependent issues (race conditions in void/position sync)
- [ ] Verify no data integrity issues in audit_log or transaction tables

#### Sign-Off
- [ ] No outstanding regressions
- [ ] All critical flows stable
- [ ] Ready to proceed to Phase 2

#### If Issues Found
- [ ] Do NOT proceed to Phase 2 until resolved
- [ ] File ticket with priority:high and label `blocker:phase-2`
- [ ] Escalate to team lead for decision

---

## Key Flows to Monitor

### Flow 1: Investor Listing / Summary
**Touched by:** Hook consolidation (useFunds)  
**What to check:**
- Investor list loads all records
- Fund selector dropdown works
- Summary calculations correct

**If broken:**
- Check useFunds() parameter passing in investor screen
- Verify fund filter logic (active/available/all)

---

### Flow 2: Fund Listing / Detail
**Touched by:** Hook consolidation (useFunds)  
**What to check:**
- Fund list displays all funds
- Fund detail page loads without errors
- Performance not degraded

**If broken:**
- Check useFunds() hook integration
- Verify any caching or memoization side effects

---

### Flow 3: Deposit Flow
**Touched by:** Migration validation (nothing removed that would break this)  
**What to check:**
- Can select investor, fund, amount
- Transaction saves to DB
- Position updates correctly
- No orphaned records in audit_log

**If broken:**
- Likely database issue (migration-related)
- Check supabase logs for transaction errors

---

### Flow 4: Withdrawal Flow
**Touched by:** Migration validation (nothing removed that would break this)  
**What to check:**
- Can initiate withdrawal
- Amount validation works
- Transaction voids previous deposit if applicable
- Position updates correctly

**If broken:**
- Check withdrawal service logic
- Verify transaction ledger is clean

---

### Flow 5: Yield Preview / Apply
**Touched by:** Yield v3 drop (Batch 2)  
**What to check:**
- Can load yield preview screen
- Preview calculation correct (uses v5 functions)
- Can apply yield distribution
- Ledger updates correctly

**If broken:**
- Check that yield v5 functions are being called
- Verify no fallback to v3 (v3 is deleted)
- Check yield_distributions table for stale v3 references

---

### Flow 6: Void / Unvoid Transaction
**Touched by:** Test assertion extraction (Batch 1c)  
**What to check:**
- Can void a transaction
- Position updates (reverses the impact)
- Ledger stays clean (no reconciliation violations)
- Can unvoid and restore position

**If broken:**
- Check tests/migrations/void_transaction_regression_tests.sql for known issues
- Verify position sync didn't regress
- Check audit_log for correct void entries

---

### Flow 7: AUM Screens
**Touched by:** View consolidation (Batch 6)  
**What to check:**
- AUM summary page loads
- Fund AUM values display correctly
- Position health status shows
- No SQL errors in browser console

**If broken:**
- Check docs/audit/BATCH_6_DROPPED_VIEWS_REFERENCE.md to see if dropped view is referenced
- Most likely affected view: v_fund_aum_position_health, aum_position_reconciliation
- May need to restore view temporarily if critical

---

### Flow 8: Reporting / Statement Screens
**Touched by:** View consolidation, yield changes (Batches 2, 6)  
**What to check:**
- Reports generate without errors
- Statement PDF exports correctly
- Data accuracy (positions, yields, balances)

**If broken:**
- Check if report query references dropped view
- Verify yield data is coming from v5 (not v3)
- Check reporting service logs

---

### Flow 9: Screens Touched by Hook Consolidation
**Touched by:** Hook consolidation (Batch 5)  
**Files affected:** 6 call sites in:
- YieldHistoryPage.tsx
- AdminWithdrawalsPage.tsx
- YieldDistributionsPage.tsx
- QuickYieldEntry.tsx
- AddTransactionDialog.tsx
- NotificationBell.tsx

**What to check:**
- Each screen loads without errors
- Fund selection works (useFunds parameter)
- Notifications display (useNotificationBell wrapper)
- No performance degradation

**If broken:**
- Check if useFunds() parameter format is correct
- Verify useNotificationBell() wrapper is forwarding props
- Check React Query cache invalidation

---

## Symptom → Root Cause Map

| Symptom | Likely Cause | Investigation |
|---------|--------------|---|
| AUM screens blank | Dropped view v_fund_aum_position_health | Check BATCH_6_DROPPED_VIEWS_REFERENCE.md, restore view if critical |
| Yield not applying | Yield v3 function deleted, v5 not called | Check yieldApplyService.ts is calling v5 |
| Void fails or cascades incorrectly | Test assertion extraction | Check tests/migrations/void_transaction_regression_tests.sql |
| Fund dropdown empty | useFunds() parameter not matching options | Check hook call sites, verify parameter format |
| Notifications not showing | useNotificationBell wrapper issue | Check notification hook integration in NotificationBell.tsx |
| Reconciliation violations | Position sync or ledger mismatch | Check v_ledger_reconciliation for errors |

---

## Escalation Path

**Level 1 (Minor issue, can fix in Phase 2):**
- UI glitch, non-critical screen error
- Performance regression (minor)
- Orphaned log entries

**Level 2 (Regression, fix before Phase 2):**
- Flow breaks (deposit, withdrawal, yield)
- Data integrity issue (position mismatch, audit log gaps)
- Critical screen inaccessible

**Level 3 (Blocker, escalate immediately):**
- Financial flow completely broken
- Data loss or corruption
- AUM calculations incorrect
- Void/unvoid cascade broken

---

## Sign-Off Template

After 3 days of monitoring:

```
✅ Post-Merge Stabilization Complete

Monitoring period: 2026-04-14 through 2026-04-16
Regressions found: [0 / n]
Severity: [None / Low / Medium / High]
Issues escalated: [if any]

Flows validated:
- [x] Investor listing
- [x] Fund detail
- [x] Deposit flow
- [x] Withdrawal flow
- [x] Yield preview/apply
- [x] Void/unvoid
- [x] AUM screens
- [x] Reporting screens

Code quality:
- [x] No new type errors
- [x] Lint score stable
- [x] No console errors

Assessment: STABLE / ISSUES FOUND

Next phase: Ready for Position Sync Phase 2 / Hold for resolution
```

---

## Success Criteria

✅ **Stabilization is successful if:**
- No Level 3 (blocker) issues found
- All 8 core flows pass validation
- No new type errors (beyond pre-existing OOM)
- Code quality metrics stable
- Ready to proceed to Phase 2

❌ **Stabilization is unsuccessful if:**
- Any Level 3 issue found
- Core flow cannot complete
- Data integrity issue detected
- Cannot proceed to Phase 2 until fixed
