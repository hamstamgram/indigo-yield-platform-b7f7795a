#!/bin/bash

# iOS Screen Inventory and Analysis Script
# Generates comprehensive screen list for testing

VIEWS_DIR="/Users/mama/Desktop/Claude code/indigo-yield-platform-v01/ios/IndigoInvestor/Views"
OUTPUT="/Users/mama/Desktop/Claude code/indigo-yield-platform-v01/ios/test-reports/screen_inventory.txt"

echo "=== INDIGO YIELD PLATFORM iOS - ALL SCREENS INVENTORY ===" > "$OUTPUT"
echo "Generated: $(date)" >> "$OUTPUT"
echo "" >> "$OUTPUT"

TOTAL=0

# Function to count and list screens
list_category() {
    local category=$1
    local dir="$VIEWS_DIR/$category"

    if [ -d "$dir" ]; then
        echo "## $category" >> "$OUTPUT"
        echo "" >> "$OUTPUT"

        local count=0
        for file in "$dir"/*.swift; do
            if [ -f "$file" ]; then
                basename "$file" >> "$OUTPUT"
                ((count++))
                ((TOTAL++))
            fi
        done

        echo "" >> "$OUTPUT"
        echo "Count: $count screens" >> "$OUTPUT"
        echo "---" >> "$OUTPUT"
        echo "" >> "$OUTPUT"
    fi
}

# List all categories
list_category "Authentication"
list_category "Onboarding"
list_category "Home"
list_category "Dashboard"
list_category "Portfolio"
list_category "Transactions"
list_category "Withdrawals"
list_category "Documents"
list_category "Statements"
list_category "Profile"
list_category "Settings"
list_category "Reports"
list_category "Notifications"
list_category "Support"
list_category "Admin"
list_category "Account"
list_category "Yield"
list_category "Newsletter"
list_category "Components"

echo "=== TOTAL SCREENS: $TOTAL ===" >> "$OUTPUT"

cat "$OUTPUT"
