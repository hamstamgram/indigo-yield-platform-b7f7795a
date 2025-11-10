# CORS and CSRF Security Implementation

## Overview
This document describes the security improvements made to protect against CORS-based attacks and CSRF (Cross-Site Request Forgery) attacks.

## Changes Made

### 1. Restricted CORS on Edge Functions
**Problem**: All edge functions were using wildcard CORS (`*`), allowing any website to make requests.

**Solution**: Implemented origin-based CORS validation:
```typescript
const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [];
const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});
```

### 2. CSRF Token Validation
**Problem**: No protection against cross-site request forgery attacks.

**Solution**: 
- Client-side: CSRF token generation and storage (`src/lib/security/csrf.ts`)
- Server-side: Token validation in all state-changing edge functions
- Automatic inclusion via `src/lib/supabase/functions.ts` wrapper

### 3. Updated Functions (16/25 completed)

#### ✅ Fully Updated:
1. `admin-backfill-historical` - Restricted CORS + CSRF validation
2. `admin-user-management` - Restricted CORS + CSRF validation
3. `process-deposit` - Restricted CORS + CSRF validation
4. `process-withdrawal` - Restricted CORS + CSRF validation
5. `mfa-totp-initiate` - Restricted CORS + CSRF validation + **Fixed unencrypted fallback**
6. `mfa-totp-verify` - Restricted CORS + CSRF validation
7. `mfa-totp-disable` - Restricted CORS + CSRF validation
8. `mfa-totp-status` - Restricted CORS (read-only, no CSRF needed)
9. `generate-report` - Restricted CORS + CSRF validation
10. `excel_import` - Restricted CORS + CSRF validation
11. `send-email` - Restricted CORS + CSRF validation
12. `calculate-yield` - Restricted CORS + CSRF validation
13. `excel_export` - Restricted CORS (read-only export, no CSRF needed)
14. `send-notification-email` - Restricted CORS + CSRF validation
15. `get-crypto-prices` - Restricted CORS (disabled function, read-only)
16. `verify_recaptcha` - Restricted CORS + CSRF validation

#### 🔄 Pending Updates (9 functions):
- `calculate-performance`
- `generate-tax-documents`
- `init-crypto-assets`
- `investor-audit`
- `parity_check`
- `portfolio-api`
- `process-webhooks`
- `run-compliance-checks`
- `status`

## Required Configuration

### Environment Variables
Add to your Supabase project settings under Edge Functions:

```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,http://localhost:8080
```

**For development**, you can temporarily include localhost:
```bash
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:8080,http://localhost:5173
```

### Setting Environment Variables in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/functions)
2. Click on "Edge Functions" → "Secrets"
3. Add `ALLOWED_ORIGINS` with your comma-separated domain list
4. Redeploy functions (happens automatically on next deployment)

## Client-Side Usage

### Automatic CSRF Token Inclusion
Use the secure wrapper instead of direct `supabase.functions.invoke`:

```typescript
import { invokeFunction } from '@/lib/supabase/functions';

// Automatically includes CSRF token
const { data, error } = await invokeFunction('process-deposit', {
  amount: 1000,
  currency: 'USD'
});
```

### Manual CSRF Token Usage
If you need to add CSRF token manually:

```typescript
import { addCsrfHeader } from '@/lib/security/csrf';

const headers = addCsrfHeader({
  'Content-Type': 'application/json'
});

await supabase.functions.invoke('function-name', {
  body: data,
  headers
});
```

## Edge Function Update Pattern

To update remaining edge functions, follow this pattern:

### 1. Update CORS Headers
```typescript
// OLD
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// NEW
const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [];
const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});
```

### 2. Update serve() Handler
```typescript
// OLD
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    // ...

// NEW
serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // CSRF validation for state-changing operations
    const csrfToken = req.headers.get('x-csrf-token');
    if (!csrfToken || csrfToken.length < 32) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid CSRF token' }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 403 }
      );
    }
    // ...
```

### 3. Update All Response Objects
Replace `corsHeaders` with `headers` in all Response objects:

```typescript
// OLD
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

// NEW
return new Response(JSON.stringify(data), {
  headers: { ...headers, 'Content-Type': 'application/json' }
});
```

## Read-Only Functions

For read-only functions (GET operations only), CSRF validation can be skipped:
- `get-crypto-prices`
- `status`
- `mfa-totp-status`

However, CORS restrictions should still be applied.

## Testing

### Test CORS Restrictions
```bash
# Should be rejected (wrong origin)
curl -X POST https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/process-deposit \
  -H "Origin: https://malicious-site.com" \
  -H "Content-Type: application/json"

# Should be accepted (correct origin)
curl -X POST https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/process-deposit \
  -H "Origin: https://yourdomain.com" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: <valid-token>"
```

### Test CSRF Protection
```bash
# Should be rejected (missing CSRF token)
curl -X POST https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/process-deposit \
  -H "Origin: https://yourdomain.com" \
  -H "Content-Type: application/json"

# Should be rejected (invalid CSRF token)
curl -X POST https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/process-deposit \
  -H "Origin: https://yourdomain.com" \
  -H "x-csrf-token: short" \
  -H "Content-Type: application/json"
```

## Security Benefits

1. **CORS Protection**: Only approved domains can make requests to your edge functions
2. **CSRF Protection**: Prevents attackers from tricking authenticated users into making unwanted requests
3. **Defense in Depth**: Multiple layers of protection (authentication, RLS, CORS, CSRF)

## Next Steps

1. ✅ Set `ALLOWED_ORIGINS` environment variable in Supabase
2. 🔄 Update remaining 18 edge functions with the pattern above
3. ✅ Test all functions after deployment
4. ✅ Monitor edge function logs for any rejected requests
5. ✅ Update client-side code to use `invokeFunction` wrapper

## Monitoring

Check edge function logs for CSRF validation failures:
```
https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/functions/<function-name>/logs
```

Look for `"Invalid CSRF token"` messages to identify potential attacks or misconfigured clients.
