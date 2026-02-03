-- ============================================
-- Phase 3: Add Foreign Key Constraints
-- Enforce referential integrity at the database level
-- ============================================

-- transactions_v2 FK constraints
-- Check if FK exists before adding (to be idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_transactions_v2_investor' 
    AND table_name = 'transactions_v2'
  ) THEN
    ALTER TABLE public.transactions_v2 
      ADD CONSTRAINT fk_transactions_v2_investor 
      FOREIGN KEY (investor_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_transactions_v2_fund' 
    AND table_name = 'transactions_v2'
  ) THEN
    ALTER TABLE public.transactions_v2 
      ADD CONSTRAINT fk_transactions_v2_fund 
      FOREIGN KEY (fund_id) REFERENCES public.funds(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- yield_distributions FK constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_yield_distributions_fund' 
    AND table_name = 'yield_distributions'
  ) THEN
    ALTER TABLE public.yield_distributions 
      ADD CONSTRAINT fk_yield_distributions_fund 
      FOREIGN KEY (fund_id) REFERENCES public.funds(id) ON DELETE RESTRICT;
  END IF;
END $$;