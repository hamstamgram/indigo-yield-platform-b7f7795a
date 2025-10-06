# Indigo Yield Platform - Deployment Guide

This guide provides step-by-step instructions for deploying the backend Edge Functions to Supabase production.

## Prerequisites

Before deploying, ensure you have:

1. **Supabase Access Token** from https://app.supabase.com/account/tokens
2. **Supabase CLI** installed (v2.40.7+)
3. **Git** repository access
4. **Environment variables** configured

## Step 1: Obtain Supabase Access Token

1. Visit https://app.supabase.com/account/tokens
2. Click **Generate new token**
3. Give it a name (e.g., "CLI Deployment Token")
4. Copy the token immediately (you won't be able to see it again)
5. Set it as an environment variable:

```bash
export SUPABASE_ACCESS_TOKEN="sbp_your_token_here"
```

Or add it to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
echo 'export SUPABASE_ACCESS_TOKEN="sbp_your_token_here"' >> ~/.zshrc
source ~/.zshrc
```

## Step 2: Link to Production Project

Link your local project to the Supabase production instance:

```bash
cd ~/Desktop/indigo-yield-platform-v01
supabase link --project-ref nkfimvovosdehmyyjubn
```

You should see:
```
Linked to project nkfimvovosdehmyyjubn
```

## Step 3: Deploy Edge Functions

### Deploy Portfolio API Function

```bash
supabase functions deploy portfolio-api \
  --project-ref nkfimvovosdehmyyjubn \
  --no-verify-jwt
```

Expected output:
```
Deploying function portfolio-api (project ref: nkfimvovosdehmyyjubn)
Function URL: https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/portfolio-api
```

### Deploy Yield Calculation Function

```bash
supabase functions deploy calculate-yield \
  --project-ref nkfimvovosdehmyyjubn \
  --no-verify-jwt
```

Expected output:
```
Deploying function calculate-yield (project ref: nkfimvovosdehmyyjubn)
Function URL: https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/calculate-yield
```

### Deploy All Functions at Once

To deploy all Edge Functions in one command:

```bash
supabase functions deploy --project-ref nkfimvovosdehmyyjubn
```

## Step 4: Set Environment Variables

Edge Functions need environment variables to access the database. Set them using the Supabase CLI:

```bash
# Set Supabase URL
supabase secrets set SUPABASE_URL="https://nkfimvovosdehmyyjubn.supabase.co"

# Set Supabase Anon Key
supabase secrets set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg"
```

Or set them via the Supabase Dashboard:
1. Go to https://app.supabase.com/project/nkfimvovosdehmyyjubn/settings/functions
2. Click on **Edge Function Secrets**
3. Add the environment variables

## Step 5: Test the Deployments

### Test Portfolio API

```bash
curl -X GET \
  'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/portfolio-api' \
  -H 'Authorization: Bearer YOUR_USER_TOKEN' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg'
```

### Test Yield Calculation

```bash
curl -X GET \
  'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/calculate-yield?apply=false' \
  -H 'Authorization: Bearer YOUR_USER_TOKEN' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg'
```

## Step 6: Update Frontend Integration

Update your React application to call the deployed Edge Functions:

### Portfolio API Integration

```typescript
// src/services/portfolioApi.ts
import { supabase } from '@/integrations/supabase/client';

export async function fetchPortfolioSummary(userId?: string) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const url = new URL(
    'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/portfolio-api'
  );

  if (userId) {
    url.searchParams.set('user_id', userId);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch portfolio summary');
  }

  return response.json();
}
```

### Yield Calculation Integration

```typescript
// src/services/yieldApi.ts
import { supabase } from '@/integrations/supabase/client';

export async function calculateYield(userId?: string, applyYield = false) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const url = new URL(
    'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/calculate-yield'
  );

  if (userId) {
    url.searchParams.set('user_id', userId);
  }
  url.searchParams.set('apply', applyYield.toString());

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to calculate yield');
  }

  return response.json();
}
```

## Step 7: Set Up Scheduled Jobs (Optional)

To automatically calculate and apply yield daily, set up a pg_cron job:

1. Go to Supabase SQL Editor: https://app.supabase.com/project/nkfimvovosdehmyyjubn/sql
2. Run this SQL:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily yield calculation at midnight UTC
SELECT cron.schedule(
  'daily-yield-calculation',
  '0 0 * * *',  -- Run at midnight every day
  $$
  SELECT net.http_post(
    url := 'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/calculate-yield?apply=true',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', current_setting('app.settings.service_role_key')
    )
  );
  $$
);
```

## Troubleshooting

### Issue: "Unauthorized" error

**Solution**: Make sure you're passing a valid user token in the Authorization header.

```typescript
const session = await supabase.auth.getSession();
const token = session.data.session?.access_token;
```

### Issue: Function deployment fails

**Solution**:
1. Check you have the correct access token: `echo $SUPABASE_ACCESS_TOKEN`
2. Verify project reference: `nkfimvovosdehmyyjubn`
3. Try with debug flag: `supabase functions deploy portfolio-api --debug`

### Issue: Function returns 500 error

**Solution**:
1. Check function logs: `supabase functions logs portfolio-api`
2. Verify environment variables are set correctly
3. Check database permissions (RLS policies)

## Monitoring

### View Function Logs

```bash
# Real-time logs for portfolio-api
supabase functions logs portfolio-api --follow

# Recent logs for calculate-yield
supabase functions logs calculate-yield --limit 100
```

### Dashboard Monitoring

View metrics and logs in the Supabase Dashboard:
https://app.supabase.com/project/nkfimvovosdehmyyjubn/functions

## Rollback

If you need to rollback a deployment:

```bash
# List function versions
supabase functions list --project-ref nkfimvovosdehmyyjubn

# Deploy previous version
supabase functions deploy portfolio-api --project-ref nkfimvovosdehmyyjubn --version 1
```

## Next Steps

1. ✅ Deploy remaining Edge Functions (price feeds, notifications, etc.)
2. ✅ Set up monitoring and alerting
3. ✅ Configure rate limiting
4. ✅ Implement caching strategy
5. ✅ Run load tests
6. ✅ Update API documentation

## Resources

- **Supabase Edge Functions Docs**: https://supabase.com/docs/guides/functions
- **Deno Deploy**: https://deno.com/deploy/docs
- **Project Dashboard**: https://app.supabase.com/project/nkfimvovosdehmyyjubn
- **API Reference**: https://nkfimvovosdehmyyjubn.supabase.co/rest/v1/

---

**Last Updated**: October 6, 2025
**Status**: ✅ Ready for deployment
**Project**: Indigo Yield Platform v1
