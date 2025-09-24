#!/bin/bash

# debug-network-connectivity.sh
# Comprehensive network debugging for Supabase connectivity issues
# Usage: ./debug-network-connectivity.sh

set -e

SUPABASE_URL="https://nkfimvovosdehmyyjubn.supabase.co"
SUPABASE_HOST="nkfimvovosdehmyyjubn.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg"

echo "🔍 SUPABASE CONNECTIVITY DEBUGGING"
echo "=================================="
echo "Target: $SUPABASE_URL"
echo "Date: $(date)"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 1. Basic Network Connectivity
echo "1. BASIC NETWORK CONNECTIVITY"
echo "------------------------------"

if ping -c 3 8.8.8.8 &>/dev/null; then
    log_success "Internet connectivity: OK"
else
    log_error "Internet connectivity: FAILED"
fi

if ping -c 3 $SUPABASE_HOST &>/dev/null; then
    log_success "Supabase host reachable: $SUPABASE_HOST"
else
    log_error "Supabase host unreachable: $SUPABASE_HOST"
fi

echo ""

# 2. DNS Resolution
echo "2. DNS RESOLUTION"
echo "-----------------"

DNS_RESULT=$(dig +short $SUPABASE_HOST)
if [ -n "$DNS_RESULT" ]; then
    log_success "DNS resolution successful:"
    echo "$DNS_RESULT" | while read -r ip; do
        echo "    → $ip"
    done
else
    log_error "DNS resolution failed for $SUPABASE_HOST"
fi

# Test different DNS servers
log_info "Testing with different DNS servers:"

for dns_server in "8.8.8.8" "1.1.1.1" "208.67.222.222"; do
    result=$(dig @$dns_server +short $SUPABASE_HOST 2>/dev/null | head -1)
    if [ -n "$result" ]; then
        log_success "DNS $dns_server: $result"
    else
        log_warning "DNS $dns_server: No response"
    fi
done

echo ""

# 3. SSL/TLS Certificate
echo "3. SSL/TLS CERTIFICATE"
echo "----------------------"

SSL_INFO=$(echo | openssl s_client -connect $SUPABASE_HOST:443 -servername $SUPABASE_HOST 2>/dev/null)
if [ $? -eq 0 ]; then
    log_success "SSL handshake successful"

    # Extract certificate details
    CERT_ISSUER=$(echo "$SSL_INFO" | openssl x509 -noout -issuer 2>/dev/null | sed 's/issuer=//')
    CERT_SUBJECT=$(echo "$SSL_INFO" | openssl x509 -noout -subject 2>/dev/null | sed 's/subject=//')
    CERT_DATES=$(echo "$SSL_INFO" | openssl x509 -noout -dates 2>/dev/null)

    echo "    Issuer: $CERT_ISSUER"
    echo "    Subject: $CERT_SUBJECT"
    echo "    $CERT_DATES"

    # Check certificate chain
    CERT_VERIFY=$(echo | openssl s_client -connect $SUPABASE_HOST:443 -verify_return_error 2>&1)
    if echo "$CERT_VERIFY" | grep -q "Verify return code: 0"; then
        log_success "Certificate chain valid"
    else
        log_warning "Certificate chain verification issues"
    fi
else
    log_error "SSL handshake failed"
fi

echo ""

# 4. HTTP Connectivity Tests
echo "4. HTTP CONNECTIVITY"
echo "-------------------"

# Test basic HTTPS connectivity
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$SUPABASE_URL/")
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$SUPABASE_URL/")

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "404" ] || [ "$HTTP_STATUS" = "403" ]; then
    log_success "HTTP connectivity: Status $HTTP_STATUS in ${RESPONSE_TIME}s"
else
    log_error "HTTP connectivity failed: Status $HTTP_STATUS"
fi

# Test REST API endpoint
REST_ENDPOINT="$SUPABASE_URL/rest/v1/"
REST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -H "Authorization: Bearer $ANON_KEY" "$REST_ENDPOINT")

if [ "$REST_STATUS" = "200" ] || [ "$REST_STATUS" = "400" ]; then
    log_success "REST API endpoint: Status $REST_STATUS"
else
    log_warning "REST API endpoint: Status $REST_STATUS"
fi

# Test Auth endpoint
AUTH_ENDPOINT="$SUPABASE_URL/auth/v1/token?grant_type=password"
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"invalid"}' \
    "$AUTH_ENDPOINT")

if [ "$AUTH_STATUS" = "400" ] || [ "$AUTH_STATUS" = "401" ] || [ "$AUTH_STATUS" = "422" ]; then
    log_success "Auth endpoint responding: Status $AUTH_STATUS"
else
    log_warning "Auth endpoint: Status $AUTH_STATUS"
fi

echo ""

# 5. Performance Tests
echo "5. PERFORMANCE TESTS"
echo "-------------------"

log_info "Running 5 performance tests..."

TIMES=()
for i in {1..5}; do
    TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 -H "Authorization: Bearer $ANON_KEY" "$REST_ENDPOINT")
    TIMES+=($TIME)
    echo "Test $i: ${TIME}s"
done

# Calculate average
TOTAL=0
for time in "${TIMES[@]}"; do
    TOTAL=$(echo "$TOTAL + $time" | bc -l)
done
AVG=$(echo "scale=3; $TOTAL / ${#TIMES[@]}" | bc -l)

if (( $(echo "$AVG < 3.0" | bc -l) )); then
    log_success "Average response time: ${AVG}s"
else
    log_warning "Average response time: ${AVG}s (slow)"
fi

echo ""

# 6. Firewall and Port Tests
echo "6. FIREWALL AND PORT TESTS"
echo "--------------------------"

# Test standard HTTPS port
if nc -z -w5 $SUPABASE_HOST 443 2>/dev/null; then
    log_success "Port 443 (HTTPS): Open"
else
    log_error "Port 443 (HTTPS): Blocked"
fi

# Test if WebSocket port is accessible (for Realtime)
if nc -z -w5 $SUPABASE_HOST 443 2>/dev/null; then
    log_success "WebSocket port accessibility: Likely OK (uses 443)"
else
    log_error "WebSocket port accessibility: May be blocked"
fi

echo ""

# 7. Routing and Traceroute
echo "7. NETWORK ROUTING"
echo "-----------------"

log_info "Traceroute to $SUPABASE_HOST:"
if command -v traceroute &> /dev/null; then
    traceroute -m 10 $SUPABASE_HOST 2>/dev/null | head -10
else
    log_warning "Traceroute not available"
fi

echo ""

# 8. JWT Token Analysis
echo "8. JWT TOKEN ANALYSIS"
echo "--------------------"

# Decode JWT header and payload (without verification)
JWT_HEADER=$(echo $ANON_KEY | cut -d'.' -f1)
JWT_PAYLOAD=$(echo $ANON_KEY | cut -d'.' -f2)

# Add padding if needed
JWT_HEADER_PADDED=$(printf '%s' "$JWT_HEADER" | sed 's/.\{4\}$/&===/' | head -c -3)
JWT_PAYLOAD_PADDED=$(printf '%s' "$JWT_PAYLOAD" | sed 's/.\{4\}$/&===/' | head -c -3)

DECODED_HEADER=$(echo "$JWT_HEADER_PADDED" | base64 -d 2>/dev/null || echo "Failed to decode")
DECODED_PAYLOAD=$(echo "$JWT_PAYLOAD_PADDED" | base64 -d 2>/dev/null || echo "Failed to decode")

if [ "$DECODED_HEADER" != "Failed to decode" ]; then
    log_success "JWT token structure valid"
    echo "Header: $DECODED_HEADER"
    echo "Payload: $DECODED_PAYLOAD"

    # Check expiration
    EXP_TIMESTAMP=$(echo "$DECODED_PAYLOAD" | grep -o '"exp":[0-9]*' | cut -d':' -f2)
    if [ -n "$EXP_TIMESTAMP" ]; then
        CURRENT_TIMESTAMP=$(date +%s)
        if [ "$EXP_TIMESTAMP" -gt "$CURRENT_TIMESTAMP" ]; then
            log_success "JWT token not expired"
        else
            log_error "JWT token is expired"
        fi
    fi
else
    log_error "JWT token decode failed"
fi

echo ""

# 9. Detailed Curl Test
echo "9. DETAILED CURL TEST"
echo "--------------------"

log_info "Performing detailed curl test with verbose output:"

curl -v -s --max-time 30 \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    "$SUPABASE_URL/rest/v1/" \
    2>&1 | head -30

echo ""

# 10. iOS Simulator Network Test (if xcrun simctl is available)
echo "10. iOS SIMULATOR NETWORK"
echo "------------------------"

if command -v xcrun &> /dev/null && xcrun simctl list devices 2>/dev/null | grep -q "Booted"; then
    log_info "iOS Simulator detected"

    # List booted simulators
    BOOTED_SIMULATORS=$(xcrun simctl list devices | grep "Booted" | head -5)
    echo "Booted simulators:"
    echo "$BOOTED_SIMULATORS"

    log_info "Note: iOS Simulator uses host machine's network configuration"
else
    log_info "No booted iOS Simulator found or Xcode tools not available"
fi

echo ""

# Summary Report
echo "📊 SUMMARY REPORT"
echo "================="

echo "Target URL: $SUPABASE_URL"
echo "Test Date: $(date)"
echo ""

# Quick connectivity test
OVERALL_STATUS="UNKNOWN"
if curl -s --max-time 10 -H "Authorization: Bearer $ANON_KEY" "$SUPABASE_URL/rest/v1/" > /dev/null 2>&1; then
    OVERALL_STATUS="CONNECTED"
    log_success "Overall Status: Connection to Supabase is working"
else
    OVERALL_STATUS="FAILED"
    log_error "Overall Status: Connection to Supabase failed"
fi

echo ""
echo "Recommended Next Steps:"
echo "----------------------"

if [ "$OVERALL_STATUS" = "FAILED" ]; then
    echo "1. Check your internet connection"
    echo "2. Verify DNS settings"
    echo "3. Check for firewall/proxy blocking"
    echo "4. Verify Supabase project status"
    echo "5. Check iOS App Transport Security settings"
else
    echo "1. Network connectivity appears to be working"
    echo "2. Focus on application-level debugging:"
    echo "   - Check authentication flow"
    echo "   - Verify RLS policies"
    echo "   - Review request/response logging"
    echo "   - Test with actual user credentials"
fi

echo ""
log_info "Debug report completed. Check the output above for specific issues."

# Save results to file
REPORT_FILE="supabase-connectivity-report-$(date +%Y%m%d-%H%M%S).txt"
echo "💾 Saving detailed report to: $REPORT_FILE"

# Re-run quietly and save to file
{
    echo "SUPABASE CONNECTIVITY DEBUG REPORT"
    echo "Generated: $(date)"
    echo "Target: $SUPABASE_URL"
    echo "========================================"
    echo ""

    # Just capture the essential information
    echo "DNS Resolution:"
    dig +short $SUPABASE_HOST
    echo ""

    echo "HTTP Status:"
    curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s\n" --max-time 10 "$SUPABASE_URL/"
    echo ""

    echo "REST API Status:"
    curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s\n" --max-time 10 -H "Authorization: Bearer $ANON_KEY" "$SUPABASE_URL/rest/v1/"
    echo ""

    echo "SSL Certificate:"
    echo | openssl s_client -connect $SUPABASE_HOST:443 -servername $SUPABASE_HOST 2>/dev/null | openssl x509 -noout -text | grep -A 5 -B 5 "Validity\|Subject:"

} > "$REPORT_FILE"

echo "Report saved. You can share this file for further analysis."
echo ""