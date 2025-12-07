-- Fix Migration: Complete USDC removal
-- The previous migration partially succeeded:
--   - fees, positions, statements, transactions now use asset_code_new
--   - assets.symbol still uses old asset_code
--
-- This migration:
-- 1. Deletes the USDC record from assets table
-- 2. Converts assets.symbol to asset_code_new
-- 3. Drops old asset_code enum
-- 4. Renames asset_code_new to asset_code

-- ============================================================================
-- STEP 1: Delete USDC from assets table (USDT already exists)
-- ============================================================================

DELETE FROM public.assets WHERE symbol::text = 'USDC';

-- ============================================================================
-- STEP 2: Convert assets.symbol to new enum
-- ============================================================================

ALTER TABLE public.assets
    ALTER COLUMN symbol TYPE public.asset_code_new
    USING symbol::text::public.asset_code_new;

-- ============================================================================
-- STEP 3: Drop old enum (no longer in use)
-- ============================================================================

DROP TYPE IF EXISTS public.asset_code;

-- ============================================================================
-- STEP 4: Rename new enum to original name
-- ============================================================================

ALTER TYPE public.asset_code_new RENAME TO asset_code;

-- ============================================================================
-- STEP 5: Verify the migration
-- ============================================================================

DO $$
DECLARE
    enum_values TEXT[];
    asset_count INTEGER;
BEGIN
    -- Get the enum values
    SELECT array_agg(enumlabel ORDER BY enumsortorder) INTO enum_values
    FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'asset_code';

    -- Count assets
    SELECT COUNT(*) INTO asset_count FROM public.assets;

    -- Verify we have exactly 7 values and USDC is not present
    IF array_length(enum_values, 1) = 7
       AND 'USDC' != ALL(enum_values)
       AND 'BTC' = ANY(enum_values)
       AND 'ETH' = ANY(enum_values)
       AND 'SOL' = ANY(enum_values)
       AND 'USDT' = ANY(enum_values)
       AND 'EURC' = ANY(enum_values)
       AND 'xAUT' = ANY(enum_values)
       AND 'XRP' = ANY(enum_values)
    THEN
        RAISE NOTICE 'SUCCESS: asset_code enum now has exactly 7 canonical funds: %', enum_values;
        RAISE NOTICE 'Assets table now has % records (USDC removed)', asset_count;
    ELSE
        RAISE EXCEPTION 'VERIFICATION FAILED: asset_code enum has unexpected values: %', enum_values;
    END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TYPE public.asset_code IS 'Platform canonical funds: BTC, ETH, SOL, USDT, EURC, xAUT, XRP. USDC is NOT a platform fund.';
