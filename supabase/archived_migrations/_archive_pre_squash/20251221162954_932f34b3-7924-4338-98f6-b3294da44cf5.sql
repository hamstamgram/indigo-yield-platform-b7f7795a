-- P0 Fix: Add missing transaction type enum values for internal routing
-- Note: ALTER TYPE ADD VALUE cannot be in a transaction block, so we check if values exist first

DO $$
BEGIN
  -- Check if INTERNAL_WITHDRAWAL exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'INTERNAL_WITHDRAWAL' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tx_type')
  ) THEN
    ALTER TYPE tx_type ADD VALUE 'INTERNAL_WITHDRAWAL';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- Value already exists, ignore
  NULL;
END
$$;

DO $$
BEGIN
  -- Check if INTERNAL_CREDIT exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'INTERNAL_CREDIT' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tx_type')
  ) THEN
    ALTER TYPE tx_type ADD VALUE 'INTERNAL_CREDIT';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- Value already exists, ignore
  NULL;
END
$$;

-- P0 Fix: Clean up duplicate transactions from wizard retries
-- Keep only the first transaction for each investor+fund+type+amount+date combination
-- This uses a CTE to identify duplicates and delete them safely

WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY investor_id, fund_id, type, amount, tx_date
    ORDER BY created_at ASC
  ) as rn
  FROM transactions_v2
  WHERE source = 'investor_wizard'  -- Only clean up wizard-created transactions
)
DELETE FROM transactions_v2
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add a unique constraint on reference_id to enforce idempotency going forward
-- First, make sure there are no null reference_ids that would conflict
-- (We only add the constraint if it doesn't already exist)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'transactions_v2_reference_id_key'
  ) THEN
    -- Create unique index that allows NULLs (partial index) 
    CREATE UNIQUE INDEX IF NOT EXISTS transactions_v2_reference_id_key 
    ON transactions_v2 (reference_id) 
    WHERE reference_id IS NOT NULL;
  END IF;
END
$$;