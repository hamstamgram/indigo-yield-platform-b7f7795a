# Lovable Deployment Strategy - Indigo Yield Platform

**Date:** November 26, 2025
**Platform:** Lovable.dev
**Current Status:** 85% Ready (B+ Grade)
**Estimated Deployment Time:** 2-3 days pre-work + 4-6 hours deployment

---

## 🎯 Executive Summary

The Indigo Yield Platform is **85% ready for Lovable deployment** with excellent architecture (B+ grade). This strategy outlines a **phased deployment approach** to achieve 100% readiness while minimizing risk.

**Key Metrics:**
- ✅ 58 pages fully implemented and functional
- ✅ 5/5 critical user flows tested and working
- ⚠️ 3 CRITICAL blockers (2-3 days to fix)
- ⚠️ 2 HIGH priority issues (1 day to fix)
- ✅ Mobile responsive (A- grade, 95%)
- ⚠️ Security patches required (EMERGENCY_SECURITY_PATCH.sql)

**Deployment Approach:** Fix critical blockers → Deploy to staging → Validate → Deploy to production

---

## 📋 Phase 1: Pre-Deployment Fixes (2-3 Days)

### 🔴 CRITICAL - Must Fix Before Deployment

#### 1. Apply Emergency Security Patches (PRIORITY 0)
**Time:** 30 minutes
**Risk:** CRITICAL - Platform vulnerable without these patches

```bash
# Execute in Supabase SQL Editor or via CLI
psql $DATABASE_URL -f EMERGENCY_SECURITY_PATCH.sql
```

**What it fixes:**
- Enables RLS on 8 unprotected tables
- Fixes audit log forgery vulnerability
- Secures withdrawal authorization
- Adds transaction integrity constraints
- Creates rate limiting infrastructure

**Validation:**
```sql
-- Verify all tables have RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Should show TRUE for all critical tables
```

#### 2. Configure Lovable Environment Variables (PRIORITY 1)
**Time:** 1 hour
**Risk:** HIGH - Application won't connect to services without these

**Required Environment Variables (15 total):**

```env
# Supabase Configuration (CRITICAL)
VITE_SUPABASE_URL=https://nkfimvovosdehmyyjubn.supabase.co
VITE_SUPABASE_ANON_KEY=[NEW_ROTATED_KEY]
SUPABASE_SERVICE_ROLE_KEY=[NEW_ROTATED_KEY]

# Authentication & Security (CRITICAL)
VITE_APP_ENV=production
NEXT_PUBLIC_APP_URL=https://your-lovable-domain.lovable.app

# Monitoring & Analytics (HIGH)
VITE_SENTRY_DSN=[your-sentry-dsn]
SENTRY_AUTH_TOKEN=[your-sentry-token]
VITE_POSTHOG_KEY=[your-posthog-key]
VITE_POSTHOG_HOST=https://app.posthog.com

# Email Service (MEDIUM - can be configured post-deployment)
MAILERLITE_API_KEY=[your-mailerlite-key]
SMTP_HOST=[your-smtp-host]
SMTP_PORT=587
SMTP_USER=[your-smtp-user]
SMTP_PASSWORD=[your-smtp-password]

# Optional Features
AIRTABLE_API_KEY=[optional]
AIRTABLE_BASE_ID=[optional]
```

**Lovable Configuration Steps:**
1. Log into Lovable dashboard
2. Go to your project → Settings → Environment Variables
3. Add each variable above
4. Mark `SUPABASE_SERVICE_ROLE_KEY` as **Secret** (hidden in logs)
5. Mark all `*_PASSWORD` and `*_KEY` variables as **Secret**

**Security Notes:**
- ⚠️ **ROTATE ALL KEYS** - The audit found exposed credentials in git history
- Use Supabase dashboard to generate new anon and service role keys
- Never commit `.env` files (already in .gitignore)

#### 3. Create Missing Database Tables (PRIORITY 1)
**Time:** 30 minutes
**Risk:** HIGH - Features will break without these tables

**Tables to Create:**

```sql
-- 1. Email Logs Table (for email tracking)
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID REFERENCES public.investors(id) ON DELETE CASCADE,
    email_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'sent',
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs FORCE ROW LEVEL SECURITY;

-- RLS Policy: Investors see their own, admins see all
CREATE POLICY "email_logs_select_own" ON public.email_logs
    FOR SELECT USING (
        investor_id IN (
            SELECT id FROM investors WHERE user_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "email_logs_admin_manage" ON public.email_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 2. Notification Settings Table (for user preferences)
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    notification_frequency TEXT DEFAULT 'immediate',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings FORCE ROW LEVEL SECURITY;

-- RLS Policy: Users manage their own settings
CREATE POLICY "notification_settings_own" ON public.notification_settings
    FOR ALL USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_email_logs_investor_id ON public.email_logs(investor_id);
CREATE INDEX idx_email_logs_sent_at ON public.email_logs(sent_at);
CREATE INDEX idx_notification_settings_user_id ON public.notification_settings(user_id);
```

**Validation:**
```sql
-- Verify tables exist
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('email_logs', 'notification_settings');

-- Verify RLS policies
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('email_logs', 'notification_settings');
```

#### 4. Handle Report Engine Dependency (PRIORITY 2)
**Time:** 4-8 hours OR 30 minutes (depending on approach)
**Risk:** MEDIUM - Custom reports feature will be unavailable

**Option A: Quick Fix (Recommended for MVP)**
Create a stub implementation that disables custom reports temporarily:

```typescript
// src/services/reportEngine.ts
/**
 * Report Engine Service - Phase 2 Implementation
 * Currently returns stub data for deployment
 */

export interface ReportConfig {
  type: 'performance' | 'transactions' | 'custom';
  dateRange: { start: Date; end: Date };
  investorId?: string;
  fundId?: string;
}

export interface ReportData {
  title: string;
  generated_at: Date;
  data: any;
  format: 'json' | 'csv' | 'pdf';
}

/**
 * Generate report based on configuration
 * @param config - Report configuration
 * @returns Promise<ReportData>
 */
export async function generateReport(config: ReportConfig): Promise<ReportData> {
  console.warn('Report engine not implemented - returning stub data');

  return {
    title: `${config.type} Report`,
    generated_at: new Date(),
    data: {
      message: 'Custom reports coming soon in Phase 2',
      config: config,
    },
    format: 'json',
  };
}

/**
 * Export report to specified format
 * @param reportData - Generated report data
 * @param format - Export format
 */
export async function exportReport(
  reportData: ReportData,
  format: 'csv' | 'pdf' | 'json'
): Promise<Blob> {
  console.warn('Report export not implemented - returning stub');

  const stub = JSON.stringify(reportData, null, 2);
  return new Blob([stub], { type: 'application/json' });
}

/**
 * Schedule report generation
 * @param config - Report configuration
 * @param schedule - Cron expression
 */
export async function scheduleReport(
  config: ReportConfig,
  schedule: string
): Promise<string> {
  console.warn('Report scheduling not implemented');
  return 'stub-schedule-id';
}
```

**Option B: Full Implementation (Post-MVP)**
- Implement comprehensive report engine with:
  - SQL query builder for custom reports
  - Chart.js integration for visualizations
  - PDF generation with jsPDF
  - Scheduled report generation via Supabase Edge Functions
- **Estimated time:** 1-2 weeks
- **Recommendation:** Deploy without this feature, implement in Phase 2

**For Now:** Use Option A (stub) and add feature flag in UI:

```typescript
// src/config/features.ts
export const FEATURE_FLAGS = {
  CUSTOM_REPORTS: false, // Enable in Phase 2
  PDF_GENERATION: false, // Enable in Phase 2
  AIRTABLE_SYNC: false,  // Optional feature
};
```

### 🟠 HIGH Priority - Should Fix Before Deployment

#### 5. Test Supabase Edge Functions for Email (PRIORITY 3)
**Time:** 2-4 hours
**Risk:** MEDIUM - Email notifications may not work

**Current Setup:**
- Edge function: `supabase/functions/send-email/`
- Uses Deno runtime (Lovable-compatible)
- Requires `MAILERLITE_API_KEY` environment variable

**Testing Steps:**

```bash
# 1. Deploy edge function to Supabase
cd supabase/functions/send-email
supabase functions deploy send-email

# 2. Test with curl
curl -i --location --request POST \
  'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/send-email' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"to":"test@example.com","subject":"Test","body":"Test email"}'

# 3. Verify in Supabase dashboard logs
```

**Fallback Option:**
If edge functions don't work in Lovable environment:
1. Use client-side email via `mailto:` links (temporary)
2. Implement webhook to external email service (Resend, SendGrid)
3. Queue emails in database, process via background job

#### 6. Configure Airtable Integration (Optional)
**Time:** 1 hour
**Risk:** LOW - Feature is optional and has fallback

**If using Airtable for investor onboarding:**
1. Create Airtable account and base
2. Get API key from https://airtable.com/account
3. Add to Lovable environment variables:
   ```
   AIRTABLE_API_KEY=keyXXXXXXXXXXXXXX
   AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
   ```

**If NOT using Airtable:**
1. Set feature flag to false in `src/config/features.ts`
2. Remove Airtable references from onboarding flow
3. Use direct database inserts for investor registration

---

## 📦 Phase 2: Build & Deploy (4-6 Hours)

### Step 1: Pre-Deployment Build Verification (1 hour)

```bash
# 1. Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# 2. Run linting
npm run lint
# Fix any errors found

# 3. Run TypeScript check
npm run type-check
# Fix any type errors

# 4. Run tests (if available)
npm run test
# Fix any failing tests

# 5. Build for production
npm run build
# Should complete without errors

# 6. Preview production build locally
npm run preview
# Test critical flows manually
```

**Build Success Criteria:**
- ✅ No ESLint errors
- ✅ No TypeScript errors
- ✅ Build completes successfully
- ✅ dist/ folder contains optimized assets
- ✅ Bundle size < 1MB (check with `du -sh dist/`)

### Step 2: Connect GitHub to Lovable (30 minutes)

**Prerequisites:**
- GitHub repository with latest code
- Lovable account created
- Project created in Lovable dashboard

**Steps:**

1. **Push all changes to GitHub:**
```bash
git add .
git commit -m "feat: prepare for lovable deployment

- Applied security patches
- Configured environment variables
- Created missing database tables
- Added report engine stub
- Fixed build errors"
git push origin main
```

2. **Connect repository to Lovable:**
   - Log into Lovable dashboard
   - Click "New Project" or "Import Project"
   - Select "Import from GitHub"
   - Authorize Lovable to access your repository
   - Select `indigo-yield-platform-v01` repository
   - Select `main` branch

3. **Configure build settings:**
   - Framework: React (auto-detected from Vite)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Node Version: 18.x (or latest LTS)

### Step 3: Configure Lovable Project Settings (1 hour)

**Environment Variables:**
- Go to Project → Settings → Environment Variables
- Add all 15 variables from Phase 1, Step 2
- Mark secrets appropriately

**Custom Domain (Optional):**
- Go to Project → Settings → Domains
- Add custom domain: `app.indigoyield.com`
- Follow DNS configuration instructions
- Wait for SSL certificate provisioning (15-30 minutes)

**Build Hooks (Optional):**
- Pre-build: Run security checks
- Post-build: Run smoke tests
- Deploy success: Send notification

**Deployment Settings:**
- Auto-deploy: Enable for `main` branch
- Preview deployments: Enable for pull requests
- Production branch: `main`

### Step 4: Initial Deployment (30 minutes)

**Deploy to Staging First:**

1. **Create staging branch:**
```bash
git checkout -b staging
git push origin staging
```

2. **Configure staging environment:**
   - Lovable → Project → Settings → Branches
   - Add staging branch
   - Use staging environment variables
   - Use staging Supabase project (recommended)

3. **Deploy staging:**
   - Lovable will auto-deploy staging branch
   - Wait 5-10 minutes for build + deployment
   - Check build logs for errors

**Staging URL:** `https://staging--your-project.lovable.app`

### Step 5: Staging Validation (2 hours)

**Critical User Flow Testing:**

1. **Authentication Flow:**
```
✅ Navigate to staging URL
✅ Click "Login"
✅ Enter test investor credentials
✅ Verify redirect to /dashboard
✅ Check dashboard loads data from Supabase
✅ Log out
✅ Log in as admin
✅ Verify redirect to /admin
✅ Check admin dashboard loads
```

2. **Investor Portfolio Flow:**
```
✅ Log in as investor
✅ Navigate to /portfolio
✅ Verify positions load correctly
✅ Check performance charts render
✅ Navigate to /transactions
✅ Verify transaction history displays
✅ Navigate to /withdrawals
✅ Click "Request Withdrawal"
✅ Fill form and submit
✅ Verify success message
✅ Check withdrawal appears in pending list
```

3. **Admin Operations Flow:**
```
✅ Log in as admin
✅ Navigate to /admin/operations/monthly-data
✅ Select fund and month
✅ Enter NAV, shares, allocation data
✅ Submit data
✅ Verify success message
✅ Navigate to /admin/operations/generate-statements
✅ Click "Generate Statements"
✅ Verify statements generated
✅ Download sample statement PDF
```

4. **Document Management Flow:**
```
✅ Log in as investor
✅ Navigate to /documents
✅ Click "Upload Document"
✅ Select file (PDF/Image)
✅ Add description
✅ Upload
✅ Verify document appears in list
✅ Click document to view/download
✅ Verify file loads correctly
```

5. **Mobile Responsiveness:**
```
✅ Open staging URL on mobile device
✅ Test login flow
✅ Navigate through dashboard
✅ Verify touch interactions work
✅ Check navigation menu accessibility
✅ Test forms on mobile
```

**Database Validation:**

```sql
-- Run these queries in Supabase SQL editor

-- 1. Verify RLS is enabled on all tables
SELECT COUNT(*) as unprotected_tables
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT rowsecurity
  AND tablename NOT LIKE 'pg_%';
-- Should return 0

-- 2. Check audit log for any suspicious activity
SELECT *
FROM audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 50;

-- 3. Verify new tables exist
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('email_logs', 'notification_settings', 'rate_limits');
-- Should return 3 rows with rowsecurity = true
```

**Performance Testing:**

```bash
# Run Lighthouse audit
npx lighthouse https://staging--your-project.lovable.app \
  --view \
  --output html \
  --output-path ./lighthouse-staging.html

# Check key metrics:
# - Performance: > 90
# - Accessibility: > 95
# - Best Practices: > 90
# - SEO: > 90
```

**Error Monitoring:**

- Check Sentry dashboard for any errors
- Review browser console for warnings
- Check Supabase logs for database errors
- Verify no CORS issues

### Step 6: Production Deployment (30 minutes)

**Only proceed if staging validation passes 100%**

1. **Merge to main:**
```bash
git checkout main
git merge staging
git push origin main
```

2. **Production deployment:**
   - Lovable auto-deploys main branch
   - Wait 5-10 minutes for build + deployment
   - Monitor build logs

3. **Production URL:** `https://your-project.lovable.app` or custom domain

4. **Smoke test production:**
```
✅ Visit production URL
✅ Test login (investor + admin)
✅ Verify dashboard loads
✅ Test one critical flow end-to-end
✅ Check error monitoring dashboard
```

---

## ✅ Phase 3: Post-Deployment Validation (1 Hour)

### Immediate Validation Checklist

**Infrastructure:**
- [ ] Production URL accessible
- [ ] SSL certificate valid (green lock icon)
- [ ] DNS resolving correctly (if custom domain)
- [ ] CDN caching enabled
- [ ] Gzip compression active

**Application:**
- [ ] Login page loads
- [ ] Authentication working
- [ ] Dashboard displays data
- [ ] API calls successful (check Network tab)
- [ ] Images/assets loading
- [ ] Favicon displays correctly

**Security:**
- [ ] All environment variables set correctly
- [ ] No credentials exposed in client-side code
- [ ] RLS policies enforced (test with different users)
- [ ] HTTPS enforced (no HTTP access)
- [ ] CORS configured correctly

**Monitoring:**
- [ ] Sentry receiving errors (trigger test error)
- [ ] PostHog tracking pageviews
- [ ] Supabase logs recording queries
- [ ] Build metrics tracking (Lovable dashboard)

**User Flows:**
- [ ] Investor can log in and view portfolio
- [ ] Admin can log in and access admin panel
- [ ] Documents can be uploaded/downloaded
- [ ] Withdrawal requests can be submitted
- [ ] Email notifications sent (if edge function working)

### Performance Validation

```bash
# Run production Lighthouse audit
npx lighthouse https://your-project.lovable.app \
  --view \
  --output json \
  --output-path ./lighthouse-production.json

# Target scores:
# Performance: > 90
# Accessibility: > 95
# Best Practices: > 90
# SEO: > 90
```

**If scores are low:**
- Check bundle size: `npm run build` and review dist/ size
- Enable lazy loading for routes (already implemented)
- Optimize images (convert to WebP, add compression)
- Enable HTTP/2 and Brotli compression (Lovable auto-enables)

### Database Health Check

```sql
-- Run in Supabase SQL Editor

-- 1. Connection pool health
SELECT COUNT(*) as active_connections
FROM pg_stat_activity
WHERE datname = current_database();
-- Should be < 20 for MVP scale

-- 2. Check for slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;
-- Should have no queries > 1 second

-- 3. Check RLS policy usage
SELECT schemaname, tablename, policyname, polcmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
-- Verify policies exist for all critical tables

-- 4. Check for failed login attempts (security)
SELECT COUNT(*) as failed_logins
FROM audit_log
WHERE action = 'LOGIN_FAILED'
  AND created_at > NOW() - INTERVAL '1 hour';
-- Should be 0 or very low
```

### User Acceptance Testing

**Investor User Flow (5 minutes):**
1. Log in with test investor account
2. View dashboard (verify data displays)
3. Navigate to portfolio
4. Check performance chart renders
5. View transactions
6. Request test withdrawal
7. Upload test document
8. Log out

**Admin User Flow (5 minutes):**
1. Log in with admin account
2. View admin dashboard
3. Access investor management
4. View monthly operations
5. Generate test statement
6. Check system settings
7. Review audit logs
8. Log out

**Success Criteria:**
- All flows complete without errors
- Data displays correctly
- Forms submit successfully
- No JavaScript errors in console
- Navigation works smoothly
- Mobile responsive

---

## 🚨 Phase 4: Rollback Plan

### When to Rollback

Trigger rollback if:
- ❌ Critical user flow completely broken
- ❌ Security vulnerability discovered
- ❌ Data loss or corruption
- ❌ Performance degradation > 50%
- ❌ Error rate > 10%

### Rollback Procedure (15 minutes)

**Option 1: Lovable Instant Rollback**
1. Go to Lovable Dashboard → Deployments
2. Find previous successful deployment
3. Click "Rollback to this version"
4. Confirm rollback
5. Wait 2-3 minutes for deployment
6. Verify rollback successful

**Option 2: Git Revert**
```bash
# 1. Revert last commit
git revert HEAD
git push origin main

# 2. Lovable auto-deploys reverted state
# Wait 5-10 minutes

# 3. Verify production working
```

**Option 3: Branch Rollback**
```bash
# 1. Create hotfix branch from last working commit
git checkout <last-working-commit>
git checkout -b hotfix/rollback
git push origin hotfix/rollback

# 2. Configure Lovable to deploy hotfix branch temporarily
# 3. Fix issue in separate branch
# 4. Merge fix and switch back to main
```

### Post-Rollback Actions

1. **Investigate root cause:**
   - Review error logs (Sentry, Supabase, Lovable)
   - Identify failing component/feature
   - Document issue in GitHub Issue

2. **Fix in development:**
   - Create fix branch
   - Test thoroughly locally
   - Deploy to staging
   - Validate fix in staging
   - Merge to main when confident

3. **Communicate:**
   - Notify users of temporary rollback (if customer-facing)
   - Update status page
   - Provide ETA for fix

---

## 📊 Phase 5: Monitoring & Optimization (Ongoing)

### Key Metrics to Monitor

**Performance Metrics:**
- Page Load Time: < 2 seconds (p95)
- Time to Interactive: < 3 seconds
- First Contentful Paint: < 1 second
- Cumulative Layout Shift: < 0.1

**Application Metrics:**
- Successful logins: Track daily
- API error rate: < 1%
- Database query time: < 100ms (p95)
- Document upload success rate: > 98%

**Business Metrics:**
- Active investors: Track daily
- Withdrawal requests: Track daily
- Statement generation success: Track monthly
- Admin operations completed: Track daily

### Monitoring Tools

**1. Sentry (Error Tracking)**
```javascript
// Already configured in src/lib/sentry.ts
// Monitor dashboard at: https://sentry.io/organizations/your-org/projects/
```

**2. PostHog (Analytics)**
```javascript
// Already configured in src/lib/posthog.ts
// Monitor dashboard at: https://app.posthog.com
```

**3. Supabase (Database & Auth)**
```
// Monitor at: https://app.supabase.com/project/nkfimvovosdehmyyjubn
- Database health
- API usage
- Auth events
- Edge function logs
```

**4. Lovable (Build & Deploy)**
```
// Monitor at: https://lovable.app/projects/your-project
- Build times
- Deployment status
- Performance metrics
- User analytics
```

### Optimization Opportunities (Phase 2)

**Performance:**
1. Implement code splitting for large pages (admin operations)
2. Add service worker for offline support
3. Optimize image loading with lazy loading and WebP
4. Enable Supabase connection pooling
5. Add Redis caching for frequently accessed data

**Features:**
1. Complete report engine implementation
2. Add PDF generation for statements
3. Implement server-side rate limiting
4. Add push notifications
5. Build mobile app (React Native or iOS Swift)

**Security:**
1. Implement 2FA for admin accounts
2. Add IP allowlisting for admin access
3. Enable audit log exports
4. Add session timeout warnings
5. Implement CAPTCHA for login

**User Experience:**
1. Add onboarding wizard for new investors
2. Implement dark mode
3. Add bulk operations for admin
4. Build investor mobile app
5. Add live chat support

---

## 📅 Deployment Timeline

### Recommended Schedule

**Day 1 (6-8 hours):**
- Morning: Apply security patches, create missing tables
- Afternoon: Configure environment variables, test edge functions
- End of day: Build verification, staging deployment

**Day 2 (4-6 hours):**
- Morning: Staging validation and testing
- Afternoon: Production deployment
- Evening: Post-deployment validation

**Day 3 (2 hours):**
- Morning: Monitor metrics, user acceptance testing
- Afternoon: Address any minor issues, optimization

**Total:** 12-16 hours over 3 days

### Fast-Track Option (1 Day - 8 Hours)

For urgent deployment:
1. ⏱️ **Hours 1-2:** Security patches + environment config
2. ⏱️ **Hours 3-4:** Missing tables + report engine stub
3. ⏱️ **Hours 5-6:** Build, deploy to staging, quick validation
4. ⏱️ **Hours 7-8:** Production deployment + smoke testing

**Risks:** Less thorough testing, may discover issues in production

---

## ✅ Final Deployment Checklist

Use this checklist on deployment day:

### Pre-Deployment
- [ ] EMERGENCY_SECURITY_PATCH.sql executed in production database
- [ ] All environment variables configured in Lovable
- [ ] Missing database tables created (email_logs, notification_settings)
- [ ] Report engine stub implemented
- [ ] Edge functions tested
- [ ] Build completes without errors
- [ ] All tests passing (if applicable)
- [ ] Code pushed to GitHub main branch

### Staging Deployment
- [ ] Staging branch created and deployed
- [ ] Staging URL accessible
- [ ] All 5 critical user flows tested in staging
- [ ] Database queries working correctly
- [ ] Mobile responsiveness verified
- [ ] Lighthouse scores acceptable (>85)
- [ ] No critical errors in Sentry
- [ ] Performance acceptable

### Production Deployment
- [ ] Staging validation passed 100%
- [ ] Production environment variables verified
- [ ] Database backup created
- [ ] Rollback plan prepared
- [ ] Stakeholders notified of deployment
- [ ] Merged to main branch
- [ ] Production deployment initiated
- [ ] Monitoring dashboards open

### Post-Deployment
- [ ] Production URL accessible
- [ ] SSL certificate valid
- [ ] Login working (investor + admin)
- [ ] Dashboard loading data correctly
- [ ] Critical flows tested end-to-end
- [ ] Error monitoring active
- [ ] Performance metrics acceptable
- [ ] Database health verified
- [ ] No security issues detected
- [ ] User acceptance testing complete

### Documentation
- [ ] Deployment notes documented
- [ ] Known issues logged
- [ ] Rollback procedure verified
- [ ] Monitoring alerts configured
- [ ] Team trained on new deployment
- [ ] User documentation updated

---

## 🎯 Success Criteria

**Deployment is successful when:**

1. ✅ **Security:** All RLS policies enabled, no exposed credentials
2. ✅ **Functionality:** 5/5 critical user flows working
3. ✅ **Performance:** Lighthouse score > 85 across all categories
4. ✅ **Stability:** Error rate < 1%, uptime > 99%
5. ✅ **User Experience:** Smooth navigation, responsive on all devices
6. ✅ **Monitoring:** All monitoring tools active and tracking

**Platform Grade After Deployment:** Expected A- (95% ready)

---

## 📞 Support & Resources

**Lovable Support:**
- Documentation: https://lovable.app/docs
- Support: support@lovable.app
- Community: https://discord.gg/lovable

**Supabase Support:**
- Documentation: https://supabase.com/docs
- Support: https://supabase.com/support
- Community: https://discord.supabase.com

**Emergency Contacts:**
- Security Issues: [Your security team contact]
- Database Issues: [Your DBA contact]
- Lovable Issues: support@lovable.app

---

## 📝 Appendix A: Environment Variable Reference

```env
# === CRITICAL (Application won't work without these) ===
VITE_SUPABASE_URL=https://nkfimvovosdehmyyjubn.supabase.co
VITE_SUPABASE_ANON_KEY=[rotate_this_key]
SUPABASE_SERVICE_ROLE_KEY=[rotate_this_key]
VITE_APP_ENV=production

# === HIGH PRIORITY (Core features need these) ===
NEXT_PUBLIC_APP_URL=https://your-domain.lovable.app
VITE_SENTRY_DSN=[your_sentry_dsn]
VITE_POSTHOG_KEY=[your_posthog_key]

# === MEDIUM PRIORITY (Features work with degraded functionality) ===
MAILERLITE_API_KEY=[your_mailerlite_key]
SMTP_HOST=[your_smtp_host]
SMTP_PORT=587
SMTP_USER=[your_smtp_user]
SMTP_PASSWORD=[your_smtp_password]

# === LOW PRIORITY (Optional features) ===
AIRTABLE_API_KEY=[optional]
AIRTABLE_BASE_ID=[optional]
SENTRY_AUTH_TOKEN=[optional]
VITE_POSTHOG_HOST=https://app.posthog.com
```

---

## 📝 Appendix B: Database Migration SQL

All necessary migrations are included in:
- `EMERGENCY_SECURITY_PATCH.sql` (security fixes)
- Phase 1, Step 3 (missing tables)

Execute in this order:
1. EMERGENCY_SECURITY_PATCH.sql
2. Missing tables SQL from Phase 1, Step 3

---

## 📝 Appendix C: Lovable Build Configuration

**lovable.json (create in project root):**
```json
{
  "name": "indigo-yield-platform",
  "framework": "react-vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "nodeVersion": "18.x",
  "environmentVariables": {
    "NODE_ENV": "production"
  },
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
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/admin-dashboard",
      "destination": "/admin",
      "permanent": true
    }
  ]
}
```

---

**Document Version:** 1.0
**Last Updated:** November 26, 2025
**Next Review:** After successful deployment
**Owner:** Development Team
**Status:** Ready for Execution 🚀
