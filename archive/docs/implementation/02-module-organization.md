# Module Organization & Code Structure
## Indigo Yield Platform - Scalable Architecture for 15-Person Team

---

## 1. Root Directory Structure

```
indigo-yield-platform-v01/
├── .github/                      # CI/CD workflows
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── cd-staging.yml
│   │   ├── cd-production.yml
│   │   └── security-scan.yml
│   └── CODEOWNERS
├── .storybook/                   # Storybook configuration
├── docs/                         # Documentation
│   ├── architecture/
│   ├── implementation/
│   ├── api/
│   └── components/
├── ios/                          # iOS application
├── ops/                          # DevOps & infrastructure
│   ├── terraform/
│   ├── kubernetes/
│   └── docker/
├── scripts/                      # Build & deployment scripts
│   ├── build/
│   ├── deploy/
│   └── db-migrations/
├── src/                          # Web application source
├── supabase/                     # Supabase backend
│   ├── functions/                # Edge Functions
│   ├── migrations/               # Database migrations
│   └── seed/                     # Seed data
├── tests/                        # Test suites
│   ├── e2e/
│   ├── integration/
│   └── unit/
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 2. Source Directory Architecture (src/)

### 2.1 Feature-First Organization

```
src/
├── app/                          # Application core
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # Entry point
│   ├── router.tsx                # Route configuration
│   └── providers.tsx             # Global providers
│
├── assets/                       # Static assets
│   ├── images/
│   ├── icons/
│   ├── fonts/
│   └── animations/
│
├── components/                   # Shared components (Atomic Design)
│   ├── atoms/
│   ├── molecules/
│   ├── organisms/
│   ├── templates/
│   └── index.ts                  # Barrel exports
│
├── config/                       # Configuration files
│   ├── constants.ts
│   ├── env.ts
│   ├── features.ts               # Feature flags
│   ├── routes.ts
│   └── theme.ts
│
├── features/                     # Feature modules (125 pages)
│   ├── authentication/
│   ├── onboarding/
│   ├── dashboard/
│   ├── investments/
│   ├── portfolio/
│   ├── transactions/
│   ├── documents/
│   ├── tax-reporting/
│   ├── compliance/
│   ├── admin/
│   ├── lp-management/
│   ├── support/
│   └── settings/
│
├── hooks/                        # Shared custom hooks
│   ├── useAuth.ts
│   ├── useAsync.ts
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   ├── useMediaQuery.ts
│   └── index.ts
│
├── layouts/                      # Layout components
│   ├── AuthLayout.tsx
│   ├── DashboardLayout.tsx
│   ├── AdminLayout.tsx
│   └── PublicLayout.tsx
│
├── lib/                          # Third-party integrations
│   ├── supabase/
│   ├── stripe/
│   ├── plaid/
│   ├── twilio/
│   ├── docusign/
│   ├── sentry/
│   ├── posthog/
│   └── utils.ts
│
├── services/                     # API services layer
│   ├── api/
│   ├── auth/
│   ├── payments/
│   ├── documents/
│   ├── kyc/
│   └── index.ts
│
├── stores/                       # Global state management
│   ├── auth.store.ts
│   ├── user.store.ts
│   ├── portfolio.store.ts
│   ├── transactions.store.ts
│   └── ui.store.ts
│
├── styles/                       # Global styles
│   ├── globals.css
│   ├── tokens.css
│   └── utilities.css
│
├── types/                        # TypeScript type definitions
│   ├── api.types.ts
│   ├── entities.types.ts
│   ├── common.types.ts
│   └── index.ts
│
└── utils/                        # Utility functions
    ├── currency.ts
    ├── date.ts
    ├── validation.ts
    ├── formatting.ts
    └── helpers.ts
```

---

## 3. Feature Module Structure (Standard Template)

### 3.1 Feature Module Anatomy

```
features/[feature-name]/
├── api/                          # Feature-specific API calls
│   ├── queries.ts                # React Query queries
│   ├── mutations.ts              # React Query mutations
│   └── endpoints.ts              # API endpoint definitions
│
├── components/                   # Feature components
│   ├── [ComponentName]/
│   │   ├── index.tsx
│   │   ├── [ComponentName].tsx
│   │   ├── [ComponentName].test.tsx
│   │   ├── [ComponentName].stories.tsx
│   │   └── styles.module.css     # Component-specific styles
│   └── index.ts
│
├── hooks/                        # Feature-specific hooks
│   ├── use[Feature].ts
│   ├── use[Feature]Data.ts
│   └── index.ts
│
├── pages/                        # Feature pages/routes
│   ├── [PageName].tsx
│   └── index.ts
│
├── store/                        # Feature state (if needed)
│   ├── [feature].store.ts
│   └── types.ts
│
├── types/                        # Feature type definitions
│   ├── [feature].types.ts
│   └── index.ts
│
├── utils/                        # Feature utilities
│   ├── helpers.ts
│   ├── validators.ts
│   └── formatters.ts
│
├── constants.ts                  # Feature constants
├── index.ts                      # Public API exports
└── README.md                     # Feature documentation
```

### 3.2 Example: Investments Feature Module

```
features/investments/
├── api/
│   ├── queries.ts
│   │   └── useInvestmentOpportunities()
│   │   └── useInvestmentDetails()
│   ├── mutations.ts
│   │   └── useCreateInvestment()
│   │   └── useCancelInvestment()
│   └── endpoints.ts
│
├── components/
│   ├── OpportunityCard/
│   │   ├── index.tsx
│   │   ├── OpportunityCard.tsx
│   │   ├── OpportunityCard.test.tsx
│   │   └── OpportunityCard.stories.tsx
│   ├── InvestmentForm/
│   ├── InvestmentSummary/
│   └── PerformanceChart/
│
├── hooks/
│   ├── useInvestmentCalculator.ts
│   ├── useInvestmentValidation.ts
│   └── index.ts
│
├── pages/
│   ├── OpportunitiesListPage.tsx
│   ├── OpportunityDetailPage.tsx
│   ├── InvestmentFlowPage.tsx
│   └── MyInvestmentsPage.tsx
│
├── store/
│   ├── investment.store.ts
│   └── types.ts
│
├── types/
│   ├── investment.types.ts
│   └── opportunity.types.ts
│
├── utils/
│   ├── calculations.ts
│   ├── validators.ts
│   └── formatters.ts
│
├── constants.ts
└── index.ts
```

---

## 4. Naming Conventions

### 4.1 File Naming

```
Components:        PascalCase       Button.tsx, InvestmentForm.tsx
Pages:             PascalCase       Dashboard.tsx, SettingsPage.tsx
Hooks:             camelCase        useAuth.ts, useInvestmentData.ts
Utils:             camelCase        formatCurrency.ts, validators.ts
Types:             camelCase        user.types.ts, api.types.ts
Constants:         camelCase        routes.ts, config.ts
Styles:            kebab-case       button.module.css, form.module.css
Tests:             [name].test.tsx  Button.test.tsx
Stories:           [name].stories   Button.stories.tsx
```

### 4.2 Code Naming Conventions

```typescript
// Types & Interfaces: PascalCase
interface User {}
type InvestmentStatus = 'pending' | 'active' | 'completed'

// Variables & Functions: camelCase
const userName = 'John'
function calculateReturn() {}

// Constants: UPPER_SNAKE_CASE
const MAX_INVESTMENT_AMOUNT = 1000000
const API_BASE_URL = 'https://api.indigo.com'

// Components: PascalCase
const InvestmentCard = () => {}

// Private functions: _camelCase prefix
function _privateHelper() {}

// Boolean variables: is/has/should prefix
const isLoading = true
const hasAccess = false
const shouldValidate = true
```

---

## 5. Import/Export Strategy

### 5.1 Barrel Exports (index.ts)

```typescript
// components/atoms/index.ts
export { default as Button } from './buttons/Button'
export { default as Input } from './inputs/Input'
export { default as Select } from './inputs/Select'

// Usage in consuming files
import { Button, Input, Select } from '@/components/atoms'
```

### 5.2 Import Order Convention

```typescript
// 1. External libraries
import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

// 2. Internal modules (aliased imports)
import { Button, Input } from '@/components/atoms'
import { useAuth } from '@/hooks'
import { formatCurrency } from '@/utils'

// 3. Relative imports
import { InvestmentCard } from './InvestmentCard'
import { calculateReturn } from './utils'

// 4. Types
import type { Investment, User } from '@/types'

// 5. Styles
import styles from './Investment.module.css'
```

### 5.3 Path Aliases Configuration

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/features/*": ["./src/features/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/services/*": ["./src/services/*"],
      "@/stores/*": ["./src/stores/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  }
}
```

---

## 6. Code Organization Patterns

### 6.1 Co-location Principle

```
# Keep related files close together
InvestmentCard/
├── index.tsx                     # Main component
├── InvestmentCard.test.tsx       # Tests
├── InvestmentCard.stories.tsx    # Storybook
├── useInvestmentCard.ts          # Custom hook (if specific to component)
├── types.ts                      # Types (if specific to component)
└── styles.module.css             # Styles

# Benefits:
# - Easy to find related files
# - Easy to delete feature (remove directory)
# - Reduces cognitive load
```

### 6.2 Separation of Concerns

```typescript
// ❌ Bad: Mixed concerns in one file
export function InvestmentCard() {
  // API call logic
  const { data } = useQuery(['investments'], fetchInvestments)

  // Business logic
  const totalReturn = calculateReturn(data)

  // UI rendering
  return <div>{/* complex UI */}</div>
}

// ✅ Good: Separated concerns
// hooks/useInvestmentData.ts
export function useInvestmentData() {
  return useQuery(['investments'], fetchInvestments)
}

// utils/calculations.ts
export function calculateReturn(investment: Investment) {
  // Business logic
}

// components/InvestmentCard.tsx
export function InvestmentCard() {
  const { data } = useInvestmentData()
  const totalReturn = calculateReturn(data)
  return <div>{/* UI only */}</div>
}
```

---

## 7. Module Boundaries & Dependencies

### 7.1 Dependency Rules

```
┌─────────────────────────────────────┐
│         Application Layer           │  # Can depend on everything below
│  (Pages, Routing, App Shell)        │
├─────────────────────────────────────┤
│         Feature Layer               │  # Can depend on shared only
│  (Feature modules)                  │
├─────────────────────────────────────┤
│         Shared Layer                │  # Can depend on lib/utils only
│  (Components, Hooks)                │
├─────────────────────────────────────┤
│         Library Layer               │  # Pure, no internal dependencies
│  (Utils, Config, Types)             │
└─────────────────────────────────────┘

Rules:
✅ Features can import from shared components
❌ Shared components cannot import from features
✅ Features can communicate via stores/context
❌ Features should not directly import from other features
```

### 7.2 Feature Communication Patterns

```typescript
// ❌ Bad: Direct feature-to-feature import
// features/portfolio/components/Summary.tsx
import { InvestmentCard } from '@/features/investments/components'

// ✅ Good: Through shared layer
// features/investments/index.ts
export { InvestmentCard } from './components/InvestmentCard'

// features/portfolio/components/Summary.tsx
import { InvestmentCard } from '@/components/domain/investments'

// ✅ Better: Via state/events
// features/portfolio/components/Summary.tsx
const { investments } = usePortfolioStore()
<InvestmentList investments={investments} />
```

---

## 8. Team Collaboration Structure

### 8.1 Team Ownership Model (15-person team)

```
Frontend Teams (9 developers):
├── Core Team (3)
│   ├── Component library maintenance
│   ├── Shared utilities & hooks
│   ├── Build pipeline & tooling
│   └── Code review & standards
│
├── Feature Team A (3)
│   ├── Authentication & Onboarding
│   ├── Dashboard & Portfolio
│   └── User Settings
│
└── Feature Team B (3)
    ├── Investments & Transactions
    ├── Documents & Compliance
    └── Admin & LP Management

Backend Team (3 developers):
├── API & Edge Functions
├── Database & Migrations
└── Third-party Integrations

iOS Team (2 developers):
├── iOS app development
└── API integration

DevOps (1 developer):
└── CI/CD & Infrastructure
```

### 8.2 CODEOWNERS Configuration

```
# .github/CODEOWNERS

# Core infrastructure
/src/components/        @core-team
/src/hooks/             @core-team
/src/lib/               @core-team
/.github/               @devops-team

# Feature ownership
/src/features/authentication/  @feature-team-a
/src/features/dashboard/       @feature-team-a
/src/features/portfolio/       @feature-team-a

/src/features/investments/     @feature-team-b
/src/features/transactions/    @feature-team-b
/src/features/admin/           @feature-team-b

# Backend
/supabase/              @backend-team
/src/services/          @backend-team

# iOS
/ios/                   @ios-team

# DevOps
/ops/                   @devops-team
/.github/workflows/     @devops-team
```

### 8.3 Branch Strategy

```
main                    # Production branch (protected)
├── develop             # Integration branch
│   ├── feature/auth-flow
│   ├── feature/investment-dashboard
│   ├── feature/kyc-integration
│   └── fix/payment-error

# Branch naming convention:
feature/[ticket-id]-[short-description]
fix/[ticket-id]-[issue-description]
hotfix/[critical-issue]
release/v[version-number]

# Example:
feature/IY-123-add-investment-form
fix/IY-456-transaction-calculation-bug
```

---

## 9. Code Documentation Standards

### 9.1 Component Documentation

```typescript
/**
 * InvestmentCard displays summary information for an investment opportunity.
 *
 * @component
 * @example
 * ```tsx
 * <InvestmentCard
 *   investment={opportunityData}
 *   onInvest={handleInvest}
 * />
 * ```
 *
 * @param {Investment} investment - The investment opportunity data
 * @param {Function} onInvest - Callback when user clicks invest button
 * @returns {JSX.Element} Investment card component
 */
export function InvestmentCard({ investment, onInvest }: Props) {
  // Implementation
}
```

### 9.2 Function Documentation

```typescript
/**
 * Calculate the projected return on investment based on term and rate.
 *
 * @param {number} principal - Initial investment amount in dollars
 * @param {number} rate - Annual interest rate as decimal (e.g., 0.08 for 8%)
 * @param {number} years - Investment term in years
 * @returns {number} Total return including principal
 *
 * @example
 * calculateReturn(10000, 0.08, 5) // Returns 14693.28
 */
export function calculateReturn(
  principal: number,
  rate: number,
  years: number
): number {
  return principal * Math.pow(1 + rate, years)
}
```

### 9.3 Module Documentation

```typescript
/**
 * @module features/investments
 * @description
 * Handles all investment-related functionality including:
 * - Browsing investment opportunities
 * - Creating new investments
 * - Tracking investment performance
 * - Managing investment documents
 *
 * @requires @tanstack/react-query
 * @requires @/services/api
 */
```

---

## 10. Environment & Configuration Management

### 10.1 Environment Files

```
.env.example            # Template with all required variables
.env.local              # Local development (git-ignored)
.env.development        # Development environment
.env.staging            # Staging environment
.env.production         # Production environment
```

### 10.2 Configuration Structure

```typescript
// config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  // App config
  VITE_APP_NAME: z.string(),
  VITE_APP_VERSION: z.string(),
  VITE_API_URL: z.string().url(),

  // Supabase
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string(),

  // Stripe
  VITE_STRIPE_PUBLIC_KEY: z.string(),

  // Plaid
  VITE_PLAID_ENV: z.enum(['sandbox', 'development', 'production']),
  VITE_PLAID_PUBLIC_KEY: z.string(),

  // Feature flags
  VITE_ENABLE_CRYPTO_PAYMENTS: z.boolean(),
  VITE_ENABLE_BIOMETRIC_AUTH: z.boolean(),
})

export const env = envSchema.parse(import.meta.env)

// Usage:
import { env } from '@/config/env'
console.log(env.VITE_API_URL)
```

### 10.3 Feature Flags

```typescript
// config/features.ts
export const features = {
  // Payment methods
  enableCryptoPayments: env.VITE_ENABLE_CRYPTO_PAYMENTS || false,
  enableACHPayments: true,

  // Authentication
  enableBiometricAuth: env.VITE_ENABLE_BIOMETRIC_AUTH || false,
  enableSocialLogin: true,

  // Features
  enableRealTimeNotifications: true,
  enableAdvancedCharts: false,

  // A/B tests
  newDashboardLayout: {
    enabled: true,
    variant: 'v2',
    rolloutPercentage: 50,
  },
}

// Usage with hooks
export function useFeature(flag: keyof typeof features) {
  return features[flag]
}
```

---

## 11. Build & Bundle Optimization

### 11.1 Code Splitting Strategy

```typescript
// router.tsx - Route-based code splitting
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('@/features/dashboard/pages/Dashboard'))
const Portfolio = lazy(() => import('@/features/portfolio/pages/Portfolio'))
const Investments = lazy(() => import('@/features/investments/pages/OpportunitiesList'))

export const routes = [
  {
    path: '/dashboard',
    element: (
      <Suspense fallback={<PageLoader />}>
        <Dashboard />
      </Suspense>
    ),
  },
  // ... more routes
]
```

### 11.2 Vite Configuration Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'vendor-forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
          'vendor-data': ['@tanstack/react-query', 'zustand'],
          'vendor-supabase': ['@supabase/supabase-js'],

          // Feature chunks (loaded on demand)
          'feature-admin': [
            /features\/admin/,
          ],
          'feature-charts': [
            'recharts',
          ],
        },
      },
    },
    // Target modern browsers for smaller bundle
    target: 'es2020',

    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
})
```

---

## 12. Module Testing Strategy

### 12.1 Test Organization

```
tests/
├── unit/                         # Unit tests (co-located with source)
├── integration/                  # Integration tests
│   ├── features/
│   │   ├── authentication.test.ts
│   │   ├── investment-flow.test.ts
│   │   └── transaction-flow.test.ts
│   └── api/
│       ├── investments.test.ts
│       └── payments.test.ts
└── e2e/                          # End-to-end tests
    ├── user-journeys/
    │   ├── new-investor-onboarding.spec.ts
    │   ├── make-investment.spec.ts
    │   └── withdraw-funds.spec.ts
    └── admin/
        └── admin-workflows.spec.ts
```

### 12.2 Test Utilities

```typescript
// tests/utils/test-utils.tsx
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// Usage:
import { renderWithProviders } from '@/tests/utils/test-utils'

test('renders investment card', () => {
  renderWithProviders(<InvestmentCard investment={mockData} />)
  // assertions
})
```

---

## 13. Performance Monitoring

### 13.1 Bundle Analysis

```json
// package.json
{
  "scripts": {
    "analyze": "vite-bundle-visualizer",
    "analyze:source-map": "source-map-explorer 'dist/**/*.js'",
    "size": "size-limit"
  }
}
```

### 13.2 Performance Budget

```javascript
// .size-limit.json
[
  {
    "name": "Initial bundle",
    "path": "dist/**/*.js",
    "limit": "500 KB"
  },
  {
    "name": "Feature - Dashboard",
    "path": "dist/assets/feature-dashboard-*.js",
    "limit": "100 KB"
  },
  {
    "name": "Feature - Investments",
    "path": "dist/assets/feature-investments-*.js",
    "limit": "150 KB"
  }
]
```

---

## Success Metrics

1. **Module Cohesion**: Each module has single responsibility
2. **Code Duplication**: <5% duplicate code across modules
3. **Bundle Size**: Initial load <500KB gzipped
4. **Build Time**: <2 minutes for full production build
5. **Type Safety**: 100% TypeScript coverage (no `any`)
6. **Import Depth**: Max 3 levels deep for better tree-shaking

---

**Next Document**: State Management Patterns & Examples
