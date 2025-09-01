#!/bin/bash

# MCP Servers Setup Script for Indigo Yield Platform

echo "🔧 Setting up MCP Servers for Indigo Yield Platform"
echo "=================================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'ENVEOF'
# GitHub Integration
GITHUB_TOKEN=your_github_token_here

# Supabase Database URLs
SUPABASE_DEV_DB_URL=postgresql://user:password@host:port/database
SUPABASE_PROD_DB_URL=postgresql://user:password@host:port/database

# Vercel Deployment
VERCEL_TOKEN=your_vercel_token_here

# Sentry Error Tracking
SENTRY_TOKEN=your_sentry_token_here

# Optional: Email (if using custom SMTP implementation)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password

# Optional: PostHog Analytics (if using custom implementation)
POSTHOG_KEY=your_posthog_key_here
ENVEOF
    echo "✅ Created .env file with placeholder values"
    echo "⚠️  Please update the values in .env with your actual credentials"
else
    echo "✅ .env file already exists"
fi

# Check if MCP servers are installed
echo ""
echo "🔍 Checking installed MCP servers..."

servers=(
    "@modelcontextprotocol/server-filesystem"
    "@modelcontextprotocol/server-github"
    "enhanced-postgres-mcp-server"
    "@playwright/mcp"
    "@vercel/mcp-adapter"
    "@sentry/mcp-server"
)

for server in "${servers[@]}"; do
    if npm list -g "$server" &> /dev/null; then
        echo "✅ $server"
    else
        echo "❌ $server (not installed)"
    fi
done

echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your actual credentials"
echo "2. Test individual MCP servers: npx <server-name> --help"
echo "3. Configure your MCP client to use mcp-servers.json"
echo "4. Remember: Use dev database for testing, follow RLS rules"

echo ""
echo "🚀 MCP setup complete! Check mcp-servers.json for configuration details."
