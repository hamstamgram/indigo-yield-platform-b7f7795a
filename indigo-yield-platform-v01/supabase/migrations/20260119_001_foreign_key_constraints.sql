-- ============================================================================
-- Migration: Foreign Key Constraints
-- Date: 2026-01-19
-- Description: Adds missing FK constraints and enforces cascading behavior
-- ============================================================================

-- Ensure all investor_positions reference valid investors
DO $$
BEGIN
  -- Check if FK already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_investor_positions_investor'
  ) THEN
    ALTER TABLE public.investor_positions
    ADD CONSTRAINT fk_investor_positions_investor
    FOREIGN KEY (investor_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

-- Ensure all investor_positions reference valid funds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_investor_positions_fund'
  ) THEN
    ALTER TABLE public.investor_positions
    ADD CONSTRAINT fk_investor_positions_fund
    FOREIGN KEY (fund_id)
    REFERENCES public.funds(id)
    ON DELETE RESTRICT  -- Prevent accidental fund deletion
    ON UPDATE CASCADE;
  END IF;
END $$;

-- Ensure all transactions_v2 reference valid investors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_transactions_v2_investor'
  ) THEN
    ALTER TABLE public.transactions_v2
    ADD CONSTRAINT fk_transactions_v2_investor
    FOREIGN KEY (investor_id)
    REFERENCES public.profiles(id)
    ON DELETE RESTRICT  -- Keep audit trail
    ON UPDATE CASCADE;
  END IF;
END $$;

-- Ensure all transactions_v2 reference valid funds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_transactions_v2_fund'
  ) THEN
    ALTER TABLE public.transactions_v2
    ADD CONSTRAINT fk_transactions_v2_fund
    FOREIGN KEY (fund_id)
    REFERENCES public.funds(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  END IF;
END $$;

-- Ensure yield_allocations reference valid distributions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_yield_allocations_distribution'
  ) THEN
    ALTER TABLE public.yield_allocations
    ADD CONSTRAINT fk_yield_allocations_distribution
    FOREIGN KEY (distribution_id)
    REFERENCES public.yield_distributions(id)
    ON DELETE CASCADE  -- If distribution voided, void allocations
    ON UPDATE CASCADE;
  END IF;
END $$;

-- Ensure fee_allocations reference valid distributions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_fee_allocations_distribution'
  ) THEN
    ALTER TABLE public.fee_allocations
    ADD CONSTRAINT fk_fee_allocations_distribution
    FOREIGN KEY (distribution_id)
    REFERENCES public.yield_distributions(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

-- Ensure ib_allocations reference valid distributions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_ib_allocations_distribution'
  ) THEN
    ALTER TABLE public.ib_allocations
    ADD CONSTRAINT fk_ib_allocations_distribution
    FOREIGN KEY (distribution_id)
    REFERENCES public.yield_distributions(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

COMMENT ON CONSTRAINT fk_investor_positions_investor ON public.investor_positions IS
'Ensures every position belongs to a valid investor. CASCADE delete orphans positions.';

COMMENT ON CONSTRAINT fk_transactions_v2_fund ON public.transactions_v2 IS
'Ensures every transaction belongs to a valid fund. RESTRICT prevents accidental fund deletion.';
