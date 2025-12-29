-- Add missing columns to yield_distributions table
ALTER TABLE yield_distributions 
ADD COLUMN IF NOT EXISTS net_yield numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_fees numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ib numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS investor_count integer DEFAULT 0;

-- Update distribution_type constraint to allow 'daily'
ALTER TABLE yield_distributions DROP CONSTRAINT IF EXISTS yield_distributions_distribution_type_check;
ALTER TABLE yield_distributions ADD CONSTRAINT yield_distributions_distribution_type_check 
CHECK (distribution_type = ANY (ARRAY['original'::text, 'correction'::text, 'daily'::text]));

-- Update chk_correction_has_parent to allow 'original' and 'daily' without parent
ALTER TABLE yield_distributions DROP CONSTRAINT IF EXISTS chk_correction_has_parent;
ALTER TABLE yield_distributions ADD CONSTRAINT chk_correction_has_parent 
CHECK (distribution_type IN ('original', 'daily') OR parent_distribution_id IS NOT NULL);

-- Update chk_correction_has_reason to allow 'original' and 'daily' without reason
ALTER TABLE yield_distributions DROP CONSTRAINT IF EXISTS chk_correction_has_reason;
ALTER TABLE yield_distributions ADD CONSTRAINT chk_correction_has_reason 
CHECK (distribution_type IN ('original', 'daily') OR reason IS NOT NULL);