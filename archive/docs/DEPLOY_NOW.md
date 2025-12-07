# 🚀 DEPLOY NOW - Immediate Deployment Guide

**Status:** ✅ Code committed (commit 5e5c14e)
**Ready to Deploy:** After completing 3 critical steps below
**Estimated Time:** 2.5-4 hours to production

---

## ⚠️ STOP - Complete These 3 Steps BEFORE Deploying

### Step 1: Rotate Exposed Credentials (30-60 minutes)

These credentials were exposed in git history. **Generate NEW keys:**

#### 1.1 Supabase Keys (CRITICAL)

**Generate New Keys:**
1. Go to https://app.supabase.com/project/nkfimvovosdehmyyjubn/settings/api
2. Click "Reset" on both keys:
   - **anon (public) key** → Copy new value
   - **service_role key** → Copy new value (KEEP SECRET!)
3. Delete old keys from Supabase dashboard

**Save New Keys:**
```bash
# Add to .env file (DO NOT COMMIT!)
VITE_SUPABASE_ANON_KEY="<new-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<new-service-role-key>"
```

#### 1.2 Sentry DSN (HIGH Priority)

**Create New Project:**
1. Go to https://sentry.io/
2. Create new project → Select "React"
3. Copy new DSN

**Save New DSN:**
```bash
VITE_SENTRY_DSN="<new-sentry-dsn>"
SENTRY_DSN="<new-sentry-dsn>"
```

#### 1.3 PostHog Keys (HIGH Priority)

**Create New Project:**
1. Go to https://posthog.com/
2. Create new project
3. Copy API key from Project Settings

**Save New Keys:**
```bash
VITE_POSTHOG_KEY="phc_<new-posthog-key>"
VITE_POSTHOG_HOST="https://app.posthog.com"
POSTHOG_API_KEY="<new-posthog-api-key>"
```

#### 1.4 MailerLite API Key (MEDIUM Priority)

**Generate New Key:**
1. Go to https://app.mailerlite.com/integrations/api
2. Generate new API key

**Save New Key:**
```bash
MAILERLITE_API_KEY="<new-mailerlite-key>"
```

---

### Step 2: Execute Database Security Patch (15 minutes)

**CRITICAL:** This fixes 5 security vulnerabilities (RLS, audit log, withdrawals, etc.)

#### Option A: Supabase SQL Editor (Recommended)

1. **Open SQL Editor:**
   https://app.supabase.com/project/nkfimvovosdehmyyjubn/sql

2. **Copy SQL:**
   Open `EXECUTE_IN_SUPABASE_SQL_EDITOR.sql` in your code editor
   Copy entire contents

3. **Execute:**
   - Paste into SQL Editor
   - Click "Run" button
   - Wait for completion (~2 minutes)

4. **Verify Success:**
   Look for this message in output:
   ```
   ============================================
   DEPLOYMENT PREPARATION COMPLETE
   ============================================
   ```

5. **Verify RLS Enabled:**
   Run this verification query:
   ```sql
   SELECT COUNT(*) as vulnerable_tables
   FROM pg_tables
   WHERE schemaname = 'public'
     AND NOT rowsecurity
     AND tablename NOT LIKE 'pg_%'
     AND tablename NOT LIKE '%_id_seq';
   ```

   Expected result: **0** (zero vulnerable tables)

#### Option B: Supabase CLI (Alternative)

```bash
cd /Users/mama/indigo-yield-platform-v01
supabase db push --include-all
```

If this fails with migration history error, use Option A.

---

### Step 3: Configure Lovable Environment Variables (30 minutes)

**Go to Lovable Dashboard:**
1. Open https://lovable.app
2. Navigate to your project
3. Go to Settings → Environment Variables

**Add These 10 Variables:**

#### 🔴 CRITICAL Variables (5 required)

| Variable | Value | Secret? |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | `https://nkfimvovosdehmyyjubn.supabase.co` | ❌ No |
| `VITE_SUPABASE_ANON_KEY` | `<NEW KEY from Step 1.1>` | ❌ No |
| `SUPABASE_SERVICE_ROLE_KEY` | `<NEW KEY from Step 1.1>` | ✅ **YES** |
| `VITE_APP_ENV` | `production` | ❌ No |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.lovable.app` | ❌ No |

#### 🟠 HIGH Priority Variables (5 for monitoring)

| Variable | Value | Secret? |
|----------|-------|---------|
| `VITE_SENTRY_DSN` | `<NEW DSN from Step 1.2>` | ❌ No |
| `SENTRY_DSN` | `<NEW DSN from Step 1.2>` | ❌ No |
| `VITE_POSTHOG_KEY` | `<NEW KEY from Step 1.3>` | ❌ No |
| `VITE_POSTHOG_HOST` | `https://app.posthog.com` | ❌ No |
| `POSTHOG_API_KEY` | `<NEW KEY from Step 1.3>` | ✅ **YES** |

**Important:**
- Mark variables with ✅ **YES** as "Secret" in Lovable dashboard
- Double-check all values before deploying

---

## 🚀 Deploy to Lovable (Steps 4-7)

### Step 4: Connect Repository (5 minutes)

1. **Go to Lovable Dashboard:**
   https://lovable.app

2. **Create New Project:**
   - Click "New Project"
   - Select "Import from GitHub"
   - Choose repository: `indigo-yield-platform-v01`
   - Select branch: `main`

3. **Build Settings (Auto-detected from lovable.json):**
   - Framework: `react-vite` ✅
   - Build command: `npm run build` ✅
   - Output directory: `dist` ✅
   - Install command: `npm install` ✅
   - Node version: `18.x` ✅

4. **Click "Import"**

### Step 5: Verify Configuration (2 minutes)

**Check Build Settings:**
- ✅ All 10 environment variables added
- ✅ SECRET variables marked as secret
- ✅ Build command is `npm run build`
- ✅ Output directory is `dist`

### Step 6: Deploy! (Automated, ~5-10 minutes)

1. **Click "Deploy" button**

2. **Monitor Build Logs:**
   - Watch for "Building..." status
   - Check for any errors in console
   - Wait for "Deployment Successful" message

3. **Expected Build Output:**
   ```
   ✓ 3141 modules transformed
   ✓ Build complete
   ✓ Deployment successful
   ```

4. **Get Deployment URL:**
   - Copy your Lovable URL (e.g., `https://your-project.lovable.app`)
   - This is your production URL!

### Step 7: Update App URL (5 minutes)

**After first deployment:**

1. **Get your Lovable URL** from deployment dashboard

2. **Update Environment Variable:**
   - Go to Lovable Settings → Environment Variables
   - Find `NEXT_PUBLIC_APP_URL`
   - Update value to your actual Lovable URL
   - Example: `https://indigo-yield-platform.lovable.app`

3. **Redeploy:**
   - Click "Redeploy" button
   - Wait for completion

---

## ✅ Post-Deployment Validation (Steps 8-10)

### Step 8: Test Critical User Flows (30 minutes)

**Open your deployed site:** `https://your-project.lovable.app`

#### Test 1: Authentication Flow
- [ ] Homepage loads without errors
- [ ] Login page redirects correctly
- [ ] Can login with test investor account
- [ ] Can logout successfully
- [ ] Password reset flow works

#### Test 2: Investor Dashboard
- [ ] Dashboard loads with real data
- [ ] Portfolio balances display correctly
- [ ] Transaction history visible
- [ ] Documents can be downloaded
- [ ] No console errors

#### Test 3: Admin Dashboard (Use admin account)
- [ ] Admin login works
- [ ] Monthly data entry form loads
- [ ] Statement generation works
- [ ] Withdrawal requests visible
- [ ] All admin features functional

#### Test 4: Security Headers
1. Go to https://securityheaders.com/
2. Enter your Lovable URL
3. Verify these headers present:
   - [ ] X-Frame-Options: DENY
   - [ ] X-Content-Type-Options: nosniff
   - [ ] X-XSS-Protection: 1; mode=block
   - [ ] Referrer-Policy present

### Step 9: Database Validation (10 minutes)

**Run in Supabase SQL Editor:**

**1. Verify RLS on All Tables:**
```sql
SELECT COUNT(*) as vulnerable_tables
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT rowsecurity
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE '%_id_seq';
```
Expected: **0** vulnerable tables

**2. Verify Policies Exist:**
```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'investor_emails', 'email_logs', 'onboarding_submissions',
    'fee_transactions', 'generated_statements', 'audit_log'
  )
GROUP BY tablename
ORDER BY tablename;
```
Expected: All tables have > 0 policies

**3. Check for Errors in Logs:**
```sql
SELECT * FROM audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND action LIKE '%ERROR%'
ORDER BY created_at DESC
LIMIT 20;
```
Expected: No critical errors

### Step 10: Monitoring Setup (15 minutes)

#### Sentry (Error Tracking)
1. Go to your Sentry project
2. Verify errors are being captured:
   - Check "Issues" tab
   - Should see initial page load events
3. Set up alerts:
   - Configure email alerts for critical errors
   - Set up Slack integration (optional)

#### PostHog (Analytics)
1. Go to your PostHog project
2. Verify events tracking:
   - Check "Events" tab
   - Should see pageview events
3. Set up dashboards:
   - Create user funnel (signup → first transaction)
   - Set up retention tracking

---

## 🔒 Security Post-Deployment (Steps 11-12)

### Step 11: Immediate Security Actions (Within 24 hours)

#### 11.1 Review Audit Logs
```sql
SELECT * FROM audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;
```
Look for:
- Suspicious login attempts
- Unauthorized access patterns
- Unexpected data modifications

#### 11.2 Force Password Reset (If users exist)
**Why:** Keys were exposed in git history

**Execute:**
1. Send password reset emails to all users
2. Invalidate old sessions
3. Require re-authentication

**Email Template:**
```
Subject: Important Security Update - Password Reset Required

Dear Indigo Yield Platform User,

As part of a security enhancement, we've rotated our API keys and
require all users to reset their passwords.

Please click here to reset your password: [Reset Link]

This is a one-time requirement. Thank you for your understanding.

Best regards,
Indigo Yield Platform Team
```

#### 11.3 Enable 2FA for Admins
1. Go to Supabase Auth settings
2. Enable TOTP (Time-based One-Time Password)
3. Require for all admin accounts

#### 11.4 Verify Old Keys Deleted
- [ ] Old Supabase keys deleted from dashboard
- [ ] Old Sentry project archived
- [ ] Old PostHog project archived
- [ ] Old MailerLite key revoked

### Step 12: Ongoing Security (Next 30 days)

#### Week 1: Monitor Closely
- [ ] Check audit logs daily
- [ ] Monitor Sentry for errors
- [ ] Watch for unusual traffic patterns
- [ ] Review PostHog user behavior

#### Week 2: Performance Optimization
- [ ] Run Lighthouse audit
- [ ] Check Core Web Vitals
- [ ] Optimize slow queries
- [ ] Review bundle sizes

#### Week 3: Penetration Testing
- [ ] Schedule pen test with security firm
- [ ] Focus on OWASP Top 10
- [ ] Test RLS policies with non-admin accounts
- [ ] Validate input sanitization

#### Week 4: Documentation & Training
- [ ] Update internal documentation
- [ ] Train admin users on new features
- [ ] Create user guides
- [ ] Plan Phase 2 features

---

## 📊 Success Metrics

**Track These KPIs:**

### Performance (Target: >90)
- [ ] Lighthouse Performance Score: ____
- [ ] Lighthouse Accessibility Score: ____
- [ ] Lighthouse Best Practices Score: ____
- [ ] Lighthouse SEO Score: ____

### Core Web Vitals
- [ ] LCP (Largest Contentful Paint): ____ (target < 2.5s)
- [ ] FID (First Input Delay): ____ (target < 100ms)
- [ ] CLS (Cumulative Layout Shift): ____ (target < 0.1)

### Error Rate
- [ ] Sentry Error Rate: ____ (target < 0.1%)
- [ ] API Error Rate: ____ (target < 1%)

### User Engagement
- [ ] PostHog Active Users (Week 1): ____
- [ ] Average Session Duration: ____
- [ ] Bounce Rate: ____ (target < 40%)

---

## 🆘 Troubleshooting

### Issue: Build Fails on Lovable

**Check:**
1. All environment variables added correctly
2. Node version is 18.x
3. Build command is `npm run build`
4. No syntax errors in recent commits

**Solution:**
```bash
# Test build locally first
npm install
npm run build

# If successful locally, check Lovable build logs
```

### Issue: Database Connection Errors

**Check:**
1. `VITE_SUPABASE_URL` is correct
2. `VITE_SUPABASE_ANON_KEY` is the NEW key
3. Supabase project is active (not paused)

**Solution:**
- Verify keys in Lovable environment variables
- Check Supabase project status
- Review network logs in browser console

### Issue: 500 Internal Server Error

**Check:**
1. `SUPABASE_SERVICE_ROLE_KEY` is marked as SECRET
2. Database security patch was applied
3. RLS policies are active

**Solution:**
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Issue: Features Not Working

**Check:**
1. Feature flags in `src/config/features.ts`
2. Phase 2 features should be disabled
3. No JavaScript console errors

**Solution:**
- Verify feature flag settings
- Check browser console for errors
- Review Sentry error logs

---

## 📞 Emergency Contacts

**Deployment Issues:**
- Lovable Support: https://lovable.app/support
- Lovable Documentation: https://docs.lovable.app

**Database Issues:**
- Supabase Support: https://supabase.com/dashboard/support
- Supabase Status: https://status.supabase.com

**Security Incidents:**
- Incident Response Email: [Configure]
- On-Call Engineer: [Configure]

---

## ✅ Deployment Checklist

**Pre-Deployment (Steps 1-3):**
- [ ] Step 1: Rotated all exposed credentials ✅
- [ ] Step 2: Executed database security patch ✅
- [ ] Step 3: Configured Lovable environment variables ✅

**Deployment (Steps 4-7):**
- [ ] Step 4: Connected repository to Lovable ✅
- [ ] Step 5: Verified configuration ✅
- [ ] Step 6: Deployed to Lovable ✅
- [ ] Step 7: Updated app URL ✅

**Validation (Steps 8-10):**
- [ ] Step 8: Tested critical user flows ✅
- [ ] Step 9: Validated database security ✅
- [ ] Step 10: Set up monitoring ✅

**Security (Steps 11-12):**
- [ ] Step 11: Completed immediate security actions ✅
- [ ] Step 12: Scheduled ongoing security tasks ✅

---

## 🎉 You're Live!

**Congratulations!** 🚀

Your Indigo Yield Platform is now deployed to production at:
**https://your-project.lovable.app**

**Next Steps:**
1. Announce launch to users
2. Monitor closely for 24 hours
3. Schedule Phase 2 planning meeting
4. Celebrate the successful deployment! 🎊

---

**Deployment Guide Created:** November 26, 2025
**Platform Version:** 1.0.0 MVP
**Deployment Readiness:** 85% (B+ Grade)
**Phase 1 Features:** 100% Complete

**Good luck with your launch! 🚀**
