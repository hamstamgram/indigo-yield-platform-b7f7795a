-- Migration: V5 yield engine - sync transaction-purpose AUM after reporting yield
-- Date: 2026-02-15
--
-- Problem: V5 only writes AUM for p_purpose (typically 'reporting'). When yield is
-- distributed with purpose='reporting', the transaction-purpose AUM becomes stale
-- (it still holds the pre-yield AUM). This causes fund_aum_mismatch view violations
-- for ETH, EURC, XRP, xAUT funds.
--
-- Fix: After writing reporting-purpose AUM, also write/update transaction-purpose AUM
-- with the same recorded_aum value. This mirrors what V4's yield_aum_sync did.
--
-- Note: This replaces the apply function from 20260214_fix_v5_reconciliation_fees_account.sql
-- Only the AUM recording section changes (lines after "Record AUM" comment).

-- We use a targeted approach: add a second INSERT right after the existing AUM recording.
-- Since the full function is ~700 lines, we CREATE OR REPLACE just the relevant portion
-- by wrapping in a DO block that patches the function.

-- Actually, we need to CREATE OR REPLACE the entire function. Let's extract it from
-- the latest migration and add the transaction-purpose AUM sync.

-- For safety, we only add the transaction-purpose sync as a separate step after yield apply.
-- This avoids modifying the large V5 function and instead uses a post-apply hook.

-- Approach: Create a helper function that the admin UI calls after applying yield.
-- Better approach: Modify the function in place.

-- Since modifying a 700-line function inline is error-prone, we use the targeted approach:
-- Wrap the existing function and add the sync after calling it.

-- Simplest safe approach: Add a trigger on fund_daily_aum that syncs transaction-purpose
-- when a reporting-purpose row is inserted/updated by V5.

CREATE OR REPLACE FUNCTION sync_reporting_aum_to_transaction()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only sync when source is yield_distribution_v5 and purpose is reporting
  IF NEW.purpose = 'reporting' AND NEW.source = 'yield_distribution_v5' AND NEW.is_voided = false THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
    VALUES (NEW.fund_id, NEW.aum_date, NEW.total_aum, 'transaction', 'yield_aum_sync_v5', NEW.created_by, NEW.is_month_end)
    ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
    DO UPDATE SET total_aum = EXCLUDED.total_aum, source = 'yield_aum_sync_v5',
      is_month_end = EXCLUDED.is_month_end, updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_sync_reporting_aum_to_transaction ON fund_daily_aum;

CREATE TRIGGER trg_sync_reporting_aum_to_transaction
  AFTER INSERT OR UPDATE ON fund_daily_aum
  FOR EACH ROW
  WHEN (NEW.purpose = 'reporting' AND NEW.source = 'yield_distribution_v5' AND NEW.is_voided = false)
  EXECUTE FUNCTION sync_reporting_aum_to_transaction();
