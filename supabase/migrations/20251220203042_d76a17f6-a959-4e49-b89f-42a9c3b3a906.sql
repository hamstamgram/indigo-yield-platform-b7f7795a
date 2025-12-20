-- Clean up existing zero-value positions
-- These are positions that have been fully withdrawn or deleted but left as zero rows
DELETE FROM investor_positions 
WHERE current_value = 0 
  AND shares = 0 
  AND cost_basis = 0;