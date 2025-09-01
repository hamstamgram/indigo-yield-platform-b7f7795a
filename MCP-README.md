# MCP Servers Configuration for Indigo Yield Platform

This document describes the Model Context Protocol (MCP) server setup for the Indigo Yield Platform.

## 🏗️ Installed MCP Servers

### ✅ Successfully Installed & Configured

1. **@modelcontextprotocol/server-filesystem** - File system operations
2. **@modelcontextprotocol/server-github** - GitHub integration (deprecated but functional)
3. **enhanced-postgres-mcp-server** - Enhanced PostgreSQL with read/write capabilities
4. **@playwright/mcp** - Browser automation and testing ✅ (Verified working)
5. **@vercel/mcp-adapter** - Vercel deployment management
6. **@sentry/mcp-server** - Error tracking and monitoring

### ❌ Alternative Solutions for Missing Servers

- **SMTP**: Use `nodemailer` directly in your application
- **PostHog**: Use `posthog-node` or `posthog-js` directly
- Consider creating custom MCP servers for specific business needs

## 📁 Configuration Files

- **`mcp-servers.json`** - Main MCP server configuration
- **`.env`** - Environment variables (update with real values)
- **`setup-mcp.sh`** - Setup script
- **`test-mcp.sh`** - Testing script

## 🔑 Required Environment Variables

```bash
GITHUB_TOKEN=your_github_token_here
SUPABASE_DEV_DB_URL=postgresql://user:password@host:port/database
SUPABASE_PROD_DB_URL=postgresql://user:password@host:port/database
VERCEL_TOKEN=your_vercel_token_here
SENTRY_TOKEN=your_sentry_token_here
```

## 🚀 Quick Start

1. **Update environment variables**:
   ```bash
   nano .env  # Add your real credentials
   ```

2. **Test servers**:
   ```bash
   ./test-mcp.sh
   ```

3. **Individual server testing**:
   ```bash
   npx @playwright/mcp --help
   npx enhanced-postgres-mcp-server --help
   ```

## 🔒 Security Guidelines (Per Project Rules)

- **Database**: Always use dev environment for testing
- **RLS**: Test RLS policies on investor tables for each PR
- **Deployment**: Follow Dev→Staging→Prod flow, never push directly to prod
- **Migrations**: All DB changes must be migrations in `/supabase/migrations`

## 🛠️ Usage Examples

### Filesystem Operations
```json
{
  "server": "filesystem",
  "operation": "read_file",
  "path": "/path/to/file"
}
```

### Database Queries (Dev Environment)
```json
{
  "server": "postgres-dev",
  "query": "SELECT * FROM users WHERE id = $1",
  "params": [123]
}
```

### Browser Testing with Playwright
```json
{
  "server": "playwright", 
  "action": "navigate",
  "url": "http://localhost:5173"
}
```

## 🔧 Troubleshooting

- **Server not responding**: Check if globally installed with `npm list -g`
- **Environment issues**: Verify `.env` file has correct values
- **Database connection**: Test connection strings independently
- **Permission issues**: Ensure tokens have required scopes

## 📦 Manual Installation Commands

If you need to reinstall:

```bash
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-github  
npm install -g enhanced-postgres-mcp-server
npm install -g @playwright/mcp
npm install -g @vercel/mcp-adapter
npm install -g @sentry/mcp-server
```

## 🔄 Alternative Approaches

For missing functionality, consider:

1. **Custom MCP Servers**: Build using `@modelcontextprotocol/sdk`
2. **Direct Integration**: Use libraries directly in your application
3. **Proxy Servers**: Use `mcp-proxy` for custom routing

---

*This setup follows the project's security rules and deployment guidelines. Always test changes in dev environment first.*
