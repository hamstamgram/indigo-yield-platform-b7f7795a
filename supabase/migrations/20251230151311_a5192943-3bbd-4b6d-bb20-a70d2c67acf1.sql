-- Phase 2: Document yield_distributions table
-- This helps developers understand the correct column names

COMMENT ON TABLE public.yield_distributions IS 
  'Yield distribution records for investor performance tracking. Common query errors: the table does not have a total_amount column - use the actual columns like period_gross_return instead.';