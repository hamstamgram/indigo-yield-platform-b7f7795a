-- ==============================================================================
-- Migration: 20251208_one_id_unification_sanitized.sql
-- Description: Unifies investor identity.
--              FIXED: Sanitizes data AND fixes information_schema query syntax.
-- ==============================================================================

DO $$
DECLARE
    t_name TEXT;
    fk_col_name TEXT;
    has_kyc BOOLEAN;
    has_entity BOOLEAN;
BEGIN

    RAISE NOTICE 'Starting "One ID" Unification Migration (Sanitized V2)...';

    -- Step 0: Pre-flight Cleanup
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_entity_type_check;

    -- Step 1: Extend public.profiles
    RAISE NOTICE '1. Extending public.profiles table...';
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='status') THEN
        ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='onboarding_date') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_date DATE DEFAULT CURRENT_DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='entity_type') THEN
        ALTER TABLE public.profiles ADD COLUMN entity_type TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_status') THEN
        ALTER TABLE public.profiles ADD COLUMN kyc_status TEXT DEFAULT 'pending';
    END IF;

    -- Step 1.5: SANITIZE DATA
    UPDATE public.profiles 
    SET status = 'pending' 
    WHERE status NOT IN ('active', 'pending', 'suspended', 'closed', 'archived') OR status IS NULL;

    UPDATE public.profiles 
    SET entity_type = 'individual' 
    WHERE entity_type NOT IN ('individual', 'corporate', 'trust', 'foundation') AND entity_type IS NOT NULL;

    UPDATE public.profiles
    SET kyc_status = 'pending'
    WHERE kyc_status NOT IN ('pending', 'approved', 'rejected', 'expired') OR kyc_status IS NULL;

    -- Apply constraints
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'pending', 'suspended', 'closed', 'archived'));
    
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_entity_type_check CHECK (entity_type IN ('individual', 'corporate', 'trust', 'foundation'));

    -- Step 2: Migrate data
    RAISE NOTICE '2. Migrating data...';
    
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='investors' AND column_name='kyc_status') INTO has_kyc;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='investors' AND column_name='entity_type') INTO has_entity;

    IF has_kyc AND has_entity THEN
        UPDATE public.profiles p
        SET 
            status = CASE WHEN i.status IN ('active', 'pending', 'suspended', 'closed', 'archived') THEN i.status ELSE 'active' END,
            onboarding_date = i.onboarding_date,
            entity_type = CASE WHEN i.entity_type IN ('individual', 'corporate', 'trust', 'foundation') THEN i.entity_type ELSE 'individual' END,
            kyc_status = CASE WHEN i.kyc_status IN ('pending', 'approved', 'rejected', 'expired') THEN i.kyc_status ELSE 'pending' END,
            updated_at = NOW()
        FROM public.investors i
        WHERE (p.email = i.email OR p.id = i.profile_id);
    ELSIF has_entity THEN
        UPDATE public.profiles p
        SET 
            status = CASE WHEN i.status IN ('active', 'pending', 'suspended', 'closed', 'archived') THEN i.status ELSE 'active' END,
            onboarding_date = i.onboarding_date,
            entity_type = CASE WHEN i.entity_type IN ('individual', 'corporate', 'trust', 'foundation') THEN i.entity_type ELSE 'individual' END,
            updated_at = NOW()
        FROM public.investors i
        WHERE (p.email = i.email OR p.id = i.profile_id);
    ELSE
        UPDATE public.profiles p
        SET 
            status = CASE WHEN i.status IN ('active', 'pending', 'suspended', 'closed', 'archived') THEN i.status ELSE 'active' END,
            onboarding_date = i.onboarding_date,
            updated_at = NOW()
        FROM public.investors i
        WHERE (p.email = i.email OR p.id = i.profile_id);
    END IF;

    -- Step 3: Relink child tables (Fixed Query)
    FOR t_name, fk_col_name IN
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
            AND tc.constraint_schema = rc.constraint_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON rc.unique_constraint_name = ccu.constraint_name
            AND rc.unique_constraint_schema = ccu.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'investors'
          AND ccu.table_schema = 'public'
    LOOP
        RAISE NOTICE '3. Processing table: %. Column: %', t_name, fk_col_name;

        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS temp_profile_id UUID;', t_name);

        -- Link via profile_id from investors table
        EXECUTE format('
            UPDATE public.%I AS child
            SET temp_profile_id = inv.profile_id
            FROM public.investors AS inv
            WHERE child.%I = inv.id AND inv.profile_id IS NOT NULL;
        ', t_name, fk_col_name);

        -- Drop old constraint
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
            END IF;
        END;

        EXECUTE format('ALTER TABLE public.%I DROP COLUMN %I;', t_name, fk_col_name);
        EXECUTE format('ALTER TABLE public.%I RENAME COLUMN temp_profile_id TO %I;', t_name, fk_col_name);
        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT fk_%I_profile_id FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE CASCADE;', t_name, t_name, fk_col_name);

    END LOOP;

    -- Step 4: Drop the public.investors table
    RAISE NOTICE '4. Dropping public.investors table...';
    DROP TABLE IF EXISTS public.investors CASCADE;

    RAISE NOTICE 'Migration "One ID" Unification Complete.';

END $$;