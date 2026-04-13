

# Database Restoration Plan

## What Happened
The Supabase project was reset to a blank state. The `public` schema is completely empty:
- **0 tables** (should be 40+)
- **0 functions** (should be 200+)
- **0 triggers** (should be 68)

Only 11 recent patch migrations (April 9-10) are recorded in `supabase_migrations.schema_migrations`, but they all reference non-existent objects (tables, functions, triggers) so they had no effect.

The codebase has **101 migration files** including the `20260307000000_definitive_baseline.sql` (24,217 lines) which defines the entire schema.

## Recovery Options

### Option A: Re-apply via Supabase CLI (Recommended)
1. Use `supabase db reset` on the linked project to replay all 101 migrations from scratch
2. This will recreate all tables, functions, triggers, enums, RLS policies, and seed data
3. After schema restoration, re-seed the financial data from the Excel source of truth

### Option B: Manual baseline restoration
1. Clear the `supabase_migrations.schema_migrations` table (remove the 11 stale records)
2. Apply the `20260307000000_definitive_baseline.sql` migration first (creates all tables, types, functions, triggers)
3. Apply the remaining 100 migrations in version order
4. Verify with `run_integrity_pack`

### Option C: Supabase Dashboard restoration
1. If PITR (Point-in-Time Recovery) is enabled on the Supabase project, restore to a point before April 9 when the database was intact
2. Then apply only the April 9-10 migrations that were needed

## What This Means for the Go-Live Verification
The reconciliation work we were doing is paused until the database is restored. Once the schema is back:
1. All financial data (transactions, positions, yield distributions) will need to be re-seeded or restored
2. The XRP fund fixes (un-voiding Sam's withdrawal, etc.) will need to be re-applied
3. The full 5-fund reconciliation against the Excel can then proceed

## Recommendation
**Check if PITR is available first** — that's the fastest path to full restoration with all data intact. If not, Option B (manual baseline + sequential migrations) is the safest approach since we control every step.

