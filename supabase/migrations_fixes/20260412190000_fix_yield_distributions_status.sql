-- Fix: Change yield_distributions.status to text instead of enum
-- The enum type causes type mismatch when calling RPC via PostgREST
-- Date: 2026-04-12

-- Step 1: Drop the enum type (if no other columns use it)
DROP TYPE IF EXISTS yield_distribution_status;

-- Step 2: Add a check constraint to limit valid status values
ALTER TABLE yield_distributions 
ADD CONSTRAINT valid_status CHECK (status IN ('draft', 'applied', 'voided', 'previewed', 'corrected', 'rolled_back'));

-- Step 3: Grant permissions
GRANT SELECT ON yield_distributions TO anon, authenticated, service_role;