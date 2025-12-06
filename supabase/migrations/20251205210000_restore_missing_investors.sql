
-- Restore Missing Investors Migration
-- Scans for investor_ids in reports/transactions that are missing from the 'investors' table
-- Creates placeholder records so they appear in the Admin Dashboard

DO $$
DECLARE
    r RECORD;
    v_count INTEGER := 0;
BEGIN
    -- Find orphan IDs from Monthly Reports
    FOR r IN 
        SELECT DISTINCT investor_id 
        FROM public.investor_monthly_reports 
        WHERE investor_id NOT IN (SELECT id FROM public.investors)
    LOOP
        INSERT INTO public.investors (id, name, email, status, entity_type, accredited, created_at, updated_at)
        VALUES (
            r.investor_id, 
            'Restored Investor ' || substring(r.investor_id::text, 1, 8),
            'restored_' || substring(r.investor_id::text, 1, 8) || '@placeholder.com',
            'active',
            'individual',
            true,
            NOW(),
            NOW()
        );
        v_count := v_count + 1;
    END LOOP;

    -- Find orphan IDs from Transactions
    -- Note: transactions.investor_id might be User ID (Profile ID) depending on older schema logic
    -- But if it matches valid UUID format and isn't in investors, we restore it to be safe.
    -- Actually, if transactions linked to auth.users, we should check profiles.
    -- But sticking to investors table for Admin visibility.
    
    FOR r IN 
        SELECT DISTINCT investor_id 
        FROM public.transactions 
        WHERE investor_id NOT IN (SELECT id FROM public.investors) 
          AND investor_id NOT IN (SELECT id FROM public.profiles) -- Don't create investor if it's actually a User ID
    LOOP
        INSERT INTO public.investors (id, name, email, status, entity_type, accredited, created_at, updated_at)
        VALUES (
            r.investor_id, 
            'Restored Transactor ' || substring(r.investor_id::text, 1, 8),
            'transactor_' || substring(r.investor_id::text, 1, 8) || '@placeholder.com',
            'active',
            'individual',
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING; -- In case duplication with above
        IF FOUND THEN v_count := v_count + 1; END IF;
    END LOOP;

    RAISE NOTICE 'Restored % missing investor records.', v_count;
END $$;
