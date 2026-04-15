# Manual UI Walkthrough - Expert Verification

## Walkthrough Order (Pre-Go-Live)

### Section A: Page-Level UX

#### A1: Login Page (`/login`)
- [ ] Page title "Sign In" or equivalent
- [ ] Email input visible and labeled
- [ ] Password input visible with mask toggle
- [ ] "Forgot Password" link works
- [ ] Submit button disabled when fields empty
- [ ] Error messages display correctly
- [ ] Loading state during submission

#### A2: Investor Dashboard (`/investor`)
- [ ] Page title "Overview" or "Dashboard"
- [ ] AUM card displays with currency format
- [ ] Holdings section renders
- [ ] Recent activity list visible
- [ ] No broken layout/floating elements
- [ ] Empty state if no data

#### A3: Portfolio (`/investor/portfolio`)
- [ ] Holdings table renders
- [ ] Allocation chart/pie visible
- [ ] Values formatted as currency
- [ ] Click on row navigates to details

#### A4: Yield History (`/investor/yield-history`)
- [ ] Table renders with columns
- [ ] Dates formatted readably
- [ ] Amounts in currency format
- [ ] Pagination works

#### A5: Transactions (`/investor/transactions`)
- [ ] Transaction list loads
- [ ] Status badges visible
- [ ] Type indicators work
- [ ] Date filters functional

#### A6: Withdrawals (`/investor/withdrawals`)
- [ ] Withdrawal history loads
- [ ] Status column shows states
- [ ] "New Withdrawal" button visible

#### A7: Statements (`/investor/statements`)
- [ ] Statement list displays
- [ ] Download buttons work
- [ ] Empty state if none

#### A8: Admin Dashboard (`/admin`)
- [ ] AUM display visible
- [ ] Investor count visible
- [ ] Revenue metrics visible
- [ ] Quick actions accessible
- [ ] Platform status visible

#### A9: Investors (`/admin/investors`)
- [ ] Investor table renders
- [ ] Search bar works
- [ ] Status filters work
- [ ] Row click opens details
- [ ] Invite button visible

#### A10: Ledger (`/admin/ledger`)
- [ ] Transaction table renders
- [ ] Tab switch works (transactions/withdrawals)
- [ ] Create button visible
- [ ] Filters work
- [ ] Pagination works

#### A11: Yield History Admin (`/admin/yield-history`)
- [ ] Yield list loads
- [ ] Preview button visible
- [ ] Apply button visible
- [ ] Filters work

#### A12: Reports (`/admin/reports`)
- [ ] Report list loads
- [ ] Generate button visible
- [ ] Filters work

---

### Section B: Input UX

#### B1: Date Pickers
- [ ] Calendar opens on click
- [ ] Date selection works
- [ ] Clear button works
- [ ] Keyboard navigation works

#### B2: Numeric Input
- [ ] Only numbers accepted
- [ ] Decimal handling correct
- [ ] Currency symbol displays
- [ ] Thousand separators work

#### B3: Dropdowns
- [ ] Options list opens
- [ ] Selection updates value
- [ ] Search/filter works
- [ ] Clear selection works

#### B4: Forms
- [ ] Required fields marked
- [ ] Validation on blur
- [ ] Error messages clear
- [ ] Submit disabled when invalid

---

### Section C: Flow UX

#### C1: Create Deposit Flow
- [ ] "New Deposit" opens modal
- [ ] Form fields render
- [ ] Validation works
- [ ] Submit creates record
- [ ] Success toast appears
- [ ] Modal closes
- [ ] Table refreshes with new row

#### C2: Create Withdrawal Flow
- [ ] "New Withdrawal" opens form
- [ ] Amount validation works
- [ ] Wallet validation works
- [ ] Submit creates request
- [ ] Success feedback shown
- [ ] Redirect to list
- [ ] New row appears in table

#### C3: Yield Preview/Apply
- [ ] Preview button opens modal
- [ ] Preview shows expected amounts
- [ ] Apply shows confirmation
- [ ] Confirm applies distribution
- [ ] Success shown
- [ ] History updates

#### C4: Transaction Void
- [ ] Void button on row
- [ ] Confirmation dialog opens
- [ ] Confirm voids transaction
- [ ] Status updates to "Voided"
- [ ] Success toast shown

#### C5: Investor Invite
- [ ] "Invite Investor" button works
- [ ] Modal opens
- [ ] Email validation works
- [ ] Submit sends invite
- [ ] Success shown

---

### Section D: Data Integrity UX

#### D1: After Deposit (Admin)
- [ ] New row in ledger
- [ ] Amount correct
- [ ] Investor balance updated
- [ ] Dashboard AUM reflects change
- [ ] Transaction history shows it

#### D2: After Withdrawal (Investor)
- [ ] Request appears in list
- [ ] Status is "Pending"
- [ ] Amount deducted from balance
- [ ] Can view details

#### D3: After Yield Apply
- [ ] New yield entry in history
- [ ] Investor yield history updates
- [ ] Dashboard yield summary updates
- [ ] Reports reflect new yield

#### D4: After Void
- [ ] Transaction status = "Voided"
- [ ] Amount not counted in totals
- [ ] History shows voided state
- [ ] Cannot double-void

#### D5: Cross-Page Consistency
- [ ] Ledger matches dashboard totals
- [ ] Investor page matches ledger
- [ ] Yield history matches reports
- [ ] No stale data after navigation

---

## Release-Blocking Failure Signals

### Critical (P0 - No Go)
- [ ] Any financial mutation fails silently
- [ ] Dashboard totals don't match ledger
- [ ] Voided transactions still counted
- [ ] Yield not visible after apply
- [ ] Auth bypass possible
- [ ] Investor sees other investor's data

### Important (P1 - Fix Today)
- [ ] Form validation doesn't block submit
- [ ] Error messages unclear
- [ ] Success not shown after action
- [ ] Table doesn't refresh after mutation
- [ ] Filters don't work

### Cosmetic (P2 - Can Defer)
- [ ] Minor layout misalignment
- [ ] Animation timing
- [ ] Tooltip positioning
- [ ] Secondary button styling