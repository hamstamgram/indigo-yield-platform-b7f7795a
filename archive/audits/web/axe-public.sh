#!/bin/bash

# Axe-core accessibility audit for public pages
cd /Users/mama/indigo-yield-platform-v01

BASE_URL="https://indigo-yield-platform-v01-3jwtng7hy-hamstamgrams-projects.vercel.app"
AXE_DIR="audits/web/axe"

# Test just public pages for quick analysis
PUBLIC_PAGES=(
  "/"
  "/login"
  "/about"
  "/privacy"
)

echo "Starting axe-core accessibility audit..."
echo "========================================"

for path in "${PUBLIC_PAGES[@]}"; do
  url="${BASE_URL}${path}"
  sanitized_name=$(echo "$url" | sed 's|https://||g' | sed 's|/|__|g' | sed 's|:||g')
  
  echo ""
  echo "Auditing: $url"
  echo "Output: ${AXE_DIR}/${sanitized_name}.json"
  
  npx -y @axe-core/cli "$url" \
    --save "${AXE_DIR}/${sanitized_name}.json" \
    --timeout 60000 \
    --chrome-options="--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage" || echo "Failed to audit $url"
done

echo ""
echo "Axe-core audit complete!"
echo "Results saved in: ${AXE_DIR}/"

# Generate summary
echo ""
echo "Creating accessibility summary..."
node -e "
const fs = require('fs');
const path = require('path');
const axeDir = '${AXE_DIR}';
const files = fs.readdirSync(axeDir).filter(f => f.endsWith('.json'));
let totalViolations = 0;
let summary = [];

files.forEach(file => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(axeDir, file), 'utf8'));
    const violations = data[0]?.violations || [];
    totalViolations += violations.length;
    summary.push({
      url: data[0]?.url || file,
      violations: violations.length,
      passes: data[0]?.passes?.length || 0
    });
  } catch(e) {}
});

console.log('\\nAccessibility Summary:');
console.log('======================');
summary.forEach(s => {
  console.log(\`\${s.url}: \${s.violations} violations, \${s.passes} passes\`);
});
console.log(\`\\nTotal violations found: \${totalViolations}\`);
"
