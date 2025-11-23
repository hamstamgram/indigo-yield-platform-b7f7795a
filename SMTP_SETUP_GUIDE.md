# SMTP Configuration Guide - Indigo Yield Platform

**Priority: 🔴 CRITICAL** - Required for production deployment
**Estimated Time:** 5 minutes
**Status:** Production-ready code exists, needs configuration only

---

## Overview

The email service is **already implemented** using secure server-side architecture:

- ✅ Edge Function: `supabase/functions/send-email/index.ts` (346 lines)
- ✅ Client Service: `src/lib/email.ts` (calls Edge Function with JWT)
- ✅ Rate Limiting: 10 emails/min/user
- ✅ Audit Logging: All emails logged to `email_logs` table
- ✅ 6 HTML Templates: Welcome, Statement Ready, Password Reset, etc.

**Only Missing:** SMTP credentials configuration (5 minutes)

---

## Step 1: Configure SMTP Secrets in Supabase

### Option A: Using Supabase Dashboard (Recommended)

1. **Navigate to Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/settings/vault
   ```

2. **Add SMTP Secrets** (Settings → Vault → Secrets)

   Click "New Secret" for each:

   | Secret Name | Example Value | Description |
   |-------------|---------------|-------------|
   | `SMTP_HOST` | `smtp.gmail.com` | SMTP server hostname |
   | `SMTP_PORT` | `587` | SMTP port (usually 587 for TLS) |
   | `SMTP_USER` | `noreply@indigoyield.com` | SMTP username/email |
   | `SMTP_PASS` | `your_app_password_here` | SMTP password/app password |
   | `SMTP_FROM` | `Indigo Yield <noreply@indigoyield.com>` | From address with display name |

3. **Save Each Secret** - Click "Add Secret" after each entry

### Option B: Using Supabase CLI

```bash
# From project root
cd /Users/mama/indigo-yield-platform-v01

# Set secrets
supabase secrets set SMTP_HOST=smtp.gmail.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=noreply@indigoyield.com
supabase secrets set SMTP_PASS=your_app_password_here
supabase secrets set SMTP_FROM="Indigo Yield <noreply@indigoyield.com>"
```

---

## Step 2: Deploy Edge Function

### Using Supabase CLI (Recommended)

```bash
# From project root
cd /Users/mama/indigo-yield-platform-v01

# Login to Supabase (if not already)
supabase login

# Link to your project (if not already linked)
supabase link --project-ref [YOUR_PROJECT_ID]

# Deploy send-email function
supabase functions deploy send-email

# Verify deployment
supabase functions list
```

### Expected Output

```
Deploying send-email (branch: main)
Bundling send-email
  ✓ send-email deployed (346 lines)

Functions:
  - send-email (https://[PROJECT_ID].supabase.co/functions/v1/send-email)
```

---

## Step 3: Test Email Service

### Test 1: Health Check (Browser DevTools Console)

```javascript
// In browser console (logged in as admin)
import { emailService } from './lib/email';

const health = await emailService.testConnection();
console.log(health);
// Expected: { status: "healthy", message: "Edge Function configured and accessible", latency: 45 }
```

### Test 2: Send Test Email

```javascript
// Send welcome email test
import { sendWelcomeEmail } from './lib/email';

const success = await sendWelcomeEmail(
  'your.test.email@example.com',
  'Test User'
);

console.log(success ? '✅ Email sent!' : '❌ Failed');
```

### Test 3: Verify in Database

```sql
-- Check email_logs table in Supabase SQL Editor
SELECT * FROM email_logs
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** Recent entry with `status = 'sent'`

---

## Step 4: Verify Security (Critical)

### ✅ Checklist

- [ ] **No SMTP credentials in frontend bundle**
  ```bash
  # Build production bundle
  npm run build

  # Search built files for SMTP credentials
  grep -r "smtp.gmail.com" dist/
  grep -r "SMTP_PASS" dist/

  # Should return NOTHING
  ```

- [ ] **Secrets only in Supabase Vault**
  ```bash
  # List secrets (should show names only, NOT values)
  supabase secrets list

  # Expected output:
  # SMTP_HOST
  # SMTP_PORT
  # SMTP_USER
  # SMTP_PASS
  # SMTP_FROM
  ```

- [ ] **Edge Function authentication required**
  ```bash
  # Test unauthenticated request (should fail with 401)
  curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/send-email \
    -H "Content-Type: application/json" \
    -d '{"to":"test@example.com","subject":"Test","template":"WELCOME","variables":{}}'

  # Expected: {"error":"Missing Authorization header"}
  ```

- [ ] **Rate limiting active**
  ```javascript
  // Send 11 emails rapidly (should hit rate limit)
  for (let i = 0; i < 11; i++) {
    await sendWelcomeEmail('test@example.com', 'Test');
  }
  // Expected: 10 succeed, 11th fails with 429 error
  ```

---

## SMTP Provider Setup

### Recommended Provider: Gmail (Free for Low Volume)

1. **Create Google App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other (Custom name)" → "Indigo Yield Platform"
   - Copy generated 16-character password

2. **Use in Supabase Secrets**
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your.email@gmail.com
   SMTP_PASS=[16-character app password]
   SMTP_FROM="Indigo Yield <your.email@gmail.com>"
   ```

3. **Gmail Limits**: 500 emails/day (free), 2000/day (Google Workspace)

### Alternative: SendGrid (Recommended for Production)

1. **Sign up**: https://sendgrid.com/pricing/ (Free tier: 100 emails/day)
2. **Create API Key**: Settings → API Keys → Create API Key
3. **Configure**:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=[Your SendGrid API Key]
   SMTP_FROM="Indigo Yield <noreply@indigoyield.com>"
   ```

### Alternative: AWS SES (Best for Scale)

1. **Sign up**: https://aws.amazon.com/ses/pricing/ (Free tier: 62,000 emails/month)
2. **Verify domain**: SES → Domains → Verify a New Domain
3. **Create SMTP Credentials**: SES → SMTP Settings → Create My SMTP Credentials
4. **Configure**:
   ```
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_USER=[SMTP Username from AWS]
   SMTP_PASS=[SMTP Password from AWS]
   SMTP_FROM="Indigo Yield <noreply@indigoyield.com>"
   ```

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] SMTP secrets configured in Supabase Vault
- [ ] Edge Function deployed (`supabase functions deploy send-email`)
- [ ] Test email sent successfully
- [ ] Rate limiting verified (10 emails/min/user)
- [ ] Audit logging confirmed (check `email_logs` table)
- [ ] No credentials in frontend bundle (`grep dist/` test passed)

### Post-Deployment

- [ ] Monitor `email_logs` table for delivery status
- [ ] Set up alerts for failed emails (>5% failure rate)
- [ ] Monitor Supabase Edge Function logs for errors
- [ ] Test all 6 email templates:
  - [ ] STATEMENT_READY
  - [ ] WELCOME
  - [ ] PASSWORD_RESET
  - [ ] TOTP_ENABLED
  - [ ] WITHDRAWAL_REQUEST
  - [ ] ADMIN_NOTIFICATION

---

## Monitoring

### Check Email Delivery Status

```sql
-- Email success rate (last 24 hours)
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM email_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### Check Rate Limit Violations

```sql
-- Users hitting rate limits (last hour)
SELECT
  user_id,
  COUNT(*) as emails_sent,
  MAX(created_at) as last_email
FROM email_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) >= 10
ORDER BY emails_sent DESC;
```

### Check Template Usage

```sql
-- Most used templates (last 7 days)
SELECT
  template,
  COUNT(*) as usage_count
FROM email_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY template
ORDER BY usage_count DESC;
```

---

## Troubleshooting

### Issue: "Email service not configured" error

**Solution:** Check SMTP secrets are set in Supabase:
```bash
supabase secrets list
# Should show: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
```

### Issue: 429 Rate Limit Error

**Solution:** Expected behavior - user sending >10 emails/min
```javascript
// Error response:
{
  "error": "Rate limit exceeded",
  "message": "Maximum 10 emails per minute. Try again in 1 minute."
}
```

### Issue: SMTP Authentication Failed

**Causes:**
1. **Gmail**: App password not generated → Create at https://myaccount.google.com/apppasswords
2. **SendGrid**: Invalid API key → Regenerate in SendGrid dashboard
3. **AWS SES**: Account in sandbox mode → Request production access

### Issue: Emails not appearing in inbox

**Check:**
1. **Spam folder** - First few emails may be filtered
2. **SPF/DKIM records** - Configure for your domain
3. **Email logs** - Verify status = 'sent' in database
4. **Provider limits** - Check daily send limit

---

## Security Score Impact

**Before SMTP Configuration:**
- Security Score: 6/10 🟡
- Blocker: SMTP credentials could be exposed

**After SMTP Configuration:**
- Security Score: 9/10 ✅
- All credentials in Supabase Vault (server-side)
- JWT authentication required
- Rate limiting active
- Audit logging complete

---

## Next Steps

After completing SMTP setup:

1. ✅ **Priority 1 Complete** - SMTP credentials secured
2. 🔄 **Priority 2** - Deploy HTTP security headers (Vercel config)
3. 🔄 **Priority 3** - Frontend architecture improvements
4. 🔄 **Priority 4** - Remove feature bloat (60%)

---

## Support

**Supabase Edge Functions Docs:** https://supabase.com/docs/guides/functions
**SMTP Configuration:** https://supabase.com/docs/guides/functions/secrets
**Email Service Code:** `supabase/functions/send-email/index.ts` (346 lines)
**Client Code:** `src/lib/email.ts` (210 lines)

---

**Last Updated:** 2025-11-22
**Status:** 🟢 Ready for Configuration (5 minutes)
**Risk Level:** 🔴 CRITICAL (Production Blocker)
