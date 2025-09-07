#!/bin/bash

# Script to generate and open the Xcode project

echo "🚀 Setting up IndigoInvestor iOS Project..."

cd "$(dirname "$0")"

# Check if XcodeGen is installed
if ! command -v xcodegen &> /dev/null; then
    echo "📦 Installing XcodeGen..."
    brew install xcodegen
fi

# Generate Xcode project
echo "⚙️ Generating Xcode project..."
xcodegen generate

# Check if project was generated
if [ -f "IndigoInvestor.xcodeproj/project.pbxproj" ]; then
    echo "✅ Project generated successfully!"
    
    # Open in Xcode
    echo "🎯 Opening in Xcode..."
    open IndigoInvestor.xcodeproj
    
    echo ""
    echo "📱 Next Steps:"
    echo "1. Select your development team in Signing & Capabilities"
    echo "2. Add your Supabase credentials to Config/Secrets.xcconfig"
    echo "3. Build and run on simulator (⌘+R)"
    echo ""
    echo "🔐 Don't forget to add Config/Secrets.xcconfig with:"
    echo "   SUPABASE_URL = https://uxpzrxsnxlptkamkkaae.supabase.co"
    echo "   SUPABASE_ANON_KEY = [Your key from Supabase dashboard]"
else
    echo "❌ Failed to generate project. Please check the project.yml configuration."
    exit 1
fi
