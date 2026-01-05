-- Drop the duplicate FK constraint on ib_allocations.distribution_id
-- Keep ib_allocations_distribution_id_fkey_v2 (NO ACTION)
ALTER TABLE ib_allocations 
DROP CONSTRAINT IF EXISTS fk_ib_allocations_distribution;

-- Add documentation comment to the remaining constraint
COMMENT ON CONSTRAINT ib_allocations_distribution_id_fkey_v2 ON ib_allocations IS 
  'FK to yield_distributions.id with NO ACTION on delete (preserves allocation history)';