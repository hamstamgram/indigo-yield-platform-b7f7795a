# Complete Button Map - UI Actions to Backend Calls

Generated: 2024-12-21

This document maps every actionable UI control to its backend implementation.

---

## ADMIN ROUTES

### /admin - Admin Dashboard

| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| View Investors | Dashboard card | Navigate | - | - | admin | - | - |
| View Transactions | Dashboard card | Navigate | - | - | admin | - | - |
| View Withdrawals | Dashboard card | Navigate | - | - | admin | - | - |
| Recent Activity List | Main area | - | profiles, transactions_v2 SELECT | profiles, transactions_v2 R | admin | - | - |

**File:** `src/routes/admin/AdminDashboard.tsx`

---

### /admin/transactions - Admin Transactions Page

| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Filter by Type | Filter bar | URL params | - | - | admin | - | - |
| Filter by Fund | Filter bar | URL params | - | - | admin | - | - |
| Filter by Date | Filter bar | URL params | - | - | admin | - | - |
| Search | Search box | setSearchTerm | - | - | admin | - | - |
| Export CSV | Header | handleExport | - | transactions_v2 R | admin | - | - |
| View Details | Row click | Navigate | - | - | admin | - | - |

**File:** `src/routes/admin/transactions/AdminTransactionsPage.tsx`

---

### /admin/transactions/new - Manual Transaction

| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Select Investor | Form | setInvestor | - | profiles R | admin | - | - |
| Select Fund | Form | setFund | - | funds R | admin | - | - |
| Enter Amount | Form | setAmount | - | - | admin | - | - |
| Select Type | Form | setType | - | - | admin | - | - |
| Submit | Form button | handleSubmit | transactions_v2.insert, investor_positions.update | transactions_v2 W, investor_positions W | admin | reference_id unique | AlertDialog |

**File:** `src/routes/admin/transactions/AdminManualTransaction.tsx`

---

### /admin/investors - Unified Investors Page

| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Search | Search bar | setSearchTerm / URL | - | - | admin | - | - |
| Filter by Status | Filter dropdown | URL params | - | - | admin | - | - |
| Add Investor | Header button | openDialog | profiles.insert | profiles W | admin | email unique | - |
| Select Investor | Row click | setSelectedInvestor | profiles.select, investor_positions.select | profiles R, investor_positions R | admin | - | - |
| Open Drawer | Row click | openDrawer | - | - | admin | - | - |
| Refresh | Header button | refetch | - | - | admin | - | - |

**File:** `src/routes/admin/UnifiedInvestorsPage.tsx`

---

### /admin/investors/:id - Investor Management (Full Profile)

#### Overview Tab
| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Add Transaction | Quick actions | openAddTxDialog | - | - | admin | - | - |
| Create Withdrawal | Quick actions | openWithdrawalDialog | - | - | admin | - | - |
| View Reports | Quick actions | switchToReportsTab | - | - | admin | - | - |

#### Ledger Tab (Transactions)
| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Filter by Type | Filter bar | URL: txType | - | - | admin | - | - |
| Filter by Purpose | Filter bar | URL: txPurpose | - | - | admin | - | - |
| Filter by Date Range | Filter bar | URL: dateFrom, dateTo | - | - | admin | - | - |
| Add Transaction | Header button | openAddDialog | transactions_v2.insert | transactions_v2 W, investor_positions W | admin | reference_id unique | AlertDialog |

#### Positions Tab
| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Edit Position | Row action | handleEdit | investor_positions.update | investor_positions W, data_edit_audit W | admin | - | - |
| Delete Position | Row action | handleDelete | investor_positions.delete | investor_positions W, data_edit_audit W | admin | - | AlertDialog |
| Add Position | Header button | handleAdd | investor_positions.insert | investor_positions W | admin | (investor_id, fund_id) unique | - |

#### Withdrawals Tab
| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Filter by Status | Filter dropdown | URL: status | - | - | admin | - | - |
| Approve | Row action | handleApprove | withdrawal_requests.update, transactions_v2.insert | withdrawal_requests W, transactions_v2 W, investor_positions W | admin | status transition | AlertDialog |
| Reject | Row action | handleReject | withdrawal_requests.update | withdrawal_requests W | admin | status transition | AlertDialog |
| Mark Processed | Row action | handleProcess | withdrawal_requests.update | withdrawal_requests W | admin | status transition | AlertDialog |

#### Reports Tab
| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Generate Report | Action button | handleGenerate | strictInsertStatement | generated_statements W | admin | unique_investor_period constraint | - |
| Preview | Row action | handlePreview | - | generated_statements R | admin | - | - |
| Regenerate | Row action | handleRegenerate | - | generated_statements W | admin | REJECTS if exists | AlertDialog |
| Send Report | Row action | handleSend | send-investor-report edge fn | email_logs W | admin | - | AlertDialog |

#### Settings Tab
| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Update IB Parent | IB Settings | handleSaveIB | profiles.update | profiles W | admin | - | - |
| Update IB Percentage | IB Settings | handleSaveIB | profiles.update | profiles W | admin | - | - |
| Add Fee Schedule | Fee Manager | handleAddFee | investor_fee_schedule.insert | investor_fee_schedule W | admin | - | - |
| Delete Fee Entry | Fee Manager | handleDeleteFee | investor_fee_schedule.delete | investor_fee_schedule W | admin | - | AlertDialog |
| Add Report Recipient | Recipients | handleAddRecipient | investor_emails.insert | investor_emails W | admin | - | - |
| Delete Investor | Danger Zone | handleDelete | force_delete_investor RPC | ALL investor tables W | super_admin | - | AlertDialog (typed confirmation) |

**Files:**
- `src/routes/admin/investors/InvestorManagement.tsx`
- `src/components/admin/investors/InvestorTabs.tsx`
- `src/components/admin/investors/InvestorOverviewTab.tsx`
- `src/components/admin/investors/InvestorLedgerTab.tsx`
- `src/components/admin/investors/InvestorPositionsTab.tsx`
- `src/components/admin/investors/InvestorWithdrawalsTab.tsx`
- `src/components/admin/investors/InvestorReportsTab.tsx`
- `src/components/admin/investors/InvestorSettingsTab.tsx`

---

### /admin/yield - Yield Operations Page

| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Select Fund | Form | setSelectedFund | - | funds R | admin | - | - |
| Select Period | Form | setSelectedPeriod | - | statement_periods R | admin | - | - |
| Enter Gross Amount | Form | setGrossAmount | - | - | admin | - | - |
| Select Purpose | Form | setPurpose | - | - | admin | - | - |
| Apply Yield | Submit button | handleApplyYield | apply_daily_yield_to_fund_v2 RPC | transactions_v2 W, investor_positions W, fee_allocations W, ib_allocations W, fund_daily_aum W | admin | reference_id unique per investor/fund/date/purpose | AlertDialog with summary |
| View Distribution Preview | Before apply | - | - | investor_positions R | admin | - | - |

**File:** `src/routes/admin/YieldOperationsPage.tsx`

---

### /admin/recorded-yields - Recorded Yields Page

| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Filter by Period | Filter bar | URL: periodId | - | - | admin | - | - |
| Filter by Fund | Filter bar | URL: fundName | - | - | admin | - | - |
| Filter by Purpose | Filter bar | URL: purpose | - | - | admin | - | - |
| Edit Entry | Row action | handleEdit | investor_fund_performance.update | investor_fund_performance W, data_edit_audit W | admin | - | - |
| Save Edit | Inline form | handleSave | updatePerformanceData service | investor_fund_performance W, data_edit_audit W | admin | - | - |
| Cancel Edit | Inline form | handleCancel | - | - | admin | - | - |
| Export | Header button | handleExport | - | investor_fund_performance R | admin | - | - |

**File:** `src/routes/admin/RecordedYieldsPage.tsx`

---

### /admin/withdrawals - Admin Withdrawals Page

| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Filter by Status | Filter dropdown | URL: status | - | - | admin | - | - |
| Filter by Fund | Filter dropdown | URL: fund | - | - | admin | - | - |
| Search | Search box | setSearch | - | - | admin | - | - |
| Approve | Row action | handleApprove | withdrawal_requests.update, transactions_v2.insert, investor_positions.update | withdrawal_requests W, transactions_v2 W, investor_positions W | admin | status transition check | AlertDialog |
| Reject | Row action | handleReject | withdrawal_requests.update | withdrawal_requests W | admin | status transition check | AlertDialog |
| Mark Processed | Row action | handleProcess | withdrawal_requests.update | withdrawal_requests W | admin | status transition check | AlertDialog |
| View Details | Row click | openDetails | - | withdrawal_requests R | admin | - | - |

**File:** `src/routes/admin/AdminWithdrawalsPage.tsx`

---

### /admin/fees - Fees Overview Page

| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Filter by Period | Filter bar | setPeriod | - | - | admin | - | - |
| Filter by Fund | Filter bar | setFund | - | - | admin | - | - |
| View Fee Breakdown | Expandable row | - | fee_allocations.select | fee_allocations R | admin | - | - |
| View IB Allocations | Tab | - | ib_allocations.select | ib_allocations R | admin | - | - |
| Export | Header button | handleExport | - | fee_allocations R, ib_allocations R | admin | - | - |

**File:** `src/routes/admin/FeesOverviewPage.tsx`

---

### /admin/audit-logs - Audit Logs Page

| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Filter by Action | Filter bar | URL: action | - | - | admin | - | - |
| Filter by Entity | Filter bar | URL: entity | - | - | admin | - | - |
| Filter by Date | Filter bar | URL: dateFrom, dateTo | - | - | admin | - | - |
| Search | Search box | setSearch | - | - | admin | - | - |
| View Details | Row expand | - | audit_log R, data_edit_audit R | audit_log R, data_edit_audit R | admin | - | - |
| Export | Header button | handleExport | - | audit_log R | admin | - | - |

**File:** `src/routes/admin/AdminAuditLogs.tsx`

---

### /admin/ib-management - IB Management Page

| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| View IB List | Main area | - | profiles.select (where ib role) | profiles R, user_roles R | admin | - | - |
| View Referrals | Row expand | - | profiles.select (where ib_parent_id) | profiles R | admin | - | - |
| View Commissions | Tab | - | ib_allocations.select | ib_allocations R | admin | - | - |
| Edit IB Rate | Row action | handleEditRate | profiles.update | profiles W | admin | - | - |

**File:** `src/routes/admin/ib/IBManagementPage.tsx`

---

## INVESTOR ROUTES

### /dashboard - Investor Dashboard

| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| View Fund | Fund card click | Navigate | - | - | investor | - | - |
| View Transactions | Quick link | Navigate | - | - | investor | - | - |
| View Statements | Quick link | Navigate | - | - | investor | - | - |
| Request Withdrawal | Action button | handleWithdrawRequest | withdrawal_requests.insert | withdrawal_requests W | investor | - | AlertDialog |

**File:** `src/routes/dashboard/DashboardPage.tsx`

---

### /statements - Investor Statements Page

| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Filter by Year | Filter dropdown | setSelectedYear | investor_fund_performance.select WHERE purpose='reporting' | investor_fund_performance R | investor | - | - |
| Filter by Asset | Filter dropdown | setSelectedAsset | investor_fund_performance.select WHERE purpose='reporting' | investor_fund_performance R | investor | - | - |
| Download PDF | Statement row | handleDownload | generated_statements.select | generated_statements R | investor | - | - |

**CRITICAL:** Query uses `.eq("purpose", "reporting")` - NO NULL fallback

**File:** `src/routes/investor/statements/StatementsPage.tsx:57-59`

---

### /transactions - Investor Transactions Page

| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Filter by Type | Filter bar | setType | - | - | investor | - | - |
| Filter by Date | Filter bar | setDateRange | - | - | investor | - | - |
| View Details | Row click | Navigate | - | - | investor | - | - |

**File:** `src/routes/transactions/TransactionsPage.tsx`

---

### /withdrawals - Withdrawal History Page

| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| View History | Main area | - | withdrawal_requests.select | withdrawal_requests R | investor | - | - |
| New Withdrawal | Header button | Navigate | - | - | investor | - | - |
| Cancel Request | Row action | handleCancel | withdrawal_requests.update | withdrawal_requests W | investor | status check | AlertDialog |

**File:** `src/routes/withdrawals/WithdrawalHistoryPage.tsx`

---

### /withdrawals/new - New Withdrawal Page

| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| Select Fund | Form | setFund | can_withdraw RPC | investor_positions R | investor | - | - |
| Enter Amount | Form | setAmount | - | - | investor | - | - |
| Submit Request | Form button | handleSubmit | withdrawal_requests.insert | withdrawal_requests W | investor | - | AlertDialog |

**File:** `src/routes/withdrawals/NewWithdrawalPage.tsx`

---

## IB ROUTES

### /ib/dashboard - IB Dashboard

| Control | Location | Handler | Backend Call | Tables R/W | Role | Idempotency | Confirmation |
|---------|----------|---------|--------------|------------|------|-------------|--------------|
| View Referrals | Referrals section | - | profiles.select (where ib_parent_id = me) | profiles R | ib | - | - |
| View Commissions | Commissions section | - | ib_allocations.select | ib_allocations R | ib | - | - |
| Filter by Period | Filter bar | setPeriod | - | - | ib | - | - |
| Export Commissions | Header button | handleExport | - | ib_allocations R | ib | - | - |

**File:** `src/routes/ib/IBDashboard.tsx`

---

## DESTRUCTIVE ACTIONS SUMMARY

All destructive actions MUST use AlertDialog confirmation:

| Action | Component | Location | Confirmation Type |
|--------|-----------|----------|-------------------|
| Apply Yield | YieldDistributionCard | Yield Ops page | AlertDialog with distribution summary |
| Delete Investor | InvestorSettingsTab | Settings > Danger Zone | AlertDialog with typed name confirmation |
| Delete Position | InvestorPositionsTab | Position row | AlertDialog |
| Delete Fee Entry | FeeScheduleTab | Fee row | AlertDialog |
| Approve Withdrawal | WithdrawalsTab/Page | Withdrawal row | AlertDialog with amount |
| Reject Withdrawal | WithdrawalsTab/Page | Withdrawal row | AlertDialog with reason |
| Cancel Withdrawal | WithdrawalHistoryPage | Withdrawal row | AlertDialog |

---

## IDEMPOTENCY MECHANISMS

| Operation | Mechanism | Constraint/Check |
|-----------|-----------|------------------|
| Yield Distribution | reference_id unique | `idx_transactions_v2_reference_id_unique` |
| Fee Allocation | distribution_id + investor_id unique | `fee_allocations_unique` |
| IB Allocation | source + ib + period + fund unique | `ib_allocations_idempotency` |
| Report Generation | investor_id + period_id unique | `unique_investor_period` |
| Performance Record | investor + period + fund + purpose unique | `investor_fund_performance_unique_with_purpose` |
| Withdrawal Status | Status transition validation | Code check before update |
