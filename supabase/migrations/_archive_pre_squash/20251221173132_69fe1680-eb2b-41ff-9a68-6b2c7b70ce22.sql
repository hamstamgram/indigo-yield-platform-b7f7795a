-- Migration: Convert fund_daily_aum.fund_id from TEXT to UUID
-- This is a critical fix for type consistency across the schema

-- Step 1: Add a new UUID column
ALTER TABLE public.fund_daily_aum ADD COLUMN IF NOT EXISTS fund_id_new UUID;

-- Step 2: Backfill the new column by casting valid UUIDs
UPDATE public.fund_daily_aum
SET fund_id_new = fund_id::uuid
WHERE fund_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

-- Step 3: For any non-UUID fund_id values, try to lookup by fund code or asset
UPDATE public.fund_daily_aum fda
SET fund_id_new = f.id
FROM public.funds f
WHERE fda.fund_id_new IS NULL
  AND (fda.fund_id = f.code OR fda.fund_id = f.asset);

-- Step 4: Drop the old unique constraint (if exists)
DROP INDEX IF EXISTS idx_fund_daily_aum_unique;
DROP INDEX IF EXISTS fund_daily_aum_fund_id_aum_date_purpose_key;

-- Step 5: Drop old column and rename new one
ALTER TABLE public.fund_daily_aum DROP COLUMN fund_id;
ALTER TABLE public.fund_daily_aum RENAME COLUMN fund_id_new TO fund_id;

-- Step 6: Set NOT NULL constraint
ALTER TABLE public.fund_daily_aum ALTER COLUMN fund_id SET NOT NULL;

-- Step 7: Add foreign key to funds table
ALTER TABLE public.fund_daily_aum 
ADD CONSTRAINT fund_daily_aum_fund_id_fkey 
FOREIGN KEY (fund_id) REFERENCES public.funds(id) ON DELETE RESTRICT;

-- Step 8: Recreate the unique index with proper UUID type
CREATE UNIQUE INDEX idx_fund_daily_aum_unique 
ON public.fund_daily_aum (fund_id, aum_date, purpose);

-- Step 9: Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_fund_daily_aum_fund_date 
ON public.fund_daily_aum (fund_id, aum_date DESC);