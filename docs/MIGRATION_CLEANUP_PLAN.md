# MIGRATION SQUASH PLAN & CLEANUP
*Targeting the First Principles Yield Architecture V5/V6*

## The Problem
The project currently has over 120+ migration files under `supabase/migrations/` generated over 2 years of rapid iteration on the Yield crystallization architecture. Many of these migrations overwrite, modify, and delete the exact same functions redundantly.

## The Objective
Squash the migration history into a single, comprehensive `baseline` file that accurately reflects the exact state of the production database *after* securely stripping away the recently deprecated legacy Yield functions.

## Step-by-Step Execution Plan

### 1. Finalizing the Death of Legacy Logic
A new script has been drafted: `supabase/migrations/20260306_drop_dead_code.sql`.
*   **What it does**: Drops orphaned triggers (`trg_auto_update_aum_fn_trigger`) and cascading legacy functions (`calculate_unrealized_pnl`, `ensure_crystallization_date`, etc.).
*   **Safety net**: It relies on Postgres `CASCADE` to cleanly wipe dependent system tables but deliberately avoids touching our core tables `transactions_v2`, `investor_positions`, and `yield_distributions`.
*   **Action**: Apply this script precisely against the staging/production database so it stops existing in Postgres.

### 2. Dumping the Perfect Baseline
Once the DB has successfully executed the Drop script, the database state is now pristine.
*   **Action**: We generate a precise schema dump representing the *current* state of the database.
```bash
supabase db dump --local -f supabase/migrations/20260307000000_definitive_baseline.sql
```

### 3. Archiving the History
*   **Action**: Create a folder `supabase/migrations/_archive_v1_to_v4/`.
*   Move all 120+ old migration files (e.g. `202602*`, `202601*`) into this archive folder. Supabase CLI will ignore subfolders, meaning they no longer count as pending migrations but remain available for historical git analysis.

### 4. Re-syncing the Migration Ledger (Production Only)
*   **Why**: Production's `supabase_migrations.schema_migrations` table thinks 120 scripts have run. If we change the physical files, the CLI gets confused because hashes don't align.
*   **Action**: Run a manual SQL sweep on the production `schema_migrations` table to drop the record of all archived migrations, and instead manually insert the ID of our new `20260307000000_definitive_baseline.sql` so Supabase treats the DB as "up to date."

### 5. Final Result
Moving forward:
- Development environments run instantly from `definitive_baseline`.
- The `apply_segmented_yield_distribution_v5` and `transactions_v2` triggers are the undisputed engine.
- A completely barren, performant `supabase/migrations` folder ready for the V6 phase.
