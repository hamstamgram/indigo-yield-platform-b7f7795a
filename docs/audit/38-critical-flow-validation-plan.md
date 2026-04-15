# Critical Flow Validation Plan - Release Readiness

**Purpose:** Executable checklist for validating the financial core before release  
**Scope:** All critical user-facing flows with financial impact  
**Date:** 2026-04-14

---

## A. Critical Flow Checklist

---

### Flow 1: Investor Dashboard

| Step | Action | Validation |
|------|--------|------------|
| 1.1 | Login as investor | User lands on `/investor` |
| 1.2 | Verify total AUM displays | Sum of `investor_positions.current_value` for all active positions |
| 1.3 | Verify position cards render | Each position shows fund name, current value, shares |
| 1.4 | Verify yield summary | `total_yield_earned` displays |
| 1.5 | Check realtime updates | Make deposit → dashboard updates within 5s |

**Backend Surfaces:**
- `profiles` table (investor info)
- `investor_positions` table (values, shares)
- `funds` table (fund details)
- Realtime subscription: `investor_positions`

**Frontend Surfaces:**
- `investorPortfolioSummaryService.getInvestorSummary()`
- `useUserAssets` hook
- Dashboard layout components

**Contract Assumptions:**
- `investor_positions.current_value` is NUMERIC
- `investor_positions.is_active` = true for visible positions

**Expected Outcome:** Dashboard loads in <3s, all values match DB query

**Failure Signals:**
- Empty dashboard with valid credentials → RLS blocking
- AUM shows $0 despite positions → `current_value` null/0
- Position count mismatch → `is_active` filter wrong

**Severity if Broken:** CRITICAL - Investor cannot see their portfolio

---

### Flow 2: Deposit (Investor)

| Step | Action | Validation |
|------|--------|------------|
| 2.1 | Navigate to deposit form | Select fund, enter amount |
| 2.2 | Submit deposit | Click Submit |
| 2.3 | Verify transaction created | Query `transactions_v2` for DEPOSIT type |
| 2.4 | Verify position updated | `investor_positions.current_value` increased |
| 2.5 | Verify AUM updated | `fund_daily_aum.total_aum` increased |

**Backend Surfaces:**
- RPC: `apply_transaction_with_crystallization`
- Tables: `transactions_v2`, `investor_positions`, `fund_daily_aum`

**Frontend Surfaces:**
- `depositService.createDeposit()`
- Deposit form component

**Contract Assumptions:**
- Transaction returns `transaction_id`
- Position snapshot includes `current_value`
- Crystallization creates yield event

**Expected Outcome:** Deposit appears in transaction history with correct amount

**Failure Signals:**
- "Failed to apply transaction" → RPC error
- Amount shows but position unchanged → crystallization failed
- Duplicate transaction possible → idempotency missing

**Severity if Broken:** CRITICAL - Core investment function broken

---

### Flow 3: Withdrawal (Investor)

| Step | Action | Validation |
|------|--------|------------|
| 3.1 | Submit withdrawal request | Enter amount, select fund |
| 3.2 | Verify request in PENDING | Query `withdrawal_requests.status = 'PENDING'` |
| 3.3 | Cancel own withdrawal | Before approval |
| 3.4 | Verify status = CANCELLED | Cancellation reflected |

**Backend Surfaces:**
- RPC: `create_withdrawal_request`, `cancel_withdrawal_by_investor`
- Tables: `withdrawal_requests`, `investor_positions`

**Frontend Surfaces:**
- `investorWithdrawalService`
- Withdrawal form

**Contract Assumptions:**
- `withdrawal_requests.status` enum values match frontend
- Cancel only allowed when status = PENDING

**Expected Outcome:** Withdrawal created, cancellable while pending

**Failure Signals:**
- Status stuck at PENDING after admin approval → completion RPC not called
- Cancel fails with "already processing" → status check wrong

**Severity if Broken:** HIGH - Investor cannot access funds

---

### Flow 4: Yield Preview & Apply (Admin)

| Step | Action | Validation |
|------|--------|------------|
| 4.1 | Navigate to yields, enter params | Fund, period end, recorded AUM |
| 4.2 | Click Preview | Verify preview shows investor count, amounts |
| 4.3 | Click Apply | Yield distribution created |
| 4.4 | Verify yield_distributions record | Query table, verify `is_voided = false` |
| 4.5 | Verify fee_allocations created | One per investor |
| 4.6 | Verify transactions created | YIELD type for each investor |
| 4.7 | Verify investor_positions updated | `cumulative_yield_earned` increased |

**Backend Surfaces:**
- RPC: `preview_segmented_yield_distribution_v5`, `apply_segmented_yield_distribution_v5`
- Tables: `yield_distributions`, `fee_allocations`, `transactions_v2`, `investor_positions`

**Frontend Surfaces:**
- `yieldApplyService.applyYieldDistribution()`
- Yield form, preview modal

**Contract Assumptions:**
- Preview returns `allocations` count
- Apply returns `distribution_id`, `gross`, `net`, `fees`, `ib`
- `yield_distributions.status` = 'applied' or similar

**Expected Outcome:** Yield applied to all investors correctly

**Failure Signals:**
- Preview shows 0 investors → positions not active
- Apply fails with "Fund not found" → fund_id wrong
- Fee allocations missing after apply → cascade failed

**Severity if Broken:** CRITICAL - Monthly distribution broken

---

### Flow 5: Void/Unvoid Transaction (Admin)

| Step | Action | Validation |
|------|--------|------------|
| 5.1 | Find non-voided DEPOSIT transaction | Via transaction history |
| 5.2 | Click Void, enter reason | Submit void request |
| 5.3 | Verify transaction is_voided = true | Query transactions_v2 |
| 5.4 | Verify position reversed | `investor_positions.current_value` decreased |
| 5.5 | Verify AUM recalculated | `fund_daily_aum.total_aum` decreased |
| 5.6 | Click Unvoid | Restore transaction |
| 5.7 | Verify position restored | Value returned to original |

**Backend Surfaces:**
- RPC: `void_transaction`, `unvoid_transaction`
- Tables: `transactions_v2`, `investor_positions`, `fund_daily_aum`, `fund_aum_events`, `fee_allocations`

**Frontend Surfaces:**
- `adminTransactionHistoryService.voidTransaction()`
- Void dialog component

**Contract Assumptions:**
- Void returns `success`, cascade counts
- Unvoid restores all cascade tables
- `transactions_v2.is_voided` controls display

**Expected Outcome:** Void reverses all financial effects; unvoid restores

**Failure Signals:**
- "column updated_at does not exist" → schema drift (FIXED 2026-04-14)
- Void succeeds but position unchanged → cascade failure
- Position reversed but AUM not → AUM recalculation failed

**Severity if Broken:** CRITICAL - Financial corrections broken

---

### Flow 6: Void Yield Distribution (Admin)

| Step | Action | Validation |
|------|--------|------------|
| 6.1 | Find applied yield distribution | Via yield history |
| 6.2 | Click Void Yield | Enter reason |
| 6.3 | Verify yield_distributions.is_voided = true | Query table |
| 6.4 | Verify yield transactions voided | Query transactions_v2 type=YIELD |
| 6.5 | Verify fee_allocations voided | Query fee_allocations.is_voided |
| 6.6 | Verify positions reversed | `cumulative_yield_earned` decreased |

**Backend Surfaces:**
- RPC: `void_yield_distribution`
- Tables: `yield_distributions`, `transactions_v2`, `fee_allocations`, `investor_positions`

**Frontend Surfaces:**
- `yieldManagementService.voidYieldDistribution()`
- Void yield dialog

**Contract Assumptions:**
- Returns `success`, `voided_crystals` (P0 issue: returns `voided_transactions`, not `voided_count`)

**Expected Outcome:** All yield allocations reversed

**Failure Signals:**
- Yield voided but positions unchanged → cascade failed
- "Already voided" error on second void → idempotency missing

**Severity if Broken:** HIGH - Cannot correct yield mistakes

---

### Flow 7: AUM & Position Reconciliation (Admin)

| Step | Action | Validation |
|------|--------|------------|
| 7.1 | Navigate to fund AUM | Select fund |
| 7.2 | Verify AUM = Σ positions | Manual sum check |
| 7.3 | Trigger reconciliation check | Via RPC or admin page |
| 7.4 | Verify no drift | `check_aum_reconciliation` returns valid |
| 7.5 | Add position manually | Via admin form |
| 7.6 | Verify AUM updated | Reflects new position |

**Backend Surfaces:**
- RPC: `check_aum_reconciliation`, `get_fund_aum_as_of`, `recalculate_fund_aum_for_date`
- Tables: `fund_daily_aum`, `investor_positions`

**Frontend Surfaces:**
- `aumReconciliationService`
- Fund AUM components

**Contract Assumptions:**
- `fund_daily_aum.total_aum` matches sum of positions
- Reconciliation tolerance = 0.01

**Expected Outcome:** AUM always equals position sum

**Failure Signals:**
- Drift detected → reconciliation trigger not running
- AUM stale after transactions → sync failed

**Severity if Broken:** CRITICAL - Financial integrity compromised

---

### Flow 8: Monthly Statements (Investor)

| Step | Action | Validation |
|------|--------|------------|
| 8.1 | Navigate to statements | View statement history |
| 8.2 | Select period | e.g., March 2026 |
| 8.3 | Verify statement loads | PDF or HTML rendered |
| 8.4 | Verify transaction list | All transactions in period shown |
| 8.5 | Verify yield credited | Yield transactions in period |
| 8.6 | Verify fees deducted | Fee transactions in period |

**Backend Surfaces:**
- Tables: `statement_periods`, `transactions_v2`, `yield_distributions`
- RPC: `finalize_statement_period` (if generating)

**Frontend Surfaces:**
- `statementsService`
- Statement viewer component

**Contract Assumptions:**
- `statement_periods.status` = 'finalized'
- Transaction filter by date range works

**Expected Outcome:** Complete statement with all activity

**Failure Signals:**
- Empty statement → no finalized period
- Missing transactions → date filter wrong

**Severity if Broken:** MEDIUM - Investor cannot review monthly activity

---

### Flow 9: Statement Delivery (Admin)

| Step | Action | Validation |
|------|--------|------------|
| 9.1 | Navigate to delivery admin | View delivery queue |
| 9.2 | Trigger delivery | Queue statements for delivery |
| 9.3 | Verify delivery attempted | `statement_email_delivery` populated |
| 9.4 | Check delivery status | SENT, FAILED, PENDING |

**Backend Surfaces:**
- RPC: `queue_statement_deliveries`, `dispatch_report_delivery_run`
- Tables: `statement_email_delivery`, `statement_periods`

**Frontend Surfaces:**
- `deliveryService`
- Delivery admin component

**Contract Assumptions:**
- Delivery table has status column
- Queue respects investor email preferences

**Expected Outcome:** Statements delivered to investor emails

**Failure Signals:**
- All stuck in PENDING → queue not processing
- 100% FAILED → email service down

**Severity if Broken:** MEDIUM - Regulatory requirement for statements

---

### Flow 10: Admin Repair Surfaces

| Step | Action | Validation |
|------|--------|------------|
| 10.1 | Test position recompute | Manually trigger via admin |
| 10.2 | Verify position recalculated | Check current_value matches transactions |
| 10.3 | Test AUM repair | Manually trigger recalc |
| 10.4 | Verify AUM correct | Sum positions = total_aum |
| 10.5 | Test data integrity check | Run `check_platform_data_integrity` |
| 10.6 | Verify no violations returned | Empty or handled list |

**Backend Surfaces:**
- RPC: `recompute_investor_position`, `recalculate_fund_aum_for_date`, `check_platform_data_integrity`

**Frontend Surfaces:**
- Admin system health page
- Data integrity dashboard

**Contract Assumptions:**
- Repair functions are idempotent
- Integrity check returns violation list

**Expected Outcome:** Repairs work without data corruption

**Failure Signals:**
- Position recompute creates duplicate → missing unique constraint
- Integrity check times out → too many records

**Severity if Broken:** HIGH - Cannot fix data issues

---

## B. Pass/Fail Criteria

### Must Pass (Release Blockers)

| Flow | Pass Criteria | Test Command |
|------|---------------|---------------|
| Deposit | Transaction created with correct amount, position updated, AUM synced | Query DB |
| Yield Apply | Fee allocations created, positions credited, AUM updated | Query DB |
| Void Transaction | Cascade to all tables, position reversed, AUM recalculated | Query DB |
| AUM Reconciliation | Zero drift, Σ positions = total_aum | RPC call |

### Should Pass (High Priority)

| Flow | Pass Criteria | Test Command |
|------|---------------|---------------|
| Withdrawal | Request created, cancelable, completable | UI test |
| Void Yield | All allocations reversed | Query DB |
| Investor Dashboard | All positions visible, totals correct | UI + DB |
| Statement Generation | PDF/HTML renders | UI test |

### Can Defer (Medium Priority)

| Flow | Pass Criteria | Test Command |
|------|---------------|---------------|
| Statement Delivery | Emails sent (can be mocked) | Mock test |
| Admin Repair | Functions work on small dataset | Manual test |

---

## C. Blockers to Release

### P0 - Cannot Release

1. **Void transaction fails with schema error** - FIXED 2026-04-14
2. **Yield apply creates no allocations** - Investigate before release
3. **AUM drift > 0.01** - Critical data integrity issue
4. **Investor dashboard empty for active users** - RLS or query broken

### P1 - Must Fix Before Release

1. **void_yield_distribution returns wrong field** (`voided_transactions` not `voided_count`)
2. **Yield preview/apply missing period dates in response** - Graceful fallback, can defer

---

## D. Monitoring Signals Post-Release

### Immediate (First 24 Hours)

| Signal | Source | Threshold |
|--------|--------|-----------|
| `void_transaction` error rate | RPC logs | > 0% = regression |
| `apply_yield_distribution` error rate | RPC logs | > 0% = regression |
| AUM drift detected | Integrity check | Any = regression |
| Deposit transaction count | DB query | Expected volume |

### Short-term (First Week)

| Signal | Source | Threshold |
|--------|--------|-----------|
| Statement delivery success rate | Delivery table | > 95% |
| Withdrawal completion rate | Withdrawal table | > 90% |
| Duplicate transaction detected | Transaction table | 0 |
| Position recompute frequency | Audit log | Normal baseline |

### Long-term (Ongoing)

| Signal | Source | Threshold |
|--------|--------|-----------|
| Monthly yield apply success | Yield table | 100% |
| Quarterly statement delivery | Delivery table | 100% |
| AUM drift incidents | Integrity alerts | 0 |

---

## E. Quick Test Commands

```bash
# 1. Verify void_transaction works
psql -c "SELECT void_transaction('tx-id', 'admin-id', 'test reason')"

# 2. Verify yield distribution response
psql -c "SELECT apply_segmented_yield_distribution_v5('fund-id', '2026-03-31', 1000000, 'admin-id', 'reporting')"

# 3. Verify AUM = sum(positions) for a fund
psql -c "SELECT fda.total_aum, SUM(ip.current_value) FROM fund_daily_aum fda JOIN investor_positions ip ON ip.fund_id = fda.fund_id WHERE fda.aum_date = CURRENT_DATE GROUP BY fda.total_aum"

# 4. Count active positions per investor
psql -c "SELECT investor_id, COUNT(*) FROM investor_positions WHERE is_active = true GROUP BY investor_id"

# 5. Check for duplicate transactions
psql -c "SELECT reference_id, COUNT(*) FROM transactions_v2 GROUP BY reference_id HAVING COUNT(*) > 1"
```