# Credentials Setup Guide

## Overview
This guide will help you configure all necessary credentials for the Indigo Yield Platform and its MCP (Model Context Protocol) servers.

## Current Configuration Status

### ✅ Already Configured (in .env)
- **Supabase (Main)**: URL and anon key configured
- **Supabase (Portfolio)**: URL and anon key configured
- **MailerLite**: API token configured
- **Sentry**: DSN and auth token configured

### ⚠️ Needs Configuration

#### Main Application (.env file)

1. **GitHub Token** - Required for GitHub MCP integration
   - Current: `your_github_token_here`
   - Get from: https://github.com/settings/tokens
   - Scopes needed: `repo`, `workflow`, `read:org`
   - Update line 1 in `.env`

2. **Supabase Database URLs** - Required for PostgreSQL MCP and database operations
   - Current: Placeholder values
   - Get from: Your Supabase project → Settings → Database → Connection string
   - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
   - Update lines 10-11 in `.env`

3. **Vercel Token** - Required for Vercel MCP deployment
   - Current: `your_vercel_token_here`
   - Get from: https://vercel.com/account/tokens
   - Update line 12 in `.env`

4. **PostHog Key** (Optional) - For analytics
   - Current: `your_posthog_key_here`
   - Get from: https://posthog.com/
   - Update line 3 in `.env`

5. **SMTP Settings** (Optional) - For custom email implementation
   - Current: Placeholder values
   - Get from: Your email provider (Gmail, SendGrid, etc.)
   - Update lines 6-9 in `.env`

#### MCP Servers (.env.mcp file) - **NEWLY CREATED**

The `.env.mcp` file has been created with placeholders. Configure these:

1. **Airtable API Key** - For Airtable MCP integration
   - Get from: https://airtable.com/create/tokens
   - Permissions needed: `data.records:read`, `data.records:write`, `schema.bases:read`
   - Update in `.env.mcp`

2. **Bright Data API Token** - For web scraping via MCP
   - Get from: https://brightdata.com/
   - Navigate to: Dashboard → API → Create Token
   - Update in `.env.mcp`

3. **Upstash Vector DB** - For context7 MCP (semantic search)
   - Get from: https://console.upstash.com/
   - Create a new Vector Database
   - Copy both REST URL and REST Token
   - Update in `.env.mcp`

4. **Brave Search API Key** - For AI-powered web search
   - Get from: https://brave.com/search/api/
   - Sign up for API access
   - Update in `.env.mcp`

## MCP Servers Configuration

### Active MCP Servers

Your project has two MCP configuration files:

#### 1. `mcp-servers.json` - Main MCP configuration
Contains:
- **filesystem**: File operations (no credentials needed)
- **memory**: Persistent memory storage (no credentials needed)
- **sequentialthinking**: Reasoning capabilities (no credentials needed)
- **brightdata**: Web scraping (needs BRIGHTDATA_API_TOKEN)
- **context7**: Vector database (needs UPSTASH credentials)
- **brave-search**: Web search (needs BRAVE_API_KEY)
- **enhanced-postgres-dev**: PostgreSQL integration (needs SUPABASE_DEV_DB_URL)
- **playwright**: Browser automation (no credentials needed)
- **vercel**: Deployment (needs VERCEL_TOKEN)
- **sentry**: Error tracking (needs SENTRY_TOKEN)
- **mailerlite**: Email marketing (needs MAILERLITE_API_TOKEN - configured ✅)

#### 2. `warp-mcp-config.json` - Warp terminal MCP configuration
Contains:
- **filesystem**: File operations
- **playwright-local**: Browser automation for local dev
- **vercel**: Deployment
- **sentry**: Error tracking
- **enhanced-postgres-dev**: Database operations
- **airtable**: Airtable integration (needs credentials in .env.mcp)

## Step-by-Step Setup

### 1. Configure Main Application

```bash
# Edit the .env file
nano .env

# Update the following values:
# - GITHUB_TOKEN
# - SUPABASE_DEV_DB_URL
# - SUPABASE_PROD_DB_URL
# - VERCEL_TOKEN
# - POSTHOG_KEY (optional)
```

### 2. Configure MCP Servers

```bash
# Edit the .env.mcp file
nano .env.mcp

# Update the following values:
# - AIRTABLE_API_KEY
# - BRIGHTDATA_API_TOKEN
# - UPSTASH_VECTOR_REST_URL
# - UPSTASH_VECTOR_REST_TOKEN
# - BRAVE_API_KEY
```

### 3. Sync Credentials Between Files

Some credentials need to be in both files. Run this command to sync:

```bash
# Copy database URLs from .env to .env.mcp
grep "SUPABASE.*DB_URL" .env >> .env.mcp

# Copy tokens that are in both
grep -E "(VERCEL_TOKEN|SENTRY_TOKEN|MAILERLITE_API_TOKEN)" .env >> .env.mcp
```

### 4. Verify Configuration

```bash
# Test MCP setup
./setup-mcp.sh

# Test individual MCP servers
./test-mcp.sh
```

## Security Best Practices

1. **Never commit credentials to git**
   - `.env` and `.env.mcp` are already in `.gitignore`
   - Always use `.env.example` for templates

2. **Use separate credentials for dev and production**
   - Development: Use `SUPABASE_DEV_DB_URL`
   - Production: Use `SUPABASE_PROD_DB_URL`

3. **Rotate tokens regularly**
   - GitHub: Every 90 days
   - Supabase: Every 180 days
   - API keys: As needed

4. **Limit token permissions**
   - Only grant necessary scopes/permissions
   - Use read-only tokens where possible

## Troubleshooting

### MCP servers not connecting
- Check that environment variables are correctly set
- Verify tokens haven't expired
- Check logs: `tail -f ~/.mcp/logs/*.log`

### Database connection issues
- Verify connection string format
- Check firewall/network settings
- Ensure database is running

### API rate limits
- Check your plan limits for each service
- Implement caching where possible
- Use pagination for large datasets

## Required vs Optional Credentials

### Critical (Application won't work without these):
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_DEV_DB_URL (for development)

### Important (For full functionality):
- GITHUB_TOKEN (for GitHub MCP)
- VERCEL_TOKEN (for deployments)
- SENTRY_TOKEN (for error tracking)
- MAILERLITE_API_TOKEN (for email marketing)

### Optional (Enhanced features):
- BRAVE_API_KEY (for web search)
- BRIGHTDATA_API_TOKEN (for advanced scraping)
- UPSTASH credentials (for semantic search)
- AIRTABLE_API_KEY (for Airtable integration)
- POSTHOG_KEY (for analytics)

## Next Steps

1. Get credentials for critical services first
2. Test the application locally: `npm run dev`
3. Configure MCP servers one by one
4. Test each MCP server individually
5. Deploy to staging environment
6. Configure production credentials

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Vercel API Documentation](https://vercel.com/docs/api)
- [Sentry Integration Guide](https://docs.sentry.io/)
- [MailerLite API](https://developers.mailerlite.com/)

## Support

For issues with:
- **Supabase**: Check RLS policies and database migrations
- **MCP Servers**: Review logs in `~/.mcp/logs/`
- **Deployments**: Check Vercel dashboard
- **Errors**: Check Sentry dashboard

---

Last updated: 2025-10-08
