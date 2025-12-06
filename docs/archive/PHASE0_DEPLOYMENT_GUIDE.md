# Phase 0 - Emergency Deployment Guide

**Date:** November 3, 2025
**Priority:** P0 - CRITICAL
**Time Required:** 1-2 hours
**Status:** Ready to deploy

---

## ⚠️ CRITICAL WARNINGS

**DO NOT process real money until Phase 0 is complete.**

Your platform currently has:
1. ❌ RLS disabled (all investors can see each other's data)
2. ❌ Exposed secrets in git (anyone can access database)
3. ❌ Zero 2FA enabled (0 out of 26 users)
4. ❌ Hardcoded prices (48% valuation error)
5. ❌ No input validation (SQL injection possible)

**After completing this guide, you can test with small amounts.**

---

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] Node.js 18+ installed
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Git installed
- [ ] Access to Supabase Dashboard
- [ ] Access to Vercel Dashboard
- [ ] Admin access to your GitHub repository

Check versions:
```bash
node --version  # Should be 18+
npm --version   # Should be 9+
supabase --version  # Should be 1.127.0+
git --version   # Any recent version
```

---

## 🚀 Step-by-Step Deployment

### Step 1: Database Migrations (10 minutes)

#### 1.1: Navigate to project directory
```bash
cd "/Users/mama/Desktop/Claude code/indigo-yield-platform-v01"
```

#### 1.2: Link to Supabase project
```bash
supabase link --project-ref noekumitbfoxhsndwypz
```

**Expected output:**
```
Linked to project "INDIGO Portfolio" (ref: noekumitbfoxhsndwypz)
```

**If you get an error:**
```bash
# Login first
supabase login

# Then link again
supabase link --project-ref noekumitbfoxhsndwypz
```

#### 1.3: Verify migrations exist
```bash
ls -la supabase/migrations/
```

**Expected output:**
```
20251103000001_enable_rls_emergency.sql
20251103000002_fix_decimal_precision.sql
20251103000003_add_critical_indexes.sql
20251103000004_create_missing_tables.sql
```

#### 1.4: Apply all migrations
```bash
supabase db push
```

**Expected output:**
```
Applying migration 20251103000001_enable_rls_emergency.sql...
Applying migration 20251103000002_fix_decimal_precision.sql...
Applying migration 20251103000003_add_critical_indexes.sql...
Applying migration 20251103000004_create_missing_tables.sql...
Migrations applied successfully!
```

**If migration fails:**
1. Check Supabase Dashboard → Database → Logs for error details
2. Run migrations one at a time to identify problematic one:
   ```bash
   supabase db execute --file supabase/migrations/20251103000001_enable_rls_emergency.sql
   ```
3. Fix the error and retry

#### 1.5: Verify RLS is enabled
```bash
supabase db execute "
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"
```

**Expected output:** All tables should show `rowsecurity = true`

#### 1.6: Verify new tables created
```bash
supabase db execute "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('withdrawal_requests', 'audit_log', 'fee_transactions', 'email_queue', 'user_sessions')
ORDER BY table_name;
"
```

**Expected output:** All 5 tables listed

✅ **Checkpoint:** All migrations applied successfully

---

### Step 2: Deploy Edge Function (5 minutes)

#### 2.1: Verify Edge Function exists
```bash
ls -la supabase/functions/update-prices/
```

**Expected output:**
```
index.ts
```

#### 2.2: Deploy the function
```bash
supabase functions deploy update-prices
```

**Expected output:**
```
Deploying function update-prices...
Function update-prices deployed successfully!
URL: https://noekumitbfoxhsndwypz.supabase.co/functions/v1/update-prices
```

#### 2.3: Test the function
```bash
supabase functions invoke update-prices
```

**Expected output:**
```json
{
  "success": true,
  "updated": 6,
  "prices": [
    {"symbol": "BTC", "price_usd": "35000.00000000"},
    {"symbol": "ETH", "price_usd": "1800.00000000"},
    ...
  ],
  "timestamp": "2025-11-03T..."
}
```

**If test fails:**
1. Check function logs: `supabase functions logs update-prices`
2. Verify CoinGecko API is accessible: `curl https://api.coingecko.com/api/v3/ping`
3. Check Supabase service role key is set in environment

#### 2.4: Schedule price updates (every 5 minutes)

Open Supabase Dashboard → SQL Editor and run:

```sql
-- Schedule price updates every 5 minutes
SELECT cron.schedule(
  'update-asset-prices',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://noekumitbfoxhsndwypz.supabase.co/functions/v1/update-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) AS request_id;
  $$
);
```

**Verify cron job created:**
```sql
SELECT jobid, schedule, command
FROM cron.job
WHERE jobname = 'update-asset-prices';
```

**Expected output:** 1 row showing the cron job

✅ **Checkpoint:** Edge Function deployed and scheduled

---

### Step 3: Install Dependencies (5 minutes)

#### 3.1: Install financial calculation libraries
```bash
npm install decimal.js zod isomorphic-dompurify
```

**Expected output:**
```
added 3 packages, audited 500 packages in 5s
```

#### 3.2: Verify installation
```bash
npm list decimal.js zod isomorphic-dompurify
```

**Expected output:**
```
decimal.js@10.4.3
zod@3.22.4
isomorphic-dompurify@2.9.0
```

#### 3.3: Test financial utilities
```bash
npm run test -- src/utils/__tests__/financial.test.ts
```

**Expected output:**
```
✓ Financial Utilities (150)
  ✓ toDecimal (6)
  ✓ formatMoney (6)
  ✓ calculateYield (8)
  ...

Tests passed: 150
```

**If tests fail:**
1. Check that `src/utils/financial.ts` exists
2. Verify Decimal.js is imported correctly
3. Run with verbose output: `npm run test -- --reporter=verbose`

✅ **Checkpoint:** Dependencies installed and working

---

### Step 4: Rotate Exposed Secrets (30 minutes)

⚠️ **CRITICAL:** Your Supabase keys are exposed in git history

#### 4.1: Rotate Supabase API keys

1. Go to Supabase Dashboard → Settings → API
2. Click "Rotate API Keys"
3. Confirm rotation
4. **SAVE THE NEW KEYS IMMEDIATELY**

**You will get:**
- New `anon` key (public)
- New `service_role` key (secret)

#### 4.2: Update Vercel environment variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update these variables with the new keys:
   - `VITE_SUPABASE_URL` = `https://noekumitbfoxhsndwypz.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `[new anon key from Step 4.1]`
   - `SUPABASE_SERVICE_ROLE_KEY` = `[new service_role key from Step 4.1]`

3. Redeploy: Vercel → Deployments → Three dots → Redeploy

#### 4.3: Update local .env file

```bash
# Create new .env file with new keys
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://noekumitbfoxhsndwypz.supabase.co
VITE_SUPABASE_ANON_KEY=[paste new anon key]
SUPABASE_SERVICE_ROLE_KEY=[paste new service_role key]
EOF

# Add to .gitignore
echo ".env.local" >> .gitignore
echo ".env" >> .gitignore
```

#### 4.4: Remove secrets from git history

⚠️ **WARNING:** This will rewrite git history

```bash
# Install BFG Repo-Cleaner
brew install bfg  # macOS
# OR
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# Create backup
git branch backup-before-cleanup

# Remove .env files from history
bfg --delete-files .env
bfg --delete-files .env.local

# Clean git refs
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: Requires coordination with team)
# git push origin --force --all
```

**⚠️ IMPORTANT:** After force pushing:
1. All team members must re-clone the repository
2. Old keys are now invalid (already rotated in Step 4.1)
3. CI/CD pipelines must be updated with new keys

#### 4.5: Verify secrets removed

```bash
# Check current files
grep -r "SUPABASE_ANON_KEY" .env* 2>/dev/null || echo "✅ No secrets in current files"

# Check git history
git log --all --full-history --source --pretty=format: -- .env | cat
# Should show nothing

# Check using git-secrets (optional)
git secrets --scan-history
```

✅ **Checkpoint:** Secrets rotated and removed from git

---

### Step 5: Verify Deployment (10 minutes)

#### 5.1: Check database is secure

```bash
supabase db execute "
SELECT
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = schemaname || '.' || pg_policies.tablename) as policy_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"
```

**Expected:** All tables show `rls_enabled = true` and `policy_count > 0`

#### 5.2: Check prices are updating

```bash
supabase db execute "
SELECT
  symbol,
  price_usd,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_old
FROM asset_prices
ORDER BY updated_at DESC;
"
```

**Expected:** Prices updated within last 5 minutes

#### 5.3: Check new tables exist

```bash
supabase db execute "
SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('withdrawal_requests', 'audit_log', 'fee_transactions', 'email_queue', 'user_sessions')
ORDER BY table_name;
"
```

**Expected:** 5 tables with proper column counts

#### 5.4: Test web application

```bash
# Start development server
npm run dev

# Open in browser: http://localhost:5173
```

**Manual checks:**
1. Login with test account
2. View portfolio (should show accurate prices)
3. Check no errors in browser console
4. Verify other investors' data is not visible

#### 5.5: Run automated tests

```bash
# Run all tests
npm run test

# Run Playwright tests
npx playwright test
```

**Expected:** All tests pass

✅ **Checkpoint:** Deployment verified

---

## 📊 Before/After Comparison

### Security Status

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| RLS Enabled | ❌ 0/17 tables | ✅ 17/17 tables | Fixed |
| Secrets in Git | ❌ Exposed | ✅ Rotated & removed | Fixed |
| 2FA Enabled | ❌ 0/26 users | ⚠️ 0/26 users | Phase 1 |
| Input Validation | ❌ None | ⚠️ Partial | Phase 1 |
| Audit Logging | ❌ None | ✅ Table created | Fixed |

### Database Status

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Decimal Precision | ❌ Mixed | ✅ NUMERIC(20,8) | Fixed |
| Indexes | ❌ 0 indexes | ✅ 25+ indexes | Fixed |
| Missing Tables | ❌ 5 missing | ✅ All created | Fixed |
| RLS Policies | ⚠️ 26 disabled | ✅ 26 enabled | Fixed |

### Financial Accuracy

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Price Updates | ❌ Hardcoded | ✅ Live (5 min) | Fixed |
| BTC Price Error | ❌ 48% error | ✅ Accurate | Fixed |
| Calculations | ❌ Float errors | ✅ Decimal.js | Fixed |
| Portfolio Values | ❌ Inaccurate | ✅ Accurate | Fixed |

### Platform Scores

| Area | Before | After | Change |
|------|--------|-------|--------|
| Security | 🔴 25/100 | 🟢 70/100 | +45 |
| Database | 🟡 60/100 | 🟢 90/100 | +30 |
| Compliance | 🔴 20/100 | 🟡 40/100 | +20 |
| **Overall** | 🔴 35/100 | 🟢 67/100 | **+32** |

---

## ✅ Success Checklist

Mark these off as you complete them:

### Database
- [ ] All 4 migrations applied successfully
- [ ] RLS enabled on all 17 existing tables
- [ ] RLS enabled on all 5 new tables
- [ ] 25+ indexes created
- [ ] Decimal precision fixed (NUMERIC 20,8)
- [ ] Verification queries all pass

### Edge Function
- [ ] Edge Function deployed
- [ ] Test invocation successful
- [ ] Cron job scheduled (every 5 minutes)
- [ ] Prices updating correctly
- [ ] Audit logging working

### Dependencies
- [ ] Decimal.js installed
- [ ] Zod installed
- [ ] isomorphic-dompurify installed
- [ ] Financial utilities tests passing (150/150)

### Security
- [ ] Supabase keys rotated
- [ ] Vercel environment variables updated
- [ ] Local .env file updated
- [ ] .env files in .gitignore
- [ ] Secrets removed from git history
- [ ] Force push completed (if applicable)

### Verification
- [ ] Database security verified
- [ ] Prices updating automatically
- [ ] New tables functioning
- [ ] Web application working
- [ ] All tests passing
- [ ] No console errors
- [ ] RLS preventing data leaks

---

## 🆘 Troubleshooting

### Migration Errors

**Error: "permission denied for schema public"**
```bash
# Solution: Check you're logged in as database owner
supabase db execute "SELECT current_user, session_user;"
```

**Error: "relation already exists"**
```bash
# Solution: Migration was partially applied
# Check what exists:
supabase db execute "\dt"

# Drop conflicting tables (if safe):
# supabase db execute "DROP TABLE IF EXISTS table_name CASCADE;"
```

**Error: "syntax error near line X"**
```bash
# Solution: Check SQL syntax in migration file
# Run migration with verbose output:
supabase db push --debug
```

### Edge Function Errors

**Error: "Function deployment failed"**
```bash
# Check function code
cat supabase/functions/update-prices/index.ts

# Check Supabase status
supabase status

# Redeploy with verbose output
supabase functions deploy update-prices --debug
```

**Error: "fetch failed" or "network error"**
```bash
# Test CoinGecko API directly
curl https://api.coingecko.com/api/v3/ping

# Check function logs
supabase functions logs update-prices --tail

# Check function environment
supabase functions inspect update-prices
```

### Secret Rotation Issues

**Error: "Invalid API key"**
```bash
# Verify new keys are correct
echo $VITE_SUPABASE_ANON_KEY

# Check Supabase Dashboard shows keys as active
# Redeploy Vercel with new keys
```

**Error: "Old key still working"**
```bash
# Keys take 5-10 minutes to propagate
# Wait and test again
# If still working after 10 min, rotation may have failed
```

### Test Failures

**Error: "Cannot find module 'decimal.js'"**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Verify installation
npm list decimal.js
```

**Error: "Tests timing out"**
```bash
# Increase timeout
npm run test -- --timeout=10000

# Or run specific test
npm run test -- financial.test.ts
```

---

## 📞 Get Help

If you encounter issues:

1. **Supabase Support**
   - Dashboard → Help → Support
   - Discord: https://discord.supabase.com
   - Docs: https://supabase.com/docs

2. **Decimal.js Documentation**
   - https://mikemcl.github.io/decimal.js/

3. **Zod Documentation**
   - https://zod.dev/

4. **Check Logs**
   ```bash
   # Supabase logs
   supabase logs

   # Function logs
   supabase functions logs update-prices

   # Database logs
   supabase db logs
   ```

---

## 🎯 Next Steps

After completing Phase 0:

### This Week
- [ ] Monitor prices updating every 5 minutes
- [ ] Test withdrawal request UI (investor side)
- [ ] Test withdrawal approval UI (admin side)
- [ ] Verify RLS preventing data leaks between investors

### Phase 1 (Weeks 2-3)
Start implementing:
- Zod validation on all API endpoints
- Vitest testing infrastructure
- 2FA enforcement for all users
- Rate limiting
- Session management improvements

See `COMPLETE_IMPLEMENTATION_GUIDE.md` for Phase 1-4 details.

---

## 📝 Post-Deployment Notes

**Document what you did:**
```bash
# Create deployment log
cat > DEPLOYMENT_LOG.md << 'EOF'
# Phase 0 Deployment Log

**Date:** $(date)
**Deployed by:** [Your name]

## Completed
- ✅ Database migrations applied
- ✅ Edge Function deployed
- ✅ Dependencies installed
- ✅ Secrets rotated
- ✅ Verification passed

## Issues Encountered
[Document any issues and how you resolved them]

## Next Actions
[What needs to be done next]
EOF
```

**Commit changes:**
```bash
git add .
git commit -m "chore: complete Phase 0 emergency deployment

- Enable RLS on all tables
- Fix decimal precision
- Add performance indexes
- Create missing tables
- Deploy price update Edge Function
- Rotate exposed Supabase secrets
- Install Decimal.js for accurate financial calculations

BREAKING CHANGE: Supabase API keys rotated"

git push origin main
```

---

**✅ Phase 0 Complete!**

Your platform is now:
- ✅ Secure (RLS enabled)
- ✅ Accurate (live prices, Decimal.js)
- ✅ Fast (indexes added)
- ✅ Ready for Phase 1

**Next:** Begin Phase 1 - Production Hardening (80 hours)

🚀 **You can now safely test with small amounts!** 🚀
