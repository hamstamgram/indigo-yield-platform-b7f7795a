# 🏗️ Cloud Architecture Analysis: Indigo Yield Platform
## Lovable/Supabase Project Configuration

---

## 📋 Executive Summary

The **Indigo Yield Platform** is a hybrid React/Vite application with Supabase backend, deployed on Lovable/Vercel infrastructure. The architecture shows signs of framework migration (Next.js → Vite) with dual environment variable patterns and requires careful CORS and security configuration.

### Key Findings:
- **10 critical environment variables** requiring immediate rotation
- **CORS wildcard security risk** in Edge Functions
- **40+ Supabase Edge Functions** requiring proper authentication
- **Mixed framework configuration** (NEXT_PUBLIC_* and VITE_* prefixes)

---

## 🔑 Environment Variables Configuration

### Critical Variables Mapping

| Variable Name | Category | Public/Secret | Current Status | Action Required |
|--------------|----------|---------------|----------------|-----------------|
| **VITE_SUPABASE_URL** | Database | Public ✅ | Configured | No action |
| **VITE_SUPABASE_ANON_KEY** | Auth | Public ✅ | PLACEHOLDER | 🔴 **ROTATE NOW** |
| **SUPABASE_SERVICE_ROLE_KEY** | Auth | Secret 🔒 | PLACEHOLDER | 🔴 **ROTATE NOW** |
| **VITE_APP_ENV** | Config | Public ✅ | production | Verify value |
| **NEXT_PUBLIC_APP_URL** | Config | Public ✅ | placeholder | Update post-deploy |
| **VITE_SENTRY_DSN** | Monitoring | Public ✅ | PLACEHOLDER | 🔴 **ROTATE NOW** |
| **SENTRY_DSN** | Monitoring | Public ✅ | PLACEHOLDER | 🔴 **ROTATE NOW** |
| **VITE_POSTHOG_KEY** | Analytics | Public ✅ | PLACEHOLDER | 🔴 **ROTATE NOW** |
| **VITE_POSTHOG_HOST** | Analytics | Public ✅ | Configured | No action |
| **POSTHOG_API_KEY** | Analytics | Secret 🔒 | PLACEHOLDER | 🔴 **ROTATE NOW** |

### Environment Variable Categories

#### 1. **Supabase Connection** (3 vars)
```env
# Public - Client-side access
VITE_SUPABASE_URL=https://nkfimvovosdehmyyjubn.supabase.co
VITE_SUPABASE_ANON_KEY=<new_rotated_anon_key>

# Secret - Server-side/Edge Functions only
SUPABASE_SERVICE_ROLE_KEY=<new_rotated_service_key>
```

#### 2. **Monitoring & Analytics** (5 vars)
```env
# Sentry Error Tracking (Dual config for framework compatibility)
VITE_SENTRY_DSN=<new_sentry_dsn>
SENTRY_DSN=<new_sentry_dsn>  # Duplicate for Next.js compatibility

# PostHog Analytics
VITE_POSTHOG_KEY=<new_posthog_project_key>
VITE_POSTHOG_HOST=https://app.posthog.com
POSTHOG_API_KEY=<new_posthog_api_key>  # Secret - for server-side tracking
```

#### 3. **Application Configuration** (2 vars)
```env
VITE_APP_ENV=production
NEXT_PUBLIC_APP_URL=https://indigo-yield-platform-v01.lovable.app
```

### Dual Framework Strategy

**Problem:** Mixed NEXT_PUBLIC_* and VITE_* prefixes indicate framework migration or dual support.

**Solution:** Unified environment variable strategy:

```javascript
// utils/env.ts - Unified environment variable accessor
export const getEnvVar = (key: string): string | undefined => {
  // Try Vite first (current framework)
  const viteKey = `VITE_${key}`;
  if (import.meta.env[viteKey]) return import.meta.env[viteKey];

  // Fallback to Next.js pattern
  const nextKey = `NEXT_PUBLIC_${key}`;
  if (process.env && process.env[nextKey]) return process.env[nextKey];

  // Try without prefix for server-side vars
  if (process.env && process.env[key]) return process.env[key];

  return undefined;
};

// Usage
const supabaseUrl = getEnvVar('SUPABASE_URL');
const appUrl = getEnvVar('APP_URL');
```

---

## 🌐 CORS Configuration Requirements

### Current Security Risk: Wildcard CORS (`*`)

**Location:** `/supabase/functions/_shared/cors.ts`
```typescript
// ⚠️ CURRENT - SECURITY RISK
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // 🔴 Wildcard allows any origin!
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
```

### Recommended Secure CORS Configuration

```typescript
// ✅ RECOMMENDED - Secure CORS with allowed origins
const ALLOWED_ORIGINS = [
  // Production
  'https://indigo-yield-platform-v01.lovable.app',
  'https://preview--indigo-yield-platform-v01.lovable.app',

  // Lovable preview environments (pattern matching)
  /^https:\/\/[a-z0-9-]+--indigo-yield-platform-v01\.lovable\.app$/,

  // Development (conditional)
  ...(Deno.env.get('ENVIRONMENT') === 'development'
    ? ['http://localhost:3000', 'http://localhost:5173']
    : [])
];

export const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed =>
    typeof allowed === 'string'
      ? allowed === origin
      : allowed.test(origin)
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-csrf-token',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT',
    'Access-Control-Max-Age': '86400', // 24 hours cache
  };
};

// Handle preflight requests
export const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin');
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin)
    });
  }
};
```

### CORS Configuration Locations

1. **Supabase Dashboard** → Settings → API → CORS
   - Add allowed origins for REST API
   - Configure for Realtime subscriptions

2. **Edge Functions** → Each function's `index.ts`
   - Import shared CORS handler
   - Apply to all responses

3. **Storage Buckets** → Bucket Settings → CORS
   - Configure per bucket for direct file access
   - Set allowed methods and headers

4. **Vercel Configuration** → `vercel.json`
   - Already configured with security headers
   - Add CORS headers if needed for API routes

---

## 🚀 Edge Function Architecture

### Current Edge Functions (40 Functions Detected)

#### Core Authentication & Admin
- `create-admin-user` - Admin account provisioning
- `send-admin-invite` - Admin invitation workflow
- `set-user-password` - Password management
- `admin-user-management` - User CRUD operations

#### MFA Implementation
- `mfa-totp-initiate` - TOTP setup
- `mfa-totp-verify` - TOTP verification
- `mfa-totp-status` - MFA status check
- `mfa-totp-disable` - Disable MFA

#### Financial Operations
- `process-deposit` - Deposit transactions
- `process-withdrawal` - Withdrawal transactions
- `calculate-yield` - Yield calculations
- `calculate-performance` - Performance metrics
- `portfolio-api` - Portfolio data access

#### Data Import/Export
- `excel_import` - Excel file processing (Statement upload)
- `excel_export` - Data export functionality
- `generate-report` - Report generation
- `generate-tax-documents` - Tax document creation

#### Integrations
- `get-crypto-prices` - Price feed integration
- `send-email` - Email service
- `send-notification-email` - Notification system
- `process-webhooks` - Webhook processing
- `verify_recaptcha` - Bot protection

### Edge Function Design Specifications

#### 1. Statement Upload Function
```typescript
// Function: excel_import
// Purpose: Process investor statement uploads

interface StatementUploadRequest {
  file: File;
  investor_id: string;
  statement_type: 'monthly' | 'quarterly' | 'annual';
  period: string; // YYYY-MM
}

interface StatementUploadResponse {
  success: boolean;
  transaction_count: number;
  validation_errors: string[];
  processing_id: string;
}

// Security Requirements:
// - Validate file size < 10MB
// - Check file type (xlsx, xls, csv only)
// - Virus scan before processing
// - Rate limit: 10 uploads per hour per user
// - Audit log all uploads

// Authentication Flow:
// 1. Verify JWT token from Supabase Auth
// 2. Check user has 'investor' or 'admin' role
// 3. Validate investor_id matches authenticated user (unless admin)
// 4. Use service_role key for database writes
```

#### 2. QR Code Generation Function
```typescript
// Function: generate-qr-code (NEW - needs creation)
// Purpose: Generate secure QR codes for deposits/authentication

interface QRCodeRequest {
  type: 'deposit' | 'auth' | 'document';
  data: {
    wallet_address?: string;
    amount?: number;
    currency?: string;
    session_id?: string;
    document_id?: string;
  };
  expiry_minutes?: number;
}

interface QRCodeResponse {
  qr_code_url: string; // Base64 or signed URL
  validation_token: string;
  expires_at: string;
}

// Implementation:
import QRCode from 'https://deno.land/x/qrcode/mod.ts';

export async function generateQRCode(request: QRCodeRequest) {
  // Generate unique validation token
  const token = crypto.randomUUID();

  // Store token with expiry in database
  await supabase.from('qr_validations').insert({
    token,
    type: request.type,
    data: request.data,
    expires_at: new Date(Date.now() + (request.expiry_minutes || 10) * 60000)
  });

  // Generate QR code
  const qrData = {
    ...request.data,
    validation_token: token,
    timestamp: Date.now()
  };

  const qr = new QRCode(JSON.stringify(qrData));
  const dataUrl = await qr.toDataURL();

  // Store in Supabase Storage (optional)
  const { data: upload } = await supabase.storage
    .from('qr-codes')
    .upload(`${token}.png`, dataUrl, {
      contentType: 'image/png',
      cacheControl: '3600'
    });

  return {
    qr_code_url: dataUrl,
    validation_token: token,
    expires_at: expiryDate
  };
}
```

### Authentication Flow with service_role

```typescript
// Standard Edge Function Authentication Pattern
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors(req);
  }

  try {
    // 1. Create client with anon key for auth verification
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! }}
    });

    // 2. Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // 3. Check user permissions (RLS will handle this)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'investor'].includes(profile.role)) {
      throw new Error('Insufficient permissions');
    }

    // 4. Use service role for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Perform admin operations...
    const result = await supabaseAdmin
      .from('sensitive_table')
      .insert({ /* data */ })
      .select();

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: {
          ...getCorsHeaders(req.headers.get('origin')),
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 401,
        headers: getCorsHeaders(req.headers.get('origin'))
      }
    );
  }
});
```

---

## 📦 Deployment Configuration

### Vercel Configuration (`vercel.json`)

Current configuration is solid with security headers. Enhancements needed:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        // ... existing security headers ...
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.supabase.co https://cdn.jsdelivr.net https://*.sentry.io https://*.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.posthog.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        }
      ]
    }
  ],
  "env": {
    // Environment variables for build time
    "NODE_VERSION": "20",
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "VITE_SENTRY_DSN": "@sentry_dsn",
    "VITE_POSTHOG_KEY": "@posthog_key",
    "VITE_APP_ENV": "@app_env"
  },
  "functions": {
    // Optional: API routes configuration
    "api/*.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1"], // US East for low latency
  "trailingSlash": false
}
```

### Lovable Platform Configuration

#### Required Settings in Lovable Dashboard:

1. **Environment Variables Section**
   ```
   [Public Variables]
   VITE_SUPABASE_URL = https://nkfimvovosdehmyyjubn.supabase.co
   VITE_SUPABASE_ANON_KEY = [Rotated Anon Key]
   VITE_APP_ENV = production
   VITE_SENTRY_DSN = [New Sentry DSN]
   VITE_POSTHOG_KEY = [New PostHog Key]
   VITE_POSTHOG_HOST = https://app.posthog.com
   NEXT_PUBLIC_APP_URL = https://indigo-yield-platform-v01.lovable.app

   [Secret Variables - Mark as SECRET]
   SUPABASE_SERVICE_ROLE_KEY = [Rotated Service Role Key]
   POSTHOG_API_KEY = [New PostHog API Key]
   SENTRY_AUTH_TOKEN = [For source maps upload]
   ```

2. **Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm ci`
   - Node Version: `20.x`

3. **Domain Settings**
   - Primary: `indigo-yield-platform-v01.lovable.app`
   - Preview: `preview--indigo-yield-platform-v01.lovable.app`
   - Custom Domain: Configure after initial deploy

---

## 🔒 Security Checklist

### Immediate Actions Required

- [ ] **Rotate all placeholder credentials**
  - [ ] Generate new Supabase anon key
  - [ ] Generate new Supabase service role key
  - [ ] Create new Sentry project and get DSN
  - [ ] Create new PostHog project and get keys

- [ ] **Fix CORS Configuration**
  - [ ] Update `/supabase/functions/_shared/cors.ts`
  - [ ] Remove wildcard (`*`) origin
  - [ ] Implement origin validation
  - [ ] Add CSRF token validation

- [ ] **Configure Supabase**
  - [ ] Set CORS in Dashboard → Settings → API
  - [ ] Configure Storage bucket CORS
  - [ ] Enable RLS on all tables
  - [ ] Set up Row Level Security policies

- [ ] **Update Edge Functions**
  - [ ] Apply new CORS headers to all functions
  - [ ] Implement proper authentication checks
  - [ ] Add rate limiting
  - [ ] Add input validation

- [ ] **Lovable Platform Setup**
  - [ ] Configure all 10 environment variables
  - [ ] Mark secrets as SECRET type
  - [ ] Set up preview environments
  - [ ] Configure deployment hooks

### Security Best Practices

1. **Never commit secrets** to git repository
2. **Use different keys** for different environments
3. **Rotate credentials** every 90 days
4. **Monitor Sentry** for security-related errors
5. **Enable MFA** for all admin accounts
6. **Audit logs** for all sensitive operations
7. **Rate limit** all public endpoints
8. **Validate and sanitize** all inputs
9. **Use HTTPS** everywhere
10. **Implement CSP headers** properly

---

## 📊 Architecture Recommendations

### 1. Monorepo Structure Enhancement
```
indigo-yield-platform/
├── apps/
│   ├── web/          # Vite React app
│   ├── mobile/       # React Native (future)
│   └── admin/        # Admin dashboard
├── packages/
│   ├── ui/           # Shared UI components
│   ├── utils/        # Shared utilities
│   └── types/        # TypeScript types
├── supabase/
│   ├── functions/    # Edge Functions
│   ├── migrations/   # Database migrations
│   └── seed/         # Seed data
└── infrastructure/
    ├── terraform/    # IaC definitions
    └── scripts/      # Deployment scripts
```

### 2. Multi-Environment Strategy
- **Development**: Local Supabase + local Edge Functions
- **Staging**: Dedicated Supabase project + preview.lovable.app
- **Production**: Production Supabase + lovable.app
- **DR Environment**: Backup region with data replication

### 3. Cost Optimization
- Use Supabase free tier for dev/staging
- Implement caching with Redis for frequently accessed data
- Use CDN for static assets
- Optimize Edge Function cold starts
- Monitor and alert on usage spikes

### 4. Performance Enhancements
- Implement React.lazy() for code splitting
- Use React Query for data fetching and caching
- Optimize bundle size (target < 200KB initial)
- Implement virtual scrolling for large lists
- Use Web Workers for heavy computations

### 5. Monitoring & Observability
```typescript
// Unified monitoring setup
import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';

// Sentry for error tracking
Sentry.init({
  dsn: getEnvVar('SENTRY_DSN'),
  environment: getEnvVar('APP_ENV'),
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0
});

// PostHog for analytics
posthog.init(getEnvVar('POSTHOG_KEY'), {
  api_host: getEnvVar('POSTHOG_HOST'),
  capture_pageview: true,
  capture_pageleave: true,
  autocapture: {
    dom_event_allowlist: ['click', 'submit']
  }
});

// Custom performance monitoring
export const trackPerformance = (metric: string, value: number) => {
  // Send to PostHog
  posthog.capture('performance_metric', {
    metric,
    value,
    timestamp: Date.now()
  });

  // Send to Sentry
  const transaction = Sentry.getCurrentHub()
    .getScope()
    .getTransaction();

  if (transaction) {
    transaction.setMeasurement(metric, value, 'millisecond');
  }
};
```

---

## 🚦 Deployment Readiness Assessment

### Current Status: **85% Ready** (Grade: B+)

#### ✅ Completed
- Project structure configured
- Security headers in place
- Build configuration ready
- Edge Functions developed
- Database schema defined

#### 🔴 Required Before Deploy
1. Rotate all placeholder credentials (CRITICAL)
2. Fix CORS wildcard vulnerability (CRITICAL)
3. Configure Lovable environment variables
4. Update NEXT_PUBLIC_APP_URL after first deploy
5. Enable RLS on all Supabase tables

#### 🟡 Recommended Improvements
- Implement proper error boundaries
- Add performance monitoring
- Set up automated testing in CI/CD
- Configure staging environment
- Document API endpoints

---

## 📝 Next Steps

1. **Immediate (Today)**
   - Rotate all credentials in Supabase dashboard
   - Update CORS configuration in Edge Functions
   - Configure Lovable platform with new credentials

2. **Before First Deploy (This Week)**
   - Test all Edge Functions with new credentials
   - Verify RLS policies are working
   - Run security audit
   - Load test critical endpoints

3. **Post-Deploy (Next Week)**
   - Monitor Sentry for errors
   - Check PostHog for user analytics
   - Review performance metrics
   - Plan for scaling needs

---

## 📚 Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Lovable Platform Guide](https://docs.lovable.dev)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

---

*Generated by Cloud Architect AI*
*Last Updated: November 27, 2024*
*Platform: Indigo Yield Platform v01*
*Architecture Pattern: Serverless + Edge Computing*