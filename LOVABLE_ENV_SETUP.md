# 🔧 Lovable Environment Variables Setup

## Issue: "Failed to fetch" on Login

**Root Cause:** Lovable deployment needs environment variables configured for Supabase connection.

---

## Required Environment Variables

Add these to your Lovable project settings (Next.js Format):

### 1. Supabase Configuration

```bash
NEXT_PUBLIC_SUPABASE_URL=https://noekumitbfoxhsndwypz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vZWt1bWl0YmZveGhzbmR3eXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NDI5MzEsImV4cCI6MjA2NTIxODkzMX0.NsqZLt_0kIK_c1qHg3zDIfbLoZ5z1vf2CuNJKkWVKZ8
```

*Note: The platform also supports `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as fallbacks, but `NEXT_PUBLIC_` is the standard for Next.js applications.*

### 2. Optional (Analytics & Monitoring)

```bash
NEXT_PUBLIC_SENTRY_DSN=https://d9c2a485401aa221a88caa3c007eee4a@o4509944393629696.ingest.de.sentry.io/4509949718233168
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key_here
```

---

## How to Add Environment Variables in Lovable

### Step 1: Go to Lovable Dashboard
1. Visit https://lovable.app
2. Navigate to your project: **indigo-yield-platform-v01**

### Step 2: Open Settings
1. Click on **Settings** or **Configuration**
2. Look for **Environment Variables** section

### Step 3: Add Variables
For each variable above:
1. Click **Add Environment Variable**
2. Enter **Name**: `NEXT_PUBLIC_SUPABASE_URL`
3. Enter **Value**: `https://noekumitbfoxhsndwypz.supabase.co`
4. Click **Save**

Repeat for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 4: Redeploy
1. After adding all variables, trigger a new deployment
2. Lovable should automatically redeploy with new env vars
3. Wait 2-3 minutes for deployment to complete

---

## Troubleshooting

### Still Getting "Failed to fetch"?

**Check 1: Supabase CORS Settings**
The Lovable domain needs to be allowed in Supabase:
1. Go to Supabase Dashboard: https://app.supabase.com
2. Select project: **noekumitbfoxhsndwypz**
3. Go to **Settings** → **API**
4. Under **CORS Allowed Origins**, add:
   ```
   https://preview--indigo-yield-platform-v01.lovable.app
   https://*.lovable.app
   ```

**Check 2: Browser Network Tab**
1. Open Developer Tools → Network tab
2. Try logging in
3. Look for failed request to Supabase
4. Check request headers and response

---

## Contact Support

If issues persist:
- **Lovable Support:** https://lovable.app/support
- **Supabase Support:** https://supabase.com/support
- Check Lovable Discord: https://discord.gg/lovable
