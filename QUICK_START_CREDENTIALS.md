# Quick Start: Credentials Configuration

## 🚀 Get Started in 5 Minutes

### Step 1: Check What You Have ✅

Already configured:
- ✅ Supabase (main + portfolio)
- ✅ MailerLite
- ✅ Sentry

### Step 2: Get Critical Credentials (Required)

#### 1. GitHub Token
```bash
# Visit: https://github.com/settings/tokens
# Click: Generate new token (classic)
# Scopes: repo, workflow, read:org
# Copy token and update .env line 1
```

#### 2. Supabase Database URLs
```bash
# Visit your Supabase project
# Settings → Database → Connection string
# Mode: Transaction (port 6543)
# Copy connection string
# Update .env lines 10-11
```

#### 3. Vercel Token
```bash
# Visit: https://vercel.com/account/tokens
# Create new token
# Copy and update .env line 12
```

### Step 3: Configure MCP Servers (Optional but Recommended)

Edit `.env.mcp` (newly created) and add:

#### For Web Search & Scraping:
```bash
# Brave Search: https://brave.com/search/api/
BRAVE_API_KEY=your_key_here

# Bright Data: https://brightdata.com/
BRIGHTDATA_API_TOKEN=your_token_here
```

#### For Semantic Search:
```bash
# Upstash: https://console.upstash.com/
UPSTASH_VECTOR_REST_URL=your_url_here
UPSTASH_VECTOR_REST_TOKEN=your_token_here
```

#### For Airtable Integration:
```bash
# Airtable: https://airtable.com/create/tokens
AIRTABLE_API_KEY=your_key_here
```

### Step 4: Test Configuration

```bash
# Start development server
cd /Users/mama/Desktop/indigo-yield-platform-v01
npm run dev

# Test MCP servers
./test-mcp.sh
```

## 📋 Credential Checklist

### Critical (Must Have)
- [ ] GitHub Token → `.env` line 1
- [ ] Supabase Dev DB URL → `.env` line 10
- [ ] Vercel Token → `.env` line 12

### Important (Highly Recommended)
- [ ] Supabase Prod DB URL → `.env` line 11
- [ ] Brave API Key → `.env.mcp`
- [ ] Upstash credentials → `.env.mcp`

### Optional (Nice to Have)
- [ ] Airtable API Key → `.env.mcp`
- [ ] Bright Data Token → `.env.mcp`
- [ ] PostHog Key → `.env` line 3
- [ ] SMTP settings → `.env` lines 6-9

## 🔍 Quick Verification

```bash
# Check which credentials are set
grep -v "^#" .env | grep "your_" && echo "❌ Missing credentials" || echo "✅ All set"

# Check MCP configuration
grep -v "^#" .env.mcp | grep "your_" && echo "⚠️  MCP needs config" || echo "✅ MCP ready"
```

## 🆘 Need Help?

See detailed guide: `CREDENTIALS_SETUP.md`

Common issues:
- **Can't connect to Supabase**: Check DB URL format
- **MCP not working**: Verify tokens in `.env.mcp`
- **Deployment fails**: Check Vercel token
