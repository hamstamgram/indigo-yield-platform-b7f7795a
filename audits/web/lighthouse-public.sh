#!/bin/bash

# Lighthouse audit for public pages only (no auth required)
cd /Users/mama/indigo-yield-platform-v01

BASE_URL="https://indigo-yield-platform-v01-3jwtng7hy-hamstamgrams-projects.vercel.app"
LH_BASE="audits/web/lighthouse"

# Test just a few key public pages for quick analysis
PUBLIC_PAGES=(
  "/"
  "/login"
  "/about"
  "/privacy"
)

echo "Starting Lighthouse audit for public pages..."
echo "========================================="

for path in "${PUBLIC_PAGES[@]}"; do
  url="${BASE_URL}${path}"
  sanitized_name=$(echo "$url" | sed 's|https://||g' | sed 's|/|__|g' | sed 's|:||g')
  
  echo ""
  echo "Auditing: $url"
  echo "Output: ${LH_BASE}/${sanitized_name}_mobile.json"
  
  # Mobile audit
  npx -y lighthouse "$url" \
    --output=json \
    --output-path="${LH_BASE}/${sanitized_name}_mobile" \
    --only-categories=performance,accessibility,best-practices,seo \
    --emulated-form-factor=mobile \
    --throttling-method=simulate \
    --chrome-flags="--headless=new --no-sandbox" \
    --max-wait-for-load=45000 \
    --quiet || echo "Failed to audit $url (mobile)"
    
  # Desktop audit  
  echo "Output: ${LH_BASE}/${sanitized_name}_desktop.json"
  npx -y lighthouse "$url" \
    --output=json \
    --output-path="${LH_BASE}/${sanitized_name}_desktop" \
    --only-categories=performance,accessibility,best-practices,seo \
    --preset=desktop \
    --throttling-method=simulate \
    --chrome-flags="--headless=new --no-sandbox" \
    --max-wait-for-load=45000 \
    --quiet || echo "Failed to audit $url (desktop)"
done

echo ""
echo "Lighthouse audit complete!"
echo "Results saved in: ${LH_BASE}/"
