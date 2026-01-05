-- Schema Cleanup Migration: Function Consolidation, FK Constraints, and View Fix
-- Phase 1: Drop duplicate get_position_reconciliation (uuid, date signature)
DROP FUNCTION IF EXISTS public.get_position_reconciliation(uuid, date);

-- Phase 2: Document crystallize_yield_before_flow overloads
COMMENT ON FUNCTION public.crystallize_yield_before_flow(uuid, text, date, uuid, uuid) IS 
  'Fund-level yield crystallization before month-end or manual trigger. Used by admin UI.';

COMMENT ON FUNCTION public.crystallize_yield_before_flow(uuid, uuid, date, numeric, uuid) IS 
  'Investor-level yield crystallization before deposit/withdrawal. Called by transaction handlers.';

-- Phase 3: Add Foreign Key Constraints to Critical Tables
-- Note: Using IF NOT EXISTS pattern via DO block to handle existing constraints

DO $$
BEGIN
  -- investor_positions FK constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_investor_positions_investor') THEN
    ALTER TABLE investor_positions
      ADD CONSTRAINT fk_investor_positions_investor 
        FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_investor_positions_fund') THEN
    ALTER TABLE investor_positions
      ADD CONSTRAINT fk_investor_positions_fund 
        FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
  END IF;

  -- transactions_v2 FK constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_v2_investor') THEN
    ALTER TABLE transactions_v2
      ADD CONSTRAINT fk_transactions_v2_investor 
        FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_v2_fund') THEN
    ALTER TABLE transactions_v2
      ADD CONSTRAINT fk_transactions_v2_fund 
        FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
  END IF;

  -- yield_distributions FK constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_yield_distributions_fund_new') THEN
    ALTER TABLE yield_distributions
      ADD CONSTRAINT fk_yield_distributions_fund_new 
        FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
  END IF;

END $$;

-- Phase 4: Fix fund_aum_mismatch view to use latest AUM regardless of purpose
DROP VIEW IF EXISTS fund_aum_mismatch;

CREATE VIEW fund_aum_mismatch AS
SELECT 
  f.id as fund_id,
  f.name as fund_name,
  f.code as fund_code,
  fda.aum_date,
  fda.total_aum as recorded_aum,
  COALESCE(pos_sum.total_positions, 0) as calculated_aum,
  COALESCE(pos_sum.total_positions, 0) - COALESCE(fda.total_aum, 0) as discrepancy
FROM funds f
LEFT JOIN LATERAL (
  SELECT aum_date, total_aum 
  FROM fund_daily_aum 
  WHERE fund_id = f.id AND is_voided = false
  ORDER BY aum_date DESC 
  LIMIT 1
) fda ON true
LEFT JOIN LATERAL (
  SELECT SUM(current_value) as total_positions
  FROM investor_positions
  WHERE fund_id = f.id
) pos_sum ON true
WHERE ABS(COALESCE(pos_sum.total_positions, 0) - COALESCE(fda.total_aum, 0)) > 0.01;

-- Add comment to the view
COMMENT ON VIEW fund_aum_mismatch IS 
  'Shows funds where recorded AUM differs from sum of investor positions. Uses latest AUM record regardless of purpose.';