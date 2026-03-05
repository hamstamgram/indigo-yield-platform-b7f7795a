-- Migration: Drop duplicate apply_transaction_with_crystallization
-- Date: 2026-03-02
--
-- This removes the older version of the function that had p_fund_id as the first parameter
-- and p_new_total_aum as the 7th parameter, causing an ambiguous function call error in RPC.

DROP FUNCTION IF EXISTS public.apply_transaction_with_crystallization(
  uuid, -- p_fund_id
  uuid, -- p_investor_id
  text, -- p_tx_type
  numeric, -- p_amount
  date, -- p_tx_date
  text, -- p_reference_id
  numeric, -- p_new_total_aum
  uuid, -- p_admin_id
  text, -- p_notes
  public.aum_purpose, -- p_purpose
  uuid -- p_distribution_id
);
