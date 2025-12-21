-- ============================================================
-- Migration Part 1: Create enums and add columns
-- ============================================================

-- 1. Create account_type enum
DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('investor', 'ib', 'fees_account');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add account_type column to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type account_type DEFAULT 'investor';

-- 3. Add is_system_account flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_system_account boolean DEFAULT false;

-- 4. Create tx_source enum for transaction origin tracking
DO $$ BEGIN
  CREATE TYPE tx_source AS ENUM (
    'manual_admin',
    'yield_distribution',
    'fee_allocation',
    'ib_allocation',
    'system_bootstrap',
    'investor_wizard'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 5. Add source column to transactions_v2
ALTER TABLE transactions_v2 ADD COLUMN IF NOT EXISTS source tx_source DEFAULT 'manual_admin';
ALTER TABLE transactions_v2 ADD COLUMN IF NOT EXISTS is_system_generated boolean DEFAULT false;

-- 6. Create trigger to enforce fees_account always has fee_percentage = 0
CREATE OR REPLACE FUNCTION enforce_fees_account_zero_fee()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.account_type = 'fees_account' AND COALESCE(NEW.fee_percentage, 0) != 0 THEN
    NEW.fee_percentage := 0;
    RAISE NOTICE 'fees_account fee_percentage forced to 0';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_fees_account_zero_fee ON profiles;
CREATE TRIGGER trg_enforce_fees_account_zero_fee
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION enforce_fees_account_zero_fee();

-- 7. Create trigger to block manual deposits to INDIGO FEES account
CREATE OR REPLACE FUNCTION block_fees_account_manual_deposits()
RETURNS TRIGGER AS $$
DECLARE
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  -- Check if target is the fees account
  IF NEW.investor_id = v_indigo_fees_id THEN
    -- Block DEPOSIT type unless system-generated
    IF NEW.type = 'DEPOSIT' 
       AND NOT COALESCE(NEW.is_system_generated, false)
       AND COALESCE(NEW.source::text, 'manual_admin') NOT IN ('yield_distribution', 'fee_allocation', 'system_bootstrap')
    THEN
      RAISE EXCEPTION 'Manual deposits to INDIGO FEES account are not allowed. Fee credits are system-generated only.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_fees_manual_deposits ON transactions_v2;
CREATE TRIGGER trg_block_fees_manual_deposits
BEFORE INSERT ON transactions_v2
FOR EACH ROW EXECUTE FUNCTION block_fees_account_manual_deposits();

-- 8. Update INDIGO FEES profile with correct settings
UPDATE profiles 
SET 
  account_type = 'fees_account',
  is_system_account = true,
  fee_percentage = 0
WHERE id = '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';

-- 9. Set account_type = 'ib' for all existing IB users
UPDATE profiles p
SET account_type = 'ib'
WHERE EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = p.id AND ur.role = 'ib'
)
AND (p.account_type IS NULL OR p.account_type = 'investor');