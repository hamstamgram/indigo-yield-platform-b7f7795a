-- Resolve "Could not choose the best candidate function" error
-- The problem arises because there are two versions of approve_and_complete_withdrawal
-- Version A: (p_request_id, p_processed_amount, p_tx_hash, p_admin_notes, p_is_full_exit)
-- Version B: (p_request_id, p_processed_amount, p_tx_hash, p_admin_notes, p_is_full_exit, p_crystallize_days)
-- When calling from TS without the final parameter, PG throws an ambiguous function overload error.
-- To fix this, we drop the version that lacks the p_crystallize_days parameter.

DROP FUNCTION IF EXISTS public.approve_and_complete_withdrawal(
  p_request_id uuid,
  p_processed_amount numeric,
  p_tx_hash text,
  p_admin_notes text,
  p_is_full_exit boolean
);
