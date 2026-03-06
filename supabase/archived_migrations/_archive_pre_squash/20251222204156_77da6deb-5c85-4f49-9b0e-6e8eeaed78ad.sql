-- Clean up orphaned statement records with negative balances
-- These are artifacts from data import/sync issues

DELETE FROM statements 
WHERE id IN (
  '942c7076-4a7b-4e62-b72f-eb814df04b4c',  -- INDIGO DIGITAL ASSET FUND LP (ETH, 2025-12)
  '14b07cf8-0cc3-4c35-84d5-bf2eed04bb18'   -- Paul Johnson (SOL, 2025-12)
);