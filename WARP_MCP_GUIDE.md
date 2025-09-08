# Warp MCP Configuration Guide

## ✅ Configuration Complete!

Your Warp terminal is now configured with the following MCP servers:

### 🚀 Configured MCP Servers

1. **Memory** (Basic Memory)
   - Persistent context storage
   - Status: ✅ Configured, starts on launch
   - Location: Local build on Desktop

2. **Sequential Thinking**
   - Step-by-step reasoning and problem-solving
   - Status: ✅ Configured, starts on launch
   - Location: Local build on Desktop

3. **Bright Data**
   - Web scraping and data collection
   - Status: ✅ Configured (requires API key)
   - Package: `@brightdata/mcp@2.5.0`

4. **Context7 (Upstash)**
   - Vector database and semantic search
   - Status: ✅ Configured (requires API credentials)
   - Package: `@upstash/context7-mcp@1.0.17`

5. **Brave Search**
   - Privacy-focused web search with AI summaries
   - Status: ✅ Configured (requires API key)
   - Package: `@brave/brave-search-mcp-server@1.3.7`

### 📍 Configuration Locations

- **Warp MCP Config**: `~/.warp/mcp.json`
- **Environment Variables**: `/Users/mama/indigo-yield-platform-v01/.env.mcp`
- **Setup Script**: `/Users/mama/indigo-yield-platform-v01/setup-warp-mcp-env.sh`

## 🎯 How to Use MCP Servers in Warp

### Step 1: Set Up Environment (One-time setup)
```bash
# Navigate to project directory
cd /Users/mama/indigo-yield-platform-v01

# Load environment variables
source setup-warp-mcp-env.sh

# Launch Warp with environment variables
open -a Warp
```

### Step 2: Access MCP Servers in Warp
1. Open Warp Settings: `⌘,` (Command + Comma)
2. Navigate to: **AI** → **Manage MCP servers**
3. You should see all configured servers listed
4. Toggle servers on/off as needed

### Step 3: Use MCP in Warp AI
When using Warp AI (Agent Mode), the MCP servers provide additional capabilities:

- **Memory**: Say "remember this" or "what did we discuss about..."
- **Sequential Thinking**: Complex problem-solving automatically uses this
- **Brave Search**: Say "search the web for..." or "find recent news about..."
- **Context7**: Say "find similar code" or "search documentation for..."
- **Bright Data**: Say "scrape this website" or "extract data from..."

## 🔧 Troubleshooting

### If MCP servers don't appear in Warp:

1. **Restart Warp completely**:
   ```bash
   # Quit Warp
   osascript -e 'quit app "Warp"'
   
   # Reload environment and restart
   source setup-warp-mcp-env.sh
   open -a Warp
   ```

2. **Check MCP configuration**:
   ```bash
   # Validate JSON syntax
   python3 -m json.tool ~/.warp/mcp.json > /dev/null && echo "✓ Config is valid" || echo "✗ Config has errors"
   ```

3. **Test individual servers**:
   ```bash
   # Test Memory server
   node /Users/mama/Desktop/mcp-servers/mcp-servers-official/src/memory/dist/index.js --version
   
   # Test npm packages
   npx -y @brave/brave-search-mcp-server@1.3.7 --help
   ```

### If API-based servers fail:

1. **Check API keys are set**:
   ```bash
   source setup-warp-mcp-env.sh
   # This will show which API keys are missing
   ```

2. **Update missing API keys**:
   ```bash
   # Edit the environment file
   nano .env.mcp
   # Add your API keys, then reload
   source setup-warp-mcp-env.sh
   ```

## 🔑 API Key Resources

Get your API keys from:

- **Brave Search**: https://api.search.brave.com/app/keys
- **Bright Data**: https://brightdata.com/dashboard
- **Upstash**: https://console.upstash.com/

## 📝 Adding Custom MCP Servers

To add more MCP servers to Warp:

1. Edit `~/.warp/mcp.json`
2. Add new server configuration following this template:
```json
"server-name": {
  "command": "npx",
  "args": ["-y", "@package/name"],
  "env": {
    "API_KEY": "${API_KEY}"
  },
  "disabled": false,
  "start_on_launch": false
}
```
3. Restart Warp

## 🚀 Quick Commands

```bash
# Check MCP status
cat ~/.warp/mcp.json | jq '.mcpServers | keys'

# Reload environment and restart Warp
source setup-warp-mcp-env.sh && open -a Warp

# View MCP logs (if available)
tail -f ~/Library/Logs/Warp/*.log

# Test all MCP servers
npx @modelcontextprotocol/inspector
```

## 📚 Additional Resources

- Warp MCP Documentation: https://docs.warp.dev/ai/mcp
- Model Context Protocol: https://modelcontextprotocol.io
- MCP Inspector: Run `npx @modelcontextprotocol/inspector` to test servers

## ✨ Tips

1. **Memory Server** automatically starts with Warp to maintain context
2. **Sequential Thinking** activates automatically for complex tasks
3. **API-based servers** (Brave, Bright Data, Context7) start on-demand
4. Use the MCP Inspector to debug connection issues
5. Keep API keys secure - never commit `.env.mcp` to git

---

**Configuration Status**: ✅ Complete
**Last Updated**: September 8, 2025
