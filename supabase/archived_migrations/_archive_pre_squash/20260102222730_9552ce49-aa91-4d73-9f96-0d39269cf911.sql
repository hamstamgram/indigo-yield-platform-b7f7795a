-- =============================================
-- BACKEND CLEANUP MIGRATION (Fixed)
-- Drop trigger first, then function
-- =============================================

-- Drop the trigger that depends on block_fees_account_manual_deposits
DROP TRIGGER IF EXISTS trg_block_fees_manual_deposits ON transactions_v2;

-- Now drop the function
DROP FUNCTION IF EXISTS public.block_fees_account_manual_deposits();