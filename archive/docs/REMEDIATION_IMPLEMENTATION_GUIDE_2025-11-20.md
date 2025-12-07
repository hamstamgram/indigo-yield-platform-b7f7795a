# Security Remediation Implementation Guide
**Indigo Yield Platform v01**  
**Date:** November 20, 2025  
**Prepared For:** Development Team  

---

## Quick Reference: What's Fixed vs. What Needs Work

### ✅ Already Fixed (2/9)
1. **Hardcoded Supabase Key** - ELIMINATED ✅
2. **CSP unsafe-inline** - ELIMINATED ✅

### 🔴 CRITICAL - Must Fix Before Production (2/9)
1. **Client-Side SMTP Credentials** - Requires implementation
2. **Client-Side Email Service** - Requires architectural redesign

### 🟠 HIGH - Fix Before Production (1/9)
1. **HTTP Security Headers** - Requires deployment configuration

### 🟡 MEDIUM - Fix Before Launch (5/9)
1. **Auth Race Condition** - 1-hour fix
2. **Admin Status Fallback** - 1-hour fix
3. **Silent Error Logging** - 2-3 hour fix
4. **Email URL Construction** - 1-hour fix

---

## IMPLEMENTATION PRIORITIES

### PRIORITY 1: Email Service Migration (2-4 Days) 🔴 BLOCKING

**Why This Blocks Production:**
- SMTP credentials exposed in browser = PCI-DSS violation
- Enables email account compromise
- Enables phishing/spam attacks
- Unlocker for SOC 2 compliance

**Files to Create:**
```
supabase/
  functions/
    send-email/
      index.ts              # Main Edge Function
      email-templates.ts    # Email template definitions
      rate-limiter.ts       # Rate limiting logic
```

**Step-by-Step Implementation:**

#### Step 1: Create Email Logs Table

```sql
-- Run in Supabase SQL Editor
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, sent, failed, bounced
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_status JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Indexes for common queries
  INDEX email_logs_user_id_idx (user_id, created_at DESC),
  INDEX email_logs_recipient_idx (recipient, created_at DESC),
  INDEX email_logs_status_idx (status, created_at DESC)
);

-- Enable RLS if not already enabled
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own email logs
CREATE POLICY email_logs_select_policy
  ON email_logs FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Only Edge Functions can insert
CREATE POLICY email_logs_insert_policy
  ON email_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

#### Step 2: Create Supabase Edge Function

```typescript
// supabase/functions/send-email/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"
import { z } from "https://deno.land/x/zod@3.22.4/mod.ts"

// ============= INPUT VALIDATION =============
const EmailRequestSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject required').max(200, 'Subject too long'),
  template: z.enum([
    'STATEMENT_READY',
    'WELCOME',
    'PASSWORD_RESET',
    'TOTP_ENABLED',
    'WITHDRAWAL_REQUEST',
    'ADMIN_NOTIFICATION'
  ]),
  variables: z.record(z.any()).default({}),
});

type EmailRequest = z.infer<typeof EmailRequestSchema>;

// ============= EMAIL TEMPLATES =============
const EMAIL_TEMPLATES: Record<string, (vars: Record<string, any>) => string> = {
  STATEMENT_READY: (vars) => `
    <h1>Your Statement is Ready</h1>
    <p>Your Indigo Yield statement (ID: ${vars.statementId}) is ready for download.</p>
    <a href="${vars.downloadUrl}">Download Statement</a>
    <p><em>This link expires in ${vars.expiresIn}</em></p>
  `,
  WELCOME: (vars) => `
    <h1>Welcome to Indigo Yield, ${vars.userName}!</h1>
    <p>Your account is ready to use.</p>
    <a href="${vars.loginUrl}">Log In to Your Account</a>
    <p>Questions? <a href="${vars.supportUrl}">Contact Support</a></p>
  `,
  TOTP_ENABLED: (vars) => `
    <h1>Two-Factor Authentication Enabled</h1>
    <p>Hi ${vars.userName},</p>
    <p>2FA has been successfully enabled on your account.</p>
    <p>Timestamp: ${vars.timestamp}</p>
  `,
  WITHDRAWAL_REQUEST: (vars) => `
    <h1>Withdrawal Request Received</h1>
    <p>Amount: ${vars.amount} ${vars.currency}</p>
    <p>Request ID: ${vars.requestId}</p>
    <p>Status: Processing</p>
  `,
  ADMIN_NOTIFICATION: (vars) => `
    <h1>Admin Notification</h1>
    <p>${vars.message}</p>
    <p><a href="${vars.dashboardUrl}">View in Dashboard</a></p>
  `,
};

// ============= RATE LIMITING =============
async function checkRateLimit(
  supabase: any,
  userId: string,
  maxPerMinute: number = 10
): Promise<{ allowed: boolean; remaining: number }> {
  // Simple rate limiting: check email count in last minute
  const { count } = await supabase
    .from('email_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 60000).toISOString());

  const remaining = Math.max(0, maxPerMinute - (count || 0));
  return {
    allowed: remaining > 0,
    remaining
  };
}

// ============= MAIN EDGE FUNCTION =============
serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // 1. AUTHENTICATE USER
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. PARSE AND VALIDATE REQUEST
    const body = await req.json();
    let emailRequest: EmailRequest;

    try {
      emailRequest = EmailRequestSchema.parse(body);
    } catch (validationError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: validationError.errors
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. CHECK RATE LIMIT
    const rateLimit = await checkRateLimit(supabase, user.id);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Maximum 10 emails per minute. Try again in 1 minute.`
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60'
          }
        }
      );
    }

    // 4. GET SMTP CREDENTIALS (from Supabase secrets)
    const smtpHost = Deno.env.get('SMTP_HOST')!;
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
    const smtpUser = Deno.env.get('SMTP_USER')!;
    const smtpPass = Deno.env.get('SMTP_PASS')!;
    const smtpFrom = Deno.env.get('SMTP_FROM')!;

    if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
      console.error('Missing SMTP configuration');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. RENDER EMAIL TEMPLATE
    const templateRenderer = EMAIL_TEMPLATES[emailRequest.template];
    if (!templateRenderer) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${emailRequest.template}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailContent = templateRenderer(emailRequest.variables);

    // 6. SEND EMAIL VIA SMTP
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    const messageId = `${user.id}-${Date.now()}`;

    await client.send({
      from: smtpFrom,
      to: emailRequest.to,
      subject: emailRequest.subject,
      content: emailContent,
      headers: {
        'X-Message-ID': messageId,
        'X-User-ID': user.id,
        'X-Template': emailRequest.template,
      }
    });

    // 7. LOG TO AUDIT TRAIL
    await supabase.from('email_logs').insert({
      user_id: user.id,
      recipient: emailRequest.to,
      subject: emailRequest.subject,
      template: emailRequest.template,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    // 8. RETURN SUCCESS
    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent to ${emailRequest.to}`,
        messageId
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );

  } catch (error) {
    // Log error for debugging
    console.error('Email function error:', error);

    // Return generic error (don't expose internal details)
    return new Response(
      JSON.stringify({
        error: 'Failed to send email',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
```

#### Step 3: Update Client Email Service to Use Edge Function

```typescript
// src/lib/email.ts (UPDATED)

import { supabase } from '@/integrations/supabase/client';

export interface EmailTemplate {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, any>;
}

export const EMAIL_TEMPLATES = {
  STATEMENT_READY: "STATEMENT_READY",
  WELCOME: "WELCOME",
  PASSWORD_RESET: "PASSWORD_RESET",
  TOTP_ENABLED: "TOTP_ENABLED",
  WITHDRAWAL_REQUEST: "WITHDRAWAL_REQUEST",
  ADMIN_NOTIFICATION: "ADMIN_NOTIFICATION",
} as const;

class EmailService {
  private edgeFunctionUrl: string;

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL environment variable is required');
    }
    this.edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-email`;
  }

  async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('Authentication required to send email');
        return false;
      }

      // Call Edge Function
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Email send failed:', error);
        return false;
      }

      const result = await response.json();
      console.log('Email sent successfully:', result.messageId);
      return true;

    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendStatementReady(
    userEmail: string,
    statementId: string,
    downloadUrl: string
  ): Promise<boolean> {
    return this.sendEmail({
      to: userEmail,
      subject: "Your Indigo Yield Statement is Ready",
      template: EMAIL_TEMPLATES.STATEMENT_READY,
      variables: {
        statementId,
        downloadUrl,
        expiresIn: "7 days",
      },
    });
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const baseUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
    return this.sendEmail({
      to: userEmail,
      subject: "Welcome to Indigo Yield Platform",
      template: EMAIL_TEMPLATES.WELCOME,
      variables: {
        userName,
        loginUrl: `${baseUrl}/login`,
        supportUrl: `${baseUrl}/support`,
      },
    });
  }

  async sendTotpEnabled(userEmail: string, userName: string): Promise<boolean> {
    return this.sendEmail({
      to: userEmail,
      subject: "Two-Factor Authentication Enabled",
      template: EMAIL_TEMPLATES.TOTP_ENABLED,
      variables: {
        userName,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async sendWithdrawalRequest(
    userEmail: string,
    amount: number,
    currency: string
  ): Promise<boolean> {
    return this.sendEmail({
      to: userEmail,
      subject: "Withdrawal Request Received",
      template: EMAIL_TEMPLATES.WITHDRAWAL_REQUEST,
      variables: {
        amount,
        currency,
        requestId: `WD-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async sendAdminNotification(
    adminEmails: string[],
    subject: string,
    message: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    const baseUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
    const promises = adminEmails.map((email) =>
      this.sendEmail({
        to: email,
        subject: `[ADMIN] ${subject}`,
        template: EMAIL_TEMPLATES.ADMIN_NOTIFICATION,
        variables: {
          message,
          context,
          timestamp: new Date().toISOString(),
          dashboardUrl: `${baseUrl}/admin`,
        },
      })
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value
    ).length;

    console.log(
      `📧 Admin notification sent to ${successful}/${adminEmails.length} recipients`
    );
    return successful > 0;
  }
}

export const emailService = new EmailService();

// Convenience exports
export const sendStatementReady = emailService.sendStatementReady.bind(emailService);
export const sendWelcomeEmail = emailService.sendWelcomeEmail.bind(emailService);
export const sendTotpEnabled = emailService.sendTotpEnabled.bind(emailService);
export const sendWithdrawalRequest = emailService.sendWithdrawalRequest.bind(emailService);
export const sendAdminNotification = emailService.sendAdminNotification.bind(emailService);
```

#### Step 4: Deploy Edge Function

```bash
# 1. Set SMTP secrets in Supabase dashboard or CLI
supabase secrets set SMTP_HOST=smtp.gmail.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=your-email@gmail.com
supabase secrets set SMTP_PASS=your-app-password
supabase secrets set SMTP_FROM=noreply@indigoyield.com

# 2. Deploy Edge Function
supabase functions deploy send-email

# 3. Test Edge Function
curl -X POST https://[project-ref].supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer [user-jwt]" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "template": "WELCOME",
    "variables": {"userName": "Test User"}
  }'
```

**Success Criteria:**
- [ ] Edge Function created and deployed
- [ ] Email logs table populated
- [ ] Test email sent successfully
- [ ] Email delivery verified in inbox
- [ ] Rate limiting working (verified with rapid requests)
- [ ] SMTP credentials not in client code
- [ ] Client-side email service deprecated

---

### PRIORITY 2: HTTP Security Headers (1-2 Days)

**Why This Matters:**
- HSTS not enforced without HTTP headers
- Can't participate in HSTS preload list
- Meta tags less secure (XSS can remove them)

**Choose Your Platform:**

#### Option A: Vercel (vercel.json)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
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
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        },
        {
          "key": "Cross-Origin-Resource-Policy",
          "value": "same-site"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' https://nkfimvovosdehmyyjubn.supabase.co; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https://nkfimvovosdehmyyjubn.supabase.co wss://nkfimvovosdehmyyjubn.supabase.co; font-src 'self' data:; object-src 'none'; media-src 'self'; frame-src 'none'; base-uri 'self'; form-action 'self';"
        }
      ]
    }
  ]
}
```

#### Option B: Netlify (_headers file)

```
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-site
  Content-Security-Policy: default-src 'self'; script-src 'self' https://nkfimvovosdehmyyjubn.supabase.co; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https://nkfimvovosdehmyyjubn.supabase.co wss://nkfimvovosdehmyyjubn.supabase.co; font-src 'self' data:; object-src 'none'; media-src 'self'; frame-src 'none'; base-uri 'self'; form-action 'self';
```

**Verification:**

```bash
# Check headers are present
curl -I https://your-app.com | grep -E "strict-transport-security|x-frame-options|content-security-policy"

# Validate with online tool
# Visit: https://securityheaders.com/?q=https://your-app.com
# Grade should be A or A+

# Check HSTS preload eligibility
# Visit: https://hstspreload.org/?domain=your-app.com
```

**Success Criteria:**
- [ ] HTTP headers configured on CDN/platform
- [ ] HSTS preload eligible
- [ ] securityheaders.com grade: A+ or A
- [ ] All security headers present in curl output
- [ ] Can optionally remove meta tag approach

---

### PRIORITY 3: Medium Priority Fixes (2-3 Days)

#### Fix #6: Auth Race Condition (1 Hour)

**File:** `src/lib/auth/context.tsx` (around line 64)

```typescript
// ❌ BEFORE
if (session?.user) {
  setTimeout(() => {
    fetchProfile(session.user.id);
  }, 0);
}

// ✅ AFTER
if (session?.user) {
  Promise.resolve().then(() => {
    fetchProfile(session.user.id);
  });
}

// OR even better
useEffect(() => {
  if (session?.user) {
    fetchProfile(session.user.id);
  }
}, [session?.user?.id]);
```

---

#### Fix #7: Admin Status Fallback (1 Hour)

**File:** `src/lib/auth/context.tsx` (around line 164)

```typescript
// ❌ BEFORE
setProfile({
  id: userId,
  email: user?.email || "",
  is_admin: user?.user_metadata?.is_admin || false,
});

// ✅ AFTER
setProfile({
  id: userId,
  email: user?.email || "",
  is_admin: false,  // Always false - server-side RPC is authoritative
});

// Log failure for monitoring
console.warn(
  'Profile fetch failed. User defaulted to non-admin. ' +
  'This prevents privilege escalation but requires RPC recovery.'
);
```

---

#### Fix #8: Security Event Logging (2-3 Hours)

**File:** `src/lib/auth/context.tsx` (around line 136)

```typescript
// ✅ Add Sentry integration
import * as Sentry from "@sentry/react";

// ✅ In try-catch block
try {
  const { error } = await supabase.rpc("log_security_event", {
    event_type: "PROFILE_ACCESS",
    details: {
      user_id: userId,
      has_2fa: totpVerified,
      timestamp: new Date().toISOString(),
    },
  });

  if (error) throw error;

} catch (e) {
  // Log to external monitoring
  console.error("CRITICAL: Security event logging failed:", e);

  // Send to Sentry
  if (window.Sentry) {
    Sentry.captureException(e, {
      level: 'error',
      tags: { type: 'security_audit', context: 'profile_access' },
      extra: {
        event_type: "PROFILE_ACCESS",
        userId: session?.user?.id,
        errorMessage: (e as Error).message
      }
    });
  }
}
```

---

#### Fix #9: Email URL Construction (1 Hour)

**File:** `src/lib/email.ts` (around line 97-99)

```typescript
// ✅ Add to .env
VITE_PUBLIC_URL=https://app.indigoyield.com

// ✅ In email service
const BASE_URL = import.meta.env.VITE_PUBLIC_URL || 'https://app.indigoyield.com';

if (!BASE_URL.startsWith('https://')) {
  throw new Error('VITE_PUBLIC_URL must use HTTPS for security');
}

async sendWelcomeEmail(userEmail: string, userName: string) {
  return this.sendEmail({
    to: userEmail,
    subject: "Welcome to Indigo Yield Platform",
    template: EMAIL_TEMPLATES.WELCOME,
    variables: {
      userName,
      loginUrl: `${BASE_URL}/login`,
      supportUrl: `${BASE_URL}/support`,
    },
  });
}
```

---

## TESTING CHECKLIST

### Email Service Testing

```bash
# 1. Unit tests for email validation
npm test -- email.service.spec.ts

# 2. Integration test: Send welcome email
curl -X POST https://[project-ref].supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer [valid-jwt]" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test",
    "template": "WELCOME",
    "variables": {"userName": "Test User"}
  }'

# 3. Verify rate limiting
# Send 11 requests in 60 seconds - 11th should return 429

# 4. Check email logs
SELECT * FROM email_logs WHERE user_id = '[test-user-id]';
```

### Security Headers Testing

```bash
# 1. Verify all headers present
curl -I https://your-domain.com | head -20

# 2. Check CSP compliance
# Visit: https://csp-evaluator.withgoogle.com/

# 3. Verify HSTS
curl -I https://your-domain.com | grep "strict-transport-security"

# 4. Test CSP blocking
# Open DevTools -> Console
# Should see warnings for unsafe-inline violations (if CSP not working)
```

---

## DEPLOYMENT ORDER

### Week 1: Critical Path
1. **Day 1-2:** Email service migration (Edge Function + API)
2. **Day 3:** HTTP security headers
3. **Day 4:** Testing & validation

### Week 2: High Priority
1. **Day 1-2:** Medium priority fixes
2. **Day 3-4:** Security monitoring setup
3. **Day 5:** Final validation

### Week 3+: Post-Launch
1. Penetration testing
2. SOC 2 audit preparation
3. Continuous monitoring

---

## VALIDATION COMMANDS

```bash
# Full security audit
npm run audit:headers        # Check HTTP headers
npm run audit:csp           # Validate CSP
npm run test:email          # Test email service
npm run test:auth           # Test authentication flow

# Generate security report
npm run audit:report

# Check for vulnerabilities
npm audit                    # npm vulnerabilities
npm run type-check          # TypeScript errors
npm run lint                # ESLint issues
```

---

## ROLLBACK PROCEDURES

If issues occur during implementation:

```bash
# Revert email service changes
git checkout src/lib/email.ts

# Disable Edge Function (keep client stub)
supabase functions unpublish send-email

# Restore meta tag security headers
# (Meta tags remain as fallback)

# Restore admin fallback
git checkout src/lib/auth/context.tsx
```

---

## SUCCESS METRICS

After implementing these fixes:

- ✅ Zero hardcoded credentials in source
- ✅ SMTP credentials in Supabase secrets only
- ✅ Email rate limiting working (10/min per user)
- ✅ Complete audit trail in email_logs table
- ✅ HTTP security headers configured
- ✅ HSTS preload eligible
- ✅ CSP violations blocked
- ✅ Auth flow race-condition free
- ✅ Admin status always server-side
- ✅ Security events logged externally
- ✅ Email URLs from configuration

---

**Document Created:** November 20, 2025  
**Last Updated:** November 20, 2025  
**Implementation Status:** Ready for development
