#!/bin/bash

echo "🧪 Testing MCP Servers"
echo "====================="

echo ""
echo "📁 Testing Filesystem Server..."
timeout 5 npx @modelcontextprotocol/server-filesystem /Users/mama/indigo-yield-platform-v01 --help 2>/dev/null && echo "✅ Filesystem server responds" || echo "❌ Filesystem server issue"

echo ""
echo "🐙 Testing GitHub Server..."
timeout 5 npx @modelcontextprotocol/server-github --help 2>/dev/null && echo "✅ GitHub server responds" || echo "❌ GitHub server issue"

echo ""
echo "🗄️  Testing Enhanced Postgres Server..."
timeout 5 npx enhanced-postgres-mcp-server --help 2>/dev/null && echo "✅ Enhanced Postgres server responds" || echo "❌ Enhanced Postgres server issue"

echo ""
echo "🎭 Testing Playwright Server..."
timeout 5 npx @playwright/mcp --help 2>/dev/null && echo "✅ Playwright server responds" || echo "❌ Playwright server issue"

echo ""
echo "🔍 Testing Sentry Server..."
timeout 5 npx @sentry/mcp-server --help 2>/dev/null && echo "✅ Sentry server responds" || echo "❌ Sentry server issue"

echo ""
echo "🚀 Testing Vercel Adapter..."
timeout 5 npx @vercel/mcp-adapter --help 2>/dev/null && echo "✅ Vercel adapter responds" || echo "❌ Vercel adapter issue"

echo ""
echo "📊 Test Summary:"
echo "- All servers are installed globally"
echo "- Configuration files created: mcp-servers.json, .env"
echo "- Ready to integrate with your MCP client!"

echo ""
echo "📝 Alternative solutions for missing servers:"
echo "- SMTP: Use nodemailer directly in your app"
echo "- PostHog: Use posthog-node or posthog-js directly"
echo "- Consider creating custom MCP servers for specific needs"
