#!/bin/bash
# RPC Type Checker Script
# Helps identify RPC calls that need type annotations

echo "🔍 Scanning for untyped RPC calls..."
echo ""

# Find all .rpc( calls without .returns<
echo "=== Files with potentially untyped RPC calls ==="
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "\.rpc(" {} \; | while read file; do
  # Check if file has untyped RPC calls (rpc( not followed by .returns<)
  if grep -q "\.rpc(" "$file" && ! grep -q "\.returns<Database" "$file" 2>/dev/null; then
    echo "📄 $file"
    grep -n "\.rpc(" "$file" | head -5
    echo ""
  fi
done

echo ""
echo "=== Summary ==="
total_files=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "\.rpc(" {} \; | wc -l | tr -d ' ')
typed_files=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "\.returns<Database" {} \; | wc -l | tr -d ' ')

echo "Total files with RPC calls: $total_files"
echo "Files with typed RPC calls: $typed_files"
echo "Files needing migration: $((total_files - typed_files))"
echo ""
echo "✅ Run 'npx tsc --noEmit' to check for type errors"
