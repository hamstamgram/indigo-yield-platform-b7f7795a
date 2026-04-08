# Indigo Yield Platform - Complete Validation Checklist

> Last Updated: February 18, 2026
> Copy this entire document into Notion. All checkboxes will become interactive.
> Check each item as you validate it on the live platform.

---

## Overall Platform Health

- [ ] Platform loads without errors
- [ ] Login page renders correctly
- [ ] Admin login works (adriel@indigo.fund)
- [ ] Investor login works (qa.investor@indigo.fund)
- [ ] Role-based routing works (admin goes to /admin, investor goes to /investor)
- [ ] Logout works from both portals
- [ ] Password reset flow works
- [ ] Admin invite flow works
- [ ] Investor invite flow works

---

# ADMIN PORTAL

---

## 1. Command Center (`/admin`)

**Page loads and displays:**
- [ ] Page title "Command Center" with version badge
- [ ] System status indicator (green "System Operational" pill)
- [ ] Alert badge with unacknowledged alert count

**Metric Strip (4 KPI cards):**
- [ ] Accounts: shows total profile count
- [ ] Positions: shows active position count
- [ ] Pending: shows pending withdrawal count
- [ ] Today: shows recent activity count

**Financial Snapshot:**
- [ ] Full-width panel showing fund AUM summary
- [ ] AUM values display correctly per fund

**Risk Analysis section (3 tabs):**
- [ ] Liquidity tab loads
- [ ] Concentration tab loads
- [ ] Platform Metrics tab loads
- [ ] "Refresh Data" button refreshes all panels

**Actions:**
- [ ] "New Transaction" button opens AddTransactionDialog modal
- [ ] Alert bell icon navigates to /admin/operations

---

## 2. INDIGO FEES (`/admin/fees`)

**Page loads and displays:**
- [ ] Page title "INDIGO FEES"
- [ ] Fee Revenue KPIs: MTD / YTD / ITD breakdown
- [ ] Fees Balance Card: current balances per asset
- [ ] Yield Earned Summary Card: yield earned by fees account
- [ ] Fee Transactions Table with entries

**Filters:**
- [ ] Date range filter (from/to) works
- [ ] Fund filter dropdown works
- [ ] Default date range is last 24 months

**Actions:**
- [ ] "Export CSV" downloads correctly
- [ ] "Export PDF" downloads correctly

---

## 3. Investors List (`/admin/investors`)

**Page loads and displays:**
- [ ] Page title "Investors" with count subtitle
- [ ] Investor table with rows
- [ ] 2-panel resizable layout

**Table columns visible:**
- [ ] Name
- [ ] Email
- [ ] Funds held
- [ ] Total AUM
- [ ] Last activity
- [ ] Pending withdrawals
- [ ] IB parent
- [ ] Join date

**Filters:**
- [ ] Search by name/email works
- [ ] Fund filter works
- [ ] Status filter (active/inactive) works
- [ ] IB filter works
- [ ] Filters persist in URL

**Actions:**
- [ ] "Recent" dropdown shows last 5 viewed investors
- [ ] Export CSV button works
- [ ] Refresh button works
- [ ] "Add Investor" button opens wizard dialog
- [ ] Columns are sortable
- [ ] Clicking a row opens detail panel on right side
- [ ] Detail panel close button works

---

## 4. Investor Detail (`/admin/investors/:id`)

**Page loads and displays:**
- [ ] Breadcrumb: Investors / {name}
- [ ] Investor name and status badge
- [ ] Investor email
- [ ] Last activity date
- [ ] Pending withdrawals badge
- [ ] IB parent badge
- [ ] Fee schedule badge (custom/default)

**Tab 1 - Overview:**
- [ ] Fund positions summary cards display
- [ ] KPI chips display
- [ ] "Add Transaction" button works

**Tab 2 - Transactions:**
- [ ] Full ledger table loads
- [ ] Filters work
- [ ] Void action per row works
- [ ] Restore action per row works

**Tab 3 - Positions:**
- [ ] All active fund positions display
- [ ] Balance amounts are correct

**Tab 4 - Withdrawals:**
- [ ] Withdrawal history displays
- [ ] Pending badge count is correct

**Tab 5 - Reports:**
- [ ] Generated monthly statements display

**Tab 6 - Settings:**
- [ ] Profile fields are editable
- [ ] Fee schedule section displays
- [ ] IB schedule section displays
- [ ] Delete investor button visible (super admin only)

**Actions:**
- [ ] Back button works (preserves filter params)
- [ ] Copy link button works
- [ ] Refresh button works
- [ ] Tab navigation persists in URL (?tab=)

---

## 5. Transaction History (`/admin/transactions`)

**Page loads and displays:**
- [ ] Page title "Transaction History"
- [ ] Transaction table with entries
- [ ] Transaction count displayed
- [ ] Pagination works (50 per page)

**Table columns:**
- [ ] Checkbox (for bulk selection)
- [ ] Date + time
- [ ] Investor name + email (clickable link)
- [ ] Fund with crypto icon
- [ ] Type badge (color-coded)
- [ ] Amount (colored positive/negative) with asset icon
- [ ] Notes
- [ ] Actions dropdown

**Voided transactions:**
- [ ] VOIDED badge displays
- [ ] Row is dimmed with strikethrough amount
- [ ] Admin-only visibility badge (lock icon) shows

**Filters:**
- [ ] Quick date filters: This Month, Last Month, YTD, Clear All
- [ ] Show voided checkbox works
- [ ] Search by investor name/email works
- [ ] Fund filter dropdown works
- [ ] Type filter dropdown works
- [ ] DateTime from/to pickers work

**Actions:**
- [ ] "Add Transaction" button opens dialog
- [ ] Per-row: Void action works
- [ ] Per-row: Restore (Unvoid) action works
- [ ] Bulk void works (super admin only)
- [ ] Bulk unvoid works (super admin only)
- [ ] CSV export works

---

## 6. Manual Transaction / New Transaction (`/admin/transactions/new`)

**Page loads and displays:**
- [ ] Page title "Manual Transaction"
- [ ] Form card renders

**Form fields:**
- [ ] Investor select dropdown populates with investors
- [ ] Fund select dropdown populates with funds
- [ ] Type select (First Investment / Deposit / Withdrawal)
- [ ] Amount decimal input accepts values
- [ ] Transaction date calendar picker works
- [ ] Description/Notes textarea works

**Validation:**
- [ ] Balance indicator shows current investor balance for selected fund
- [ ] Type auto-corrects from First Investment to Deposit if position exists
- [ ] Cannot submit without required fields

**Actions:**
- [ ] "Create Transaction" button submits successfully
- [ ] Success message appears
- [ ] Form resets after success
- [ ] Investor balance updates after deposit
- [ ] Investor balance updates after withdrawal

---

## 7. Withdrawal Management (`/admin/withdrawals`)

**Page loads and displays:**
- [ ] Page title "Withdrawal Management"
- [ ] 3 KPI cards: Pending, Completed, Rejected

**Table columns:**
- [ ] Investor name
- [ ] Email
- [ ] Amount
- [ ] Asset
- [ ] Type
- [ ] Status badge
- [ ] Request Date
- [ ] Notes
- [ ] Actions

**Filters:**
- [ ] Fund filter dropdown works
- [ ] Status filter works (all/pending/approved/processing/completed/rejected/cancelled)

**Actions:**
- [ ] "Create Withdrawal" button works
- [ ] View Details drawer opens
- [ ] Approve action works (with confirmation dialog)
- [ ] Reject action works (with reason input)
- [ ] Edit action works
- [ ] Delete action works (with confirmation)
- [ ] Route to INDIGO FEES action works
- [ ] CSV export works

---

## 8. Yield Operations (`/admin/yield`)

**Page loads and displays:**
- [ ] Page title "Yield Operations" with "Live Systems" badge
- [ ] 2 KPI cards: Active Funds count, Total Positions count
- [ ] Fund Portfolio grid with fund cards

**Per fund card:**
- [ ] Fund name, code, asset display correctly
- [ ] Status badge (active/inactive)
- [ ] Total AUM displays
- [ ] Investor count displays
- [ ] Warning shows if no baseline AUM
- [ ] "Record Yield" button disabled if no investors
- [ ] "Open Period" button shows if no AUM records

**Yield Dialog (opened via "Record Yield"):**
- [ ] New AUM input field works
- [ ] Purpose selector (transaction/reporting) works
- [ ] AUM date picker works
- [ ] Reporting month selector works (when purpose is reporting)
- [ ] AUM reconciliation warning displays when applicable

**Yield Preview:**
- [ ] Per-investor breakdown table displays
- [ ] Columns: investor, gross, fee%, fee, IB%, IB, net
- [ ] System accounts toggle works
- [ ] "Changed only" filter works
- [ ] Investor search works
- [ ] Totals row is correct

**Yield Confirm:**
- [ ] Must type "APPLY YIELD" to confirm
- [ ] Discrepancy acknowledgment checkbox appears when needed
- [ ] Apply succeeds and creates distribution

---

## 9. Yield Distributions (`/admin/yield-distributions`)

**Page loads and displays:**
- [ ] Page title "Yield Distributions"
- [ ] Accordion structure: Year > Month > Fund > Distribution
- [ ] Distribution count displayed

**Per distribution card:**
- [ ] Period date displays
- [ ] Purpose badge (Reporting/Transaction) with correct color
- [ ] Crystallization type badge (if applicable)
- [ ] Voided badge (if voided)
- [ ] Gross, Fees, IB, Net amounts display
- [ ] Recorded AUM displays
- [ ] Investor count displays
- [ ] Engine version displays
- [ ] Per-investor breakdown table: Share%, Gross, Fee%, Fee, IB%, IB, Net
- [ ] Reconciliation check (green) or warning (amber) per distribution

**Filters:**
- [ ] Fund filter works
- [ ] Month filter works (24 months)
- [ ] Purpose filter works
- [ ] Show voided checkbox works

**Actions:**
- [ ] "Route to INDIGO FEES" button works per distribution
- [ ] "Void" button opens VoidDistributionDialog
- [ ] Void confirmation dialog shows fund/amount/date details
- [ ] CSV export works
- [ ] Refresh button works

---

## 10. Recorded Yields (`/admin/recorded-yields`)

**Page loads and displays:**
- [ ] Page title "Recorded Yields"
- [ ] Yields table with entries

**Filters:**
- [ ] Fund filter works
- [ ] Purpose filter (all/transaction/reporting) works
- [ ] Date from/to filters work

**Actions:**
- [ ] Edit AUM opens EditYieldDialog
- [ ] Void yield opens VoidYieldDialog with reason input
- [ ] Void confirmation works

---

## 11. Fund Management (`/admin/funds`)

**Page loads and displays:**
- [ ] Page title "Fund Management" with active count badge
- [ ] Fund grid/list with fund cards

**Per fund card:**
- [ ] Fund name and code display
- [ ] Asset displays with icon
- [ ] Status badge (Active/Inactive/Suspended/Archived)
- [ ] Total AUM displays
- [ ] Investor count displays

**Actions:**
- [ ] Grid/list view toggle works
- [ ] "New Fund" button opens CreateFundDialog
- [ ] CreateFundDialog fields: name, code, asset, fee_bps, inception date
- [ ] "Edit Details" per fund opens EditFundDialog
- [ ] "Archive" per active fund works (blocked if investors present)
- [ ] "Restore" per deprecated fund works (blocked if another active fund for same asset)

---

## 12. Reports / Statement Manager (`/admin/investor-reports`)

**Page loads and displays:**
- [ ] Page title "Statement Manager"
- [ ] 3 KPI cards: Generated (with sent/pending breakdown), Missing, Total Investors
- [ ] Reports table with investor rows

**Table columns:**
- [ ] Investor name (link to profile)
- [ ] Email
- [ ] Assets (crypto icons)
- [ ] Status badge (Generated/Sent/Missing/Failed + sent timestamp)

**Filters:**
- [ ] Year selector works
- [ ] Month selector works
- [ ] Search by investor name/email works
- [ ] Status filter works (all/generated/sent/missing/failed)

**Actions:**
- [ ] "Generate Missing" button generates reports for missing investors
- [ ] "Regenerate All" button clears and regenerates all for month
- [ ] "Send All Generated" button batch-sends reports
- [ ] Per-row: Preview opens iframe dialog
- [ ] Per-row: Send sends individual report email
- [ ] Per-row: Regenerate regenerates individual report
- [ ] Per-row: Delete with confirmation
- [ ] Per-row: Retry for failed sends
- [ ] Refresh button works

---

## 13. IB Management (`/admin/ib-management`)

**Page loads and displays:**
- [ ] Page title "IB Management"
- [ ] 3 KPI cards: Total IBs, Total Referrals, Total IB Earnings (per-asset)
- [ ] IB table with broker rows

**Table columns:**
- [ ] Name
- [ ] Email
- [ ] Referrals count badge
- [ ] Funds (crypto icons for active assets)
- [ ] Earnings (per-asset amounts)
- [ ] Created date

**Actions:**
- [ ] "Add IB" button opens Create IB Dialog
- [ ] Dialog fields: email (required), first/last name (optional)
- [ ] Sortable columns work
- [ ] Row click navigates to investor detail page

---

## 14. Operations (`/admin/operations`)

**Tab 1 - Health:**
- [ ] Overall system status card displays (Operational/Degraded/Down)
- [ ] Last checked time displays
- [ ] Report Delivery Queue card: Queued, Sending, Stuck, Failed counts
- [ ] Service grid: Database, Authentication, File Storage, Email Service
- [ ] Each service shows: status badge, uptime %, response time
- [ ] Refresh button works

**Tab 2 - Integrity:**
- [ ] Pass/fail summary badge displays
- [ ] "Run Full Check" button works
- [ ] Results: Total Checks, Passed, Failed, Run At
- [ ] Checks grouped by category: Core / IB / Temporal / Security
- [ ] Per-check card: pass/fail icon, name, violation count
- [ ] Expandable violations table per check
- [ ] Integrity Run History table displays
- [ ] Active Alerts list displays (if any)
- [ ] Acknowledge alert button works

**Tab 3 - Crystallization:**
- [ ] Gaps badge displays (0 = green, >0 = amber)
- [ ] 4 KPI cards: Total Funds, Total Positions, Crystallized, Gaps
- [ ] Fund Crystallization Status table displays
- [ ] Per-fund: Fund name, Positions, Crystallized, Gaps, Staleness
- [ ] Per-fund: Preview and Execute batch crystallization buttons
- [ ] Crystallization Gaps table displays
- [ ] Gap entries: investor, fund, last crystal date, days behind, value
- [ ] Fund filter for gaps table works
- [ ] Batch Crystallize confirmation dialog works

---

## 15. Audit Trail (`/admin/audit-logs`)

**Page loads and displays:**
- [ ] Page title "Audit Log"
- [ ] 4 KPI cards: Total Events, Entity Types, Action Types, Top Actor

**Table columns:**
- [ ] Timestamp
- [ ] Actor (name + email)
- [ ] Action badge (CREATE/green, UPDATE/secondary, DELETE/red)
- [ ] Entity (monospace badge)
- [ ] Entity ID (truncated)
- [ ] Details expand button

**Expandable row:**
- [ ] Shows diff of old_values vs new_values
- [ ] Shows metadata JSON
- [ ] Shows full entity ID

**Filters:**
- [ ] Entity type dropdown works
- [ ] Action type dropdown works
- [ ] Start date picker works
- [ ] End date picker works

**Actions:**
- [ ] "Export CSV" button downloads correctly
- [ ] Pagination works (Previous/Next)
- [ ] Columns are sortable

---

## 16. Settings (`/admin/settings`)

**Tab 1 - General:**
- [ ] Platform Name input displays
- [ ] Maintenance Mode toggle works
- [ ] Allow New Registrations toggle works
- [ ] "Save Changes" button works

**Tab 2 - Notifications:**
- [ ] System Notification Email input displays
- [ ] Support Email input displays

**Tab 3 - Limits:**
- [ ] Minimum Deposit (per asset) input displays

**Tab 4 - Admins (super admin only):**
- [ ] Admin table displays with active admins + pending invites
- [ ] Columns: Email, Name, Role, Status, Actions
- [ ] Role dropdown works (Admin / Super Admin)
- [ ] "Invite Admin" button opens dialog
- [ ] Per-invite: Copy link works
- [ ] Per-invite: Send email works
- [ ] Per-invite: Revoke works

**Tab 5 - Account:**
- [ ] Profile fields display (first name, last name, phone, avatar)
- [ ] Security tab (password change) works

---

# INVESTOR PORTAL

---

## 1. Overview / Dashboard (`/investor`)

**Page loads and displays:**
- [ ] Welcome greeting with investor name
- [ ] "Statements" button navigates to /investor/statements
- [ ] "Transaction History" button navigates to /investor/transactions

**Per-asset cards (grid):**
- [ ] Asset icon + symbol + fund name
- [ ] Total Balance (ending balance) -- amount is correct
- [ ] ITD Return % (colored green/red/neutral)
- [ ] ITD Earned amount
- [ ] Cards are clickable (navigate to portfolio)

**Latest Statement panel:**
- [ ] Period name displays
- [ ] Per-fund ending balance displays
- [ ] "View Statements" button works

**Quick Stats:**
- [ ] Pending withdrawal count displays (or "All Clear")

**Recent Activity (up to 5 items):**
- [ ] Transaction type icon displays
- [ ] Type label displays
- [ ] Date/time displays
- [ ] Signed amount displays
- [ ] Asset icon + symbol displays
- [ ] "View All History" button navigates to transactions

**Known issues to verify:**
- [ ] ITD Return shows actual percentage (not 0.00%)
- [ ] ITD Earned shows actual amount (not 0.00)

---

## 2. Portfolio (`/investor/portfolio`)

**Page loads and displays:**
- [ ] Page header "Portfolio"
- [ ] "Export CSV" button

**Table "All Positions":**
- [ ] Asset count badge displays
- [ ] Period date badge displays

**Table columns (one row per fund position):**
- [ ] Asset (icon + full name + ticker)
- [ ] Token Amount (balance formatted per asset decimals)
- [ ] MTD Change (signed, colored)
- [ ] ITD Earned (signed, colored)
- [ ] ITD Return % (signed percentage)
- [ ] Last Updated date

**Actions:**
- [ ] Each column is sortable
- [ ] Export CSV downloads `portfolio-YYYY-MM-DD.csv`

**Known issues to verify:**
- [ ] MTD Change shows actual values (not 0.00)

---

## 3. Portfolio Analytics (`/investor/portfolio/analytics`)

**Page loads and displays:**
- [ ] Page header "Portfolio Performance"
- [ ] One card per asset

**Per asset card:**
- [ ] Monthly rows table
- [ ] Month column
- [ ] Opening Balance column
- [ ] Additions column
- [ ] Withdrawals column
- [ ] Yield Earned column
- [ ] Rate of Return (Modified Dietz) column
- [ ] Closing Balance column

---

## 4. Performance (`/investor/performance`)

**Page loads and displays:**
- [ ] Page header "Performance"
- [ ] Statement period dropdown
- [ ] Period selector buttons: MTD / QTD / YTD / ITD

**Performance cards (one per asset):**
- [ ] Asset icon + full name + ticker
- [ ] Rate of return (colored with trend icon)
- [ ] Beginning Balance
- [ ] Ending Balance
- [ ] Additions
- [ ] Redemptions
- [ ] Net Income

**Actions:**
- [ ] Switch period selector (MTD/QTD/YTD/ITD) updates all cards
- [ ] Select specific statement period from dropdown works

**Known issues to verify:**
- [ ] Rate of return shows actual percentage (not 0.00%)
- [ ] Net Income shows actual amount (not 0.00)
- [ ] Beginning Balance shows actual amount

---

## 5. Yield History (`/investor/yield-history`)

**Page loads and displays:**
- [ ] Page header "Yield History"

**Summary stat cards:**
- [ ] "Total Yield Earned" with per-fund totals and crypto icons
- [ ] "Yield Events" count

**Filters:**
- [ ] Year filter dropdown works (All Years + individual years)
- [ ] Fund filter dropdown works (All Funds + individual funds)

**Monthly sections:**
- [ ] Sections sorted most-recent-first
- [ ] Each section: month label, event count badge, per-fund net totals
- [ ] Sections are collapsible/expandable

**Per-fund group within month:**
- [ ] Fund name and asset badge display
- [ ] Net total for fund displays

**Table per fund:**
- [ ] Date column
- [ ] Period column (start - end)
- [ ] Balance column
- [ ] Yield % column
- [ ] Yield Earned column (colored green/red)

**Known issues to verify:**
- [ ] Totals do not mix currencies (BTC + USDT should not be summed together)
- [ ] Yield amounts match actual distribution records

---

## 6. Transactions (`/investor/transactions`)

**Page loads and displays:**
- [ ] Page header "Transactions" with animated live indicator dot
- [ ] "Export CSV" button

**Filters:**
- [ ] Search input works (search by ID, amount)
- [ ] Asset filter dropdown works
- [ ] Type filter dropdown works (All Types / Deposit / Withdrawal / Yield)

**Table columns:**
- [ ] Type (colored badge: green for income types, red for withdrawal)
- [ ] Date (formatted as MMM d, yyyy)
- [ ] Asset (icon + ticker)
- [ ] Amount (signed, green for positive, red for negative)
- [ ] Status (glowing dot: amber for pending, green for completed)

**Actions:**
- [ ] Each column is sortable (Type, Date, Amount)
- [ ] Export CSV downloads `transactions-YYYY-MM-DD.csv`

**Data verification:**
- [ ] All deposits appear
- [ ] All withdrawals appear
- [ ] Yield earnings appear (net amounts)
- [ ] Only "investor visible" transactions show (no admin-only entries)

---

## 7. Withdrawals - History (`/withdrawals`)

**Page loads and displays:**
- [ ] "Withdrawal Requests" heading
- [ ] "Request Withdrawal" button
- [ ] Search input

**Withdrawal request cards:**
- [ ] Fund crypto icon + fund name
- [ ] Status badge (color-coded per status)
- [ ] Requested amount
- [ ] Request date

**Empty state (if no withdrawals):**
- [ ] Icon + message + "Request Withdrawal" button

---

## 8. Withdrawals - New Request (`/withdrawals/new`)

**Page loads and displays:**
- [ ] "Back to History" navigation link
- [ ] Withdrawal request form card

**Form fields:**
- [ ] Asset selector dropdown (shows available positions with balances)
- [ ] Available balance info alert shows current balance
- [ ] Amount number input
- [ ] Notes textarea (optional)
- [ ] Process warning alert ("reviewed within 24-48 hours")
- [ ] Cancel button
- [ ] Submit Request button

**Validation:**
- [ ] Error shows if amount exceeds available balance
- [ ] Warning shows for full withdrawal (>99% of balance)
- [ ] Cannot submit negative amount
- [ ] Cannot submit without selecting asset

**Empty state (no positions):**
- [ ] "You don't have any active positions" message
- [ ] "Go to Dashboard" link

---

## 9. Statements (`/investor/statements`)

**Page loads and displays:**
- [ ] Page header "Monthly Statements"
- [ ] "About Monthly Statements" info panel

**Filters:**
- [ ] Year dropdown works
- [ ] Asset dropdown works

**Statement cards (one per statement):**
- [ ] Month name + year + fund name with crypto icon
- [ ] "Download PDF" button
- [ ] Beginning Balance
- [ ] Additions
- [ ] Net Income
- [ ] Ending Balance
- [ ] Rate of Return MTD % (if present)

**Actions:**
- [ ] Download PDF triggers browser download
- [ ] PDF content is correct

**Empty state:**
- [ ] Info message about when statements are generated

---

## 10. Documents (`/investor/documents`)

**Page loads and displays:**
- [ ] Page header "Documents"
- [ ] Documents table (or empty state)

**Table columns:**
- [ ] Document (file icon + title + optional date range)
- [ ] Type badge (Statement / Tax Document / Agreement / Report / Other)
- [ ] Date
- [ ] Actions ("Download" button)

**Actions:**
- [ ] Sort by type works
- [ ] Sort by date works
- [ ] Download button triggers file download

---

## 11. Settings (`/investor/settings`)

**Page loads and displays:**
- [ ] Page header "Settings"

**Tab 1 - Profile:**
- [ ] Investor profile data displays
- [ ] Profile fields are editable
- [ ] Save profile works

**Tab 2 - Security:**
- [ ] Password change form displays
- [ ] Password change works

**Tab 3 - Appearance:**
- [ ] "Reduce Animations" toggle works
- [ ] "Hide Portfolio Values" toggle works
- [ ] "Save Preferences" button works

---

## 12. Fund Details (`/funds/:assetId`)

(Accessed by clicking fund links, not in sidebar)

**Page loads and displays:**
- [ ] Large header with fund crypto icon and fund name
- [ ] "Active Strategy" badge

**3 KPI cards:**
- [ ] Current Balance (correct amount)
- [ ] ITD Return %
- [ ] Last Period Return % with period name

**Performance history:**
- [ ] Performance report table displays
- [ ] Historical records are correct

---

# FINANCIAL ENGINE VALIDATION

---

## Deposits

- [ ] Admin records a deposit: investor balance increases by exact amount
- [ ] Earnings protection fires before deposit (uncredited yield is distributed first)
- [ ] Transaction appears in admin transaction history
- [ ] Transaction appears in investor transaction history
- [ ] Fund AUM increases by deposit amount
- [ ] Audit log entry created
- [ ] Double-click protection prevents duplicate deposits
- [ ] Cannot deposit negative amount
- [ ] Cannot deposit to inactive fund

## Withdrawals

- [ ] Investor submits withdrawal request: appears as "Pending"
- [ ] Admin can approve withdrawal
- [ ] Admin can reject withdrawal with reason
- [ ] Admin can cancel withdrawal
- [ ] After approval: investor balance decreases correctly
- [ ] After rejection: investor balance unchanged
- [ ] After cancellation: investor balance unchanged
- [ ] Status progression: Pending > Approved > Processing > Completed
- [ ] Investor sees rejection reason
- [ ] Audit trail created for all actions

## Yield Distribution

- [ ] Admin enters yield percentage per fund
- [ ] Preview shows per-investor breakdown before applying
- [ ] Preview matches actual applied amounts
- [ ] Positive yield: investors receive correct net amount
- [ ] Positive yield: platform fee calculated correctly
- [ ] Positive yield: broker commissions calculated correctly
- [ ] Negative yield: all accounts lose proportionally
- [ ] Negative yield: no fees charged
- [ ] Negative yield: no broker commissions
- [ ] Zero yield: recorded as flat month, no balance changes
- [ ] ADB weighting: mid-period depositors get proportionally less
- [ ] Conservation check: gross = net + fees + commissions + dust
- [ ] All balances update correctly after distribution
- [ ] Void distribution: all related records reversed
- [ ] After void: investor balances return to exact pre-distribution amounts
- [ ] Compound yield: all wallet types compound over multiple months

## Fees and Commissions

- [ ] Default fund fee rate applies when no override exists
- [ ] Per-investor fee override takes priority
- [ ] Date-based fee schedule applies correctly
- [ ] Broker commission calculated from net yield
- [ ] No fees on negative yield
- [ ] No broker commissions on negative yield
- [ ] All fee transactions have audit trail
- [ ] Platform fees flow to INDIGO fees account

## Integrity Checks

- [ ] All 16 checks pass (run from /admin/operations > Integrity tab)
- [ ] Balance-ledger reconciliation: zero drift
- [ ] Yield conservation: gross = net + fees + commissions + dust
- [ ] Fund AUM matches sum of investor positions
- [ ] No orphaned records
- [ ] No duplicate allocations

---

# SECURITY VALIDATION

---

- [ ] Investor can only see their own data (try accessing another investor's data)
- [ ] Investor cannot access admin pages (redirected away)
- [ ] Admin can access admin portal
- [ ] Super admin has additional privileges (admin invite, delete investor)
- [ ] Broker redirected to investor portal
- [ ] Audit log is immutable (cannot edit or delete entries)
- [ ] Protected tables cannot be modified directly

---

# CROSS-PORTAL WORKFLOWS

---

## Deposit Workflow (Admin > Investor)
- [ ] Admin records deposit for investor
- [ ] Investor sees deposit in their transaction history
- [ ] Investor sees updated balance on dashboard
- [ ] Investor sees updated balance in portfolio

## Withdrawal Workflow (Investor > Admin > Investor)
- [ ] Investor submits withdrawal request
- [ ] Admin sees pending request in withdrawal management
- [ ] Admin approves request
- [ ] Investor sees updated status
- [ ] Investor sees updated balance

## Yield Workflow (Admin > Investor)
- [ ] Admin records yield for fund
- [ ] Admin previews distribution
- [ ] Admin applies distribution
- [ ] Investor sees yield in yield history
- [ ] Investor sees updated balance on dashboard
- [ ] Investor sees yield transaction in transaction history

---

# EDGE FUNCTIONS & BACKGROUND SERVICES

---

- [ ] `grand-simulation`: Q4 stress test runs successfully (admin-only)
- [ ] `monthly-report-scheduler`: Cron job configured
- [ ] `generate-fund-performance`: Performance data generated
- [ ] `generate-monthly-statements`: Statement generation works
- [ ] `integrity-monitor`: Integrity monitoring active
- [ ] `send-email`: Email sending works
- [ ] `excel_export`: Excel export works
- [ ] `process-withdrawal`: Withdrawal processing works
- [ ] `status`: Health check endpoint returns OK

---

# PAGE INVENTORY SUMMARY

## Admin Portal Pages (16 active + redirects)

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Command Center | `/admin` | |
| 2 | INDIGO FEES | `/admin/fees` | |
| 3 | Investors (List) | `/admin/investors` | |
| 4 | Investor Detail | `/admin/investors/:id` | |
| 5 | Transaction History | `/admin/transactions` | |
| 6 | Manual Transaction | `/admin/transactions/new` | |
| 7 | Withdrawal Management | `/admin/withdrawals` | |
| 8 | Yield Operations | `/admin/yield` | |
| 9 | Yield Distributions | `/admin/yield-distributions` | |
| 10 | Recorded Yields | `/admin/recorded-yields` | |
| 11 | Fund Management | `/admin/funds` | |
| 12 | Reports / Statements | `/admin/investor-reports` | |
| 13 | IB Management | `/admin/ib-management` | |
| 14 | Operations | `/admin/operations` | |
| 15 | Audit Trail | `/admin/audit-logs` | |
| 16 | Settings | `/admin/settings` | |

## Investor Portal Pages (12 active)

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Overview / Dashboard | `/investor` | |
| 2 | Portfolio | `/investor/portfolio` | |
| 3 | Portfolio Analytics | `/investor/portfolio/analytics` | |
| 4 | Performance | `/investor/performance` | |
| 5 | Yield History | `/investor/yield-history` | |
| 6 | Transactions | `/investor/transactions` | |
| 7 | Withdrawal History | `/withdrawals` | |
| 8 | New Withdrawal | `/withdrawals/new` | |
| 9 | Statements | `/investor/statements` | |
| 10 | Documents | `/investor/documents` | |
| 11 | Settings | `/investor/settings` | |
| 12 | Fund Details | `/funds/:assetId` | |

## Public Pages

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Login | `/login` | |
| 2 | Forgot Password | `/forgot-password` | |
| 3 | Reset Password | `/reset-password` | |
| 4 | Admin Invite | `/admin-invite` | |
| 5 | Investor Invite | `/investor-invite` | |
| 6 | Health Check | `/health` | |
| 7 | Status | `/status` | |
| 8 | Terms | `/terms` | |
| 9 | Privacy | `/privacy` | |
