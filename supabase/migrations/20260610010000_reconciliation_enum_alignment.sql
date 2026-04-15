-- =============================================================================
-- RECONCILIATION: Enum alignment between frontend contract and DB
-- Applied: 2026-04-15
-- =============================================================================

-- E1: tx_type — ensure DUST exists (for yield v5 residual allocations)
-- The DB already has DUST. Verify and add if missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'tx_type'::regtype
      AND enumlabel = 'DUST'
  ) THEN
    ALTER TYPE tx_type ADD VALUE 'DUST';
  END IF;
END $$;

-- E2: fund_status — add 'closed' and 'available' values
-- The DB has: active, inactive, suspended, deprecated, pending
-- The canonical contract needs: active, inactive, closed, available (plus existing)
-- Strategy: ADD the missing values, keep all existing ones

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'fund_status'::regtype
      AND enumlabel = 'closed'
  ) THEN
    ALTER TYPE fund_status ADD VALUE 'closed';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'fund_status'::regtype
      AND enumlabel = 'available'
  ) THEN
    ALTER TYPE fund_status ADD VALUE 'available';
  END IF;
END $$;