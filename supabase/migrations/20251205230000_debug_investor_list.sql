
-- Debug Migration: List all investors
DO $$
DECLARE
    r RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE '--- START INVESTOR LIST ---';
    
    FOR r IN SELECT id, name, email, status FROM public.investors LOOP
        RAISE NOTICE 'Investor: % | Email: % | Status: % | ID: %', r.name, r.email, r.status, r.id;
        v_count := v_count + 1;
    END LOOP;

    RAISE NOTICE '--- END INVESTOR LIST (Total: %) ---', v_count;
END $$;
