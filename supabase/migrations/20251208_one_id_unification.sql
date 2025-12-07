-- ==============================================================================
-- Migration: 20251208_one_id_unification.sql
-- Description: Unifies investor identity by eliminating the 'investors' table.
--              All investor-related data will now directly reference 'profiles.id'.
--              This fixes the "Two ID" problem and simplifies the data model.
-- ==============================================================================

DO $$
DECLARE
    -- Used for looping through tables that need investor_id re-linking
    t_name TEXT;
    fk_col_name TEXT;
BEGIN

    RAISE NOTICE 'Starting "One ID" Unification Migration...';

    -- Step 1: Extend public.profiles with necessary columns from public.investors
    RAISE NOTICE '1. Extending public.profiles table...';
    ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active','pending','suspended','closed')),
    ADD COLUMN IF NOT EXISTS onboarding_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS entity_type TEXT CHECK (entity_type IN ('individual', 'corporate', 'trust', 'foundation')),
    ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected', 'expired'));

    -- Step 2: Migrate data from public.investors to public.profiles
    RAISE NOTICE '2. Migrating data from public.investors to public.profiles...';
    UPDATE public.profiles p
    SET 
        status = i.status,
        onboarding_date = i.onboarding_date,
        entity_type = i.entity_type,
        kyc_status = i.kyc_status,
        updated_at = NOW()
    FROM public.investors i
    WHERE p.id = i.profile_id; -- Match by the existing link

    RAISE NOTICE '2.1. Handling profiles without existing investor records (e.g., ghost users)';
    INSERT INTO public.profiles (id, email, first_name, last_name, status, onboarding_date, entity_type, kyc_status)
    SELECT 
        p.id, p.email, p.first_name, p.last_name, 
        'active', CURRENT_DATE, 'individual', 'pending'
    FROM public.profiles p
    LEFT JOIN public.investors i ON p.id = i.profile_id
    WHERE i.id IS NULL AND p.status IS NULL; -- Only update profiles that weren't linked before and have no status yet.

    -- Step 3: Relink child tables to reference public.profiles(id)
    -- This is the most complex part. We iterate through tables that reference public.investors.id.

    -- Define tables that have a foreign key to public.investors(id)
    -- Dynamically get tables that reference 'investors'
    FOR t_name, fk_col_name IN
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
            AND tc.table_schema = rc.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON rc.unique_constraint_name = ccu.constraint_name
            AND rc.unique_constraint_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'investors'
          AND ccu.table_schema = 'public'
    LOOP
        RAISE NOTICE '3. Processing table: %. Column: %', t_name, fk_col_name;

        -- Add a temporary column to store the new profile_id
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN temp_profile_id UUID;', t_name);

        -- Populate the temporary column with the corresponding profiles.id
        EXECUTE format('
            UPDATE public.%I AS child
            SET temp_profile_id = p.id
            FROM public.investors AS inv
            JOIN public.profiles AS p ON p.id = inv.profile_id
            WHERE child.%I = inv.id;
        ', t_name, fk_col_name);

        -- Drop the old foreign key constraint
        -- Find constraint name
        DECLARE
            fkey_constraint_name TEXT;
        BEGIN
            SELECT tc.constraint_name
            INTO fkey_constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = t_name AND tc.constraint_type = 'FOREIGN KEY' AND ccu.column_name = fk_col_name;

            IF fkey_constraint_name IS NOT NULL THEN
                EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I;', t_name, fkey_constraint_name);
                RAISE NOTICE 'Dropped FK constraint % on table %', fkey_constraint_name, t_name;
            END IF;
        END;

        -- Drop the original column
        EXECUTE format('ALTER TABLE public.%I DROP COLUMN %I;', t_name, fk_col_name);

        -- Rename the temporary column to the original column name
        EXECUTE format('ALTER TABLE public.%I RENAME COLUMN temp_profile_id TO %I;', t_name, fk_col_name);
        
        -- Add the new foreign key constraint to public.profiles(id)
        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT fk_%I_profile_id FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE CASCADE;', t_name, t_name, fk_col_name);

        -- Add NOT NULL constraint if necessary (assuming all are linked now)
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET NOT NULL;', t_name, fk_col_name);

        RAISE NOTICE 'Table % updated and relinked to public.profiles(id) via column %', t_name, fk_col_name;

    END LOOP;

    -- Special handling for onboarding_submissions.created_investor_id
    -- This column references investors.id. It needs to reference profiles.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='onboarding_submissions' AND column_name='created_investor_id') THEN
        RAISE NOTICE '3. Processing table: onboarding_submissions. Column: created_investor_id';

        -- Add a temporary column to store the new profile_id
        ALTER TABLE public.onboarding_submissions ADD COLUMN temp_profile_id UUID;

        -- Populate the temporary column with the corresponding profiles.id
        UPDATE public.onboarding_submissions os
        SET temp_profile_id = p.id
        FROM public.investors AS inv
        JOIN public.profiles AS p ON p.id = inv.profile_id
        WHERE os.created_investor_id = inv.id;

        -- Drop the old foreign key constraint
        DECLARE
            fkey_constraint_name TEXT;
        BEGIN
            SELECT tc.constraint_name
            INTO fkey_constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'onboarding_submissions' AND tc.constraint_type = 'FOREIGN KEY' AND ccu.column_name = 'created_investor_id';

            IF fkey_constraint_name IS NOT NULL THEN
                EXECUTE format('ALTER TABLE public.onboarding_submissions DROP CONSTRAINT %I;', fkey_constraint_name);
                RAISE NOTICE 'Dropped FK constraint % on table onboarding_submissions', fkey_constraint_name;
            END IF;
        END;

        -- Drop the original column
        ALTER TABLE public.onboarding_submissions DROP COLUMN created_investor_id;

        -- Rename the temporary column to the original column name
        ALTER TABLE public.onboarding_submissions RENAME COLUMN temp_profile_id TO created_investor_id;
        
        -- Add the new foreign key constraint to public.profiles(id)
        ALTER TABLE public.onboarding_submissions ADD CONSTRAINT fk_onboarding_submissions_profile_id FOREIGN KEY (created_investor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

        -- Add NOT NULL constraint
        ALTER TABLE public.onboarding_submissions ALTER COLUMN created_investor_id SET NOT NULL; -- Assuming it always links now

        RAISE NOTICE 'Table onboarding_submissions updated and relinked to public.profiles(id)';
    END IF;

    -- Step 4: Drop the public.investors table
    RAISE NOTICE '4. Dropping public.investors table...';
    DROP TABLE public.investors CASCADE;

    RAISE NOTICE 'Migration "One ID" Unification Complete.';

END $$;
