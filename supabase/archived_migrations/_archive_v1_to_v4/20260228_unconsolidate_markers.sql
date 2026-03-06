-- Un-consolidate crystallization markers after voiding distributions
SELECT set_config('indigo.canonical_rpc', 'true', true);

UPDATE yield_distributions
SET consolidated_into_id = NULL
WHERE reference_id LIKE 'crystal-marker:%'
  AND consolidated_into_id IS NOT NULL;

-- Ensure markers are not voided
UPDATE yield_distributions
SET is_voided = false
WHERE reference_id LIKE 'crystal-marker:%'
  AND is_voided = true;