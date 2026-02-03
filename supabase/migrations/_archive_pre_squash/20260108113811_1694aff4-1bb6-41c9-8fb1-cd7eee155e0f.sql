-- =============================================
-- PHASE 1: Stop Phantom AUM Generation Permanently
-- =============================================

-- 1.1 Drop the carryforward_daily_aum function completely
DROP FUNCTION IF EXISTS carryforward_daily_aum() CASCADE;

-- 1.2 Unschedule any remaining cron jobs for AUM carryforward
DO $$
BEGIN
  -- Try to unschedule by name patterns
  PERFORM cron.unschedule(jobid) 
  FROM cron.job 
  WHERE command ILIKE '%carryforward%' 
     OR command ILIKE '%daily_aum%'
     OR jobname ILIKE '%carryforward%'
     OR jobname ILIKE '%daily-aum%';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Cron unschedule skipped: %', SQLERRM;
END $$;

-- 1.3 Replace validate_transaction_has_aum to ONLY validate, NOT create AUM
CREATE OR REPLACE FUNCTION validate_transaction_has_aum()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for DEPOSIT/WITHDRAWAL transactions
  IF NEW.type NOT IN ('DEPOSIT', 'WITHDRAWAL') THEN 
    RETURN NEW; 
  END IF;
  
  -- Just validate - do NOT create AUM automatically
  -- Admins must create AUM records explicitly via admin UI
  IF NOT EXISTS (
    SELECT 1 FROM fund_daily_aum 
    WHERE fund_id = NEW.fund_id 
      AND aum_date = NEW.tx_date 
      AND purpose = 'transaction' 
      AND is_voided = false
  ) THEN
    -- Log warning but allow transaction to proceed
    RAISE NOTICE 'WARNING: No AUM record exists for fund % on date %. Admin should create one manually.', 
      NEW.fund_id, NEW.tx_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1.4 Create trigger to BLOCK auto-generated AUM sources
CREATE OR REPLACE FUNCTION prevent_auto_aum_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Block known auto-generation sources
  IF NEW.source IN ('daily_carryforward_job', 'auto_carryforward', 'auto_bootstrap') THEN
    RAISE EXCEPTION 'Auto-generated AUM records are disabled. Source "%" is not allowed. Create AUM manually via admin UI.', NEW.source;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_prevent_auto_aum ON fund_daily_aum;

-- Create the blocking trigger
CREATE TRIGGER trg_prevent_auto_aum
BEFORE INSERT ON fund_daily_aum
FOR EACH ROW
EXECUTE FUNCTION prevent_auto_aum_creation();

-- =============================================
-- PHASE 2: Void existing phantom AUM records
-- =============================================

-- Void all AUM records created by auto-generation sources
UPDATE fund_daily_aum 
SET 
  is_voided = true, 
  voided_at = NOW(), 
  void_reason = 'Cleanup: phantom AUM from auto-generation disabled'
WHERE is_voided = false
  AND source IN ('daily_carryforward_job', 'auto_carryforward', 'auto_bootstrap');

-- =============================================
-- PHASE 3: Ensure uniqueness constraint exists
-- =============================================

-- Create unique index if not exists (only one active AUM per fund/date/purpose)
CREATE UNIQUE INDEX IF NOT EXISTS fund_daily_aum_unique_active 
ON fund_daily_aum (fund_id, aum_date, purpose) 
WHERE (is_voided = false);