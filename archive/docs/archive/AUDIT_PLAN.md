# 🔍 Indigo Yield Platform - Complete Audit & Remediation Plan

**Date:** January 2025  
**Status:** Ready for Implementation  
**Estimated Timeline:** 2-3 weeks

---

## 📊 Executive Summary

### Issues Identified
- **Critical:** 3 issues requiring immediate attention
- **High Priority:** 6 issues needing resolution within 1 week
- **Medium Priority:** 5 issues for optimization
- **Total:** 14 issues across security, database, and frontend

### Risk Assessment
- **Security Risk:** HIGH - RLS disabled on multiple tables, SQL injection potential
- **Functionality Risk:** MEDIUM - Missing tables, schema mismatches
- **Performance Risk:** LOW - Outdated dependencies, large components

---

## 🚨 Phase 1: Critical Security Fixes (Days 1-2)

### 1.1 Enable Row Level Security (RLS)
**Priority:** CRITICAL  
**Impact:** Prevents unauthorized data access  
**Effort:** 4 hours

**Tables Missing RLS:**
1. `daily_aum_entries`
2. `fund_daily_aum`
3. `investor_monthly_reports`
4. `yield_distribution_log`
5. `platform_fees_collected`

**Action Steps:**
```sql
-- For each table:
ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;

-- Create policies based on user roles:
-- Admin: Full access
-- Investor: View own data only
-- Example for investor_monthly_reports:

CREATE POLICY "Admins can view all monthly reports"
ON public.investor_monthly_reports FOR SELECT
TO authenticated
USING (public.is_admin_v2());

CREATE POLICY "Investors can view own monthly reports"
ON public.investor_monthly_reports FOR SELECT
TO authenticated
USING (investor_id = auth.uid());
```

**Files to Update:**
- Create new migration: `supabase/migrations/XXX_enable_rls_all_tables.sql`

---

### 1.2 Fix TOTP Database Query Bug
**Priority:** CRITICAL  
**Impact:** Causes authentication errors  
**Effort:** 30 minutes

**Problem:** Code queries non-existent `verified` column instead of `verified_at`

**Location:** `src/lib/auth/context.tsx:102`

**Fix:**
```typescript
// BEFORE:
const { data, error } = await supabase
  .from('user_totp_settings')
  .select('enabled, verified')
  .eq('user_id', user.id)
  .single();

// AFTER:
const { data, error } = await supabase
  .from('user_totp_settings')
  .select('enabled, verified_at')
  .eq('user_id', user.id)
  .single();

// Update TypeScript interface:
interface TotpSettings {
  enabled: boolean;
  verified_at: string | null;
}

// Update verification check:
const isVerified = data?.verified_at !== null;
```

**Files to Update:**
- `src/lib/auth/context.tsx`
- Any other files using TOTP settings

---

### 1.3 Fix SQL Injection Vulnerability in Functions
**Priority:** CRITICAL  
**Impact:** Potential SQL injection attacks  
**Effort:** 2 hours

**Affected Functions:**
1. `apply_daily_yield`
2. `apply_daily_yield_to_fund`
3. `apply_daily_yield_with_fees`
4. `recalculate_aum_percentages`

**Problem:** Mutable `search_path` allows potential SQL injection

**Fix Pattern:**
```sql
-- BEFORE:
CREATE OR REPLACE FUNCTION public.function_name(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''

-- AFTER:
CREATE OR REPLACE FUNCTION public.function_name(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
-- Explicitly qualify all table references with schema
```

**Action Steps:**
- Create migration to recreate these functions with explicit schema qualification
- Update all table references to use `public.table_name`
- Test all functions after update

---

## 🔧 Phase 2: Database Schema Fixes (Days 3-5)

### 2.1 Create Missing `investments` Table
**Priority:** HIGH  
**Impact:** Features relying on investments will fail  
**Effort:** 3 hours

**Schema Design:**
```sql
CREATE TABLE public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  investment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(28,10) NOT NULL CHECK (amount > 0),
  shares NUMERIC(28,10) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(investor_id, fund_id, investment_date)
);

-- Enable RLS
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all investments"
ON public.investments FOR ALL
TO authenticated
USING (public.is_admin_v2())
WITH CHECK (public.is_admin_v2());

CREATE POLICY "Investors can view own investments"
ON public.investments FOR SELECT
TO authenticated
USING (investor_id IN (
  SELECT id FROM public.investors WHERE profile_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create indexes
CREATE INDEX idx_investments_investor ON public.investments(investor_id);
CREATE INDEX idx_investments_fund ON public.investments(fund_id);
CREATE INDEX idx_investments_date ON public.investments(investment_date);
```

**Files to Update:**
- Create migration: `supabase/migrations/XXX_create_investments_table.sql`
- Update TypeScript types (auto-generated)
- Update any code referencing investments

---

### 2.2 Fix `profiles.role` Column Mismatch
**Priority:** HIGH  
**Impact:** Role-based access control may fail  
**Effort:** 2 hours

**Options:**

**Option A: Add `role` column to profiles**
```sql
ALTER TABLE public.profiles 
ADD COLUMN role TEXT DEFAULT 'investor' 
CHECK (role IN ('admin', 'investor', 'viewer'));

-- Populate based on is_admin flag
UPDATE public.profiles 
SET role = CASE WHEN is_admin THEN 'admin' ELSE 'investor' END;
```

**Option B: Update code to use existing `user_type` or `is_admin`**
- Search all files for `profiles.role` references
- Replace with `user_type` or `is_admin` checks
- More consistent with existing schema

**Recommendation:** Option B (use existing columns)

---

### 2.3 Fix `documents.status` Column Reference
**Priority:** HIGH  
**Impact:** Document queries may fail  
**Effort:** 1 hour

**Check if column exists:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documents' AND table_schema = 'public';
```

**If missing, add column:**
```sql
ALTER TABLE public.documents 
ADD COLUMN status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'archived', 'deleted'));

CREATE INDEX idx_documents_status ON public.documents(status);
```

**Or update code to not reference it.**

---

### 2.4 Add Missing Foreign Key Constraints
**Priority:** MEDIUM  
**Impact:** Data integrity  
**Effort:** 2 hours

**Review all tables for missing foreign key relationships:**
- Ensure all `investor_id` columns reference `investors(id)`
- Ensure all `fund_id` columns reference `funds(id)`
- Ensure all `user_id` columns reference appropriate tables
- Add `ON DELETE CASCADE` or `ON DELETE SET NULL` as appropriate

---

## 🎨 Phase 3: Frontend Improvements (Days 6-8)

### 3.1 Fix Content Security Policy (CSP)
**Priority:** HIGH  
**Impact:** Console errors, potential security issues  
**Effort:** 30 minutes

**Location:** `index.html`

**Current CSP blocks Google Fonts (not used):**
```html
<!-- REMOVE from CSP since we use @fontsource -->
font-src 'self' https://fonts.gstatic.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
```

**Updated CSP:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://nkfimvovosdehmyyjubn.supabase.co;
  style-src 'self' 'unsafe-inline';
  font-src 'self' data:;
  img-src 'self' data: https: blob:;
  connect-src 'self' https://nkfimvovosdehmyyjubn.supabase.co wss://nkfimvovosdehmyyjubn.supabase.co https://api.posthog.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

---

### 3.2 Refactor Large Components
**Priority:** MEDIUM  
**Impact:** Maintainability, performance  
**Effort:** 4 hours

**Component:** `src/pages/admin/InvestorReports.tsx` (513 lines)

**Refactoring Strategy:**
```
src/pages/admin/InvestorReports.tsx (main page, <100 lines)
├── components/
│   ├── investor-reports/
│   │   ├── ReportsHeader.tsx (filters, actions)
│   │   ├── ReportsTable.tsx (data grid)
│   │   ├── ReportRow.tsx (individual row)
│   │   ├── ReportFilters.tsx (filter controls)
│   │   └── ReportActions.tsx (generate, download)
├── hooks/
│   ├── useInvestorReports.ts (data fetching)
│   ├── useReportFilters.ts (filter logic)
│   └── useReportGeneration.ts (report generation)
└── types/
    └── reports.ts (TypeScript interfaces)
```

**Benefits:**
- Easier to test individual components
- Better code reusability
- Improved performance (smaller component re-renders)
- Better developer experience

---

### 3.3 Add Error Boundaries
**Priority:** MEDIUM  
**Impact:** User experience, error handling  
**Effort:** 2 hours

**Components Needing Error Boundaries:**
1. `ReportsDashboard`
2. `Admin Reports`
3. `Investor Management`
4. `Portfolio Views`

**Implementation:**
```typescript
// src/components/error/PageErrorBoundary.tsx
import { ErrorBoundary } from './ErrorBoundary';

export function PageErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-destructive mb-2">
              Something went wrong
            </h2>
            <p className="text-muted-foreground mb-4">
              Please refresh the page or contact support if the issue persists.
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
```

**Wrap critical pages:**
```typescript
// In AppRoutes.tsx
<Route path="/admin/reports" element={
  <PageErrorBoundary>
    <ReportsDashboard />
  </PageErrorBoundary>
} />
```

---

### 3.4 Optimize Bundle Size
**Priority:** MEDIUM  
**Impact:** Page load performance  
**Effort:** 3 hours

**Current Issues:**
- Large initial bundle size
- No code splitting for admin routes
- Heavy dependencies loaded upfront

**Actions:**
1. Implement route-based code splitting
2. Lazy load admin components
3. Analyze and remove unused dependencies
4. Optimize chart library imports (tree-shaking)

**Example:**
```typescript
// Instead of:
import { ReportsDashboard } from './pages/admin/ReportsDashboard';

// Use:
const ReportsDashboard = lazy(() => import('./pages/admin/ReportsDashboard'));
```

---

## 🔐 Phase 4: Security Enhancements (Days 9-10)

### 4.1 Security Audit Report
**Priority:** HIGH  
**Impact:** Overall security posture  
**Effort:** 4 hours

**Run Security Scans:**
1. Run Supabase RLS linter
2. Check for exposed secrets
3. Review authentication flows
4. Audit API endpoints
5. Check CORS configuration

**Use security tools:**
```bash
# Run security scan
npm audit

# Check for secrets in code
git secrets --scan

# Supabase security check
supabase db lint
```

---

### 4.2 Implement Rate Limiting
**Priority:** MEDIUM  
**Impact:** Prevents abuse  
**Effort:** 2 hours

**Add rate limiting to critical endpoints:**
- Login attempts
- Password reset requests
- Report generation
- API calls

**Implementation using Edge Functions:**
```typescript
// supabase/functions/_shared/rate-limit.ts
import { createClient } from '@supabase/supabase-js';

export async function checkRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  // Check rate_limit_log table
  // Return true if within limits, false otherwise
}
```

---

### 4.3 Add Audit Logging Enhancement
**Priority:** MEDIUM  
**Impact:** Compliance, debugging  
**Effort:** 3 hours

**Current audit_log table is good, but add:**
- IP address tracking
- User agent tracking
- Geographic location (optional)
- Failed access attempts
- Data export tracking

**Schema enhancement:**
```sql
ALTER TABLE public.audit_log 
ADD COLUMN ip_address INET,
ADD COLUMN user_agent TEXT,
ADD COLUMN country_code TEXT,
ADD COLUMN success BOOLEAN DEFAULT TRUE,
ADD COLUMN error_message TEXT;

CREATE INDEX idx_audit_log_ip ON public.audit_log(ip_address);
CREATE INDEX idx_audit_log_success ON public.audit_log(success);
```

---

## 🧪 Phase 5: Testing & Validation (Days 11-12)

### 5.1 Create Test Suite
**Priority:** HIGH  
**Impact:** Code quality, regression prevention  
**Effort:** 6 hours

**Test Coverage Needed:**
1. **Unit Tests** (50+ tests)
   - Service layer functions
   - Utility functions
   - React hooks

2. **Integration Tests** (20+ tests)
   - Authentication flow
   - Data fetching
   - CRUD operations

3. **E2E Tests** (10+ tests)
   - Login flow with 2FA
   - Admin investor management
   - Report generation
   - Document upload/download

**Example Test:**
```typescript
// src/services/__tests__/adminServiceV2.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { adminServiceV2 } from '../adminServiceV2';

describe('AdminServiceV2', () => {
  it('should fetch all investors with summary', async () => {
    const investors = await adminServiceV2.getAllInvestorsWithSummary();
    expect(investors).toBeDefined();
    expect(Array.isArray(investors)).toBe(true);
  });
});
```

---

### 5.2 Database Migration Testing
**Priority:** HIGH  
**Impact:** Data integrity  
**Effort:** 3 hours

**Test Process:**
1. Create test database snapshot
2. Apply all migrations in sequence
3. Verify data integrity
4. Test rollback procedures
5. Document migration notes

**Script:**
```bash
#!/bin/bash
# test-migrations.sh

echo "Creating test snapshot..."
supabase db dump -f backup.sql

echo "Applying migrations..."
supabase db push

echo "Running validation queries..."
psql $DATABASE_URL -f validation-queries.sql

echo "Testing RLS policies..."
npm run test:rls
```

---

### 5.3 Performance Testing
**Priority:** MEDIUM  
**Impact:** User experience  
**Effort:** 3 hours

**Metrics to Test:**
- Page load time (target: <2s)
- Time to interactive (target: <3s)
- API response time (target: <500ms)
- Database query time (target: <100ms)
- Bundle size (target: <500KB initial)

**Tools:**
- Lighthouse CI
- Chrome DevTools Performance
- React DevTools Profiler
- Supabase query analyzer

---

## 📋 Phase 6: Documentation & Deployment (Days 13-14)

### 6.1 Update Documentation
**Priority:** MEDIUM  
**Impact:** Developer productivity  
**Effort:** 4 hours

**Documents to Update:**
1. `README.md` - Setup instructions
2. `ARCHITECTURE.md` - System overview
3. `API_DOCUMENTATION.md` - API endpoints
4. `DATABASE_SCHEMA.md` - Table descriptions
5. `SECURITY_GUIDE.md` - Security practices
6. `DEPLOYMENT_GUIDE.md` - Deployment steps

---

### 6.2 Create Deployment Checklist
**Priority:** HIGH  
**Impact:** Safe deployment  
**Effort:** 2 hours

**Pre-Deployment:**
- [ ] All tests passing
- [ ] Database migrations tested
- [ ] RLS policies verified
- [ ] Security scan passed
- [ ] Code review completed
- [ ] Backup created

**Deployment:**
- [ ] Apply database migrations
- [ ] Deploy edge functions
- [ ] Deploy frontend
- [ ] Verify environment variables
- [ ] Test critical flows

**Post-Deployment:**
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify RLS policies active
- [ ] Test user access
- [ ] Update status page

---

### 6.3 Setup Monitoring & Alerts
**Priority:** HIGH  
**Impact:** Incident response  
**Effort:** 3 hours

**Configure Monitoring:**
1. **Error Tracking** (Sentry already configured)
   - Set up error alerts
   - Configure error grouping
   - Add performance monitoring

2. **Database Monitoring**
   - Slow query alerts
   - Connection pool monitoring
   - RLS policy violations

3. **API Monitoring**
   - Endpoint health checks
   - Response time tracking
   - Rate limit violations

4. **User Activity**
   - Failed login attempts
   - Unusual access patterns
   - Large data exports

**Alert Channels:**
- Email for critical issues
- Slack integration (optional)
- Dashboard for monitoring

---

## 📊 Implementation Timeline

### Week 1: Critical & High Priority
```
Day 1-2:   Phase 1 (Critical Security)
Day 3-5:   Phase 2 (Database Schema)
```

### Week 2: Frontend & Testing
```
Day 6-8:   Phase 3 (Frontend Improvements)
Day 9-10:  Phase 4 (Security Enhancements)
Day 11-12: Phase 5 (Testing & Validation)
```

### Week 3: Deployment & Polish
```
Day 13-14: Phase 6 (Documentation & Deployment)
Day 15:    Buffer for issues
```

---

## 🎯 Success Criteria

### Security
- ✅ All tables have RLS enabled
- ✅ No SQL injection vulnerabilities
- ✅ Security scan passes with no critical issues
- ✅ Audit logging comprehensive

### Functionality
- ✅ All database queries work correctly
- ✅ No missing table errors
- ✅ Authentication flows work properly
- ✅ All features tested and working

### Performance
- ✅ Page load < 2 seconds
- ✅ API responses < 500ms
- ✅ No console errors
- ✅ Lighthouse score > 90

### Code Quality
- ✅ Test coverage > 70%
- ✅ No large monolithic components (>300 lines)
- ✅ Type safety enforced
- ✅ Documentation complete

---

## 🚀 Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize phases** based on business needs
3. **Assign resources** to each phase
4. **Create tickets** in project management system
5. **Begin Phase 1** immediately

---

## 📞 Support & Resources

- **Supabase Dashboard:** https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn
- **Security Documentation:** https://supabase.com/docs/guides/auth/row-level-security
- **Edge Functions:** https://supabase.com/docs/guides/functions

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Ready for Implementation
