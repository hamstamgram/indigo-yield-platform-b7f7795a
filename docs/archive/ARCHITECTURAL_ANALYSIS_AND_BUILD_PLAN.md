# Indigo Yield Platform - Architectural Analysis & Build Plan

**Generated**: October 6, 2025
**Project**: Indigo Yield Platform v01
**Repository**: `/Users/mama/Desktop/indigo-yield-platform-v01`

---

## Executive Summary

The Indigo Yield Platform is a sophisticated DeFi investor portal with a mature codebase featuring comprehensive database schema, extensive admin tooling, and production-ready infrastructure. The platform currently operates as a **centralized yield management system** for crypto assets (BTC, ETH, SOL, USDT, USDC, EURC) with separate investor and admin interfaces.

**Current State**:
- ✅ Production-ready codebase with 100+ migration files
- ✅ Comprehensive RLS (Row-Level Security) policies
- ✅ Multi-asset portfolio management
- ✅ Advanced admin dashboard with fund management
- ✅ Statements, reporting, and audit trail
- ⚠️ Limited backend API layer (mostly client-side Supabase calls)
- ⚠️ No blockchain integration (centralized yield tracking only)
- ⚠️ Missing automated yield calculations
- ⚠️ Limited real-time data pipelines

---

## 1. Current Architecture Assessment

### 1.1 Tech Stack Analysis

**Frontend Architecture** ⭐⭐⭐⭐⭐ (Excellent)
```
React 18.3.1 + TypeScript 5.5.3 + Vite 5.4.1
├── UI Framework: shadcn-ui (Radix UI primitives)
├── Styling: Tailwind CSS 3.4.11 with animations
├── State Management: TanStack Query (React Query) + Zustand
├── Forms: React Hook Form + Zod validation
├── Routing: React Router DOM v6.26.2
└── Charts: Recharts 2.12.7
```

**Backend/Database** ⭐⭐⭐⭐ (Very Good, needs enhancement)
```
Supabase (PostgreSQL 15+)
├── Auth: Supabase Auth with 2FA/TOTP support
├── Database: PostgreSQL with comprehensive schema
├── Storage: Supabase Storage (statements, documents)
├── RLS: Row-Level Security policies on all tables
└── Edge Functions: None implemented yet ⚠️
```

**Database Schema Maturity**: ⭐⭐⭐⭐⭐ (Excellent)
- 50+ database tables covering all aspects of fund management
- Comprehensive migration history (100+ migrations)
- Well-designed normalized structure
- Proper indexes and constraints
- Full audit trail with audit_log table

**Security Posture**: ⭐⭐⭐⭐ (Very Good)
- Row-Level Security (RLS) policies implemented
- Admin role-based access control
- 2FA/TOTP authentication support
- Audit logging for compliance
- Session management tracking
- Secure password reset flows

**Integration Status**: ⭐⭐ (Needs Work)
- Sentry error tracking: ✅ Configured
- PostHog analytics: ✅ Configured
- MailerLite email: ✅ Configured
- Blockchain RPC: ❌ Not integrated
- Price oracles: ❌ Not automated
- Yield protocols: ❌ Not integrated

---

### 1.2 Database Schema Analysis

#### Core Tables (Production-Ready)

**User Management**
```sql
profiles (id, email, first_name, last_name, is_admin, fee_percentage, totp_enabled)
├── admin_users (user_id, granted_at, granted_by)
├── admin_invites (email, invite_code, expires_at)
└── access_logs (user_id, event, ip, user_agent)
```

**Asset & Portfolio Management**
```sql
assets (id, symbol, name, is_active, decimal_places)
assets_v2 (asset_id, symbol, name, kind, chain, coingecko_id)
├── asset_prices (asset_id, price_usd, as_of, source)
├── positions (investor_id, asset_code, principal, current_balance, total_earned)
├── portfolio_history (user_id, asset_id, balance, date)
└── investor_positions (investor_id, fund_id, shares, cost_basis, current_value)
```

**Transactions & Operations**
```sql
transactions (id, investor_id, asset_code, amount, type, status, tx_hash)
├── deposits (user_id, amount, asset_symbol, transaction_hash)
├── withdrawals (id, user_id, amount, asset_symbol, status, approved_by)
└── balance_adjustments (user_id, amount, currency, reason, created_by)
```

**Fund Management (Advanced)**
```sql
funds (id, code, name, asset, fund_class, inception_date, aum)
├── fund_subscriptions (investor_id, fund_id, shares_purchased, subscription_date)
├── fund_redemptions (investor_id, fund_id, shares_redeemed, redemption_date)
├── daily_nav (fund_id, nav_date, aum, nav_per_share, gross_return_pct)
├── daily_aum_entries (fund_id, entry_date, total_aum, investor_count)
└── fund_fees (fund_id, fee_type, rate, calculation_method)
```

**Yield & Returns**
```sql
yield_rates (asset_id, daily_yield_percentage, date, entered_by)
├── daily_yield_applications (asset_code, application_date, total_yield_generated)
└── benchmarks (symbol, date, price_usd, ret_mtd, ret_ytd, ret_itd)
```

**Reporting & Compliance**
```sql
statements (investor_id, period_year, period_month, asset_code, begin_balance, end_balance, storage_path)
├── reports (investor_id, report_type, generated_at, storage_path)
├── fees (investor_id, asset_code, amount, kind, period_year, period_month)
└── audit_log (actor_user, action, entity, entity_id, old_values, new_values)
```

**Support & Operations**
```sql
support_tickets (user_id, subject, status, priority, assigned_to)
├── notifications (user_id, type, title, message, read_at)
└── user_sessions (user_id, session_id, device_info, last_active)
```

#### Schema Strengths
✅ Multi-asset support (BTC, ETH, SOL, USDT, USDC, EURC)
✅ Fund-level tracking with NAV calculations
✅ Complete audit trail
✅ Performance metrics (MTD, QTD, YTD, ITD)
✅ Statement generation with PDF storage
✅ Support ticket system
✅ Session tracking for security

#### Schema Gaps
⚠️ No blockchain transaction verification tables
⚠️ No DeFi protocol integration tracking
⚠️ Limited real-time price feed tables
⚠️ No automated yield source tracking
⚠️ Missing webhook/event queue tables

---

### 1.3 Application Layer Analysis

**Directory Structure**
```
src/
├── components/          # 200+ React components
│   ├── admin/          # Admin dashboard, investor management, reports
│   ├── dashboard/      # Investor dashboard components
│   ├── auth/           # Login, 2FA, password reset
│   ├── portfolio/      # Asset views, transactions, analytics
│   ├── ui/             # shadcn-ui components (50+ components)
│   └── security/       # SecurityProvider, session management
├── features/           # Feature modules
│   ├── admin/          # Admin-specific features
│   ├── dashboard/      # Dashboard features
│   ├── portfolio/      # Portfolio features
│   └── transactions/   # Transaction features
├── services/           # Business logic layer
│   ├── adminServiceV2.ts
│   ├── investorService.ts
│   ├── portfolioService.ts
│   ├── aumService.ts
│   ├── fundService.ts
│   └── api/            # API abstraction layer
├── integrations/
│   └── supabase/       # Supabase client + type definitions
├── hooks/              # Custom React hooks
├── lib/                # Utilities, helpers
├── pages/              # Route components
├── routing/            # AppRoutes, route guards
└── middleware/         # Request/response interceptors
```

**Component Analysis**

**Admin Components** (Highly Developed)
- AdminDashboardV2: Comprehensive admin overview
- InvestorManagementView: Full investor lifecycle management
- FundManagement: Fund creation, AUM tracking, NAV calculations
- ExpertInvestorDashboard: Advanced investor analytics
- YieldManagement: Yield rate configuration
- AdminWithdrawalsPage: Withdrawal queue processing
- Statement generation and batch processing

**Investor Components** (Production-Ready)
- Dashboard: Portfolio overview, performance charts
- TransactionsPage: Transaction history with filtering
- StatementsPage: Monthly statement downloads
- AssetDetail: Individual asset performance
- AccountPage: Profile, security, notifications
- DocumentsVault: Secure document storage

**Service Layer** (Needs Enhancement)

Current services are thin wrappers around Supabase queries:
```typescript
// Example: portfolioService.ts
export async function getUserPortfolio(userId: string) {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId);
  return data || [];
}
```

**Missing Backend Services**:
- ❌ Automated yield calculation engine
- ❌ Real-time price feed integration
- ❌ Blockchain transaction verification
- ❌ Email notification queue
- ❌ Report generation service
- ❌ Data aggregation pipelines

---

### 1.4 Security Assessment

**Authentication & Authorization** ⭐⭐⭐⭐⭐
```typescript
✅ Supabase Auth with email/password
✅ 2FA/TOTP support (speakeasy)
✅ Password reset flows
✅ Session management and tracking
✅ Admin role-based access control
✅ Protected routes (ProtectedRoute, AdminRoute)
```

**Row-Level Security (RLS)** ⭐⭐⭐⭐⭐
```sql
-- Example: positions table
CREATE POLICY "positions_select_policy" ON public.positions
  FOR SELECT USING (
    investor_id = auth.uid() OR
    public.is_admin()
  );
```

All tables have comprehensive RLS policies:
- Investors can only see their own data
- Admins have full access
- Audit logs are immutable
- No cascading deletes without proper checks

**API Security** ⭐⭐⭐ (Good, needs improvement)
```
✅ HTTPS-only (Supabase enforced)
✅ JWT token authentication
✅ CORS configured
⚠️ No rate limiting (client-side only)
⚠️ No API request signing
⚠️ Direct Supabase client calls (bypass rate limits)
```

**Data Privacy** ⭐⭐⭐⭐
```
✅ PII fields properly segregated
✅ Audit trail for compliance
✅ Storage buckets with RLS
✅ Session tracking
⚠️ No data encryption at application level
⚠️ No PII tokenization
```

**Recommendations**:
1. Implement Supabase Edge Functions for sensitive operations
2. Add request rate limiting at the API layer
3. Implement API key rotation for admin operations
4. Add data encryption for PII fields
5. Implement IP whitelisting for admin actions

---

## 2. System Architecture Design

### 2.1 Current Architecture (As-Is)

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT BROWSER                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          React SPA (Vite)                            │  │
│  │  ├── Investor Portal                                 │  │
│  │  ├── Admin Dashboard                                 │  │
│  │  └── Auth (Login, 2FA)                               │  │
│  └────────────────┬─────────────────────────────────────┘  │
└────────────────────┼────────────────────────────────────────┘
                     │
                     │ HTTPS + JWT
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE PLATFORM                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Supabase Auth (JWT, 2FA)                            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database (50+ tables)                    │  │
│  │    ├── Row-Level Security (RLS)                      │  │
│  │    ├── Triggers & Functions                          │  │
│  │    └── Indexes & Constraints                         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Storage (Statements, Documents, PDFs)               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Edge Functions (NOT YET IMPLEMENTED) ⚠️             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                     │
                     │ (External Integrations - Manual)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  External Services (Loosely Coupled)                        │
│    • Sentry (Error Tracking) ✅                             │
│    • PostHog (Analytics) ✅                                 │
│    • MailerLite (Email) ✅                                  │
│    • Blockchain RPCs ❌ Not integrated                      │
│    • Price Oracles ❌ Not integrated                        │
└─────────────────────────────────────────────────────────────┘
```

**Current Limitations**:
1. All business logic runs client-side (in React)
2. No backend API layer for complex operations
3. No automated data pipelines
4. No blockchain integration
5. Manual yield calculations
6. No real-time price updates

---

### 2.2 Proposed Architecture (To-Be)

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  React SPA (Vite) - Presentation Layer                     │ │
│  │    ├── Investor Portal (Dashboard, Statements, Assets)     │ │
│  │    ├── Admin Portal (Fund Mgmt, Investors, Reports)        │ │
│  │    └── Auth Layer (Login, 2FA, Session Management)         │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           │ HTTPS + JWT
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER (NEW)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Supabase Edge Functions (TypeScript/Deno)                 │ │
│  │    ├── Rate Limiting & Throttling                          │ │
│  │    ├── Request Validation (Zod schemas)                    │ │
│  │    ├── API Key Management                                  │ │
│  │    └── Audit Logging                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER (NEW)                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Backend Services (Supabase Edge Functions)                │ │
│  │    ├── Yield Calculation Service                           │ │
│  │    ├── Portfolio Valuation Service                         │ │
│  │    ├── Transaction Verification Service                    │ │
│  │    ├── Statement Generation Service                        │ │
│  │    ├── Notification Service                                │ │
│  │    └── Report Aggregation Service                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database (Supabase)                            │ │
│  │    ├── Core Tables (50+ production tables)                 │ │
│  │    ├── Row-Level Security (RLS)                            │ │
│  │    ├── Stored Procedures & Functions                       │ │
│  │    ├── Triggers for Audit Trail                            │ │
│  │    └── Materialized Views for Analytics                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Storage (Supabase Storage)                                │ │
│  │    ├── Statements Bucket (PDFs, encrypted)                 │ │
│  │    ├── Documents Bucket (secure documents)                 │ │
│  │    └── Branding Assets                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                   INTEGRATION LAYER (NEW)                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  External Service Integrations                             │ │
│  │    ├── Blockchain RPCs (Alchemy, Infura, QuickNode)        │ │
│  │    ├── Price Oracles (CoinGecko, CoinMarketCap)            │ │
│  │    ├── DeFi Protocols (Aave, Compound, Lido) [Future]      │ │
│  │    ├── Email Service (MailerLite, SendGrid)                │ │
│  │    ├── Analytics (PostHog, Mixpanel)                       │ │
│  │    └── Monitoring (Sentry, DataDog) [Future]               │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                   BACKGROUND JOBS (NEW)                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Scheduled Tasks (Supabase Cron + pg_cron)                 │ │
│  │    ├── Daily Yield Application (runs at midnight UTC)      │ │
│  │    ├── Price Feed Updates (every 5 minutes)                │ │
│  │    ├── Portfolio Valuation (every hour)                    │ │
│  │    ├── Statement Generation (monthly, 1st of month)        │ │
│  │    ├── NAV Calculations (daily)                            │ │
│  │    └── Email Notifications (every 15 minutes)              │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

### 2.3 Data Flow Architecture

**Example: Daily Yield Application Flow**

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Scheduled Trigger (pg_cron)                        │
│    ├── Trigger: daily_yield_job (runs at 00:00 UTC)        │
│    └── Invokes: apply_daily_yield() function               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Fetch Active Positions                             │
│    ├── Query: SELECT * FROM positions WHERE current_balance > 0
│    ├── Get yield rate from yield_rates table               │
│    └── Calculate yield for each position                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Apply Yield to Positions                           │
│    ├── UPDATE positions SET current_balance += yield       │
│    ├── INSERT INTO transactions (type: INTEREST)           │
│    └── INSERT INTO daily_yield_applications                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Update Portfolio History                           │
│    ├── INSERT INTO portfolio_history (daily snapshot)      │
│    └── Update materialized views                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Send Notifications (if configured)                 │
│    ├── INSERT INTO notifications                           │
│    └── Trigger email notification job                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Backend Implementation Roadmap

### Phase 1: Core Backend Services (Weeks 1-2)

**1.1 Supabase Edge Functions Setup**

```typescript
// supabase/functions/apply-daily-yield/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Verify admin authentication
  const authHeader = req.headers.get('Authorization')!
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401
    })
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403
    })
  }

  // Apply daily yield logic
  const result = await applyDailyYield(supabase)

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  })
})

async function applyDailyYield(supabase: any) {
  // 1. Get all active positions
  const { data: positions } = await supabase
    .from('positions')
    .select('*, profiles:investor_id(fee_percentage)')
    .gt('current_balance', 0)

  // 2. Get today's yield rates
  const { data: yieldRates } = await supabase
    .from('yield_rates')
    .select('*')
    .eq('date', new Date().toISOString().split('T')[0])

  // 3. Calculate and apply yield
  const updates = []
  const transactions = []

  for (const position of positions) {
    const rate = yieldRates.find(r => r.asset_code === position.asset_code)
    if (!rate) continue

    const grossYield = position.current_balance * rate.daily_yield_percentage
    const feeAmount = grossYield * position.profiles.fee_percentage
    const netYield = grossYield - feeAmount

    updates.push({
      id: position.id,
      current_balance: position.current_balance + netYield,
      total_earned: position.total_earned + netYield
    })

    transactions.push({
      investor_id: position.investor_id,
      asset_code: position.asset_code,
      amount: netYield,
      type: 'INTEREST',
      status: 'confirmed',
      created_at: new Date().toISOString()
    })
  }

  // 4. Batch update positions
  await supabase.from('positions').upsert(updates)

  // 5. Insert transactions
  await supabase.from('transactions').insert(transactions)

  return { success: true, positions_updated: updates.length }
}
```

**Edge Functions to Implement**:
1. `apply-daily-yield` - Daily yield calculation and application
2. `calculate-nav` - Fund NAV calculation
3. `generate-statement` - Monthly statement generation
4. `process-withdrawal` - Withdrawal request processing
5. `update-portfolio-valuation` - Real-time portfolio valuation
6. `send-notifications` - Batch notification sender

**1.2 Database Functions & Triggers**

```sql
-- Function: Calculate portfolio value in USD
CREATE OR REPLACE FUNCTION calculate_portfolio_value(p_investor_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_value NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(
    p.current_balance * ap.price_usd
  ), 0)
  INTO total_value
  FROM positions p
  JOIN assets_v2 a ON a.symbol = p.asset_code
  LEFT JOIN LATERAL (
    SELECT price_usd
    FROM asset_prices
    WHERE asset_id = a.asset_id
    ORDER BY as_of DESC
    LIMIT 1
  ) ap ON TRUE
  WHERE p.investor_id = p_investor_id;

  RETURN total_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Apply daily yield to all positions
CREATE OR REPLACE FUNCTION apply_daily_yield(p_application_date DATE)
RETURNS TABLE(
  positions_updated INTEGER,
  total_yield_applied NUMERIC,
  investors_affected INTEGER
) AS $$
DECLARE
  v_positions_updated INTEGER := 0;
  v_total_yield NUMERIC := 0;
  v_investors_affected INTEGER := 0;
BEGIN
  -- Apply yield to each position
  WITH yield_calculations AS (
    SELECT
      p.id,
      p.investor_id,
      p.asset_code,
      p.current_balance,
      yr.daily_yield_percentage,
      pr.fee_percentage,
      (p.current_balance * yr.daily_yield_percentage) AS gross_yield,
      (p.current_balance * yr.daily_yield_percentage * (1 - pr.fee_percentage)) AS net_yield
    FROM positions p
    JOIN yield_rates yr ON yr.asset_code = p.asset_code
      AND yr.date = p_application_date
    JOIN profiles pr ON pr.id = p.investor_id
    WHERE p.current_balance > 0
  )
  UPDATE positions p
  SET
    current_balance = p.current_balance + yc.net_yield,
    total_earned = p.total_earned + yc.net_yield,
    updated_at = NOW()
  FROM yield_calculations yc
  WHERE p.id = yc.id;

  GET DIAGNOSTICS v_positions_updated = ROW_COUNT;

  -- Insert interest transactions
  INSERT INTO transactions (investor_id, asset_code, amount, type, status, created_at)
  SELECT
    investor_id,
    asset_code,
    net_yield,
    'INTEREST',
    'confirmed',
    NOW()
  FROM yield_calculations;

  -- Calculate totals
  SELECT COUNT(DISTINCT investor_id), COALESCE(SUM(net_yield), 0)
  INTO v_investors_affected, v_total_yield
  FROM yield_calculations;

  -- Log the application
  INSERT INTO daily_yield_applications (
    application_date,
    asset_code,
    total_yield_generated,
    investors_affected,
    applied_at,
    applied_by
  )
  SELECT
    p_application_date,
    asset_code,
    SUM(net_yield),
    COUNT(DISTINCT investor_id),
    NOW(),
    auth.uid()
  FROM yield_calculations
  GROUP BY asset_code;

  RETURN QUERY SELECT v_positions_updated, v_total_yield, v_investors_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Scheduled job: Apply daily yield
SELECT cron.schedule(
  'apply-daily-yield',
  '0 0 * * *',  -- Run at midnight UTC
  $$
  SELECT apply_daily_yield(CURRENT_DATE);
  $$
);
```

**1.3 Materialized Views for Performance**

```sql
-- Materialized view: Investor summary
CREATE MATERIALIZED VIEW investor_summary AS
SELECT
  p.id AS investor_id,
  p.email,
  p.first_name,
  p.last_name,
  COUNT(pos.id) AS position_count,
  COALESCE(SUM(pos.current_balance * ap.price_usd), 0) AS total_portfolio_value_usd,
  COALESCE(SUM(pos.total_earned * ap.price_usd), 0) AS total_earnings_usd,
  MAX(t.created_at) AS last_transaction_date
FROM profiles p
LEFT JOIN positions pos ON pos.investor_id = p.id
LEFT JOIN assets_v2 a ON a.symbol = pos.asset_code
LEFT JOIN LATERAL (
  SELECT price_usd
  FROM asset_prices
  WHERE asset_id = a.asset_id
  ORDER BY as_of DESC
  LIMIT 1
) ap ON TRUE
LEFT JOIN transactions t ON t.investor_id = p.id
WHERE p.is_admin = FALSE
GROUP BY p.id, p.email, p.first_name, p.last_name;

CREATE UNIQUE INDEX ON investor_summary (investor_id);

-- Refresh schedule
SELECT cron.schedule(
  'refresh-investor-summary',
  '*/15 * * * *',  -- Every 15 minutes
  $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY investor_summary;
  $$
);
```

---

### Phase 2: External Integrations (Weeks 3-4)

**2.1 Price Feed Integration**

```typescript
// supabase/functions/update-asset-prices/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Fetch prices from CoinGecko
  const coingeckoApiKey = Deno.env.get('COINGECKO_API_KEY')

  const { data: assets } = await supabase
    .from('assets_v2')
    .select('asset_id, coingecko_id')
    .eq('is_active', true)
    .not('coingecko_id', 'is', null)

  const ids = assets.map(a => a.coingecko_id).join(',')

  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
    {
      headers: {
        'x-cg-pro-api-key': coingeckoApiKey
      }
    }
  )

  const prices = await response.json()

  // Insert price data
  const priceInserts = []
  for (const asset of assets) {
    const priceData = prices[asset.coingecko_id]
    if (!priceData) continue

    priceInserts.push({
      asset_id: asset.asset_id,
      price_usd: priceData.usd,
      market_cap: priceData.usd_market_cap,
      volume_24h: priceData.usd_24h_vol,
      as_of: new Date().toISOString(),
      source: 'coingecko'
    })
  }

  await supabase.from('asset_prices').insert(priceInserts)

  return new Response(
    JSON.stringify({ success: true, prices_updated: priceInserts.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})

// Schedule: Every 5 minutes
```

**2.2 Blockchain Integration (Future)**

```typescript
// supabase/functions/verify-blockchain-transaction/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'

serve(async (req) => {
  const { transactionId, txHash, network } = await req.json()

  // Connect to blockchain RPC
  const rpcUrl = Deno.env.get(`${network.toUpperCase()}_RPC_URL`)
  const provider = new ethers.JsonRpcProvider(rpcUrl)

  // Verify transaction
  const tx = await provider.getTransaction(txHash)
  const receipt = await provider.getTransactionReceipt(txHash)

  if (!tx || !receipt) {
    return new Response(
      JSON.stringify({ error: 'Transaction not found' }),
      { status: 404 }
    )
  }

  // Verify confirmations
  const currentBlock = await provider.getBlockNumber()
  const confirmations = currentBlock - receipt.blockNumber

  // Update transaction in database
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  await supabase
    .from('transactions')
    .update({
      status: confirmations >= 12 ? 'confirmed' : 'pending',
      tx_hash: txHash,
      confirmed_at: confirmations >= 12 ? new Date().toISOString() : null,
      meta: {
        confirmations,
        block_number: receipt.blockNumber,
        gas_used: receipt.gasUsed.toString()
      }
    })
    .eq('id', transactionId)

  return new Response(
    JSON.stringify({ success: true, confirmations }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

---

### Phase 3: Real-Time Features (Weeks 5-6)

**3.1 Real-Time Subscriptions**

```typescript
// src/hooks/useRealtimePositions.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useRealtimePositions(investorId: string) {
  const [positions, setPositions] = useState([])
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    // Initial fetch
    fetchPositions()

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`positions:${investorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'positions',
          filter: `investor_id=eq.${investorId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setPositions(prev =>
              prev.map(p => p.id === payload.new.id ? payload.new : p)
            )
          }
        }
      )
      .subscribe()

    setChannel(channel)

    return () => {
      channel.unsubscribe()
    }
  }, [investorId])

  async function fetchPositions() {
    const { data } = await supabase
      .from('positions')
      .select('*')
      .eq('investor_id', investorId)

    setPositions(data || [])
  }

  return positions
}
```

**3.2 WebSocket Notifications**

```typescript
// src/services/notificationService.ts
import { supabase } from '@/integrations/supabase/client'

export class NotificationService {
  private channel: any

  subscribe(userId: string, onNotification: (notification: any) => void) {
    this.channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          onNotification(payload.new)
        }
      )
      .subscribe()
  }

  unsubscribe() {
    if (this.channel) {
      this.channel.unsubscribe()
    }
  }
}
```

---

## 4. Database Migration Strategy

### 4.1 New Tables Required

```sql
-- Table: price_feed_history (for historical price tracking)
CREATE TABLE IF NOT EXISTS price_feed_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT NOT NULL REFERENCES assets_v2(asset_id),
  price_usd NUMERIC(20, 8) NOT NULL,
  source TEXT NOT NULL, -- 'coingecko', 'binance', 'manual'
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(asset_id, timestamp, source)
);

CREATE INDEX idx_price_feed_history_asset_time ON price_feed_history(asset_id, timestamp DESC);

-- Table: blockchain_transactions (for blockchain verification)
CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  chain TEXT NOT NULL, -- 'ethereum', 'bitcoin', 'solana'
  tx_hash TEXT NOT NULL UNIQUE,
  from_address TEXT,
  to_address TEXT,
  amount NUMERIC(38, 18),
  confirmations INTEGER DEFAULT 0,
  block_number BIGINT,
  status TEXT DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blockchain_tx_hash ON blockchain_transactions(tx_hash);
CREATE INDEX idx_blockchain_tx_status ON blockchain_transactions(status);

-- Table: notification_queue (for async notification processing)
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channels TEXT[] DEFAULT ARRAY['in-app'], -- 'in-app', 'email', 'sms'
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_queue_status ON notification_queue(status, created_at);

-- Table: job_queue (for background job tracking)
CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_queue_status ON job_queue(status, scheduled_at);
```

### 4.2 RLS Policies for New Tables

```sql
-- Price feed history: Read-only for all authenticated users
ALTER TABLE price_feed_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_feed_select" ON price_feed_history
  FOR SELECT USING (TRUE);

CREATE POLICY "price_feed_insert" ON price_feed_history
  FOR INSERT WITH CHECK (public.is_admin());

-- Blockchain transactions: Investors can see their own, admins see all
ALTER TABLE blockchain_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blockchain_tx_select" ON blockchain_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = blockchain_transactions.transaction_id
      AND (t.investor_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "blockchain_tx_insert" ON blockchain_transactions
  FOR INSERT WITH CHECK (public.is_admin());

-- Notification queue: Users can see their own notifications
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_queue_select" ON notification_queue
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "notification_queue_insert" ON notification_queue
  FOR INSERT WITH CHECK (TRUE);

-- Job queue: Admin only
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_queue_admin_only" ON job_queue
  FOR ALL USING (public.is_admin());
```

---

## 5. API Endpoints Design

### 5.1 Core API Structure

```
Base URL: https://[project-ref].supabase.co/functions/v1

Authentication: Bearer <JWT_TOKEN>

Endpoints:

# Portfolio Management
GET    /api/portfolio                  # Get user portfolio
GET    /api/portfolio/:assetId         # Get single asset position
GET    /api/portfolio/history          # Get historical snapshots
POST   /api/portfolio/valuation        # Calculate current valuation

# Transactions
GET    /api/transactions               # List transactions (paginated)
GET    /api/transactions/:id           # Get transaction detail
POST   /api/transactions/deposit       # Create deposit transaction
POST   /api/transactions/withdrawal    # Create withdrawal request

# Admin Operations
POST   /api/admin/yield/apply          # Apply daily yield
POST   /api/admin/nav/calculate        # Calculate fund NAV
POST   /api/admin/statements/generate  # Generate monthly statements
GET    /api/admin/investors            # List all investors
POST   /api/admin/investors/:id/adjust-balance

# Price Feeds
GET    /api/prices                     # Get current prices
GET    /api/prices/history             # Get historical prices

# Notifications
GET    /api/notifications              # Get user notifications
PATCH  /api/notifications/:id/read    # Mark as read
POST   /api/notifications/send         # Send notification (admin)

# Reports
GET    /api/reports/statements/:period # Get statement
POST   /api/reports/generate           # Generate custom report
GET    /api/reports/performance        # Performance analytics
```

### 5.2 Example Edge Function Structure

```typescript
// supabase/functions/_shared/middleware.ts
export async function authenticateUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Error('Missing authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  return user
}

export async function requireAdmin(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()

  if (!profile?.is_admin) {
    throw new Error('Forbidden: Admin access required')
  }
}

export async function validateRequest(req: Request, schema: z.ZodSchema) {
  const body = await req.json()
  return schema.parse(body)
}

export function createResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

export function createErrorResponse(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
```

```typescript
// supabase/functions/api-portfolio/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateUser,
  createResponse,
  createErrorResponse
} from '../_shared/middleware.ts'

serve(async (req) => {
  try {
    // Authenticate user
    const user = await authenticateUser(req)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch portfolio positions
    const { data: positions, error } = await supabase
      .from('positions')
      .select(`
        *,
        assets:asset_code (
          symbol,
          name,
          icon_url,
          decimal_places
        )
      `)
      .eq('investor_id', user.id)
      .order('current_balance', { ascending: false })

    if (error) throw error

    // Enrich with current prices
    const enrichedPositions = await Promise.all(
      positions.map(async (position) => {
        const { data: latestPrice } = await supabase
          .from('asset_prices')
          .select('price_usd')
          .eq('asset_id', position.asset_code)
          .order('as_of', { ascending: false })
          .limit(1)
          .single()

        const usdValue = position.current_balance * (latestPrice?.price_usd || 0)
        const totalReturn = position.total_earned / position.principal

        return {
          ...position,
          current_price_usd: latestPrice?.price_usd || 0,
          usd_value: usdValue,
          total_return_percentage: totalReturn * 100
        }
      })
    )

    // Calculate portfolio totals
    const totalValue = enrichedPositions.reduce(
      (sum, p) => sum + p.usd_value,
      0
    )
    const totalEarnings = enrichedPositions.reduce(
      (sum, p) => sum + p.total_earned * (p.current_price_usd || 0),
      0
    )

    return createResponse({
      positions: enrichedPositions,
      summary: {
        total_portfolio_value_usd: totalValue,
        total_earnings_usd: totalEarnings,
        position_count: enrichedPositions.length
      }
    })

  } catch (error) {
    console.error('Portfolio API error:', error)
    return createErrorResponse(error.message, 500)
  }
})
```

---

## 6. Security & Compliance

### 6.1 Security Enhancements

**API Rate Limiting**
```typescript
// Implement rate limiting in Edge Functions
import { RateLimiter } from 'https://deno.land/x/rate_limiter/mod.ts'

const limiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each user to 100 requests per windowMs
})

export async function rateLimitCheck(userId: string) {
  const allowed = await limiter.check(userId)
  if (!allowed) {
    throw new Error('Rate limit exceeded')
  }
}
```

**Request Signing** (for sensitive admin operations)
```typescript
import { createHmac } from 'crypto'

export function signRequest(payload: any, secret: string): string {
  const hmac = createHmac('sha256', secret)
  hmac.update(JSON.stringify(payload))
  return hmac.digest('hex')
}

export function verifyRequestSignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = signRequest(payload, secret)
  return signature === expectedSignature
}
```

**Audit Logging Enhancement**
```sql
-- Enhanced audit log function
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_entity TEXT,
  p_entity_id TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_meta JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_log (
    actor_user,
    action,
    entity,
    entity_id,
    old_values,
    new_values,
    meta,
    created_at
  ) VALUES (
    auth.uid(),
    p_action,
    p_entity,
    p_entity_id,
    p_old_values,
    p_new_values,
    jsonb_build_object(
      'ip_address', current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
      'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent',
      'custom_meta', p_meta
    ),
    NOW()
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.2 Data Encryption

```sql
-- Enable pgcrypto for data encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(
      data,
      current_setting('app.encryption_key')
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_data, 'base64'),
    current_setting('app.encryption_key')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.3 Compliance Features

**GDPR Compliance**
```sql
-- Table: data_export_requests
CREATE TABLE data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
  export_url TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Function to export user data
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'profile', (SELECT row_to_json(profiles.*) FROM profiles WHERE id = p_user_id),
    'positions', (SELECT jsonb_agg(row_to_json(positions.*)) FROM positions WHERE investor_id = p_user_id),
    'transactions', (SELECT jsonb_agg(row_to_json(transactions.*)) FROM transactions WHERE investor_id = p_user_id),
    'statements', (SELECT jsonb_agg(row_to_json(statements.*)) FROM statements WHERE investor_id = p_user_id)
  ) INTO user_data;

  RETURN user_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to anonymize user data (GDPR right to be forgotten)
CREATE OR REPLACE FUNCTION anonymize_user_data(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Anonymize profile
  UPDATE profiles
  SET
    email = 'anonymized_' || gen_random_uuid() || '@deleted.com',
    first_name = 'Anonymized',
    last_name = 'User',
    phone = NULL,
    avatar_url = NULL
  WHERE id = p_user_id;

  -- Log the action
  PERFORM log_audit_event('ANONYMIZE_USER', 'profiles', p_user_id::TEXT);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 7. Testing Strategy

### 7.1 Database Testing

```sql
-- Test file: tests/database/test_yield_application.sql

BEGIN;

-- Setup test data
INSERT INTO profiles (id, email, first_name, is_admin, fee_percentage)
VALUES ('test-user-1', 'test@example.com', 'Test', FALSE, 0.02);

INSERT INTO assets (symbol, name) VALUES ('BTC', 'Bitcoin');

INSERT INTO positions (investor_id, asset_code, principal, current_balance)
VALUES ('test-user-1', 'BTC', 1.0, 1.0);

INSERT INTO yield_rates (asset_id, daily_yield_percentage, date)
VALUES (1, 0.0001, CURRENT_DATE); -- 0.01% daily

-- Run yield application
SELECT * FROM apply_daily_yield(CURRENT_DATE);

-- Assertions
DO $$
DECLARE
  v_new_balance NUMERIC;
  v_expected_balance NUMERIC := 1.0 * (1 + 0.0001 * (1 - 0.02));
BEGIN
  SELECT current_balance INTO v_new_balance
  FROM positions
  WHERE investor_id = 'test-user-1' AND asset_code = 'BTC';

  IF ABS(v_new_balance - v_expected_balance) > 0.0001 THEN
    RAISE EXCEPTION 'Yield calculation incorrect: expected %, got %',
      v_expected_balance, v_new_balance;
  END IF;

  RAISE NOTICE 'Test passed: Yield calculated correctly';
END $$;

ROLLBACK; -- Clean up test data
```

### 7.2 API Testing

```typescript
// tests/api/portfolio.test.ts
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts'

Deno.test('Portfolio API - Get user portfolio', async () => {
  const response = await fetch('http://localhost:54321/functions/v1/api-portfolio', {
    headers: {
      'Authorization': `Bearer ${TEST_USER_JWT}`,
    }
  })

  assertEquals(response.status, 200)

  const data = await response.json()
  assertEquals(data.positions.length > 0, true)
  assertEquals(data.summary.total_portfolio_value_usd > 0, true)
})

Deno.test('Portfolio API - Unauthorized access', async () => {
  const response = await fetch('http://localhost:54321/functions/v1/api-portfolio')

  assertEquals(response.status, 401)
})
```

### 7.3 Integration Testing

```typescript
// tests/integration/daily-yield-flow.test.ts
import { createClient } from '@supabase/supabase-js'

Deno.test('Daily Yield Flow - End to End', async () => {
  const supabase = createClient(TEST_SUPABASE_URL, TEST_SERVICE_ROLE_KEY)

  // 1. Create test investor
  const { data: user } = await supabase.auth.admin.createUser({
    email: 'test@example.com',
    password: 'test-password'
  })

  // 2. Add position
  await supabase.from('positions').insert({
    investor_id: user.id,
    asset_code: 'BTC',
    principal: 1.0,
    current_balance: 1.0
  })

  // 3. Add yield rate
  await supabase.from('yield_rates').insert({
    asset_id: 1,
    daily_yield_percentage: 0.0001,
    date: new Date().toISOString().split('T')[0]
  })

  // 4. Trigger yield application
  const response = await fetch(
    `${TEST_SUPABASE_URL}/functions/v1/apply-daily-yield`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_JWT}`,
      }
    }
  )

  assertEquals(response.status, 200)

  // 5. Verify position updated
  const { data: position } = await supabase
    .from('positions')
    .select('current_balance, total_earned')
    .eq('investor_id', user.id)
    .single()

  assertEquals(position.current_balance > 1.0, true)
  assertEquals(position.total_earned > 0, true)

  // 6. Verify transaction created
  const { data: transaction } = await supabase
    .from('transactions')
    .select('*')
    .eq('investor_id', user.id)
    .eq('type', 'INTEREST')
    .single()

  assertEquals(transaction !== null, true)

  // Cleanup
  await supabase.auth.admin.deleteUser(user.id)
})
```

---

## 8. Deployment Strategy

### 8.1 Environment Configuration

```bash
# .env.production
VITE_SUPABASE_URL=https://nkfimvovosdehmyyjubn.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# External APIs
COINGECKO_API_KEY=<api_key>
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<key>
BITCOIN_RPC_URL=<btc_rpc_url>
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Email
MAILERLITE_API_KEY=<api_key>

# Monitoring
VITE_SENTRY_DSN=<sentry_dsn>
SENTRY_AUTH_TOKEN=<sentry_token>
VITE_POSTHOG_KEY=<posthog_key>

# Encryption
ENCRYPTION_KEY=<32_byte_key>

# Feature Flags
ENABLE_BLOCKCHAIN_VERIFICATION=false
ENABLE_AUTOMATED_YIELD=true
ENABLE_PRICE_FEEDS=true
```

### 8.2 Supabase Edge Functions Deployment

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref nkfimvovosdehmyyjubn

# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy apply-daily-yield

# Set secrets
supabase secrets set COINGECKO_API_KEY=xxx
supabase secrets set ETHEREUM_RPC_URL=xxx
supabase secrets set MAILERLITE_API_KEY=xxx
```

### 8.3 Database Migration Deployment

```bash
# Generate new migration
supabase migration new add_price_feed_integration

# Apply migrations locally
supabase db reset

# Push migrations to production (CAUTION)
supabase db push

# Create backup before production deployment
pg_dump $SUPABASE_PROD_DB_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 8.4 Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
vercel --prod

# Configure environment variables in Vercel dashboard
# https://vercel.com/indigo-yield/settings/environment-variables
```

### 8.5 Monitoring & Observability

```typescript
// Configure Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0
})

// Configure PostHog
posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  loaded: (posthog) => {
    if (import.meta.env.MODE === 'development') {
      posthog.opt_out_capturing()
    }
  }
})
```

---

## 9. Step-by-Step Build Plan

### Week 1: Foundation Setup
**Days 1-2: Backend Infrastructure**
- [ ] Set up Supabase Edge Functions structure
- [ ] Create shared middleware (auth, validation, error handling)
- [ ] Implement rate limiting utilities
- [ ] Set up logging and monitoring
- [ ] Deploy test Edge Function

**Days 3-4: Core Database Functions**
- [ ] Create `apply_daily_yield()` function
- [ ] Create `calculate_portfolio_value()` function
- [ ] Create `calculate_fund_nav()` function
- [ ] Add comprehensive error handling
- [ ] Write unit tests for functions

**Day 5: Testing & Documentation**
- [ ] Write database test suite
- [ ] Create API documentation
- [ ] Test RLS policies
- [ ] Document Edge Functions

---

### Week 2: Core Services
**Days 1-2: Yield Application Service**
- [ ] Implement `apply-daily-yield` Edge Function
- [ ] Add transaction creation logic
- [ ] Implement fee calculation
- [ ] Add audit logging
- [ ] Test with sample data

**Days 3-4: Portfolio Valuation Service**
- [ ] Implement `api-portfolio` Edge Function
- [ ] Add price enrichment logic
- [ ] Calculate returns (MTD, YTD, ITD)
- [ ] Optimize query performance
- [ ] Add caching layer

**Day 5: Statement Generation**
- [ ] Implement `generate-statement` Edge Function
- [ ] Integrate with existing PDF generation
- [ ] Add storage bucket upload
- [ ] Send notification on completion
- [ ] Test with real investor data

---

### Week 3: External Integrations
**Days 1-2: Price Feed Integration**
- [ ] Implement CoinGecko API client
- [ ] Create `update-asset-prices` Edge Function
- [ ] Schedule price updates (every 5 minutes)
- [ ] Add fallback to Binance API
- [ ] Store historical price data

**Days 3-4: Email Notification Service**
- [ ] Implement notification queue processing
- [ ] Integrate MailerLite API
- [ ] Create email templates
- [ ] Add batch sending logic
- [ ] Test email delivery

**Day 5: Monitoring & Alerts**
- [ ] Set up Sentry error tracking
- [ ] Configure PostHog events
- [ ] Add custom metrics
- [ ] Create admin alert system
- [ ] Test alerting workflows

---

### Week 4: Real-Time Features
**Days 1-2: Real-Time Subscriptions**
- [ ] Implement position real-time updates
- [ ] Add transaction status updates
- [ ] Create notification real-time stream
- [ ] Optimize subscription performance
- [ ] Test with concurrent users

**Days 3-4: Admin Dashboard Enhancements**
- [ ] Add real-time AUM tracker
- [ ] Implement live transaction feed
- [ ] Create system health dashboard
- [ ] Add performance metrics
- [ ] Optimize query performance

**Day 5: Integration Testing**
- [ ] End-to-end testing
- [ ] Load testing (100 concurrent users)
- [ ] Security audit
- [ ] Performance profiling
- [ ] Bug fixes

---

### Week 5: Blockchain Integration (Optional)
**Days 1-3: Transaction Verification**
- [ ] Implement Ethereum transaction verification
- [ ] Add Bitcoin transaction verification
- [ ] Create Solana transaction verification
- [ ] Store blockchain metadata
- [ ] Add confirmation tracking

**Days 4-5: Deposit/Withdrawal Automation**
- [ ] Monitor blockchain for deposits
- [ ] Automatic deposit confirmation
- [ ] Withdrawal transaction broadcasting
- [ ] Add transaction status webhooks
- [ ] Test with testnet

---

### Week 6: Polish & Deployment
**Days 1-2: Performance Optimization**
- [ ] Optimize database queries
- [ ] Add database indexes
- [ ] Implement query caching
- [ ] Optimize Edge Functions
- [ ] Load test all endpoints

**Days 3-4: Security Audit**
- [ ] Review RLS policies
- [ ] Test authentication flows
- [ ] Verify audit logging
- [ ] Test rate limiting
- [ ] Penetration testing

**Day 5: Production Deployment**
- [ ] Deploy Edge Functions to production
- [ ] Run database migrations
- [ ] Deploy frontend to Vercel
- [ ] Configure monitoring
- [ ] Smoke testing

---

## 10. Risk Assessment & Mitigation

### High-Risk Areas

**1. Yield Calculation Accuracy** 🔴
- **Risk**: Incorrect yield calculations could lead to financial discrepancies
- **Mitigation**:
  - Comprehensive unit tests for all calculations
  - Manual verification with Excel before automation
  - Dry-run mode for first month
  - Daily reconciliation reports
  - Admin approval required before committing

**2. Database Migration Errors** 🔴
- **Risk**: Production data loss or corruption
- **Mitigation**:
  - Always backup before migrations
  - Test migrations on staging environment
  - Use transactions for all migrations
  - Have rollback plan ready
  - Schedule migrations during low-traffic periods

**3. RLS Policy Bypass** 🟡
- **Risk**: Users accessing unauthorized data
- **Mitigation**:
  - Automated RLS policy testing
  - Regular security audits
  - Monitor access logs
  - Implement anomaly detection
  - Use service role key only in Edge Functions

**4. Rate Limiting Bypass** 🟡
- **Risk**: API abuse or DoS attacks
- **Mitigation**:
  - Implement rate limiting at multiple layers
  - Use Cloudflare for DDoS protection
  - Monitor for unusual traffic patterns
  - IP-based rate limiting
  - Captcha for suspicious activity

**5. External API Failures** 🟡
- **Risk**: Price feed or blockchain API downtime
- **Mitigation**:
  - Multiple API providers (fallback)
  - Cache last known good data
  - Manual override capability
  - Alert admin on API failures
  - Graceful degradation

---

## 11. Git Workflow & Version Control

### Branching Strategy

```
main (production)
  └── develop (staging)
      ├── feature/yield-calculation-service
      ├── feature/price-feed-integration
      ├── feature/real-time-subscriptions
      └── hotfix/fix-rls-policy
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/yield-calculation-service

# Regular commits
git add .
git commit -m "feat: Implement daily yield calculation logic"

# Push to remote
git push origin feature/yield-calculation-service

# Create pull request (via GitHub)
# After approval, merge to develop

# Deploy to staging
git checkout develop
git pull origin develop
# Test on staging environment

# Merge to main for production
git checkout main
git merge develop
git push origin main

# Tag release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### Commit Message Convention

```
feat: Add new feature
fix: Bug fix
docs: Documentation update
style: Code style changes
refactor: Code refactoring
test: Add tests
chore: Maintenance tasks
perf: Performance improvements
security: Security updates
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linter
npm run lint

# Run type checking
npx tsc --noEmit

# Run tests
npm run test
```

---

## 12. Success Metrics

### Technical Metrics
- [ ] API response time < 200ms (p95)
- [ ] Database query time < 50ms (p95)
- [ ] Zero RLS policy violations
- [ ] 99.9% uptime
- [ ] < 1% error rate

### Business Metrics
- [ ] Accurate yield calculations (100%)
- [ ] Statement generation < 5 minutes
- [ ] Real-time data updates < 1 second latency
- [ ] Zero security incidents
- [ ] Admin efficiency: 50% reduction in manual tasks

---

## 13. Conclusion

The Indigo Yield Platform has a **solid foundation** with a comprehensive database schema, mature frontend application, and production-ready infrastructure. The primary gaps are in the **backend service layer** and **external integrations**.

**Recommended Priorities**:
1. **Weeks 1-2**: Build core backend services (yield calculation, portfolio valuation)
2. **Week 3**: Integrate external APIs (price feeds, email notifications)
3. **Week 4**: Add real-time features
4. **Weeks 5-6**: Polish, security audit, and deploy

**Key Success Factors**:
- Maintain strict testing discipline
- Always backup before database changes
- Use feature flags for gradual rollout
- Monitor performance and errors closely
- Keep security at the forefront

This plan provides a clear roadmap to transform the Indigo Yield Platform from a client-heavy application to a robust, scalable DeFi platform with proper backend services, automated operations, and real-time capabilities.

---

**Document Version**: 1.0
**Last Updated**: October 6, 2025
**Prepared By**: Claude Code (Anthropic)
