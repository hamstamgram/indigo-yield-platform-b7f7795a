# Indigo Yield Platform - Web Pages Implementation Plan

**Version:** 1.0
**Last Updated:** 2025-11-04
**Total Pages:** 125
**Timeline:** 16 Weeks
**Team Size:** 3-5 Frontend Developers

---

## Table of Contents

1. [Technology Stack Overview](#technology-stack-overview)
2. [Project Architecture](#project-architecture)
3. [Module Breakdown](#module-breakdown)
4. [Implementation Timeline](#implementation-timeline)
5. [Code Patterns & Examples](#code-patterns--examples)
6. [Component Reusability Strategy](#component-reusability-strategy)
7. [Testing Strategy](#testing-strategy)
8. [Performance Optimization](#performance-optimization)

---

## Technology Stack Overview

### Core Technologies
```json
{
  "frontend": {
    "framework": "React 18.3",
    "language": "TypeScript 5.3",
    "build": "Vite 5.0",
    "routing": "React Router v6"
  },
  "state": {
    "global": "Zustand",
    "server": "TanStack Query (React Query)",
    "forms": "React Hook Form + Zod"
  },
  "ui": {
    "components": "Shadcn/ui",
    "styling": "Tailwind CSS",
    "icons": "Lucide React",
    "animations": "Framer Motion"
  },
  "backend": {
    "database": "Supabase PostgreSQL",
    "auth": "Supabase Auth",
    "storage": "Supabase Storage",
    "realtime": "Supabase Realtime"
  }
}
```

### Project Structure
```
src/
├── pages/                    # Page components (125 files)
│   ├── auth/                # Authentication pages (8 pages)
│   ├── dashboard/           # Dashboard pages (15 pages)
│   ├── transactions/        # Transaction pages (12 pages)
│   ├── withdrawals/         # Withdrawal pages (10 pages)
│   ├── documents/           # Document pages (8 pages)
│   ├── profile/             # Profile pages (10 pages)
│   ├── reports/             # Reports pages (12 pages)
│   ├── admin/               # Admin pages (20 pages)
│   ├── compliance/          # Compliance pages (8 pages)
│   ├── support/             # Support pages (7 pages)
│   ├── notifications/       # Notification pages (5 pages)
│   ├── learning/            # Learning center (6 pages)
│   └── referral/            # Referral program (4 pages)
├── components/              # Shared components
│   ├── ui/                  # Shadcn/ui components
│   ├── layouts/             # Layout components
│   ├── forms/               # Form components
│   ├── charts/              # Chart components
│   └── common/              # Common components
├── hooks/                   # Custom React hooks
├── lib/                     # Utility functions
├── services/                # API services
├── stores/                  # Zustand stores
├── types/                   # TypeScript types
└── routes/                  # Route configurations
```

---

## Module Breakdown

## Module 1: Authentication & Onboarding (8 pages)

### Pages Overview

| # | Page Name | Route | Component | Priority | Week |
|---|-----------|-------|-----------|----------|------|
| 1 | Login | `/login` | `LoginPage` | P0 | 1 |
| 2 | Register | `/register` | `RegisterPage` | P0 | 1 |
| 3 | Forgot Password | `/forgot-password` | `ForgotPasswordPage` | P0 | 1 |
| 4 | Reset Password | `/reset-password` | `ResetPasswordPage` | P0 | 1 |
| 5 | Email Verification | `/verify-email` | `VerifyEmailPage` | P0 | 1 |
| 6 | Welcome/Onboarding | `/welcome` | `WelcomePage` | P1 | 2 |
| 7 | KYC Onboarding | `/onboarding/kyc` | `KycOnboardingPage` | P0 | 2 |
| 8 | Profile Setup | `/onboarding/profile` | `ProfileSetupPage` | P1 | 2 |

### Module Architecture

```typescript
// Auth Module Structure
src/pages/auth/
├── LoginPage.tsx
├── RegisterPage.tsx
├── ForgotPasswordPage.tsx
├── ResetPasswordPage.tsx
├── VerifyEmailPage.tsx
├── WelcomePage.tsx
└── onboarding/
    ├── KycOnboardingPage.tsx
    └── ProfileSetupPage.tsx

// Shared Auth Components
src/components/auth/
├── AuthLayout.tsx
├── SocialLoginButtons.tsx
├── PasswordStrengthMeter.tsx
└── TwoFactorInput.tsx
```

### Data Requirements

**API Endpoints:**
```typescript
// Auth endpoints
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/verify-email
POST /auth/resend-verification
GET  /auth/session

// Onboarding endpoints
POST /onboarding/kyc
GET  /onboarding/status
PUT  /onboarding/profile
```

**Database Tables:**
- `users` - User accounts
- `user_profiles` - Extended user information
- `kyc_submissions` - KYC verification data
- `email_verifications` - Email verification tokens
- `password_resets` - Password reset tokens

**State Management:**
```typescript
// stores/authStore.ts
interface AuthStore {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
}

// stores/onboardingStore.ts
interface OnboardingStore {
  currentStep: number;
  steps: OnboardingStep[];
  kycData: KycData | null;
  profileData: ProfileData | null;
  setStep: (step: number) => void;
  saveKycData: (data: KycData) => Promise<void>;
}
```

### Page Specifications

#### 1. Login Page (`/login`)

**Features:**
- Email/password login form
- Social login (Google, Apple)
- "Remember me" checkbox
- Two-factor authentication
- Password visibility toggle
- "Forgot password" link
- Link to register page

**UI Components:**
- Email input with validation
- Password input with show/hide
- Submit button with loading state
- Social login buttons
- Error message display
- Success message display

**Permissions:** Public (unauthenticated)

**Responsive Design:**
- Mobile: Single column, full-width form
- Tablet: Centered card, max-width 480px
- Desktop: Split screen with branding

```typescript
// Example Implementation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
    } catch (error) {
      // Handle error
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              {...register('password')}
              error={errors.password?.message}
            />
          </div>

          <div className="flex items-center justify-between">
            <Checkbox
              id="rememberMe"
              {...register('rememberMe')}
              label="Remember me"
            />
            <Link to="/forgot-password" className="text-sm text-primary">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <SocialLoginButtons />

        <p className="text-center text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
```

#### 2. Register Page (`/register`)

**Features:**
- Multi-step registration form
- Email/password creation
- Terms and conditions acceptance
- Email verification trigger
- Password strength indicator
- Social registration
- Referral code input

**Form Fields:**
- First name, Last name
- Email (with verification)
- Password (with strength meter)
- Confirm password
- Phone number (optional)
- Referral code (optional)
- Terms acceptance checkbox

**Validation:**
```typescript
const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  referralCode: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
```

#### 3-8. Other Auth Pages

*(Similar detailed specifications for each page...)*

---

## Module 2: Dashboard & Portfolio (15 pages)

### Pages Overview

| # | Page Name | Route | Component | Priority | Week |
|---|-----------|-------|-----------|----------|------|
| 9 | Main Dashboard | `/dashboard` | `DashboardPage` | P0 | 2 |
| 10 | Portfolio Overview | `/dashboard/portfolio` | `PortfolioPage` | P0 | 2 |
| 11 | Portfolio Details | `/dashboard/portfolio/:id` | `PortfolioDetailsPage` | P0 | 3 |
| 12 | Asset Details | `/dashboard/assets/:id` | `AssetDetailsPage` | P1 | 3 |
| 13 | Performance Analytics | `/dashboard/performance` | `PerformancePage` | P1 | 3 |
| 14 | Holdings Breakdown | `/dashboard/holdings` | `HoldingsPage` | P1 | 3 |
| 15 | Market Overview | `/dashboard/market` | `MarketOverviewPage` | P2 | 4 |
| 16 | Watchlist | `/dashboard/watchlist` | `WatchlistPage` | P2 | 4 |
| 17 | Quick Actions | `/dashboard/quick-actions` | `QuickActionsPage` | P1 | 4 |
| 18 | Investment History | `/dashboard/history` | `InvestmentHistoryPage` | P1 | 4 |
| 19 | Calendar View | `/dashboard/calendar` | `CalendarPage` | P2 | 5 |
| 20 | Goals & Targets | `/dashboard/goals` | `GoalsPage` | P2 | 5 |
| 21 | Comparison Tool | `/dashboard/compare` | `ComparisonPage` | P2 | 5 |
| 22 | Projections | `/dashboard/projections` | `ProjectionsPage` | P2 | 5 |
| 23 | Risk Dashboard | `/dashboard/risk` | `RiskDashboardPage` | P1 | 6 |

### Module Architecture

```typescript
// Dashboard Module Structure
src/pages/dashboard/
├── DashboardPage.tsx           // Main dashboard
├── PortfolioPage.tsx           // Portfolio overview
├── PortfolioDetailsPage.tsx    // Individual portfolio
├── AssetDetailsPage.tsx        // Asset details
├── PerformancePage.tsx         // Performance analytics
├── HoldingsPage.tsx            // Holdings breakdown
├── MarketOverviewPage.tsx      // Market data
├── WatchlistPage.tsx           // User watchlist
├── QuickActionsPage.tsx        // Quick actions
├── InvestmentHistoryPage.tsx  // Investment history
├── CalendarPage.tsx            // Calendar view
├── GoalsPage.tsx               // Goals & targets
├── ComparisonPage.tsx          // Comparison tool
├── ProjectionsPage.tsx         // Projections
└── RiskDashboardPage.tsx       // Risk metrics

// Shared Dashboard Components
src/components/dashboard/
├── DashboardLayout.tsx
├── DashboardCard.tsx
├── PortfolioSummary.tsx
├── AssetChart.tsx
├── PerformanceChart.tsx
├── HoldingsTable.tsx
├── QuickActionButton.tsx
└── widgets/
    ├── BalanceWidget.tsx
    ├── ReturnsWidget.tsx
    ├── AllocationWidget.tsx
    └── ActivityWidget.tsx
```

### Data Requirements

**API Endpoints:**
```typescript
// Portfolio endpoints
GET  /portfolios
GET  /portfolios/:id
POST /portfolios
PUT  /portfolios/:id
DELETE /portfolios/:id

// Assets endpoints
GET  /assets
GET  /assets/:id
GET  /assets/:id/performance
GET  /assets/:id/transactions

// Dashboard endpoints
GET  /dashboard/summary
GET  /dashboard/performance
GET  /dashboard/holdings
GET  /dashboard/recent-activity
GET  /dashboard/market-data

// Analytics endpoints
GET  /analytics/returns
GET  /analytics/allocation
GET  /analytics/risk-metrics
GET  /analytics/projections
```

**Database Tables:**
- `portfolios` - User portfolios
- `assets` - Available assets
- `holdings` - User asset holdings
- `transactions` - All transactions
- `performance_history` - Historical performance data
- `market_data` - Real-time market data
- `watchlists` - User watchlists
- `goals` - User investment goals

**State Management:**
```typescript
// stores/portfolioStore.ts
interface PortfolioStore {
  portfolios: Portfolio[];
  currentPortfolio: Portfolio | null;
  totalValue: number;
  totalReturn: number;
  isLoading: boolean;
  fetchPortfolios: () => Promise<void>;
  selectPortfolio: (id: string) => void;
  refreshData: () => Promise<void>;
}

// stores/dashboardStore.ts
interface DashboardStore {
  summary: DashboardSummary | null;
  recentActivity: Activity[];
  marketData: MarketData | null;
  isLoading: boolean;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  fetchSummary: () => Promise<void>;
}
```

### Page Specifications

#### 9. Main Dashboard (`/dashboard`)

**Features:**
- Portfolio value overview
- Quick stats (returns, allocation, risk)
- Recent transactions
- Market highlights
- Quick action buttons
- Performance charts
- Asset allocation pie chart
- Notifications panel

**UI Components:**
- Hero section with total value
- Stat cards (4-6 cards)
- Recent activity list
- Mini charts (line, pie, bar)
- Quick action buttons
- News/updates feed

**Data Fetching:**
```typescript
// hooks/useDashboard.ts
export function useDashboard() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const { data } = await supabase
        .from('dashboard_summary')
        .select('*')
        .single();
      return data;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      return data;
    },
  });

  return { summary, recentActivity, isLoading };
}
```

**Implementation Example:**
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/hooks/useDashboard';
import { BalanceWidget } from '@/components/dashboard/widgets/BalanceWidget';
import { ReturnsWidget } from '@/components/dashboard/widgets/ReturnsWidget';
import { AllocationWidget } from '@/components/dashboard/widgets/AllocationWidget';
import { ActivityWidget } from '@/components/dashboard/widgets/ActivityWidget';

export function DashboardPage() {
  const { summary, recentActivity, isLoading } = useDashboard();

  if (isLoading) return <DashboardSkeleton />;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-2">
            ${summary?.totalValue.toLocaleString()}
          </h1>
          <p className="text-blue-100">Total Portfolio Value</p>
          <div className="mt-4 flex gap-4">
            <div>
              <p className="text-sm text-blue-100">Today's Change</p>
              <p className="text-2xl font-semibold">
                {summary?.todayChange >= 0 ? '+' : ''}
                {summary?.todayChange.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-100">Total Return</p>
              <p className="text-2xl font-semibold">
                {summary?.totalReturn >= 0 ? '+' : ''}
                {summary?.totalReturn.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <BalanceWidget data={summary} />
          <ReturnsWidget data={summary} />
          <AllocationWidget data={summary} />
          <Card>
            <CardHeader>
              <CardTitle>Risk Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {summary?.riskScore}/10
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceChart data={summary?.performanceData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Asset Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <AllocationPieChart data={summary?.allocationData} />
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2">
          <ActivityWidget activities={recentActivity} />
          <Card>
            <CardHeader>
              <CardTitle>Market Highlights</CardTitle>
            </CardHeader>
            <CardContent>
              <MarketHighlights />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
```

#### 10. Portfolio Overview (`/dashboard/portfolio`)

**Features:**
- List of all portfolios
- Create new portfolio button
- Portfolio cards with key metrics
- Search and filter
- Sort options
- Bulk actions
- Portfolio comparison

**UI Components:**
- Portfolio cards grid
- Create portfolio modal
- Search bar
- Filter dropdown
- Sort dropdown
- Action menu

#### 11-23. Other Dashboard Pages

*(Similar detailed specifications...)*

---

## Module 3: Transactions & Deposits (12 pages)

### Pages Overview

| # | Page Name | Route | Component | Priority | Week |
|---|-----------|-------|-----------|----------|------|
| 24 | Transactions List | `/transactions` | `TransactionsPage` | P0 | 3 |
| 25 | Transaction Details | `/transactions/:id` | `TransactionDetailsPage` | P0 | 3 |
| 26 | New Deposit | `/deposits/new` | `NewDepositPage` | P0 | 3 |
| 27 | Deposit Methods | `/deposits/methods` | `DepositMethodsPage` | P0 | 4 |
| 28 | Bank Transfer | `/deposits/bank-transfer` | `BankTransferPage` | P0 | 4 |
| 29 | Card Payment | `/deposits/card` | `CardPaymentPage` | P1 | 4 |
| 30 | Crypto Deposit | `/deposits/crypto` | `CryptoDepositPage` | P1 | 5 |
| 31 | Wire Transfer | `/deposits/wire` | `WireTransferPage` | P1 | 5 |
| 32 | Deposit History | `/deposits/history` | `DepositHistoryPage` | P1 | 5 |
| 33 | Pending Deposits | `/deposits/pending` | `PendingDepositsPage` | P1 | 5 |
| 34 | Recurring Deposits | `/deposits/recurring` | `RecurringDepositsPage` | P2 | 6 |
| 35 | Deposit Limits | `/deposits/limits` | `DepositLimitsPage` | P2 | 6 |

### Module Architecture

```typescript
// Transactions Module Structure
src/pages/transactions/
├── TransactionsPage.tsx
├── TransactionDetailsPage.tsx
└── deposits/
    ├── NewDepositPage.tsx
    ├── DepositMethodsPage.tsx
    ├── BankTransferPage.tsx
    ├── CardPaymentPage.tsx
    ├── CryptoDepositPage.tsx
    ├── WireTransferPage.tsx
    ├── DepositHistoryPage.tsx
    ├── PendingDepositsPage.tsx
    ├── RecurringDepositsPage.tsx
    └── DepositLimitsPage.tsx

// Shared Transaction Components
src/components/transactions/
├── TransactionTable.tsx
├── TransactionFilters.tsx
├── TransactionStatusBadge.tsx
├── DepositMethodCard.tsx
├── PaymentForm.tsx
└── ConfirmationModal.tsx
```

### Data Requirements

**API Endpoints:**
```typescript
// Transaction endpoints
GET  /transactions
GET  /transactions/:id
POST /transactions/deposit
GET  /transactions/pending
PUT  /transactions/:id/cancel

// Payment endpoints
POST /payments/bank-transfer
POST /payments/card
POST /payments/crypto
POST /payments/wire
GET  /payments/methods
GET  /payments/:id/status

// Limits endpoints
GET  /limits/deposit
GET  /limits/user/:userId
```

**Database Tables:**
- `transactions` - All transactions
- `deposits` - Deposit records
- `payment_methods` - User payment methods
- `bank_accounts` - Linked bank accounts
- `cards` - Saved cards
- `crypto_addresses` - Crypto wallet addresses
- `deposit_limits` - User deposit limits
- `recurring_deposits` - Recurring deposit setups

---

## Module 4: Withdrawals & Redemptions (10 pages)

### Pages Overview

| # | Page Name | Route | Component | Priority | Week |
|---|-----------|-------|-----------|----------|------|
| 36 | New Withdrawal | `/withdrawals/new` | `NewWithdrawalPage` | P0 | 4 |
| 37 | Withdrawal Methods | `/withdrawals/methods` | `WithdrawalMethodsPage` | P0 | 4 |
| 38 | Bank Withdrawal | `/withdrawals/bank` | `BankWithdrawalPage` | P0 | 4 |
| 39 | Crypto Withdrawal | `/withdrawals/crypto` | `CryptoWithdrawalPage` | P1 | 5 |
| 40 | Withdrawal History | `/withdrawals/history` | `WithdrawalHistoryPage` | P1 | 5 |
| 41 | Pending Withdrawals | `/withdrawals/pending` | `PendingWithdrawalsPage` | P1 | 5 |
| 42 | Withdrawal Limits | `/withdrawals/limits` | `WithdrawalLimitsPage` | P2 | 6 |
| 43 | Redemption Request | `/redemptions/new` | `RedemptionRequestPage` | P1 | 6 |
| 44 | Redemption History | `/redemptions/history` | `RedemptionHistoryPage` | P1 | 6 |
| 45 | Early Redemption | `/redemptions/early` | `EarlyRedemptionPage` | P2 | 7 |

---

## Module 5: Documents & Statements (8 pages)

### Pages Overview

| # | Page Name | Route | Component | Priority | Week |
|---|-----------|-------|-----------|----------|------|
| 46 | Documents Hub | `/documents` | `DocumentsPage` | P1 | 5 |
| 47 | Tax Documents | `/documents/tax` | `TaxDocumentsPage` | P1 | 5 |
| 48 | Account Statements | `/documents/statements` | `StatementsPage` | P1 | 5 |
| 49 | Contracts | `/documents/contracts` | `ContractsPage` | P1 | 6 |
| 50 | Investment Reports | `/documents/reports` | `InvestmentReportsPage` | P1 | 6 |
| 51 | Upload Documents | `/documents/upload` | `UploadDocumentsPage` | P1 | 6 |
| 52 | Document Viewer | `/documents/:id` | `DocumentViewerPage` | P1 | 6 |
| 53 | Download Center | `/documents/download` | `DownloadCenterPage` | P2 | 7 |

---

## Module 6: Profile & Settings (10 pages)

### Pages Overview

| # | Page Name | Route | Component | Priority | Week |
|---|-----------|-------|-----------|----------|------|
| 54 | Profile Overview | `/profile` | `ProfilePage` | P0 | 2 |
| 55 | Edit Profile | `/profile/edit` | `EditProfilePage` | P0 | 2 |
| 56 | Security Settings | `/settings/security` | `SecuritySettingsPage` | P0 | 3 |
| 57 | Privacy Settings | `/settings/privacy` | `PrivacySettingsPage` | P1 | 3 |
| 58 | Notification Settings | `/settings/notifications` | `NotificationSettingsPage` | P1 | 3 |
| 59 | Payment Methods | `/settings/payment-methods` | `PaymentMethodsPage` | P1 | 4 |
| 60 | Bank Accounts | `/settings/bank-accounts` | `BankAccountsPage` | P1 | 4 |
| 61 | Two-Factor Auth | `/settings/2fa` | `TwoFactorAuthPage` | P1 | 4 |
| 62 | API Keys | `/settings/api-keys` | `ApiKeysPage` | P2 | 7 |
| 63 | Account Closure | `/settings/close-account` | `CloseAccountPage` | P2 | 7 |

---

## Module 7: Reports & Analytics (12 pages)

### Pages Overview

| # | Page Name | Route | Component | Priority | Week |
|---|-----------|-------|-----------|----------|------|
| 64 | Reports Hub | `/reports` | `ReportsPage` | P1 | 6 |
| 65 | Performance Report | `/reports/performance` | `PerformanceReportPage` | P1 | 6 |
| 66 | Tax Report | `/reports/tax` | `TaxReportPage` | P1 | 6 |
| 67 | Transaction Report | `/reports/transactions` | `TransactionReportPage` | P1 | 7 |
| 68 | Asset Allocation | `/reports/allocation` | `AllocationReportPage` | P1 | 7 |
| 69 | Income Report | `/reports/income` | `IncomeReportPage` | P1 | 7 |
| 70 | Custom Reports | `/reports/custom` | `CustomReportsPage` | P2 | 8 |
| 71 | Export Data | `/reports/export` | `ExportDataPage` | P2 | 8 |
| 72 | Analytics Dashboard | `/analytics` | `AnalyticsPage` | P1 | 7 |
| 73 | Risk Analysis | `/analytics/risk` | `RiskAnalysisPage` | P1 | 8 |
| 74 | Benchmark Comparison | `/analytics/benchmark` | `BenchmarkPage` | P2 | 8 |
| 75 | Historical Data | `/analytics/historical` | `HistoricalDataPage` | P2 | 8 |

---

## Module 8: Admin Panel (20 pages)

### Pages Overview

| # | Page Name | Route | Component | Priority | Week |
|---|-----------|-------|-----------|----------|------|
| 76 | Admin Dashboard | `/admin` | `AdminDashboardPage` | P0 | 3 |
| 77 | User Management | `/admin/users` | `UserManagementPage` | P0 | 3 |
| 78 | User Details | `/admin/users/:id` | `UserDetailsPage` | P0 | 3 |
| 79 | Transaction Management | `/admin/transactions` | `TransactionManagementPage` | P0 | 4 |
| 80 | Deposit Approvals | `/admin/deposits` | `DepositApprovalsPage` | P0 | 4 |
| 81 | Withdrawal Approvals | `/admin/withdrawals` | `WithdrawalApprovalsPage` | P0 | 4 |
| 82 | KYC Management | `/admin/kyc` | `KycManagementPage` | P0 | 5 |
| 83 | Document Verification | `/admin/documents` | `DocumentVerificationPage` | P0 | 5 |
| 84 | Asset Management | `/admin/assets` | `AssetManagementPage` | P1 | 5 |
| 85 | Pricing Management | `/admin/pricing` | `PricingManagementPage` | P1 | 6 |
| 86 | Fee Management | `/admin/fees` | `FeeManagementPage` | P1 | 6 |
| 87 | Limits Management | `/admin/limits` | `LimitsManagementPage` | P1 | 6 |
| 88 | Reports Generator | `/admin/reports` | `AdminReportsPage` | P1 | 7 |
| 89 | Audit Logs | `/admin/audit-logs` | `AuditLogsPage` | P1 | 7 |
| 90 | System Settings | `/admin/settings` | `SystemSettingsPage` | P0 | 4 |
| 91 | Role Management | `/admin/roles` | `RoleManagementPage` | P1 | 7 |
| 92 | Permissions | `/admin/permissions` | `PermissionsPage` | P1 | 7 |
| 93 | Notifications Center | `/admin/notifications` | `AdminNotificationsPage` | P2 | 8 |
| 94 | Email Templates | `/admin/email-templates` | `EmailTemplatesPage` | P2 | 8 |
| 95 | API Monitoring | `/admin/api-monitoring` | `ApiMonitoringPage` | P2 | 9 |

---

## Module 9: Compliance & KYC (8 pages)

### Pages Overview

| # | Page Name | Route | Component | Priority | Week |
|---|-----------|-------|-----------|----------|------|
| 96 | KYC Portal | `/kyc` | `KycPortalPage` | P0 | 2 |
| 97 | Identity Verification | `/kyc/identity` | `IdentityVerificationPage` | P0 | 2 |
| 98 | Address Verification | `/kyc/address` | `AddressVerificationPage` | P0 | 3 |
| 99 | Document Upload | `/kyc/documents` | `KycDocumentUploadPage` | P0 | 3 |
| 100 | Accreditation | `/kyc/accreditation` | `AccreditationPage` | P1 | 5 |
| 101 | Compliance Dashboard | `/compliance` | `CompliancePage` | P1 | 6 |
| 102 | AML Checks | `/compliance/aml` | `AmlChecksPage` | P2 | 8 |
| 103 | Regulatory Reports | `/compliance/reports` | `RegulatoryReportsPage` | P2 | 8 |

---

## Module 10: Support & Help (7 pages)

### Pages Overview

| # | Page Name | Route | Component | Priority | Week |
|---|-----------|-------|-----------|----------|------|
| 104 | Help Center | `/help` | `HelpCenterPage` | P1 | 4 |
| 105 | FAQ | `/help/faq` | `FaqPage` | P1 | 4 |
| 106 | Contact Support | `/support/contact` | `ContactSupportPage` | P1 | 4 |
| 107 | Submit Ticket | `/support/ticket` | `SubmitTicketPage` | P1 | 5 |
| 108 | Ticket History | `/support/tickets` | `TicketHistoryPage` | P1 | 5 |
| 109 | Ticket Details | `/support/tickets/:id` | `TicketDetailsPage` | P1 | 5 |
| 110 | Live Chat | `/support/chat` | `LiveChatPage` | P2 | 9 |

---

## Module 11: Notifications (5 pages)

### Pages Overview

| # | Page Name | Route | Component | Priority | Week |
|---|-----------|-------|-----------|----------|------|
| 111 | Notifications | `/notifications` | `NotificationsPage` | P1 | 3 |
| 112 | Activity Feed | `/notifications/activity` | `ActivityFeedPage` | P1 | 4 |
| 113 | Alerts | `/notifications/alerts` | `AlertsPage` | P1 | 5 |
| 114 | Email Preferences | `/notifications/email` | `EmailPreferencesPage` | P1 | 5 |
| 115 | Push Notifications | `/notifications/push` | `PushNotificationsPage` | P2 | 7 |

---

## Module 12: Learning Center (6 pages)

### Pages Overview

| # | Page Name | Route | Component | Priority | Week |
|---|-----------|-------|-----------|----------|------|
| 116 | Learning Hub | `/learn` | `LearningHubPage` | P2 | 8 |
| 117 | Tutorials | `/learn/tutorials` | `TutorialsPage` | P2 | 8 |
| 118 | Video Library | `/learn/videos` | `VideoLibraryPage` | P2 | 9 |
| 119 | Glossary | `/learn/glossary` | `GlossaryPage` | P2 | 9 |
| 120 | Webinars | `/learn/webinars` | `WebinarsPage` | P2 | 9 |
| 121 | Resources | `/learn/resources` | `ResourcesPage` | P2 | 9 |

---

## Module 13: Referral Program (4 pages)

### Pages Overview

| # | Page Name | Route | Component | Priority | Week |
|---|-----------|-------|-----------|----------|------|
| 122 | Referral Dashboard | `/referrals` | `ReferralDashboardPage` | P2 | 7 |
| 123 | Invite Friends | `/referrals/invite` | `InviteFriendsPage` | P2 | 7 |
| 124 | Referral History | `/referrals/history` | `ReferralHistoryPage` | P2 | 8 |
| 125 | Referral Rewards | `/referrals/rewards` | `ReferralRewardsPage` | P2 | 8 |

---

## Implementation Timeline

### Phase 1: Core Features (Weeks 1-4)

**Week 1: Foundation & Authentication**
- Project setup and configuration
- Authentication pages (1-5)
- Base layouts and routing
- Supabase integration

**Week 2: Dashboard Core**
- Main dashboard (9)
- Portfolio overview (10)
- Onboarding pages (6-8)
- Profile pages (54-55)

**Week 3: Transactions Foundation**
- Transactions list (24)
- Transaction details (25)
- New deposit (26)
- Security settings (56)

**Week 4: Admin Foundation**
- Admin dashboard (76)
- User management (77-78)
- System settings (90)
- Deposit methods (27-28)

### Phase 2: Extended Features (Weeks 5-8)

**Week 5: Enhanced Transactions**
- Additional deposit methods (29-32)
- Withdrawal pages (36-40)
- Document management (46-49)
- KYC management (82-83)

**Week 6: Analytics & Reports**
- Performance analytics (13)
- Reports hub (64-68)
- Asset management (84-87)
- Compliance (100-101)

**Week 7: Advanced Features**
- Risk dashboard (23)
- Custom reports (70-71)
- Analytics pages (72-74)
- Admin reports (88-91)

**Week 8: User Experience**
- Learning center (116-119)
- Referral program (122-123)
- Advanced analytics (75)
- Admin notifications (93-94)

### Phase 3: Advanced Features (Weeks 9-12)

**Week 9: Real-time & Interactive**
- Live chat (110)
- API monitoring (95)
- Video library (118)
- Webinars (120)

**Week 10: Market & Social**
- Market overview (15)
- Watchlist (16)
- Comparison tool (21)
- Resources (121)

**Week 11: Goals & Planning**
- Calendar view (19)
- Goals & targets (20)
- Projections (22)
- Recurring deposits (34)

**Week 12: Specialized Features**
- Early redemption (45)
- Crypto features (30, 39)
- Advanced compliance (102-103)
- Custom workflows

### Phase 4: Polish & Optimization (Weeks 13-16)

**Week 13: Testing & QA**
- Unit test coverage
- Integration tests
- E2E test scenarios
- Bug fixes

**Week 14: Performance**
- Code splitting optimization
- Image optimization
- Bundle size reduction
- Caching strategies

**Week 15: Accessibility & UX**
- WCAG 2.2 compliance
- Keyboard navigation
- Screen reader testing
- Mobile optimization

**Week 16: Final Polish**
- UI/UX refinements
- Documentation
- Deployment prep
- Performance monitoring

---

## Code Patterns & Examples

### 1. Page Component Structure

```typescript
// Standard page component template
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layouts/PageLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageSkeleton } from '@/components/common/PageSkeleton';

export function ExamplePage() {
  // 1. Data fetching
  const { data, isLoading, error } = useQuery({
    queryKey: ['example-data'],
    queryFn: fetchExampleData,
  });

  // 2. Local state
  const [filters, setFilters] = useState<Filters>({});

  // 3. Computed values
  const filteredData = useMemo(() => {
    return applyFilters(data, filters);
  }, [data, filters]);

  // 4. Event handlers
  const handleFilterChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
  }, []);

  // 5. Loading state
  if (isLoading) return <PageSkeleton />;

  // 6. Error state
  if (error) return <ErrorState error={error} />;

  // 7. Main render
  return (
    <PageLayout>
      <PageHeader
        title="Example Page"
        description="Page description"
        actions={<ActionButtons />}
      />

      <div className="space-y-6">
        <FilterBar filters={filters} onChange={handleFilterChange} />
        <DataDisplay data={filteredData} />
      </div>
    </PageLayout>
  );
}
```

### 2. Data Fetching Pattern

```typescript
// hooks/useTransactions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*, user:users(name, email)');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 30000, // 30 seconds
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: NewTransaction) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
```

### 3. Form Handling Pattern

```typescript
// components/forms/DepositForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const depositSchema = z.object({
  amount: z.number()
    .min(100, 'Minimum deposit is $100')
    .max(1000000, 'Maximum deposit is $1,000,000'),
  method: z.enum(['bank_transfer', 'card', 'wire']),
  currency: z.string().default('USD'),
  notes: z.string().optional(),
});

type DepositFormData = z.infer<typeof depositSchema>;

export function DepositForm({ onSuccess }: DepositFormProps) {
  const createDeposit = useCreateDeposit();

  const form = useForm<DepositFormData>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: 0,
      method: 'bank_transfer',
      currency: 'USD',
    },
  });

  const onSubmit = async (data: DepositFormData) => {
    try {
      await createDeposit.mutateAsync(data);
      toast.success('Deposit initiated successfully');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to initiate deposit');
      console.error(error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="wire">Wire Transfer</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Processing...' : 'Initiate Deposit'}
        </Button>
      </form>
    </Form>
  );
}
```

### 4. Navigation Pattern

```typescript
// routes/index.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },

  // Protected routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'portfolio', element: <PortfolioPage /> },
          { path: 'portfolio/:id', element: <PortfolioDetailsPage /> },
          { path: 'performance', element: <PerformancePage /> },
        ],
      },
      {
        path: '/transactions',
        children: [
          { index: true, element: <TransactionsPage /> },
          { path: ':id', element: <TransactionDetailsPage /> },
        ],
      },
    ],
  },

  // Admin routes
  {
    element: <AdminRoute />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'users', element: <UserManagementPage /> },
          { path: 'users/:id', element: <UserDetailsPage /> },
          { path: 'transactions', element: <TransactionManagementPage /> },
        ],
      },
    ],
  },

  // 404
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
```

### 5. Protected Route Component

```typescript
// components/auth/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/spinner';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
```

### 6. Error Handling Pattern

```typescript
// components/common/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              We're sorry for the inconvenience
            </p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

### 7. Table Component Pattern

```typescript
// components/common/DataTable.tsx
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from './DataTablePagination';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
```

### 8. Modal Pattern

```typescript
// hooks/useModal.ts
import { create } from 'zustand';

interface ModalStore {
  modals: Record<string, boolean>;
  data: Record<string, any>;
  openModal: (id: string, data?: any) => void;
  closeModal: (id: string) => void;
  isOpen: (id: string) => boolean;
  getData: (id: string) => any;
}

export const useModal = create<ModalStore>((set, get) => ({
  modals: {},
  data: {},
  openModal: (id, data) =>
    set((state) => ({
      modals: { ...state.modals, [id]: true },
      data: { ...state.data, [id]: data },
    })),
  closeModal: (id) =>
    set((state) => ({
      modals: { ...state.modals, [id]: false },
      data: { ...state.data, [id]: undefined },
    })),
  isOpen: (id) => get().modals[id] || false,
  getData: (id) => get().data[id],
}));

// Usage
function SomeComponent() {
  const { openModal, closeModal, isOpen, getData } = useModal();

  return (
    <>
      <Button onClick={() => openModal('deposit', { amount: 1000 })}>
        New Deposit
      </Button>

      <Dialog open={isOpen('deposit')} onOpenChange={() => closeModal('deposit')}>
        <DialogContent>
          <DepositForm initialData={getData('deposit')} />
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## Component Reusability Strategy

### Shared Components Library

```typescript
// components/common/
├── Button.tsx              // Reusable button
├── Input.tsx               // Form input
├── Select.tsx              // Dropdown select
├── Card.tsx                // Content card
├── Badge.tsx               // Status badge
├── Avatar.tsx              // User avatar
├── Spinner.tsx             // Loading spinner
├── EmptyState.tsx          // Empty state
├── ErrorState.tsx          // Error state
├── PageHeader.tsx          // Page header
├── PageSkeleton.tsx        // Loading skeleton
├── DataTable.tsx           // Data table
├── SearchBar.tsx           // Search input
├── FilterBar.tsx           // Filter controls
├── DateRangePicker.tsx     // Date range selector
├── ConfirmDialog.tsx       // Confirmation dialog
└── Tooltip.tsx             // Tooltip

// components/layouts/
├── AppLayout.tsx           // Main app layout
├── DashboardLayout.tsx     // Dashboard layout
├── AdminLayout.tsx         // Admin layout
├── AuthLayout.tsx          // Auth layout
├── Sidebar.tsx             // Sidebar navigation
├── Header.tsx              // Header with user menu
└── Footer.tsx              // Footer

// components/features/
├── TransactionCard.tsx     // Transaction display
├── PortfolioCard.tsx       // Portfolio display
├── AssetCard.tsx           // Asset display
├── UserCard.tsx            // User display
├── StatCard.tsx            // Stat display
├── ChartCard.tsx           // Chart container
└── ActivityItem.tsx        // Activity list item
```

### Component Composition Example

```typescript
// Example: Building a page with reusable components
export function TransactionsPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Transactions"
        description="View and manage your transactions"
        actions={
          <Button onClick={() => openModal('new-transaction')}>
            New Transaction
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <SearchBar placeholder="Search transactions..." />
          <FilterBar filters={filters} onChange={handleFilterChange} />
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={transactions} />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
```

---

## Testing Strategy

### Unit Testing

```typescript
// __tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

### Integration Testing

```typescript
// __tests__/pages/LoginPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '@/pages/auth/LoginPage';

describe('LoginPage', () => {
  it('successfully logs in user', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Welcome back!')).toBeInTheDocument();
    });
  });

  it('displays error for invalid credentials', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'invalid@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });
});
```

### E2E Testing with Playwright

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('user can login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('user can register', async ({ page }) => {
    await page.goto('/register');

    await page.fill('[name="firstName"]', 'John');
    await page.fill('[name="lastName"]', 'Doe');
    await page.fill('[name="email"]', 'john@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    await page.check('[name="acceptTerms"]');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/verify-email');
  });
});
```

---

## Performance Optimization

### Code Splitting

```typescript
// routes/index.tsx - Lazy loading pages
import { lazy, Suspense } from 'react';

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const PortfolioPage = lazy(() => import('@/pages/dashboard/PortfolioPage'));
const TransactionsPage = lazy(() => import('@/pages/transactions/TransactionsPage'));

export const router = createBrowserRouter([
  {
    path: '/dashboard',
    element: (
      <Suspense fallback={<PageSkeleton />}>
        <DashboardPage />
      </Suspense>
    ),
  },
  // ... more routes
]);
```

### Image Optimization

```typescript
// components/common/OptimizedImage.tsx
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function OptimizedImage({ src, alt, className }: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsLoaded(true)}
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
}
```

### Virtual Scrolling for Large Lists

```typescript
// components/common/VirtualList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function VirtualList({ items }: { items: any[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <TransactionItem transaction={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All 125 pages implemented
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Accessibility audit complete (WCAG 2.2 AA)
- [ ] Performance audit (Lighthouse score >90)
- [ ] Security audit complete
- [ ] Code review completed
- [ ] Documentation updated

### Build Optimization

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'query-vendor': ['@tanstack/react-query'],
          'chart-vendor': ['recharts'],
          'form-vendor': ['react-hook-form', 'zod'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

### Environment Variables

```bash
# .env.production
VITE_SUPABASE_URL=your-production-url
VITE_SUPABASE_ANON_KEY=your-production-key
VITE_API_URL=https://api.indigo-yield.com
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=your-sentry-dsn
```

---

## Team Structure & Responsibilities

### Team Allocation

**Team 1: Core Features (2 developers)**
- Authentication & Onboarding
- Dashboard & Portfolio
- Profile & Settings

**Team 2: Transactions (2 developers)**
- Transactions & Deposits
- Withdrawals & Redemptions
- Documents & Statements

**Team 3: Admin & Analytics (2 developers)**
- Admin Panel
- Reports & Analytics
- Compliance & KYC

**Team 4: Support & Engagement (1 developer)**
- Support & Help
- Notifications
- Learning Center
- Referral Program

---

## Success Metrics

### Performance Metrics
- First Contentful Paint < 1.5s
- Largest Contentful Paint < 2.5s
- Time to Interactive < 3.5s
- Cumulative Layout Shift < 0.1
- First Input Delay < 100ms

### Quality Metrics
- Test coverage > 80%
- Bundle size < 500KB (gzipped)
- Accessibility score 100 (Lighthouse)
- SEO score > 90 (Lighthouse)
- Zero critical security vulnerabilities

### User Experience Metrics
- Page load time < 2s
- Error rate < 0.1%
- User satisfaction score > 4.5/5
- Mobile usability score 100

---

## Appendix

### Useful Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Build for production
npm run preview            # Preview production build
npm run test               # Run unit tests
npm run test:e2e           # Run E2E tests
npm run lint               # Lint code
npm run type-check         # TypeScript check

# Database
npm run db:migrate         # Run migrations
npm run db:seed            # Seed database
npm run db:reset           # Reset database

# Deployment
npm run deploy:staging     # Deploy to staging
npm run deploy:production  # Deploy to production
```

### Resources

- [React 18 Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-04
**Next Review:** Weekly during implementation

