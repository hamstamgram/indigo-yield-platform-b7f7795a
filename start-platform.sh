#!/bin/bash

# Indigo Yield Platform Startup Script
# This script ensures the platform starts correctly with all dependencies

echo "🚀 Starting Indigo Yield Platform..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --force
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create it with the required environment variables."
    echo "Required variables:"
    echo "  - VITE_SUPABASE_URL"
    echo "  - VITE_SUPABASE_PUBLISHABLE_KEY"
    echo "  - VITE_PORTFOLIO_SUPABASE_URL"
    echo "  - VITE_PORTFOLIO_SUPABASE_ANON_KEY"
    exit 1
fi

# Kill any existing process on port 8080
echo "🔧 Checking port 8080..."
lsof -ti:8080 | xargs kill -9 2>/dev/null

# Start the development server
echo "✨ Starting development server on http://localhost:8080"
echo ""
echo "📋 Available Admin Features:"
echo "  • Dashboard: http://localhost:8080/admin"
echo "  • Portfolio Dashboard: http://localhost:8080/admin/portfolio"
echo "  • Investor Management: http://localhost:8080/admin/investors"
echo "  • Yield Settings: http://localhost:8080/admin/yield-settings"
echo ""
echo "Press Ctrl+C to stop the server"
echo "----------------------------------------"

npm run dev
