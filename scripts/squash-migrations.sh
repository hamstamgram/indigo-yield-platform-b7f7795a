#!/bin/bash
# =============================================================================
# Migration Squash Helper Script
# =============================================================================
# This script helps identify and prepare migrations for squashing
# Run: ./scripts/squash-migrations.sh [--analyze|--prepare]
#
# USAGE:
#   --analyze  : Show migration statistics and suggest squash candidates
#   --prepare  : Generate a squashed migration file (requires manual review)
# =============================================================================

set -e

MIGRATIONS_DIR="supabase/migrations"
ARCHIVE_DIR="supabase/migrations/_archived_deprecated"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

analyze_migrations() {
    log_info "Analyzing migrations in $MIGRATIONS_DIR..."
    echo ""
    
    # Count migrations
    total=$(find "$MIGRATIONS_DIR" -maxdepth 1 -name "*.sql" | wc -l | tr -d ' ')
    archived=$(find "$ARCHIVE_DIR" -name "*.sql" 2>/dev/null | wc -l | tr -d ' ')
    
    echo "═══════════════════════════════════════════════════════════════"
    echo "                    MIGRATION ANALYSIS REPORT"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "📊 Statistics:"
    echo "   Active migrations:   $total"
    echo "   Archived migrations: $archived"
    echo ""
    
    # Find migrations by date prefix
    echo "📅 Migrations by Date:"
    find "$MIGRATIONS_DIR" -maxdepth 1 -name "*.sql" -printf "%f\n" | \
        sed 's/^\([0-9]\{8\}\).*/\1/' | \
        sort | uniq -c | sort -k2 | \
        awk '{printf "   %s: %d migrations\n", $2, $1}'
    echo ""
    
    # Find potential duplicates (same table mentioned multiple times)
    echo "🔍 Tables with Multiple Migrations (potential squash candidates):"
    grep -rh "CREATE TABLE\|ALTER TABLE\|DROP TABLE" "$MIGRATIONS_DIR"/*.sql 2>/dev/null | \
        grep -oE "(CREATE|ALTER|DROP) TABLE (IF (NOT )?EXISTS )?[a-z_]+" | \
        sed 's/.*TABLE \(IF \(NOT \)\?EXISTS \)\?//' | \
        sort | uniq -c | sort -rn | head -20 | \
        awk '$1 > 1 {printf "   %-30s %d occurrences\n", $2, $1}'
    echo ""
    
    # Find large migrations
    echo "📁 Largest Migrations (by line count):"
    wc -l "$MIGRATIONS_DIR"/*.sql 2>/dev/null | \
        sort -rn | head -10 | \
        awk 'NR > 1 && $1 > 0 {printf "   %5d lines: %s\n", $1, $2}'
    echo ""
    
    # Check for empty or minimal migrations
    echo "⚠️  Small Migrations (< 10 lines, consider merging):"
    for f in "$MIGRATIONS_DIR"/*.sql; do
        lines=$(wc -l < "$f")
        if [ "$lines" -lt 10 ]; then
            echo "   $lines lines: $(basename "$f")"
        fi
    done 2>/dev/null | head -10
    echo ""
    
    # Safety check suggestions
    echo "🛡️  Recommended Next Steps:"
    echo "   1. Review tables with multiple migrations for consolidation"
    echo "   2. Test squash with: ./scripts/squash-migrations.sh --prepare"
    echo "   3. Always backup before squashing: cp -r $MIGRATIONS_DIR $MIGRATIONS_DIR.bak"
    echo "   4. After squashing, run: npx supabase db reset --local"
    echo ""
}

prepare_squash() {
    log_info "Preparing migration squash..."
    
    # Create a dated squash file
    DATE=$(date +%Y%m%d%H%M%S)
    SQUASH_FILE="supabase/migrations/${DATE}_squashed_schema.sql"
    
    log_warn "This will create a squashed migration file."
    log_warn "The original migrations will NOT be deleted - you must do that manually."
    echo ""
    read -p "Continue? (y/N) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Aborted."
        exit 0
    fi
    
    # Generate squashed schema from database
    log_info "Generating squashed schema..."
    
    cat > "$SQUASH_FILE" << 'EOF'
-- =============================================================================
-- SQUASHED MIGRATION
-- =============================================================================
-- Generated: $(date -Iseconds)
-- This migration combines all previous migrations into a single file.
-- 
-- IMPORTANT: Before using this file:
-- 1. Backup your current migrations
-- 2. Move all previous migrations to _archived_deprecated/
-- 3. Rename this file to 001_initial_schema.sql
-- 4. Test with: npx supabase db reset --local
-- =============================================================================

-- This is a placeholder. To generate actual schema:
-- 1. Run: npx supabase db dump --local > schema_dump.sql
-- 2. Review and clean up the dump
-- 3. Replace this content with the cleaned schema

-- OR use pg_dump with your production database URL:
-- pg_dump --schema-only --no-owner --no-privileges DATABASE_URL > schema_dump.sql

EOF
    
    log_success "Created placeholder at: $SQUASH_FILE"
    echo ""
    log_info "Next steps:"
    echo "   1. Generate actual schema: npx supabase db dump --local > schema_dump.sql"
    echo "   2. Review and clean the dump"
    echo "   3. Replace content in $SQUASH_FILE"
    echo "   4. Move old migrations: mv $MIGRATIONS_DIR/*.sql $ARCHIVE_DIR/"
    echo "   5. Keep only the squashed file in $MIGRATIONS_DIR"
    echo "   6. Test: npx supabase db reset --local"
}

# Main
case "${1:-}" in
    --analyze)
        analyze_migrations
        ;;
    --prepare)
        prepare_squash
        ;;
    *)
        echo "Usage: $0 [--analyze|--prepare]"
        echo ""
        echo "Options:"
        echo "  --analyze  Show migration statistics and suggest squash candidates"
        echo "  --prepare  Generate a squashed migration file (requires manual review)"
        echo ""
        echo "Run --analyze first to understand your migration structure."
        ;;
esac
