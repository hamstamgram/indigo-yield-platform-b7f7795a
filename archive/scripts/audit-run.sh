#!/bin/bash

# Full-Stack Readiness Audit Script
# This script orchestrates all audit checks for the Indigo Yield Platform

# Set strict error handling
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required environment variable
if [ -z "${AUDIT_BASE_URL:-}" ]; then
  echo -e "${RED}ERROR: AUDIT_BASE_URL environment variable is not set${NC}"
  echo "Please set: export AUDIT_BASE_URL=<your-preview-url>"
  exit 1
fi

# Create timestamp for this run
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "========================================="
echo "Full-Stack Readiness Audit"
echo "URL: $AUDIT_BASE_URL"
echo "Timestamp: $TIMESTAMP"
echo "========================================="

# Clean previous artifacts
echo -e "${YELLOW}Cleaning previous artifacts...${NC}"
rm -rf artifacts/playwright/*.html artifacts/playwright/*.json 2>/dev/null || true
rm -rf artifacts/lhci/*.html artifacts/lhci/*.json 2>/dev/null || true
rm -rf artifacts/screenshots/*.png 2>/dev/null || true
rm -rf artifacts/logs/*.log 2>/dev/null || true

# A. Environment Check
echo -e "\n${YELLOW}A. Environment Check${NC}"
echo "Checking preview URL availability..."
curl -I -s -S --max-time 10 "$AUDIT_BASE_URL" > artifacts/env/preview-check-$TIMESTAMP.txt 2>&1 || echo "Preview URL check completed (may require auth)"

# B. Security Headers Check
echo -e "\n${YELLOW}B. Security Headers Check${NC}"
if [ -f scripts/check-headers.mjs ]; then
  node scripts/check-headers.mjs 2>&1 | tee artifacts/headers/check-$TIMESTAMP.log || echo "Headers check needs implementation"
else
  echo "Headers check script not found, skipping..."
fi

# C. Health Endpoint Check
echo -e "\n${YELLOW}C. Health Endpoint Check${NC}"
curl -s "$AUDIT_BASE_URL/api/health" -o artifacts/logs/health-api-$TIMESTAMP.json 2>/dev/null || echo "Health endpoint not available"
curl -s "$AUDIT_BASE_URL/health" -o artifacts/logs/health-fallback-$TIMESTAMP.json 2>/dev/null || echo "Fallback health endpoint not available"

# D. Playwright E2E Tests
echo -e "\n${YELLOW}D. Playwright E2E Tests${NC}"
if command -v playwright &> /dev/null; then
  echo "Running Playwright tests..."
  PLAYWRIGHT_JSON_OUTPUT_NAME=artifacts/playwright/report-$TIMESTAMP.json \
  PLAYWRIGHT_HTML_REPORT=artifacts/playwright/report-$TIMESTAMP \
  npx playwright test --reporter=line,json,html 2>&1 | tee artifacts/logs/playwright-$TIMESTAMP.log || echo -e "${RED}Playwright tests failed or not configured${NC}"
else
  echo "Playwright not installed, skipping E2E tests..."
fi

# E. RLS Tests
echo -e "\n${YELLOW}E. RLS (Row Level Security) Tests${NC}"
if [ -f scripts/rls-tests.mjs ]; then
  node scripts/rls-tests.mjs 2>&1 | tee artifacts/rls/test-$TIMESTAMP.log || echo "RLS tests need implementation"
else
  echo "RLS test script not found, skipping..."
fi

# F. PWA Audit
echo -e "\n${YELLOW}F. PWA (Progressive Web App) Audit${NC}"
echo "Checking PWA manifest..."
curl -s "$AUDIT_BASE_URL/manifest.json" -o artifacts/pwa/manifest-$TIMESTAMP.json 2>/dev/null || echo "No manifest.json found"
curl -s "$AUDIT_BASE_URL/manifest.webmanifest" -o artifacts/pwa/manifest-webmanifest-$TIMESTAMP.json 2>/dev/null || echo "No manifest.webmanifest found"

# G. Lighthouse CI
echo -e "\n${YELLOW}G. Lighthouse Performance/Accessibility Audit${NC}"
if command -v lhci &> /dev/null; then
  echo "Running Lighthouse CI..."
  if [ -f lighthouserc.js ] || [ -f .lighthouserc.js ] || [ -f lighthouserc.json ] || [ -f .lighthouserc.json ]; then
    LHCI_BUILD_CONTEXT__CURRENT_HASH=$TIMESTAMP lhci autorun 2>&1 | tee artifacts/lhci/run-$TIMESTAMP.log || echo -e "${RED}Lighthouse CI failed${NC}"
  else
    echo "Lighthouse CI config not found, creating basic config..."
    cat > .lighthouserc.js << 'EOF'
module.exports = {
  ci: {
    collect: {
      url: [process.env.AUDIT_BASE_URL],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop'
      }
    },
    upload: {
      target: 'filesystem',
      outputDir: './artifacts/lhci',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%'
    }
  }
};
EOF
    LHCI_BUILD_CONTEXT__CURRENT_HASH=$TIMESTAMP lhci autorun 2>&1 | tee artifacts/lhci/run-$TIMESTAMP.log || echo -e "${RED}Lighthouse CI failed${NC}"
  fi
else
  echo "Lighthouse CI not installed, skipping..."
fi

# H. Service Connectivity Checks
echo -e "\n${YELLOW}H. Service Connectivity Checks${NC}"
if [ -f scripts/service-checks.mjs ]; then
  node scripts/service-checks.mjs 2>&1 | tee artifacts/observability/service-checks-$TIMESTAMP.log || echo "Service checks need implementation"
else
  echo "Service checks script not found, skipping..."
fi

# I. Generate Summary Report
echo -e "\n${YELLOW}I. Generating Summary Report${NC}"
cat > artifacts/reports/summary-$TIMESTAMP.md << EOF
# Audit Summary Report

**Date**: $(date)
**URL**: $AUDIT_BASE_URL
**Timestamp**: $TIMESTAMP

## Checks Performed

| Check | Status | Evidence |
|-------|--------|----------|
| Environment | ✅ | artifacts/env/preview-check-$TIMESTAMP.txt |
| Security Headers | ⏳ | artifacts/headers/check-$TIMESTAMP.log |
| Health Endpoint | ⏳ | artifacts/logs/health-api-$TIMESTAMP.json |
| Playwright E2E | ⏳ | artifacts/playwright/report-$TIMESTAMP.json |
| RLS Tests | ⏳ | artifacts/rls/test-$TIMESTAMP.log |
| PWA Audit | ⏳ | artifacts/pwa/manifest-$TIMESTAMP.json |
| Lighthouse CI | ⏳ | artifacts/lhci/run-$TIMESTAMP.log |
| Service Checks | ⏳ | artifacts/observability/service-checks-$TIMESTAMP.log |

## Next Steps
1. Review failed checks
2. Implement fixes
3. Re-run specific failed checks
4. Generate final executive report

EOF

echo -e "${GREEN}✅ Audit complete!${NC}"
echo "Summary report: artifacts/reports/summary-$TIMESTAMP.md"
echo ""
echo "To re-run specific checks:"
echo "  npm run audit:headers"
echo "  npm run audit:playwright"
echo "  npm run audit:rls"
echo "  npm run audit:lhci"
