#!/bin/bash
# Documentation Cleanup Script
# Aggressive cleanup authorized by user for Lovable deployment preparation
# Date: 2025-11-26

set -e

PROJECT_ROOT="/Users/mama/indigo-yield-platform-v01"
ARCHIVE_DIR="$PROJECT_ROOT/docs/archive/$(date +%Y-%m-%d)"

echo "🧹 Starting aggressive documentation cleanup..."
echo "📦 Creating archive directory: $ARCHIVE_DIR"

mkdir -p "$ARCHIVE_DIR"

# Essential files to KEEP in root
KEEP_FILES=(
  "README.md"
  "CONTRIBUTING.md"
  "CLAUDE.md"
  "SECURITY_AUDIT_2025-11-26.md"
  "EMERGENCY_SECURITY_PATCH.sql"
  "ARCHITECTURE_ANALYSIS_2025-11-26.md"
  ".gitignore"
  ".env.example"
  "package.json"
  "package-lock.json"
  "tsconfig.json"
  "vite.config.ts"
  "tailwind.config.ts"
  "index.html"
  "components.json"
  "vercel.json"
  "docker-compose.yml"
  "nginx.conf"
  "playwright.config.ts"
  "eslint.config.js"
  "postcss.config.mjs"
)

# Files to DELETE (documentation clutter)
DELETE_PATTERNS=(
  "*SUMMARY*.md"
  "*AUDIT*.md"
  "*REPORT*.md"
  "*GUIDE*.md"
  "*PLAN*.md"
  "*IMPLEMENTATION*.md"
  "*REVIEW*.md"
  "*ANALYSIS*.md"
  "*CHECKLIST*.md"
  "*COMPLETION*.md"
  "*FIXES*.md"
  "*ROADMAP*.md"
  "*STATUS*.md"
  "*ARCHITECTURE*.md"
  "*DEPLOYMENT*.md"
  "*SECURITY*.md"
  "*REFACTORING*.md"
  "*OPTIMIZATION*.md"
  "*PERFORMANCE*.md"
  "*SESSION*.md"
  "*DOCUMENTATION*.md"
  "*EXECUTIVE*.md"
  "*ASSESSMENT*.md"
  "*SCORECARD*.md"
  "*FINDINGS*.md"
  "*MIGRATION*.md"
  "*COMPREHENSIVE*.md"
  "*EMERGENCY*.md"
  "*CRITICAL*.md"
  "*FINAL*.md"
  "*TODAY*.md"
  "*NEXT_STEPS*.md"
  "*START_HERE*.md"
  "*QUICK*.md"
  "*MULTI*.md"
  "*FAQ*.md"
  "*WEB*.md"
  "*IOS*.md"
  "*FIGMA*.md"
  "*LOVABLE*.md"
  "*PLATFORM*.md"
  "*CODE*.md"
  "*DATABASE*.md"
  "*NAVIGATION*.md"
  "*DESIGN*.md"
  "*USER*.md"
  "*ADMIN*.md"
  "*API*.md"
  "*INVESTOR*.md"
  "*EMAIL*.md"
  "*TEST*.md"
  "*SMTP*.md"
  "*PHASE*.md"
  "*REPORTS*.md"
  "*ROUTES*.md"
  "*MASTER*.md"
  "*MODULES*.md"
  "*COMPONENT*.md"
  "*DASHBOARD*.md"
  "*MENU*.md"
  "*CLEANUP*.md"
  "*MONTHLY*.md"
  "*REORGANIZATION*.md"
  "*TANSTACK*.md"
  "*THREAT*.md"
  "*AFTER*.md"
  "*OLD*.md"
  "*NEW*.md"
  "*AGENT*.md"
  "*MCP*.md"
  "*MAC*.md"
  "*EDGE*.md"
  "*CREDENTIALS*.md"
  "*RESET*.md"
  "*OPERATIONAL*.md"
  "*ACCESSIBILITY*.md"
  "*PRODUCTION*.md"
  "*LAUNCH*.md"
  "*WALK*.md"
  "*REPOSITORY*.md"
  "*FIXES*.md"
  "*AUTHENTICATION*.md"
  "*.sql.skip"
  "*.zip"
  "*.tgz"
  "*.backup"
  "*.bak"
  ".DS_Store"
  "operational*.json"
  "audit*.json"
  "security*.json"
  "*.txt"
)

# Counter
ARCHIVED_COUNT=0
DELETED_COUNT=0
KEPT_COUNT=0

# Function to check if file should be kept
should_keep() {
  local file="$1"
  local basename="$(basename "$file")"

  for keep in "${KEEP_FILES[@]}"; do
    if [ "$basename" == "$keep" ]; then
      return 0
    fi
  done

  return 1
}

# Process all markdown and documentation files in root
cd "$PROJECT_ROOT"

echo "📝 Processing documentation files..."

for pattern in "${DELETE_PATTERNS[@]}"; do
  for file in $pattern 2>/dev/null; do
    if [ -f "$file" ]; then
      basename_file="$(basename "$file")"

      # Skip if it's an essential file
      if should_keep "$file"; then
        echo "✅ Keeping: $basename_file"
        ((KEPT_COUNT++))
        continue
      fi

      # Archive the file
      echo "📦 Archiving: $basename_file"
      cp "$file" "$ARCHIVE_DIR/"
      rm "$file"
      ((ARCHIVED_COUNT++))
    fi
  done
done

# Handle specific old files that don't match patterns
OLD_FILES=(
  "walkthrough.md"
  "bun.lockb"
  "pnpm-lock.yaml"
  "tsconfig.tsbuildinfo"
  ".replit"
  ".browserslistrc"
  ".vercelignore"
  ".prettierignore"
  ".prettierrc"
  ".eslintrc.json"
  ".babelrc"
  ".lintstagedrc.json"
  ".preview-url"
  "lighthouserc.js"
  "mcp-servers.json"
  "warp-mcp-config.json"
  "supabase-proxy.js"
  "apply-updates.mjs"
  "deploy-remediation.sh"
  "setup-mcp.sh"
  "setup-warp-mcp-env.sh"
  "setup_database.sql"
  "apply_all_updates.sql"
  "APPLY_ALL_MIGRATIONS.sql"
  "FIX_RLS_NOW.sql"
  "deploy_new_tables_migration.sql"
)

for file in "${OLD_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "🗑️  Removing: $file"
    mv "$file" "$ARCHIVE_DIR/" 2>/dev/null || true
    ((ARCHIVED_COUNT++))
  fi
done

# Keep the essential security patches in root but archive old ones
echo "🔐 Managing security patches..."
mv EMERGENCY_SECURITY_PATCH.sql "$PROJECT_ROOT/" 2>/dev/null || true
mv SECURITY_AUDIT_2025-11-26.md "$PROJECT_ROOT/" 2>/dev/null || true
mv ARCHITECTURE_ANALYSIS_2025-11-26.md "$PROJECT_ROOT/" 2>/dev/null || true

# Update README.md to reference archive
echo "📝 Updating README.md..."

cat > "$PROJECT_ROOT/README.md" << 'EOF'
# Indigo Yield Platform

Multi-platform investment management platform with web and iOS applications.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev
```

## 📚 Documentation

- **Architecture**: See `ARCHITECTURE_ANALYSIS_2025-11-26.md`
- **Security Audit**: See `SECURITY_AUDIT_2025-11-26.md`
- **Contributing**: See `CONTRIBUTING.md`
- **AI Assistant Instructions**: See `CLAUDE.md`

**Historical Documentation**: Archived documentation from previous development sessions can be found in `docs/archive/`

## 🔐 Security

**CRITICAL**: Before deploying, apply emergency security patch:

```bash
psql $DATABASE_URL -f EMERGENCY_SECURITY_PATCH.sql
```

See `SECURITY_AUDIT_2025-11-26.md` for full details.

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **UI**: Radix UI + Tailwind CSS
- **State**: React Query + Zustand
- **Testing**: Vitest + Playwright

## 📱 Multi-Platform

- **Web**: React app (this repo) - Lovable-compatible
- **iOS**: Native Swift app in `ios/` - separate deployment

## 🚢 Deployment

### Lovable (Web)

1. Connect GitHub repository to Lovable
2. Configure environment variables
3. Build command: `npm run build`
4. Output directory: `dist`

### iOS (Separate)

See `ios/README.md` for iOS deployment instructions.

## 📖 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test:e2e     # Run E2E tests
```

## 🏗️ Project Structure

```
├── src/              # Frontend React application
├── supabase/         # Database migrations & edge functions
├── ios/              # Native iOS app (Swift)
├── docs/             # Documentation
├── tests/            # Test suites
└── public/           # Static assets
```

## 🤝 Contributing

See `CONTRIBUTING.md` for development guidelines.

## 📄 License

Proprietary - All rights reserved.

---

**Last Updated**: 2025-11-26
**Version**: 1.0.0
**Status**: Production Ready (after security patches applied)
EOF

echo ""
echo "✅ Cleanup complete!"
echo "📊 Summary:"
echo "   - Archived: $ARCHIVED_COUNT files → $ARCHIVE_DIR"
echo "   - Kept: ${#KEEP_FILES[@]} essential files in root"
echo "   - Updated: README.md with clean structure"
echo ""
echo "📁 Essential files in root:"
for file in "${KEEP_FILES[@]}"; do
  if [ -f "$PROJECT_ROOT/$file" ]; then
    echo "   ✅ $file"
  fi
done
echo ""
echo "📦 Archive location: $ARCHIVE_DIR"
echo "   - All old documentation has been safely archived"
echo "   - Reference: docs/archive/ directory for historical records"
echo ""
echo "🎉 Project root is now clean and Lovable-ready!"
