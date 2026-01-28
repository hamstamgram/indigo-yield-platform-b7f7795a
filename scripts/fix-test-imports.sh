#!/bin/bash
# Fix Jest/Vitest import conflict
# Replaces vitest imports with @jest/globals in all test files

set -e

echo "🔧 Fixing Jest/Vitest import conflicts..."
echo ""

# Find all test files with vitest imports
TEST_FILES=$(grep -rl "from ['\"]vitest['\"]" tests/unit/ 2>/dev/null || true)

if [ -z "$TEST_FILES" ]; then
    echo "✅ No vitest imports found - tests already fixed!"
    exit 0
fi

echo "📝 Found test files with vitest imports:"
echo "$TEST_FILES" | while read -r file; do
    echo "  - $file"
done
echo ""

# Backup
BACKUP_DIR=".test-backups-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "💾 Creating backup in $BACKUP_DIR..."

echo "$TEST_FILES" | while read -r file; do
    cp "$file" "$BACKUP_DIR/$(basename "$file")"
done

echo ""
echo "🔄 Replacing vitest imports with @jest/globals..."

# Replace vitest with @jest/globals
echo "$TEST_FILES" | while read -r file; do
    sed -i '' 's/from "vitest"/from "@jest\/globals"/g' "$file"
    sed -i '' "s/from 'vitest'/from '@jest\/globals'/g" "$file"
    echo "  ✓ Fixed: $file"
done

echo ""
echo "✅ Import fixes complete!"
echo ""
echo "📦 Installing @jest/globals if missing..."
npm install --save-dev @jest/globals

echo ""
echo "🧪 Running tests to verify fix..."
npm test 2>&1 | head -50

echo ""
echo "✅ Done! Backup saved to: $BACKUP_DIR"
echo ""
echo "To rollback: cp $BACKUP_DIR/* tests/unit/utils/"
