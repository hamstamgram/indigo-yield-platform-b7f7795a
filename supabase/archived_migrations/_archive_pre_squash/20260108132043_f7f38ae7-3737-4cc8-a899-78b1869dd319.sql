-- ============================================================
-- Fix AUM Auto-Generation: Remove position sync trigger
-- ============================================================

-- 1. Drop the problematic trigger that auto-generates AUM on position changes
DROP TRIGGER IF EXISTS trg_sync_nav_on_position ON investor_positions;

-- 2. Drop the associated function
DROP FUNCTION IF EXISTS sync_nav_on_position_change();

-- 3. Update prevent_auto_aum_creation to block position_sync_trigger source
CREATE OR REPLACE FUNCTION prevent_auto_aum_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Block ALL auto-generation sources
  IF NEW.source IN (
    'daily_carryforward_job', 
    'auto_carryforward', 
    'auto_bootstrap',
    'position_sync_trigger',
    'position_sync'
  ) THEN
    RAISE EXCEPTION 'Auto-generated AUM records are disabled. Source "%" is not allowed.', NEW.source;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;