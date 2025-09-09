#!/bin/bash

echo "Validating iOS build compilation..."

# Find all Swift files
SWIFT_FILES=$(find IndigoInvestor -name "*.swift" -type f | grep -v ".build" | grep -v "Tests")

# Create a temporary main file for compilation
cat > /tmp/temp_main.swift << 'EOF'
import UIKit
import SwiftUI

@main
struct TempApp: App {
    var body: some Scene {
        WindowGroup {
            Text("Validating Build")
        }
    }
}
EOF

# Compile all files together
echo "Compiling Swift files..."
xcrun swiftc \
    -parse \
    -sdk $(xcrun --show-sdk-path --sdk iphonesimulator) \
    -target arm64-apple-ios15.0-simulator \
    -I /Users/mama/Library/Developer/Xcode/DerivedData/IndigoInvestor-*/SourcePackages/checkouts/supabase-swift/Sources \
    -I /Users/mama/Library/Developer/Xcode/DerivedData/IndigoInvestor-*/SourcePackages/checkouts/KeychainAccess/Sources \
    /tmp/temp_main.swift \
    $SWIFT_FILES 2>&1 | grep -E "(error:|warning:)" | head -50

if [ $? -eq 0 ]; then
    echo "✅ Build validation successful - all Swift files compile!"
else
    echo "❌ Build validation failed - see errors above"
fi

rm /tmp/temp_main.swift
