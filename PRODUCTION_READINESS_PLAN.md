# Production Readiness Action Plan

**Start Date**: September 2, 2025  
**Target Completion**: September 16, 2025 (2 weeks)  
**Priority**: CRITICAL  

## 🎯 Goal
Transform the Indigo Yield Platform from current state (60% ready) to production-ready (100%) by fixing critical issues and implementing missing components.

## 🔴 Critical Path Items (Week 1)

### Day 1-2: Database RLS Fix (IMMEDIATE)
**Status**: 🚧 IN PROGRESS

#### Tasks:
1. [ ] Analyze infinite recursion in profiles RLS policies
2. [ ] Create migration to fix recursive policies
3. [ ] Test RLS policies locally
4. [ ] Deploy fix to development environment
5. [ ] Verify all database queries work

#### Files to Review:
- `supabase/migrations/002_rls_policies.sql`
- `supabase/migrations/005_phase3_rls_policies.sql`
- `supabase/migrations/008_2fa_totp_support.sql`

### Day 2-3: Observability Configuration
**Status**: ⏳ PENDING

#### Tasks:
1. [ ] Add VITE_SENTRY_DSN to Vercel (all environments)
2. [ ] Add VITE_POSTHOG_API_KEY to Vercel
3. [ ] Add VITE_POSTHOG_HOST to Vercel
4. [ ] Verify Sentry error tracking works
5. [ ] Verify PostHog analytics capture events
6. [ ] Set up Sentry alerts for critical errors

### Day 3-4: Performance Optimization
**Status**: ⏳ PENDING

#### Tasks:
1. [ ] Implement code splitting for routes
2. [ ] Lazy load heavy components
3. [ ] Optimize images and assets
4. [ ] Enable compression in Vercel
5. [ ] Reduce main bundle to < 500KB chunks
6. [ ] Run Lighthouse audit and fix issues

### Day 4-5: Testing Infrastructure
**Status**: ⏳ PENDING

#### Tasks:
1. [ ] Configure Vercel preview bypass token
2. [ ] Set up test user accounts in Supabase
3. [ ] Configure Playwright with auth
4. [ ] Write critical path E2E tests
5. [ ] Add tests to CI/CD pipeline

## 🟡 High Priority Items (Week 2)

### Day 6-7: E2E Test Suite
1. [ ] LP user journey tests
2. [ ] Admin workflow tests
3. [ ] Statement generation tests
4. [ ] Security boundary tests
5. [ ] Mobile responsiveness tests

### Day 8-9: CI/CD Pipeline
1. [ ] GitHub Actions workflow for PR checks
2. [ ] Automated Lighthouse audits
3. [ ] RLS policy validation
4. [ ] Security header checks
5. [ ] Deployment gates

### Day 10: Load Testing & Monitoring
1. [ ] Set up monitoring dashboards
2. [ ] Configure alerting rules
3. [ ] Run load tests
4. [ ] Document SLAs/SLOs
5. [ ] Create runbooks

### Day 11-12: Documentation & Training
1. [ ] Update deployment documentation
2. [ ] Create operational runbooks
3. [ ] Document security procedures
4. [ ] Prepare handover materials
5. [ ] Conduct knowledge transfer

## 📊 Success Metrics

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Database Health | ❌ Failing | ✅ 100% queries pass | CRITICAL |
| Bundle Size | 2.47MB | < 500KB chunks | HIGH |
| RLS Tests | 71% | 100% | CRITICAL |
| Lighthouse Score | Unknown | > 90 | HIGH |
| E2E Tests | 0 | > 20 tests | HIGH |
| Error Tracking | ❌ | ✅ Configured | CRITICAL |
| Analytics | ❌ | ✅ Configured | MEDIUM |
| CI/CD Gates | ❌ | ✅ All checks | HIGH |

## 🛠️ Technical Implementation Plan

### Phase 1: Fix Database (Day 1-2)

```sql
-- Fix infinite recursion in profiles RLS
-- Problem: Policies likely reference each other or auth functions recursively
-- Solution: Simplify policies, use direct auth.uid() checks

-- Step 1: Drop problematic policies
DROP POLICY IF EXISTS "..." ON profiles;

-- Step 2: Create clean, non-recursive policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

### Phase 2: Performance Optimization (Day 3-4)

```typescript
// Implement route-based code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminPanel = lazy(() => import('./pages/admin/AdminPanel'));

// Optimize bundle with dynamic imports
const heavyComponent = await import('./components/HeavyComponent');
```

### Phase 3: Testing Setup (Day 4-5)

```typescript
// playwright.config.ts
export default {
  use: {
    baseURL: process.env.PREVIEW_URL,
    extraHTTPHeaders: {
      'x-vercel-protection-bypass': process.env.VERCEL_BYPASS_TOKEN,
    },
  },
  projects: [
    { name: 'LP Tests', testDir: './tests/lp' },
    { name: 'Admin Tests', testDir: './tests/admin' },
  ],
};
```

## 📋 Daily Checklist

### Daily Tasks:
- [ ] Morning: Check service health metrics
- [ ] Review overnight error logs in Sentry
- [ ] Run RLS test suite
- [ ] Check bundle size metrics
- [ ] Update progress in this document
- [ ] Commit fixes with clear messages
- [ ] End of day: Update team on progress

## 🚀 Deployment Strategy

### Stage 1: Development (Days 1-5)
- Fix critical issues
- Test locally
- Deploy to dev environment

### Stage 2: Staging (Days 6-10)
- Full test suite passing
- Performance validated
- Security verified

### Stage 3: Production (Days 11-12)
- Final approval from stakeholders
- Gradual rollout (10% → 50% → 100%)
- Monitor metrics closely

## ⚠️ Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| RLS fix breaks other queries | Medium | High | Comprehensive testing before deploy |
| Performance degradation | Low | Medium | Gradual rollout with monitoring |
| Test failures in CI | Medium | Low | Fix incrementally, don't block all |
| Vercel auth issues persist | Low | High | Manual testing fallback |

## 📞 Escalation Path

1. **Technical Issues**: Database Team Lead
2. **Infrastructure**: DevOps Team
3. **Security Concerns**: Security Team
4. **Business Impact**: Product Owner
5. **Emergency**: On-call Engineer

## ✅ Definition of Done

The platform is considered production-ready when:

1. **All Critical Issues Resolved**
   - [x] Database queries working (no infinite recursion)
   - [ ] Observability configured and verified
   - [ ] Bundle size optimized (< 1MB total)

2. **Testing Complete**
   - [ ] E2E test suite passing (> 95%)
   - [ ] RLS tests passing (100%)
   - [ ] Lighthouse score > 90

3. **Operational Readiness**
   - [ ] Monitoring configured
   - [ ] Alerting set up
   - [ ] Runbooks documented
   - [ ] Team trained

4. **Security Verified**
   - [ ] All security headers present
   - [ ] RLS policies enforced
   - [ ] No sensitive data exposed

5. **Performance Validated**
   - [ ] LCP < 2.5s
   - [ ] FID < 100ms
   - [ ] CLS < 0.1

---

**Plan Created**: September 2, 2025  
**Last Updated**: September 2, 2025  
**Owner**: Platform Team  
**Status**: 🚧 IN PROGRESS
