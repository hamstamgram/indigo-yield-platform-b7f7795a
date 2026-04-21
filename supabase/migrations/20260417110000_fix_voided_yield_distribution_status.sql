-- Fix: Voided yield distributions should have status='voided', not 'applied'
-- The unique index idx_yield_distributions_unique_original has condition:
-- WHERE distribution_type = 'original' AND status = 'applied'
-- Voided distributions block re-insertion because status remains 'applied'

-- Use canonical_rpc bypass to update status
SET indigo.canonical_rpc = 'true';

UPDATE yield_distributions
SET status = 'voided'
WHERE is_voided = true AND status = 'applied';

RESET indigo.canonical_rpc;