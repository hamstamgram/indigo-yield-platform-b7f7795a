#!/bin/bash
# Apply critical security fix to daily_nav RLS policy
# Usage: ./scripts/apply-security-fix.sh

set -e

echo "=========================================="
echo "SECURITY FIX: daily_nav RLS Policy"
echo "=========================================="

# Get Supabase access token
SUPABASE_ACCESS_TOKEN=$(supabase login --token-stdin 2>/dev/null || supabase auth token 2>/dev/null || echo "")

# Get project ref from linked project
PROJECT_REF="nkfimvovosdehmyyjubn"

echo "Project: $PROJECT_REF"
echo ""

# The SQL to execute
SQL_FIX=$(cat <<'EOSQL'
-- Drop overly permissive policies
DROP POLICY IF EXISTS "daily_nav_select_policy" ON public.daily_nav;
DROP POLICY IF EXISTS "daily_nav_public_select" ON public.daily_nav;
DROP POLICY IF EXISTS "Allow public read access" ON public.daily_nav;

-- Create secure policy - authenticated users only
CREATE POLICY "daily_nav_select_authenticated" ON public.daily_nav
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Create admin-only write policies
DROP POLICY IF EXISTS "daily_nav_insert_policy" ON public.daily_nav;
DROP POLICY IF EXISTS "daily_nav_update_policy" ON public.daily_nav;
DROP POLICY IF EXISTS "daily_nav_delete_policy" ON public.daily_nav;

CREATE POLICY "daily_nav_insert_admin" ON public.daily_nav
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "daily_nav_update_admin" ON public.daily_nav
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "daily_nav_delete_admin" ON public.daily_nav
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Log the security fix
INSERT INTO public.audit_log (action, entity, entity_id, meta)
VALUES (
    'SECURITY_FIX',
    'daily_nav',
    NULL,
    jsonb_build_object(
        'fix_type', 'RLS_POLICY_HARDENING',
        'description', 'Replaced overly permissive SELECT policy with authenticated-only access',
        'applied_at', NOW()
    )
);
EOSQL
)

echo "SQL to execute:"
echo "---"
echo "$SQL_FIX"
echo "---"
echo ""

echo "To apply this fix, run one of the following:"
echo ""
echo "Option 1: Via Supabase Dashboard SQL Editor"
echo "  1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql"
echo "  2. Paste the SQL above and click 'Run'"
echo ""
echo "Option 2: Via psql (if you have direct database access)"
echo "  psql 'postgresql://postgres:[PASSWORD]@db.$PROJECT_REF.supabase.co:5432/postgres' -c '\$SQL_FIX'"
echo ""
echo "Option 3: Via Supabase CLI (if migrations are synced)"
echo "  supabase db push"
echo ""

# Try to get the database URL from Supabase settings
echo "Attempting to retrieve database connection info..."
echo ""

# Show how to verify the fix
echo "After applying, verify with:"
echo ""
echo '~/.ai/scripts/supabase-curl.sh "/rest/v1/daily_nav?select=*&limit=1"'
echo ""
echo "Expected result: Empty array [] or authentication error (not data)"
