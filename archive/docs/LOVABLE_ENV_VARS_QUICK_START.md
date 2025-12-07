# Lovable Environment Variables - Quick Start Guide

## Summary
Configuration file created: `/config/lovable-env-vars.json`

Complete JSON structure with all 10 required environment variables for Indigo Yield Platform deployment on Lovable.

---

## Quick Deployment Checklist

### Step 1: Rotate Credentials (REQUIRED)
Before ANY production deployment, you MUST rotate these credentials:

1. **Supabase:**
   - [ ] Generate NEW `VITE_SUPABASE_ANON_KEY` from Supabase dashboard
   - [ ] Generate NEW `SUPABASE_SERVICE_ROLE_KEY` from Supabase dashboard
   - Note: Keep old keys for rollback (retire after 24h verification)

2. **Sentry:**
   - [ ] Create NEW project or rotate keys in Sentry settings
   - [ ] Generate NEW `VITE_SENTRY_DSN` (frontend)
   - [ ] Generate NEW `SENTRY_DSN` (backend)

3. **PostHog:**
   - [ ] Generate NEW `VITE_POSTHOG_KEY` (frontend)
   - [ ] Generate NEW `POSTHOG_API_KEY` (backend)
   - Note: Verify PostHog project is active

### Step 2: Update Configuration File
Replace all `PLACEHOLDER_*` values with actual credentials in `config/lovable-env-vars.json`

Command to verify all placeholders are gone:
```bash
grep -r 'PLACEHOLDER' config/lovable-env-vars.json
# Should return NOTHING (no output)
```

### Step 3: Add to Lovable Dashboard
1. Go to **Lovable Project Settings** → **Environment Variables**
2. Add all 12 variables from the config file
3. For each variable, copy the exact value from `config/lovable-env-vars.json`
4. Mark these as SECRET in Lovable (use secret toggle):
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `POSTHOG_API_KEY`
   - `VITE_AIRTABLE_API_KEY`

### Step 4: Deploy
1. Trigger deployment from Lovable dashboard
2. Monitor logs for errors
3. Verify app loads without 401/403 auth errors

### Step 5: Post-Deployment (IMPORTANT)
After successful first deployment:
1. Note the actual Lovable URL (e.g., `https://indigo-yield-platform.lovable.app`)
2. Update `NEXT_PUBLIC_APP_URL` in Lovable dashboard
3. Update value in `config/lovable-env-vars.json`
4. Trigger redeploy for changes to take effect

---

## Variable Overview

### Critical Variables (5)
| Variable | Type | Purpose |
|----------|------|---------|
| `VITE_SUPABASE_URL` | Public | Database connection URL |
| `VITE_SUPABASE_ANON_KEY` | Public | Client-side auth key (rotate!) |
| `SUPABASE_SERVICE_ROLE_KEY` | **SECRET** | Server-side auth key (rotate!) |
| `VITE_APP_ENV` | Public | Environment identifier |
| `NEXT_PUBLIC_APP_URL` | Public | Production app URL |

### Monitoring Variables (5)
| Variable | Type | Purpose |
|----------|------|---------|
| `VITE_SENTRY_DSN` | Public | Frontend error tracking (rotate!) |
| `SENTRY_DSN` | Public | Backend error tracking (rotate!) |
| `VITE_POSTHOG_KEY` | Public | Frontend analytics (rotate!) |
| `VITE_POSTHOG_HOST` | Public | Analytics host URL |
| `POSTHOG_API_KEY` | **SECRET** | Backend analytics (rotate!) |

### Feature Variables (2)
| Variable | Type | Purpose |
|----------|------|---------|
| `VITE_AIRTABLE_API_KEY` | **SECRET** | Investor onboarding sync |
| `VITE_AIRTABLE_BASE_ID` | Public | Airtable Base identifier |

---

## File Location
**Path:** `/Users/mama/indigo-yield-platform-v01/config/lovable-env-vars.json`

## Key Features

1. **Complete Metadata:** Version, timestamps, descriptions
2. **Rotation Tracking:** Fields for marking credentials that need rotation
3. **Validation Rules:** Regex patterns to validate formats
4. **Deployment Instructions:** Step-by-step guide
5. **Rotation Guide:** Process for quarterly credential rotation
6. **Validation Checklist:** Pre-deployment verification steps
7. **Security Best Practices:** Do's and don'ts
8. **Troubleshooting:** Common issues and solutions
9. **References:** Links to official documentation

---

## Security Reminders

1. **NEVER commit with real credentials** - Use `.gitignore`
2. **Rotate BEFORE production** - Not after!
3. **Mark secrets in Lovable** - Prevents accidental exposure in logs
4. **Use different keys per environment** - dev/staging/production should be different
5. **Keep rotation audit trail** - Document when and why credentials rotated
6. **Retire old credentials** - Don't leave them active after rotation

---

## Validation Before Deployment

```bash
# Check no PLACEHOLDER values remain
grep -r 'PLACEHOLDER' config/lovable-env-vars.json

# Count variables (should be 12)
grep '"name":' config/lovable-env-vars.json | wc -l

# Verify not tracked by git
git check-ignore config/lovable-env-vars.json

# Test Supabase connectivity (after entering real key)
curl -H 'apiKey: YOUR_ANON_KEY' \
  https://nkfimvovosdehmyyjubn.supabase.co/rest/v1/

# Verify JSON is valid
python3 -m json.tool config/lovable-env-vars.json > /dev/null && echo "Valid JSON"
```

---

## Troubleshooting

### App won't load (401/403)
- Check `VITE_SUPABASE_ANON_KEY` is correct
- Verify no extra spaces when copying
- Test key in Supabase dashboard first

### Errors not tracked in Sentry
- Verify `VITE_SENTRY_DSN` format is correct
- Check Sentry project is active
- Verify DSN starts with `https://`

### Analytics not showing in PostHog
- Verify `VITE_POSTHOG_KEY` matches PostHog project
- Check `VITE_POSTHOG_HOST` is reachable
- Verify in browser Network tab for failed requests

### Airtable sync failing
- Verify `VITE_AIRTABLE_API_KEY` has read permissions
- Verify `VITE_AIRTABLE_BASE_ID` is correct
- Check console logs for sync errors

---

## Next Steps

1. **Now:** Review config file structure
2. **Next:** Rotate all credentials from source systems
3. **Then:** Fill in real values in `config/lovable-env-vars.json`
4. **Finally:** Add to Lovable dashboard and deploy

---

## Document References

For detailed information, see:
- `config/lovable-env-vars.json` - Complete configuration template
- LOVABLE_DEPLOYMENT_STRATEGY_2025-11-26.md - Full deployment guide
- LOVABLE_DEPLOYMENT_AUDIT_2025-11-26.md - Pre-deployment audit checklist

---

**Created:** 2025-11-26  
**Platform:** Indigo Yield Platform  
**Deployment Target:** Lovable
