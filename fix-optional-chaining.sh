#!/bin/bash

# Optional Chaining Cleanup Script
# Automatically fixes unnecessary optional chaining in YieldOperationsPage.tsx

set -e

echo "🔍 Optional Chaining Cleanup - YieldOperationsPage.tsx"
echo "========================================================"

FILE="src/pages/admin/YieldOperationsPage.tsx"

if [ ! -f "$FILE" ]; then
  echo "❌ Error: $FILE not found"
  exit 1
fi

# Create backup
BACKUP="${FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$FILE" "$BACKUP"
echo "✅ Backup created: $BACKUP"

# Count current occurrences
BEFORE_COUNT=$(grep -o "selectedFund?.asset" "$FILE" | wc -l | tr -d ' ')
echo "📊 Current 'selectedFund?.asset' count: $BEFORE_COUNT"

# Apply fixes
echo ""
echo "🔧 Applying fixes..."

# Fix 1: Remove || "" fallback on line 463
sed -i.tmp 's/asset={selectedFund\.asset || ""}/asset={selectedFund.asset}/g' "$FILE"
echo "  ✓ Fixed line 463: removed || \"\" fallback"

# Fix 2: Remove ?. after selectedFund null check
sed -i.tmp 's/{selectedFund?.asset}/{selectedFund.asset}/g' "$FILE"
echo "  ✓ Fixed optional chaining inside null-checked blocks"

# Fix 3: Remove || "USD" fallback
sed -i.tmp 's/selectedFund?.asset || "USD"/selectedFund.asset/g' "$FILE"
echo "  ✓ Fixed fallback to USD"

# Fix 4: Remove || "" in format calls
sed -i.tmp 's/selectedFund?.asset || ""/selectedFund.asset/g' "$FILE"
echo "  ✓ Fixed empty string fallbacks"

# Clean up temporary files
rm -f "${FILE}.tmp"

# Count after fixes
AFTER_COUNT=$(grep -o "selectedFund?.asset" "$FILE" | wc -l | tr -d ' ')
REMOVED=$((BEFORE_COUNT - AFTER_COUNT))

echo ""
echo "📊 Results:"
echo "  Before: $BEFORE_COUNT occurrences"
echo "  After:  $AFTER_COUNT occurrences"
echo "  Removed: $REMOVED unnecessary optional chains"

echo ""
echo "✅ Fixes applied successfully!"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff $FILE"
echo "  2. Test the page: npm run dev"
echo "  3. If issues occur: cp $BACKUP $FILE"
echo ""
echo "Backup location: $BACKUP"

