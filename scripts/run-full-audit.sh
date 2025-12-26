#!/bin/bash
# Full Platform Audit Script
# Runs all checks: migrations, smoke tests, integrity views

set -e

echo "🔍 Starting full platform audit..."
echo ""

# 1. Migration pattern check
echo "=== Step 1: Migration Pattern Check ==="
if ./scripts/check-migrations.sh; then
  echo "✅ Migration patterns OK"
else
  echo "❌ Migration pattern check failed"
  exit 1
fi
echo ""

# 2. DB Smoke Test
echo "=== Step 2: Database Smoke Test ==="
if ./scripts/db-smoke-test.sh; then
  echo "✅ Smoke tests passed"
else
  echo "❌ Smoke tests failed"
  exit 1
fi
echo ""

echo "=========================================="
echo "✅ Full audit PASSED"
echo "=========================================="
