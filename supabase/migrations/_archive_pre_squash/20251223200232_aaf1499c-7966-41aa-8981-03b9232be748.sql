-- Fix voided transactions visibility: set visibility_scope to 'admin_only'
-- This ensures voided transactions are never visible to investors
UPDATE transactions_v2 
SET visibility_scope = 'admin_only'
WHERE is_voided = true 
  AND visibility_scope != 'admin_only';

-- Add a trigger to automatically set visibility_scope to admin_only when a transaction is voided
CREATE OR REPLACE FUNCTION public.set_voided_tx_visibility()
RETURNS TRIGGER AS $$
BEGIN
  -- When a transaction is voided, ensure it's hidden from investors
  IF NEW.is_voided = true AND OLD.is_voided = false THEN
    NEW.visibility_scope := 'admin_only';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS tr_set_voided_tx_visibility ON transactions_v2;

-- Create the trigger
CREATE TRIGGER tr_set_voided_tx_visibility
  BEFORE UPDATE ON transactions_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.set_voided_tx_visibility();