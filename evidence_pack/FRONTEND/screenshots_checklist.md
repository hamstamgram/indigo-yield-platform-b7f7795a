# Screenshots Verification Checklist

Manual verification steps for visual testing of key UI states.

## Admin Routes

### 1. /admin/investors - Unified Investors Page
- [ ] List shows all investors with search bar
- [ ] Status filter dropdown is functional
- [ ] URL updates when filters change
- [ ] Clicking investor opens drawer on the right
- [ ] Add Investor button visible in header

### 2. Investor Drawer (6 tabs)
- [ ] **Overview Tab**: Summary grid shows fund balances, pending withdrawals, last activity
- [ ] **Ledger Tab**: Transaction table with type/purpose/date filters that persist in URL
- [ ] **Positions Tab**: Position table with edit/delete actions (delete has AlertDialog)
- [ ] **Withdrawals Tab**: Investor's withdrawal requests with approve/reject buttons
- [ ] **Reports Tab**: Statement list with Preview/Send buttons, shows "already generated" for duplicates
- [ ] **Settings Tab**: IB settings, fee manager, report recipients, Danger Zone at bottom

### 3. Settings > Danger Zone
- [ ] Delete Investor button is RED
- [ ] Delete is ONLY available in Settings tab, nowhere else
- [ ] Clicking Delete shows AlertDialog with typed name confirmation
- [ ] Confirmation requires exact name match

### 4. /admin/yield - Yield Operations
- [ ] Fund selector dropdown populated
- [ ] Period selector dropdown populated
- [ ] Gross Amount input accepts token amounts (no $ or USD)
- [ ] Purpose selector shows "reporting" and "transaction"
- [ ] Apply Yield button shows AlertDialog with distribution preview
- [ ] Distribution preview shows per-investor breakdown in tokens

### 5. /admin/recorded-yields - Recorded Yields
- [ ] Table shows investor_fund_performance records
- [ ] Filters: Period, Fund, Purpose (URL-persisted)
- [ ] Edit button allows inline editing
- [ ] All values displayed in token units (no USD)

### 6. /admin/withdrawals - Withdrawals Page
- [ ] Status filter dropdown (pending, approved, rejected, etc.)
- [ ] Approve button shows AlertDialog with amount confirmation
- [ ] Reject button shows AlertDialog with reason input

### 7. /admin/fees - Fees Overview
- [ ] Shows fee_allocations grouped by period/fund
- [ ] IB allocations tab shows IB commissions
- [ ] All amounts in token units

### 8. /admin/audit-logs - Audit Logs
- [ ] Table shows audit_log and data_edit_audit entries
- [ ] Filters: Action, Entity, Date Range
- [ ] Expandable rows show old/new values

## Investor Routes

### 9. /statements - Investor Statements
- [ ] Year filter dropdown
- [ ] Asset filter dropdown
- [ ] Statement cards show MTD metrics
- [ ] Download PDF button functional
- [ ] All amounts in token units (e.g., "0.5 BTC", not "$50,000")

### 10. /dashboard - Investor Dashboard
- [ ] Portfolio summary cards
- [ ] Fund balances displayed in tokens
- [ ] No USD or $ symbols anywhere
- [ ] Request Withdrawal button visible

### 11. /withdrawals/new - New Withdrawal
- [ ] Fund selector shows available funds
- [ ] Amount input accepts token amounts
- [ ] Submit shows AlertDialog confirmation
- [ ] No USD formatting

## IB Routes

### 12. /ib/dashboard - IB Dashboard
- [ ] Referrals list shows referred investors
- [ ] Commissions table shows ib_allocations
- [ ] All amounts in token units
- [ ] Period filter functional

## Cross-Cutting Checks

### No USD Verification
- [ ] No "$" symbol on any investor-facing page
- [ ] No "USD" text on any investor-facing page
- [ ] No currency formatting (e.g., "$1,234.56")
- [ ] All values use token symbols (BTC, ETH, USDC, etc.)

### Confirmation Dialogs
- [ ] All destructive actions use AlertDialog (not browser confirm())
- [ ] Dialogs have clear cancel and confirm buttons
- [ ] High-risk actions require additional confirmation (typed name)

### URL Persistence
- [ ] /admin/investors filters persist on refresh
- [ ] /admin/recorded-yields filters persist on refresh
- [ ] /admin/withdrawals filters persist on refresh
- [ ] Investor drawer tabs work with URL navigation

### Error States
- [ ] Empty state messages are helpful
- [ ] Error toasts appear for failed operations
- [ ] Loading states shown during API calls
