-- Fix approve_and_complete_withdrawal: remove fund_class from INSERT statements
-- The fund_class column has a CHECK constraint requiring asset codes (BTC, ETH, etc.)
-- but the old RPC was inserting v_fund.code (IND-BTC, IND-ETH, etc.) which violated it.
-- All existing transactions have fund_class = NULL, so we just omit it.
-- Also drops the old 4-param overload that conflicted with the 6-param version.

DROP FUNCTION IF EXISTS public.approve_and_complete_withdrawal(uuid, numeric, text, text);

-- The full 6-param version is recreated via CREATE OR REPLACE (omitting fund_class from INSERTs)
