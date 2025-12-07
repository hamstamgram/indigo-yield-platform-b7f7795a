# Indigo Yield Platform - Quick Start Guide

**For Developers**: Get the backend services running in under 30 minutes

---

## Prerequisites

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Install Deno (for Edge Functions)
curl -fsSL https://deno.land/install.sh | sh

# 3. Verify installations
supabase --version
deno --version
```

---

## Step 1: Local Development Setup (5 minutes)

```bash
# Clone and navigate to project
cd /Users/mama/Desktop/indigo-yield-platform-v01

# Install dependencies
npm install

# Start Supabase locally
supabase start

# This will output:
# - API URL: http://localhost:54321
# - GraphQL URL: http://localhost:54321/graphql/v1
# - DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# - Studio URL: http://localhost:54323
# - Inbucket URL: http://localhost:54324
# - anon key: eyJh...
# - service_role key: eyJh...
```

---

## Step 2: Create Your First Edge Function (10 minutes)

```bash
# Create Edge Function directory structure
mkdir -p supabase/functions/hello-world
mkdir -p supabase/functions/_shared

# Create shared middleware
cat > supabase/functions/_shared/cors.ts << 'EOF'
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
EOF
```

**Create your first function:**

```typescript
// supabase/functions/hello-world/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name } = await req.json()

    return new Response(
      JSON.stringify({
        message: `Hello ${name || 'World'}!`,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
```

**Test locally:**

```bash
# Serve function locally
supabase functions serve hello-world

# In another terminal, test it
curl -i --location --request POST 'http://localhost:54321/functions/v1/hello-world' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"name":"Indigo"}'

# Expected response:
# {"message":"Hello Indigo!","timestamp":"2025-10-06T..."}
```

---

## Step 3: Implement Portfolio API (15 minutes)

**Create the function:**

```bash
mkdir -p supabase/functions/api-portfolio
```

```typescript
// supabase/functions/api-portfolio/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Fetch user positions
    const { data: positions, error } = await supabase
      .from('positions')
      .select(`
        id,
        asset_code,
        principal,
        current_balance,
        total_earned,
        updated_at
      `)
      .eq('investor_id', user.id)

    if (error) throw error

    // Calculate totals
    const summary = {
      total_balance: positions.reduce((sum, p) => sum + Number(p.current_balance), 0),
      total_earned: positions.reduce((sum, p) => sum + Number(p.total_earned), 0),
      position_count: positions.length
    }

    return new Response(
      JSON.stringify({
        positions,
        summary,
        user_id: user.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 500
      }
    )
  }
})
```

**Test the portfolio API:**

```bash
# Start the function
supabase functions serve api-portfolio

# Get a user token first (use Supabase Studio or your frontend)
# Then test:
curl -i --location --request GET 'http://localhost:54321/functions/v1/api-portfolio' \
  --header 'Authorization: Bearer <YOUR_USER_JWT_TOKEN>' \
  --header 'Content-Type: application/json'
```

---

## Step 4: Deploy to Production (5 minutes)

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref nkfimvovosdehmyyjubn

# Deploy functions
supabase functions deploy api-portfolio
supabase functions deploy hello-world

# Set environment secrets
supabase secrets set COINGECKO_API_KEY=your_key_here

# Verify deployment
supabase functions list
```

**Test production endpoint:**

```bash
curl -i --location --request GET \
  'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/api-portfolio' \
  --header 'Authorization: Bearer <YOUR_PRODUCTION_JWT>' \
  --header 'Content-Type: application/json'
```

---

## Step 5: Integrate with Frontend (5 minutes)

**Update your service layer:**

```typescript
// src/services/api/portfolioApi.ts
import { supabase } from '@/integrations/supabase/client'

export async function getPortfolioViaEdgeFunction() {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-portfolio`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch portfolio')
  }

  return response.json()
}
```

**Use in React component:**

```typescript
// src/components/dashboard/PortfolioWidget.tsx
import { useQuery } from '@tanstack/react-query'
import { getPortfolioViaEdgeFunction } from '@/services/api/portfolioApi'

export function PortfolioWidget() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio-edge'],
    queryFn: getPortfolioViaEdgeFunction,
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>Portfolio Summary</h2>
      <p>Total Balance: {data.summary.total_balance}</p>
      <p>Total Earned: {data.summary.total_earned}</p>
      <p>Positions: {data.summary.position_count}</p>

      <ul>
        {data.positions.map(position => (
          <li key={position.id}>
            {position.asset_code}: {position.current_balance}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## Common Issues & Solutions

### Issue 1: "CORS error when calling Edge Function"

**Solution:**
```typescript
// Always include CORS headers in your Edge Function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle OPTIONS requests
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders })
}

// Include in all responses
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
})
```

### Issue 2: "401 Unauthorized when calling function"

**Solution:**
```typescript
// Ensure you're passing the JWT token correctly
const { data: { session } } = await supabase.auth.getSession()

fetch(url, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`, // Not session.token
    'Content-Type': 'application/json'
  }
})
```

### Issue 3: "Function times out"

**Solution:**
```typescript
// Add timeout to Deno fetch calls
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 seconds

try {
  const response = await fetch(url, {
    signal: controller.signal
  })
  return await response.json()
} finally {
  clearTimeout(timeoutId)
}
```

---

## Next Steps

### 1. Implement Yield Calculation Service
See `ARCHITECTURAL_ANALYSIS_AND_BUILD_PLAN.md` - Phase 1, Section 1.1

### 2. Add Price Feed Integration
See `ARCHITECTURAL_ANALYSIS_AND_BUILD_PLAN.md` - Phase 2, Section 2.1

### 3. Set up Scheduled Jobs
```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily yield application
SELECT cron.schedule(
  'apply-daily-yield',
  '0 0 * * *',  -- Midnight UTC
  $$
  SELECT net_http_request(
    url := 'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/apply-daily-yield',
    method := 'POST',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

### 4. Monitor & Debug
```bash
# View function logs
supabase functions logs api-portfolio --tail

# View database logs
supabase db logs --tail

# Check function status
supabase functions list
```

---

## Development Workflow

```bash
# 1. Start local Supabase
supabase start

# 2. Make changes to Edge Function
code supabase/functions/api-portfolio/index.ts

# 3. Test locally
supabase functions serve api-portfolio

# 4. Test the function
curl -i http://localhost:54321/functions/v1/api-portfolio \
  -H "Authorization: Bearer <token>"

# 5. When ready, deploy
supabase functions deploy api-portfolio

# 6. Monitor production logs
supabase functions logs api-portfolio --tail
```

---

## Useful Commands

```bash
# Database
supabase db reset           # Reset local database
supabase db push            # Push migrations to remote
supabase db pull            # Pull schema from remote
supabase db diff            # Show differences

# Functions
supabase functions new <name>     # Create new function
supabase functions serve <name>   # Serve locally
supabase functions deploy <name>  # Deploy to production
supabase functions delete <name>  # Delete function

# Secrets
supabase secrets set KEY=value
supabase secrets list
supabase secrets unset KEY

# Types
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

---

## Performance Tips

1. **Use Connection Pooling**
```typescript
// Use Supabase client with pooling
const supabase = createClient(url, key, {
  db: { schema: 'public' },
  auth: { persistSession: false }, // Don't persist in Edge Functions
  global: {
    headers: { 'x-connection-pool': 'true' }
  }
})
```

2. **Cache Database Queries**
```typescript
// Simple in-memory cache
const cache = new Map()

async function getCachedData(key: string, fetcher: () => Promise<any>, ttl = 60000) {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data
  }

  const data = await fetcher()
  cache.set(key, { data, timestamp: Date.now() })
  return data
}
```

3. **Batch Database Operations**
```typescript
// Instead of multiple inserts
for (const item of items) {
  await supabase.from('table').insert(item)
}

// Do batch insert
await supabase.from('table').insert(items)
```

---

## Security Checklist

- [ ] Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
- [ ] Always verify JWT tokens in Edge Functions
- [ ] Use RLS policies as primary security layer
- [ ] Validate all input data (use Zod or similar)
- [ ] Rate limit sensitive endpoints
- [ ] Log all admin actions to audit_log
- [ ] Use HTTPS only in production
- [ ] Rotate API keys regularly

---

**Ready to Build?** Start with Step 1 and you'll have your first Edge Function running in 30 minutes!

For the complete architecture and 6-week implementation plan, see **ARCHITECTURAL_ANALYSIS_AND_BUILD_PLAN.md**.
