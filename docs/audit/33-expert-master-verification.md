# EXPERT MASTER GO-LIVE VERIFICATION PROMPT

## Release-Critical Platform Verification

---

**Purpose**: Replace shallow walkthrough with exhaustive verification covering void cascade, financial side effects, history/reporting integrity, permissions, background workflows, and platform areas easy to miss before go-live.

**Role**: Principal Engineer + Backend Architect + QA Lead + Release Manager

**Definition of Done** - Platform ready ONLY if:
1. Frontend and backend contracts match in active flows
2. Database objects required by live paths exist and behave correctly
3. All critical buttons, forms, and workflows work through the UI
4. Financial side effects are correct and visible
5. History/reporting surfaces reflect truth after mutations
6. Permissions and failure states behave safely
7. No P0/P1 blocker remains

---

## A. CORE PLATFORM ROUTES AND RENDERING

### Enumerate every screen with verification checklist

| Screen | Route | User Role | Render | Empty | Loading | Error | Controls | Backend Deps |
|--------|-------|-----------|--------|-------|---------|-------|----------|--------------|
| Login | `/login` | Public | ☐ | ☐ | ☐ | ☐ | ☐ | auth service |
| Investor Dashboard | `/investor` | Investor | ☐ | ☐ | ☐ | ☐ | ☐ | investor API |
| Portfolio | `/investor/portfolio` | Investor | ☐ | ☐ | ☐ | ☐ | ☐ | portfolio API |
| Yield History (Inv) | `/investor/yield-history` | Investor | ☐ | ☐ | ☐ | ☐ | ☐ | yields API |
| Transactions (Inv) | `/investor/transactions` | Investor | ☐ | ☐ | ☐ | ☐ | ☐ | transactions API |
| Withdrawals (Inv) | `/investor/withdrawals` | Investor | ☐ | ☐ | ☐ | ☐ | ☐ | withdrawals API |
| Statements (Inv) | `/investor/statements` | Investor | ☐ | ☐ | ☐ | ☐ | ☐ | statements API |
| Admin Dashboard | `/admin` | Admin | ☐ | ☐ | ☐ | ☐ | ☐ | admin dashboard API |
| Revenue | `/admin/revenue` | Admin | ☐ | ☐ | ☐ | ☐ | ☐ | revenue API |
| Investors | `/admin/investors` | Admin | ☐ | ☐ | ☐ | ☐ | ☐ | investors API |
| Investor Details | `/admin/investors/:id` | Admin | ☐ | ☐ | ☐ | ☐ | ☐ | investor detail API |
| Ledger | `/admin/ledger` | Admin | ☐ | ☐ | ☐ | ☐ | ☐ | transactions API |
| Yield History (Adm) | `/admin/yield-history` | Admin | ☐ | ☐ | ☐ | ☐ | ☐ | yields API |
| Reports | `/admin/reports` | Admin | ☐ | ☐ | ☐ | ☐ | ☐ | reports API |
| Operations | `/admin/operations` | Admin | ☐ | ☐ | ☐ | ☐ | ☐ | ops API |
| System | `/admin/system` | Admin | ☐ | ☐ | ☐ | ☐ | ☐ | system API |

---

## B. EVERY CRITICAL UI CONTROL AND MUTATION PATH

### Enumerate and classify all controls

| Screen | Control | Type | Must Work | Can Disable | Can Defer | Visible Broken = Blocker |
|--------|---------|------|-----------|-------------|-----------|--------------------------|
| Login | Email input | Text | ☐ | ☐ | ☐ | ☐ |
| Login | Password input | Password | ☐ | ☐ | ☐ | ☐ |
| Login | Submit button | Button | ☐ | ☐ | ☐ | ☐ |
| Investor Dashboard | Period selector | Dropdown | ☐ | ☐ | ☐ | ☐ |
| Portfolio | Sort dropdown | Dropdown | ☐ | ☐ | ☐ | ☐ |
| Portfolio | Export button | Button | ☐ | ☐ | ☐ | ☐ |
| Transactions | Filter by type | Dropdown | ☐ | ☐ | ☐ | ☐ |
| Transactions | Filter by status | Dropdown | ☐ | ☐ | ☐ | ☐ |
| Withdrawals | New withdrawal button | Button | ☐ | ☐ | ☐ | ☐ |
| New Withdrawal | Amount input | Number | ☐ | ☐ | ☐ | ☐ |
| New Withdrawal | Wallet input | Text | ☐ | ☐ | ☐ | ☐ |
| New Withdrawal | Submit button | Button | ☐ | ☐ | ☐ | ☐ |
| Admin Dashboard | Refresh button | Button | ☐ | ☐ | ☐ | ☐ |
| Investors | Search input | Text | ☐ | ☐ | ☐ | ☐ |
| Investors | Invite button | Button | ☐ | ☐ | ☐ | ☐ |
| Investor Details | Edit button | Button | ☐ | ☐ | ☐ | ☐ |
| Investor Details | Create deposit button | Button | ☐ | ☐ | ☐ | ☐ |
| Investor Details | Create withdrawal button | Button | ☐ | ☐ | ☐ | ☐ |
| Ledger | Tab switch (tx/withdrawals) | Tabs | ☐ | ☐ | ☐ | ☐ |
| Ledger | Create deposit button | Button | ☐ | ☐ | ☐ | ☐ |
| Ledger | Create withdrawal button | Button | ☐ | ☐ | ☐ | ☐ |
| Ledger | Void button | Button | ☐ | ☐ | ☐ | ☐ |
| Ledger | Unvoid button | Button | ☐ | ☐ | ☐ | ☐ |
| Ledger | Date filter | Filter | ☐ | ☐ | ☐ | ☐ |
| Ledger | Type filter | Dropdown | ☐ | ☐ | ☐ | ☐ |
| Yield History | Preview button | Button | ☐ | ☐ | ☐ | ☐ |
| Yield History | Apply button | Button | ☐ | ☐ | ☐ | ☐ |
| Yield History | Date filter | Filter | ☐ | ☐ | ☐ | ☐ |
| Reports | Generate button | Button | ☐ | ☐ | ☐ | ☐ |
| Reports | Report type selector | Dropdown | ☐ | ☐ | ☐ | ☐ |
| Reports | Date range | Filter | ☐ | ☐ | ☐ | ☐ |
| Reports | Download button | Button | ☐ | ☐ | ☐ | ☐ |

---

## C. FINANCIAL CORE FLOW VERIFICATION

### End-to-end verification matrix

| Action | Backend State | Frontend State | History/Reporting State | Blocker Severity |
|--------|---------------|----------------|-------------------------|------------------|
| Deposit create | Transaction record created | New row in ledger | Transaction history updated | P0 if broken |
| Deposit void | is_voided = true | Status shows "Voided" | Excluded from AUM | P0 if broken |
| Withdrawal create | Withdrawal request created | New row in withdrawals | Status history updated | P0 if broken |
| Withdrawal approve | Status = approved | Status updated | Included in processing | P0 if broken |
| Yield preview | Calculation ready | Modal shows amounts | N/A | P1 if broken |
| Yield apply | Yield distributed | New yield entry | Investor yield history updated | P0 if broken |
| Yield void | is_voided = true | Status updated | Excluded from totals | P0 if broken |
| Unvoid transaction | is_voided = false | Status restored | Included in AUM again | P0 if broken |
| Statement generate | Report created | Download available | Report history updated | P1 if broken |

---

## D. VOID CASCADE VERIFICATION MATRIX (MANDATORY)

### Every void cascade path must be verified

| Cascade Path | Entrypoint | Backend Chain | AUM Effect | Position Effect | History Effect | Reporting Effect | Reversible | Failure Mode | Blocker |
|--------------|------------|---------------|------------|------------------|-----------------|-------------------|------------|--------------|---------|
| Transaction void | `/admin/ledger` → void button | transaction.void() → trigger → positions.recompute() → AUM.recompute() | Decrements by voided amount | Recomputes positions | Shows "Voided" status | Excluded from reports | Yes (unvoid) | Orphan state, partial commit | P0 |
| Yield distribution void | `/admin/yield-history` → void | yield.void() → triggers investor_yields update | N/A | N/A | Shows "Voided" | Excluded from statements | Yes (unvoid) | Stale investor yield | P0 |
| Unvoid transaction | `/admin/ledger` → unvoid button | transaction.unvoid() → trigger → AUM.recompute() | Increments by restored amount | Restores positions | Status = active | Included in reports | N/A | Double restore | P0 |
| Child transaction void | If deposit has children | Parent void cascades? | Dependent on design | Dependent on design | Shows void parent only | Excluded | Depends | Orphan children | P0 |
| Position recompute after void | Trigger on void | position.recompute(investor_id) | Matches sum of positions | Exact reversal | N/A | N/A | Automatic | Stale cache | P0 |
| AUM recompute after void | Trigger on void | AUM.recompute() | Exact reversal | Derived from AUM | N/A | Derived from AUM | Automatic | Stale dashboard | P0 |

### Void cascade checks required:
- ☐ Ledger remains source of truth
- ☐ is_voided propagation is correct
- ☐ Positions reverse exactly once
- ☐ AUM reverses exactly once
- ☐ Reporting excludes voided data immediately
- ☐ Unvoid restores exact prior state
- ☐ No partial state after failed void
- ☐ No duplicate reversal from redundant triggers
- ☐ No stale dashboard/reporting after void
- ☐ Correct operator feedback after success/failure

---

## E. TRIGGER/RPC/FUNCTION CHAIN VERIFICATION

### Identify all chains for critical flows

| Flow | UI Action | Hook/Service | RPC/Function | Trigger Chain | Derived State | History Surfaces |
|------|-----------|--------------|--------------|---------------|---------------|------------------|
| Deposit create | Click "New Deposit" | useTransactionMutations | createDeposit | before_create → after_commit | investor.balance, AUM | transaction history |
| Deposit void | Click "Void" | useTransactionMutations | voidTransaction | before_void → trigger: recompute_positions → trigger: recompute_AUM | investor.balance, AUM | transaction history, reports |
| Yield apply | Click "Apply" | useYieldMutations | applyYieldDistribution | before_apply → trigger: distribute_yield → after_commit | investor.yield_balance | yield history, statements |
| Yield void | Click "Void" | useYieldMutations | voidYieldDistribution | before_void → trigger: reverse_yield | investor.yield_balance | yield history |
| Withdrawal create | Click "New Withdrawal" | useWithdrawalMutations | createWithdrawalRequest | before_create → after_commit | investor.available_balance | withdrawal history |
| Withdrawal approve | Click "Approve" | useWithdrawalMutations | approveWithdrawal | before_approve → after_commit | withdrawal.status | withdrawal history |
| Statement generate | Click "Generate" | useReportMutations | generateStatement | before_generate → async: deliver_statement | report status | statement history |
| Report generate | Click "Generate" | useReportMutations | generateReport | before_generate → async: deliver_report | report status | report history |

---

## F. REPORTING/HISTORY TRUTH VERIFICATION

### Verify no stale view or client assumptions

| Surface | Source of Truth | Post-Action Refresh | Stale Risk | Blocker Severity |
|---------|-----------------|---------------------|------------|------------------|
| Dashboard AUM | AUM view/table | After deposit/withdrawal/void | Cache invalidation | P0 if stale |
| Dashboard investor count | investors table | After create/invite | Query freshness | P1 if stale |
| Investor positions | positions table | After any transaction | Position recompute | P0 if stale |
| Transaction history | transactions table | After create/void/unvoid | is_voided filter | P0 if shows voided |
| Yield history | yields table | After apply/void | is_voided filter | P0 if shows voided |
| Withdrawal history | withdrawals table | After create/approve/reject | Status transitions | P1 if stale |
| Statements | statements table | After generate | Delivery status | P1 if stale |
| Reports | reports table | After generate | Generation status | P1 if stale |

### Truth checks required:
- ☐ Dashboard AUM reflects current database state
- ☐ Investor positions reflect current positions
- ☐ Transaction history shows correct void/non-void status
- ☐ Yield history shows correct void/non-void status
- ☐ Statements use correct current sources
- ☐ No "orphan-like" empty history after action

---

## G. FORM/INPUT VALIDATION MATRIX

| Screen/Form | Field | Validation | Expected Error | Expected Success |
|-------------|-------|------------|----------------|------------------|
| Login | Email | Required, valid format | "Invalid email format" | Redirects |
| Login | Password | Required, min length | "Invalid credentials" | Redirects |
| New Deposit | Investor | Required, valid ID | "Investor required" | Creates record |
| New Deposit | Amount | Required, positive number | "Amount must be positive" | Creates record |
| New Deposit | Type | Required, valid type | "Type required" | Creates record |
| New Withdrawal | Amount | Required, positive, <= balance | "Insufficient balance" | Creates request |
| New Withdrawal | Wallet | Required, valid format | "Invalid wallet address" | Creates request |
| Yield Apply | Fund selection | Required | "Fund required" | Applies yield |
| Yield Apply | Confirm | Required | N/A | Distributes yield |
| Void Transaction | Confirmation | Required | N/A | Voids transaction |
| Investor Invite | Email | Required, valid email | "Invalid email" | Sends invite |

---

## H. PERMISSION AND FAILURE-STATE MATRIX

| Action | Allowed Role | Denied Role | Safe Failure Behavior |
|--------|--------------|-------------|----------------------|
| Login | Public | N/A | Error message, stay on page |
| View investor data | Admin, Investor (own) | Investor (other) | Redirect or 403 |
| Create deposit | Admin | Investor | Not visible to investor |
| Create withdrawal | Admin, Investor | N/A | Visible only to role |
| Void transaction | Admin | Investor | Not visible to investor |
| Apply yield | Admin | Investor | Not visible to investor |
| Generate reports | Admin | Investor | Not visible to investor |
| Edit investor | Admin | Investor | Not visible to investor |
| View system config | Admin only | Investor | 404 or redirect |

---

## I. BACKGROUND/SIDE-EFFECT/OPS WORKFLOWS

| Workflow | Trigger | Async? | Post-Action UI Update | Failure Handling |
|----------|---------|--------|----------------------|------------------|
| Statement delivery | Generate statement | Yes | Toast "sent" | Retry queue |
| Report delivery | Generate report | Yes | Toast "sent" | Retry queue |
| Yield distribution | Apply yield | Yes | Toast "distributed" | Manual retry |
| Notifications | Transaction actions | Yes | Bell icon update | Mark read |
| Position recompute | Transaction void | Yes (trigger) | Dashboard refresh | Error log |
| AUM recompute | Any financial action | Yes (trigger) | Dashboard refresh | Error log |

---

## J. RELEASE BLOCKER TRIAGE

### Every issue must be classified

| Issue | Location | Severity | Fix Required | Safe to Defer? |
|-------|----------|----------|--------------|----------------|
| Broken deposit flow | `/admin/ledger` | P0 | Fix before go-live | NO |
| Broken withdrawal flow | `/admin/withdrawals` | P0 | Fix before go-live | NO |
| Broken yield apply | `/admin/yield-history` | P0 | Fix before go-live | NO |
| Void not updating AUM | Dashboard | P0 | Fix before go-live | NO |
| Void not excluded from reports | Reports | P0 | Fix before go-live | NO |
| Unvoid not restoring AUM | Dashboard | P0 | Fix before go-live | NO |
| Transaction history shows voided | Ledger | P0 | Fix before go-live | NO |
| Stale dashboard after action | Dashboard | P1 | Fix today if visible | NO |
| Missing success toast | Various | P1 | Fix today | YES |
| Export button not working | Various | P1 | Fix today | YES |
| Filter not working | Various | P1 | Fix today | YES |
| Minor layout issue | Various | P2 | Defer | YES |
| Secondary button styling | Various | P2 | Defer | YES |

---

## SAME-DAY EXECUTION ORDER

### Phase 1: Highest-risk manual walkthroughs (first 30 min)
1. ☐ Login flow - verify auth works
2. ☐ Dashboard - verify AUM displays
3. ☐ Ledger - verify transaction list loads
4. ☐ Void a transaction - verify AUM decrements
5. ☐ Unvoid - verify AUM restores
6. ☐ Apply yield - verify investor yield updates

### Phase 2: Highest-value Playwright additions (next 20 min)
- Add test: void cascade AUM check
- Add test: yield apply investor history check
- Add test: unvoid restores AUM
- Add test: void excluded from reports

### Phase 3: Highest-priority patch batches (next 20 min)
- Batch 1: Fix any P0 void cascade issues
- Batch 2: Fix any P0 reporting history issues
- Batch 3: Fix missing success toasts

### Phase 4: Final smoke pass (10 min)
- Run critical smoke suite
- Verify all pages load
- Verify no console errors

### Phase 5: Final go/no-go decision (5 min)
- Check P0 blockers = 0
- Check P1 blockers < 5
- Check TypeScript = clean
- Make decision

---

## GO/NO-GO CRITERIA

**GO** if ALL of:
- ☐ No P0 blockers remain
- ☐ TypeScript clean (0 errors)
- ☐ All critical pages render
- ☐ Void cascade verified (AUM, positions, history, reporting)
- ☐ Yield apply verified (investor history, reporting)
- ☐ All must-work controls functional
- ☐ Success/failure feedback works

**NO-GO** if ANY of:
- ☐ Any broken financial mutation (deposit/withdrawal/yield/void)
- ☐ Incorrect AUM after void/unvoid
- ☐ Stale history after mutations
- ☐ Voided data showing in reports
- ☐ Broken permissions on critical actions
- ☐ Visible broken critical control