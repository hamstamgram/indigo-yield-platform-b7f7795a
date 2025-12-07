
DO $$
DECLARE
    v_count INT;
    v_names TEXT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.investors;
    SELECT string_agg(name, ', ') INTO v_names FROM public.investors;
    
    RAISE NOTICE 'FINAL AUDIT: Investor Count = %', v_count;
    IF v_count < 10 THEN
        RAISE NOTICE 'Investors: %', v_names;
    END IF;
END $$;
