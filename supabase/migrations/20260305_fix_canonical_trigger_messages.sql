-- Migration: Fix stale canonical trigger error messages
-- Date: 2026-03-05
-- Context: Error messages in guard triggers referenced old/dropped function names.
-- Updates 3 trigger functions to name the current canonical RPCs.

BEGIN;

-- 1. transactions_v2 guard: was referencing apply_deposit_with_crystallization,
--    apply_withdrawal_with_crystallization, and the dropped admin_create_transaction.
CREATE OR REPLACE FUNCTION public.enforce_canonical_transaction_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_allowed_types tx_type[] := ARRAY[
    'ADJUSTMENT'::tx_type,
    'FEE_CREDIT'::tx_type,
    'IB_CREDIT'::tx_type,
    'IB_DEBIT'::tx_type,
    'INTERNAL_CREDIT'::tx_type,
    'INTERNAL_WITHDRAWAL'::tx_type
  ];
BEGIN
  IF public.is_canonical_rpc() THEN
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP != 'DELETE' AND NEW.is_system_generated = true THEN
    RETURN NEW;
  END IF;

  IF TG_OP != 'DELETE' AND NEW.type = ANY(v_allowed_types) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'CANONICAL_MUTATION_REQUIRED: Direct % on transactions_v2 is blocked. '
    'Use canonical RPC: apply_transaction_with_crystallization or void_transaction.', TG_OP
    USING HINT = 'Set indigo.canonical_rpc = true via PERFORM set_config(''indigo.canonical_rpc'', ''true'', true) inside your RPC function.',
          ERRCODE = 'P0001';
END;
$$;

-- 2. investor_positions guard: was referencing the old split apply_deposit/withdrawal RPCs.
CREATE OR REPLACE FUNCTION public.enforce_canonical_position_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_canonical_rpc() THEN
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  RAISE EXCEPTION
    'CANONICAL_MUTATION_REQUIRED: Direct % on investor_positions is blocked. '
    'Use canonical RPC: apply_transaction_with_crystallization.', TG_OP
    USING HINT = 'Set indigo.canonical_rpc = true via PERFORM set_config(''indigo.canonical_rpc'', ''true'', true) inside your RPC function.',
          ERRCODE = 'P0001';
END;
$$;

-- 3. yield_distributions guard: was referencing apply_daily_yield_to_fund_v3
--    and apply_yield_correction_v2 (both superseded/dropped).
CREATE OR REPLACE FUNCTION public.enforce_canonical_yield_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_canonical_rpc()
     OR current_setting('indigo.allow_yield_void', true) = 'true' THEN
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  RAISE EXCEPTION
    'CANONICAL_MUTATION_REQUIRED: Direct % on yield_distributions is blocked. '
    'Use canonical RPC: apply_segmented_yield_distribution_v5 or void_yield_distribution.', TG_OP
    USING HINT = 'Set indigo.canonical_rpc = true via PERFORM set_config(''indigo.canonical_rpc'', ''true'', true) inside your RPC function.',
          ERRCODE = 'P0001';
END;
$$;

COMMIT;
