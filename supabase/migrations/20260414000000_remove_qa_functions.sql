-- Batch 1a: Remove QA helper functions
-- These functions are no longer called in the application and are not referenced in business logic

DROP TRIGGER IF EXISTS public.trg_block_test_profiles ON public.profiles;

DROP FUNCTION IF EXISTS public.qa_seed_world(p_run_tag text);
DROP FUNCTION IF EXISTS public.qa_admin_id();
DROP FUNCTION IF EXISTS public.qa_fund_id(p_asset text);
DROP FUNCTION IF EXISTS public.qa_investor_id(p_key text);
DROP FUNCTION IF EXISTS public.block_test_profiles();
