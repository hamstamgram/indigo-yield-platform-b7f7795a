-- Drop duplicate FK constraints that cause PostgREST ambiguity
-- Keep fk_investor_positions_investor as the single FK to profiles
ALTER TABLE investor_positions 
DROP CONSTRAINT IF EXISTS fk_investor_positions_profile;

-- Keep investor_positions_fund_id_fkey, drop duplicate fk_investor_positions_fund
ALTER TABLE investor_positions 
DROP CONSTRAINT IF EXISTS fk_investor_positions_fund;