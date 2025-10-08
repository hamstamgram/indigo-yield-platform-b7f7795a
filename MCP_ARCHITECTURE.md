# MCP Architecture Overview

## Model Context Protocol (MCP) Servers

This project uses MCP servers to extend AI capabilities with external tools and services.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code / AI Agent                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ MCP Protocol
                         │
        ┌────────────────┴────────────────┐
        │                                  │
        │    MCP Server Infrastructure    │
        │                                  │
        └─────────────┬───────────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
    ┌────▼───┐  ┌────▼───┐  ┌────▼────┐
    │ Core   │  │ Data   │  │External │
    │Services│  │Services│  │Services │
    └────┬───┘  └────┬───┘  └────┬────┘
         │           │            │
         │           │            │
┌────────▼─────┬─────▼──────┬────▼──────────┐
│              │            │               │
│ filesystem   │ postgres   │ brave-search  │
│ memory       │ playwright │ brightdata    │
│ sequential   │ airtable   │ vercel        │
│ thinking     │            │ sentry        │
│              │            │ mailerlite    │
│              │            │ context7      │
└──────────────┴────────────┴───────────────┘
```

## MCP Servers Inventory

### 🔧 Core Services (No credentials required)

| Server | Purpose | Status |
|--------|---------|--------|
| **filesystem** | File operations (read, write, edit) | ✅ Active |
| **memory** | Persistent memory storage (SQLite) | ✅ Active |
| **sequentialthinking** | Advanced reasoning capabilities | ✅ Active |

### 💾 Data Services

| Server | Purpose | Credentials | Status |
|--------|---------|-------------|--------|
| **enhanced-postgres-dev** | PostgreSQL database operations | `SUPABASE_DEV_DB_URL` | ⚠️ Needs config |
| **playwright** | Browser automation & testing | None | ✅ Active |
| **airtable** | Airtable database integration | `AIRTABLE_API_KEY` | ⚠️ Needs config |

### 🌐 External Services

| Server | Purpose | Credentials | Status |
|--------|---------|-------------|--------|
| **brave-search** | AI-powered web search | `BRAVE_API_KEY` | ⚠️ Needs config |
| **brightdata** | Web scraping & data collection | `BRIGHTDATA_API_TOKEN` | ⚠️ Needs config |
| **context7** | Vector DB & semantic search | `UPSTASH_VECTOR_REST_URL`<br>`UPSTASH_VECTOR_REST_TOKEN` | ⚠️ Needs config |
| **vercel** | Deployment & hosting | `VERCEL_TOKEN` | ⚠️ Needs config |
| **sentry** | Error tracking & monitoring | `SENTRY_TOKEN` | ✅ Configured |
| **mailerlite** | Email marketing automation | `MAILERLITE_API_TOKEN` | ✅ Configured |

## Configuration Files

### 1. `mcp-servers.json`
**Purpose**: Main MCP configuration for Claude Code and AI agents
**Location**: `/Users/mama/indigo-yield-platform-v01/mcp-servers.json`

Contains all MCP server configurations with:
- Command execution paths
- Environment variable mappings
- Server descriptions

### 2. `warp-mcp-config.json`
**Purpose**: MCP configuration for Warp terminal
**Location**: `/Users/mama/indigo-yield-platform-v01/warp-mcp-config.json`

Subset of MCP servers optimized for terminal use.

### 3. `.env`
**Purpose**: Main application environment variables
**Location**: `/Users/mama/Desktop/indigo-yield-platform-v01/.env`

Contains:
- Supabase credentials (main & portfolio)
- API tokens (Sentry, MailerLite)
- Deployment tokens (Vercel, GitHub)
- SMTP settings

### 4. `.env.mcp` (NEW)
**Purpose**: MCP-specific environment variables
**Location**: `/Users/mama/Desktop/indigo-yield-platform-v01/.env.mcp`

Contains:
- Airtable API key
- Bright Data token
- Upstash Vector DB credentials
- Brave Search API key

## Data Flow Examples

### Example 1: Database Query via MCP

```
Claude Code
    ↓
enhanced-postgres-dev MCP
    ↓
SUPABASE_DEV_DB_URL
    ↓
PostgreSQL Database
```

### Example 2: Web Search via MCP

```
Claude Code
    ↓
brave-search MCP
    ↓
BRAVE_API_KEY
    ↓
Brave Search API
    ↓
AI-summarized results
```

### Example 3: Email Campaign via MCP

```
Claude Code
    ↓
mailerlite MCP (custom server)
    ↓
MAILERLITE_API_TOKEN
    ↓
MailerLite API
    ↓
Subscribers, Campaigns
```

## Custom MCP Servers

### MailerLite Server
**Location**: `/Users/mama/indigo-yield-platform-v01/mcp-servers/mailerlite-simple.js`

**Capabilities**:
- `get_subscribers`: List email subscribers
- `create_subscriber`: Add new subscribers
- `get_campaigns`: List email campaigns

**Implementation**: Node.js JSON-RPC server using `@mailerlite/mailerlite-nodejs`

## Security Considerations

### Environment Variables
- ✅ All `.env*` files are in `.gitignore`
- ✅ Tokens use `{{env.VAR_NAME}}` syntax in MCP configs
- ⚠️ Never commit actual credentials

### Database Access
- ✅ Separate dev and prod database URLs
- ✅ RLS (Row Level Security) policies enforced
- ⚠️ Always test on dev environment first

### API Keys
- ✅ Tokens stored in environment files
- ✅ Scoped permissions (read-only where possible)
- ⚠️ Rotate tokens regularly

## Testing MCP Servers

### Test Individual Server
```bash
# Test filesystem
npx @modelcontextprotocol/server-filesystem --help

# Test PostgreSQL
npx enhanced-postgres-mcp-server --help

# Test Playwright
npx @playwright/mcp --help
```

### Test All Servers
```bash
./test-mcp.sh
```

### Debug MCP Issues
```bash
# Check MCP logs
tail -f ~/.mcp/logs/*.log

# Test environment variables
source .env && env | grep -E "(SUPABASE|VERCEL|SENTRY)"
```

## Adding New MCP Servers

1. **Install the server**
   ```bash
   npm install -D @vendor/mcp-server-name
   ```

2. **Add to `mcp-servers.json`**
   ```json
   {
     "server-name": {
       "command": "npx",
       "args": ["@vendor/mcp-server-name"],
       "env": {
         "API_KEY": "{{env.API_KEY_NAME}}"
       },
       "description": "What this server does"
     }
   }
   ```

3. **Add credentials to `.env.mcp`**
   ```bash
   API_KEY_NAME=your_key_here
   ```

4. **Test the server**
   ```bash
   npx @vendor/mcp-server-name --help
   ```

## MCP Protocol Resources

- [Official MCP Documentation](https://modelcontextprotocol.io/)
- [MCP Server SDK](https://github.com/modelcontextprotocol/servers)
- [Creating Custom MCP Servers](https://modelcontextprotocol.io/docs/guides/creating-servers)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MCP server not found | Check `npm list -g <server-name>` or install locally |
| Authentication failed | Verify credentials in `.env` or `.env.mcp` |
| Connection timeout | Check network/firewall settings |
| JSON-RPC error | Review server logs for specific errors |
| Environment variable not found | Check variable name matches exactly |

---

**Last Updated**: 2025-10-08
**MCP Protocol Version**: 1.0
**Total MCP Servers**: 11
