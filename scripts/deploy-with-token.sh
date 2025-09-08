#!/bin/bash

# Deployment script for Vercel using token authentication
# This bypasses Git author checks

echo "🚀 Starting deployment to Vercel..."

# Check if VERCEL_TOKEN is set
if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ Error: VERCEL_TOKEN environment variable is not set"
    echo "Please set it with: export VERCEL_TOKEN='your-token-here'"
    echo ""
    echo "To create a token:"
    echo "1. Go to https://vercel.com/account/tokens"
    echo "2. Create a new token with deployment permissions"
    echo "3. Export it: export VERCEL_TOKEN='your-token'"
    exit 1
fi

# Function to deploy
deploy() {
    local target=$1
    local prod_flag=""
    
    if [ "$target" == "production" ]; then
        prod_flag="--prod"
    fi
    
    echo "📦 Building project..."
    npm run build
    
    echo "🔨 Creating Vercel build..."
    vercel build --token=$VERCEL_TOKEN
    
    echo "🚢 Deploying to $target..."
    vercel deploy --prebuilt --token=$VERCEL_TOKEN $prod_flag --yes
    
    if [ $? -eq 0 ]; then
        echo "✅ Deployment to $target successful!"
    else
        echo "❌ Deployment to $target failed"
        exit 1
    fi
}

# Main script
case "$1" in
    preview|staging)
        echo "Deploying to preview/staging environment..."
        deploy "preview"
        ;;
    production|prod)
        echo "⚠️  Deploying to PRODUCTION environment..."
        read -p "Are you sure you want to deploy to production? (yes/no): " confirm
        if [ "$confirm" == "yes" ]; then
            deploy "production"
        else
            echo "Production deployment cancelled."
            exit 0
        fi
        ;;
    *)
        echo "Usage: $0 {preview|staging|production|prod}"
        echo ""
        echo "Examples:"
        echo "  $0 preview      # Deploy to preview environment"
        echo "  $0 staging      # Same as preview"
        echo "  $0 production   # Deploy to production (requires confirmation)"
        echo "  $0 prod         # Same as production"
        exit 1
        ;;
esac

echo "🎉 Deployment process complete!"
