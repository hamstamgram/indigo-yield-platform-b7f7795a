-- Migration: Add cascade void trigger for yield_distributions
-- Date: 2026-02-15
--
-- Problem: When yield_distributions.is_voided is set to true via canonical
-- bypass (direct UPDATE with set_config), allocation tables are not cascaded.
-- The void_yield_distribution RPC handles this, but direct canonical updates
-- can leave orphaned non-voided allocations.
--
-- Fix: Add an AFTER UPDATE trigger on yield_distributions that cascades
-- is_voided = true to yield_allocations, fee_allocations, ib_allocations,
-- and fund_daily_aum when the distribution transitions from not-voided to voided.

-- 1. Create the cascade trigger function
CREATE OR REPLACE FUNCTION cascade_void_to_allocations()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when is_voided transitions from false to true
  IF NEW.is_voided = true AND (OLD.is_voided = false OR OLD.is_voided IS NULL) THEN

    -- Cascade to yield_allocations
    UPDATE yield_allocations
    SET is_voided = true
    WHERE distribution_id = NEW.id
      AND (is_voided = false OR is_voided IS NULL);

    -- Cascade to fee_allocations
    UPDATE fee_allocations
    SET is_voided = true, voided_at = NOW()
    WHERE distribution_id = NEW.id
      AND (is_voided = false OR is_voided IS NULL);

    -- Cascade to ib_allocations
    UPDATE ib_allocations
    SET is_voided = true, voided_at = NOW()
    WHERE distribution_id = NEW.id
      AND (is_voided = false OR is_voided IS NULL);

    -- Void associated fund_daily_aum records
    UPDATE fund_daily_aum
    SET is_voided = true
    WHERE fund_id = NEW.fund_id
      AND aum_date = NEW.period_end
      AND source = 'yield_distribution_v5'
      AND is_voided = false;

  END IF;

  RETURN NEW;
END;
$$;

-- 2. Attach the trigger (drop first if exists)
DROP TRIGGER IF EXISTS trg_cascade_void_to_allocations ON yield_distributions;

CREATE TRIGGER trg_cascade_void_to_allocations
  AFTER UPDATE OF is_voided ON yield_distributions
  FOR EACH ROW
  EXECUTE FUNCTION cascade_void_to_allocations();

-- 3. One-time cleanup: void orphaned yield_allocations linked to voided distributions
DO $$
DECLARE
  v_count int;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  UPDATE yield_allocations ya
  SET is_voided = true
  FROM yield_distributions yd
  WHERE ya.distribution_id = yd.id
    AND yd.is_voided = true
    AND (ya.is_voided = false OR ya.is_voided IS NULL);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Voided % orphaned yield_allocations rows', v_count;
END;
$$;
