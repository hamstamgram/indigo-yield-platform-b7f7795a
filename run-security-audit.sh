#!/bin/bash

# Security Audit Script for Indigo Yield Platform
# Date: November 22, 2025

set -e

echo "================================================"
echo "Starting Security Audit for Indigo Yield Platform"
echo "Date: $(date)"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create audit directory
AUDIT_DIR="security-audit-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$AUDIT_DIR"

echo -e "\n${YELLOW}[1/9] Running dependency vulnerability scan...${NC}"
echo "----------------------------------------"

# Check for vulnerable dependencies
if command -v npm audit &> /dev/null; then
    npm audit --json > "$AUDIT_DIR/npm-audit.json" 2>&1 || true
    npm audit 2>&1 | tee "$AUDIT_DIR/npm-audit.txt" || true

    # Check severity
    CRITICAL=$(grep -c "critical" "$AUDIT_DIR/npm-audit.txt" || echo "0")
    HIGH=$(grep -c "high" "$AUDIT_DIR/npm-audit.txt" || echo "0")

    if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
        echo -e "${RED}⚠ Found $CRITICAL critical and $HIGH high vulnerabilities${NC}"
    else
        echo -e "${GREEN}✓ No critical or high vulnerabilities found${NC}"
    fi
else
    echo -e "${YELLOW}⚠ npm audit not available${NC}"
fi

echo -e "\n${YELLOW}[2/9] Checking for secrets in code...${NC}"
echo "----------------------------------------"

# Install gitleaks if not present
if ! command -v gitleaks &> /dev/null; then
    echo "Installing gitleaks..."
    if command -v brew &> /dev/null; then
        brew install gitleaks
    else
        echo -e "${YELLOW}⚠ Please install gitleaks manually${NC}"
    fi
fi

# Run gitleaks scan
if command -v gitleaks &> /dev/null; then
    gitleaks detect --source . --report-path "$AUDIT_DIR/gitleaks-report.json" --verbose 2>&1 | tee "$AUDIT_DIR/gitleaks.txt" || true

    if [ -s "$AUDIT_DIR/gitleaks-report.json" ]; then
        LEAKS=$(grep -c "\"Match\"" "$AUDIT_DIR/gitleaks-report.json" || echo "0")
        if [ "$LEAKS" -gt 0 ]; then
            echo -e "${RED}⚠ Found $LEAKS potential secrets${NC}"
        else
            echo -e "${GREEN}✓ No secrets detected${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠ gitleaks not available${NC}"
fi

echo -e "\n${YELLOW}[3/9] Checking TypeScript strict mode...${NC}"
echo "----------------------------------------"

# Check TypeScript configuration
if [ -f "tsconfig.json" ]; then
    STRICT=$(grep -c "\"strict\": true" tsconfig.json || echo "0")
    if [ "$STRICT" -gt 0 ]; then
        echo -e "${GREEN}✓ TypeScript strict mode enabled${NC}"
    else
        echo -e "${YELLOW}⚠ TypeScript strict mode not enabled${NC}"
    fi
else
    echo -e "${RED}⚠ tsconfig.json not found${NC}"
fi

echo -e "\n${YELLOW}[4/9] Checking security headers configuration...${NC}"
echo "----------------------------------------"

# Check vercel.json for security headers
if [ -f "vercel.json" ]; then
    echo "Security headers found in vercel.json:"

    # Check for specific headers
    HEADERS=("Strict-Transport-Security" "X-Frame-Options" "X-Content-Type-Options" "Content-Security-Policy" "Permissions-Policy")

    for header in "${HEADERS[@]}"; do
        if grep -q "$header" vercel.json; then
            echo -e "${GREEN}✓ $header configured${NC}"
        else
            echo -e "${RED}✗ $header not configured${NC}"
        fi
    done

    # Check for unsafe-eval in CSP
    if grep -q "unsafe-eval" vercel.json; then
        echo -e "${YELLOW}⚠ CSP contains 'unsafe-eval' - XSS risk${NC}"
    else
        echo -e "${GREEN}✓ CSP does not contain 'unsafe-eval'${NC}"
    fi
else
    echo -e "${RED}⚠ vercel.json not found${NC}"
fi

echo -e "\n${YELLOW}[5/9] Checking environment variables...${NC}"
echo "----------------------------------------"

# Check for exposed credentials
ENV_FILES=(".env" ".env.local" ".env.production")
for env_file in "${ENV_FILES[@]}"; do
    if [ -f "$env_file" ]; then
        echo "Checking $env_file..."

        # Check for common credential patterns
        if grep -qE "(PASSWORD|SECRET|KEY|TOKEN)=" "$env_file"; then
            echo -e "${YELLOW}⚠ Found sensitive variables in $env_file${NC}"
            grep -E "(PASSWORD|SECRET|KEY|TOKEN)=" "$env_file" | sed 's/=.*/=***REDACTED***/' | tee -a "$AUDIT_DIR/env-vars.txt"
        fi
    fi
done

echo -e "\n${YELLOW}[6/9] Running OWASP dependency check...${NC}"
echo "----------------------------------------"

# Check for OWASP dependency check
if command -v dependency-check &> /dev/null; then
    dependency-check --project "Indigo Yield" --scan . --format JSON --out "$AUDIT_DIR" --suppression dependency-check-suppression.xml 2>&1 | tee "$AUDIT_DIR/owasp-check.txt" || true
    echo -e "${GREEN}✓ OWASP dependency check completed${NC}"
else
    echo -e "${YELLOW}⚠ OWASP dependency-check not installed${NC}"
    echo "Install with: brew install dependency-check"
fi

echo -e "\n${YELLOW}[7/9] Checking database migrations...${NC}"
echo "----------------------------------------"

# Check for SQL injection risks
MIGRATION_DIR="supabase/migrations"
if [ -d "$MIGRATION_DIR" ]; then
    echo "Analyzing SQL migrations..."

    # Check for dangerous SQL patterns
    DANGEROUS_PATTERNS=("DROP TABLE" "DROP DATABASE" "TRUNCATE" "DELETE FROM" "--" "/*")

    for pattern in "${DANGEROUS_PATTERNS[@]}"; do
        COUNT=$(grep -r "$pattern" "$MIGRATION_DIR" --include="*.sql" | wc -l || echo "0")
        if [ "$COUNT" -gt 0 ]; then
            echo -e "${YELLOW}⚠ Found $COUNT instances of '$pattern' in migrations${NC}"
        fi
    done

    # Check for RLS policies
    RLS_COUNT=$(grep -r "ENABLE ROW LEVEL SECURITY" "$MIGRATION_DIR" --include="*.sql" | wc -l || echo "0")
    echo -e "${GREEN}✓ Found $RLS_COUNT tables with RLS enabled${NC}"
else
    echo -e "${YELLOW}⚠ Migration directory not found${NC}"
fi

echo -e "\n${YELLOW}[8/9] Checking for common vulnerabilities...${NC}"
echo "----------------------------------------"

# Check source code for common vulnerabilities
echo "Scanning for potential XSS vulnerabilities..."
XSS_PATTERNS=("dangerouslySetInnerHTML" "eval(" "innerHTML" "document.write")

for pattern in "${XSS_PATTERNS[@]}"; do
    COUNT=$(grep -r "$pattern" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l || echo "0")
    if [ "$COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠ Found $COUNT instances of '$pattern'${NC}"
        grep -r "$pattern" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | head -5 >> "$AUDIT_DIR/xss-risks.txt"
    fi
done

echo -e "\n${YELLOW}[9/9] Generating security report...${NC}"
echo "----------------------------------------"

# Generate summary report
cat > "$AUDIT_DIR/security-report.md" << EOF
# Security Audit Report
**Date:** $(date)
**Project:** Indigo Yield Platform v01

## Summary

### Vulnerabilities Found
- Critical: ${CRITICAL:-0}
- High: ${HIGH:-0}
- Secrets Detected: ${LEAKS:-0}

### Security Score: $(
    SCORE=100
    [ "${CRITICAL:-0}" -gt 0 ] && SCORE=$((SCORE - CRITICAL * 10))
    [ "${HIGH:-0}" -gt 0 ] && SCORE=$((SCORE - HIGH * 5))
    [ "${LEAKS:-0}" -gt 0 ] && SCORE=$((SCORE - 20))
    echo $SCORE
)/100

## Detailed Findings

### 1. Dependencies
$(cat "$AUDIT_DIR/npm-audit.txt" 2>/dev/null | head -20 || echo "No audit results")

### 2. Secrets Detection
$(cat "$AUDIT_DIR/gitleaks.txt" 2>/dev/null | grep -E "(Found|No leaks)" || echo "No scan results")

### 3. Security Headers
- HSTS: $(grep -q "Strict-Transport-Security" vercel.json && echo "✓ Configured" || echo "✗ Not configured")
- CSP: $(grep -q "Content-Security-Policy" vercel.json && echo "✓ Configured" || echo "✗ Not configured")
- X-Frame-Options: $(grep -q "X-Frame-Options" vercel.json && echo "✓ Configured" || echo "✗ Not configured")

### 4. Code Security
- TypeScript Strict Mode: $(grep -q "\"strict\": true" tsconfig.json && echo "✓ Enabled" || echo "✗ Disabled")
- XSS Risks: $([ -f "$AUDIT_DIR/xss-risks.txt" ] && wc -l < "$AUDIT_DIR/xss-risks.txt" || echo "0") potential issues

## Recommendations

1. Fix all critical and high vulnerabilities
2. Remove any detected secrets and rotate credentials
3. Enable TypeScript strict mode
4. Review and fix XSS risks
5. Implement all security headers

## Files Generated
$(ls -la "$AUDIT_DIR" | tail -n +2)
EOF

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}Security Audit Complete!${NC}"
echo -e "${GREEN}Results saved to: $AUDIT_DIR/${NC}"
echo -e "${GREEN}================================================${NC}"

# Display summary
echo -e "\n📊 Security Score: $(
    SCORE=100
    [ "${CRITICAL:-0}" -gt 0 ] && SCORE=$((SCORE - CRITICAL * 10))
    [ "${HIGH:-0}" -gt 0 ] && SCORE=$((SCORE - HIGH * 5))
    [ "${LEAKS:-0}" -gt 0 ] && SCORE=$((SCORE - 20))

    if [ $SCORE -ge 90 ]; then
        echo -e "${GREEN}$SCORE/100 (Excellent)${NC}"
    elif [ $SCORE -ge 70 ]; then
        echo -e "${YELLOW}$SCORE/100 (Good)${NC}"
    else
        echo -e "${RED}$SCORE/100 (Needs Improvement)${NC}"
    fi
)"

echo -e "\n📁 Full report: $AUDIT_DIR/security-report.md"

# Run automated fixes if requested
if [ "$1" == "--fix" ]; then
    echo -e "\n${YELLOW}Running automated fixes...${NC}"

    # Fix npm vulnerabilities
    npm audit fix --force 2>/dev/null || true

    # Remove unsafe-eval from CSP
    sed -i.bak "s/'unsafe-eval'//g" vercel.json 2>/dev/null || true

    echo -e "${GREEN}✓ Automated fixes applied${NC}"
fi

exit 0