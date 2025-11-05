# Web Platform Optimization Checklist

**Quick reference for implementation priorities**

---

## 🔴 P0 - Critical (Do Immediately)

### Security Fixes (1 day)

- [ ] Remove hardcoded Supabase credentials from `src/integrations/supabase/client.ts`
- [ ] Add environment variables to `.env.local`
- [ ] Implement environment validation with Zod
- [ ] Update `.env.example` with all required variables
- [ ] Add environment check in CI/CD

```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_SENTRY_DSN: z.string().url().optional(),
});

export const env = envSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
});
```

---

### TypeScript Strict Mode (1-2 weeks)

- [ ] Enable `strict: true` in `tsconfig.json`
- [ ] Enable `strictNullChecks: true`
- [ ] Enable `noImplicitAny: true`
- [ ] Enable `noUnusedLocals: true`
- [ ] Enable `noUnusedParameters: true`
- [ ] Fix type errors incrementally (start with critical paths)
- [ ] Replace all `any` types with proper types
- [ ] Add return types to all functions

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

### Performance Optimization (2-3 weeks)

#### React Performance Patterns

- [ ] **Memoize Context Values**
  - [ ] `AuthContext` - memoize value object
  - [ ] `SecurityContext` - memoize value object
  - [ ] All other contexts

- [ ] **Add React.memo to Components**
  - [ ] `KPICard` component
  - [ ] `TransactionRow` component
  - [ ] `InvestorCard` component
  - [ ] All list item components
  - [ ] All dashboard cards

- [ ] **Add useMemo for Computed Values**
  - [ ] Chart data transformations
  - [ ] Filtered/sorted lists
  - [ ] Formatted currency values
  - [ ] Dashboard calculations

- [ ] **Add useCallback for Event Handlers**
  - [ ] Form submission handlers
  - [ ] Button click handlers
  - [ ] Search input handlers
  - [ ] Filter change handlers

```typescript
// Example: Memoize context
const value = useMemo(() => ({
  user, session, profile, loading, isAdmin,
  signIn, signOut, signUp
}), [user, session, profile, loading, isAdmin]);

// Example: React.memo component
export const KPICard = React.memo(function KPICard(props) {
  const trendDisplay = useMemo(() => {
    // compute trend
  }, [props.trend]);

  return <Card>{trendDisplay}</Card>;
});

// Example: useCallback
const handleSubmit = useCallback((data) => {
  // submit logic
}, [dependencies]);
```

#### Bundle Optimization

- [ ] Add bundle analyzer to build process
- [ ] Lazy load Recharts library
- [ ] Split Radix UI components into separate chunks
- [ ] Add compression plugins (gzip + brotli)
- [ ] Implement component-level code splitting
- [ ] Add bundle size limits to CI

```typescript
// vite.config.ts improvements
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

plugins: [
  visualizer({ filename: './dist/stats.html' }),
  viteCompression({ algorithm: 'brotliCompress' }),
  viteCompression({ algorithm: 'gzip' }),
]
```

---

### Testing Infrastructure (2-3 weeks)

#### Unit Tests

- [ ] Set up test environment properly
- [ ] Configure coverage thresholds (60% minimum)
- [ ] Write tests for critical hooks
  - [ ] `useRealtimeSubscription`
  - [ ] `useAuth`
  - [ ] `useInvestors`
  - [ ] Custom hooks
- [ ] Write tests for utilities
  - [ ] Form validators
  - [ ] Data formatters
  - [ ] API helpers
- [ ] Write component tests
  - [ ] `Button` component
  - [ ] `KPICard` component
  - [ ] `ErrorBoundary`
  - [ ] Critical UI components

```typescript
// Example: Hook test
import { renderHook } from '@testing-library/react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

describe('useRealtimeSubscription', () => {
  it('should establish subscription', async () => {
    const onUpdate = jest.fn();
    const { result } = renderHook(() =>
      useRealtimeSubscription({ table: 'portfolios', onUpdate })
    );
    expect(result.current).toBeDefined();
  });
});
```

#### CI/CD Integration

- [ ] Add test script to CI pipeline
- [ ] Add coverage reporting
- [ ] Add pre-commit hooks for tests
- [ ] Add branch protection rules
- [ ] Set up continuous testing

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3
```

---

## 🟡 P1 - High Priority (Do This Month)

### State Management with TanStack Query (2 weeks)

- [ ] Set up TanStack Query provider
- [ ] Migrate portfolio data fetching to useQuery
- [ ] Migrate investor data fetching to useQuery
- [ ] Implement mutations with optimistic updates
- [ ] Add retry logic
- [ ] Configure caching strategy
- [ ] Add invalidation patterns

```typescript
// Example: TanStack Query setup
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 3,
    },
  },
});

// Example: useQuery hook
export function usePortfolio(userId: string) {
  return useQuery({
    queryKey: ['portfolio', userId],
    queryFn: () => fetchPortfolio(userId),
    staleTime: 5 * 60 * 1000,
  });
}
```

---

### Error Handling Improvements (1 week)

- [ ] Add feature-specific error boundaries
- [ ] Create user-friendly error message mapper
- [ ] Implement retry logic for failed requests
- [ ] Add error recovery UI
- [ ] Configure Sentry PII scrubbing
- [ ] Add error toast notifications
- [ ] Implement offline queue for failed requests

```typescript
// Error message mapper
const ERROR_MESSAGES: Record<string, string> = {
  'PGRST301': 'Access denied. Please contact support.',
  'network_error': 'Connection lost. Please check your internet.',
};

export function getUserFriendlyError(error: any): string {
  return ERROR_MESSAGES[error.code] || 'An error occurred.';
}
```

---

### Component Documentation (1 week)

- [ ] Set up Storybook properly
- [ ] Document all UI components
- [ ] Add usage examples
- [ ] Create component guidelines
- [ ] Add prop descriptions
- [ ] Create design system documentation

---

## 🟢 P2 - Medium Priority (This Quarter)

### Advanced Performance

- [ ] Implement React 18 concurrent features
  - [ ] Use `useTransition` for expensive updates
  - [ ] Use `useDeferredValue` for search
  - [ ] Add `startTransition` for UI updates
- [ ] Add virtual scrolling for long lists
- [ ] Implement progressive image loading
- [ ] Add service worker caching strategies
- [ ] Implement prefetching on hover

---

### Developer Experience

- [ ] Add ESLint strict rules
- [ ] Configure Prettier
- [ ] Add commit message linting
- [ ] Create developer documentation
- [ ] Add architecture diagrams
- [ ] Create contributing guidelines

---

### Monitoring & Analytics

- [ ] Add custom Web Vitals tracking
- [ ] Implement bundle size monitoring
- [ ] Add performance budgets
- [ ] Create performance dashboard
- [ ] Set up error alerting
- [ ] Add user analytics events

---

## 📊 Success Metrics

### Track Weekly

| Metric | Target | Current |
|--------|--------|---------|
| Test Coverage | 80% | 0% |
| Lighthouse Performance | 90+ | 66 |
| Bundle Size | <500KB | TBD |
| LCP | <2.5s | 5.4s |
| TypeScript Errors | 0 | Many |
| Build Time | <30s | TBD |

---

## 🎯 Quick Wins (Do First)

These can be done in a few hours each and provide immediate value:

### 1. Memoize Context Values (2 hours)

```typescript
// AuthContext.tsx
const value = useMemo(() => ({
  user, session, profile, loading, isAdmin,
  signIn, signOut, signUp, resetPassword, updatePassword
}), [user, session, profile, loading, isAdmin]);
```

### 2. Add React.memo to KPICard (1 hour)

```typescript
// KPICard.tsx
export const KPICard = React.memo(function KPICard(props) {
  // ... existing code
});
```

### 3. Move Supabase Credentials (1 hour)

```typescript
// client.ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### 4. Add Bundle Analyzer (30 minutes)

```bash
npm install --save-dev rollup-plugin-visualizer
```

### 5. Configure Coverage Threshold (15 minutes)

```javascript
// jest.config.cjs
coverageThreshold: {
  global: { statements: 60, branches: 60, functions: 60, lines: 60 }
}
```

---

## 🔧 Tools to Install

```bash
# Performance
npm install --save-dev rollup-plugin-visualizer
npm install --save-dev vite-plugin-compression
npm install --save-dev bundlesize

# Testing
npm install --save-dev @testing-library/react
npm install --save-dev @testing-library/react-hooks
npm install --save-dev @testing-library/user-event

# Code Quality
npm install --save-dev husky
npm install --save-dev lint-staged
npm install --save-dev @commitlint/cli
npm install --save-dev @commitlint/config-conventional

# State Management (already installed!)
# @tanstack/react-query is already in dependencies
```

---

## 📚 Resources

- [React Performance Optimization](https://react.dev/reference/react/memo)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [Vite Performance](https://vitejs.dev/guide/performance.html)
- [Testing Library Best Practices](https://testing-library.com/docs/react-testing-library/intro/)

---

## 📝 Notes

- All P0 tasks should be completed before production deployment
- P1 tasks significantly improve UX and developer experience
- P2 tasks are important for long-term maintainability
- Track progress weekly in team meetings
- Update this checklist as items are completed

---

**Last Updated:** November 3, 2025
**Next Review:** After P0 completion
