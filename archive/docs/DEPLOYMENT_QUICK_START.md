# 🚀 Quick Start: Deploy to Lovable in 3 Steps

**Time:** 2.5-4 hours | **Status:** Ready | **Commit:** 5e5c14e ✅

---

## ⚡ Fast Track Deployment

### Step 1: Rotate Credentials (30-60 min) ⚠️ CRITICAL

**Supabase Keys:**
```
1. https://app.supabase.com/project/nkfimvovosdehmyyjubn/settings/api
2. Reset anon key → Copy
3. Reset service_role key → Copy (keep secret!)
```

**Monitoring Keys:**
```
Sentry: Create new project → Copy DSN
PostHog: Create new project → Copy API key
```

### Step 2: Database Patch (15 min) ⚠️ CRITICAL

```
1. Open: https://app.supabase.com/project/nkfimvovosdehmyyjubn/sql
2. Copy entire contents of: EXECUTE_IN_SUPABASE_SQL_EDITOR.sql
3. Paste → Run → Wait for "DEPLOYMENT PREPARATION COMPLETE"
```

### Step 3: Lovable Deploy (30 min)

**Add Environment Variables:**
```bash
# Go to Lovable Dashboard → Environment Variables

CRITICAL (5 vars):
✓ VITE_SUPABASE_URL = https://nkfimvovosdehmyyjubn.supabase.co
✓ VITE_SUPABASE_ANON_KEY = <NEW KEY from Step 1>
✓ SUPABASE_SERVICE_ROLE_KEY = <NEW KEY from Step 1> [SECRET ✅]
✓ VITE_APP_ENV = production
✓ NEXT_PUBLIC_APP_URL = https://your-project.lovable.app

MONITORING (5 vars):
✓ VITE_SENTRY_DSN = <NEW DSN from Step 1>
✓ SENTRY_DSN = <NEW DSN from Step 1>
✓ VITE_POSTHOG_KEY = <NEW KEY from Step 1>
✓ VITE_POSTHOG_HOST = https://app.posthog.com
✓ POSTHOG_API_KEY = <NEW KEY from Step 1> [SECRET ✅]
```

**Deploy:**
```
1. Lovable Dashboard → New Project → Import from GitHub
2. Select: indigo-yield-platform-v01 (main branch)
3. Build settings auto-detect from lovable.json ✅
4. Click Deploy → Wait 5-10 min
5. Update NEXT_PUBLIC_APP_URL with actual URL
6. Redeploy
```

---

## ✅ Post-Deployment Checklist (1 hour)

**Test Critical Flows:**
- [ ] Login works
- [ ] Investor dashboard loads
- [ ] Admin dashboard works
- [ ] No console errors

**Verify Security:**
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) FROM pg_tables
WHERE schemaname = 'public'
  AND NOT rowsecurity;
-- Should return 0
```

**Monitor:**
- [ ] Sentry capturing errors
- [ ] PostHog tracking events
- [ ] No 500 errors in logs

---

## 📚 Full Documentation

**Detailed Guide:** DEPLOY_NOW.md (complete 12-step guide)
**Deployment Checklist:** DEPLOYMENT_CHECKLIST.md (18 steps)
**Session Summary:** DEPLOYMENT_PREPARATION_SUMMARY.md

---

## 🆘 Quick Troubleshooting

**Build fails?**
→ Check all 10 env vars added correctly

**Database errors?**
→ Verify security patch executed successfully

**500 errors?**
→ Check SUPABASE_SERVICE_ROLE_KEY marked as SECRET

---

**Ready?** Start with Step 1 above or see DEPLOY_NOW.md for full guide.

**Time to Production:** ~2.5-4 hours after credential rotation.

🚀 **Let's deploy!**
