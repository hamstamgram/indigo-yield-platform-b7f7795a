# Button Map - UI Actions to Backend Calls

## Admin Routes

### /admin/yield - Yield Operations Page
| Button/Action | Handler | Backend Call | Tables Touched | Role Gate | File:Line |
|--------------|---------|--------------|----------------|-----------|-----------|
| Apply Yield | `handleApplyYield` | `apply_daily_yield_to_fund_v2` RPC | transactions_v2, investor_positions, fee_allocations, ib_allocations | admin | src/routes/admin/YieldOperationsPage.tsx:~150 |
| Confirm Apply Dialog | AlertDialog confirmation | - | - | admin | src/components/admin/yield/YieldDistributionCard.tsx:~80 |
| Select Fund | `setSelectedFund` | - | - | admin | src/routes/admin/YieldOperationsPage.tsx:~60 |
| Select Period | `setSelectedPeriod` | - | - | admin | src/routes/admin/YieldOperationsPage.tsx:~65 |

### /admin/investors - Unified Investors Page
| Button/Action | Handler | Backend Call | Tables Touched | Role Gate | File:Line |
|--------------|---------|--------------|----------------|-----------|-----------|
| Add Investor | `openAddInvestorDialog` | `profiles.insert` | profiles | admin | src/routes/admin/UnifiedInvestorsPage.tsx:~100 |
| Open Investor Drawer | `setSelectedInvestor` | `profiles.select` | profiles, investor_positions | admin | src/routes/admin/UnifiedInvestorsPage.tsx:~120 |
| Filter by Status | URL params update | - | - | admin | src/routes/admin/UnifiedInvestorsPage.tsx:~80 |
| Search | `setSearchTerm` | - | - | admin | src/routes/admin/UnifiedInvestorsPage.tsx:~85 |

### /admin/investors/:id - Investor Management (Drawer/Page)
| Button/Action | Handler | Backend Call | Tables Touched | Role Gate | File:Line |
|--------------|---------|--------------|----------------|-----------|-----------|
| Generate Report | `handleGenerateReport` | `strictInsertStatement` | generated_statements | admin | src/components/admin/investors/InvestorReportsTab.tsx:~50 |
| Send Report | `handleSendReport` | `send-investor-report` edge fn | email_logs | admin | src/components/admin/investors/InvestorReportsTab.tsx:~80 |
| Preview Report | `handlePreview` | - | - | admin | src/components/admin/investors/InvestorReportsTab.tsx:~45 |
| Edit Position | `handleEditPosition` | `investor_positions.update` | investor_positions | admin | src/components/admin/investors/InvestorPositionsTab.tsx:~60 |
| Delete Position | AlertDialog + `handleDelete` | `investor_positions.delete` | investor_positions | admin | src/components/admin/investors/InvestorPositionsTab.tsx:~90 |
| Add Fee Entry | `handleAddFee` | `investor_fee_schedule.insert` | investor_fee_schedule | admin | src/components/admin/investors/tabs/FeeScheduleTab.tsx:~40 |
| Delete Fee Entry | AlertDialog + `handleDeleteFee` | `investor_fee_schedule.delete` | investor_fee_schedule | admin | src/components/admin/investors/tabs/FeeScheduleTab.tsx:~70 |
| Delete Investor | AlertDialog (Danger Zone) | `force_delete_investor` RPC | profiles, investor_positions, transactions_v2 | super_admin | src/components/admin/investors/tabs/SettingsTab.tsx:~120 |

### /admin/recorded-yields - Recorded Yields Page
| Button/Action | Handler | Backend Call | Tables Touched | Role Gate | File:Line |
|--------------|---------|--------------|----------------|-----------|-----------|
| Edit Yield | `handleEdit` | `investor_fund_performance.update` | investor_fund_performance, data_edit_audit | admin | src/routes/admin/RecordedYieldsPage.tsx:~80 |
| Save Edit | `handleSave` | `updatePerformanceData` service | investor_fund_performance, data_edit_audit | admin | src/routes/admin/RecordedYieldsPage.tsx:~100 |
| Filter by Period | URL params update | - | - | admin | src/routes/admin/RecordedYieldsPage.tsx:~50 |
| Filter by Fund | URL params update | - | - | admin | src/routes/admin/RecordedYieldsPage.tsx:~55 |

### /admin/withdrawals - Admin Withdrawals Page
| Button/Action | Handler | Backend Call | Tables Touched | Role Gate | File:Line |
|--------------|---------|--------------|----------------|-----------|-----------|
| Approve Withdrawal | AlertDialog + `handleApprove` | `withdrawal_requests.update`, `transactions_v2.insert` | withdrawal_requests, transactions_v2, audit_log | admin | src/routes/admin/AdminWithdrawalsPage.tsx:~80 |
| Reject Withdrawal | AlertDialog + `handleReject` | `withdrawal_requests.update` | withdrawal_requests, audit_log | admin | src/routes/admin/AdminWithdrawalsPage.tsx:~100 |
| Filter by Status | URL params update | - | - | admin | src/routes/admin/AdminWithdrawalsPage.tsx:~50 |

## Investor Routes

### /dashboard - Investor Dashboard
| Button/Action | Handler | Backend Call | Tables Touched | Role Gate | File:Line |
|--------------|---------|--------------|----------------|-----------|-----------|
| View Fund Details | Navigate | - | - | investor | src/routes/dashboard/DashboardPage.tsx:~80 |
| Request Withdrawal | `handleWithdrawRequest` | `withdrawal_requests.insert` | withdrawal_requests | investor | src/routes/dashboard/DashboardPage.tsx:~120 |

### /statements - Investor Statements Page
| Button/Action | Handler | Backend Call | Tables Touched | Role Gate | File:Line |
|--------------|---------|--------------|----------------|-----------|-----------|
| Select Period | `setPeriodId` | `investor_fund_performance.select` | investor_fund_performance (purpose='reporting' only) | investor | src/routes/investor/statements/StatementsPage.tsx:~45 |
| Download Statement | `handleDownload` | - | - | investor | src/routes/investor/statements/StatementsPage.tsx:~80 |

## IB Routes

### /ib/dashboard - IB Dashboard
| Button/Action | Handler | Backend Call | Tables Touched | Role Gate | File:Line |
|--------------|---------|--------------|----------------|-----------|-----------|
| View Referrals | - | `profiles.select` (where ib_parent_id) | profiles | ib | src/routes/ib/IBDashboard.tsx:~50 |
| View Commissions | - | `ib_allocations.select` | ib_allocations | ib | src/routes/ib/IBDashboard.tsx:~70 |

---

## Destructive Actions Summary

All destructive actions require `AlertDialog` confirmation:

| Action | Component | Confirmation Type | File:Line |
|--------|-----------|-------------------|-----------|
| Apply Yield | YieldDistributionCard | AlertDialog with summary | src/components/admin/yield/YieldDistributionCard.tsx:~80 |
| Delete Investor | SettingsTab (Danger Zone) | AlertDialog with name confirmation | src/components/admin/investors/tabs/SettingsTab.tsx:~120 |
| Delete Position | InvestorPositionsTab | AlertDialog | src/components/admin/investors/InvestorPositionsTab.tsx:~90 |
| Delete Fee Entry | FeeScheduleTab | AlertDialog | src/components/admin/investors/tabs/FeeScheduleTab.tsx:~70 |
| Approve Withdrawal | AdminWithdrawalsPage | AlertDialog | src/routes/admin/AdminWithdrawalsPage.tsx:~80 |
| Reject Withdrawal | AdminWithdrawalsPage | AlertDialog | src/routes/admin/AdminWithdrawalsPage.tsx:~100 |
