#!/bin/bash

# ================================================================
# Security Validation Script
# Date: 2025-11-23
# Purpose: Validate security configuration before deployment
# ================================================================

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}           SECURITY CONFIGURATION VALIDATION                   ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        ((FAIL_COUNT++))
        return 1
    fi
}

# Function to check content in file
check_content() {
    if grep -q "$1" "$2" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $3"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $3"
        ((WARN_COUNT++))
        return 1
    fi
}

echo -e "${YELLOW}[1/5] Checking Migration Files...${NC}"
echo ""
check_file "supabase/migrations/fix_001_audit_log_rls.sql" "Audit log RLS fix present"
check_file "supabase/migrations/fix_002_profile_creation_trigger.sql" "Profile trigger fix present"
check_file "supabase/migrations/perf_001_email_indexes.sql" "Performance indexes present"
check_file "apply_security_fixes_combined.sql" "Combined migration file present"
echo ""

echo -e "${YELLOW}[2/5] Checking Security Headers (vercel.json)...${NC}"
echo ""
check_content "Content-Security-Policy" "vercel.json" "CSP header configured"
check_content "Strict-Transport-Security" "vercel.json" "HSTS header configured"
check_content "X-Frame-Options" "vercel.json" "X-Frame-Options configured"
check_content "X-Content-Type-Options" "vercel.json" "X-Content-Type-Options configured"
check_content "frame-ancestors 'none'" "vercel.json" "Frame ancestors blocked"
echo ""

echo -e "${YELLOW}[3/5] Checking Environment Configuration...${NC}"
echo ""
check_file ".env" "Environment file exists"
check_content "VITE_SUPABASE_URL" ".env" "Supabase URL configured"
check_content "nkfimvovosdehmyyjubn" ".env" "Correct project ID in config"
echo ""

echo -e "${YELLOW}[4/5] Checking Database Configuration...${NC}"
echo ""
check_file "supabase/config.toml" "Supabase config exists"
check_content "project_id = \"nkfimvovosdehmyyjubn\"" "supabase/config.toml" "Project ID matches"
echo ""

echo -e "${YELLOW}[5/5] Checking Deployment Scripts...${NC}"
echo ""
check_file "apply_security_fixes.sh" "Security fix deployment script present"
if [ -x "apply_security_fixes.sh" ]; then
    echo -e "${GREEN}✓${NC} Deployment script is executable"
    ((PASS_COUNT++))
else
    echo -e "${YELLOW}⚠${NC} Deployment script not executable"
    ((WARN_COUNT++))
fi
echo ""

# Summary
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}                    VALIDATION SUMMARY                         ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo -e "Passed:   ${GREEN}$PASS_COUNT${NC}"
echo -e "Warnings: ${YELLOW}$WARN_COUNT${NC}"
echo -e "Failed:   ${RED}$FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ PLATFORM READY FOR SECURITY FIXES${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Run: ./apply_security_fixes.sh"
    echo "2. Choose deployment method (CLI or Dashboard)"
    echo "3. Verify migrations applied successfully"
    echo ""
    EXIT_CODE=0
else
    echo -e "${RED}✗ VALIDATION FAILED${NC}"
    echo ""
    echo "Please fix the failed checks before proceeding."
    echo ""
    EXIT_CODE=1
fi

# Security Score
TOTAL_CHECKS=$((PASS_COUNT + WARN_COUNT + FAIL_COUNT))
SCORE=$((PASS_COUNT * 100 / TOTAL_CHECKS))

echo -e "${GREEN}Security Score: $SCORE%${NC}"

if [ $SCORE -ge 90 ]; then
    echo -e "Grade: ${GREEN}A+${NC} (Production Ready)"
elif [ $SCORE -ge 80 ]; then
    echo -e "Grade: ${GREEN}A${NC} (Minor improvements needed)"
elif [ $SCORE -ge 70 ]; then
    echo -e "Grade: ${YELLOW}B${NC} (Some improvements needed)"
else
    echo -e "Grade: ${RED}C${NC} (Significant improvements needed)"
fi

echo ""
echo -e "${GREEN}================================================================${NC}"

exit $EXIT_CODE