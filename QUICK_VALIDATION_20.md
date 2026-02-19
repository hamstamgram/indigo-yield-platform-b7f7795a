# Indigo Platform - 20 Critical Flow Checks

> Copy into Notion. All checkboxes become interactive.
> These 20 checks cover the core money flows end-to-end.
> Estimated time: 30-45 minutes.

---

## CHECK 1: Admin Login and Dashboard

Log in as admin (adriel@indigo.fund / TestAdmin2026!)

- [ ] Login page loads, "Access Portal" button works
- [ ] Admin dashboard ("Command Center") loads
- [ ] Metric strip shows: Accounts count, Positions count, Pending withdrawals, Today activity
- [ ] Financial Snapshot shows fund AUM values
- [ ] No error banners or blank sections

---

## CHECK 2: Record a Deposit (Full Flow)

Go to Transactions > New Transaction (or /admin/transactions/new)

- [ ] Investor dropdown loads with investor names
- [ ] Fund dropdown loads with active funds
- [ ] Select an investor, select a fund, enter an amount, pick today's date
- [ ] Click "Create Transaction" -- success message appears
- [ ] Go to /admin/transactions -- the deposit appears in the list with correct amount and date

---

## CHECK 3: Verify Deposit Hits Investor Portal

Log in as the investor who received the deposit (or use qa.investor@indigo.fund)

- [ ] Investor dashboard shows the correct updated balance for that fund
- [ ] Recent Activity section shows the deposit with correct amount
- [ ] Portfolio page (/investor/portfolio) shows the updated token amount
- [ ] Transactions page (/investor/transactions) lists the deposit

---

## CHECK 4: Submit a Withdrawal Request (Investor Side)

As the investor, go to Withdrawals > Request Withdrawal (/withdrawals/new)

- [ ] Asset selector shows available positions with current balances
- [ ] Enter a withdrawal amount less than the balance
- [ ] Click "Submit Request" -- success message appears
- [ ] Withdrawal history page (/withdrawals) shows the request as "Pending"

---

## CHECK 5: Approve Withdrawal (Admin Side)

Log back in as admin. Go to Withdrawal Management (/admin/withdrawals)

- [ ] The pending request appears in the table with correct investor, amount, and fund
- [ ] Click "Approve" -- confirmation dialog appears
- [ ] Confirm the approval -- status changes to "Approved" or "Completed"
- [ ] The investor's balance has decreased by the withdrawal amount (check /admin/investors/:id)

---

## CHECK 6: Investor Sees Withdrawal Result

Log back in as the investor

- [ ] Dashboard balance reflects the withdrawal (lower than before)
- [ ] Withdrawal history shows status updated to "Approved" or "Completed"
- [ ] Transactions page shows the withdrawal entry

---

## CHECK 7: Record Yield (Preview)

Log in as admin. Go to Yield Operations (/admin/yield)

- [ ] Fund cards display with AUM and investor count
- [ ] Click "Record Yield" on a fund with investors
- [ ] Enter a new AUM value higher than current (simulates positive yield)
- [ ] Select purpose (Reporting for month-end)
- [ ] Click "Preview" -- per-investor breakdown table appears
- [ ] Table shows: Investor name, Gross, Fee%, Fee amount, IB%, IB amount, Net amount
- [ ] Totals row at bottom adds up correctly

---

## CHECK 8: Apply Yield Distribution

Continuing from the preview:

- [ ] Click "Apply" -- confirmation dialog appears asking to type "APPLY YIELD"
- [ ] Type confirmation text and confirm
- [ ] Success message appears
- [ ] Go to Yield Distributions (/admin/yield-distributions) -- the new distribution appears
- [ ] Distribution shows correct gross, fees, IB, net amounts
- [ ] Per-investor breakdown matches the preview

---

## CHECK 9: Investor Sees Yield

Log in as an investor who received yield

- [ ] Dashboard balance has increased by the net yield amount
- [ ] Yield History page (/investor/yield-history) shows the new yield event
- [ ] Yield event shows: date, period, balance, yield %, yield earned
- [ ] Yield amounts are shown with correct sign (+ for positive)
- [ ] Cumulative "Total Yield Earned" card shows per-fund totals (not cross-currency mixed)
- [ ] Transactions page shows the YIELD transaction

---

## CHECK 10: Void a Yield Distribution

Log in as admin. Go to Yield Distributions (/admin/yield-distributions)

- [ ] Find a distribution and click "Void"
- [ ] Void dialog appears with distribution details
- [ ] Confirm void -- distribution marked as "Voided"
- [ ] Investor balances revert to pre-distribution amounts
- [ ] The voided distribution appears dimmed/strikethrough with "Voided" badge

---

## CHECK 11: Void a Transaction

Go to Transaction History (/admin/transactions)

- [ ] Find a transaction and click "Void" from the actions dropdown
- [ ] Confirm void
- [ ] Transaction shows "VOIDED" badge with dimmed/strikethrough styling
- [ ] Investor balance reverts (check investor detail page)

---

## CHECK 12: INDIGO Fees Account

Go to INDIGO FEES (/admin/fees)

- [ ] Page loads with fee revenue KPIs (MTD/YTD/ITD)
- [ ] Fees balance card shows current balances per asset
- [ ] Yield Earned summary shows how much the fees account has earned
- [ ] Fee transactions table shows entries from yield distributions
- [ ] Amounts look reasonable (approximately 30% of gross yield per distribution)

---

## CHECK 13: Fund Management

Go to Fund Management (/admin/funds)

- [ ] All funds display with name, asset, status, AUM, investor count
- [ ] At least one fund shows "Active" status
- [ ] AUM values match what you see in Yield Operations

---

## CHECK 14: Integrity Checks (System Health)

Go to Operations (/admin/operations) > Integrity tab

- [ ] Click "Run Full Check"
- [ ] Loading spinner appears ("Running 16 invariant checks...")
- [ ] Results appear: Total Checks = 16
- [ ] All 16 checks pass (green checkmarks)
- [ ] No critical violations

---

## CHECK 15: Audit Trail

Go to Audit Trail (/admin/audit-logs)

- [ ] Audit entries display with timestamps, actors, actions, entities
- [ ] Recent actions from this session appear (deposits, withdrawals, yields)
- [ ] Expanding a row shows the old/new values diff
- [ ] "Export CSV" button downloads a file

---

## CHECK 16: Investor Portfolio and Performance

Log in as an investor with positions

- [ ] Portfolio page (/investor/portfolio) shows all fund positions
- [ ] Token amounts display with 3 decimal places (e.g., 1.234 BTC)
- [ ] Portfolio Analytics (/investor/portfolio/analytics) shows monthly performance table
- [ ] Table has columns: Month, Opening Balance, Additions, Withdrawals, Yield Earned, Rate of Return, Closing Balance
- [ ] Rate of Return shows a percentage (Modified Dietz calculation)

---

## CHECK 17: Investor Statements

Go to Statements (/investor/statements)

- [ ] Page loads (may show "No statements available" if none generated)
- [ ] If statements exist: cards show month, fund, beginning/ending balance
- [ ] "Download PDF" button works (triggers browser download)
- [ ] Year and asset filter dropdowns work

---

## CHECK 18: Admin Reports / Statement Manager

Log in as admin. Go to Reports (/admin/investor-reports)

- [ ] Month/year selector works
- [ ] KPI cards show: Generated count, Missing count, Total Investors
- [ ] Investor table shows report status per investor (Generated/Sent/Missing)
- [ ] "Generate Missing" button triggers report generation
- [ ] Preview (eye icon) opens the report in a dialog

---

## CHECK 19: IB Management and Commissions

Go to IB Management (/admin/ib-management)

- [ ] KPI cards show: Total IBs, Total Referrals, Total IB Earnings
- [ ] IB table shows brokers with referral counts and earnings
- [ ] If yield was distributed to investors with IB parents, earnings show per-asset amounts

---

## CHECK 20: Cross-Portal Data Consistency

Final verification across both portals:

- [ ] Pick one investor: check their balance on admin investor detail page
- [ ] Log in as that investor: dashboard balance matches admin view
- [ ] Check the investor's transaction count on admin side matches investor transaction page count
- [ ] If yield was distributed: admin yield distribution net amount matches what investor sees in yield history
- [ ] Run integrity checks one more time (/admin/operations > Integrity) -- all 16 pass

---

## Quick Reference

| Check | Tests | Portal |
|-------|-------|--------|
| 1 | Login + Dashboard | Admin |
| 2 | Record Deposit | Admin |
| 3 | Deposit Visible | Investor |
| 4 | Submit Withdrawal | Investor |
| 5 | Approve Withdrawal | Admin |
| 6 | Withdrawal Result | Investor |
| 7 | Yield Preview | Admin |
| 8 | Yield Apply | Admin |
| 9 | Yield Visible | Investor |
| 10 | Void Distribution | Admin |
| 11 | Void Transaction | Admin |
| 12 | Fees Account | Admin |
| 13 | Fund Management | Admin |
| 14 | Integrity Checks | Admin |
| 15 | Audit Trail | Admin |
| 16 | Portfolio + Perf | Investor |
| 17 | Statements | Investor |
| 18 | Report Manager | Admin |
| 19 | IB Commissions | Admin |
| 20 | Cross-Portal Match | Both |
