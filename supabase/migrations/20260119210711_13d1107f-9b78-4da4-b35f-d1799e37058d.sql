-- ============================================================================
-- Fix: Correct doubled cost_basis in investor_positions
-- ============================================================================
-- Issue: Kyle Gulamerian's ETH position has cost_basis = 246913578.0247
--        which is exactly 2x the actual deposit amount (123456789.0123)
-- Root Cause: Bug in deposit flow that has since been fixed
-- Impact: Causes get_void_transaction_impact to show incorrect projections
-- ============================================================================

-- Bypass canonical mutation trigger using the correct session variable
SELECT set_config('indigo.canonical_rpc', 'true', true);

-- Log the correction in data_edit_audit
INSERT INTO data_edit_audit (
  table_name,
  record_id,
  operation,
  edit_source,
  old_data,
  new_data,
  changed_fields,
  edited_by
)
SELECT 
  'investor_positions',
  ip.investor_id,
  'UPDATE',
  'system',
  jsonb_build_object(
    'cost_basis', ip.cost_basis,
    'fund_id', ip.fund_id::text
  ),
  jsonb_build_object(
    'cost_basis', 123456789.0123456700,
    'fund_id', ip.fund_id::text,
    'fix_reason', 'Corrected doubled cost_basis from bug in deposit flow'
  ),
  ARRAY['cost_basis'],
  NULL
FROM investor_positions ip
WHERE ip.investor_id = 'c2c449d3-a5cb-4b10-801f-f9ae9f96b121'
  AND ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'
  AND ip.cost_basis > 200000000;

-- Fix the cost_basis
UPDATE investor_positions
SET 
  cost_basis = 123456789.0123456700,
  updated_at = now()
WHERE investor_id = 'c2c449d3-a5cb-4b10-801f-f9ae9f96b121'
  AND fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'
  AND cost_basis > 200000000;

-- Reset the bypass flag
SELECT set_config('indigo.canonical_rpc', 'false', true);