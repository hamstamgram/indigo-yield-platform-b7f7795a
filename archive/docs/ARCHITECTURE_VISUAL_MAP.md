# Indigo Yield Platform - Architecture Visual Map

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Web + iOS)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────┐         ┌──────────────────────┐           │
│  │   Web Application    │         │   iOS Application    │           │
│  │   (React + Vite)     │         │   (SwiftUI)          │           │
│  ├──────────────────────┤         ├──────────────────────┤           │
│  │ src/pages/           │         │ ios/IndigoInvestor/  │           │
│  │ src/components/      │         │ ios/Views/           │           │
│  │ src/services/        │         │ ios/Services/        │           │
│  │ src/hooks/           │         │ ios/Models/          │           │
│  │ src/stores/          │         │                      │           │
│  │ src/lib/auth/        │         │ Features:            │           │
│  │ src/routing/         │         │ - Biometric auth     │           │
│  │                      │         │ - Offline mode       │           │
│  │ Features:            │         │ - Push notifications │           │
│  │ - Responsive UI      │         │ - Widgets            │           │
│  │ - Dark mode          │         │                      │           │
│  │ - PWA support        │         │                      │           │
│  │ - Accessibility      │         │                      │           │
│  └──────────────────────┘         └──────────────────────┘           │
│           │                                  │                        │
│           └──────────────────┬───────────────┘                        │
│                              │                                        │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               │ HTTP/REST
                               │ WebSocket
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────┐                            │
│  │      Supabase Auth (JWT)            │                            │
│  ├─────────────────────────────────────┤                            │
│  │ - Email/Password authentication    │                            │
│  │ - Session management               │                            │
│  │ - TOTP/2FA                         │                            │
│  │ - Token refresh                    │                            │
│  │ - Password recovery                │                            │
│  └─────────────────────────────────────┘                            │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────┐                            │
│  │   Authorization Layer (RLS)         │                            │
│  ├─────────────────────────────────────┤                            │
│  │ - Role-based access control        │                            │
│  │ - Row-level security policies      │                            │
│  │ - Admin/Investor isolation         │                            │
│  │ - Data segmentation                │                            │
│  └─────────────────────────────────────┘                            │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │ Authenticated Requests
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER (Node.js/TypeScript)             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │            Service Layer (src/services/)                      │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │                                                               │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐   │  │
│  │  │ Investor       │  │ Admin          │  │ Portfolio   │   │  │
│  │  │ Service        │  │ Service        │  │ Service     │   │  │
│  │  └────────────────┘  └────────────────┘  └─────────────┘   │  │
│  │                                                               │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐   │  │
│  │  │ Transaction    │  │ Fee            │  │ Fund        │   │  │
│  │  │ Service        │  │ Service        │  │ Service     │   │  │
│  │  └────────────────┘  └────────────────┘  └─────────────┘   │  │
│  │                                                               │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐   │  │
│  │  │ Statement      │  │ AUM            │  │ Yield       │   │  │
│  │  │ Service        │  │ Service        │  │ Service     │   │  │
│  │  └────────────────┘  └────────────────┘  └─────────────┘   │  │
│  │                                                               │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐   │  │
│  │  │ User           │  │ Session        │  │ Bulk Ops    │   │  │
│  │  │ Service        │  │ Management     │  │ Service     │   │  │
│  │  └────────────────┘  └────────────────┘  └─────────────┘   │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           Server-Side Functions (src/server/)                 │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  - admin.ts, admin.tx.ts, admin.funds.ts                    │  │
│  │  - investor.ts, lp.ts                                        │  │
│  │  - support.ts, documents.ts, onboarding.ts, mfa.ts         │  │
│  │  - requests.ts                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │        Business Logic Layer (Processing)                      │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  - Yield calculations                                        │  │
│  │  - Fee calculations                                          │  │
│  │  - Portfolio reconciliation                                  │  │
│  │  - Statement generation                                      │  │
│  │  - Withdrawal processing                                     │  │
│  │  - Transaction logging                                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               │ SQL Queries
                               │ RLS Enforcement
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   DATA LAYER (Supabase PostgreSQL)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                 Core Tables                                     │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │                                                                 │ │
│  │  auth.users ─┐                                                 │ │
│  │              ├─► profiles (User profiles)                      │ │
│  │              └─► user_totp_settings (2FA)                      │ │
│  │                                                                 │ │
│  │  ┌─────────────────────────────────────────┐                 │ │
│  │  │ Investment Data                         │                 │ │
│  │  ├─────────────────────────────────────────┤                 │ │
│  │  │ - portfolios (user holdings)            │                 │ │
│  │  │ - investments (principal tracking)      │                 │ │
│  │  │ - assets (BTC, ETH, SOL, USDT, EUR)   │                 │ │
│  │  │ - daily_yields (interest accrual)       │                 │ │
│  │  │ - yield_rates (APY configuration)       │                 │ │
│  │  │ - aum (assets under management)         │                 │ │
│  │  └─────────────────────────────────────────┘                 │ │
│  │                                                                 │ │
│  │  ┌─────────────────────────────────────────┐                 │ │
│  │  │ Transaction Data                        │                 │ │
│  │  ├─────────────────────────────────────────┤                 │ │
│  │  │ - transactions (all movements)          │                 │ │
│  │  │ - withdrawal_requests (workflow)        │                 │ │
│  │  │ - withdrawal_approvals (audit trail)    │                 │ │
│  │  └─────────────────────────────────────────┘                 │ │
│  │                                                                 │ │
│  │  ┌─────────────────────────────────────────┐                 │ │
│  │  │ Reporting & Documents                   │                 │ │
│  │  ├─────────────────────────────────────────┤                 │ │
│  │  │ - statements (monthly statements)       │                 │ │
│  │  │ - monthly_statements (detailed)         │                 │ │
│  │  │ - documents (uploaded files)            │                 │ │
│  │  │ - support_tickets (help requests)       │                 │ │
│  │  │ - support_messages (ticket messages)    │                 │ │
│  │  └─────────────────────────────────────────┘                 │ │
│  │                                                                 │ │
│  │  ┌─────────────────────────────────────────┐                 │ │
│  │  │ Admin & Operations                      │                 │ │
│  │  ├─────────────────────────────────────────┤                 │ │
│  │  │ - audit_logs (all actions)              │                 │ │
│  │  │ - position_adjustments (manual edits)   │                 │ │
│  │  │ - admin_invitations (access mgmt)       │                 │ │
│  │  │ - funds (fund configuration)            │                 │ │
│  │  │ - fee_configurations (fee tiers)        │                 │ │
│  │  └─────────────────────────────────────────┘                 │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │             Database Functions & Triggers (20+)                │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │  - get_profile_basic()                                        │ │
│  │  - get_user_admin_status()                                    │ │
│  │  - get_investor_portfolio_summary()                           │ │
│  │  - calculate_investor_yield()                                 │ │
│  │  - generate_monthly_statement()                               │ │
│  │  - process_withdrawal_request()                               │ │
│  │  - calculate_aum_daily()                                      │ │
│  │  + 13 more...                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │             Row-Level Security (30+ Policies)                  │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │  - Users see only their own data                              │ │
│  │  - Admins see all data                                        │ │
│  │  - Investors isolated by UID                                  │ │
│  │  - Support tickets visible to ticket owner + admins          │ │
│  │  - Documents segmented by user                                │ │
│  │  + 25 more policies...                                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES & INFRASTRUCTURE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────┐     ┌──────────────────────┐             │
│  │ Supabase Storage     │     │ Sentry (Error Track) │             │
│  │ - Statements PDFs    │     │ - Exception logging  │             │
│  │ - User documents     │     │ - Performance monitoring              │
│  │ - Reports            │     │                      │             │
│  └──────────────────────┘     └──────────────────────┘             │
│                                                                       │
│  ┌──────────────────────┐     ┌──────────────────────┐             │
│  │ PostHog (Analytics)  │     │ Email Service        │             │
│  │ - User events        │     │ - Transactional mail │             │
│  │ - Feature usage      │     │ - Notifications      │             │
│  │ - Product metrics    │     │ (ReadyToAdd)         │             │
│  └──────────────────────┘     └──────────────────────┘             │
│                                                                       │
│  ┌──────────────────────┐     ┌──────────────────────┐             │
│  │ Vercel Deployment    │     │ GitHub Actions       │             │
│  │ - Web hosting        │     │ - CI/CD pipeline     │             │
│  │ - Auto-scaling       │     │ - Testing            │             │
│  │ - Edge functions     │     │ - Deployment         │             │
│  └──────────────────────┘     └──────────────────────┘             │
│                                                                       │
│  ┌──────────────────────┐     ┌──────────────────────┐             │
│  │ Playwright Testing   │     │ Apple App Store      │             │
│  │ - E2E automation     │     │ - iOS distribution   │             │
│  │ - Visual testing     │     │ - Testflight         │             │
│  │ - Performance tests  │     │                      │             │
│  └──────────────────────┘     └──────────────────────┘             │
│                                                                       │
│  [FUTURE] Payment Gateway (Stripe/PayPal)                          │
│  [FUTURE] KYC/AML Provider (Socure/Stripe Identity)                │
│  [FUTURE] SMS Provider (Twilio)                                     │
│  [FUTURE] Push Notification (Firebase/OneSignal)                    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Investor Withdrawal Request

```
INVESTOR (Web/iOS)
    │
    │ 1. Submits withdrawal form
    │    (amount, asset, bank details)
    │
    ▼
FRONTEND (Form validation)
    │ Validates with Zod
    │
    ▼
API SERVICE
    │ investorService.requestWithdrawal()
    │
    ▼
SUPABASE CLIENT
    │ supabase.from('withdrawal_requests').insert()
    │
    ▼
DATABASE
    ├─ INSERT into withdrawal_requests
    │  ├─ status: 'pending'
    │  ├─ user_id: <investor_id>
    │  ├─ amount: <requested_amount>
    │  └─ asset_symbol: <asset>
    │
    ├─ TRIGGER: audit_log created
    │
    └─ RLS: Only investor's own request visible to them
              Only admins see all requests
    │
    ▼
REALTIME (WebSocket)
    │ Notifies admin dashboard
    │
    ▼
ADMIN DASHBOARD
    │ WithdrawalApprovalPanel
    │ Shows new request in queue
    │
    ▼
ADMIN ACTION
    │ Approves/rejects
    │
    ▼
API: adminService.approveWithdrawal(requestId)
    │
    ▼
DATABASE TRANSACTION
    ├─ UPDATE withdrawal_requests SET status='approved'
    ├─ INSERT INTO withdrawal_approvals (audit trail)
    ├─ UPDATE portfolios SET balance = balance - amount
    ├─ INSERT INTO transactions (withdrawal record)
    └─ CREATE audit_log entry
    │
    ▼
REALTIME NOTIFICATION
    │
    ▼
INVESTOR NOTIFICATION
    │ Email (future)
    │ In-app notification
    │ Dashboard update
    │
    ▼
STATEMENT NEXT MONTH
    │ Monthly statement includes withdrawal
    │ with details and confirmation
```

---

## Component Hierarchy: Admin Dashboard

```
AdminDashboardV2
├── Header
│   ├── Navigation menu
│   ├── RealtimeNotifications
│   │   └── Real-time alert feed
│   └── Refresh button
│
├── KPI Cards Row
│   ├── Total AUM card
│   ├── Total Investors card
│   ├── Average APY card
│   └── Pending Requests card
│
├── Tabs
│   ├── Overview Tab
│   │   ├── AdminPortfolios
│   │   │   ├── AssetSummaryCard (BTC)
│   │   │   ├── AssetSummaryCard (ETH)
│   │   │   ├── AssetSummaryCard (SOL)
│   │   │   └── AssetSummaryCard (USDT)
│   │   │
│   │   ├── RecentInvestorsTable
│   │   │   ├── InvestorTableRow
│   │   │   ├── InvestorTableRow
│   │   │   └── InvestorTableRow
│   │   │
│   │   └── QuickLinks
│   │       ├── Link: Investor Management
│   │       ├── Link: Withdrawal Queue
│   │       ├── Link: Fund Settings
│   │       └── Link: Reports
│   │
│   ├── Investors Tab
│   │   └── InvestorManagementPanel
│   │       ├── InvestorsHeader
│   │       │   └── SearchBar
│   │       │
│   │       └── InvestorTableContainer
│   │           ├── InvestorsTableHeader
│   │           └── InvestorsTable
│   │               ├── InvestorTableRow (editable)
│   │               ├── InvestorTableRow
│   │               └── InvestorTableRow
│   │
│   ├── Withdrawals Tab
│   │   └── WithdrawalRequestsPanel
│   │       ├── WithdrawalApprovalPanel
│   │       │   ├── Request item
│   │       │   ├── Approve button
│   │       │   └── Reject button
│   │       │
│   │       └── WithdrawalHistory
│   │           ├── Approved requests
│   │           ├── Rejected requests
│   │           └── Completed requests
│   │
│   └── Reports Tab
│       ├── AdminReports component
│       │   ├── AssetPerformanceTab
│       │   ├── MonthlyStatementManager
│       │   └── HistoricalReportsDashboard
│
└── Sidebar
    ├── Logo
    ├── Navigation
    │   ├── Dashboard (active)
    │   ├── Investors
    │   ├── Portfolios
    │   ├── Withdrawals
    │   ├── Statements
    │   ├── Reports
    │   ├── Yield Settings
    │   ├── Fees
    │   ├── Funds
    │   └── Audit
    │
    ├── Admin Tools
    │   ├── Support Queue
    │   ├── Document Vault
    │   ├── User Invites
    │   └── Audit Logs
    │
    └── Settings
        ├── Profile
        ├── Preferences
        └── Logout
```

---

## Technology Stack Summary

```
FRONTEND
├── React 18.3
│   ├── TypeScript
│   ├── Vite 5 (build)
│   ├── React Router 6 (routing)
│   └── React Query 5 (data fetching)
│
├── UI Framework
│   ├── Tailwind CSS 3
│   ├── Shadcn/ui (components)
│   ├── Radix UI (primitives)
│   └── Lucide (icons)
│
├── Forms & Validation
│   ├── React Hook Form
│   └── Zod
│
├── Charts & Visualization
│   ├── Recharts
│   └── HTML2Canvas
│
├── PDF Generation
│   ├── jsPDF
│   ├── html2pdf
│   └── QRCode
│
├── State Management
│   ├── Zustand
│   └── React Context
│
├── Animation
│   └── Tailwind CSS Animate
│
└── Features
    ├── PWA
    ├── Dark Mode (next-themes)
    ├── Accessibility (A11y)
    └── Security Provider

DATABASE
├── Supabase (PostgreSQL)
│   ├── Auth
│   ├── Real-time
│   ├── Storage
│   ├── Functions (PL/pgSQL)
│   ├── Policies (RLS)
│   └── Vector search (optional)
│
└── Schema
    ├── 104 Migrations
    ├── 30+ Tables
    ├── 20+ Functions
    ├── 30+ RLS Policies
    └── 15+ Indexes

AUTHENTICATION & SECURITY
├── Supabase Auth (JWT)
├── TOTP (speakeasy)
├── Bcrypt (password hashing)
├── Rate Limiting (express-rate-limit)
├── Helmet (security headers)
└── CORS (cross-origin)

MONITORING & ANALYTICS
├── Sentry (error tracking)
├── PostHog (product analytics)
├── Custom logging
└── Performance metrics

TESTING
├── Jest
├── Playwright (E2E)
├── Axe Core (accessibility)
└── Lighthouse (performance)

DEPLOYMENT
├── Vercel (web)
├── GitHub Actions (CI/CD)
├── Docker (optional)
└── Supabase (backend)

DEVELOPMENT
├── ESLint
├── Prettier
├── TypeScript
├── Storybook (docs)
└── Vitest (unit tests)
```

---

## User Journey: Investor

```
LANDING PAGE
    ├─ Read about platform
    ├─ View testimonials
    └─ CTA: Sign Up
         │
         ▼
    LOGIN/REGISTRATION
         │
         ├─ Email validation
         ├─ Password setup
         └─ Terms acceptance
         │
         ▼
    EMAIL VERIFICATION
         │
         └─ Click confirmation link
         │
         ▼
    ONBOARDING WIZARD
         │
         ├─ Step 1: Profile setup
         │   (name, phone, address)
         │
         ├─ Step 2: Account type
         │   (individual, entity)
         │
         ├─ Step 3: Investment goals
         │
         ├─ Step 4: Risk profile
         │
         ├─ Step 5: Review & confirm
         │
         └─ Welcome email sent
         │
         ▼
    DASHBOARD
         │
         ├─ Portfolio overview
         │   (BTC, ETH, SOL, USDT, EUR)
         │
         ├─ Recent activity
         │   (deposits, withdrawals, yields)
         │
         ├─ YTD performance
         │
         └─ Quick actions
            (view statements, request withdrawal)
         │
         ▼
    PORTFOLIO SECTION
         │
         ├─ View holdings by asset
         ├─ See allocation %
         ├─ Track value in USD
         └─ View asset details
             (current price, 30-day chart, fees)
         │
         ▼
    STATEMENTS & DOCUMENTS
         │
         ├─ Download monthly statements
         ├─ View transaction history
         ├─ Access uploaded documents
         └─ Download tax forms
         │
         ▼
    WITHDRAWAL REQUEST
         │
         ├─ Select asset
         ├─ Enter amount
         ├─ Confirm bank details
         └─ Submit request
         │
         ▼
    ACCOUNT SETTINGS
         │
         ├─ Update profile
         ├─ Change password
         ├─ Enable 2FA
         ├─ Manage sessions
         └─ Notification preferences
         │
         ▼
    ONGOING EXPERIENCE
         │
         ├─ Daily portfolio updates
         ├─ Monthly yield credits
         ├─ Monthly statements
         ├─ Notification of approvals
         └─ Support access
```

---

## Admin User Journey

```
ADMIN DASHBOARD
    │
    ├─ KPI Overview
    │  ├─ Total AUM: $XX.XXM
    │  ├─ Investor count: XXX
    │  ├─ Avg APY: X.XX%
    │  └─ Pending requests: XX
    │
    ▼
INVESTOR MANAGEMENT
    │
    ├─ View all investors
    │   ├─ Search/filter by status
    │   ├─ View balance, APY, fees
    │   └─ Edit investor details
    │
    ├─ Create new investor
    │   ├─ Manual entry
    │   └─ Bulk import (Excel)
    │
    └─ Click on investor
         │
         ▼
    INVESTOR DETAIL VIEW
         │
         ├─ Profile information
         ├─ Current positions
         │  └─ By asset with values
         ├─ Transaction history
         ├─ Statement download
         ├─ Fee adjustment
         ├─ Position adjustments
         └─ Action buttons
            (approve withdrawal, issue statement, etc.)
    │
    ▼
WITHDRAWAL MANAGEMENT
    │
    ├─ View pending requests
    │  ├─ Amount, asset, date
    │  └─ Investor details
    │
    ├─ Approve/Reject each
    │   └─ Reason for rejection
    │
    └─ View approved/rejected history
    │
    ▼
YIELD MANAGEMENT
    │
    ├─ Update APY rates
    │   ├─ By asset
    │   └─ Effective date
    │
    ├─ View yield history
    │
    ├─ Apply daily yields
    │   └─ Automatic or manual
    │
    └─ View yield reports
    │
    ▼
STATEMENTS & REPORTS
    │
    ├─ Generate monthly statements
    │   ├─ Select period
    │   ├─ Auto or manual
    │   └─ Download PDF
    │
    ├─ View statement queue
    │
    └─ Download reports
         ├─ Asset performance
         ├─ Investor performance
         └─ AUM trends
    │
    ▼
FUND MANAGEMENT
    │
    ├─ Configure funds
    │   ├─ Fund name, symbol
    │   └─ Supported assets
    │
    ├─ Update AUM
    │   └─ Daily snapshot
    │
    ├─ Fee configuration
    │   ├─ Per-fund fees
    │   └─ Per-investor overrides
    │
    └─ Fund performance metrics
    │
    ▼
AUDIT & COMPLIANCE
    │
    ├─ View audit logs
    │   ├─ Action, user, timestamp
    │   └─ Before/after snapshots
    │
    ├─ Invite new admin
    │   └─ Set role & permissions
    │
    ├─ Support ticket queue
    │
    └─ System health check
```

---

## Data Model: Investor Position

```
┌─ Investor Profile (profiles)
│   ├─ id (UUID)
│   ├─ email (text)
│   ├─ first_name (text)
│   ├─ last_name (text)
│   ├─ is_admin (boolean)
│   └─ created_at (timestamp)
│
└─ Investment Positions
    │
    ├─ Portfolios (by asset)
    │   ├─ Portfolio
    │   │   ├─ id (UUID)
    │   │   ├─ user_id (FK→profiles)
    │   │   ├─ asset_id (FK→assets)
    │   │   ├─ balance (numeric)
    │   │   ├─ principal (numeric) ← how much invested
    │   │   ├─ earned (numeric)    ← yield accrued
    │   │   └─ updated_at (timestamp)
    │   │
    │   └─ Multiple rows (one per asset)
    │       ├─ BTC portfolio
    │       ├─ ETH portfolio
    │       ├─ SOL portfolio
    │       ├─ USDT portfolio
    │       └─ EUR portfolio
    │
    ├─ Investments (legacy/summary)
    │   ├─ id (UUID)
    │   ├─ user_id (FK→profiles)
    │   ├─ asset_symbol (text)
    │   ├─ principal (numeric)
    │   ├─ earned (numeric)
    │   └─ status (enum: active, inactive)
    │
    ├─ Daily Yields
    │   ├─ id (UUID)
    │   ├─ user_id (FK→profiles)
    │   ├─ asset_symbol (text)
    │   ├─ yield_amount (numeric)
    │   ├─ apy_rate (numeric) ← annual rate used for calc
    │   ├─ calculation_date (date)
    │   └─ created_at (timestamp)
    │
    ├─ Transactions
    │   ├─ type: DEPOSIT, WITHDRAWAL, YIELD, FEE, ADJUSTMENT
    │   ├─ amount (numeric)
    │   ├─ asset_symbol (text)
    │   ├─ status (enum: pending, completed, failed)
    │   └─ created_at (timestamp)
    │
    ├─ Monthly Statements
    │   ├─ id (UUID)
    │   ├─ investor_id (FK→profiles)
    │   ├─ period (text: YYYY-MM)
    │   ├─ asset_symbol (text)
    │   ├─ opening_balance (numeric)
    │   ├─ deposits (numeric) ← amount added
    │   ├─ withdrawals (numeric) ← amount removed
    │   ├─ yield_earned (numeric) ← interest accrued
    │   ├─ fees (numeric) ← deducted
    │   ├─ closing_balance (numeric)
    │   ├─ status (enum)
    │   └─ pdf_url (text)
    │
    └─ Withdrawal Requests
        ├─ id (UUID)
        ├─ user_id (FK→profiles)
        ├─ asset_symbol (text)
        ├─ amount (numeric)
        ├─ status (enum: pending, approved, rejected, completed)
        ├─ requested_at (timestamp)
        ├─ approved_by (FK→profiles)
        └─ approved_at (timestamp)

VIEW: Investor Portfolio Summary
├─ Total principal across all assets
├─ Total earned (YTD)
├─ Total value (principal + earned)
├─ Weighted average APY
├─ Allocation breakdown (%)
└─ Performance (XMoM, YTD, ITD)
```

---

## Feature Maturity Matrix

```
INVESTOR FEATURES
┌─────────────────────────┬──────────────┬───────────┐
│ Feature                 │ Status       │ Maturity  │
├─────────────────────────┼──────────────┼───────────┤
│ Dashboard               │ ✅ Complete  │ ★★★★★    │
│ Portfolio View          │ ✅ Complete  │ ★★★★★    │
│ Statements Download     │ ✅ Complete  │ ★★★★☆    │
│ Withdrawal Request      │ ✅ Complete  │ ★★★★★    │
│ Transaction History     │ ✅ Complete  │ ★★★★★    │
│ Account Settings        │ ✅ Complete  │ ★★★★☆    │
│ 2FA/TOTP               │ ✅ Complete  │ ★★★★★    │
│ Session Management      │ ✅ Complete  │ ★★★★☆    │
│ Document Vault          │ ✅ Complete  │ ★★★★☆    │
│ Support Tickets         │ ✅ Complete  │ ★★★★☆    │
└─────────────────────────┴──────────────┴───────────┘

ADMIN FEATURES
┌─────────────────────────┬──────────────┬───────────┐
│ Feature                 │ Status       │ Maturity  │
├─────────────────────────┼──────────────┼───────────┤
│ Dashboard               │ ✅ Complete  │ ★★★★★    │
│ Investor Management     │ ✅ Complete  │ ★★★★★    │
│ Portfolio Management    │ ✅ Complete  │ ★★★★☆    │
│ Yield Management        │ ✅ Complete  │ ★★★★☆    │
│ Withdrawal Approval     │ ✅ Complete  │ ★★★★★    │
│ Statement Generation    │ ✅ Complete  │ ★★★★☆    │
│ Fee Configuration       │ ✅ Complete  │ ★★★★☆    │
│ Fund Management         │ ✅ Complete  │ ★★★★☆    │
│ Audit Logs              │ ✅ Complete  │ ★★★★☆    │
│ Bulk Operations         │ ✅ Complete  │ ★★★★☆    │
│ AUM Management          │ ✅ Complete  │ ★★★★☆    │
│ Expert Investor Tools   │ ✅ Complete  │ ★★★★☆    │
└─────────────────────────┴──────────────┴───────────┘

INFRASTRUCTURE
┌─────────────────────────┬──────────────┬───────────┐
│ Feature                 │ Status       │ Maturity  │
├─────────────────────────┼──────────────┼───────────┤
│ Authentication          │ ✅ Complete  │ ★★★★★    │
│ Database                │ ✅ Complete  │ ★★★★★    │
│ RLS Security            │ ✅ Complete  │ ★★★★★    │
│ API Services            │ ✅ Complete  │ ★★★★☆    │
│ Error Handling          │ ✅ Complete  │ ★★★★☆    │
│ Logging                 │ ✅ Complete  │ ★★★★☆    │
│ Monitoring              │ ✅ Complete  │ ★★★★☆    │
│ Deployment              │ ✅ Complete  │ ★★★★★    │
│ CI/CD                   │ ✅ Complete  │ ★★★★★    │
│ Testing                 │ ⚠️ Partial  │ ★★★☆☆    │
└─────────────────────────┴──────────────┴───────────┘

Legend:
✅ Complete - Production ready
⚠️ Partial  - Works but needs enhancement
❌ Missing  - Not implemented

★★★★★ - Highly polished, production-grade
★★★★☆ - Functional, some enhancement needed
★★★☆☆ - Basic functionality, significant work needed
★★☆☆☆ - Partial implementation
★☆☆☆☆ - Minimal/prototype
```

---

## Deployment Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    GITHUB REPOSITORY                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ├─ src/ (React app)                                        │
│  ├─ ios/ (Swift app)                                        │
│  ├─ supabase/ (Database)                                    │
│  └─ .github/workflows/ (CI/CD)                              │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
    Web Push           iOS Build          Database
    (web-ci-cd)        (ios-ci-cd)        Migrations
        │                  │                  │
        ▼                  ▼                  ▼
    ┌────────────┐   ┌──────────┐   ┌─────────────────┐
    │ NPM Build  │   │ Xcode    │   │ Supabase        │
    │ - Vite     │   │ Build    │   │ - Migrations    │
    │ - TypeScript   │ - SwiftUI│   │ - Seeding       │
    │ - Test     │   │ - Test   │   │ - Functions     │
    │ - Lint     │   └──────────┘   └─────────────────┘
    └────────────┘         │                  │
        │                  │                  │
        ▼                  ▼                  ▼
    ┌────────────┐   ┌──────────┐   ┌─────────────────┐
    │ Vercel     │   │ TestFlight   │ Cloud DB        │
    │ - Deploy   │   │ - Beta       │ - PostgreSQL    │
    │ - Preview  │   │   Testing    │ - Backups       │
    │ - Edge Fn  │   └──────────────┘ - Replication  │
    └────────────┘                  └─────────────────┘
        │
        ▼
    PRODUCTION
    - https://indigo-yield.com
    - CDN edge locations
    - Auto-scaling
    - Backups

STAGING ENVIRONMENT (Preview branch)
    - Vercel preview deployments
    - Full test data
    - Performance testing

DEVELOPMENT ENVIRONMENT
    - Local Supabase
    - Hot reload
    - Dev server on :5173
```

---

**Document Version:** 1.0  
**Last Updated:** November 4, 2025  
