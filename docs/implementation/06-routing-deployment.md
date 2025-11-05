# Routing, Navigation & Build/Deployment
## Indigo Yield Platform - Complete Infrastructure Strategy

---

## 1. Routing Architecture (React Router v6)

### 1.1 Route Configuration

```typescript
// app/router.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AdminRoute } from '@/components/auth/AdminRoute'
import { PageLoader } from '@/components/common/PageLoader'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RootLayout } from '@/layouts/RootLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { AuthLayout } from '@/layouts/AuthLayout'

// Lazy load pages for code splitting
const HomePage = lazy(() => import('@/pages/HomePage'))
const LoginPage = lazy(() => import('@/features/authentication/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/features/authentication/pages/RegisterPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const PortfolioPage = lazy(() => import('@/features/portfolio/pages/PortfolioPage'))
const InvestmentsPage = lazy(() => import('@/features/investments/pages/OpportunitiesListPage'))
const InvestmentDetailPage = lazy(() => import('@/features/investments/pages/OpportunityDetailPage'))
const AdminDashboard = lazy(() => import('@/features/admin/pages/AdminDashboard'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      // Public routes
      {
        index: true,
        element: <HomePage />,
      },

      // Auth routes
      {
        path: 'auth',
        element: <AuthLayout />,
        children: [
          {
            path: 'login',
            element: <LoginPage />,
          },
          {
            path: 'register',
            element: <RegisterPage />,
          },
          {
            path: 'forgot-password',
            element: lazy(() => import('@/features/authentication/pages/ForgotPasswordPage')),
          },
          {
            path: 'reset-password',
            element: lazy(() => import('@/features/authentication/pages/ResetPasswordPage')),
          },
        ],
      },

      // Protected routes
      {
        path: 'app',
        element: (
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'portfolio',
            element: <PortfolioPage />,
          },
          {
            path: 'investments',
            children: [
              {
                index: true,
                element: <InvestmentsPage />,
              },
              {
                path: ':id',
                element: <InvestmentDetailPage />,
              },
              {
                path: ':id/invest',
                element: lazy(() => import('@/features/investments/pages/InvestmentFlowPage')),
              },
            ],
          },
          {
            path: 'transactions',
            children: [
              {
                index: true,
                element: lazy(() => import('@/features/transactions/pages/TransactionHistoryPage')),
              },
              {
                path: ':id',
                element: lazy(() => import('@/features/transactions/pages/TransactionDetailPage')),
              },
            ],
          },
          {
            path: 'documents',
            children: [
              {
                index: true,
                element: lazy(() => import('@/features/documents/pages/DocumentsListPage')),
              },
              {
                path: ':id',
                element: lazy(() => import('@/features/documents/pages/DocumentViewerPage')),
              },
            ],
          },
          {
            path: 'settings',
            children: [
              {
                index: true,
                element: lazy(() => import('@/features/settings/pages/SettingsPage')),
              },
              {
                path: 'profile',
                element: lazy(() => import('@/features/settings/pages/ProfilePage')),
              },
              {
                path: 'security',
                element: lazy(() => import('@/features/settings/pages/SecurityPage')),
              },
              {
                path: 'notifications',
                element: lazy(() => import('@/features/settings/pages/NotificationsPage')),
              },
            ],
          },
        ],
      },

      // Admin routes
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <DashboardLayout variant="admin" />
          </AdminRoute>
        ),
        children: [
          {
            path: 'dashboard',
            element: <AdminDashboard />,
          },
          {
            path: 'users',
            element: lazy(() => import('@/features/admin/pages/UsersManagementPage')),
          },
          {
            path: 'funds',
            element: lazy(() => import('@/features/admin/pages/FundsManagementPage')),
          },
          {
            path: 'transactions',
            element: lazy(() => import('@/features/admin/pages/TransactionsManagementPage')),
          },
          {
            path: 'reports',
            element: lazy(() => import('@/features/admin/pages/ReportsPage')),
          },
        ],
      },

      // Catch all - 404
      {
        path: '*',
        element: lazy(() => import('@/pages/NotFoundPage')),
      },
    ],
  },
])

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
```

### 1.2 Route Guards

```typescript
// components/auth/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    // Redirect to login, but save the attempted URL
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

// components/auth/AdminRoute.tsx
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  if (!isAdmin) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <>{children}</>
}
```

### 1.3 Navigation Hooks

```typescript
// hooks/useNavigation.ts
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'

export function useNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const goTo = useCallback((path: string, options?: { replace?: boolean; state?: any }) => {
    navigate(path, options)
  }, [navigate])

  const goBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const goToWithQuery = useCallback((path: string, query: Record<string, string>) => {
    const params = new URLSearchParams(query)
    navigate(`${path}?${params.toString()}`)
  }, [navigate])

  return {
    goTo,
    goBack,
    goToWithQuery,
    currentPath: location.pathname,
    query: Object.fromEntries(searchParams.entries()),
  }
}

// Usage:
const { goTo, goBack, query } = useNavigation()
goTo('/app/investments/123')
goToWithQuery('/app/investments', { filter: 'active', sort: 'date' })
```

---

## 2. Deep Linking Strategy (iOS/Web)

### 2.1 Universal Links Configuration

```typescript
// config/deepLinks.ts
export const deepLinkConfig = {
  // Web domain
  domain: 'app.indigoyield.com',

  // URL schemes
  schemes: ['indigo', 'indigoyield'],

  // Deep link routes
  routes: {
    investment: '/investments/:id',
    transaction: '/transactions/:id',
    document: '/documents/:id',
    settings: '/settings/:section',
  },
}

// Deep link handler
export function handleDeepLink(url: string) {
  const parsed = new URL(url)

  // Handle custom scheme
  if (parsed.protocol === 'indigo:' || parsed.protocol === 'indigoyield:') {
    const path = parsed.pathname
    const params = Object.fromEntries(parsed.searchParams)

    return {
      path,
      params,
    }
  }

  // Handle universal link
  return {
    path: parsed.pathname,
    params: Object.fromEntries(parsed.searchParams),
  }
}
```

### 2.2 iOS Deep Link Handler

```swift
// ios/IndigoYield/DeepLinkHandler.swift
import UIKit

class DeepLinkHandler {
    static func handle(url: URL) -> Bool {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let host = components.host else {
            return false
        }

        // Handle different deep link types
        switch host {
        case "investment":
            if let id = components.queryItems?.first(where: { $0.name == "id" })?.value {
                navigateToInvestment(id: id)
                return true
            }

        case "transaction":
            if let id = components.queryItems?.first(where: { $0.name == "id" })?.value {
                navigateToTransaction(id: id)
                return true
            }

        default:
            break
        }

        return false
    }

    private static func navigateToInvestment(id: String) {
        NotificationCenter.default.post(
            name: .navigateToInvestment,
            object: nil,
            userInfo: ["investmentId": id]
        )
    }

    private static func navigateToTransaction(id: String) {
        NotificationCenter.default.post(
            name: .navigateToTransaction,
            object: nil,
            userInfo: ["transactionId": id]
        )
    }
}

// AppDelegate.swift
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
    return DeepLinkHandler.handle(url: url)
}
```

---

## 3. Build Configuration

### 3.1 Environment-Specific Builds

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    build: {
      // Output directory based on environment
      outDir: mode === 'production' ? 'dist' : `dist-${mode}`,

      // Source maps only in non-production
      sourcemap: mode !== 'production',

      // Minification
      minify: mode === 'production' ? 'terser' : false,

      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true,
        },
      },

      // Chunk splitting
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react'
              }
              if (id.includes('@radix-ui')) {
                return 'vendor-ui'
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase'
              }
              return 'vendor'
            }

            // Feature chunks
            if (id.includes('/features/admin/')) {
              return 'feature-admin'
            }
            if (id.includes('/features/investments/')) {
              return 'feature-investments'
            }
          },
        },
      },

      // Performance budget
      chunkSizeWarningLimit: 1000,
    },

    // Dev server
    server: {
      port: 3000,
      strictPort: true,
      hmr: {
        overlay: true,
      },
    },

    // Preview server
    preview: {
      port: 4173,
    },

    // Define env variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  }
})
```

### 3.2 Build Scripts

```json
// package.json
{
  "scripts": {
    // Development
    "dev": "vite",
    "dev:host": "vite --host",

    // Build
    "build": "tsc && vite build",
    "build:dev": "tsc && vite build --mode development",
    "build:staging": "tsc && vite build --mode staging",
    "build:production": "tsc && vite build --mode production",

    // Preview
    "preview": "vite preview",

    // Type checking
    "typecheck": "tsc --noEmit",

    // Linting
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",

    // Testing
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",

    // Bundle analysis
    "analyze": "vite-bundle-visualizer",

    // Clean
    "clean": "rm -rf dist dist-* node_modules/.vite"
  }
}
```

---

## 4. CI/CD Pipeline

### 4.1 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run linter
        run: pnpm lint

      - name: Type check
        run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run unit tests
        run: pnpm test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright Browsers
        run: pnpm exec playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build application
        run: pnpm build:production
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Run OWASP dependency check
        run: |
          npm audit --audit-level=moderate
```

### 4.2 Deployment Workflow (Staging)

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build for staging
        run: pnpm build:staging
        env:
          VITE_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
          VITE_STRIPE_PUBLIC_KEY: ${{ secrets.STAGING_STRIPE_PUBLIC_KEY }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}

      - name: Run smoke tests
        run: pnpm test:e2e
        env:
          BASE_URL: https://staging.indigoyield.com

      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 4.3 Deployment Workflow (Production)

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build for production
        run: pnpm build:production
        env:
          VITE_SUPABASE_URL: ${{ secrets.PROD_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.PROD_SUPABASE_ANON_KEY }}
          VITE_STRIPE_PUBLIC_KEY: ${{ secrets.PROD_STRIPE_PUBLIC_KEY }}

      - name: Run security scan
        run: pnpm audit --audit-level=moderate

      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}

      - name: Create Sentry release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
        with:
          environment: production
          sourcemaps: './dist'

      - name: Run smoke tests
        run: pnpm test:e2e
        env:
          BASE_URL: https://app.indigoyield.com

      - name: Notify team
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 5. Deployment Platforms

### 5.1 Vercel Configuration

```json
// vercel.json
{
  "version": 2,
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "vite",
  "outputDirectory": "dist",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/home",
      "destination": "/",
      "permanent": true
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.indigoyield.com/:path*"
    }
  ],
  "env": {
    "VITE_APP_VERSION": "@npm_package_version"
  }
}
```

### 5.2 Cloudflare Pages Configuration

```toml
# wrangler.toml
name = "indigo-yield-platform"
main = "dist/index.html"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"

[env.production]
name = "indigo-yield-platform-production"
route = "app.indigoyield.com/*"

[env.staging]
name = "indigo-yield-platform-staging"
route = "staging.indigoyield.com/*"
```

---

## 6. iOS Build & Deployment

### 6.1 Fastlane Configuration

```ruby
# ios/fastlane/Fastfile
default_platform(:ios)

platform :ios do
  desc "Build and run tests"
  lane :test do
    scan(
      scheme: "IndigoYield",
      devices: ["iPhone 15 Pro"],
      clean: true
    )
  end

  desc "Build for TestFlight"
  lane :beta do
    increment_build_number
    build_app(
      scheme: "IndigoYield",
      export_method: "app-store"
    )
    upload_to_testflight(
      skip_waiting_for_build_processing: true
    )
    slack(
      message: "New beta build uploaded to TestFlight"
    )
  end

  desc "Build for App Store"
  lane :release do
    increment_build_number
    build_app(
      scheme: "IndigoYield",
      export_method: "app-store"
    )
    upload_to_app_store(
      submit_for_review: false,
      automatic_release: false
    )
    slack(
      message: "New release build uploaded to App Store Connect"
    )
  end
end
```

### 6.2 iOS CI/CD

```yaml
# .github/workflows/ios-ci.yml
name: iOS CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'ios/**'

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'

      - name: Install Fastlane
        run: gem install fastlane

      - name: Run tests
        run: |
          cd ios
          fastlane test

  build:
    runs-on: macos-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'

      - name: Install Fastlane
        run: gem install fastlane

      - name: Build and upload to TestFlight
        run: |
          cd ios
          fastlane beta
        env:
          FASTLANE_USER: ${{ secrets.APPLE_ID }}
          FASTLANE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_PASSWORD }}
```

---

## 7. Monitoring & Analytics

### 7.1 Performance Monitoring

```typescript
// lib/monitoring/performance.ts
import { sentryService } from '@/services/monitoring/sentry.service'

export function measurePerformance() {
  // Core Web Vitals
  if ('web-vital' in window.performance) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const metric = {
          name: entry.name,
          value: entry.value,
          rating: entry.rating,
        }

        // Send to analytics
        analyticsService.trackEvent('web-vital', metric)

        // Alert if poor
        if (entry.rating === 'poor') {
          sentryService.captureMessage(`Poor ${entry.name}: ${entry.value}`, 'warning')
        }
      }
    })

    observer.observe({ entryTypes: ['web-vital'] })
  }

  // Page load time
  window.addEventListener('load', () => {
    const perfData = window.performance.timing
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart

    analyticsService.trackEvent('page-load', {
      time: pageLoadTime,
      page: window.location.pathname,
    })
  })
}
```

### 7.2 Error Tracking

```typescript
// lib/monitoring/errors.ts
import { sentryService } from '@/services/monitoring/sentry.service'

export function setupErrorTracking() {
  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    sentryService.captureException(event.error, {
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  })

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    sentryService.captureException(event.reason, {
      extra: {
        promise: event.promise,
      },
    })
  })
}
```

---

## 8. Development Workflow

### 8.1 Git Workflow

```bash
# Feature development
git checkout develop
git pull origin develop
git checkout -b feature/IY-123-investment-flow
# ... make changes ...
git add .
git commit -m "feat: add investment flow"
git push origin feature/IY-123-investment-flow
# Create pull request to develop

# Release
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0
# ... update version, changelog ...
git push origin release/v1.2.0
# Create pull request to main
# After merge, tag release
git tag v1.2.0
git push origin v1.2.0
```

### 8.2 Code Review Checklist

```markdown
## Code Review Checklist

### Functionality
- [ ] Code works as expected
- [ ] Edge cases handled
- [ ] Error handling implemented
- [ ] Loading states present

### Code Quality
- [ ] Follows project conventions
- [ ] No code duplication
- [ ] Proper TypeScript types
- [ ] Comments where needed

### Performance
- [ ] No unnecessary re-renders
- [ ] Proper memoization
- [ ] Lazy loading where appropriate
- [ ] Bundle size impact acceptable

### Testing
- [ ] Unit tests added/updated
- [ ] Tests pass
- [ ] Coverage maintained/improved

### Security
- [ ] No sensitive data exposed
- [ ] Input validation present
- [ ] XSS prevention
- [ ] CSRF protection

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Proper ARIA labels
- [ ] Color contrast sufficient

### Documentation
- [ ] README updated if needed
- [ ] API docs updated
- [ ] Comments added where complex
```

---

## Success Metrics

1. **Build Time**: <2 minutes for production build
2. **Deploy Time**: <5 minutes end-to-end
3. **Uptime**: 99.9% availability
4. **Core Web Vitals**: All "Good" ratings
5. **Error Rate**: <0.1% of sessions
6. **CI/CD Success Rate**: >95% successful deployments

---

## Summary Document

This completes the 6-part implementation strategy covering:

1. **Component Architecture**: 100+ components, atomic design, reusability
2. **Module Organization**: Feature-first structure, team collaboration
3. **State Management**: React Query, Zustand, local state patterns
4. **API Integration**: Supabase, third-party services, error handling
5. **Forms & Validation**: React Hook Form, Zod schemas, multi-step forms
6. **Routing & Deployment**: React Router, CI/CD, monitoring

**Total Documentation**: 6 comprehensive implementation guides
**Ready for**: 15-person development team
**Timeline**: 8-12 weeks for initial implementation
**Scalability**: Designed for 210+ pages/screens

All documents are located in:
`/Users/mama/Desktop/Claude code/indigo-yield-platform-v01/docs/implementation/`
