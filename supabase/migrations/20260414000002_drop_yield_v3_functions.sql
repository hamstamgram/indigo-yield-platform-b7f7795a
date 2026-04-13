-- Batch 2: Drop canonical yield v3 functions
-- v5 (apply_segmented_yield_distribution_v5) is the canonical yield function
-- v3 functions are no longer called by the application and are replaced by v5
--
-- Evidence:
-- - apply_segmented_yield_distribution_v5 is called in production code
-- - preview_segmented_yield_distribution_v5 is used by yield preview service  
-- - No calls to v3 variants exist in src/ (verified with rg)
-- - v3 only appears in generated types.ts, not in actual code

DROP FUNCTION IF EXISTS public.apply_adb_yield_distribution_v3();
DROP FUNCTION IF EXISTS public.preview_adb_yield_distribution_v3();
