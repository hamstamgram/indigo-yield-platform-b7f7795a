# MCP (Model Context Protocol) Setup Documentation

## Overview
This project is configured with multiple MCP servers to enhance AI-assisted development capabilities. MCP servers provide additional context, tools, and resources to AI assistants.

### MCP Server Repositories
- **Sequential Thinking**: https://github.com/modelcontextprotocol/servers (official repo)
- **Brave Search**: https://github.com/modelcontextprotocol/servers (official repo)
- **Context7**: https://github.com/upstash/context7
- **Bright Data**: https://github.com/brightdata/brightdata-mcp
- **Basic Memory**: https://github.com/basicmachines-co/basic-memory-mcp

## Installation Summary
✅ **Completed on**: September 8, 2025

### What Was Installed:

#### 1. Local MCP Servers (Built from source on Desktop)
- **Memory Server**: Persistent context storage
  - Location: `/Users/mama/Desktop/mcp-servers/mcp-servers-official/src/memory/`
  - Built from official ModelContextProtocol repository
  - Repository: https://github.com/modelcontextprotocol/servers
  
- **Sequential Thinking Server**: Advanced reasoning capabilities
  - Location: `/Users/mama/Desktop/mcp-servers/mcp-servers-official/src/sequentialthinking/`
  - Built from official ModelContextProtocol repository
  - Repository: https://github.com/modelcontextprotocol/servers

#### 2. NPM-based MCP Servers (Installed as dev dependencies)
- **@brightdata/mcp@2.5.0**: Web scraping and data collection
  - Repository: https://github.com/brightdata/brightdata-mcp
- **@upstash/context7-mcp@1.0.17**: Vector database and context management
  - Repository: https://github.com/upstash/context7
- **@brave/brave-search-mcp-server@1.3.7**: Web search with AI summaries
  - Repository: https://github.com/brave/brave-search-mcp

#### 3. Existing MCP Servers (Previously configured)
- Filesystem, PostgreSQL, Playwright, Vercel, Sentry, MailerLite

## Configuration Files

### 1. `mcp-servers.json`
- **Location**: `/Users/mama/indigo-yield-platform-v01/mcp-servers.json`
- **Purpose**: Defines all MCP servers and their configurations
- **Status**: ✅ Updated with all four new servers

### 2. `.env.mcp`
- **Location**: `/Users/mama/indigo-yield-platform-v01/.env.mcp`
- **Purpose**: Contains environment variables for MCP servers
- **Status**: ✅ Created with template values
- **Security**: Added to `.gitignore` - never commit this file

## Required Environment Variables

### For Memory Server
```bash
MEMORY_DB_PATH=/Users/mama/indigo-yield-platform-v01/.mcp/memory.sqlite
```

### For Sequential Thinking
```bash
SEQTHINK_MAX_STEPS=10
```

### For Bright Data (Requires Account)
```bash
BRIGHTDATA_API_TOKEN=your_brightdata_token_here
# Optional configurations:
# BRIGHTDATA_ZONE=optional_zone_name
# BRIGHTDATA_PROXY=optional_proxy_url
# BRIGHTDATA_BASE_URL=optional_custom_api_base
```

### For Upstash Context7 (Requires Account)
```bash
UPSTASH_VECTOR_REST_URL=your_upstash_vector_rest_url_here
UPSTASH_VECTOR_REST_TOKEN=your_upstash_vector_rest_token_here
# Optional Redis configuration:
# UPSTASH_REDIS_REST_URL=optional_redis_url
# UPSTASH_REDIS_REST_TOKEN=optional_redis_token
# CONTEXT7_NAMESPACE=optional_namespace
```

### For Brave Search (Requires Account)
```bash
BRAVE_API_KEY=your_brave_api_key_here
# Get your API key from: https://api.search.brave.com/app/keys
```

## Testing MCP Servers

### Using MCP Inspector
The MCP Inspector provides a web interface to test and interact with MCP servers.

```bash
# Start the inspector
cd /Users/mama/indigo-yield-platform-v01
npx @modelcontextprotocol/inspector

# The inspector will open in your browser at:
# http://localhost:6274/
```

### Testing Individual Servers

#### Test Memory Server:
```bash
npx @modelcontextprotocol/inspector --command "node" -- \
  /Users/mama/Desktop/mcp-servers/mcp-servers-official/src/memory/dist/index.js
```

#### Test Sequential Thinking:
```bash
npx @modelcontextprotocol/inspector --command "node" -- \
  /Users/mama/Desktop/mcp-servers/mcp-servers-official/src/sequentialthinking/dist/index.js
```

#### Test Bright Data:
```bash
# First, ensure you have API credentials in .env.mcp
source .env.mcp
npx @modelcontextprotocol/inspector --command "npx" -- -y @brightdata/mcp@2.5.0
```

#### Test Upstash Context7:
```bash
# First, ensure you have API credentials in .env.mcp
source .env.mcp
npx @modelcontextprotocol/inspector --command "npx" -- -y @upstash/context7-mcp@1.0.17
```

#### Test Brave Search:
```bash
# First, ensure you have API credentials in .env.mcp
source .env.mcp
npx @modelcontextprotocol/inspector --command "npx" -- -y @brave/brave-search-mcp-server@1.3.7
```

## Using with AI Clients

### Claude Desktop App
1. The app should auto-detect `mcp-servers.json` in your project
2. If not, manually point to: `/Users/mama/indigo-yield-platform-v01/mcp-servers.json`
3. Ensure environment variables are loaded before starting Claude

### VS Code Extensions
Most MCP-compatible VS Code extensions will read the local `mcp-servers.json` file automatically.

## Server Capabilities

### Memory Server
- **Purpose**: Persistent storage of context and information
- **Features**: Store/retrieve notes, maintain conversation context
- **Use Cases**: Remember project details, maintain todo lists, store decisions

### Sequential Thinking Server
- **Purpose**: Step-by-step reasoning and problem-solving
- **Features**: Break down complex problems, chain reasoning steps
- **Use Cases**: Algorithm design, debugging, architectural decisions

### Bright Data Server
- **Purpose**: Web scraping and data collection
- **Features**: Extract web data, monitor websites, collect market data
- **Use Cases**: Competitive analysis, price monitoring, content aggregation
- **Note**: Requires Bright Data account and API token

### Upstash Context7 Server
- **Purpose**: Vector database for semantic search and context
- **Features**: Store embeddings, semantic search, context retrieval
- **Use Cases**: Knowledge base, documentation search, similar content finding
- **Note**: Requires Upstash account with Vector database

### Brave Search Server
- **Purpose**: Web search with privacy focus and AI summaries
- **Features**: Web search, image search, video search, news search, AI summaries, rich snippets
- **Use Cases**: Research, fact-checking, real-time information gathering, news monitoring
- **Note**: Requires Brave Search API key

## Troubleshooting

### Common Issues:

1. **"Command not found" errors**
   - Ensure Node.js 18+ is installed: `node -v`
   - Verify npm is installed: `npm -v`

2. **MCP servers fail to connect**
   - Check that build artifacts exist for local servers
   - Verify environment variables are set correctly
   - Use the inspector to test individual servers

3. **API credential errors (Bright Data/Upstash)**
   - These servers require valid API credentials
   - Sign up for accounts at:
     - Bright Data: https://brightdata.com
     - Upstash: https://console.upstash.com
   - Update `.env.mcp` with your credentials

4. **Permission errors**
   - Ensure `.mcp` directory exists: `mkdir -p .mcp`
   - Check file permissions on built JavaScript files

## Security Notes

⚠️ **Important Security Practices:**
- Never commit `.env.mcp` to version control
- Keep API tokens secure and rotate them regularly
- Use development credentials only - never production
- All MCP operations are local development only
- No production database changes are made by these tools

## Maintenance

### Updating MCP Servers:

```bash
# Update npm-based servers
npm update @brightdata/mcp @upstash/context7-mcp

# Rebuild local servers
cd /Users/mama/Desktop/mcp-servers/mcp-servers-official
git pull
npm install
npm run build -w @modelcontextprotocol/server-memory
npm run build -w @modelcontextprotocol/server-sequential-thinking
```

## Project Integration
This MCP setup integrates with the IndigoInvestor platform:
- Follows existing repo structure per project rules
- No new frameworks introduced
- All changes are development-only
- Complies with security requirements for investor data

## Support
For issues or questions about MCP servers:
- Official MCP Documentation: https://modelcontextprotocol.io
- Bright Data Support: https://brightdata.com/support
- Upstash Documentation: https://docs.upstash.com
