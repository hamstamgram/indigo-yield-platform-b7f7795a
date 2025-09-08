#!/bin/bash

# Warp MCP Environment Setup Script
# This script exports environment variables needed for MCP servers in Warp

echo "Setting up MCP environment variables for Warp..."

# Load the .env.mcp file if it exists
if [ -f "/Users/mama/indigo-yield-platform-v01/.env.mcp" ]; then
    echo "Loading environment from .env.mcp..."
    set -a
    source /Users/mama/indigo-yield-platform-v01/.env.mcp
    set +a
fi

# Export specific variables that Warp MCP servers need
# These will be available to Warp when launched from this terminal

# Memory and Sequential Thinking (already have paths in config)
echo "✓ Memory and Sequential Thinking servers configured with local paths"

# Bright Data
if [ -z "$BRIGHTDATA_API_TOKEN" ]; then
    echo "⚠️  BRIGHTDATA_API_TOKEN not set - Bright Data MCP will not work"
    echo "   Get your API token from: https://brightdata.com/dashboard"
else
    echo "✓ Bright Data API token found"
fi

# Upstash Context7
if [ -z "$UPSTASH_VECTOR_REST_URL" ] || [ -z "$UPSTASH_VECTOR_REST_TOKEN" ]; then
    echo "⚠️  Upstash Context7 credentials not set - Context7 MCP will not work"
    echo "   Get your credentials from: https://console.upstash.com/"
else
    echo "✓ Upstash Context7 credentials found"
fi

# Brave Search
if [ -z "$BRAVE_API_KEY" ]; then
    echo "⚠️  BRAVE_API_KEY not set - Brave Search MCP will not work"
    echo "   Get your API key from: https://api.search.brave.com/app/keys"
else
    echo "✓ Brave Search API key found"
fi

# Airtable MCP Server
if [ -z "$AIRTABLE_API_KEY" ]; then
    echo "⚠️  AIRTABLE_API_KEY not set - Airtable MCP will not work"
    echo "   Get your Personal Access Token from: https://airtable.com/create/tokens"
else
    echo "✓ Airtable API key found"
    # Check if it starts with 'pat' (Personal Access Token format)
    if [[ "$AIRTABLE_API_KEY" =~ ^pat ]]; then
        echo "   Token format looks correct (starts with 'pat')"
    else
        echo "   ⚠️  Warning: Token doesn't start with 'pat' - ensure it's a Personal Access Token"
    fi
    # Export additional Airtable variables
    export AIRTABLE_API_KEY
    export AIRTABLE_BASE_IDS="${AIRTABLE_BASE_IDS:-}"
    export AIRTABLE_API_URL="${AIRTABLE_API_URL:-https://api.airtable.com}"
    if [ -n "$AIRTABLE_BASE_IDS" ]; then
        echo "   Restricted to specific bases: $AIRTABLE_BASE_IDS"
    fi
fi

echo ""
echo "Environment setup complete!"
echo ""
echo "To use MCP servers in Warp:"
echo "1. Run this script: source setup-warp-mcp-env.sh"
echo "2. Launch Warp from this terminal: open -a Warp"
echo "3. In Warp, go to Settings > AI > Manage MCP servers"
echo "4. Your MCP servers should now be available"
echo ""
echo "Note: You may need to restart Warp for changes to take effect."
