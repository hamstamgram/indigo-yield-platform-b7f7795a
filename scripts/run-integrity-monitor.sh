#!/bin/bash
# Run integrity monitor edge function locally or against production

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default to local
ENVIRONMENT="${1:-local}"
TRIGGERED_BY="${2:-manual}"

echo "🔍 Running Integrity Monitor..."
echo "Environment: $ENVIRONMENT"
echo "Triggered by: $TRIGGERED_BY"
echo ""

if [ "$ENVIRONMENT" == "local" ]; then
  # Local Supabase
  SUPABASE_URL="http://127.0.0.1:54321"
  # Get anon key from supabase status or use default
  ANON_KEY=$(cd "$(dirname "$0")/.." && npx supabase status 2>/dev/null | grep "anon key" | awk '{print $NF}' || echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0")
else
  # Production - requires environment variables
  if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for production${NC}"
    exit 1
  fi
  ANON_KEY="$SUPABASE_SERVICE_ROLE_KEY"
fi

# Run the function
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/integrity-monitor" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"triggered_by\": \"${TRIGGERED_BY}\"}")

# Parse response
STATUS=$(echo "$RESPONSE" | jq -r '.status // "unknown"')
RUN_ID=$(echo "$RESPONSE" | jq -r '.run_id // "N/A"')
TOTAL=$(echo "$RESPONSE" | jq -r '.summary.total // 0')
PASSED=$(echo "$RESPONSE" | jq -r '.summary.passed // 0')
FAILED=$(echo "$RESPONSE" | jq -r '.summary.failed // 0')
CRITICAL=$(echo "$RESPONSE" | jq -r '.summary.critical // 0')
RUNTIME=$(echo "$RESPONSE" | jq -r '.runtime_ms // 0')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$STATUS" == "pass" ]; then
  echo -e "${GREEN}✅ INTEGRITY CHECK PASSED${NC}"
else
  echo -e "${RED}❌ INTEGRITY CHECK FAILED${NC}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run ID: $RUN_ID"
echo "Runtime: ${RUNTIME}ms"
echo ""
echo "Summary:"
echo "  Total checks: $TOTAL"
echo -e "  Passed: ${GREEN}$PASSED${NC}"
echo -e "  Failed: ${RED}$FAILED${NC}"
echo -e "  Critical: ${RED}$CRITICAL${NC}"
echo ""

# Show failures if any
if [ "$FAILED" -gt 0 ]; then
  echo "Failed Checks:"
  echo "$RESPONSE" | jq -r '.results[] | select(.status == "fail") | "  - \(.name) (\(.severity)): \(.count) issues"'
  echo ""
fi

# Exit with error if critical failures
if [ "$CRITICAL" -gt 0 ]; then
  echo -e "${RED}⚠️  Critical failures detected - review immediately!${NC}"
  exit 1
fi

exit 0
