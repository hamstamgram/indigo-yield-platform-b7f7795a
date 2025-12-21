# INDIGO Platform Actions Inventory

**Generated:** 2024-12-21  
**Purpose:** Document every button, handler, and backend call with permissions

---

## Investor-Facing Actions

### Dashboard

| Action | Component | Handler | Backend Call | Permission |
|--------|-----------|---------|--------------|------------|
| View Portfolio | InvestorDashboard | onClick navigate | - | Authenticated |
| View Statements | InvestorDashboard | onClick navigate | - | Authenticated |

### Statements Page

| Action | Component | Handler | Backend Call | Permission |
|--------|-----------|---------|--------------|------------|
| Select Period | PeriodSelector | onValueChange | supabase.from('statement_periods').select() | Authenticated |
| View Statement | StatementCard | onClick | supabase.from('generated_statements').select() | Authenticated + Own |
| Download PDF | StatementCard | onDownload | supabase.storage.download() | Authenticated + Own |

### Transactions Page

| Action | Component | Handler | Backend Call | Permission |
|--------|-----------|---------|--------------|------------|
| Filter by Type | TransactionFilters | onFilterChange | supabase.from('transactions_v2').select().eq('purpose', 'reporting') | Authenticated + Own |
| Filter by Date | TransactionFilters | onDateChange | - (client-side filter) | Authenticated |
| Export CSV | ExportButton | onExport | - (client-side generation) | Authenticated |

### Portfolio Page

| Action | Component | Handler | Backend Call | Permission |
|--------|-----------|---------|--------------|------------|
| View Position Details | PositionCard | onClick | supabase.from('investor_positions').select() | Authenticated + Own |

---

## Admin-Facing Actions

### Investors List (/admin/investors)

| Action | Component | Handler | Backend Call | Permission |
|--------|-----------|---------|--------------|------------|
| Search Investors | InvestorSearchInput | onSearch | supabase.from('profiles').select().ilike() | Admin |
| Filter by Fund | FundFilter | onValueChange | URL-persisted filter | Admin |
| Filter by Status | StatusFilter | onValueChange | URL-persisted filter | Admin |
| Select Investor | InvestorRow | onClick | Sets selectedInvestorId state | Admin |
| Open Workspace | DetailPanel | onOpenWorkspace | navigate(/admin/investors/:id) | Admin |

### Investor Workspace (/admin/investors/:id)

#### Overview Tab

| Action | Component | Handler | Backend Call | Permission |
|--------|-----------|---------|--------------|------------|
| Add Transaction | QuickActions | onAddTransaction | Opens TransactionForm dialog | Admin |
| Generate Statement | QuickActions | onGenerateStatement | supabase.from('generated_statements').insert() | Admin |
| View Statement | StatementLink | onClick | Opens statement viewer | Admin |

#### Transactions Tab

| Action | Component | Handler | Backend Call | Permission |
|--------|-----------|---------|--------------|------------|
| Add Transaction | AddTransactionButton | onClick | Opens TransactionForm dialog | Admin |
| Edit Transaction | TransactionRow | onEdit | Opens edit dialog | Admin |
| Delete Transaction | TransactionRow | onDelete | supabase.from('transactions_v2').delete() | Admin + Confirmation |
| Filter by Type | TypeFilter | onValueChange | URL-persisted | Admin |
| Filter by Date Range | DateRangePicker | onDateChange | URL-persisted | Admin |

#### Positions Tab

| Action | Component | Handler | Backend Call | Permission |
|--------|-----------|---------|--------------|------------|
| Add Position | AddPositionButton | onClick | Opens PositionForm dialog | Admin |
| Edit Position | PositionRow | onEdit | supabase.from('investor_positions').update() | Admin |

#### Withdrawals Tab

| Action | Component | Handler | Backend Call | Permission |
|--------|-----------|---------|--------------|------------|
| Approve Withdrawal | WithdrawalRow | onApprove | supabase.from('withdrawal_requests').update() | Admin + Confirmation |
| Reject Withdrawal | WithdrawalRow | onReject | supabase.from('withdrawal_requests').update() | Admin + Confirmation |
| Filter by Status | StatusFilter | onValueChange | URL-persisted | Admin |

#### Reports Tab

| Action | Component | Handler | Backend Call | Permission |
|--------|-----------|---------|--------------|------------|
| Generate Report | GenerateButton | onClick | strictInsertStatement() | Admin |
| Preview Report | ReportRow | onPreview | Opens preview dialog | Admin |
| Send Report | ReportRow | onSend | supabase.functions.invoke('send-email') | Admin |

#### Settings Tab

| Action | Component | Handler | Backend Call | Permission |
|--------|-----------|---------|--------------|------------|
| Update Profile | ProfileForm | onSubmit | supabase.from('profiles').update() | Admin |
| Update IB Settings | IBSettingsForm | onSubmit | supabase.from('ib_relationships').upsert() | Admin |
| Update Fee Schedule | FeeScheduleForm | onSubmit | supabase.from('investor_fee_schedule').upsert() | Admin |
| Delete Investor | DangerZone | onDelete | supabase.from('profiles').delete() | Admin + Typed Confirmation |

---

### Yields Management (/admin/yields)

| Action | Component | Handler | Backend Call | Permission |
|--------|-----------|---------|--------------|------------|
| Apply Yield | ApplyYieldButton | onClick | supabase.rpc('apply_daily_yield_to_fund_v2') | Admin |
| Generate Performance | GenerateButton | onClick | supabase.functions.invoke('generate-fund-performance') | Admin |
| Select Fund | FundSelector | onValueChange | - | Admin |
| Set Yield Rate | YieldRateInput | onChange | - | Admin |

---

### Reports (/admin/investor-reports)

| Action | Component | Handler | Backend Call | Permission |
|--------|-----------|---------|--------------|------------|
| Select Period | PeriodSelector | onValueChange | - | Admin |
| Generate All Statements | GenerateAllButton | onClick | Batch strictInsertStatement() | Admin |
| Send All Reports | SendAllButton | onClick | Batch supabase.functions.invoke('send-email') | Admin |
| Preview Statement | StatementRow | onPreview | Opens preview dialog | Admin |
| Send Statement | StatementRow | onSend | supabase.functions.invoke('send-email') | Admin |

---

## Destructive Actions Summary

All destructive actions require confirmation:

| Action | Confirmation Type | Location |
|--------|-------------------|----------|
| Delete Investor | Typed confirmation (type investor name) | Settings > Danger Zone |
| Delete Transaction | AlertDialog confirmation | Transaction row menu |
| Reject Withdrawal | AlertDialog confirmation | Withdrawal row |
| Delete Position | AlertDialog confirmation | Position row menu |

---

## Permission Matrix

| Role | View Investors | Edit Investors | Delete Investors | Manage Yields | Manage Withdrawals |
|------|----------------|----------------|------------------|---------------|-------------------|
| Investor | Own only | No | No | No | Request only |
| Admin | All | All | With confirmation | Yes | Approve/Reject |
| Super Admin | All | All | With confirmation | Yes | Approve/Reject |
