# Indigo Yield Platform - Credential Rotation Checklist

**Status**: Pre-Deployment Credential Rotation Required  
**Date Created**: 2025-11-26  
**Urgency**: CRITICAL - Credentials Exposed in Git History  
**Deployment Blocked**: Until all credentials are rotated  

---

## ⚠️ SECURITY INCIDENT SUMMARY

**Issue**: The following credentials were exposed in the git commit history:
- ✗ Supabase anonymous key (VITE_SUPABASE_ANON_KEY)
- ✗ Supabase service role key (SUPABASE_SERVICE_ROLE_KEY)
- ✗ Sentry DSN (VITE_SENTRY_DSN)
- ✗ PostHog API key (VITE_POSTHOG_KEY)
- ✗ MailerLite API key (MAILERLITE_API_KEY)

**Risk Level**: 🔴 CRITICAL - These keys can be used by attackers to:
- Access and manipulate database data
- Create unauthorized admin accounts
- Send fraudulent emails
- Track user behavior
- Inject malicious analytics code

**Action Required**: Complete this entire checklist before any deployment.

---

## PART 1: CRITICAL CREDENTIALS TO ROTATE

### 1.1 Supabase Anonymous Key (Exposed in Git)

#### ✓ Step 1: Document Current Key (Optional Backup)

- [ ] Document the old key value (for reference only):
  ```
  OLD_VITE_SUPABASE_ANON_KEY: [Copy from current .env]
  ```
- [ ] Save in a secure location (LastPass/1Password) with expiration date

#### ✓ Step 2: Generate New Supabase Anonymous Key

1. [ ] Open Supabase Dashboard: https://app.supabase.com
2. [ ] Navigate to Your Project → **Settings** → **API**
3. [ ] Under "Project API Keys" section, find **"anon public"** key
4. [ ] Click the **⟳ Rotate** button next to it
5. [ ] Confirm the rotation (this will invalidate the old key)
6. [ ] Copy the new key that appears

#### ✓ Step 3: Update Application Code

1. [ ] Update `.env` file:
   ```bash
   VITE_SUPABASE_ANON_KEY=<NEW_KEY_HERE>
   ```

2. [ ] Update `.env.production` file:
   ```bash
   VITE_SUPABASE_ANON_KEY=<NEW_KEY_HERE>
   ```

3. [ ] Update Lovable Dashboard:
   - Go to [Lovable Dashboard](https://lovable.dev)
   - Select Your Project → Settings → Environment Variables
   - Update `VITE_SUPABASE_ANON_KEY` with new value
   - Mark as **Secret**
   - Save and deploy

#### ✓ Step 4: Verification

- [ ] Test application locally:
  ```bash
  npm run dev
  # Verify authentication works
  # Try login and data fetching
  ```
- [ ] No "Invalid API Key" errors in browser console
- [ ] Database queries complete successfully
- [ ] User authentication works end-to-end
- [ ] Confirm new key is different from old:
  ```bash
  # Should NOT match
  grep "anon" .env
  grep "anon" .env.production
  ```

---

### 1.2 Supabase Service Role Key (Exposed in Git)

#### ✓ Step 1: Document Current Key (Optional Backup)

- [ ] Document the old key value (for reference only):
  ```
  OLD_SUPABASE_SERVICE_ROLE_KEY: [Copy from current .env]
  ```
- [ ] Save in a secure location with expiration date

#### ✓ Step 2: Generate New Service Role Key

1. [ ] Open Supabase Dashboard: https://app.supabase.com
2. [ ] Navigate to Your Project → **Settings** → **API**
3. [ ] Under "Project API Keys" section, find **"service_role"** key
4. [ ] Click the **⟳ Rotate** button next to it
5. [ ] Confirm the rotation (this will invalidate the old key)
6. [ ] Copy the new key that appears

#### ✓ Step 3: Update Server-Side Code

1. [ ] Update `.env` file:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=<NEW_KEY_HERE>
   ```

2. [ ] Update `.env.production` file:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=<NEW_KEY_HERE>
   ```

3. [ ] Update Lovable Dashboard:
   - Go to [Lovable Dashboard](https://lovable.dev)
   - Select Your Project → Settings → Environment Variables
   - Update `SUPABASE_SERVICE_ROLE_KEY` with new value
   - Mark as **Secret** (CRITICAL - server-side only)
   - Save and deploy

4. [ ] Update any backend/API files that use this key:
   - Search codebase: `grep -r "SUPABASE_SERVICE_ROLE_KEY" ./`
   - Update all references (if using in server files)

#### ✓ Step 4: Verification

- [ ] Backend operations still work:
  ```bash
  # Test admin operations that use service role key
  # Check logs for any authentication errors
  ```
- [ ] Database admin queries succeed
- [ ] RLS (Row Level Security) policies still enforced
- [ ] User isolation still works correctly
- [ ] Confirm new key is different from old

#### ✓ Step 5: Additional Security - Delete Old Keys from Dashboard

- [ ] Go to Supabase Dashboard → Settings → API
- [ ] Verify old anon key is no longer listed
- [ ] Verify old service_role key is no longer listed
- [ ] If old keys still appear with a "Revoke" button:
  - [ ] Click **Revoke** to force disable them
  - [ ] Confirm revocation

---

## PART 2: HIGH PRIORITY CREDENTIALS TO ROTATE

### 2.1 Sentry DSN (Exposed in Git)

#### ✓ Step 1: Create New Sentry Project

1. [ ] Open Sentry Dashboard: https://sentry.io
2. [ ] Click **Create Project** (top right)
3. [ ] Select Platform: **Next.js** or **React** (since it's a web app)
4. [ ] Select Alert Rules (default is fine for now)
5. [ ] Click **Create Project**
6. [ ] Copy the new DSN (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

#### ✓ Step 2: Update Application Code

1. [ ] Update `.env` file:
   ```bash
   VITE_SENTRY_DSN=<NEW_DSN_HERE>
   SENTRY_DSN=<NEW_DSN_HERE>
   ```

2. [ ] Update `.env.production` file:
   ```bash
   VITE_SENTRY_DSN=<NEW_DSN_HERE>
   SENTRY_DSN=<NEW_DSN_HERE>
   ```

3. [ ] Update Lovable Dashboard:
   - Go to [Lovable Dashboard](https://lovable.dev)
   - Select Your Project → Settings → Environment Variables
   - Update both `VITE_SENTRY_DSN` and `SENTRY_DSN`
   - Mark as **Secret**
   - Save and deploy

#### ✓ Step 3: Verification

- [ ] Test error tracking locally:
  ```bash
  npm run dev
  # Trigger a test error to verify Sentry receives it
  ```
- [ ] Check Sentry dashboard for test events
- [ ] Errors appear in the new Sentry project (not old)
- [ ] Source maps upload correctly (if enabled)

#### ✓ Step 4: Clean Up Old Project

- [ ] Go to old Sentry project settings
- [ ] Note down the old Project ID (for records)
- [ ] **Optional**: Delete old project if no historical data needed
  - Settings → Danger Zone → Delete Project
  - Type project name to confirm
  - Click **Delete**

---

### 2.2 PostHog API Key (Exposed in Git)

#### ✓ Step 1: Create New PostHog Project

1. [ ] Open PostHog Dashboard: https://posthog.com
2. [ ] Click **Create new project** (+ icon)
3. [ ] Select Platform: **Web** → **Next.js** or **React**
4. [ ] Copy the new API key and host:
   ```
   VITE_POSTHOG_KEY=<NEW_KEY>
   VITE_POSTHOG_HOST=https://app.posthog.com
   ```

#### ✓ Step 2: Update Application Code

1. [ ] Update `.env` file:
   ```bash
   VITE_POSTHOG_KEY=<NEW_KEY>
   VITE_POSTHOG_HOST=https://app.posthog.com
   POSTHOG_API_KEY=<NEW_KEY>
   ```

2. [ ] Update `.env.production` file:
   ```bash
   VITE_POSTHOG_KEY=<NEW_KEY>
   VITE_POSTHOG_HOST=https://app.posthog.com
   POSTHOG_API_KEY=<NEW_KEY>
   ```

3. [ ] Update Lovable Dashboard:
   - Go to [Lovable Dashboard](https://lovable.dev)
   - Select Your Project → Settings → Environment Variables
   - Update `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, and `POSTHOG_API_KEY`
   - Mark as **Secret**
   - Save and deploy

#### ✓ Step 3: Verification

- [ ] Test analytics tracking:
  ```bash
  npm run dev
  # Interact with app features to trigger events
  ```
- [ ] Check PostHog dashboard for events
- [ ] Events appear in new PostHog project
- [ ] No events in old project after rotation

#### ✓ Step 4: Clean Up Old Project

- [ ] Note the old PostHog Project ID
- [ ] **Optional**: Delete old project if no historical data needed
  - Settings → Danger Zone → Delete Project

---

## PART 3: ADDITIONAL CREDENTIALS TO CHECK

### 3.1 MailerLite API Key (Exposed in Git)

#### Status: EXPOSED ⚠️

#### ✓ Step 1: Generate New MailerLite API Key

1. [ ] Open MailerLite: https://app.mailerlite.com
2. [ ] Go to **Integrations** → **API**
3. [ ] Generate a new API key:
   - Click **Create API Token** or **Generate New Key**
   - Name it: `indigo-yield-platform-2025-11-26`
   - Click **Generate**
4. [ ] Copy the new API key

#### ✓ Step 2: Update Application Code

1. [ ] Update `.env` file:
   ```bash
   MAILERLITE_API_KEY=<NEW_KEY>
   ```

2. [ ] Update `.env.production` file:
   ```bash
   MAILERLITE_API_KEY=<NEW_KEY>
   ```

3. [ ] Update Lovable Dashboard:
   - Go to [Lovable Dashboard](https://lovable.dev)
   - Select Your Project → Settings → Environment Variables
   - Update `MAILERLITE_API_KEY`
   - Mark as **Secret**
   - Save and deploy

#### ✓ Step 3: Verification

- [ ] Email sending still works in app
- [ ] No "Unauthorized" errors in logs
- [ ] Emails from the app arrive successfully

#### ✓ Step 4: Revoke Old Key

1. [ ] Go to MailerLite API settings
2. [ ] Find the old key in the list
3. [ ] Click **Revoke** or **Delete**
4. [ ] Confirm deletion

---

## PART 4: VALIDATION CHECKLIST

### 4.1 Supabase Keys Validation

- [ ] **Old anon key rotated**: New key != old key
- [ ] **Old service_role rotated**: New key != old key
- [ ] **Old keys revoked**: Not visible in Supabase Settings → API
- [ ] **New keys in Lovable**: Both keys updated in dashboard
- [ ] **New keys marked Secret**: Security setting enabled
- [ ] **Application works**: Login and data operations succeed
- [ ] **No console errors**: No "Invalid API Key" messages
- [ ] **Deployment successful**: App loads without auth errors

### 4.2 Sentry DSN Validation

- [ ] **New project created**: Can access at https://sentry.io
- [ ] **New DSN different from old**: Confirmed via env vars
- [ ] **Old project marked deprecated**: Added note in settings
- [ ] **New DSN in Lovable**: Updated in environment variables
- [ ] **Test event received**: Appeared in new project dashboard
- [ ] **Old project not receiving events**: No events since rotation
- [ ] **Source maps working**: (If applicable to your setup)

### 4.3 PostHog Key Validation

- [ ] **New project created**: Can access in PostHog dashboard
- [ ] **New key different from old**: Confirmed via env vars
- [ ] **New key in Lovable**: Updated in environment variables
- [ ] **Events tracking**: Analytics events appear in new project
- [ ] **Old project silent**: No events since rotation date

### 4.4 MailerLite Key Validation

- [ ] **New API key generated**: Copied from MailerLite
- [ ] **New key in Lovable**: Updated in environment variables
- [ ] **Email operations work**: Transactional emails send successfully
- [ ] **Old key revoked**: Deleted from MailerLite API settings

### 4.5 Complete Environment Audit

- [ ] **10 environment variables documented**:
  - [ ] VITE_SUPABASE_URL
  - [ ] VITE_SUPABASE_ANON_KEY (ROTATED ✓)
  - [ ] SUPABASE_SERVICE_ROLE_KEY (ROTATED ✓)
  - [ ] VITE_SENTRY_DSN (ROTATED ✓)
  - [ ] SENTRY_DSN (ROTATED ✓)
  - [ ] VITE_POSTHOG_KEY (ROTATED ✓)
  - [ ] POSTHOG_API_KEY (ROTATED ✓)
  - [ ] VITE_POSTHOG_HOST
  - [ ] MAILERLITE_API_KEY (ROTATED ✓)
  - [ ] VITE_APP_ENV

- [ ] **All CRITICAL variables configured**:
  - [ ] VITE_SUPABASE_URL ✓
  - [ ] VITE_SUPABASE_ANON_KEY ✓
  - [ ] SUPABASE_SERVICE_ROLE_KEY ✓
  - [ ] VITE_APP_ENV ✓
  - [ ] NEXT_PUBLIC_APP_URL ✓

- [ ] **All HIGH priority variables configured**:
  - [ ] VITE_SENTRY_DSN ✓
  - [ ] SENTRY_DSN ✓
  - [ ] VITE_POSTHOG_KEY ✓
  - [ ] POSTHOG_API_KEY ✓
  - [ ] VITE_POSTHOG_HOST ✓

### 4.6 Security Requirements Verification

- [ ] **No plaintext secrets in code**: Grep check complete
  ```bash
  # Run this command:
  grep -r "VITE_SUPABASE_ANON_KEY" ./src/ | grep -v ".env"
  grep -r "SUPABASE_SERVICE_ROLE_KEY" ./src/ | grep -v ".env"
  # Should return: No matches (empty)
  ```

- [ ] **All secrets marked SECRET in Lovable**:
  - [ ] VITE_SUPABASE_ANON_KEY - Mark as Secret
  - [ ] SUPABASE_SERVICE_ROLE_KEY - Mark as Secret
  - [ ] VITE_SENTRY_DSN - Mark as Secret
  - [ ] SENTRY_DSN - Mark as Secret
  - [ ] VITE_POSTHOG_KEY - Mark as Secret
  - [ ] POSTHOG_API_KEY - Mark as Secret
  - [ ] MAILERLITE_API_KEY - Mark as Secret

- [ ] **.env.production not committed to git**:
  ```bash
  # Verify it's in .gitignore
  grep ".env.production" .gitignore
  # Verify it's not in git history
  git log --all --oneline -- .env.production | wc -l
  # Should return: 0 (no commits)
  ```

- [ ] **.env not committed to git**:
  ```bash
  # Verify it's in .gitignore
  grep "^\.env$" .gitignore
  # Verify it's not in recent git history
  git log --all --oneline -- .env | wc -l
  # Should return: 0 (no commits)
  ```

- [ ] **Git credentials removed from history**:
  - [ ] If credentials found in git, run: `git filter-branch --force --index-filter 'git rm --cached -r --ignore-unmatch .env .env.production' HEAD`
  - [ ] Force push with: `git push origin --force-with-lease --all`
  - [ ] Notify team to re-clone repository

---

## PART 5: PRE-DEPLOYMENT CHECKLIST

### 5.1 Final Verification Steps

- [ ] Run full test suite locally:
  ```bash
  npm run test
  # All tests should pass
  ```

- [ ] Build application for production:
  ```bash
  npm run build
  # No errors or warnings about missing env vars
  ```

- [ ] Test locally with .env.production:
  ```bash
  # Copy .env.production to .env.local
  # Run dev server
  # Verify all features work
  ```

- [ ] Verify no console errors in browser:
  - [ ] DevTools Console: F12 → Console tab
  - [ ] No "Invalid API Key" errors
  - [ ] No "Unauthorized" errors
  - [ ] No missing environment variable warnings

- [ ] Check all external service connections:
  - [ ] [ ] Supabase: Database queries work
  - [ ] [ ] Sentry: Errors are tracked (test event sent)
  - [ ] [ ] PostHog: Analytics events are recorded
  - [ ] [ ] MailerLite: Email sending works (test email sent)

### 5.2 Lovable Dashboard Final Check

- [ ] All environment variables added:
  ```
  Count should be: 20+ variables
  ```

- [ ] All CRITICAL variables marked Secret:
  - [ ] ✓ VITE_SUPABASE_ANON_KEY
  - [ ] ✓ SUPABASE_SERVICE_ROLE_KEY
  - [ ] ✓ VITE_SENTRY_DSN
  - [ ] ✓ SENTRY_DSN
  - [ ] ✓ VITE_POSTHOG_KEY
  - [ ] ✓ POSTHOG_API_KEY
  - [ ] ✓ MAILERLITE_API_KEY

- [ ] Deployment triggered in Lovable:
  - [ ] Go to Lovable → Your Project → Deployments
  - [ ] Click **Deploy**
  - [ ] Wait for build to complete (5-10 minutes)
  - [ ] Check for deployment errors

- [ ] Verify deployed app works:
  - [ ] Visit your deployed URL
  - [ ] Test login functionality
  - [ ] Test core features
  - [ ] Check browser console for errors

### 5.3 Post-Deployment Monitoring

- [ ] Monitor error tracking for 24 hours:
  - [ ] Check Sentry dashboard daily
  - [ ] Verify new errors go to new project
  - [ ] No errors about invalid API keys

- [ ] Monitor analytics for 24 hours:
  - [ ] Check PostHog dashboard
  - [ ] Events being tracked correctly
  - [ ] No analytics data loss

- [ ] Monitor email delivery:
  - [ ] Send test email
  - [ ] Verify it arrives
  - [ ] Check MailerLite dashboard for delivery status

---

## PART 6: DOCUMENTATION & RECORDS

### 6.1 Update Secure Credential Storage

In your password manager (LastPass/1Password/Bitwarden), create an entry:

**Title**: Indigo Yield Platform - Production Credentials (Rotated 2025-11-26)

**Fields**:
- [ ] VITE_SUPABASE_URL: [Production URL]
- [ ] VITE_SUPABASE_ANON_KEY: [New key - date rotated 2025-11-26]
- [ ] SUPABASE_SERVICE_ROLE_KEY: [New key - date rotated 2025-11-26]
- [ ] VITE_SENTRY_DSN: [New DSN - date rotated 2025-11-26]
- [ ] SENTRY_DSN: [New DSN - date rotated 2025-11-26]
- [ ] VITE_POSTHOG_KEY: [New key - date rotated 2025-11-26]
- [ ] VITE_POSTHOG_HOST: https://app.posthog.com
- [ ] MAILERLITE_API_KEY: [New key - date rotated 2025-11-26]
- [ ] Notes: "All credentials rotated due to exposure in git history. Old keys revoked."

### 6.2 Audit Trail Documentation

Create a file: `CREDENTIAL_ROTATION_AUDIT_2025-11-26.md`

```markdown
# Credential Rotation Audit - 2025-11-26

## Security Incident
- Credentials exposed in git commit history
- All 5 exposed credentials rotated on 2025-11-26

## Rotated Credentials
1. ✓ VITE_SUPABASE_ANON_KEY
2. ✓ SUPABASE_SERVICE_ROLE_KEY
3. ✓ VITE_SENTRY_DSN
4. ✓ SENTRY_DSN (new project created)
5. ✓ VITE_POSTHOG_KEY (new project created)
6. ✓ POSTHOG_API_KEY (new project created)
7. ✓ MAILERLITE_API_KEY

## Timeline
- Rotation Start: 2025-11-26 [TIME]
- Rotation Complete: 2025-11-26 [TIME]
- Lovable Deployment: 2025-11-26 [TIME]
- Verification Complete: 2025-11-26 [TIME]

## Revoked Credentials
- Old Supabase anon key: Revoked ✓
- Old Supabase service_role key: Revoked ✓
- Old MailerLite API key: Revoked ✓
- Old Sentry project: [Kept for 30 days historical data, then deleted]
- Old PostHog project: [Kept for 30 days historical data, then deleted]

## Verification
- [ ] All rotations documented
- [ ] All old keys revoked
- [ ] All new keys in Lovable marked Secret
- [ ] Application deployment successful
- [ ] 24-hour monitoring period initiated

## Signed By
- Operator: [Name]
- Date: 2025-11-26
- Timestamp: [TIME]
```

### 6.3 Team Notification

Send to your team:

```
SECURITY ALERT: Credential Rotation Complete

Credentials that were exposed in git history have been rotated on 2025-11-26.

Affected Services:
✓ Supabase (anon and service_role keys)
✓ Sentry (new project created)
✓ PostHog (new project created)
✓ MailerLite (new API key)

Action Items:
1. Do NOT use old credentials
2. Old credentials have been revoked
3. All old keys can no longer access services
4. Deployed version uses new credentials only

Next Steps:
- Monitor for 24 hours for any issues
- Report any authentication errors to [person]
- Check Sentry for any unexpected errors

Timeline:
- Rotation: 2025-11-26
- Deployment: 2025-11-26
- Monitoring Period: 24 hours
- Completion: 2025-11-27
```

---

## PART 7: QUICK REFERENCE COMMANDS

### Check for credentials in code (should return nothing):
```bash
grep -r "VITE_SUPABASE_ANON_KEY" ./src/
grep -r "SUPABASE_SERVICE_ROLE_KEY" ./src/
grep -r "SENTRY_DSN" ./src/
```

### Verify .env files are gitignored:
```bash
git check-ignore .env .env.production
# Should return: .env
#               .env.production
```

### List all environment variables in use:
```bash
grep -r "process.env" ./src/ | grep -oE "process\.env\.[A-Z_]+" | sort -u
```

### Test Supabase connection:
```bash
npm run test:supabase
```

### Test all external services:
```bash
npm run test:external-services
```

### Deploy to Lovable:
```bash
# Via Lovable Dashboard:
# 1. Go to Your Project → Deployments
# 2. Click "Deploy"
# 3. Wait for build completion
```

---

## PART 8: ROLLBACK PROCEDURES

**If deployment fails after credential rotation:**

### Rollback Steps:
1. [ ] Identify the error in Lovable deployment logs
2. [ ] Do NOT restore old credentials
3. [ ] Instead, debug with new credentials:
   - [ ] Check Supabase RLS policies still correct
   - [ ] Verify Sentry and PostHog endpoints accessible
   - [ ] Check MailerLite integration still working
4. [ ] Fix the issue in code if needed
5. [ ] Deploy again with new credentials
6. [ ] If still failing, contact service support with new project IDs

**Important**: Do NOT roll back to old credentials - they are revoked and will not work.

---

## PART 9: 30-DAY POST-ROTATION CHECKLIST

### 7 Days After Rotation:
- [ ] No authentication errors in Sentry
- [ ] Analytics tracking normally in PostHog
- [ ] No database access issues
- [ ] Email delivery working

### 14 Days After Rotation:
- [ ] Delete old Sentry project (if no data needed):
  ```
  Sentry → Settings → Danger Zone → Delete Project
  ```
- [ ] Delete old PostHog project (if no data needed):
  ```
  PostHog → Settings → Danger Zone → Delete Project
  ```

### 30 Days After Rotation:
- [ ] Full security audit performed
- [ ] No incidents related to old credentials
- [ ] Document completion of rotation process
- [ ] Archive audit trail

---

## ✅ COMPLETION CHECKLIST

**Mark this section complete when ALL items are done:**

- [ ] PART 1: Supabase keys rotated (anon + service_role)
- [ ] PART 2: Sentry DSN rotated (new project created)
- [ ] PART 2: PostHog API key rotated (new project created)
- [ ] PART 3: MailerLite API key rotated
- [ ] PART 4: All validations passed
- [ ] PART 5: Pre-deployment checklist complete
- [ ] PART 6: Documentation and records created
- [ ] PART 7: Lovable deployment successful
- [ ] PART 8: 24-hour monitoring initiated
- [ ] PART 9: Team notified

**Status**: 🟡 PENDING

**Estimated Time to Complete**: 45-60 minutes

**Blockers**: None

**Assigned To**: [Your Name]

**Target Completion Date**: 2025-11-26

---

## SUPPORT & TROUBLESHOOTING

### Common Issues During Rotation

#### "Invalid API Key" errors after deployment:
- Check that new key is in Lovable environment variables
- Verify key is marked as "Secret"
- Clear browser cache and reload
- Check Supabase dashboard for key status

#### Email sending fails:
- Verify MailerLite API key is correct
- Check MailerLite dashboard for rate limits
- Test with simpler email first
- Check spam folder

#### Sentry not receiving events:
- Verify DSN is correct in environment
- Check Sentry project endpoint accessibility
- Look for CORS errors in browser console
- Verify source maps are uploaded (if applicable)

#### Analytics events not tracking:
- Verify PostHog key and host are correct
- Check for CORS/network errors in console
- Verify PostHog project still exists
- Check event filters in PostHog dashboard

### Getting Help

If you encounter issues:
1. Check the service's status page (Supabase, Sentry, PostHog, MailerLite)
2. Review browser console for specific errors
3. Check application logs in Lovable dashboard
4. Contact service support with new project IDs
5. Reference this checklist for what was rotated

---

## DOCUMENT INFORMATION

**Version**: 1.0  
**Created**: 2025-11-26  
**Last Updated**: 2025-11-26  
**Status**: Active - Pre-Deployment  
**Confidentiality**: Internal Only  
**Reviewed By**: [Name]  

---

**IMPORTANT**: This is a sensitive document containing references to credential rotation. Keep it secure and share only with authorized team members who need to execute this checklist.

Once rotation is complete, update this document to mark completion and archive it.
