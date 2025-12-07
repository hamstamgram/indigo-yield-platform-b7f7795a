# Lovable Environment Variables - Deployment Reference

## Overview

This reference document maps the 10 required environment variables for Indigo Yield Platform deployment to Lovable.

Generated: 2025-11-26

---

## Environment Variables Summary

### Critical Variables (5)

```
1. VITE_SUPABASE_URL
   ├─ Type: Public (Non-secret)
   ├─ Priority: CRITICAL
   ├─ Value: https://nkfimvovosdehmyyjubn.supabase.co
   ├─ Environment: dev, staging, production
   ├─ Required: YES
   └─ Notes: Base URL for all Supabase API calls

2. VITE_SUPABASE_ANON_KEY
   ├─ Type: Public (but rotate!)
   ├─ Priority: CRITICAL
   ├─ Value: PLACEHOLDER_NEW_ANON_KEY (rotate before deploy!)
   ├─ Environment: dev, staging, production
   ├─ Required: YES
   ├─ Min Length: 140 characters
   ├─ Rotate: YES - REQUIRED before production
   └─ Notes: Client-side Supabase key. Used in browser.

3. SUPABASE_SERVICE_ROLE_KEY
   ├─ Type: SECRET (mark in Lovable dashboard)
   ├─ Priority: CRITICAL
   ├─ Value: PLACEHOLDER_NEW_SERVICE_ROLE_KEY (rotate before deploy!)
   ├─ Environment: staging, production only
   ├─ Required: YES
   ├─ Min Length: 140 characters
   ├─ Rotate: YES - REQUIRED before production
   └─ Notes: Server-side key with full permissions. NEVER expose to client.

4. VITE_APP_ENV
   ├─ Type: Public (Non-secret)
   ├─ Priority: CRITICAL
   ├─ Value: "production"
   ├─ Environment: dev, staging, production
   ├─ Required: YES
   ├─ Allowed Values: ["development", "staging", "production"]
   └─ Notes: Controls feature flags and error reporting levels

5. NEXT_PUBLIC_APP_URL
   ├─ Type: Public (Non-secret)
   ├─ Priority: CRITICAL
   ├─ Value: https://your-project.lovable.app (UPDATE after first deploy!)
   ├─ Environment: production
   ├─ Required: YES
   ├─ Update After Deploy: YES
   └─ Notes: Will be provided by Lovable after first deployment
```

### Monitoring Variables (5)

```
6. VITE_SENTRY_DSN
   ├─ Type: Public (but rotate!)
   ├─ Priority: HIGH
   ├─ Value: PLACEHOLDER_NEW_SENTRY_DSN (rotate before deploy!)
   ├─ Environment: staging, production
   ├─ Required: YES
   ├─ Rotate: YES - REQUIRED before production
   ├─ Format: https://[key]@o[org].ingest.sentry.io/[project]
   └─ Notes: Frontend error tracking

7. SENTRY_DSN
   ├─ Type: Public (but rotate!)
   ├─ Priority: HIGH
   ├─ Value: PLACEHOLDER_NEW_SENTRY_DSN (rotate before deploy!)
   ├─ Environment: staging, production
   ├─ Required: YES
   ├─ Rotate: YES - REQUIRED before production
   ├─ Format: https://[key]@o[org].ingest.sentry.io/[project]
   └─ Notes: Backend error tracking

8. VITE_POSTHOG_KEY
   ├─ Type: Public (but rotate!)
   ├─ Priority: HIGH
   ├─ Value: PLACEHOLDER_NEW_POSTHOG_KEY (rotate before deploy!)
   ├─ Environment: dev, staging, production
   ├─ Required: YES
   ├─ Min Length: 32 characters
   ├─ Rotate: YES - REQUIRED before production
   └─ Notes: Frontend analytics

9. VITE_POSTHOG_HOST
   ├─ Type: Public (Non-secret)
   ├─ Priority: HIGH
   ├─ Value: https://app.posthog.com
   ├─ Environment: dev, staging, production
   ├─ Required: YES
   ├─ Update if Self-Hosted: YES
   └─ Notes: Analytics API endpoint

10. POSTHOG_API_KEY
    ├─ Type: SECRET (mark in Lovable dashboard)
    ├─ Priority: HIGH
    ├─ Value: PLACEHOLDER_NEW_POSTHOG_API_KEY (rotate before deploy!)
    ├─ Environment: staging, production
    ├─ Required: YES
    ├─ Min Length: 32 characters
    ├─ Rotate: YES - REQUIRED before production
    └─ Notes: Backend analytics key. Keep secret.
```

---

## Deployment Sequence

### Phase 1: Pre-Deployment (Local)
1. Review this guide and config/lovable-env-vars.json
2. Generate NEW credentials from Supabase, Sentry, PostHog
3. Update config/lovable-env-vars.json with new values
4. Remove all PLACEHOLDER_ prefixes
5. Verify JSON is valid

### Phase 2: Lovable Dashboard
1. Open Lovable Project Settings
2. Navigate to Environment Variables section
3. Add variables in this order:
   - First: Critical variables (1-5)
   - Then: Monitoring variables (6-10)
4. For each SECRET variable, enable secret toggle:
   - SUPABASE_SERVICE_ROLE_KEY
   - POSTHOG_API_KEY

### Phase 3: Deployment
1. Trigger deployment from Lovable dashboard
2. Monitor deployment logs
3. Check for any env var validation errors
4. Verify app loads successfully

### Phase 4: Post-Deployment
1. Note the actual Lovable URL (e.g., https://indigo-yield-platform.lovable.app)
2. Update NEXT_PUBLIC_APP_URL in Lovable dashboard
3. Update NEXT_PUBLIC_APP_URL in config/lovable-env-vars.json
4. Trigger redeploy

### Phase 5: Verification
1. Open deployed app in browser
2. Check browser console for errors
3. Verify no 401/403 auth errors
4. Test error tracking (Sentry)
5. Monitor analytics (PostHog)

---

## Critical Secrets to Mark

In Lovable dashboard, enable "Secret" toggle for:

1. SUPABASE_SERVICE_ROLE_KEY
   - This masks value in logs
   - Prevents accidental exposure
   - Critical for security

2. POSTHOG_API_KEY
   - This masks value in logs
   - Prevents accidental exposure
   - Should not be in client code

---

## Pre-Deployment Validation

Before clicking "Deploy" in Lovable, complete this checklist:

- [ ] All 10 variables added to Lovable dashboard
- [ ] All PLACEHOLDER_ values replaced with real credentials
- [ ] SUPABASE_SERVICE_ROLE_KEY marked as SECRET
- [ ] POSTHOG_API_KEY marked as SECRET
- [ ] VITE_SUPABASE_URL is correct (nkfimvovosdehmyyjubn.supabase.co)
- [ ] VITE_APP_ENV set to "production"
- [ ] NEXT_PUBLIC_APP_URL set to placeholder (will update after first deploy)
- [ ] No trailing spaces in any values
- [ ] No extra newlines in multi-line values
- [ ] Config file not committed to git

---

## Value Sources

Where to find each credential:

### Supabase
- Dashboard: https://app.supabase.com
- Project: Indigo Yield Platform
- Settings > API
  - `VITE_SUPABASE_URL`: Project URL
  - `VITE_SUPABASE_ANON_KEY`: Anon Key (from Project API keys)
  - `SUPABASE_SERVICE_ROLE_KEY`: Service Role (from Project API keys)

### Sentry
- Dashboard: https://sentry.io
- Project: indigo-yield-platform (or your project name)
- Settings > Client Keys (DSN)
  - `VITE_SENTRY_DSN`: Frontend DSN
  - `SENTRY_DSN`: Backend DSN (use same DSN for both)

### PostHog
- Dashboard: https://app.posthog.com
- Project Settings
  - `VITE_POSTHOG_KEY`: Project API Key
  - `POSTHOG_API_KEY`: Personal API Key (from Account Settings)
  - `VITE_POSTHOG_HOST`: https://app.posthog.com (or self-hosted URL)

---

## Common Issues & Solutions

### Issue: App won't load (401/403)
**Solution:** 
- Verify VITE_SUPABASE_ANON_KEY is correct
- Check no extra spaces when copied
- Regenerate key in Supabase if needed
- Redeploy Lovable

### Issue: Errors not appearing in Sentry
**Solution:**
- Verify Sentry DSN format (should start with https://)
- Check Sentry project is active
- Verify organization ID is correct in DSN
- Check Sentry rate limits not exceeded

### Issue: Analytics not working in PostHog
**Solution:**
- Verify PostHog key matches your project
- Check PostHog host is reachable
- Open Network tab in browser to see if requests are made
- Verify PostHog project API key is correct (POSTHOG_API_KEY)

### Issue: Deployment fails with env var errors
**Solution:**
- Check no PLACEHOLDER_ values remain
- Verify no trailing spaces in values
- Check JSON is valid: python3 -m json.tool config/lovable-env-vars.json
- Verify Lovable environment variables section shows all 10 variables

---

## Security Checklist

Before production deployment:

- [ ] All credentials rotated (not reused from other environments)
- [ ] Old credentials marked for retirement
- [ ] Service role key never exposed in browser
- [ ] PostHog API key never exposed in browser
- [ ] Config file added to .gitignore
- [ ] No credentials in git history
- [ ] Secret variables marked in Lovable dashboard
- [ ] IP whitelisting enabled (if available in Supabase/Sentry/PostHog)
- [ ] Regular rotation plan established (quarterly minimum)
- [ ] Audit trail documented for compliance

---

## File Locations

- **Main Config:** `/config/lovable-env-vars.json`
- **Quick Start:** `/LOVABLE_ENV_VARS_QUICK_START.md`
- **This Guide:** `/LOVABLE_ENV_DEPLOYMENT_REFERENCE.md`

---

## Next Steps

1. Open `config/lovable-env-vars.json` in text editor
2. Replace all PLACEHOLDER_ values with real credentials
3. Verify no PLACEHOLDER_ strings remain
4. Log into Lovable dashboard
5. Go to Project Settings > Environment Variables
6. Add all 10 variables from the config file
7. Mark secrets as SECRET (toggle in Lovable)
8. Deploy and verify

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-26  
**Platform:** Indigo Yield Platform  
**Deployment Target:** Lovable
