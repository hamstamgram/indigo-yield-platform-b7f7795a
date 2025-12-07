-- Migration: Remove USDC from asset_code enum
-- Date: 2025-12-07
-- Purpose: USDC is NOT a platform fund. Only 7 canonical funds are supported:
--          BTC, ETH, SOL, USDT, EURC, xAUT, XRP
--
-- This migration:
-- 1. Migrates any existing USDC data to USDT (Stablecoin Fund)
-- 2. Recreates the asset_code enum without USDC
-- 3. Updates all dependent columns

-- ============================================================================
-- STEP 1: Migrate any existing USDC data to USDT
-- ============================================================================

-- Log what we're about to migrate
DO $$
DECLARE
    usdc_count INTEGER;
BEGIN
    -- Count USDC records in each table
    SELECT COUNT(*) INTO usdc_count FROM public.assets WHERE symbol = 'USDC';
    IF usdc_count > 0 THEN
        RAISE NOTICE 'Found % USDC records in assets table - will migrate to USDT', usdc_count;
    END IF;

    SELECT COUNT(*) INTO usdc_count FROM public.fees WHERE asset_code = 'USDC';
    IF usdc_count > 0 THEN
        RAISE NOTICE 'Found % USDC records in fees table - will migrate to USDT', usdc_count;
    END IF;

    SELECT COUNT(*) INTO usdc_count FROM public.positions WHERE asset_code = 'USDC';
    IF usdc_count > 0 THEN
        RAISE NOTICE 'Found % USDC records in positions table - will migrate to USDT', usdc_count;
    END IF;

    SELECT COUNT(*) INTO usdc_count FROM public.statements WHERE asset_code = 'USDC';
    IF usdc_count > 0 THEN
        RAISE NOTICE 'Found % USDC records in statements table - will migrate to USDT', usdc_count;
    END IF;

    SELECT COUNT(*) INTO usdc_count FROM public.transactions WHERE asset_code = 'USDC';
    IF usdc_count > 0 THEN
        RAISE NOTICE 'Found % USDC records in transactions table - will migrate to USDT', usdc_count;
    END IF;
END $$;

-- Migrate USDC to USDT in all tables
-- Note: Using text cast to avoid enum constraint issues during migration
UPDATE public.assets SET symbol = 'USDT' WHERE symbol::text = 'USDC';
UPDATE public.fees SET asset_code = 'USDT' WHERE asset_code::text = 'USDC';
UPDATE public.positions SET asset_code = 'USDT' WHERE asset_code::text = 'USDC';
UPDATE public.statements SET asset_code = 'USDT' WHERE asset_code::text = 'USDC';
UPDATE public.transactions SET asset_code = 'USDT' WHERE asset_code::text = 'USDC';

-- Also check investor_monthly_reports if it uses TEXT
UPDATE public.investor_monthly_reports SET asset_code = 'USDT' WHERE asset_code = 'USDC';

-- Also check transactions_v2 if it uses TEXT
UPDATE public.transactions_v2 SET asset = 'USDT' WHERE asset = 'USDC';

-- ============================================================================
-- STEP 2: Recreate the enum without USDC
-- ============================================================================

-- PostgreSQL doesn't support DROP VALUE from enum directly
-- We need to: create new type, alter columns, drop old type, rename new type

-- Create the new enum type with only the 7 canonical funds
CREATE TYPE public.asset_code_new AS ENUM (
    'BTC',
    'ETH',
    'SOL',
    'USDT',
    'EURC',
    'xAUT',
    'XRP'
);

-- ============================================================================
-- STEP 3: Alter all columns to use the new enum type
-- ============================================================================

-- assets.symbol
ALTER TABLE public.assets
    ALTER COLUMN symbol TYPE public.asset_code_new
    USING symbol::text::public.asset_code_new;

-- fees.asset_code
ALTER TABLE public.fees
    ALTER COLUMN asset_code TYPE public.asset_code_new
    USING asset_code::text::public.asset_code_new;

-- positions.asset_code
ALTER TABLE public.positions
    ALTER COLUMN asset_code TYPE public.asset_code_new
    USING asset_code::text::public.asset_code_new;

-- statements.asset_code
ALTER TABLE public.statements
    ALTER COLUMN asset_code TYPE public.asset_code_new
    USING asset_code::text::public.asset_code_new;

-- transactions.asset_code
ALTER TABLE public.transactions
    ALTER COLUMN asset_code TYPE public.asset_code_new
    USING asset_code::text::public.asset_code_new;

-- ============================================================================
-- STEP 4: Drop old enum and rename new one
-- ============================================================================

-- Drop the old enum type (now unused)
DROP TYPE public.asset_code;

-- Rename the new enum type to the original name
ALTER TYPE public.asset_code_new RENAME TO asset_code;

-- ============================================================================
-- STEP 5: Verify the migration
-- ============================================================================

DO $$
DECLARE
    enum_values TEXT[];
BEGIN
    -- Get the enum values
    SELECT array_agg(enumlabel ORDER BY enumsortorder) INTO enum_values
    FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'asset_code';

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
    ELSE
        RAISE EXCEPTION 'VERIFICATION FAILED: asset_code enum has unexpected values: %', enum_values;
    END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TYPE public.asset_code IS 'Platform canonical funds: BTC, ETH, SOL, USDT, EURC, xAUT, XRP. USDC is NOT a platform fund.';
