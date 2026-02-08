# Indigo Yield Platform - Complete Deep Analysis

> **Document Type**: Full Platform Audit & Technical Reference
> **Generated**: 2026-02-06
> **Audience**: New Developers, Investor Due Diligence, Internal Reference (CTO/CFO/Engineering)
> **Platform Stage**: Soft Launch (Small AUM)
> **Team**: Solo Founder/Developer
> **Format**: Single mega-document with table of contents

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Feature Categories by Domain](#3-feature-categories-by-domain)
4. [Frontend-to-Backend Complete Mapping](#4-frontend-to-backend-complete-mapping)
5. [Database Schema Deep Dive](#5-database-schema-deep-dive)
6. [Service Layer & Function Reference](#6-service-layer--function-reference)
7. [Security & Access Control](#7-security--access-control)
8. [Financial Engine Deep Dive](#8-financial-engine-deep-dive)
9. [Risk Assessment & Dead Code Flags](#9-risk-assessment--dead-code-flags)
10. [Recommendations & Prioritized Roadmap](#10-recommendations--prioritized-roadmap)
11. [Appendix: Complete Function Inventory](#11-appendix-complete-function-inventory)

---

## 1. Executive Summary

### What is Indigo Yield Platform?

Indigo is a **crypto yield/investment management platform** that enables:
- **Investors** to deposit crypto assets (BTC, USDT, etc.) into managed funds and earn yield
- **Administrators** to manage funds, process deposits/withdrawals, distribute yield, and monitor system health
- **Introducing Brokers (IBs)** to refer investors and earn commissions on their referrals' yield

### Technical Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript + Vite | Single-page application |
| UI Library | Tailwind CSS + shadcn/ui | Component design system |
| State | React Query v5 (TanStack Query) | Server state management |
| Backend | Supabase (PostgreSQL 15+) | Database, Auth, RLS, RPC |
| Hosting | Lovable Cloud | Managed frontend deployment |
| Auth | Supabase Auth + RBAC | JWT-based with role hierarchy |

### Key Metrics

| Metric | Count |
|--------|-------|
| Frontend Routes | 115+ |
| Page Components | 90+ |
| Feature Components | 200+ |
| Custom React Hooks | 60+ |
| Service Files | 90+ |
| Service Functions | 500+ |
| Database Tables | 20+ |
| Database Views | 12+ |
| Database Triggers | 15+ |
| RPC Functions | 17+ |
| Database Enums | 9 |
| RLS Policies | All tables covered |

### Platform Health (as of 2026-02-06)

- TypeScript: Zero errors (`tsc --noEmit` clean)
- Build: Clean (`npm run build` passes)
- Ledger Reconciliation: Zero drift
- Yield Conservation: Zero violations
- All 3 portals tested via Playwright (Admin, Investor, IB)

---

## 2. Architecture Overview

### 2.1 System Architecture

```
+------------------+     +------------------+     +-------------------+
|   Investor       |     |   Admin          |     |   IB Portal       |
|   Portal         |     |   Portal         |     |                   |
|   (React SPA)    |     |   (React SPA)    |     |   (React SPA)     |
+--------+---------+     +--------+---------+     +--------+----------+
         |                         |                        |
         +-------------------------+------------------------+
                                   |
                    +--------------v--------------+
                    |      React Router           |
                    |      (Role-based routing)   |
                    +--------------+--------------+
                                   |
                    +--------------v--------------+
                    |      Service Layer          |
                    |      (90+ service files)    |
                    |      Gateway Pattern        |
                    +--------------+--------------+
                                   |
                    +--------------v--------------+
                    |      Supabase Client        |
                    |      (RPC + Direct queries) |
                    +--------------+--------------+
                                   |
                    +--------------v--------------+
                    |      PostgreSQL Database     |
                    |      RLS + Triggers + RPCs  |
                    |      NUMERIC(28,10) precision|
                    +-----------------------------+
```

### 2.2 Data Flow Pattern

Every user action follows this exact flow:

```
User Action (click button)
    |
    v
React Component (e.g., DepositForm)
    |
    v
Custom Hook (e.g., useCreateAdminTransaction)
    |  Uses React Query useMutation/useQuery
    v
Service Function (e.g., adminCreateTransaction())
    |  Gateway pattern - wraps Supabase calls
    v
Supabase RPC or Direct Query
    |  supabase.rpc('admin_create_transaction', params)
    v
PostgreSQL Database
    |  RLS policy check -> Trigger execution -> Data mutation
    v
Response flows back up the chain
    |
    v
React Query Cache Invalidation -> UI Re-render
```

### 2.3 Role Hierarchy & Portal Routing

```
super_admin > admin > ib > investor

Routes:
  /auth/*        -> Public (no auth)
  /investor/*    -> InvestorRoute guard (investor role)
  /admin/*       -> AdminRoute guard (admin or super_admin)
  /ib/*          -> IBRoute guard (ib role)
```

**Role Detection**: `useUserRole()` hook queries `user_roles` table, returns `{ role, isAdmin, isIB, isSuperAdmin }`.

### 2.4 State Management

The platform uses **React Query exclusively** (no Zustand, no Redux):

- **Server State**: All data fetched via React Query hooks
- **Cache**: 5-minute stale time, 10-minute cache time
- **Invalidation**: Mutations automatically invalidate related queries
- **Real-time**: Supabase subscriptions trigger React Query cache invalidation
- **Query Keys**: Centralized in `src/constants/queryKeys.ts`

### 2.5 Component Hierarchy

```
App.tsx
  ErrorBoundary
    QueryClientProvider
      SecurityProvider
        AuthProvider (context: user, profile, isAdmin)
          TooltipProvider
            Router
              AppRoutes
                PublicRoutes (no auth)
                DashboardLayout (sidebar + header)
                  InvestorRoutes (InvestorRoute guard)
                  AdminRoutes (AdminRoute guard)
                  IBUserRoutes (IBRoute guard)
```

---

## 3. Feature Categories by Domain

### 3.1 INVESTOR PORTAL FEATURES

#### 3.1.1 Portfolio Management
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Portfolio Overview | Total portfolio value, per-asset breakdown, unrealized P&L | `/investor` | `PortfolioHero`, `QuickCards`, `PerAssetStatsCards` |
| Position Details | Individual fund position with yield history, transactions | `/investor/funds/:assetId` | `FundDetailsPage`, `PositionCard` |
| Performance Analytics | Historical performance charts, return calculations | `/portfolio/analytics` | `PortfolioAnalyticsPage`, `PerformanceChart` |

**Data Flow**: Component -> `usePerAssetStats()` / `useInvestorPositions()` -> `investorPositionService.ts` -> `supabase.from('investor_positions').select(...)` -> RLS filters by `auth.uid()`

#### 3.1.2 Transaction History
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Transaction Ledger | Full transaction history with filters | `/investor/transactions` | `InvestorTransactionsPage`, `TransactionHistoryTable` |
| Transaction Detail | Individual transaction details | `/investor/transactions/:id` | `TransactionDetailView` |

**Data Flow**: Component -> `useInvestorTransactionsList()` -> `transactionsV2Service.ts` -> `supabase.from('transactions_v2').select(...)` -> RLS filters `investor_id = auth.uid()` AND `visibility_scope = 'investor_visible'`

#### 3.1.3 Withdrawal Management
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Request Withdrawal | Submit withdrawal request with amount validation | `/withdrawals/new` | `NewWithdrawalPage`, `WithdrawalForm` |
| Withdrawal History | View past and pending withdrawal requests | `/withdrawals` | `WithdrawalHistoryPage`, `WithdrawalStatusBadge` |

**Data Flow**: `useSubmitWithdrawal()` -> `investorWithdrawalService.createWithdrawalRequest()` -> `supabase.from('withdrawal_requests').insert(...)` -> Triggers notification to admin

**Balance Validation**: `Available = current_value - pending_withdrawals - approved_withdrawals`

#### 3.1.4 Statements & Reports
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Monthly Statements | Download monthly account statements (PDF) | `/investor/statements` | `InvestorStatementsPage`, `StatementDownload` |
| Performance Reports | Detailed performance reports by period | `/reports` | `ReportsPage` |
| Custom Reports | Generate custom date-range reports | `/reports/custom` | `CustomReport` |

#### 3.1.5 Account Settings
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Profile Settings | Update personal information | `/investor/settings` | `InvestorSettingsPage` |
| Notification Preferences | Configure notification channels | `/investor/settings` | `NotificationSettings` |
| Security Settings | Password change, 2FA | `/investor/settings` | `SecuritySettings` |

---

### 3.2 ADMIN PORTAL FEATURES

#### 3.2.1 Dashboard & Command Center
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Platform Metrics | Total AUM, investor count, fund count, recent activity | `/admin` | `AdminDashboard`, `PlatformMetricsPanel` |
| Pending Actions | Pending withdrawals, approval queue | `/admin` | `PendingActionsPanel` |
| Quick Yield Entry | Quick yield recording shortcut | `/admin` | `QuickYieldEntry` |
| Risk Monitoring | Concentration risk, liquidity risk panels | `/admin` | `ConcentrationRiskPanel`, `LiquidityRiskPanel` |

**Data Flow**: `useAdminStats()` -> `adminStatsService.ts` -> Multiple queries (investor count, AUM, pending withdrawals) -> Dashboard panels

#### 3.2.2 Investor Management
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Investor List | Unified list with search, filters, inline editing | `/admin/investors` | `UnifiedInvestorsPage`, `InvestorTableRow` |
| Investor Detail | Full investor profile with positions, ledger, lifecycle | `/admin/investors/:id` | `InvestorManagement`, `InvestorManagementDrawer` |
| Add Investor | Wizard to create new investor profile | `/admin/investors` (dialog) | `AddInvestorDialog`, `InvestorWizard` |
| Fee Manager | Per-investor fee schedule configuration | `/admin/investors/:id` | `InvestorFeeManager` |
| Lifecycle Panel | Investor onboarding/offboarding status timeline | `/admin/investors/:id` | `InvestorLifecyclePanel` |

**Data Flow**: `useUnifiedInvestors()` -> `investorDetailService.ts` -> `supabase.from('profiles').select(...)` joined with positions -> Admin table view

#### 3.2.3 Transaction Management
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Transaction History | Full platform transaction list with filters | `/admin/transactions` | `AdminTransactionsPage`, `TransactionHistoryTable` |
| Manual Transaction | Create deposits, withdrawals manually | `/admin/transactions/new` | `AdminManualTransaction`, `TransactionAmountInput` |
| Void Transaction | Void a transaction with reason and audit trail | `/admin/transactions` | `VoidTransactionDialog` |

**Data Flow for Manual Transaction**:
```
AdminManualTransaction
  -> useCreateAdminTransaction()
    -> supabase.rpc('admin_create_transaction', {
         p_investor_id, p_fund_id, p_tx_type, p_amount,
         p_tx_date, p_reference_id, p_notes, p_admin_id
       })
      -> PostgreSQL:
         1. Insert into transactions_v2
         2. Trigger: trg_ledger_sync updates investor_positions
         3. Trigger: delta_audit logs change
         4. Return success
```

#### 3.2.4 Withdrawal Approval
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Approval Queue | List of pending/approved/rejected withdrawals | `/admin/withdrawals` | `AdminWithdrawalsPage` |
| Approve | Approve with balance validation | `/admin/withdrawals` | `ApproveWithdrawalDialog` |
| Reject | Reject with reason | `/admin/withdrawals` | `RejectWithdrawalDialog` |

**State Machine**: `pending -> approved -> processing -> completed` (or `rejected` at any point)

#### 3.2.5 Yield Operations
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Yield Operations Center | Central yield management page | `/admin/yield` | `YieldOperationsPage` |
| Recorded Yields | View/edit historical yield entries | `/admin/recorded-yields` | `RecordedYieldsPage` |
| Yield Distributions | View per-investor yield allocations | `/admin/yield-distributions` | `YieldDistributionsPage` |
| Crystallization Dashboard | Monitor crystallization status per investor/fund | `/admin/crystallization` | `CrystallizationDashboardPage` |

**Yield Distribution Flow**:
```
1. Admin selects fund and date range
2. System calls preview_adb_yield_distribution_v3 (read-only)
   -> Calculates ADB per investor
   -> Shows gross/net/fee/IB split per investor
   -> Conservation check: gross = net + fees + ib + dust
3. Admin reviews and clicks "Apply"
4. System calls apply_adb_yield_distribution_v3
   -> Creates yield_distributions record
   -> Creates yield_allocations per investor
   -> Creates fee_allocations per investor
   -> Creates ib_allocations for IB investors
   -> Creates YIELD transactions per investor
   -> Creates FEE_CREDIT transaction for fees account
   -> Creates IB_CREDIT transactions for IB accounts
   -> All wrapped in advisory lock + single transaction
```

#### 3.2.6 Fund Management
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Fund List | View all funds with AUM, investor count | `/admin/funds` | `FundManagementPage` |
| Create Fund | Create new fund with asset, fee structure | `/admin/funds` (dialog) | `CreateFundDialog` |
| Edit Fund | Update fund parameters | `/admin/funds` (dialog) | `EditFundDialog` |

#### 3.2.7 Fee Management
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Fees Overview | Platform fee balance, fee transactions | `/admin/fees` | `FeesOverviewPage` |
| Fee Transactions | History of fee credits and debits | `/admin/fees` | `FeeTransactionsTable` |
| Yield on Fees | Yield earned by the fees_account | `/admin/fees` | `YieldEarnedTab` |
| Internal Routing | Internal fee routing configuration | `/admin/fees` | `InternalRoutingTab` |

#### 3.2.8 Reports & Statements
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Report Generation | Generate investor reports for any period | `/admin/investor-reports` | `InvestorReports` |
| Historical Reports | View previously generated reports | `/admin/reports/historical` | `HistoricalReportsDashboard` |
| Report Delivery | Track email delivery status, retry failed | `/admin/reports/delivery` | `ReportDeliveryCenter` |

#### 3.2.9 System Administration
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| System Health | Real-time system health monitoring | `/admin/system-health` | `SystemHealthPage` |
| Data Integrity | Automated integrity checks dashboard | `/admin/integrity` | `IntegrityDashboardPage` |
| Audit Logs | Browse all audit log entries | `/admin/audit-logs` | `AdminAuditLogs` |
| Maintenance | System maintenance tools | `/admin/maintenance` | `MaintenancePage` |
| Duplicate Detection | Find potential duplicate profiles | `/admin/duplicates` | `DuplicatesPage` |
| Bypass Attempts | View blocked direct mutation attempts | `/admin/bypass-attempts` | `BypassAttemptsPage` |
| Admin Settings | Platform configuration | `/admin/settings` | `AdminSettingsPage` |
| Admin Users | Manage admin accounts (super_admin only) | `/admin/settings/admins` | `AdminListPage` |
| Admin Invites | Manage admin invitation codes | `/admin/settings/invites` | `AdminInvitesPage` |
| Admin Tools | Developer/admin tools | `/admin/settings/tools` | `AdminToolsPage` |

#### 3.2.10 IB Management (Admin Side)
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| IB Management | Manage IBs, set commission rates, promote investors to IB | `/admin/ib-management` | `IBManagementPage` |

---

### 3.3 IB (INTRODUCING BROKER) PORTAL FEATURES

> **Note**: The IB system may be deprecated in the future. It is currently a secondary feature.

#### 3.3.1 IB Dashboard
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Overview | Commission summary, top referrals, yield on balance | `/ib` | `IBOverviewPage` |
| Commission Summary | Total earned, pending, paid commissions | `/ib` | `CommissionSummaryCard` |
| Top Referrals | Highest-value referred investors | `/ib` | `TopReferralsCard` |

**Data Flow**: `useIBCommissionSummary()` -> `ibService.getCommissionSummary()` -> `supabase.rpc('get_ib_commission_summary', { p_ib_id })` -> RLS ensures IB can only see own data

#### 3.3.2 Referral Management
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Referral List | All referred investors with status | `/ib/referrals` | `IBReferralsPage` |
| Referral Detail | Referred investor's positions and commissions earned | `/ib/referrals/:id` | `IBReferralDetailPage` |

#### 3.3.3 Commission Tracking
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Commission History | Full commission history with date range filter | `/ib/commissions` | `IBCommissionsPage` |
| Allocation Detail | Per-yield-distribution commission breakdown | `/ib/commissions` | `AllocationDetailView` |

#### 3.3.4 Payout History
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Payout History | History of commission payouts (pending/paid) | `/ib/payouts` | `IBPayoutHistoryPage` |

#### 3.3.5 IB Settings
| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Profile Settings | IB profile, payout preferences | `/ib/settings` | `IBSettingsPage` |

---

### 3.4 PUBLIC/AUTH FEATURES

| Feature | Description | Routes | Key Components |
|---------|-------------|--------|----------------|
| Login | Email/password login | `/auth/login` | `LoginPage` |
| Register | New account registration | `/auth/register` | `RegisterPage` |
| Password Reset | Email-based password reset | `/auth/reset-password` | `ResetPasswordPage` |
| Email Verification | Email verification handler | `/auth/verify` | `VerifyEmailPage` |
| Accept Invite | Admin invite acceptance | `/auth/accept-invite` | `AcceptInvitePage` |
| Terms of Service | Legal terms | `/terms` | `TermsPage` |
| Privacy Policy | Privacy policy | `/privacy` | `PrivacyPage` |
| Health Check | System health endpoint | `/health` | `HealthCheckPage` |

---

## 4. Frontend-to-Backend Complete Mapping

### 4.1 Investor Portal Mapping

#### Portfolio Overview (`/investor`)

```
UI Component: PortfolioHero + QuickCards + PerAssetStatsCards
    |
    v
Hooks: usePerAssetStats(), useInvestorOverview()
    |
    v
Services: investorPositionService.getUserPositions(userId)
          investorPortfolioService.getPortfolioSummary(userId)
    |
    v
Database Queries:
  supabase.from('investor_positions')
    .select('investor_id, fund_id, shares, cost_basis, current_value,
             unrealized_pnl, realized_pnl, fund_class, is_active,
             funds(name, code, asset, fund_class)')
    .eq('investor_id', userId)
    .gt('shares', 0)
    |
    v
Tables Touched: investor_positions (SELECT), funds (JOIN)
RLS Policy: investor_id = auth.uid()
```

#### Transaction History (`/investor/transactions`)

```
UI Component: InvestorTransactionsPage
    |
    v
Hook: useInvestorTransactionsList()
    |
    v
Service: transactionsV2Service.getInvestorTransactions(investorId)
    |
    v
Database Query:
  supabase.from('transactions_v2')
    .select('id, investor_id, fund_id, type, asset, amount, tx_date,
             notes, tx_hash, created_at, is_voided,
             funds!inner(name, code, asset)')
    .eq('investor_id', investorId)
    .eq('is_voided', false)
    .order('tx_date', { ascending: false })
    |
    v
Tables: transactions_v2 (SELECT), funds (JOIN)
RLS: investor_id = auth.uid() AND visibility_scope = 'investor_visible'
```

#### Submit Withdrawal (`/withdrawals/new`)

```
UI Component: NewWithdrawalPage -> WithdrawalForm
    |
    v
Hook: useSubmitWithdrawal()
    |
    v
Service: investorWithdrawalService.createWithdrawalRequest({
  investor_id, fund_id, requested_amount, notes
})
    |
    v
Database:
  supabase.from('withdrawal_requests').insert({
    investor_id, fund_id, requested_amount, request_date,
    status: 'pending', notes
  })
    |
    v
Tables: withdrawal_requests (INSERT)
RLS: investor_id = auth.uid() (INSERT policy)
Triggers: None on insert (admin approval required)
```

### 4.2 Admin Portal Mapping

#### Create Manual Transaction (`/admin/transactions/new`)

```
UI Component: AdminManualTransaction
  -> InvestorSelect (dropdown)
  -> FundSelect (dropdown)
  -> TransactionAmountInput
  -> TransactionDateInput
    |
    v
Hook: useCreateAdminTransaction()
    |
    v
Service: supabase.rpc('admin_create_transaction', {
  p_investor_id, p_fund_id, p_tx_type, p_amount,
  p_tx_date, p_reference_id, p_notes, p_admin_id
})
    |
    v
RPC: admin_create_transaction() [SECURITY DEFINER]
  1. Validate inputs
  2. SET indigo.canonical_rpc = 'true'
  3. INSERT INTO transactions_v2 (...)
  4. TRIGGER trg_ledger_sync fires:
     -> UPDATE investor_positions SET current_value += amount
  5. TRIGGER delta_audit fires:
     -> INSERT INTO audit_log (delta of changes)
  6. Return jsonb result
    |
    v
Tables Written: transactions_v2, investor_positions (trigger), audit_log (trigger)
Tables Read: funds, profiles, investor_positions
```

#### Approve Withdrawal (`/admin/withdrawals`)

```
UI Component: AdminWithdrawalsPage -> ApproveWithdrawalDialog
    |
    v
Hook: useApproveWithdrawal()
    |
    v
Service: approvalService.approveWithdrawal(requestId, adminId)
    |
    v
Database:
  1. UPDATE withdrawal_requests SET status = 'approved', approved_by, approved_at
  2. RPC: apply_transaction_with_crystallization (if processing to completion)
     -> Crystallize accrued yield first
     -> Create WITHDRAWAL transaction
     -> Trigger updates position
     -> Audit log entry
    |
    v
Tables: withdrawal_requests (UPDATE), transactions_v2 (INSERT via RPC),
        investor_positions (trigger), audit_log (trigger)
State Machine: pending -> approved -> processing -> completed
```

#### Yield Distribution (`/admin/yield`)

```
UI Component: YieldOperationsPage -> YieldDistributionForm
    |
    v
Step 1: PREVIEW
Hook: usePreviewYieldDistribution()
Service: yieldPreviewService.previewYieldDistribution({
  fundId, periodStart, periodEnd, grossYieldAmount, purpose
})
RPC: preview_adb_yield_distribution_v3 (READ-ONLY)
  -> Calculates ADB per investor
  -> Returns per-investor gross/net/fee/IB splits
  -> Conservation check result
  -> NO database writes
    |
    v
Step 2: APPLY (after admin review)
Hook: useApplyYieldDistribution()
Service: yieldApplyService.applyYieldDistribution({...}, adminId, purpose)
RPC: apply_adb_yield_distribution_v3 [SECURITY DEFINER, ADVISORY LOCK]
  -> SET indigo.canonical_rpc = 'true'
  -> Acquire advisory lock (fund_id + date)
  -> INSERT yield_distributions (master record)
  -> INSERT yield_allocations (per-investor breakdown)
  -> INSERT fee_allocations (per-investor fees)
  -> INSERT ib_allocations (IB commissions, if applicable)
  -> INSERT transactions_v2:
     - YIELD per investor (net amount)
     - FEE_CREDIT to fees_account
     - IB_CREDIT to IB accounts (if applicable)
  -> Trigger: trg_ledger_sync updates all positions
  -> Trigger: delta_audit logs all changes
  -> Conservation check: gross = net + fees + ib + dust
  -> Return jsonb result with all allocations
    |
    v
Tables Written: yield_distributions, yield_allocations, fee_allocations,
               ib_allocations, transactions_v2, investor_positions (trigger),
               audit_log (trigger)
```

#### Void Transaction (`/admin/transactions`)

```
UI Component: VoidTransactionDialog
    |
    v
Hook: useVoidTransaction()
    |
    v
Service: transactionDetailsService.voidTransaction({
  transactionId, adminId, reason
})
    |
    v
RPC: void_transaction(p_transaction_id, p_admin_id, p_reason)
  -> UPDATE transactions_v2 SET is_voided = true
  -> Trigger: trg_ledger_sync fires (reverses amount from position)
  -> Trigger: delta_audit logs void
  -> Check for dependent yield distributions
    |
    v
Tables: transactions_v2 (UPDATE), investor_positions (trigger),
        audit_log (trigger)
```

### 4.3 IB Portal Mapping

#### IB Dashboard (`/ib`)

```
UI Components: IBOverviewPage
  -> CommissionSummaryCard
  -> TopReferralsCard
  -> YieldOnBalanceCard
    |
    v
Hooks:
  useIBCommissionSummary() -> ibService.getCommissionSummary(ibId)
  useIBTopReferrals() -> ibService.getTopReferrals(ibId)
  useIBYieldOnBalance() -> ibService.getYieldOnBalance(ibId)
    |
    v
RPCs/Queries:
  supabase.rpc('get_ib_commission_summary', { p_ib_id })
  supabase.rpc('get_ib_referrals', { p_ib_id, p_limit: 10 })
  supabase.from('ib_allocations')
    .select('ib_fee_amount, effective_date, payout_status, funds(name, asset)')
    .eq('ib_investor_id', ibId)
    .eq('is_voided', false)
    |
    v
Tables: ib_allocations (SELECT), ib_commission_ledger (SELECT),
        profiles (JOIN), investor_positions (JOIN), funds (JOIN)
RLS: ib_investor_id = auth.uid()
```

#### Referral Detail (`/ib/referrals/:id`)

```
UI Component: IBReferralDetailPage
    |
    v
Hook: useIBReferralDetail(referralId)
    |
    v
Service: ibService.getReferralDetail(referralId, ibId)
    |
    v
RPC: get_ib_referral_detail(p_referral_id, p_ib_id)
  -> Verifies IB ownership (referral.ib_parent_id = p_ib_id)
  -> Returns referral profile + positions + commission history
    |
    v
Tables: profiles (SELECT), investor_positions (SELECT),
        ib_allocations (SELECT)
RLS: Ownership verified in RPC, not just RLS
```

### 4.4 Auth Flow Mapping

```
LoginPage
    |
    v
Hook: useLoginMutation()
    |
    v
Service: supabase.auth.signInWithPassword({ email, password })
    |
    v
Supabase Auth: Validates credentials, returns JWT session
    |
    v
AuthProvider: Stores session, fetches profile
    |
    v
useUserRole(): Queries user_roles table
    |
    v
Router: Redirects based on role
  - admin/super_admin -> /admin
  - ib -> /ib
  - investor -> /investor
```

### 4.5 Real-time Subscription Mapping

```
Supabase Channel Subscriptions:
  |
  +-> transactions_v2 INSERT -> Invalidate: transactions, investor-positions
  +-> investor_positions UPDATE -> Invalidate: investor-positions, portfolio
  +-> notifications INSERT -> Update notification badge count
  +-> yield_distributions UPDATE -> Invalidate: yield-records
  +-> withdrawal_requests UPDATE -> Invalidate: withdrawals, pending-count

Hooks:
  useInvestorRealtimeInvalidation() -> Investor portal live updates
  useIBRealtimeInvalidation() -> IB portal live updates
  useRealtimeAlerts() -> Admin integrity alerts
```

---

## 5. Database Schema Deep Dive

### 5.1 Core Tables

#### `transactions_v2` - The Ledger of Record

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Transaction ID |
| `investor_id` | uuid (FK -> profiles) | Investor who owns this transaction |
| `fund_id` | uuid (FK -> funds) | Fund this transaction belongs to |
| `type` | tx_type enum | DEPOSIT, WITHDRAWAL, YIELD, FEE_CREDIT, IB_CREDIT, etc. |
| `tx_subtype` | text | Optional sub-classification |
| `asset` | asset_code enum | BTC, USDT, ETH, etc. |
| `amount` | numeric(28,10) | Transaction amount (positive for credits, negative for debits) |
| `tx_date` | date | Business date of transaction |
| `reference_id` | text (UNIQUE) | Idempotency key |
| `notes` | text | Admin notes |
| `tx_hash` | text | Blockchain transaction hash (if applicable) |
| `is_voided` | boolean | Soft delete flag |
| `voided_by` | uuid | Admin who voided |
| `voided_at` | timestamptz | When voided |
| `void_reason` | text | Why voided |
| `created_by` | uuid | Admin who created |
| `created_at` | timestamptz | Creation timestamp (IMMUTABLE) |
| `visibility_scope` | visibility_scope enum | `investor_visible` or `admin_only` |
| `tx_source` | tx_source enum | Origin: `admin_manual`, `yield_distribution`, etc. |
| `distribution_id` | uuid | Link to yield_distributions (if yield-related) |

**Indexes**: `(investor_id, fund_id)`, `(tx_date)`, `(reference_id)` UNIQUE, `(type)`

**Triggers**:
- `trg_ledger_sync` -> Auto-updates `investor_positions.current_value`
- `delta_audit_transactions_v2` -> Logs changes to audit_log
- `protect_transactions_immutable` -> Blocks changes to `created_at`, `reference_id`, `investor_id`, `fund_id`

#### `investor_positions` - Derived Position State

| Column | Type | Description |
|--------|------|-------------|
| `investor_id` | uuid (Composite PK) | Investor |
| `fund_id` | uuid (Composite PK) | Fund |
| `shares` | numeric(28,10) | Number of shares/units |
| `cost_basis` | numeric(28,10) | Total cost basis |
| `current_value` | numeric(28,10) | Current position value (DERIVED from ledger) |
| `unrealized_pnl` | numeric(28,10) | Unrealized profit/loss |
| `realized_pnl` | numeric(28,10) | Realized profit/loss |
| `fund_class` | text | Fund class |
| `is_active` | boolean | Whether position is active |

**CRITICAL**: This table has a **composite primary key** `(investor_id, fund_id)` - there is NO single `id` column. `current_value` is automatically maintained by the `trg_ledger_sync` trigger on `transactions_v2`.

#### `funds` - Fund Definitions

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Fund ID |
| `name` | text | Fund display name |
| `code` | text (UNIQUE) | Short code (e.g., "IND-BTC") |
| `asset` | asset_code enum | Base asset (BTC, USDT, etc.) |
| `status` | fund_status enum | active, paused, closed |
| `fee_bps` | integer | Performance fee in basis points (default 3000 = 30%) |
| `mgmt_fee_bps` | integer | Management fee (MUST be 0, enforced by CHECK constraint) |
| `min_investment` | numeric | Minimum investment amount |
| `lock_period_days` | integer | Lock-up period |
| `cooling_off_hours` | integer | Cooling off period for withdrawals |
| `large_withdrawal_threshold` | numeric | Amount triggering admin review |
| `description` | text | Fund description |
| `inception_date` | date | Fund inception date |

**Business Rule**: `mgmt_fee_bps = 0` enforced by database CHECK constraint (CFO policy: no management fees).

#### `profiles` - User Accounts

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK, linked to auth.users) | User ID |
| `email` | text | Email address |
| `first_name` | text | First name |
| `last_name` | text | Last name |
| `account_type` | account_type enum | `investor`, `ib`, `fees_account` |
| `is_admin` | boolean | Admin flag |
| `ib_parent_id` | uuid (FK -> profiles) | IB who referred this investor |
| `ib_commission_pct` | numeric | IB commission percentage |
| `fee_percentage` | numeric | Custom fee override (NULL = fund default) |
| `lock_until_date` | date | Lock-up expiry date |
| `last_crystallization_date` | date | Last yield crystallization date |
| `created_at` | timestamptz | Account creation (IMMUTABLE) |
| `updated_at` | timestamptz | Last update |

**Special Account**: `account_type = 'fees_account'` is the INDIGO platform account that receives FEE_CREDIT transactions and earns yield on its balance.

#### `yield_distributions` - Yield Distribution Events

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Distribution ID |
| `fund_id` | uuid (FK -> funds) | Fund |
| `period_start` | date | Period start date |
| `period_end` | date | Period end date |
| `gross_yield` | numeric(28,10) | Total gross yield |
| `total_net_amount` | numeric(28,10) | Total net to investors |
| `total_fee_amount` | numeric(28,10) | Total platform fees |
| `total_ib_amount` | numeric(28,10) | Total IB commissions |
| `dust_amount` | numeric(28,10) | Rounding residual |
| `purpose` | aum_purpose enum | `transaction` or `reporting` |
| `is_voided` | boolean | Soft delete |
| `created_by` | uuid | Admin who applied |
| `summary_json` | jsonb | Detailed calculation summary |

**PROTECTED TABLE**: Direct INSERT/UPDATE blocked by `enforce_canonical_yield_mutation` trigger. Must use `apply_adb_yield_distribution_v3()` RPC.

**UNIQUE Constraint**: `(fund_id, period_end, purpose)` prevents duplicate distributions.

#### `yield_allocations` - Per-Investor Yield Breakdown

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Allocation ID |
| `distribution_id` | uuid (FK -> yield_distributions) | Parent distribution |
| `investor_id` | uuid (FK -> profiles) | Investor |
| `gross_yield` | numeric(28,10) | Investor's gross yield share |
| `net_yield` | numeric(28,10) | Investor's net yield |
| `fee_amount` | numeric(28,10) | Fee deducted |
| `ib_amount` | numeric(28,10) | IB commission deducted |
| `adb` | numeric(28,10) | Average daily balance |
| `adb_share_pct` | numeric(28,10) | ADB weight percentage |

#### `fee_allocations` - Per-Investor Fee Records

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Fee allocation ID |
| `distribution_id` | uuid (FK -> yield_distributions) | Parent distribution |
| `investor_id` | uuid (FK -> profiles) | Investor |
| `fee_amount` | numeric(28,10) | Fee amount |
| `fee_percentage` | numeric | Fee percentage used |

#### `ib_allocations` - IB Commission Records

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | IB allocation ID |
| `distribution_id` | uuid (FK -> yield_distributions) | Parent distribution |
| `source_investor_id` | uuid | Referred investor |
| `ib_investor_id` | uuid | IB who earns commission |
| `ib_fee_amount` | numeric(28,10) | Commission amount |
| `ib_percentage` | numeric | Commission percentage |
| `source_net_income` | numeric(28,10) | Source investor's net yield |
| `effective_date` | date | Effective date |
| `payout_status` | text | `pending` or `paid` |
| `paid_at` | timestamptz | When paid |
| `is_voided` | boolean | Soft delete |

**IB Payout Rules**:
- Transaction purpose yields: `payout_status = 'pending'` (requires manual payout)
- Reporting purpose yields: `payout_status = 'paid'` with `paid_at` set automatically

#### `withdrawal_requests` - Withdrawal State Machine

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Request ID |
| `investor_id` | uuid (FK -> profiles) | Investor |
| `fund_id` | uuid (FK -> funds) | Fund |
| `requested_amount` | numeric(28,10) | Amount requested |
| `status` | withdrawal_status enum | pending, approved, rejected, processing, completed |
| `request_date` | date | Date of request |
| `approved_by` | uuid | Admin who approved |
| `approved_at` | timestamptz | Approval timestamp |
| `rejected_by` | uuid | Admin who rejected |
| `rejection_reason` | text | Rejection reason |
| `completed_at` | timestamptz | Completion timestamp |
| `notes` | text | Notes |

#### `fund_daily_aum` - Daily AUM Snapshots (Dual Track)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Record ID |
| `fund_id` | uuid (FK -> funds) | Fund |
| `aum_date` | date | Snapshot date |
| `total_aum` | numeric(28,10) | Total AUM |
| `purpose` | aum_purpose enum | `transaction` or `reporting` |
| `source` | text | How AUM was calculated |
| `created_at` | timestamptz | Creation timestamp |

**UNIQUE Constraint**: `(fund_id, aum_date, purpose)` - one AUM per fund per date per purpose.

**Dual AUM Explained** (Critical Knowledge - Currently Only Founder Understands):

| Purpose | When Used | Frequency | Example |
|---------|-----------|-----------|---------|
| `transaction` | Operational deposits, withdrawals, yield crystallization | Daily/real-time | Investor deposits 5 BTC, AUM updated immediately |
| `reporting` | Month-end regulatory snapshots, yield distribution for reports | Monthly | End-of-month AUM snapshot for investor statements |

The separation exists because:
1. Regulatory reporting may use different cutoff times than operational AUM
2. Month-end reporting AUM may differ from the real-time operational AUM
3. Different reconciliation requirements for each

#### `audit_log` - Immutable Audit Trail

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Log entry ID |
| `actor_user` | uuid | Who made the change |
| `action` | text | INSERT, UPDATE, DELETE |
| `entity` | text | Table name |
| `entity_id` | text | Record ID |
| `old_values` | jsonb | Changed fields (old values) - DELTA format |
| `new_values` | jsonb | Changed fields (new values) - DELTA format |
| `meta` | jsonb | Additional context |
| `created_at` | timestamptz | When logged |

**FULLY IMMUTABLE**: No UPDATE or DELETE allowed (enforced by trigger).
**Delta Format**: Only changed fields stored (80-90% storage savings vs full-row audit).

### 5.2 Database Enums

| Enum | Values | Used In |
|------|--------|---------|
| `tx_type` | DEPOSIT, WITHDRAWAL, YIELD, FEE_CREDIT, IB_CREDIT, DEPOSIT_REVERSAL, WITHDRAWAL_REVERSAL, YIELD_REVERSAL, FEE_REVERSAL, IB_REVERSAL, ADJUSTMENT | transactions_v2.type |
| `asset_code` | BTC, ETH, USDT, USDC, SOL, XRP | funds.asset, transactions_v2.asset |
| `fund_status` | active, paused, closed | funds.status |
| `withdrawal_status` | pending, approved, rejected, processing, completed | withdrawal_requests.status |
| `aum_purpose` | transaction, reporting | fund_daily_aum.purpose, yield_distributions.purpose |
| `account_type` | investor, ib, fees_account | profiles.account_type |
| `visibility_scope` | investor_visible, admin_only | transactions_v2.visibility_scope |
| `tx_source` | admin_manual, yield_distribution, ib_commission, fee_credit, deposit_crystallization, withdrawal_crystallization, void_reversal, system_adjustment, bulk_import, migration, correction, investor_request, auto_crystallization, scheduled | transactions_v2.tx_source |
| `investor_status` | active, pending, suspended, closed | profiles context |

### 5.3 Database Views (Integrity & Monitoring)

| View | Purpose | Expected Result |
|------|---------|-----------------|
| `v_ledger_reconciliation` | Position value vs SUM(transactions) | Empty = healthy |
| `fund_aum_mismatch` | Fund AUM vs SUM(investor positions) | Empty = healthy |
| `yield_distribution_conservation_check` | gross = net + fees + ib | Empty = healthy |
| `v_orphaned_positions` | Positions without valid profile/fund | Empty = healthy |
| `v_orphaned_transactions` | Transactions without valid profile | Empty = healthy |
| `v_fee_calculation_orphans` | Fee allocations without valid refs | Empty = healthy |
| `v_position_transaction_variance` | Detailed position vs ledger breakdown | Variance = 0 |
| `v_live_investor_balances` | Real-time balances across all funds | Informational |
| `v_investor_kpis` | Investor metrics (deposits, yields, fees) | Informational |
| `v_crystallization_dashboard` | Crystallization status per investor/fund | Informational |
| `v_security_definer_audit` | Audit SECURITY DEFINER functions | Security check |

**Health Check Query**:
```sql
-- Run daily. All should return empty results:
SELECT * FROM v_ledger_reconciliation WHERE ABS(drift_amount) > 0.01;
SELECT * FROM fund_aum_mismatch WHERE deviation_pct > 1.0;
SELECT * FROM yield_distribution_conservation_check;
SELECT * FROM v_orphaned_positions;
SELECT * FROM v_orphaned_transactions;
```

### 5.4 Database Triggers

#### Financial Triggers

| Trigger | Table | Event | Function | Purpose |
|---------|-------|-------|----------|---------|
| `trg_ledger_sync` | transactions_v2 | AFTER INSERT/UPDATE(is_voided) | `fn_ledger_drives_position()` | Auto-update position from ledger |
| `enforce_canonical_yield_mutation` | yield_distributions | BEFORE INSERT/UPDATE | `check_canonical_rpc_flag()` | Block direct DML |
| `sync_ib_allocations_from_commission_ledger` | ib_commission_ledger | AFTER INSERT | sync function | Auto-create ib_allocations |

#### Audit Triggers

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| `delta_audit_transactions_v2` | transactions_v2 | AFTER UPDATE | `audit_delta_trigger()` |
| `delta_audit_investor_positions` | investor_positions | AFTER UPDATE | `audit_delta_trigger()` |
| `delta_audit_yield_distributions` | yield_distributions | AFTER UPDATE | `audit_delta_trigger()` |
| `delta_audit_withdrawal_requests` | withdrawal_requests | AFTER UPDATE | `audit_delta_trigger()` |

#### Immutability Triggers

| Trigger | Table | Protected Fields |
|---------|-------|-----------------|
| `protect_transactions_immutable` | transactions_v2 | created_at, reference_id, investor_id, fund_id |
| `protect_profiles_created_at_immutability` | profiles | created_at |
| `protect_fee_allocations_immutable` | fee_allocations | created_at, distribution_id, investor_id |
| `protect_ib_allocations_immutable` | ib_allocations | created_at, distribution_id, source_investor_id, ib_investor_id |
| `protect_audit_log_immutable` | audit_log | ALL fields (no updates or deletes) |

### 5.5 RPC Functions (Stored Procedures)

#### Canonical Mutation RPCs

| RPC | Purpose | Tables Written | Security |
|-----|---------|---------------|----------|
| `apply_adb_yield_distribution_v3` | Apply ADB-based yield distribution | yield_distributions, yield_allocations, fee_allocations, ib_allocations, transactions_v2 | SECURITY DEFINER, advisory lock |
| `apply_transaction_with_crystallization` | Create transaction with optional yield crystallization | transactions_v2, investor_positions (trigger) | SECURITY DEFINER |
| `crystallize_yield_before_flow` | Distribute accrued yield before deposit/withdrawal | investor_yield_events, transactions_v2 | SECURITY DEFINER |
| `void_yield_distribution` | Void yield distribution + cascade | yield_distributions, yield_allocations, fee_allocations, ib_allocations, transactions_v2 | SECURITY DEFINER |
| `void_transaction` | Void a transaction | transactions_v2, investor_positions (trigger) | SECURITY DEFINER |
| `admin_create_transaction` | Simple transaction creation | transactions_v2, investor_positions (trigger) | SECURITY DEFINER |

#### Validation & Read RPCs

| RPC | Purpose | Returns |
|-----|---------|---------|
| `preview_adb_yield_distribution_v3` | Preview yield allocation (read-only) | jsonb |
| `validate_aum_against_positions` | Compare AUM to SUM(positions) | jsonb |
| `recalculate_fund_aum_for_date` | Rebuild AUM from positions | jsonb |
| `recompute_investor_position` | Rebuild position from ledger | void |
| `get_funds_with_aum` | Get funds with latest AUM | setof record |
| `is_admin` | Check admin status | boolean |
| `get_ib_referrals` | Get IB's referrals | setof record |
| `get_ib_referral_detail` | Get referral with ownership check | record |
| `get_ib_commission_summary` | IB commission aggregates | record |

---

## 6. Service Layer & Function Reference

### 6.1 Service Architecture

```
src/services/
  core/           -> API client, portfolio service, system health
  admin/          -> 40+ files: yields, transactions, investors, funds, fees, reports
  investor/       -> 10+ files: positions, portfolio, withdrawals, transactions
  shared/         -> 20+ files: profiles, notifications, audit, storage
  ib/             -> 4 files: commissions, referrals, allocations
  auth/           -> Auth service, invite service
  notifications/  -> Yield, deposit, withdrawal notifications
  reports/        -> Report engine, PDF/Excel generators
  api/            -> Reports API, statements API
  operations/     -> Operations service, position adjustments
  profile/        -> Profile settings service
```

### 6.2 Gateway Pattern

**Rule**: Never call `supabase.rpc()` or `supabase.from()` directly from components. Always go through the service layer.

```typescript
// CORRECT: Component -> Hook -> Service -> Supabase
const { data } = useInvestorPositions(investorId);
// Hook calls: investorPositionService.getInvestorPositions(investorId)
// Service calls: supabase.from('investor_positions').select(...)

// WRONG: Component -> Supabase directly
const { data } = await supabase.from('investor_positions').select('*');
```

**Type-Safe RPC Wrapper** (`src/lib/supabase/typedRPC.ts`):
```typescript
import { callRPC } from "@/lib/supabase/typedRPC";
const { data, error } = await callRPC("recompute_investor_position", {
  p_fund_id: fundId,
  p_investor_id: investorId
});
```

### 6.3 Key Service Functions by Domain

#### Yield Services (`src/services/admin/yield*.ts`)

| Function | File | Description | RPC/Query |
|----------|------|-------------|-----------|
| `previewYieldDistribution(input)` | yieldPreviewService.ts | Preview ADB yield allocation without committing | `preview_adb_yield_distribution_v3` |
| `applyYieldDistribution(input, adminId, purpose)` | yieldApplyService.ts | Apply yield distribution with all transactions | `apply_adb_yield_distribution_v3` |
| `voidYieldDistribution(distributionId, adminId, reason)` | yieldDistributionService.ts | Void yield distribution and cascade | `void_yield_distribution` |
| `getFundAUMHistory(fundId, startDate?, endDate?)` | yieldHistoryService.ts | Get historical AUM snapshots | `fund_daily_aum` table query |
| `getLatestFundAUM(fundId)` | yieldHistoryService.ts | Get most recent AUM for fund | `fund_daily_aum` table query |
| `getCurrentFundAUM(fundId)` | yieldHistoryService.ts | Get current AUM | `fund_daily_aum` table query |
| `getFundInvestorCompositionWithYield(fundId)` | yieldHistoryService.ts | Get investor breakdown with yield data | Multiple queries |
| `getActiveFundsWithAUM()` | yieldHistoryService.ts | Get all active funds with their AUM | `get_funds_with_aum` RPC |
| `crystallizeYieldBeforeFlow(params)` | yieldCrystallizationService.ts | Crystallize before deposit/withdrawal | `crystallize_yield_before_flow` |

#### Transaction Services (`src/services/admin/transaction*.ts`)

| Function | File | Description | RPC/Query |
|----------|------|-------------|-----------|
| `getTransactions(filters)` | transactionDetailsService.ts | Get filtered transaction list | `transactions_v2` table query with joins |
| `getTransactionById(txId)` | transactionDetailsService.ts | Get single transaction detail | `transactions_v2` table query |
| `voidTransaction(txId, adminId, reason)` | transactionDetailsService.ts | Void a transaction | `void_transaction` RPC |
| `voidAndReissueTransaction(params)` | transactionDetailsService.ts | Void + create corrected transaction | `void_transaction` + `admin_create_transaction` RPCs |
| `updateTransaction(params)` | transactionDetailsService.ts | Update non-immutable transaction fields | `transactions_v2` table update |
| `getInvestorTransactions(investorId, limit?)` | transactionsV2Service.ts | Get investor's transactions | `transactions_v2` table query |
| `getTransactionSummary(investorId, fundId?)` | transactionsV2Service.ts | Aggregate transaction stats | Aggregate query |

#### Position Services (`src/services/investor/investorPositionService.ts`)

| Function | Description | RPC/Query |
|----------|-------------|-----------|
| `getInvestorPositions(investorId)` | Get investor's fund positions with fund details | `investor_positions` + `funds` join |
| `getUserPositions(userId)` | Get positions for current user | `investor_positions` + `funds` join |
| `fetchInvestorPositions(investorId)` | Raw position rows | `investor_positions` direct query |
| `getPositionsByFund(fundId)` | All investor positions in a fund | `investor_positions` filtered by fund |
| `getTotalAUM()` | Sum of all active positions | Aggregate query |
| `getActiveInvestorCount()` | Count investors with active positions | Count query |
| `fetchInvestorsForSelector(includeSystemAccounts?)` | Investor dropdown data | `profiles` filtered query |
| `getAllInvestorsExpertSummary()` | All investors with full metrics | `profiles` + `investor_positions` + `transactions_v2` |
| `getInvestorExpertView(investorId)` | Single investor expert view | Complex multi-table query |
| `checkAdminStatus()` | Check if current user is admin | `is_admin` RPC |

#### Profile Services (`src/services/shared/profileService.ts`)

| Function | Description | RPC/Query |
|----------|-------------|-----------|
| `getById(profileId)` | Get profile summary | `profiles` table query |
| `getProfileById(profileId)` | Get raw profile | `profiles` table query |
| `getAllProfiles()` | List all profiles | `profiles` table query |
| `getActiveInvestors()` | Get active investor profiles | `profiles` filtered query |
| `getActiveFunds()` | Get active funds | `funds` table query |
| `getMyProfile()` | Get current user's profile | `profiles` where id = auth.uid() |
| `updateFeePercentage(investorId, feePct)` | Set custom fee override | `profiles` table update |
| `getInvestorsForTransaction()` | Get investors for transaction form | `profiles` + `investor_positions` |

#### Fund Services (`src/services/admin/fundService.ts`)

| Function | Description | RPC/Query |
|----------|-------------|-----------|
| `getAllFunds()` | Get all funds | `funds` table query |
| `getFundById(fundId)` | Get fund by ID | `funds` table query |
| `getActiveFunds()` | Get active funds only | `funds` filtered by status |
| `createFund(fundData)` | Create new fund | `funds` table insert |
| `updateFund(fundId, fundData)` | Update fund | `funds` table update |
| `deleteFund(fundId)` | Delete fund | `funds` table delete |

#### IB Services (`src/services/ib/ibService.ts`)

| Function | Description | RPC/Query |
|----------|-------------|-----------|
| `getCommissionSummary(ibId, startDate?)` | Aggregate commission stats | `get_ib_commission_summary` RPC |
| `getTopReferrals(ibId, startDate?, limit?)` | Top referrals by AUM | `get_ib_referrals` RPC |
| `getReferralCount(ibId)` | Count of referrals | `get_ib_referral_count` RPC |
| `getReferrals(ibId, page, pageSize)` | Paginated referral list | `get_ib_referrals` RPC |
| `getReferralDetail(referralId, ibId)` | Referral with ownership check | `get_ib_referral_detail` RPC |
| `getReferralPositions(investorId)` | Referral's fund positions | `investor_positions` query |
| `getReferralCommissions(referralId, ibId, limit?)` | Commission history for referral | `ib_allocations` query |
| `getCommissions(ibId, page, pageSize, dateRange?)` | Full commission history | `ib_allocations` query |
| `getAllocations(ibId)` | All allocations | `ib_allocations` query |
| `getIBPositions(ibId)` | IB's own fund positions | `investor_positions` query |
| `getPayoutHistory(ibId, page, pageSize, statusFilter)` | Payout history | `ib_allocations` filtered |
| `getYieldOnBalance(ibId)` | Yield earned on IB's own balance | `transactions_v2` filtered |
| `getIBProfile(ibId)` | IB profile | `profiles` query |
| `updateIBProfile(ibId, data)` | Update IB profile | `profiles` update |

#### Fee Services (`src/services/admin/feesService.ts`)

| Function | Description | RPC/Query |
|----------|-------------|-----------|
| `getFeeTransactions(filters)` | Fee credit transaction history | `transactions_v2` filtered by FEE_CREDIT |
| `getFeesBalance()` | Current fees account balance | `investor_positions` for fees_account |
| `getFeeSchedule(investorId, fundId)` | Get investor's fee schedule | `investor_fee_schedule` query |

#### Withdrawal Services

| Function | File | Description | RPC/Query |
|----------|------|-------------|-----------|
| `createWithdrawalRequest(params)` | investorWithdrawalService.ts | Submit new request | `withdrawal_requests` insert |
| `getWithdrawalHistory(investorId)` | investorWithdrawalService.ts | Get investor's withdrawals | `withdrawal_requests` query |
| `approveWithdrawal(requestId, adminId)` | approvalService.ts | Approve request | `withdrawal_requests` update |
| `rejectWithdrawal(requestId, adminId, reason)` | approvalService.ts | Reject request | `withdrawal_requests` update |
| `getWithdrawals(filters)` | shared withdrawals | Admin view of all withdrawals | `withdrawal_requests` query |

#### Integrity Services (`src/services/admin/integrityService.ts`)

| Function | Description | RPC/Query |
|----------|-------------|-----------|
| `runLedgerReconciliation()` | Check positions vs ledger | `v_ledger_reconciliation` view |
| `runAumReconciliation()` | Check AUM vs positions | `fund_aum_mismatch` view |
| `runConservationCheck()` | Check yield conservation | `yield_distribution_conservation_check` view |
| `runOrphanCheck()` | Check for orphaned records | Multiple orphan views |
| `getIntegritySummary()` | Combined integrity report | All integrity views |

#### Audit Services (`src/services/shared/auditLogService.ts`)

| Function | Description | RPC/Query |
|----------|-------------|-----------|
| `getAuditLogs(filters)` | Get filtered audit entries | `audit_log` query |
| `getEntityHistory(entityType, entityId)` | Get change history for entity | `audit_log` filtered |
| `getActorActions(actorId)` | Get all actions by user | `audit_log` filtered |

#### Report Services (`src/services/admin/reportService.ts`)

| Function | Description | RPC/Query |
|----------|-------------|-----------|
| `generateInvestorReport(investorId, period)` | Generate investor report | Multiple queries |
| `getReportHistory()` | List generated reports | Reports table query |
| `getDeliveryStatus()` | Email delivery tracking | Delivery tracking query |
| `retryDelivery(reportId)` | Retry failed delivery | Delivery service call |

#### Notification Services (`src/services/notifications/`)

| Function | File | Description |
|----------|------|-------------|
| `notifyYieldDistribution(distribution)` | yieldNotifications.ts | Notify investors of yield |
| `notifyDeposit(transaction)` | depositNotifications.ts | Notify on deposit |
| `notifyWithdrawalStatusChange(request)` | withdrawalNotifications.ts | Notify on withdrawal status |

---

## 7. Security & Access Control

### 7.1 Authentication Flow

```
1. User enters email/password
2. Supabase Auth validates credentials
3. JWT token issued with user ID
4. AuthProvider stores session in React context
5. useUserRole() queries user_roles table
6. Router redirects to appropriate portal
```

### 7.2 Row Level Security (RLS)

**Every table has RLS enabled.** No exceptions.

| Table | Admin Policy | User Policy |
|-------|-------------|-------------|
| `transactions_v2` | ALL operations | SELECT own + `visibility_scope = 'investor_visible'` |
| `investor_positions` | ALL operations | SELECT own |
| `withdrawal_requests` | ALL operations | INSERT/SELECT/UPDATE own (pending only) |
| `yield_distributions` | ALL operations | None (admin only) |
| `yield_allocations` | ALL operations | None (admin only) |
| `fee_allocations` | ALL operations | None (admin only) |
| `ib_allocations` | ALL operations | SELECT own (IB) |
| `audit_log` | SELECT only | None |
| `profiles` | ALL operations | SELECT/UPDATE own |
| `funds` | ALL operations | SELECT all |
| `notifications` | ALL operations | SELECT/UPDATE own |

### 7.3 RLS Helper Function

```sql
CREATE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
$$ SECURITY DEFINER SET search_path = public;
```

All SECURITY DEFINER functions set `search_path = public` to prevent search-path injection.

### 7.4 Frontend Route Guards

| Guard | Component | Check |
|-------|-----------|-------|
| `ProtectedRoute` | Any auth page | `user !== null` |
| `AdminRoute` | `/admin/*` | `isAdmin \|\| isSuperAdmin` |
| `InvestorRoute` | `/investor/*` | `!isIB \|\| isAdmin` |
| `IBRoute` | `/ib/*` | `isIB === true` |
| `SuperAdminGuard` | Admin settings | `isSuperAdmin === true` |

### 7.5 Security Patterns

| Pattern | Implementation | Purpose |
|---------|---------------|---------|
| Canonical Mutations | RPC guard trigger blocks direct DML | Prevent bypassing business logic |
| Advisory Locks | `pg_advisory_xact_lock()` on fund+date | Prevent race conditions |
| Immutable Fields | Trigger blocks changes to protected columns | Prevent tampering |
| Delta Audit | Only changed fields logged | Storage-efficient audit trail |
| Reference ID | UNIQUE constraint for idempotency | Prevent duplicate transactions |
| Visibility Scope | `admin_only` transactions hidden from investors | Data separation |

### 7.6 Protected Tables

| Table | Protection | Why |
|-------|-----------|-----|
| `investor_positions` | Ledger-driven trigger only | Derived from transactions, direct changes break conservation |
| `yield_distributions` | Canonical RPC guard | Complex multi-table mutation, must be atomic |
| `audit_log` | Full immutability trigger | Audit integrity, regulatory requirement |
| `transactions_v2` | Immutable key fields + audit | Ledger of record |
| `fee_allocations` | Immutable key fields | Tied to yield distributions |
| `ib_allocations` | Immutable key fields | Tied to yield distributions |

---

## 8. Financial Engine Deep Dive

### 8.1 The Yield Waterfall

```
Gross Yield (New AUM - Previous AUM)
  |
  +-- Platform Fee = gross_yield * fee_pct (default 30%)
  |     |
  |     +-- IB Commission = gross_yield * ib_pct (from gross, not net)
  |     |     -> IB earns commission from the gross yield
  |     |     -> Platform receives: fee_amount - ib_amount
  |     |
  |     +-- Remaining fee -> INDIGO fees_account
  |
  +-- Dust (rounding residual) -> fees_account
  |
  +-- Net Yield = gross_yield - fee_amount
        -> Credited to investor's position
```

**Conservation Identity** (must ALWAYS hold):
```
gross_yield = total_net_amount + total_fee_amount + total_ib_amount + dust_amount
```

### 8.2 ADB (Average Daily Balance) Allocation

ADB is the **permanent and only** allocation method. It ensures fair yield distribution when investors deposit or withdraw mid-period.

**How ADB Works**:
1. For each investor, calculate their daily balance over the yield period
2. Sum all daily balances = ADB
3. Each investor's share = their ADB / total fund ADB
4. Distribute gross yield proportionally

**Example**:
- Fund has 2 investors: Alice (100 BTC from day 1) and Bob (50 BTC from day 15)
- Period: 30 days, Gross yield: 3 BTC
- Alice ADB: 100 * 30 = 3000
- Bob ADB: 50 * 16 = 800 (deposited day 15, so 16 days)
- Total ADB: 3800
- Alice yield: 3 * (3000/3800) = 2.368 BTC
- Bob yield: 3 * (800/3800) = 0.632 BTC

### 8.3 Crystallization

**What**: Distributing accrued yield before a deposit or withdrawal.

**Why**: Without crystallization, a new depositor would receive credit for yield earned before their deposit.

**When**: Automatically triggered before every deposit and withdrawal via `crystallize_yield_before_flow()`.

**Flow**:
1. Investor requests deposit/withdrawal
2. System calls `crystallize_yield_before_flow()`
3. Calculates accrued yield since last crystallization
4. Creates YIELD transactions for all investors in the fund
5. Proceeds with the deposit/withdrawal

### 8.4 Fee Calculation

```
IF gross_yield > 0:
  fee_amount = gross_yield * (investor_fee_pct / 100)
  # investor_fee_pct from profiles.fee_percentage, or fund default (fee_bps/100)

  IF investor has IB parent:
    ib_amount = gross_yield * (ib_commission_pct / 100)
  ELSE:
    ib_amount = 0

  net_yield = gross_yield - fee_amount
  # Note: IB amount comes FROM the fee, not additionally

ELSE (loss):
  fee_amount = 0
  ib_amount = 0
  net_yield = gross_yield  # Full loss to investor
```

**Fee Hierarchy** (per investor):
1. `profiles.fee_percentage` (custom override) - if set, uses this
2. `investor_fee_schedule` table (date-based schedule) - if exists
3. `funds.fee_bps / 100` (fund default) - fallback

### 8.5 Dual AUM System

| Aspect | Transaction Purpose | Reporting Purpose |
|--------|-------------------|-------------------|
| **When used** | Every deposit/withdrawal/yield | End-of-month snapshots |
| **Frequency** | Real-time | Monthly |
| **Drives** | Operational decisions | Investor statements |
| **Updated by** | Transaction RPCs | Admin manual entry |
| **Reconciliation** | Against live positions | Against month-end positions |

**Critical Knowledge Gap**: This dual-track system is currently understood only by the founder. New team members will need training on when each purpose applies.

### 8.6 Financial Precision

| Layer | Precision | Tool |
|-------|-----------|------|
| PostgreSQL | NUMERIC(28,10) | Native decimal arithmetic |
| TypeScript | string type for amounts | Prevents float coercion |
| Calculations | Decimal.js library | Arbitrary precision |
| Display | FinancialValue component | Formatted with locale |

**Dust Tolerances** (per asset):

| Asset | Tolerance | Example |
|-------|-----------|---------|
| BTC, ETH | 0.00000001 | 1 satoshi / 1 wei |
| SOL, XRP | 0.000001 | 1 lamport |
| USDT, USDC | 0.0001 | 0.01 cents |

### 8.7 Idempotency Pattern

Every financial mutation uses a deterministic `reference_id`:

| Operation | Reference ID Pattern |
|-----------|---------------------|
| Deposit | `deposit-{date}-{investor_id}-{fund_id}` |
| Withdrawal | `withdrawal-{request_id}` |
| Yield | `yield-{distribution_id}-{investor_id}` |
| Fee Credit | `fee_credit-{distribution_id}` |
| IB Credit | `ib_credit-{distribution_id}-{source_investor_id}` |

UNIQUE constraint on `reference_id` prevents duplicate transactions even if the RPC is called twice.

---

## 9. Risk Assessment & Dead Code Flags

### 9.1 Financial Risks (CFO Perspective)

| Risk | Severity | Current Mitigation | Recommendation |
|------|----------|-------------------|----------------|
| Yield miscalculation | CRITICAL | Conservation check view, preview before apply | Add automated test suite for edge cases (zero AUM, single investor, negative yield) |
| Position drift | CRITICAL | `v_ledger_reconciliation` view, `trg_ledger_sync` trigger | Add scheduled cron job to run reconciliation every 6 hours |
| Double-spend on withdrawals | HIGH | Balance check at request + approval, advisory locks | Add pessimistic locking on withdrawal approval |
| Rounding/dust accumulation | MEDIUM | Dust routed to fees_account, asset-aware tolerances | Monitor dust accumulation over time, alert if > threshold |
| Negative yield mishandling | HIGH | No fees on losses (code enforced) | Add explicit test: negative yield distribution creates no fee transactions |

### 9.2 Technical Risks (CTO Perspective)

| Risk | Severity | Description | Recommendation |
|------|----------|-------------|----------------|
| Solo founder dependency | CRITICAL | All knowledge in one person's head | This document + automated runbooks |
| Service layer complexity | HIGH | 90+ service files, hard to navigate | Consolidate by domain, reduce file count |
| Inconsistent patterns | HIGH | Some services use RPC gateway, some call supabase directly | Standardize all through `callRPC()` |
| Test coverage gaps | HIGH | No automated tests for critical financial flows | Prioritize: yield distribution, deposit, withdrawal, void |
| Frontend state management | MEDIUM | React Query patterns inconsistent across portals | Standardize query key factory, invalidation patterns |
| IB code overhead | LOW | IB system may be deprecated but adds complexity | Flag for removal if decision confirmed |

### 9.3 Potential Dead Code / Unused Features

Based on analysis, the following areas may contain unused or partially implemented code:

| Area | Files | Evidence | Action Needed |
|------|-------|----------|---------------|
| Training/Onboarding pages | `/admin/onboarding` | Single route, may be placeholder | Verify if used |
| Maintenance page | `/admin/maintenance` | Generic tools page | Verify utility |
| Duplicate detection | `/admin/duplicates` | May be fully automated now | Check if manual UI needed |
| Bypass attempts page | `/admin/bypass-attempts` | Logs trigger blocks, may be low traffic | Check usage frequency |
| Custom reports | `/reports/custom` | May not be fully implemented | Verify completeness |
| Bulk operations service | `bulkOperationsService.ts` | May not be called from UI | Trace usage |
| Command palette service | `commandPaletteService.ts` | UI may not expose this | Trace usage |
| Operations hub service | `operationsHubService.ts` | May overlap with admin dashboard | Check for duplication |
| Position adjustment service | `positionAdjustmentService.ts` | Direct adjustments should be via ledger now | May be legacy |
| Report engine files | `reportEngine.ts`, `pdfGenerator.ts`, `excelGenerator.ts` | May not be fully connected | Trace usage |
| API layer | `reportsApi.ts`, `statementsApi.ts` | May be for future API endpoints | Verify if active |

### 9.4 UX Risk Assessment

| Issue | Severity | Detail | Recommendation |
|-------|----------|--------|----------------|
| Portal complexity | HIGH | Early investor feedback: "too complex/confusing" | Simplify investor dashboard, progressive disclosure |
| Information overload | MEDIUM | Too many numbers/metrics shown at once | Prioritize key metrics, hide advanced data behind tabs |
| Dual AUM confusion | HIGH | Even admins may not understand transaction vs reporting | Add tooltips, workflow guides, contextual help |
| IB portal maintenance | LOW | If IB deprecated, portal becomes dead code | Decide and either commit or remove |

---

## 10. Recommendations & Prioritized Roadmap

### Priority 1: CRITICAL (Do Now)

#### 1.1 Automated Financial Test Suite
- **What**: Write automated tests for every yield distribution scenario
- **Why**: Yield miscalculation is the #1 financial risk
- **Tests needed**:
  - Single investor, positive yield
  - Multiple investors, positive yield (verify ADB allocation)
  - Zero AUM fund (edge case)
  - Negative yield (verify no fees)
  - Mid-period deposit + yield
  - Mid-period withdrawal + yield
  - Conservation check validation
  - Dust handling verification
- **Effort**: Medium (2-3 days)

#### 1.2 Scheduled Integrity Checks
- **What**: Set up pg_cron to run `v_ledger_reconciliation` and `fund_aum_mismatch` every 6 hours
- **Why**: Currently only runs when admin checks manually
- **Implementation**: Add cron job in Supabase, alert via email/Slack if violations found
- **Effort**: Small (1 day)

#### 1.3 Knowledge Transfer Documentation
- **What**: This document (you're reading it)
- **Why**: Solo founder dependency is the #1 operational risk
- **Status**: In progress

### Priority 2: HIGH (Do This Month)

#### 2.1 Service Layer Consolidation
- **What**: Reduce 90+ service files to ~40 by merging small, related files
- **Why**: Service complexity is making maintenance hard
- **Approach**:
  - Merge `yieldPreviewService` + `yieldApplyService` + `yieldHistoryService` -> `yieldService.ts`
  - Merge `investorDetailService` + `investorLifecycleService` + `investorSettingsService` -> `investorAdminService.ts`
  - Merge `transactionDetailsService` + `transactionFormDataService` -> `transactionService.ts`
  - Merge small services (< 100 lines) into their domain service
- **Effort**: Medium (3-4 days)

#### 2.2 Standardize Supabase Access Patterns
- **What**: Ensure ALL RPC calls go through `callRPC()`, not direct `supabase.rpc()`
- **Why**: 4 files (mostly IB services) still use direct `supabase.rpc()` calls
- **Files to fix**: `ib/ibService.ts`, `ib/allocations.ts`, `ib/referrals.ts`, `admin/integrityService.ts`
- **Effort**: Small (1 day)

#### 2.3 Investor Portal Simplification
- **What**: Redesign investor dashboard for clarity
- **Why**: Early feedback: "too complex/confusing"
- **Approach**:
  - Show 3 key numbers prominently: Total Value, This Month's Yield, Available Balance
  - Move detailed analytics behind "View Details" links
  - Simplify navigation to 4 items: Portfolio, Transactions, Withdraw, Settings
  - Add contextual tooltips explaining financial terms
- **Effort**: Medium (3-4 days)

#### 2.4 Dead Code Audit
- **What**: Trace all potentially unused features identified in Section 9.3
- **Why**: Dead code increases maintenance burden and confusion
- **Approach**: For each flagged item, trace from UI -> hook -> service to verify if it's reachable
- **Effort**: Small (1-2 days)

### Priority 3: MEDIUM (Do This Quarter)

#### 3.1 IB System Decision
- **What**: Decide whether to keep, simplify, or deprecate the IB system
- **Why**: IB is flagged as "may deprecate" but the code adds significant complexity
- **Options**:
  - **Keep**: If IBs are part of the growth strategy, invest in the system
  - **Simplify**: Remove IB portal, keep backend tracking, admin manages payouts
  - **Deprecate**: Remove all IB code (services, hooks, routes, DB tables)
- **Impact**: Removing IB would eliminate ~15% of codebase complexity

#### 3.2 Yield Engine Refactor
- **What**: Simplify the yield distribution pipeline
- **Why**: CTO identified this as #1 redesign target
- **Approach**:
  - Reduce number of RPCs (combine preview + apply into one with dry_run flag)
  - Simplify crystallization trigger (make it more transparent)
  - Better error messages when conservation check fails
  - Add "undo last yield" quick action
- **Effort**: Large (1-2 weeks)

#### 3.3 React Query Standardization
- **What**: Create consistent patterns for all React Query usage
- **Why**: Inconsistent patterns across portals
- **Approach**:
  - Standardize query key factory in `queryKeys.ts`
  - Create shared mutation patterns with automatic invalidation
  - Document cache invalidation rules per mutation
- **Effort**: Medium (3-4 days)

#### 3.4 Dual AUM Training & Documentation
- **What**: Create detailed operational guide for dual AUM system
- **Why**: Only founder understands when to use `transaction` vs `reporting` purpose
- **Deliverable**: Step-by-step guide with decision tree:
  - "Processing a deposit?" -> Use `transaction` purpose
  - "Generating month-end statements?" -> Use `reporting` purpose
  - "Running yield distribution?" -> Check admin UI purpose selector
- **Effort**: Small (1 day)

### Priority 4: LOW (Backlog)

#### 4.1 TypeScript Financial Type Migration
- **What**: Migrate financial amount types from `number` to `string` in interfaces
- **Why**: Known limitation - `number` type has IEEE 754 precision limits
- **Risk if delayed**: Low (all calculations done in PostgreSQL/Decimal.js anyway)
- **Effort**: Large (1 week, many files to update)

#### 4.2 Admin Dashboard Redesign
- **What**: Redesign admin dashboard with real integrity view data
- **Why**: Currently uses direct queries + JS functions instead of the 12 database integrity views
- **Effort**: Medium (3-4 days)

#### 4.3 Mobile Responsiveness
- **What**: Improve mobile experience for investor portal
- **Why**: Investors may want to check portfolio on mobile
- **Effort**: Medium (3-4 days)

---

## 11. Appendix: Complete Function Inventory

### 11.1 Admin Yield Services

**File: `src/services/admin/yieldPreviewService.ts`**

| Function | Params | Returns | RPC/Query | Called By |
|----------|--------|---------|-----------|----------|
| `previewYieldDistribution` | `{ fundId, periodStart, periodEnd, grossYieldAmount, purpose }` | `Promise<YieldCalculationResult>` | `preview_adb_yield_distribution_v3` | YieldOperationsPage |

**File: `src/services/admin/yieldApplyService.ts`**

| Function | Params | Returns | RPC/Query | Called By |
|----------|--------|---------|-----------|----------|
| `applyYieldDistribution` | `{ fundId, periodStart, periodEnd, grossYieldAmount, purpose }, adminId` | `Promise<YieldCalculationResult>` | `apply_adb_yield_distribution_v3` | YieldOperationsPage |

**File: `src/services/admin/yieldDistributionService.ts`**

| Function | Params | Returns | RPC/Query | Called By |
|----------|--------|---------|-----------|----------|
| `voidYieldDistribution` | `distributionId, adminId, reason` | `Promise<void>` | `void_yield_distribution` | YieldDistributionsPage |
| `getYieldDistributions` | `filters` | `Promise<YieldDistribution[]>` | `yield_distributions` query | YieldDistributionsPage |

**File: `src/services/admin/yieldHistoryService.ts`**

| Function | Params | Returns | RPC/Query | Called By |
|----------|--------|---------|-----------|----------|
| `getFundAUMHistory` | `fundId, startDate?, endDate?` | `Promise<FundDailyAUM[]>` | `fund_daily_aum` query | YieldOperationsPage |
| `getLatestFundAUM` | `fundId` | `Promise<FundDailyAUM \| null>` | `fund_daily_aum` query | Multiple admin pages |
| `getCurrentFundAUM` | `fundId` | `Promise<number>` | `fund_daily_aum` query | Dashboard |
| `saveDraftAUMEntry` | `fundId, aumData` | `Promise<void>` | `fund_daily_aum` insert | YieldOperationsPage |
| `getActiveFundsWithAUM` | - | `Promise<Fund[]>` | `get_funds_with_aum` RPC | Fund pages |
| `getFundInvestorCompositionWithYield` | `fundId` | `Promise<any>` | Multiple queries | YieldOperationsPage |
| `getStatementPeriodId` | `year, month` | `Promise<string \| null>` | Period query | Report pages |
| `getInvestorPositionsWithFunds` | `investorIds` | `Promise<any>` | Position + fund join | Report pages |

**File: `src/services/admin/yieldManagementService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| Various orchestration functions | - | - | Workflow coordination for yield operations |

**File: `src/services/admin/yieldCrystallizationService.ts`**

| Function | Params | Returns | RPC/Query | Called By |
|----------|--------|---------|-----------|----------|
| `crystallizeYieldBeforeFlow` | `{ fundId, closingAum, triggerType, triggerReference, adminId, purpose }` | `Promise<any>` | `crystallize_yield_before_flow` | Transaction RPCs |
| `finalizeMonthYield` | `fundId, year, month, adminId` | `Promise<void>` | Multiple RPCs | Admin yield page |

**File: `src/services/admin/yieldCorrectionService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| Correction workflow functions | - | - | Handle yield distribution corrections |

**File: `src/services/admin/yieldReportsService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getInvestorPerformanceForPeriod` | `investorId, periodId` | `Promise<any>` | Performance data for reports |
| `getInvestorFeeSchedule` | `investorId, fundId` | `Promise<any>` | Fee schedule for reports |
| `getInvestorMonthlyReports` | `investorId, reportMonth` | `Promise<any[]>` | Monthly report data |
| `createMonthlyReportTemplate` | `investorId, periodId` | `Promise<any>` | Create report template |
| `updateMonthlyReportField` | `reportId, field, value` | `Promise<void>` | Update report field |

### 11.2 Admin Transaction Services

**File: `src/services/admin/transactionDetailsService.ts`**

| Function | Params | Returns | RPC/Query | Called By |
|----------|--------|---------|-----------|----------|
| `getTransactions` | `filters: AdminTransactionFilters` | `Promise<AdminTransactionResult>` | `transactions_v2` with joins | AdminTransactionsPage |
| `getTransactionById` | `transactionId` | `Promise<TransactionViewModel \| null>` | `transactions_v2` query | TransactionDetailView |
| `voidTransaction` | `{ txId, adminId, reason }` | `Promise<void>` | `void_transaction` RPC | VoidTransactionDialog |
| `voidAndReissueTransaction` | `{ txId, adminId, reason, newParams }` | `Promise<VoidAndReissueResult>` | `void_transaction` + `admin_create_transaction` | TransactionCorrection |
| `updateTransaction` | `{ txId, fields }` | `Promise<void>` | `transactions_v2` update | TransactionEditForm |

**File: `src/services/admin/transactionFormDataService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getTransactionFormData` | - | `Promise<FormData>` | Data for transaction form (investors, funds) |

**File: `src/services/admin/depositWithYieldService.ts`**

| Function | Params | Returns | RPC/Query |
|----------|--------|---------|-----------|
| `applyDepositWithCrystallization` | `{ investorId, fundId, amount, date, adminId }` | `Promise<any>` | `apply_transaction_with_crystallization` |

### 11.3 Admin Investor Services

**File: `src/services/admin/investorDetailService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getInvestorDetail` | `investorId` | `Promise<InvestorDetail>` | Full investor profile + positions |
| `getInvestorLedger` | `investorId` | `Promise<LedgerEntry[]>` | Investor transaction ledger |

**File: `src/services/admin/investorLifecycleService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getLifecycleStatus` | `investorId` | `Promise<LifecycleStatus>` | Onboarding/active/offboarding status |
| `updateLifecycleStep` | `investorId, step` | `Promise<void>` | Progress lifecycle |

**File: `src/services/admin/investorSettingsService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `updateInvestorSettings` | `investorId, settings` | `Promise<void>` | Update investor preferences |
| `setFeeOverride` | `investorId, feePct` | `Promise<void>` | Set custom fee |

**File: `src/services/admin/investorWizardService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `createInvestor` | `wizardData` | `Promise<Profile>` | Full investor creation wizard |

**File: `src/services/admin/investorPerformanceService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getPerformanceMetrics` | `investorId` | `Promise<PerformanceMetrics>` | ROI, yield history, etc. |

### 11.4 Admin Fund & AUM Services

**File: `src/services/admin/fundService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getAllFunds` | - | `Promise<Fund[]>` | List all funds |
| `getFundById` | `fundId` | `Promise<Fund \| null>` | Get fund |
| `getActiveFunds` | - | `Promise<Fund[]>` | Active funds only |
| `createFund` | `fundData` | `Promise<Fund>` | Create fund |
| `updateFund` | `fundId, data` | `Promise<Fund>` | Update fund |
| `deleteFund` | `fundId` | `Promise<void>` | Delete fund |

**File: `src/services/admin/fundAumEventService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `recordAumEvent` | `fundId, aum, purpose` | `Promise<void>` | Record AUM snapshot |

**File: `src/services/admin/fundDailyAumService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getDailyAum` | `fundId, date, purpose` | `Promise<number>` | Get AUM for date |

**File: `src/services/admin/aumReconciliationService.ts`**

| Function | Params | Returns | RPC/Query |
|----------|--------|---------|-----------|
| `recalculateFundAum` | `fundId, date` | `Promise<any>` | `recalculate_fund_aum_for_date` |
| `validateAumAgainstPositions` | `fundId` | `Promise<any>` | `validate_aum_against_positions` |

### 11.5 Admin System Services

**File: `src/services/admin/adminStatsService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getDashboardStats` | - | `Promise<DashboardStats>` | Total AUM, investor count, etc. |

**File: `src/services/admin/integrityService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `runLedgerReconciliation` | - | `Promise<Violation[]>` | Position vs ledger check |
| `runAumReconciliation` | - | `Promise<Violation[]>` | AUM vs positions check |
| `runConservationCheck` | - | `Promise<Violation[]>` | Yield conservation check |
| `runOrphanCheck` | - | `Promise<Violation[]>` | Orphaned record check |
| `getIntegritySummary` | - | `Promise<IntegritySummary>` | Combined report |

**File: `src/services/admin/reconciliationService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `reconcilePosition` | `investorId, fundId` | `Promise<void>` | Fix position from ledger |

**File: `src/services/admin/approvalService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `approveWithdrawal` | `requestId, adminId` | `Promise<void>` | Approve withdrawal |
| `rejectWithdrawal` | `requestId, adminId, reason` | `Promise<void>` | Reject withdrawal |

### 11.6 Admin Report & Communication Services

**File: `src/services/admin/reportService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `generateInvestorReport` | `investorId, period` | `Promise<Report>` | Generate report |
| `getReportHistory` | `filters` | `Promise<Report[]>` | Report history |

**File: `src/services/admin/reportQueryService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `queryReportData` | `params` | `Promise<ReportData>` | Query report data |

**File: `src/services/admin/reportRecipientsService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getRecipients` | `reportId` | `Promise<Recipient[]>` | Get report recipients |

**File: `src/services/admin/statementAdminService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `generateStatement` | `investorId, period` | `Promise<Statement>` | Generate statement |

**File: `src/services/admin/emailTrackingService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getDeliveryStatus` | `reportId` | `Promise<DeliveryStatus>` | Email delivery tracking |
| `retryDelivery` | `reportId` | `Promise<void>` | Retry failed delivery |

**File: `src/services/admin/deliveryService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `deliver` | `report, recipients` | `Promise<DeliveryResult>` | Send report to recipients |

### 11.7 Admin Fee & IB Management Services

**File: `src/services/admin/feesService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getFeeTransactions` | `filters` | `Promise<Transaction[]>` | Fee credit history |
| `getFeesBalance` | - | `Promise<Balance>` | Current fees balance |

**File: `src/services/admin/feeScheduleService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getFeeSchedule` | `investorId, fundId` | `Promise<FeeSchedule>` | Get fee schedule |
| `setFeeSchedule` | `investorId, fundId, feePct, effectiveDate` | `Promise<void>` | Set fee schedule |

**File: `src/services/admin/ibUsersService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getIBUsers` | - | `Promise<IBUser[]>` | List all IBs |
| `promoteToIB` | `userId, commissionPct` | `Promise<void>` | Promote investor to IB |

**File: `src/services/admin/ibPayoutService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `processPayouts` | `ibId, allocationIds` | `Promise<void>` | Mark allocations as paid |

### 11.8 Investor Services

**File: `src/services/investor/investorPositionService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getInvestorPositions` | `investorId` | `Promise<Position[]>` | Get positions with fund details |
| `getUserPositions` | `userId` | `Promise<Position[]>` | Get current user positions |
| `fetchInvestorPositions` | `investorId` | `Promise<PositionRow[]>` | Raw position data |
| `getPositionsByFund` | `fundId` | `Promise<Position[]>` | All positions in fund |
| `getTotalAUM` | - | `Promise<number>` | Sum all positions |
| `getActiveInvestorCount` | - | `Promise<number>` | Count active investors |
| `fetchInvestorsForSelector` | `includeSystem?` | `Promise<SelectorItem[]>` | Dropdown data |
| `fetchInvestors` | - | `Promise<BasicProfile[]>` | Basic investor list |
| `fetchPendingInvites` | - | `Promise<Invite[]>` | Pending invites |
| `getAllInvestorsExpertSummary` | - | `Promise<ExpertInvestor[]>` | Full investor metrics |
| `getInvestorExpertView` | `investorId` | `Promise<ExpertInvestor>` | Single investor detail |
| `checkAdminStatus` | - | `Promise<{ isAdmin }>` | Check admin status |

**File: `src/services/investor/investorPortfolioService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getPortfolioSummary` | `investorId` | `Promise<PortfolioSummary>` | Aggregated portfolio |

**File: `src/services/investor/investorPortfolioSummaryService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getDetailedSummary` | `investorId` | `Promise<DetailedSummary>` | Extended portfolio data |

**File: `src/services/investor/transactionsV2Service.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getInvestorTransactions` | `investorId, limit?` | `Promise<LedgerTransaction[]>` | Transaction history |
| `getTransactionSummary` | `investorId, fundId?` | `Promise<TransactionSummary>` | Transaction aggregates |

**File: `src/services/investor/investorYieldService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getYieldHistory` | `investorId` | `Promise<YieldEvent[]>` | Yield event history |

**File: `src/services/investor/investorYieldHistoryService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getDetailedYieldHistory` | `investorId` | `Promise<DetailedYieldHistory>` | Detailed yield data |

**File: `src/services/investor/investorWithdrawalService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `createWithdrawalRequest` | `{ investorId, fundId, amount, notes }` | `Promise<WithdrawalRequest>` | Submit withdrawal |
| `getWithdrawalHistory` | `investorId` | `Promise<WithdrawalRequest[]>` | Withdrawal history |

**File: `src/services/investor/investorPortalService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| Portal orchestration | - | - | Coordinates investor portal data |

**File: `src/services/investor/investorLookupService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `lookupInvestor` | `query` | `Promise<Profile[]>` | Search investors |

**File: `src/services/investor/fundViewService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getFundView` | `fundId, investorId` | `Promise<FundView>` | Investor's view of a fund |

**File: `src/services/investor/depositService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getDepositInstructions` | `fundId` | `Promise<Instructions>` | Deposit instructions |

**File: `src/services/investor/investmentService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| Investment orchestration | - | - | Investment workflow functions |

### 11.9 Shared Services

**File: `src/services/shared/profileService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getById` | `profileId` | `Promise<ProfileSummary>` | Profile summary |
| `getProfileById` | `profileId` | `Promise<RawProfile>` | Raw profile |
| `getAllProfiles` | - | `Promise<RawProfile[]>` | All profiles |
| `getActiveInvestors` | - | `Promise<ProfileSummary[]>` | Active investors |
| `getActiveFunds` | - | `Promise<Fund[]>` | Active funds |
| `getMyProfile` | - | `Promise<ProfileSummary>` | Current user profile |
| `countDocuments` | `userId` | `Promise<number>` | Document count |
| `updateFeePercentage` | `investorId, feePct` | `Promise<void>` | Set fee |
| `getUsersForDeposits` | - | `Promise<BasicProfile[]>` | Users for deposit form |
| `getInvestorsForTransaction` | - | `Promise<TransactionInvestor[]>` | Transaction form data |

**File: `src/services/shared/auditLogService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getAuditLogs` | `filters` | `Promise<AuditEntry[]>` | Filtered audit log |
| `getEntityHistory` | `entity, entityId` | `Promise<AuditEntry[]>` | Entity change history |
| `getActorActions` | `actorId` | `Promise<AuditEntry[]>` | Actor's actions |

**File: `src/services/shared/notificationService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getNotifications` | `userId` | `Promise<Notification[]>` | User notifications |
| `markRead` | `notificationId` | `Promise<void>` | Mark as read |
| `markAllRead` | `userId` | `Promise<void>` | Mark all as read |

**File: `src/services/shared/statementsService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getInvestorStatements` | `investorId` | `Promise<Statement[]>` | Statement list |
| `downloadStatement` | `statementId` | `Promise<Blob>` | Download statement |

**File: `src/services/shared/documentService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getDocuments` | `userId` | `Promise<Document[]>` | User documents |
| `uploadDocument` | `file, metadata` | `Promise<Document>` | Upload document |

**File: `src/services/shared/storageService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `upload` | `bucket, path, file` | `Promise<string>` | Upload to Supabase Storage |
| `download` | `bucket, path` | `Promise<Blob>` | Download from storage |
| `getPublicUrl` | `bucket, path` | `string` | Get public URL |

**File: `src/services/shared/performanceService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `calculatePerformance` | `investorId, period` | `Promise<PerformanceData>` | Performance calculations |

**File: `src/services/shared/historicalDataService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getHistoricalData` | `params` | `Promise<HistoricalData>` | Historical data queries |

**File: `src/services/shared/assetService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getAssets` | - | `Promise<Asset[]>` | Supported assets |

**File: `src/services/shared/systemConfigService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getConfig` | `key` | `Promise<ConfigValue>` | System configuration |
| `setConfig` | `key, value` | `Promise<void>` | Update configuration |

### 11.10 IB Services

**File: `src/services/ib/ibService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getCommissionSummary` | `ibId, startDate?` | `Promise<CommissionSummary[]>` | Commission aggregates |
| `getTopReferrals` | `ibId, startDate?, limit?` | `Promise<TopReferral[]>` | Top referrals |
| `getReferralCount` | `ibId` | `Promise<number>` | Referral count |
| `getReferrals` | `ibId, page, pageSize` | `Promise<PaginatedReferrals>` | Paginated referrals |
| `getReferralsForDashboard` | `ibId` | `Promise<ReferralForDashboard[]>` | Dashboard referrals |
| `getReferralDetail` | `referralId, ibId` | `Promise<ReferralDetail>` | Referral with ownership |
| `getReferralPositions` | `investorId` | `Promise<Position[]>` | Referral's positions |
| `getReferralCommissions` | `referralId, ibId, limit?` | `Promise<Commission[]>` | Commissions per referral |
| `getCommissions` | `ibId, page, pageSize, dateRange?` | `Promise<PaginatedCommissions>` | Full commission history |
| `getAllocations` | `ibId` | `Promise<Allocation[]>` | All allocations |
| `getIBPositions` | `ibId` | `Promise<FundPosition[]>` | IB's own positions |
| `getPayoutHistory` | `ibId, page, pageSize, statusFilter` | `Promise<PaginatedPayouts>` | Payout history |
| `getYieldOnBalance` | `ibId` | `Promise<Record<string, number>>` | Yield on IB's balance |
| `getIBProfile` | `ibId` | `Promise<IBProfile>` | IB profile |
| `updateIBProfile` | `ibId, data` | `Promise<void>` | Update profile |

**File: `src/services/ib/allocations.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| IB allocation functions | - | - | Commission allocation queries |

**File: `src/services/ib/referrals.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| Referral management functions | - | - | Referral CRUD operations |

### 11.11 Core Services

**File: `src/services/core/ApiClient.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| Supabase client wrapper | - | - | Base API client |

**File: `src/services/core/PortfolioService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| Portfolio calculation functions | - | - | Portfolio aggregation logic |

**File: `src/services/core/systemHealthService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getSystemHealth` | - | `Promise<HealthStatus>` | System health metrics |

**File: `src/services/core/dataIntegrityService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `runIntegrityChecks` | - | `Promise<IntegrityReport>` | All integrity checks |

**File: `src/services/core/sessionManagement.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| Session management functions | - | - | Auth session handling |

### 11.12 Auth Services

**File: `src/services/auth/authService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `signIn` | `email, password` | `Promise<Session>` | Sign in |
| `signOut` | - | `Promise<void>` | Sign out |
| `getSession` | - | `Promise<Session>` | Get current session |
| `resetPassword` | `email` | `Promise<void>` | Password reset email |

**File: `src/services/auth/inviteService.ts`**

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `createInvite` | `email, role` | `Promise<Invite>` | Create admin invite |
| `acceptInvite` | `code, credentials` | `Promise<Profile>` | Accept invite |

### 11.13 Custom React Hooks

#### Auth Hooks (`src/hooks/auth/`)

| Hook | Returns | Service Called |
|------|---------|---------------|
| `useUserRole()` | `{ role, isAdmin, isIB, isSuperAdmin, isLoading }` | `user_roles` query |
| `useHasInvestorPositions()` | `{ hasPositions, isLoading }` | `investor_positions` query |
| `useLoginMutation()` | React Query mutation | `authService.signIn()` |
| `useGoogleLoginMutation()` | React Query mutation | Google OAuth |
| `useRegisterMutation()` | React Query mutation | `supabase.auth.signUp()` |
| `useEmailVerification()` | Email verify handler | Auth verification |
| `useResendVerificationEmail()` | Resend mutation | Auth resend |

#### Investor Data Hooks (`src/hooks/data/investor/`)

| Hook | Returns | Service Called |
|------|---------|---------------|
| `useInvestorBalance(fundId)` | `{ balance, isLoading }` | `get_investor_balance` RPC |
| `useInvestorPositions()` | `{ positions, isLoading }` | `investorPositionService` |
| `useInvestorOverview()` | `{ overview, isLoading }` | `get_investor_overview` RPC |
| `useInvestorPerformance()` | `{ performance, isLoading }` | `get_investor_performance` RPC |
| `useInvestorLedger()` | `{ ledger, isLoading }` | `get_investor_ledger` RPC |
| `usePortfolioPositions()` | `{ positions, isLoading }` | `get_portfolio_positions` RPC |
| `useInvestorWithdrawals()` | `{ withdrawals, isLoading }` | `investorWithdrawalService` |
| `useInvestorYieldEvents()` | `{ events, isLoading }` | `yield_distributions` query |
| `useInvestorNotifications()` | `{ notifications, isLoading }` | `notifications` query |
| `useInvestorDocuments()` | `{ documents, isLoading }` | `documents` query |
| `useMonthlyStatements()` | `{ statements, isLoading }` | `statements` query |
| `useInvestorSearch(query)` | `{ results, isLoading }` | Search query |
| `useInvestorRealtimeInvalidation()` | void (side effect) | Supabase subscription |

#### Admin Data Hooks (`src/hooks/data/admin/`)

| Hook | Returns | Service Called |
|------|---------|---------------|
| `useInvestorList()` | `{ investors, isLoading }` | `investorDetailService` |
| `useInvestorsForSelector()` | `{ investors, isLoading }` | `investorPositionService` |
| `useInvestorQuickView(id)` | `{ investor, isLoading }` | `investorDetailService` |
| `useInvestorRecentActivity(id)` | `{ activity, isLoading }` | Activity query |
| `useUpdateInvestorStatus()` | mutation | `profiles` update |
| `useTransactionById(id)` | `{ tx, isLoading }` | `transactionDetailsService` |
| `useTransactionWithRelated(id)` | `{ tx, related, isLoading }` | Complex query |
| `useCreateAdminTransaction()` | mutation | `admin_create_transaction` RPC |
| `useVoidTransaction()` | mutation | `void_transaction` RPC |
| `useBalanceCheckForTransaction()` | `{ isValid }` | Balance check |
| `useWithdrawals(filters)` | `{ withdrawals, isLoading }` | `withdrawal_requests` query |
| `useApproveWithdrawal()` | mutation | `approvalService` |
| `useRejectWithdrawal()` | mutation | `approvalService` |
| `useYieldRecords(filters)` | `{ records, isLoading }` | `yield_distributions` query |
| `useYieldDetails(id)` | `{ detail, isLoading }` | Yield detail query |
| `useUpdateYieldRecord()` | mutation | Yield update |
| `useVoidYieldRecord()` | mutation | `void_yield_distribution` RPC |
| `useCanEditYields()` | `{ canEdit }` | Permission check |
| `useCanVoidYield()` | `{ canVoid }` | Permission check |
| `useAdminStats()` | `{ stats, isLoading }` | `adminStatsService` |
| `useSystemHealth()` | `{ health, isLoading }` | `systemHealthService` |
| `useAuditLogs(filters)` | `{ logs, isLoading }` | `auditLogService` |
| `useIntegrityChecks()` | `{ checks, isLoading }` | `integrityService` |
| `useFeeTransactions(filters)` | `{ fees, isLoading }` | `feesService` |
| `useFeesBalance()` | `{ balance, isLoading }` | `feesService` |
| `useFundManagement()` | `{ funds, create, update, delete }` | `fundService` |
| `useFundAUM(fundId)` | `{ aum, isLoading }` | AUM query |

#### UI Hooks (`src/hooks/ui/`)

| Hook | Returns | Purpose |
|------|---------|---------|
| `useBreadcrumbs()` | `{ breadcrumbs }` | Navigation breadcrumbs |
| `useDebounce(value, delay)` | `debouncedValue` | Debounce input |
| `useFocusManagement()` | Focus handlers | Accessibility |
| `useInlineManagementToggle()` | `{ isEditing, toggle }` | Inline edit mode |
| `useIntersectionObserver()` | `{ isIntersecting }` | Lazy loading |
| `useOptimizedCallback(fn)` | Memoized callback | Performance |
| `useSortableColumns()` | `{ sort, direction, onSort }` | Table sorting |
| `useUrlFilters()` | `{ filters, setFilter }` | URL query params |
| `useToast()` | `{ toast }` | Toast notifications |
| `useLocalStorage(key)` | `[value, setValue]` | Local storage |
| `useKeyboardShortcuts()` | void (side effect) | Keyboard shortcuts |

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-06 | Platform Analysis (CTO/CFO/Lead Eng/Lead Dev) | Initial comprehensive analysis |

---

*This document was generated through a comprehensive analysis of the entire codebase (frontend, backend, database) combined with founder interviews covering strategic direction, technical concerns, financial risks, and operational priorities.*
