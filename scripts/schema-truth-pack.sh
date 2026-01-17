#!/bin/bash
# =============================================================================
# Schema Truth Pack Generator
# =============================================================================
# Queries the database to extract the complete schema truth:
# - Enums with values
# - Tables with columns, types, PKs (including composite)
# - Views
# - RPC functions with full signatures
# - Triggers and unique indexes (for idempotency)
# - RLS status and policies
#
# Usage:
#   ./scripts/schema-truth-pack.sh
#   DATABASE_URL=postgres://... ./scripts/schema-truth-pack.sh
#
# Output:
#   artifacts/schema-truth-pack.json
#   docs/SCHEMA_TRUTH_PACK_LATEST.md
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ARTIFACTS_DIR="$PROJECT_ROOT/artifacts"
DOCS_DIR="$PROJECT_ROOT/docs"
OUTPUT_JSON="$ARTIFACTS_DIR/schema-truth-pack.json"
OUTPUT_MD="$DOCS_DIR/SCHEMA_TRUTH_PACK_LATEST.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}📦 Schema Truth Pack Generator${NC}"
echo "=================================="

# Check for DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
    # Try to load from .env
    if [ -f "$PROJECT_ROOT/.env" ]; then
        export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
    fi
    if [ -z "${DATABASE_URL:-}" ]; then
        echo -e "${YELLOW}⚠ DATABASE_URL not set. Using Supabase CLI...${NC}"
        # Try supabase status to get connection string
        if command -v supabase &> /dev/null; then
            DB_URL=$(supabase status 2>/dev/null | grep "DB URL" | awk '{print $NF}' || true)
            if [ -n "$DB_URL" ]; then
                DATABASE_URL="$DB_URL"
            fi
        fi
    fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "${RED}❌ DATABASE_URL is required. Set it or run 'supabase start' first.${NC}"
    exit 1
fi

# Create output directories
mkdir -p "$ARTIFACTS_DIR" "$DOCS_DIR"

echo "🔍 Extracting schema from database..."

# Generate the complete schema truth pack as JSON
psql "$DATABASE_URL" -t -A -X <<'EOSQL' > "$OUTPUT_JSON"
WITH
-- Extract all enums
enums AS (
    SELECT jsonb_agg(
        jsonb_build_object(
            'name', t.typname,
            'schema', n.nspname,
            'values', (
                SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
                FROM pg_enum e
                WHERE e.enumtypid = t.oid
            )
        )
    ) AS data
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typtype = 'e'
    AND n.nspname = 'public'
),

-- Extract all tables with columns
tables AS (
    SELECT jsonb_agg(
        jsonb_build_object(
            'name', c.table_name,
            'schema', c.table_schema,
            'columns', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'name', col.column_name,
                        'type', col.udt_name,
                        'data_type', col.data_type,
                        'is_nullable', col.is_nullable = 'YES',
                        'column_default', col.column_default,
                        'is_identity', col.is_identity = 'YES',
                        'ordinal_position', col.ordinal_position
                    ) ORDER BY col.ordinal_position
                )
                FROM information_schema.columns col
                WHERE col.table_name = c.table_name
                AND col.table_schema = c.table_schema
            ),
            'primary_key', (
                SELECT jsonb_agg(kcu.column_name ORDER BY kcu.ordinal_position)
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                WHERE tc.table_name = c.table_name
                AND tc.table_schema = c.table_schema
                AND tc.constraint_type = 'PRIMARY KEY'
            ),
            'rls_enabled', (
                SELECT relrowsecurity
                FROM pg_class pc
                JOIN pg_namespace pn ON pc.relnamespace = pn.oid
                WHERE pc.relname = c.table_name
                AND pn.nspname = c.table_schema
            )
        )
    ) AS data
    FROM (
        SELECT DISTINCT table_name, table_schema
        FROM information_schema.columns
        WHERE table_schema = 'public'
    ) c
),

-- Extract all views
views AS (
    SELECT jsonb_agg(
        jsonb_build_object(
            'name', v.table_name,
            'schema', v.table_schema,
            'columns', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'name', col.column_name,
                        'type', col.udt_name,
                        'data_type', col.data_type
                    ) ORDER BY col.ordinal_position
                )
                FROM information_schema.columns col
                WHERE col.table_name = v.table_name
                AND col.table_schema = v.table_schema
            )
        )
    ) AS data
    FROM information_schema.views v
    WHERE v.table_schema = 'public'
),

-- Extract all RPC functions with signatures
functions AS (
    SELECT jsonb_agg(
        jsonb_build_object(
            'name', p.proname,
            'schema', n.nspname,
            'return_type', (
                SELECT typname FROM pg_type WHERE oid = p.prorettype
            ),
            'returns_set', p.proretset,
            'volatility', CASE p.provolatile
                WHEN 'i' THEN 'IMMUTABLE'
                WHEN 's' THEN 'STABLE'
                WHEN 'v' THEN 'VOLATILE'
            END,
            'security_definer', p.prosecdef,
            'parameters', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'name', COALESCE(p.proargnames[ord], 'arg' || ord),
                        'type', (SELECT typname FROM pg_type WHERE oid = arg_type),
                        'mode', CASE
                            WHEN p.proargmodes IS NULL THEN 'IN'
                            WHEN p.proargmodes[ord] = 'i' THEN 'IN'
                            WHEN p.proargmodes[ord] = 'o' THEN 'OUT'
                            WHEN p.proargmodes[ord] = 'b' THEN 'INOUT'
                            WHEN p.proargmodes[ord] = 'v' THEN 'VARIADIC'
                            ELSE 'IN'
                        END,
                        'has_default', ord > (p.pronargs - p.pronargdefaults)
                    ) ORDER BY ord
                )
                FROM unnest(COALESCE(p.proallargtypes, p.proargtypes::oid[])) WITH ORDINALITY AS args(arg_type, ord)
            )
        )
    ) AS data
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    AND p.prokind = 'f'
),

-- Extract unique indexes (for idempotency keys)
unique_indexes AS (
    SELECT jsonb_agg(
        jsonb_build_object(
            'name', i.relname,
            'table', t.relname,
            'columns', (
                SELECT jsonb_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum))
                FROM pg_attribute a
                WHERE a.attrelid = t.oid
                AND a.attnum = ANY(ix.indkey)
            ),
            'is_unique', ix.indisunique,
            'is_primary', ix.indisprimary
        )
    ) AS data
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
    AND ix.indisunique = true
),

-- Extract triggers
triggers AS (
    SELECT jsonb_agg(
        jsonb_build_object(
            'name', tg.tgname,
            'table', t.relname,
            'timing', CASE
                WHEN tg.tgtype & 2 = 2 THEN 'BEFORE'
                WHEN tg.tgtype & 64 = 64 THEN 'INSTEAD OF'
                ELSE 'AFTER'
            END,
            'events', array_remove(ARRAY[
                CASE WHEN tg.tgtype & 4 = 4 THEN 'INSERT' END,
                CASE WHEN tg.tgtype & 8 = 8 THEN 'DELETE' END,
                CASE WHEN tg.tgtype & 16 = 16 THEN 'UPDATE' END,
                CASE WHEN tg.tgtype & 32 = 32 THEN 'TRUNCATE' END
            ], NULL),
            'function', p.proname,
            'enabled', tg.tgenabled != 'D'
        )
    ) AS data
    FROM pg_trigger tg
    JOIN pg_class t ON t.oid = tg.tgrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_proc p ON p.oid = tg.tgfoid
    WHERE n.nspname = 'public'
    AND NOT tg.tgisinternal
),

-- Extract RLS policies
policies AS (
    SELECT jsonb_agg(
        jsonb_build_object(
            'name', pol.polname,
            'table', t.relname,
            'command', CASE pol.polcmd
                WHEN 'r' THEN 'SELECT'
                WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE'
                WHEN 'd' THEN 'DELETE'
                WHEN '*' THEN 'ALL'
            END,
            'permissive', pol.polpermissive,
            'roles', (
                SELECT jsonb_agg(r.rolname)
                FROM pg_roles r
                WHERE r.oid = ANY(pol.polroles)
            )
        )
    ) AS data
    FROM pg_policy pol
    JOIN pg_class t ON t.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
)

SELECT jsonb_pretty(jsonb_build_object(
    'generated_at', now()::text,
    'database_version', version(),
    'enums', COALESCE((SELECT data FROM enums), '[]'::jsonb),
    'tables', COALESCE((SELECT data FROM tables), '[]'::jsonb),
    'views', COALESCE((SELECT data FROM views), '[]'::jsonb),
    'functions', COALESCE((SELECT data FROM functions), '[]'::jsonb),
    'unique_indexes', COALESCE((SELECT data FROM unique_indexes), '[]'::jsonb),
    'triggers', COALESCE((SELECT data FROM triggers), '[]'::jsonb),
    'policies', COALESCE((SELECT data FROM policies), '[]'::jsonb)
));
EOSQL

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to extract schema${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Generated $OUTPUT_JSON${NC}"

# Generate human-readable markdown
echo "📝 Generating documentation..."

cat > "$OUTPUT_MD" << 'EOMD'
# Schema Truth Pack

> Auto-generated from database schema. DO NOT EDIT MANUALLY.
>
> Regenerate with: `./scripts/schema-truth-pack.sh`

EOMD

# Parse JSON and generate markdown sections
node -e "
const fs = require('fs');
const pack = JSON.parse(fs.readFileSync('$OUTPUT_JSON', 'utf8'));

let md = '';

// Metadata
md += '## Metadata\n\n';
md += '- **Generated**: ' + pack.generated_at + '\n';
md += '- **Database**: ' + (pack.database_version || 'Unknown').split(' ')[0] + '\n\n';

// Enums
md += '## Enums\n\n';
if (pack.enums && pack.enums.length > 0) {
    for (const e of pack.enums) {
        md += '### ' + e.name + '\n\n';
        md += '| Value |\n|-------|\n';
        for (const v of (e.values || [])) {
            md += '| \`' + v + '\` |\n';
        }
        md += '\n';
    }
} else {
    md += '_No public enums found._\n\n';
}

// Tables
md += '## Tables\n\n';
if (pack.tables && pack.tables.length > 0) {
    for (const t of pack.tables.sort((a,b) => a.name.localeCompare(b.name))) {
        md += '### ' + t.name + '\n\n';
        const pk = t.primary_key ? t.primary_key.join(', ') : 'none';
        md += '**Primary Key**: \`' + pk + '\`  \n';
        md += '**RLS Enabled**: ' + (t.rls_enabled ? 'Yes' : 'No') + '\n\n';
        md += '| Column | Type | Nullable | Default |\n';
        md += '|--------|------|----------|--------|\n';
        for (const c of (t.columns || [])) {
            const def = c.column_default ? '\`' + c.column_default.substring(0, 30) + '\`' : '-';
            md += '| ' + c.name + ' | ' + c.type + ' | ' + (c.is_nullable ? 'Yes' : 'No') + ' | ' + def + ' |\n';
        }
        md += '\n';
    }
}

// Functions (RPC)
md += '## RPC Functions\n\n';
if (pack.functions && pack.functions.length > 0) {
    for (const f of pack.functions.sort((a,b) => a.name.localeCompare(b.name))) {
        md += '### ' + f.name + '\n\n';
        md += '**Returns**: ' + f.return_type + (f.returns_set ? ' (set)' : '') + '  \n';
        md += '**Volatility**: ' + f.volatility + '  \n';
        md += '**Security Definer**: ' + (f.security_definer ? 'Yes' : 'No') + '\n\n';
        if (f.parameters && f.parameters.length > 0) {
            md += '| Parameter | Type | Mode | Has Default |\n';
            md += '|-----------|------|------|-------------|\n';
            for (const p of f.parameters) {
                md += '| ' + p.name + ' | ' + p.type + ' | ' + p.mode + ' | ' + (p.has_default ? 'Yes' : 'No') + ' |\n';
            }
        } else {
            md += '_No parameters_\n';
        }
        md += '\n';
    }
}

// Views
md += '## Views\n\n';
if (pack.views && pack.views.length > 0) {
    for (const v of pack.views.sort((a,b) => a.name.localeCompare(b.name))) {
        md += '### ' + v.name + '\n\n';
        md += '| Column | Type |\n';
        md += '|--------|------|\n';
        for (const c of (v.columns || [])) {
            md += '| ' + c.name + ' | ' + c.type + ' |\n';
        }
        md += '\n';
    }
} else {
    md += '_No public views found._\n\n';
}

// Unique Indexes (Idempotency)
md += '## Unique Indexes (Idempotency Keys)\n\n';
if (pack.unique_indexes && pack.unique_indexes.length > 0) {
    md += '| Index | Table | Columns | Primary |\n';
    md += '|-------|-------|---------|--------|\n';
    for (const idx of pack.unique_indexes.filter(i => !i.is_primary)) {
        const cols = (idx.columns || []).join(', ');
        md += '| ' + idx.name + ' | ' + idx.table + ' | ' + cols + ' | ' + (idx.is_primary ? 'Yes' : 'No') + ' |\n';
    }
    md += '\n';
}

// Triggers
md += '## Triggers\n\n';
if (pack.triggers && pack.triggers.length > 0) {
    md += '| Trigger | Table | Timing | Events | Function |\n';
    md += '|---------|-------|--------|--------|----------|\n';
    for (const tg of pack.triggers) {
        const events = (tg.events || []).join(', ');
        md += '| ' + tg.name + ' | ' + tg.table + ' | ' + tg.timing + ' | ' + events + ' | ' + tg.function + ' |\n';
    }
    md += '\n';
}

// RLS Policies
md += '## RLS Policies\n\n';
if (pack.policies && pack.policies.length > 0) {
    md += '| Policy | Table | Command | Permissive |\n';
    md += '|--------|-------|---------|------------|\n';
    for (const p of pack.policies) {
        md += '| ' + p.name + ' | ' + p.table + ' | ' + p.command + ' | ' + (p.permissive ? 'Yes' : 'No') + ' |\n';
    }
    md += '\n';
}

console.log(md);
" >> "$OUTPUT_MD"

echo -e "${GREEN}✓ Generated $OUTPUT_MD${NC}"

echo ""
echo -e "${GREEN}✅ Schema Truth Pack generated successfully!${NC}"
echo ""
echo "Files created:"
echo "  - $OUTPUT_JSON"
echo "  - $OUTPUT_MD"
echo ""
echo "Next steps:"
echo "  1. Run: npm run contracts:generate"
echo "  2. Run: npm run contracts:verify"
