# Environment Variables Inventory

## Vercel Environment Variables (from vercel env ls)
- ✅ VITE_MAILERLITE_API_TOKEN (Development, Preview, Production)
- ✅ SUPABASE_SERVICE_ROLE_KEY (Preview only)
- ✅ VITE_SUPABASE_ANON_KEY (Development, Preview, Production)
- ✅ VITE_SUPABASE_URL (Development, Preview, Production)
- ✅ POSTGRES_URL (Production)
- ✅ POSTGRES_PRISMA_URL (Production)
- ✅ POSTGRES_URL_NON_POOLING (Production)
- ✅ POSTGRES_USER (Production)
- ✅ POSTGRES_HOST (Production)
- ✅ POSTGRES_PASSWORD (Production)
- ✅ POSTGRES_DATABASE (Production)
- ✅ SUPABASE_ANON_KEY (Production)

## Local Environment Files
- `.env` - Development configuration
- `.env.local` - Local overrides (from Vercel)
- `.env.example` - Template configuration
- `.env.phase3` - Phase 3 specific config
- `.env.pwa` - PWA configuration

## Required for Audit
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_ANON_KEY
- ⚠️ VITE_SENTRY_DSN (present in .env but not in Vercel preview)
- ⚠️ VITE_POSTHOG_API_KEY (not configured in Vercel)
- ⚠️ VITE_POSTHOG_HOST (not configured in Vercel)

## Test Credentials (for E2E tests)
- ❌ TEST_ADMIN_EMAIL (not configured)
- ❌ TEST_ADMIN_PASSWORD (not configured)
- ❌ TEST_LP_EMAIL (not configured)
- ❌ TEST_LP_PASSWORD (not configured)

## Status
- **Preview URL**: https://indigo-yield-platform-v01-3jwtng7hy-hamstamgrams-projects.vercel.app
- **Note**: Preview deployments are protected by Vercel authentication
- **Action Required**: 
  - Add VITE_SENTRY_DSN to Vercel preview environment
  - Add VITE_POSTHOG_* variables for analytics
  - Configure test user credentials for automated E2E testing
