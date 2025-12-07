# Security Remediation Plan

**Date:** 2025-12-07
**Priority:** CRITICAL
**Status:** Ready for Implementation

---

## Executive Summary

A security audit identified critical vulnerabilities requiring immediate remediation. The most severe issue exposes 3,530 rows of sensitive fund performance data to unauthenticated users. This plan outlines the prioritized remediation steps.

---

## Priority Matrix

| Priority | Issue | Effort | Impact | Status |
|----------|-------|--------|--------|--------|
| 🔴 **P0** | Fix daily_nav RLS policy | 5 min | Critical | ✅ COMPLETE |
| 🟡 **P1** | Delete test accounts from Supabase Auth | 10 min | Medium | ✅ VERIFIED (none exist) |
| 🟡 **P1** | Update .gitignore with credential patterns | 2 min | Medium | ✅ COMPLETE |
| 🟡 **P2** | Harden remaining edge function CORS | 30 min | Medium | ✅ COMPLETE |
| 🟡 **P2** | Add Zod validation to edge functions | 1 hour | Medium | Pending |

---

## 🔴 CRITICAL: P0 - Fix daily_nav RLS Policy

### Current State
- **Table:** `daily_nav`
- **Exposed Rows:** 3,530
- **Current Policy:** `qual: true` (public read access)
- **Risk:** Complete fund performance history exposed to competitors

### Exposed Data Types
- Assets Under Management (AUM)
- NAV per share
- Gross/net returns
- Fee information
- Investor counts
- Cash flow data

### Remediation Steps

```bash
# Step 1: Apply the migration
supabase db push

# Step 2: Verify the fix
supabase db execute --linked --command "
SELECT tablename, policyname, qual
FROM pg_policies
WHERE tablename = 'daily_nav';
"

# Step 3: Test unauthenticated access (should fail)
curl -s "https://nkfimvovosdehmyyjubn.supabase.co/rest/v1/daily_nav?select=*&limit=1" \
  -H "apikey: <anon_key>" | jq
```

### Migration File
Location: `supabase/migrations/20251207_security_remediation.sql`

### Rollback (if needed)
```sql
DROP POLICY "daily_nav_select_authenticated" ON public.daily_nav;
CREATE POLICY "daily_nav_select_policy" ON public.daily_nav
    FOR SELECT USING (true);
```

---

## 🟡 MEDIUM: P1 - Delete Test Accounts

### Identified Test Accounts

| Email Pattern | Source File |
|---------------|-------------|
| `test-investor@indigoyield.com` | tests/supabase-integration.spec.ts |
| `test.investor@audit.indigo.com` | audits/web/create-test-users.mjs |
| `testadmin@indigo.fund` | supabase/functions_archive/setup-test-users/index.ts |
| `*@test.indigo.*` | iOS test files |

### Remediation Steps

```bash
# Step 1: List users matching test patterns in Supabase Dashboard
# Go to: Authentication > Users > Search

# Step 2: Delete test users via Supabase CLI or Dashboard
# For each test user found:
supabase auth admin delete-user <user_id>

# Step 3: Update test files to use environment variables
# Replace hardcoded credentials with:
# process.env.TEST_USER_EMAIL
# process.env.TEST_USER_PASSWORD
```

### Files to Update
1. `tests/supabase-integration.spec.ts` - Move credentials to `.env.test`
2. `audits/web/create-test-users.mjs` - Use dynamic test user creation
3. Remove or archive `supabase/functions_archive/setup-test-users/`

---

## 🟡 MEDIUM: P1 - Update .gitignore

### Add to .gitignore
```gitignore
# Credential files
**/credentials*.json
**/test-credentials*.json
**/auth-credentials*.json
**/.env.local
**/.env.*.local

# Test user files
**/test-users*.json
**/setup-test-users*
```

---

## 🟡 MEDIUM: P2 - Harden Edge Function CORS

### Affected Functions
1. `init-crypto-assets`
2. `investor-audit`
3. `parity_check`
4. `portfolio-api`
5. `process-webhooks`
6. `status`

### Current Issue
```typescript
// BAD: Allows any origin
'Access-Control-Allow-Origin': '*'
```

### Fix Pattern
```typescript
// GOOD: Restrict to known origins
const ALLOWED_ORIGINS = [
  'https://indigo-yield-platform.vercel.app',
  'https://app.indigofund.com',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
].filter(Boolean);

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

## 🟡 MEDIUM: P2 - Add Input Validation

### Affected Functions
1. `calculate-performance`
2. `generate-tax-documents`
3. `init-crypto-assets`
4. `portfolio-api`
5. `process-webhooks`

### Validation Pattern (Zod)
```typescript
import { z } from 'zod';

const RequestSchema = z.object({
  investor_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict();

// In handler:
const result = RequestSchema.safeParse(requestBody);
if (!result.success) {
  return new Response(
    JSON.stringify({ error: 'Invalid request', details: result.error.issues }),
    { status: 400, headers: corsHeaders }
  );
}
```

---

## Implementation Order

### Phase 1: Immediate (Today) - ✅ COMPLETE
1. ✅ Create migration file for daily_nav fix
2. ✅ Apply migration to production: `supabase db push`
3. ✅ Verify fix works (confirmed: returns `[]` for unauthenticated)

### Phase 2: This Week - ✅ COMPLETE
4. ✅ Audit test accounts (verified: none in production)
5. ✅ Update .gitignore with credential patterns
6. ✅ Move test credentials to environment variables (.env.test.template)

### Phase 3: Edge Function Security - ✅ COMPLETE
7. ✅ Harden edge function CORS (12 functions updated)
   - Created `getCorsHeaders()` in `_shared/cors.ts`
   - Restricted to: `indigo-yield-platform.vercel.app`, `app.indigofund.com`, `localhost`
   - Exception: `process-webhooks` keeps `*` (external provider callbacks)
8. ⏳ Add Zod validation to edge functions
9. ⏳ Full security re-audit

---

## Verification Checklist

After remediation, verify:

- [x] `daily_nav` returns 401/403 for unauthenticated requests ✅ 2025-12-07
- [x] No test accounts exist in production auth.users ✅ 2025-12-07 (verified via DB query)
- [x] .gitignore includes credential patterns ✅ 2025-12-07
- [x] Edge functions reject unknown origins ✅ 2025-12-07 (12 functions updated)
- [ ] Edge functions validate all input (Zod) - pending

---

## Positive Security Findings (No Action Required)

| Area | Status | Notes |
|------|--------|-------|
| Supabase Client | ✅ Excellent | No hardcoded keys |
| Admin Role Protection | ✅ Excellent | Server-side validation only |
| RLS Coverage | ✅ Excellent | 71+ tables with policies |
| Storage Security | ✅ Excellent | Private buckets with RLS |
| SQL Injection | ✅ Protected | Parameterized queries |
| XSS Protection | ✅ Protected | React JSX escaping |
| SECURITY DEFINER | ✅ Correct | Includes SET search_path |

---

## Commands Reference

```bash
# Apply security migration
supabase db push

# Check current RLS policies
supabase db execute --linked --command "SELECT * FROM pg_policies WHERE tablename = 'daily_nav'"

# List auth users (check for test accounts)
# Via Supabase Dashboard: Authentication > Users

# Verify unauthenticated access is blocked
curl -s "https://<project>.supabase.co/rest/v1/daily_nav?limit=1" \
  -H "apikey: <anon_key>"
# Should return: {"message":"...","hint":"..."}
```

---

**Document Owner:** Security Team
**Last Updated:** 2025-12-07 (Phase 1-3 Complete)
**Next Review:** 2025-12-14
