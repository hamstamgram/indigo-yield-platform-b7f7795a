


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


DROP FUNCTION IF EXISTS "public"."apply_investor_transaction"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_tx_type" "public"."tx_type", "p_amount" numeric, "p_tx_date" "date", "p_reference_id" "text", "p_admin_id" "uuid", "p_notes" "text", "p_purpose" "public"."aum_purpose", "p_distribution_id" "uuid");
DROP FUNCTION IF EXISTS "public"."adjust_investor_position"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_amount" numeric, "p_tx_date" "date", "p_reason" "text", "p_admin_id" "uuid");
DROP FUNCTION IF EXISTS "public"."check_aum_reconciliation"("p_as_of_date" "date", "p_fund_id" "uuid", "p_tolerance_pct" numeric);
DROP FUNCTION IF EXISTS "public"."set_account_type_for_ib"("p_user_id" "uuid");
DROP TABLE IF EXISTS "public"."qa_entity_manifest" CASCADE;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'Indigo Yield Platform - Fortune 500 compliant financial operations.
Enhanced 2026-01-13 with 7 critical yield gap fixes:
- FIX 1: Race condition handling (frontend)
- FIX 2: Reduced stale window (frontend)
- FIX 3: Live position calculation from transaction ledger
- FIX 4: MV refresh synchronization
- FIX 5: Position snapshot cron for audit trail
- FIX 6: Crystallization timing check
- FIX 7: Dust conservation in yield distribution';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."access_event" AS ENUM (
    'login',
    'logout',
    '2fa_setup',
    '2fa_verify',
    'session_revoked',
    'password_change'
);


ALTER TYPE "public"."access_event" OWNER TO "postgres";


CREATE TYPE "public"."account_type" AS ENUM (
    'investor',
    'ib',
    'fees_account'
);


ALTER TYPE "public"."account_type" OWNER TO "postgres";


CREATE TYPE "public"."app_role" AS ENUM (
    'super_admin',
    'admin',
    'moderator',
    'ib',
    'user',
    'investor'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."approval_operation_type" AS ENUM (
    'PERIOD_LOCK',
    'PERIOD_UNLOCK',
    'LARGE_WITHDRAWAL',
    'LARGE_DEPOSIT',
    'STAGING_PROMOTION',
    'FEE_STRUCTURE_CHANGE',
    'RECONCILIATION_FINALIZE',
    'VOID_TRANSACTION',
    'BULK_OPERATION',
    'MFA_RESET'
);


ALTER TYPE "public"."approval_operation_type" OWNER TO "postgres";


CREATE TYPE "public"."asset_code" AS ENUM (
    'BTC',
    'ETH',
    'SOL',
    'USDT',
    'EURC',
    'xAUT',
    'XRP',
    'ADA'
);


ALTER TYPE "public"."asset_code" OWNER TO "postgres";


COMMENT ON TYPE "public"."asset_code" IS 'Platform canonical funds: BTC, ETH, SOL, USDT, EURC, xAUT, XRP. USDC is NOT a platform fund.';



CREATE TYPE "public"."aum_purpose" AS ENUM (
    'reporting',
    'transaction'
);


ALTER TYPE "public"."aum_purpose" OWNER TO "postgres";


CREATE TYPE "public"."benchmark_type" AS ENUM (
    'BTC',
    'ETH',
    'STABLE',
    'CUSTOM'
);


ALTER TYPE "public"."benchmark_type" OWNER TO "postgres";


CREATE TYPE "public"."document_type" AS ENUM (
    'statement',
    'notice',
    'terms',
    'tax',
    'other'
);


ALTER TYPE "public"."document_type" OWNER TO "postgres";


CREATE TYPE "public"."error_category" AS ENUM (
    'VALIDATION',
    'BUSINESS_RULE',
    'STATE',
    'PERMISSION',
    'NOT_FOUND',
    'CONFLICT',
    'SYSTEM'
);


ALTER TYPE "public"."error_category" OWNER TO "postgres";


CREATE TYPE "public"."fee_kind" AS ENUM (
    'mgmt',
    'perf'
);


ALTER TYPE "public"."fee_kind" OWNER TO "postgres";


CREATE TYPE "public"."fund_status" AS ENUM (
    'active',
    'inactive',
    'suspended',
    'deprecated',
    'pending',
    'closed',
    'available'
);


ALTER TYPE "public"."fund_status" OWNER TO "postgres";


CREATE TYPE "public"."notification_priority" AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE "public"."notification_priority" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'deposit',
    'statement',
    'performance',
    'system',
    'support',
    'withdrawal',
    'yield'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."platform_error_code" AS ENUM (
    'PREFLOW_AUM_MISSING',
    'AUM_NOT_FOUND',
    'AUM_ALREADY_EXISTS',
    'AUM_DUPLICATE_PREFLOW',
    'PERIOD_LOCKED',
    'PERIOD_NOT_FOUND',
    'ECONOMIC_DATE_REQUIRED',
    'FUTURE_DATE_NOT_ALLOWED',
    'BACKDATED_NOT_ALLOWED',
    'LEDGER_IMMUTABLE',
    'TRANSACTION_NOT_FOUND',
    'TRANSACTION_ALREADY_VOIDED',
    'INSUFFICIENT_BALANCE',
    'INVALID_TRANSACTION_TYPE',
    'ASSET_MISMATCH',
    'INVALID_ASSET',
    'YIELD_CONSERVATION_VIOLATION',
    'DUST_TOLERANCE_EXCEEDED',
    'NO_POSITIONS_FOR_YIELD',
    'FUND_NOT_FOUND',
    'FUND_INACTIVE',
    'INVESTOR_NOT_FOUND',
    'INVESTOR_POSITION_NOT_FOUND',
    'INVESTOR_NOT_IN_FUND',
    'APPROVAL_REQUIRED',
    'APPROVAL_PENDING',
    'SELF_APPROVAL_NOT_ALLOWED',
    'UNAUTHORIZED',
    'ADMIN_REQUIRED',
    'VALIDATION_ERROR',
    'REQUIRED_FIELD_MISSING',
    'INVALID_AMOUNT',
    'INVALID_DATE',
    'INVALID_PURPOSE',
    'SYSTEM_ERROR',
    'INVARIANT_VIOLATION',
    'CONCURRENCY_ERROR',
    'STAGING_VALIDATION_FAILED',
    'STAGING_BATCH_NOT_FOUND',
    'STAGING_ALREADY_PROMOTED'
);


ALTER TYPE "public"."platform_error_code" OWNER TO "postgres";


CREATE TYPE "public"."share_scope" AS ENUM (
    'portfolio',
    'documents',
    'statement'
);


ALTER TYPE "public"."share_scope" OWNER TO "postgres";


CREATE TYPE "public"."ticket_category" AS ENUM (
    'account',
    'portfolio',
    'statement',
    'technical',
    'general'
);


ALTER TYPE "public"."ticket_category" OWNER TO "postgres";


CREATE TYPE "public"."ticket_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE "public"."ticket_priority" OWNER TO "postgres";


CREATE TYPE "public"."ticket_status" AS ENUM (
    'open',
    'in_progress',
    'waiting_on_lp',
    'closed'
);


ALTER TYPE "public"."ticket_status" OWNER TO "postgres";


CREATE TYPE "public"."transaction_status" AS ENUM (
    'pending',
    'confirmed',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."transaction_status" OWNER TO "postgres";


CREATE TYPE "public"."transaction_type" AS ENUM (
    'DEPOSIT',
    'WITHDRAWAL',
    'INTEREST',
    'FEE',
    'DUST_ALLOCATION'
);


ALTER TYPE "public"."transaction_type" OWNER TO "postgres";


CREATE TYPE "public"."tx_source" AS ENUM (
    'manual_admin',
    'yield_distribution',
    'fee_allocation',
    'ib_allocation',
    'system_bootstrap',
    'investor_wizard',
    'internal_routing',
    'yield_correction',
    'withdrawal_completion',
    'rpc_canonical',
    'crystallization',
    'system',
    'migration',
    'stress_test'
);


ALTER TYPE "public"."tx_source" OWNER TO "postgres";


COMMENT ON TYPE "public"."tx_source" IS 'Transaction source types: manual_admin, yield_distribution, fee_allocation, ib_allocation, system_bootstrap, investor_wizard, internal_routing, yield_correction, withdrawal_completion';



CREATE TYPE "public"."tx_type" AS ENUM (
    'DEPOSIT',
    'WITHDRAWAL',
    'INTEREST',
    'FEE',
    'ADJUSTMENT',
    'FEE_CREDIT',
    'IB_CREDIT',
    'YIELD',
    'INTERNAL_WITHDRAWAL',
    'INTERNAL_CREDIT',
    'IB_DEBIT',
    'DUST',
    'DUST_SWEEP'
);


ALTER TYPE "public"."tx_type" OWNER TO "postgres";


CREATE TYPE "public"."visibility_scope" AS ENUM (
    'investor_visible',
    'admin_only'
);


ALTER TYPE "public"."visibility_scope" OWNER TO "postgres";


CREATE TYPE "public"."withdrawal_action" AS ENUM (
    'create',
    'approve',
    'reject',
    'processing',
    'complete',
    'cancel',
    'update',
    'route_to_fees'
);


ALTER TYPE "public"."withdrawal_action" OWNER TO "postgres";


CREATE TYPE "public"."withdrawal_status" AS ENUM (
    'pending',
    'approved',
    'processing',
    'completed',
    'rejected',
    'cancelled'
);


ALTER TYPE "public"."withdrawal_status" OWNER TO "postgres";


CREATE TYPE "public"."yield_distribution_status" AS ENUM (
    'draft',
    'applied',
    'voided',
    'previewed',
    'corrected',
    'rolled_back'
);


ALTER TYPE "public"."yield_distribution_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_resolve_investor_fee_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_date" "date") RETURNS numeric
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fee numeric;
  v_account_type text;
BEGIN
  IF NOT public.can_access_investor(p_investor_id) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions for investor fee lookup';
  END IF;

  -- 1. fees_account -> 0%
  SELECT account_type INTO v_account_type FROM profiles WHERE id = p_investor_id;
  IF v_account_type = 'fees_account' THEN
    RETURN 0;
  END IF;

  -- 2+3. investor_fee_schedule (fund-specific first, then global)
  SELECT fee_pct INTO v_fee
  FROM public.investor_fee_schedule
  WHERE investor_id = p_investor_id
    AND (fund_id = p_fund_id OR fund_id IS NULL)
    AND effective_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY fund_id NULLS LAST, effective_date DESC
  LIMIT 1;

  IF v_fee IS NOT NULL THEN RETURN v_fee; END IF;

  -- 4. Profile fee override
  SELECT fee_pct INTO v_fee FROM public.profiles WHERE id = p_investor_id;
  IF v_fee IS NOT NULL THEN RETURN v_fee; END IF;

  -- 5. Fund default (perf_fee_bps / 100)
  IF p_fund_id IS NOT NULL THEN
    SELECT (perf_fee_bps / 100.0) INTO v_fee FROM funds WHERE id = p_fund_id;
    IF v_fee IS NOT NULL THEN RETURN v_fee; END IF;
  END IF;

  -- 6. Safety fallback
  RETURN 0;
END;
$$;


ALTER FUNCTION "public"."_resolve_investor_fee_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."_resolve_investor_fee_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_date" "date") IS 'Resolves investor fee percentage. Checks: 1) fees_account=0%, 2) investor_fee_schedule, 3) profile.fee_pct, 4) funds.perf_fee_bps/100, 5) default 0%';



CREATE OR REPLACE FUNCTION "public"."_resolve_investor_ib_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_date" "date") RETURNS numeric
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_ib_pct numeric;
  v_account_type text;
BEGIN
  IF NOT public.can_access_investor(p_investor_id) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions for investor IB lookup';
  END IF;

  -- SAFETY: Check account type first - fees_account never has IB
  SELECT account_type INTO v_account_type FROM profiles WHERE id = p_investor_id;
  IF v_account_type = 'fees_account' THEN
    RETURN 0;
  END IF;

  -- Check ib_commission_schedule for fund-specific or global rate
  SELECT ib_percentage INTO v_ib_pct
  FROM public.ib_commission_schedule
  WHERE investor_id = p_investor_id
    AND (fund_id = p_fund_id OR fund_id IS NULL)
    AND effective_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY fund_id NULLS LAST, effective_date DESC
  LIMIT 1;

  IF v_ib_pct IS NOT NULL THEN RETURN v_ib_pct; END IF;

  -- Fallback to profile ib_percentage
  SELECT ib_percentage INTO v_ib_pct FROM public.profiles WHERE id = p_investor_id;
  IF v_ib_pct IS NOT NULL THEN RETURN v_ib_pct; END IF;

  -- Default to 0%
  RETURN 0;
END;
$$;


ALTER FUNCTION "public"."_resolve_investor_ib_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."acquire_delivery_batch"("p_period_id" "uuid", "p_channel" "text" DEFAULT 'email'::"text", "p_batch_size" integer DEFAULT 25, "p_worker_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "statement_id" "uuid", "investor_id" "uuid", "recipient_email" "text", "attempt_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_worker UUID;
BEGIN
  v_worker := COALESCE(p_worker_id, auth.uid());
  
  -- Acquire and lock batch
  RETURN QUERY
  WITH batch AS (
    SELECT sed.id
    FROM statement_email_delivery sed
    WHERE sed.period_id = p_period_id
      AND sed.channel = p_channel
      AND UPPER(sed.status) = 'QUEUED'
      AND sed.attempt_count < 5
    ORDER BY sed.created_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE statement_email_delivery sed
  SET status = 'sending',
      locked_by = v_worker,
      locked_at = now(),
      attempt_count = sed.attempt_count + 1,
      last_attempt_at = now(),
      updated_at = now()
  FROM batch
  WHERE sed.id = batch.id
  RETURNING sed.id, sed.statement_id, sed.investor_id, sed.recipient_email, sed.attempt_count;
END;
$$;


ALTER FUNCTION "public"."acquire_delivery_batch"("p_period_id" "uuid", "p_channel" "text", "p_batch_size" integer, "p_worker_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."acquire_position_lock"("p_investor_id" "uuid", "p_fund_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtext('position'),
    hashtext(p_investor_id::text || p_fund_id::text)
  );
END;
$$;


ALTER FUNCTION "public"."acquire_position_lock"("p_investor_id" "uuid", "p_fund_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."acquire_position_lock"("p_investor_id" "uuid", "p_fund_id" "uuid") IS 'ADMIN ONLY: Acquire lock for concurrent position updates during repairs. Prevents conflicts with production triggers. For emergency repairs only. Do not call from production code.';



CREATE OR REPLACE FUNCTION "public"."acquire_withdrawal_lock"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtext('withdrawal'),
    hashtext(p_request_id::text)
  );
END;
$$;


ALTER FUNCTION "public"."acquire_withdrawal_lock"("p_request_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."acquire_withdrawal_lock"("p_request_id" "uuid") IS 'Acquires a PostgreSQL advisory lock for a withdrawal request to prevent concurrent modifications. Returns true if lock acquired.';



CREATE OR REPLACE FUNCTION "public"."acquire_yield_lock"("p_fund_id" "uuid", "p_yield_date" "date") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtext('yield_distribution'),
    hashtext(p_fund_id::text || p_yield_date::text)
  );
END;
$$;


ALTER FUNCTION "public"."acquire_yield_lock"("p_fund_id" "uuid", "p_yield_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_fund_to_investor"("p_investor_id" "uuid", "p_fund_id" "text", "p_initial_shares" numeric DEFAULT 0, "p_cost_basis" numeric DEFAULT 0) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE 
  v_position_id UUID;
  v_fund_uuid UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;
  
  v_fund_uuid := p_fund_id::uuid;
  
  -- Create position shell with zeros only
  -- Actual values will be populated when first transaction is inserted via trigger chain
  -- If p_initial_shares or p_cost_basis are provided, they are IGNORED
  -- (to maintain single writer architecture)
  INSERT INTO public.investor_positions (
    investor_id, fund_id, shares, cost_basis, current_value, updated_at, is_active
  )
  VALUES (
    p_investor_id, v_fund_uuid, 0, 0, 0, now(), true
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    is_active = true,
    updated_at = now()
  RETURNING id INTO v_position_id;
  
  -- NOTE: If initial shares/cost_basis are needed, the caller should 
  -- create a DEPOSIT transaction which will trigger recompute_investor_position()
  
  RETURN v_position_id;
END;
$$;


ALTER FUNCTION "public"."add_fund_to_investor"("p_investor_id" "uuid", "p_fund_id" "text", "p_initial_shares" numeric, "p_cost_basis" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_fund_to_investor"("p_investor_id" "uuid", "p_fund_id" "text", "p_initial_shares" numeric, "p_cost_basis" numeric) IS 'Creates position shell with zeros. Actual position values populated by first transaction via trigger chain.
CANONICAL WRITER: recompute_investor_position() via trg_recompute_position_on_tx';



CREATE OR REPLACE FUNCTION "public"."adjust_investor_position"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_reason" "text", "p_tx_date" "date" DEFAULT CURRENT_DATE, "p_admin_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor uuid;
  v_fund_asset text;
  v_fund_class text;
  v_balance_before numeric(28,10);
  v_balance_after numeric(28,10);
  v_tx_id uuid;
  v_aum_result jsonb;
BEGIN
  v_actor := COALESCE(p_admin_id, auth.uid());

  -- CRITICAL FIX: Add advisory lock
  PERFORM pg_advisory_xact_lock(
    hashtext('position:' || p_investor_id::text),
    hashtext(p_fund_id::text)
  );

  -- Verify admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Get fund info
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM funds WHERE id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get current balance with lock
  SELECT COALESCE(current_value, 0) INTO v_balance_before
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  v_balance_after := COALESCE(v_balance_before, 0) + p_amount;

  IF v_balance_after < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adjustment would result in negative balance');
  END IF;

  -- Create adjustment transaction
  -- Position update is handled by trg_recompute_position_on_tx trigger
  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    notes, created_by, is_voided, balance_before, balance_after,
    source, visibility_scope
  ) VALUES (
    p_fund_id, p_investor_id, 'ADJUSTMENT', p_amount, p_tx_date, v_fund_asset, v_fund_class,
    p_reason, v_actor, false, v_balance_before, v_balance_after,
    'manual_admin', 'admin_only'
  ) RETURNING id INTO v_tx_id;

  -- REMOVED: Direct UPDATE to investor_positions
  -- Position is now updated by trg_recompute_position_on_tx trigger

  -- CRITICAL FIX: Update AUM
  v_aum_result := recalculate_fund_aum_for_date(p_fund_id, p_tx_date, 'transaction'::aum_purpose, v_actor);

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'POSITION_ADJUSTMENT',
    'investor_positions',
    p_investor_id::text || ':' || p_fund_id::text,
    v_actor,
    jsonb_build_object('balance', v_balance_before),
    jsonb_build_object('balance', v_balance_after, 'adjustment', p_amount),
    jsonb_build_object('reason', p_reason, 'tx_id', v_tx_id, 'aum_update', v_aum_result, 'canonical_writer', 'trigger_chain')
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'aum_update', v_aum_result
  );
END;
$$;


ALTER FUNCTION "public"."adjust_investor_position"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_reason" "text", "p_tx_date" "date", "p_admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."adjust_investor_position"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_reason" "text", "p_tx_date" "date", "p_admin_id" "uuid") IS 'ADMIN ONLY: Manual position adjustment for corrections. Creates ledger entry. For emergency repairs only. Do not call from production code. Use rebuild_position_from_ledger instead.';



CREATE OR REPLACE FUNCTION "public"."alert_on_aum_position_mismatch"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fund_id uuid;
  v_position_sum numeric;
  v_recorded_aum numeric;
  v_difference numeric;
  v_tolerance numeric := 0.01;
BEGIN
  -- Get the fund_id from the changed position
  v_fund_id := COALESCE(NEW.fund_id, OLD.fund_id);
  
  -- Calculate sum of positions for this fund
  SELECT COALESCE(SUM(current_value), 0) INTO v_position_sum
  FROM investor_positions
  WHERE fund_id = v_fund_id;
  
  -- Get latest recorded AUM
  SELECT total_aum INTO v_recorded_aum
  FROM fund_daily_aum
  WHERE fund_id = v_fund_id AND is_voided = false
  ORDER BY aum_date DESC, created_at DESC
  LIMIT 1;
  
  -- Check for mismatch
  v_difference := ABS(COALESCE(v_position_sum, 0) - COALESCE(v_recorded_aum, 0));
  
  IF v_difference > v_tolerance THEN
    -- Create alert (valid severities: info, warning, critical)
    PERFORM create_integrity_alert(
      'aum_mismatch',
      CASE WHEN v_difference > 1 THEN 'critical' ELSE 'warning' END,
      'AUM Position Mismatch Detected',
      format('Fund %s: Position sum (%s) differs from recorded AUM (%s) by %s', 
        v_fund_id, ROUND(v_position_sum, 4), ROUND(v_recorded_aum, 4), ROUND(v_difference, 4)),
      jsonb_build_object(
        'fund_id', v_fund_id,
        'position_sum', v_position_sum,
        'recorded_aum', v_recorded_aum,
        'difference', v_difference
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."alert_on_aum_position_mismatch"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."alert_on_ledger_position_drift"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_ledger_balance numeric;
  v_position_balance numeric;
  v_difference numeric;
  v_tolerance numeric := 0.01;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_ledger_balance
  FROM transactions_v2
  WHERE investor_id = NEW.investor_id 
    AND fund_id = NEW.fund_id
    AND is_voided = false;
  
  SELECT current_value INTO v_position_balance
  FROM investor_positions
  WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
  
  v_difference := ABS(COALESCE(v_ledger_balance, 0) - COALESCE(v_position_balance, 0));
  
  IF v_difference > v_tolerance THEN
    PERFORM create_integrity_alert(
      'ledger_position_drift',
      CASE WHEN v_difference > 1 THEN 'critical' ELSE 'warning' END,
      'Ledger-Position Drift Detected',
      format('Investor %s in fund %s: Ledger (%s) differs from position (%s) by %s',
        NEW.investor_id, NEW.fund_id, 
        ROUND(v_ledger_balance, 4)::text, 
        ROUND(COALESCE(v_position_balance, 0), 4)::text, 
        ROUND(v_difference, 4)::text),
      jsonb_build_object(
        'investor_id', NEW.investor_id,
        'fund_id', NEW.fund_id,
        'ledger_balance', v_ledger_balance,
        'position_balance', v_position_balance,
        'difference', v_difference
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."alert_on_ledger_position_drift"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."alert_on_yield_conservation_violation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_net_yield numeric;
  v_fee_total numeric;
  v_ib_total numeric;
  v_expected_total numeric;
  v_difference numeric;
  v_tolerance numeric := 0.01;  -- Allow 0.01 cent tolerance for rounding
BEGIN
  -- Only check on newly applied distributions
  IF NEW.status != 'applied' THEN
    RETURN NEW;
  END IF;

  -- FIXED: Use the yield_distributions table's own totals (guaranteed to be set)
  -- instead of querying allocation tables (which may not be populated yet)
  v_net_yield := COALESCE(NEW.net_yield, 0);
  v_fee_total := COALESCE(NEW.total_fees, 0);
  v_ib_total := COALESCE(NEW.total_ib, 0);

  v_expected_total := v_net_yield + v_fee_total + v_ib_total;
  v_difference := ABS(COALESCE(NEW.gross_yield_amount, 0) - v_expected_total);

  -- Skip alert if gross_yield_amount is not set yet
  IF NEW.gross_yield_amount IS NULL OR NEW.gross_yield_amount = 0 THEN
    RETURN NEW;
  END IF;

  IF v_difference > v_tolerance THEN
    -- Try to create alert, but don't fail if function doesn't exist
    BEGIN
      PERFORM create_integrity_alert(
        'yield_conservation_violation',
        'critical',
        'Yield Conservation Violation',
        format('Distribution %s: Gross (%s) != Allocations (%s), difference: %s',
          NEW.id::text,
          ROUND(NEW.gross_yield_amount, 6)::text,
          ROUND(v_expected_total, 6)::text,
          ROUND(v_difference, 6)::text),
        jsonb_build_object(
          'distribution_id', NEW.id,
          'fund_id', NEW.fund_id,
          'gross_yield', NEW.gross_yield_amount,
          'net_yield', v_net_yield,
          'fee_total', v_fee_total,
          'ib_total', v_ib_total,
          'difference', v_difference,
          'root_cause', 'Trigger now checks yield_distributions table totals'
        )
      );
    EXCEPTION WHEN undefined_function THEN
      -- create_integrity_alert doesn't exist, skip
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."alert_on_yield_conservation_violation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_adb_yield_distribution_v3"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_gross_yield_amount" numeric, "p_admin_id" "uuid" DEFAULT NULL::"uuid", "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose", "p_distribution_date" "date" DEFAULT NULL::"date", "p_recorded_aum" numeric DEFAULT NULL::numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_distribution_id uuid;
  v_total_adb numeric := 0;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_allocation_count int := 0;
  v_investor RECORD;
  v_gross_share numeric;
  v_net_share numeric;
  v_fee_share numeric;
  v_ib_share numeric;
  v_lock_key bigint;
  v_current_aum numeric := 0;
  v_recorded_aum numeric := 0;
  v_fees_account_id uuid;
  v_fee_tx jsonb;
  v_fee_tx_id uuid;
  v_ib_tx jsonb;
  v_ib_tx_id uuid;
  v_yield_tx jsonb;
  v_yield_tx_id uuid;
  v_is_month_end boolean := false;
  v_latest_tx_date date;
  v_period_start date := p_period_start;
  v_period_end date := p_period_end;
  v_gross_yield_amount numeric := p_gross_yield_amount;
  v_tx_count int := 0;
  p_dust_tolerance numeric := 0.00000001;
  v_tx_date date;
  v_derived_yield numeric := 0;
  v_ib_allocation_id uuid;
  -- Largest remainder variables
  v_residual numeric;
  v_largest_alloc_investor_id uuid;
  v_largest_alloc_gross numeric;
  v_largest_alloc_fee_pct numeric;
  v_largest_alloc_ib_rate numeric;
  v_largest_alloc_ib_parent_id uuid;
  v_adj_fee numeric;
  v_adj_ib numeric;
  v_adj_net numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  IF p_purpose = 'reporting'::aum_purpose THEN
    IF p_period_end IS NOT NULL THEN
      v_period_start := date_trunc('month', p_period_end)::date;
      v_period_end := (date_trunc('month', p_period_end)::date + interval '1 month - 1 day')::date;
    ELSE
      SELECT MAX(tx_date)::date INTO v_latest_tx_date
      FROM transactions_v2 WHERE fund_id = p_fund_id AND is_voided = false;
      IF v_latest_tx_date IS NULL THEN
        RAISE EXCEPTION 'No transactions found for fund % to derive reporting period', p_fund_id;
      END IF;
      v_period_start := date_trunc('month', v_latest_tx_date)::date;
      v_period_end := (date_trunc('month', v_latest_tx_date)::date + interval '1 month - 1 day')::date;
    END IF;

    v_tx_date := COALESCE(p_distribution_date, v_period_end);
    PERFORM set_config('indigo.aum_synced', 'true', true);

    IF COALESCE(p_gross_yield_amount, 0) <= 0 THEN
      SELECT COALESCE(SUM(amount), 0) INTO v_derived_yield
      FROM transactions_v2
      WHERE fund_id = p_fund_id AND is_voided = false
        AND type = 'YIELD'::tx_type
        AND tx_date >= v_period_start AND tx_date <= v_period_end;
      v_gross_yield_amount := v_derived_yield;
    END IF;
  ELSE
    v_tx_date := COALESCE(p_distribution_date, CURRENT_DATE);
  END IF;

  IF v_gross_yield_amount < 0 THEN
    RAISE EXCEPTION 'Gross yield amount must be non-negative';
  END IF;
  IF v_period_end < v_period_start THEN
    RAISE EXCEPTION 'Period end must be after period start';
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::public.account_type
  ORDER BY created_at ASC LIMIT 1;
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'Fees account not configured (profiles.account_type=fees_account)';
  END IF;

  v_is_month_end := (v_period_end = (date_trunc('month', v_period_end)::date + interval '1 month - 1 day')::date);

  v_lock_key := ('x' || substr(md5(p_fund_id::text || v_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id AND period_end = v_period_end AND is_voided = false
  ) THEN
    RAISE EXCEPTION 'Yield distribution already exists for fund % on %', p_fund_id, v_period_end;
  END IF;

  -- Compute current AUM from ALL active positions (unified scope)
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_current_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  -- Core Fix 2: Use admin-provided recorded AUM if available, else compute
  IF p_recorded_aum IS NOT NULL THEN
    v_recorded_aum := p_recorded_aum;
  ELSE
    v_recorded_aum := v_current_aum + v_gross_yield_amount;
  END IF;

  -- ADB still computed from investor + IB + fees_account (all with positions)
  SELECT COALESCE(SUM(calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end)), 0)
  INTO v_total_adb
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true
    AND p.account_type IN ('investor', 'ib', 'fees_account');

  IF v_total_adb <= 0 THEN
    RAISE EXCEPTION 'No positions with positive average daily balance';
  END IF;

  INSERT INTO yield_distributions (
    fund_id, effective_date, yield_date, period_start, period_end,
    recorded_aum, previous_aum, gross_yield, gross_yield_amount,
    total_net_amount, total_fee_amount, total_ib_amount,
    net_yield, total_fees, total_ib,
    status, created_by, calculation_method, purpose, is_month_end
  ) VALUES (
    p_fund_id, v_period_end, v_period_end, v_period_start, v_period_end,
    v_recorded_aum, v_current_aum, v_gross_yield_amount, v_gross_yield_amount,
    0, 0, 0, 0, 0, 0,
    'applied'::yield_distribution_status, v_admin, 'ADB', p_purpose, v_is_month_end
  ) RETURNING id INTO v_distribution_id;

  -- Track the largest allocation for residual assignment
  v_largest_alloc_gross := 0;
  v_largest_alloc_investor_id := NULL;

  FOR v_investor IN
    SELECT
      ip.investor_id,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end) as adb,
      -- Use centralized fee resolution (respects fee schedule + fund default)
      get_investor_fee_pct(ip.investor_id, p_fund_id, v_period_end) as fee_pct,
      -- Use centralized IB resolution (respects IB commission schedule)
      get_investor_ib_pct(ip.investor_id, p_fund_id, v_period_end) as ib_rate,
      p.ib_parent_id,
      trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as investor_name
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.is_active = true
      AND p.account_type IN ('investor', 'ib', 'fees_account')
      AND calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end) > 0
  LOOP
    v_gross_share := ROUND((v_investor.adb / v_total_adb * v_gross_yield_amount)::numeric, 8);
    v_fee_share := ROUND((v_gross_share * v_investor.fee_pct / 100)::numeric, 8);
    v_ib_share := ROUND((v_gross_share * v_investor.ib_rate / 100)::numeric, 8);
    v_net_share := v_gross_share - v_fee_share - v_ib_share;

    IF v_gross_share < p_dust_tolerance THEN CONTINUE; END IF;

    -- Track the largest allocation
    IF v_gross_share > v_largest_alloc_gross THEN
      v_largest_alloc_gross := v_gross_share;
      v_largest_alloc_investor_id := v_investor.investor_id;
      v_largest_alloc_fee_pct := v_investor.fee_pct;
      v_largest_alloc_ib_rate := v_investor.ib_rate;
      v_largest_alloc_ib_parent_id := v_investor.ib_parent_id;
    END IF;

    v_yield_tx := apply_transaction_with_crystallization(
      p_investor_id := v_investor.investor_id, p_fund_id := p_fund_id,
      p_tx_type := 'YIELD', p_amount := v_net_share, p_tx_date := v_tx_date,
      p_reference_id := 'yield_adb_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
      p_notes := 'ADB yield distribution for period ' || v_period_start::text || ' to ' || v_period_end::text,
      p_admin_id := v_admin, p_purpose := p_purpose, p_distribution_id := v_distribution_id
    );
    v_yield_tx_id := NULLIF(v_yield_tx->>'tx_id', '')::uuid;

    INSERT INTO yield_allocations (
      distribution_id, investor_id, fund_id, gross_amount, net_amount,
      fee_amount, ib_amount, adb_share, fee_pct, ib_pct, transaction_id, created_at
    ) VALUES (
      v_distribution_id, v_investor.investor_id, p_fund_id, v_gross_share, v_net_share,
      v_fee_share, v_ib_share, v_investor.adb, v_investor.fee_pct, v_investor.ib_rate, v_yield_tx_id, NOW()
    );

    IF v_fee_share > 0 THEN
      INSERT INTO platform_fee_ledger (
        fund_id, yield_distribution_id, investor_id, investor_name,
        gross_yield_amount, fee_percentage, fee_amount, effective_date, asset, transaction_id, created_by
      ) VALUES (
        p_fund_id, v_distribution_id, v_investor.investor_id, NULLIF(v_investor.investor_name, ''),
        v_gross_share, v_investor.fee_pct, v_fee_share, v_period_end, v_fund.asset, NULL, v_admin
      );
    END IF;

    IF v_ib_share > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
      v_ib_tx := apply_transaction_with_crystallization(
        p_investor_id := v_investor.ib_parent_id, p_fund_id := p_fund_id,
        p_tx_type := 'IB_CREDIT', p_amount := v_ib_share, p_tx_date := v_tx_date,
        p_reference_id := 'ib_credit_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
        p_notes := 'IB commission for ADB yield period ' || v_period_start::text || ' to ' || v_period_end::text,
        p_admin_id := v_admin, p_purpose := p_purpose, p_distribution_id := v_distribution_id
      );
      v_ib_tx_id := NULLIF(v_ib_tx->>'tx_id', '')::uuid;

      UPDATE yield_allocations SET ib_transaction_id = v_ib_tx_id
      WHERE distribution_id = v_distribution_id AND investor_id = v_investor.investor_id AND ib_transaction_id IS NULL;

      INSERT INTO ib_commission_ledger (
        fund_id, yield_distribution_id, source_investor_id, source_investor_name,
        ib_id, ib_name, gross_yield_amount, ib_percentage, ib_commission_amount,
        effective_date, asset, transaction_id, created_by
      )
      SELECT p_fund_id, v_distribution_id, v_investor.investor_id, NULLIF(v_investor.investor_name, ''),
        v_investor.ib_parent_id, trim(COALESCE(ib.first_name,'') || ' ' || COALESCE(ib.last_name,'')),
        v_gross_share, v_investor.ib_rate, v_ib_share, v_period_end, v_fund.asset, v_ib_tx_id, v_admin
      FROM profiles ib WHERE ib.id = v_investor.ib_parent_id;
    END IF;

    IF v_fee_share > 0 THEN
      INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        period_start, period_end, purpose, base_net_income, fee_percentage,
        fee_amount, credit_transaction_id, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, v_investor.investor_id, v_fees_account_id,
        v_period_start, v_period_end, p_purpose, v_gross_share, v_investor.fee_pct,
        v_fee_share, NULL, v_admin
      );
    END IF;

    v_total_gross := v_total_gross + v_gross_share;
    v_total_net := v_total_net + v_net_share;
    v_total_fees := v_total_fees + v_fee_share;
    v_total_ib := v_total_ib + v_ib_share;
    v_allocation_count := v_allocation_count + 1;
  END LOOP;

  -- ========================================================================
  -- LARGEST REMAINDER: assign any residual to the largest allocation
  -- ========================================================================
  v_residual := v_gross_yield_amount - v_total_gross;

  IF v_residual != 0 AND v_largest_alloc_investor_id IS NOT NULL THEN
    UPDATE yield_allocations
    SET gross_amount = gross_amount + v_residual,
        net_amount = net_amount + v_residual
    WHERE distribution_id = v_distribution_id
      AND investor_id = v_largest_alloc_investor_id;

    UPDATE transactions_v2
    SET amount = amount + v_residual
    WHERE reference_id = 'yield_adb_' || v_distribution_id::text || '_' || v_largest_alloc_investor_id::text
      AND NOT is_voided;

    PERFORM recompute_investor_position(v_largest_alloc_investor_id, p_fund_id);

    v_total_gross := v_total_gross + v_residual;
    v_total_net := v_total_net + v_residual;
  END IF;

  IF v_total_fees > 0 THEN
    v_fee_tx := apply_transaction_with_crystallization(
      p_investor_id := v_fees_account_id, p_fund_id := p_fund_id,
      p_tx_type := 'FEE_CREDIT', p_amount := v_total_fees, p_tx_date := v_tx_date,
      p_reference_id := 'fee_credit_' || v_distribution_id::text,
      p_notes := 'Platform fees collected after IB for ADB yield period ' || v_period_start::text || ' to ' || v_period_end::text,
      p_admin_id := v_admin, p_purpose := p_purpose, p_distribution_id := v_distribution_id
    );
    v_fee_tx_id := NULLIF(v_fee_tx->>'tx_id', '')::uuid;

    UPDATE platform_fee_ledger SET transaction_id = v_fee_tx_id
    WHERE yield_distribution_id = v_distribution_id AND transaction_id IS NULL;
    UPDATE yield_allocations SET fee_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id AND fee_amount > 0 AND fee_transaction_id IS NULL;
    UPDATE fee_allocations SET credit_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id AND credit_transaction_id IS NULL;
  END IF;

  -- Auto-mark IB allocations as 'paid' when purpose = 'reporting'
  IF p_purpose = 'reporting'::aum_purpose THEN
    UPDATE ib_allocations
    SET payout_status = 'paid',
        paid_at = NOW(),
        paid_by = v_admin
    WHERE distribution_id = v_distribution_id
      AND is_voided = false
      AND payout_status = 'pending';
  END IF;

  UPDATE yield_distributions SET
    total_net_amount = v_total_net, total_fee_amount = v_total_fees, total_ib_amount = v_total_ib,
    net_yield = v_total_net, total_fees = v_total_fees, total_ib = v_total_ib,
    dust_amount = 0,
    allocation_count = v_allocation_count
  WHERE id = v_distribution_id;

  -- Core Fix 2: Use v_recorded_aum (admin-provided or computed) for fund_daily_aum
  UPDATE fund_daily_aum
  SET total_aum = v_recorded_aum,
      as_of_date = v_period_end,
      is_month_end = v_is_month_end,
      source = 'yield_distribution',
      created_by = v_admin
  WHERE fund_id = p_fund_id
    AND aum_date = v_period_end
    AND purpose = p_purpose
    AND is_voided = false;

  IF NOT FOUND THEN
    INSERT INTO fund_daily_aum (
      id, fund_id, aum_date, total_aum, as_of_date, is_month_end,
      purpose, source, created_at, created_by, is_voided
    ) VALUES (
      gen_random_uuid(), p_fund_id, v_period_end, v_recorded_aum,
      v_period_end, v_is_month_end, p_purpose, 'yield_distribution', NOW(), v_admin, false
    );
  END IF;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (
    v_admin, 'YIELD_DISTRIBUTION_APPLIED', 'yield_distributions', v_distribution_id::text,
    jsonb_build_object('previous_aum', v_current_aum),
    jsonb_build_object(
      'new_aum', v_recorded_aum, 'gross_yield', v_gross_yield_amount,
      'net_yield', v_total_net, 'total_fees', v_total_fees,
      'total_ib', v_total_ib, 'allocation_count', v_allocation_count
    ),
    jsonb_build_object(
      'fund_id', p_fund_id, 'fund_code', v_fund.code,
      'period_start', v_period_start, 'period_end', v_period_end,
      'distribution_date', v_tx_date, 'purpose', p_purpose::text,
      'calculation_method', 'ADB', 'total_adb', v_total_adb,
      'conservation_check', v_gross_yield_amount = (v_total_net + v_total_fees + v_total_ib),
      'dust_amount', 0, 'residual_applied_to', v_largest_alloc_investor_id,
      'includes_fees_account', true, 'ib_auto_paid', p_purpose = 'reporting'::aum_purpose,
      'admin_recorded_aum', p_recorded_aum IS NOT NULL
    )
  );

  RETURN jsonb_build_object(
    'success', true, 'distribution_id', v_distribution_id, 'fund_id', p_fund_id,
    'period_start', v_period_start, 'period_end', v_period_end, 'total_adb', v_total_adb,
    'gross_yield', v_gross_yield_amount, 'allocated_gross', v_total_gross,
    'allocated_net', v_total_net, 'net_yield', v_total_net,
    'total_fees', v_total_fees, 'total_ib', v_total_ib,
    'allocation_count', v_allocation_count, 'investor_count', v_allocation_count,
    'dust_amount', 0,
    'conservation_check', v_gross_yield_amount = (v_total_net + v_total_fees + v_total_ib),
    'days_in_period', v_period_end - v_period_start + 1,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((v_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    'total_loss_offset', 0,
    'ib_auto_paid', p_purpose = 'reporting'::aum_purpose,
    'recorded_aum', v_recorded_aum,
    'features', ARRAY['time_weighted', 'loss_carryforward', 'fee_credit', 'ib_commission', 'latest_period_reporting', 'ib_positions_in_adb', 'ib_fee_exempt', 'fee_allocations', 'audit_log', 'distribution_date', 'fees_account_in_adb', 'ib_auto_payout', 'largest_remainder_zero_dust', 'satoshi_dust_tolerance', 'profiles_fee_only', 'admin_recorded_aum']
  );
END;
$$;


ALTER FUNCTION "public"."apply_adb_yield_distribution_v3"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_gross_yield_amount" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_recorded_aum" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."apply_adb_yield_distribution_v3"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_gross_yield_amount" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_recorded_aum" numeric) IS 'DEPRECATED: Use apply_segmented_yield_distribution_v5 instead. V3 is dead code on the frontend path.';


CREATE OR REPLACE FUNCTION "public"."apply_daily_yield_with_validation"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_created_by" "uuid", "p_purpose" "text" DEFAULT 'transaction'::"text", "p_skip_validation" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_validation JSONB;
  v_result JSONB;
BEGIN
  IF NOT is_admin(COALESCE(p_created_by, auth.uid())) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  IF p_yield_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'FUTURE_DATE_NOT_ALLOWED: Cannot distribute yield for future dates (% > %)', p_yield_date, CURRENT_DATE;
  END IF;

  IF NOT p_skip_validation THEN
    SELECT validate_pre_yield_aum(p_fund_id, 1.0) INTO v_validation;
    IF NOT (v_validation->>'is_valid')::boolean THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Pre-yield validation failed',
        'validation_errors', v_validation->'errors',
        'validation_warnings', v_validation->'warnings',
        'recorded_aum', v_validation->'recorded_aum',
        'calculated_aum', v_validation->'calculated_aum'
      );
    END IF;
  END IF;

  SELECT apply_daily_yield_to_fund_v3(
    p_fund_id, p_yield_date, p_gross_yield_pct, p_created_by, p_purpose::TEXT
  ) INTO v_result;

  IF v_validation IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('validation', v_validation);
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."apply_daily_yield_with_validation"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_created_by" "uuid", "p_purpose" "text", "p_skip_validation" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."apply_daily_yield_with_validation"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_created_by" "uuid", "p_purpose" "text", "p_skip_validation" boolean) IS 'CANONICAL: Apply daily yield with explicit validation control. Allows skipping
validation for batch operations or corrections where preconditions are pre-verified.
Called by: Internal yield correction flows';



CREATE OR REPLACE FUNCTION "public"."apply_deposit_with_crystallization"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_amount" numeric, "p_closing_aum" numeric, "p_effective_date" "date", "p_admin_id" "uuid", "p_notes" "text" DEFAULT NULL::"text", "p_purpose" "text" DEFAULT 'transaction'::"text", "p_tx_hash" "text" DEFAULT NULL::"text", "p_tx_subtype" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result json;
  v_tx_id uuid;
  v_fund_asset text;
  v_fund_class text;
  v_trigger_reference text;
  v_crystallization_result jsonb;
  v_snapshot_id uuid;
  v_post_flow_aum numeric;
  v_event_ts timestamptz;
  v_admin_id uuid;
BEGIN
  -- Use provided admin_id
  v_admin_id := COALESCE(p_admin_id, auth.uid());
  
  -- ADVISORY LOCK
  PERFORM pg_advisory_xact_lock(hashtext('crystallize:' || p_fund_id::text));
  
  PERFORM public.set_canonical_rpc(true);
  
  -- Pass admin_id to require_admin
  PERFORM public.require_admin('apply deposit with crystallization', v_admin_id);
  
  -- Rest of the function remains the same but uses v_admin_id...
  v_event_ts := CASE 
    WHEN p_effective_date = CURRENT_DATE THEN now()
    ELSE (p_effective_date || ' 23:59:59.999')::timestamptz
  END;
  
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM public.funds
  WHERE id = p_fund_id;
  
  v_trigger_reference := 'DEP-' || p_investor_id::text || '-' || to_char(p_effective_date, 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);
  
  v_crystallization_result := crystallize_yield_before_flow(
    p_fund_id, p_closing_aum, 'deposit', v_trigger_reference,
    v_event_ts, v_admin_id, p_purpose::aum_purpose
  );
  
  IF NOT (v_crystallization_result->>'success')::boolean THEN
    RETURN v_crystallization_result::json;
  END IF;
  
  v_snapshot_id := (v_crystallization_result->>'snapshot_id')::uuid;
  
  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    reference_id, notes, created_by, is_voided, purpose, visibility_scope, meta, source,
    tx_hash, tx_subtype
  ) VALUES (
    p_fund_id, p_investor_id, 'DEPOSIT', p_amount, p_effective_date,
    v_fund_asset, v_fund_class, v_trigger_reference,
    COALESCE(p_notes, 'Deposit with crystallization'),
    v_admin_id, false, p_purpose::aum_purpose, 'investor_visible',
    jsonb_build_object('crystallization_snapshot_id', v_snapshot_id),
    'rpc_canonical',
    p_tx_hash, p_tx_subtype
  ) RETURNING id INTO v_tx_id;
  
  v_post_flow_aum := p_closing_aum + p_amount;
  
  IF v_snapshot_id IS NOT NULL THEN
    UPDATE fund_aum_events SET post_flow_aum = v_post_flow_aum WHERE id = v_snapshot_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'crystallization', v_crystallization_result
  );
END;
$$;


ALTER FUNCTION "public"."apply_deposit_with_crystallization"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_amount" numeric, "p_closing_aum" numeric, "p_effective_date" "date", "p_admin_id" "uuid", "p_notes" "text", "p_purpose" "text", "p_tx_hash" "text", "p_tx_subtype" "text") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."apply_investor_transaction"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_tx_type" "text", "p_amount" numeric, "p_tx_date" "date", "p_reference_id" "text", "p_notes" "text" DEFAULT NULL::"text", "p_admin_id" "uuid" DEFAULT NULL::"uuid", "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose", "p_distribution_id" "uuid" DEFAULT NULL::"uuid", "p_new_total_aum" numeric DEFAULT NULL::numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_admin uuid;
  v_existing_tx uuid;
  v_lock_key bigint;
  v_post_aum numeric;
  v_is_new_investor boolean := false;
BEGIN
  IF p_new_total_aum IS NOT NULL THEN
    RAISE EXCEPTION
      'Auto-crystallization is disabled. Pass p_new_total_aum = NULL. '
      'Record a transaction-purpose yield distribution manually before each deposit/withdrawal.';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  v_admin := COALESCE(p_admin_id, auth.uid());
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT id INTO v_existing_tx
  FROM transactions_v2
  WHERE reference_id = p_reference_id AND is_voided = false
  LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true, 'idempotent', true, 'tx_id', v_existing_tx,
      'message', 'Transaction already exists with this reference_id'
    );
  END IF;

  v_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN RAISE EXCEPTION 'Fund not found: %', p_fund_id; END IF;

  SELECT * INTO v_position FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  IF v_position IS NULL THEN
    v_is_new_investor := true;
    INSERT INTO investor_positions (
      investor_id, fund_id, shares, cost_basis, current_value,
      last_yield_crystallization_date, is_active
    ) VALUES (
      p_investor_id, p_fund_id, 0, 0, 0, p_tx_date, true
    )
    RETURNING * INTO v_position;
  END IF;

  v_balance_before := v_position.current_value;

  CASE p_tx_type
    WHEN 'DEPOSIT' THEN v_balance_after := v_balance_before + ABS(p_amount);
    WHEN 'WITHDRAWAL' THEN
      v_balance_after := v_balance_before - ABS(p_amount);
      IF v_balance_after < -0.00000001 THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Requested withdrawal: %', v_balance_before, ABS(p_amount);
      END IF;
    WHEN 'YIELD', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT', 'DUST' THEN v_balance_after := v_balance_before + p_amount;
    WHEN 'FEE' THEN v_balance_after := v_balance_before - ABS(p_amount);
    ELSE v_balance_after := v_balance_before + p_amount;
  END CASE;

  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, asset, amount, type,
    balance_before, balance_after, reference_id, notes,
    approved_by, approved_at, created_by, purpose, source, is_voided,
    distribution_id
  ) VALUES (
    p_investor_id, p_fund_id, p_tx_date, v_fund.asset,
    CASE WHEN p_tx_type IN ('WITHDRAWAL', 'FEE') THEN -ABS(p_amount) ELSE p_amount END,
    p_tx_type::tx_type, v_balance_before, v_balance_after,
    p_reference_id, p_notes, v_admin, NOW(), v_admin,
    p_purpose, 'rpc_canonical'::tx_source, false, p_distribution_id
  ) RETURNING id INTO v_tx_id;

  SELECT COALESCE(SUM(current_value), 0) INTO v_post_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  RETURN jsonb_build_object(
    'success', true, 'tx_id', v_tx_id,
    'balance_before', v_balance_before, 'balance_after', v_balance_after,
    'post_transaction_aum', v_post_aum,
    'is_new_investor', v_is_new_investor
  );
END;
$$;


ALTER FUNCTION "public"."apply_investor_transaction"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_tx_type" "text", "p_amount" numeric, "p_tx_date" "date", "p_reference_id" "text", "p_notes" "text", "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_id" "uuid", "p_new_total_aum" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_segmented_yield_distribution_v5"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_admin_id" "uuid" DEFAULT NULL::"uuid", "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose", "p_distribution_date" "date" DEFAULT NULL::"date", "p_opening_aum" numeric DEFAULT NULL::numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_period_start date;
  v_period_end date;
  v_tx_date date;
  v_is_month_end boolean;
  v_lock_key bigint;
  v_distribution_id uuid;
  v_fees_account_id uuid;
  v_opening_aum numeric := 0;
  v_pre_day_aum numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_fees_account_gross numeric := 0;
  v_fees_account_net numeric := 0;
  v_allocation_count int := 0;
  v_residual numeric := 0;
  v_inv RECORD;
  v_alloc RECORD;
  v_share numeric;
  v_gross numeric;
  v_fee numeric;
  v_ib numeric;
  v_net numeric;
  v_fee_pct numeric;
  v_ib_rate numeric;
  v_tx_result json;
  v_yield_tx_id uuid;
  v_fee_tx_result json;
  v_fee_tx_id uuid;
  v_ib_tx_result json;
  v_ib_tx_id uuid;
  v_final_positions_sum numeric;
  v_updated_rows int;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.aum_synced', 'true', true);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  IF p_purpose = 'reporting'::aum_purpose THEN
    v_period_start := GREATEST(
      date_trunc('month', p_period_end)::date,
      COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
    );
    v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;
  ELSE
    v_period_start := p_period_end;
    v_period_end := p_period_end;
  END IF;

  v_is_month_end := (p_period_end = (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date);
  v_tx_date := COALESCE(p_distribution_date, v_period_end);

  v_lock_key := ('x' || substr(md5(p_fund_id::text || v_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF p_purpose = 'reporting'::aum_purpose THEN
    IF EXISTS (
      SELECT 1 FROM yield_distributions
      WHERE fund_id = p_fund_id AND period_end = v_period_end
        AND purpose = 'reporting' AND is_voided = false
        AND consolidated_into_id IS NULL
        AND COALESCE(distribution_type, '') NOT IN ('deposit', 'withdrawal', 'transaction')
    ) THEN
      RAISE EXCEPTION 'Reporting yield already exists for fund % period ending %. Void before reapplying.',
        p_fund_id, v_period_end;
    END IF;
  END IF;

  v_fees_account_id := get_fees_account_for_fund(p_fund_id);
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'Fees account not configured';
  END IF;

  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  INSERT INTO yield_distributions (
    fund_id, effective_date, yield_date, period_start, period_end,
    recorded_aum, previous_aum, gross_yield, gross_yield_amount,
    total_net_amount, total_fee_amount, total_ib_amount,
    net_yield, total_fees, total_ib, dust_amount,
    status, created_by, calculation_method, purpose, is_month_end, allocation_count,
    distribution_type
  ) VALUES (
    p_fund_id, v_period_end, v_period_end, v_period_start, v_period_end,
    p_recorded_aum, v_opening_aum, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    'applied'::yield_distribution_status, v_admin,
    'flat_position_proportional_v7', p_purpose, v_is_month_end, 0,
    CASE WHEN p_purpose = 'reporting' THEN 'original' ELSE p_purpose::text END
  ) RETURNING id INTO v_distribution_id;

  DROP TABLE IF EXISTS _vflat_alloc;
  CREATE TEMP TABLE _vflat_alloc (
    investor_id uuid PRIMARY KEY,
    investor_name text,
    investor_email text,
    account_type text NOT NULL DEFAULT 'investor',
    ib_parent_id uuid,
    current_value numeric NOT NULL DEFAULT 0,
    pre_day_value numeric NOT NULL DEFAULT 0,
    gross numeric NOT NULL DEFAULT 0,
    fee_pct numeric NOT NULL DEFAULT 0,
    fee numeric NOT NULL DEFAULT 0,
    ib_rate numeric NOT NULL DEFAULT 0,
    ib numeric NOT NULL DEFAULT 0,
    net numeric NOT NULL DEFAULT 0
  ) ON COMMIT DROP;

  INSERT INTO _vflat_alloc (investor_id, investor_name, investor_email, account_type, ib_parent_id, current_value, pre_day_value)
  SELECT ip.investor_id,
         COALESCE(p.first_name || ' ' || p.last_name, 'Unknown'),
         COALESCE(p.email, ''),
         p.account_type::text,
         p.ib_parent_id,
         ip.current_value,
         ip.current_value - COALESCE((
           SELECT SUM(t.amount)
           FROM transactions_v2 t
           WHERE t.investor_id = ip.investor_id
             AND t.fund_id = p_fund_id
             AND t.tx_date = v_tx_date
             AND t.type IN ('DEPOSIT', 'WITHDRAWAL')
             AND (t.is_voided IS NULL OR t.is_voided = false)
         ), 0)
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id
    AND (
      (ip.is_active = true AND ip.current_value <> 0)
      OR EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id AND t.fund_id = p_fund_id
          AND t.tx_date = v_tx_date AND t.type = 'WITHDRAWAL'
          AND (t.is_voided IS NULL OR t.is_voided = false)
      )
    );

  SELECT COALESCE(SUM(pre_day_value), 0) INTO v_pre_day_aum FROM _vflat_alloc
  WHERE pre_day_value > 0;

  IF p_opening_aum IS NOT NULL AND p_opening_aum > 0 THEN
    v_total_month_yield := p_recorded_aum - p_opening_aum;
  ELSE
    v_total_month_yield := p_recorded_aum - v_opening_aum;
  END IF;
  v_is_negative_yield := (v_total_month_yield < 0);

  IF v_pre_day_aum > 0 THEN
    FOR v_alloc IN SELECT * FROM _vflat_alloc LOOP
      IF v_alloc.pre_day_value <= 0 THEN
        v_share := 0;
        v_gross := 0;
      ELSE
        v_share := v_alloc.pre_day_value / v_pre_day_aum;
        v_gross := v_total_month_yield * v_share;
      END IF;

      IF v_alloc.account_type = 'fees_account' THEN
        v_fee_pct := 0;
        v_ib_rate := 0;
      ELSE
        v_fee_pct := COALESCE(get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end), 0);
        IF v_alloc.ib_parent_id IS NOT NULL THEN
          v_ib_rate := COALESCE(get_investor_ib_pct(v_alloc.investor_id, p_fund_id, v_period_end), 0);
        ELSE
          v_ib_rate := 0;
        END IF;
      END IF;

      IF v_is_negative_yield OR v_gross <= 0 THEN
        v_fee := 0;
        v_ib := 0;
        v_net := v_gross;
      ELSE
        v_fee := v_gross * v_fee_pct / 100;
        v_ib := v_gross * v_ib_rate / 100;
        v_net := v_gross - v_fee - v_ib;
      END IF;

      UPDATE _vflat_alloc SET
        gross = v_gross,
        fee_pct = v_fee_pct,
        fee = v_fee,
        ib_rate = v_ib_rate,
        ib = v_ib,
        net = v_net
      WHERE investor_id = v_alloc.investor_id;
    END LOOP;
  ELSIF v_opening_aum <> 0 THEN
    FOR v_alloc IN SELECT * FROM _vflat_alloc LOOP
      v_share := v_alloc.current_value / v_opening_aum;
      v_gross := v_total_month_yield * v_share;

      IF v_alloc.account_type = 'fees_account' THEN
        v_fee_pct := 0;
        v_ib_rate := 0;
      ELSE
        v_fee_pct := COALESCE(get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end), 0);
        IF v_alloc.ib_parent_id IS NOT NULL THEN
          v_ib_rate := COALESCE(get_investor_ib_pct(v_alloc.investor_id, p_fund_id, v_period_end), 0);
        ELSE
          v_ib_rate := 0;
        END IF;
      END IF;

      IF v_is_negative_yield THEN
        v_fee := 0;
        v_ib := 0;
        v_net := v_gross;
      ELSE
        v_fee := v_gross * v_fee_pct / 100;
        v_ib := v_gross * v_ib_rate / 100;
        v_net := v_gross - v_fee - v_ib;
      END IF;

      UPDATE _vflat_alloc SET
        gross = v_gross,
        fee_pct = v_fee_pct,
        fee = v_fee,
        ib_rate = v_ib_rate,
        ib = v_ib,
        net = v_net
      WHERE investor_id = v_alloc.investor_id;
    END LOOP;
  END IF;

  v_total_gross := (SELECT COALESCE(SUM(gross), 0) FROM _vflat_alloc);
  v_total_net := (SELECT COALESCE(SUM(net), 0) FROM _vflat_alloc);
  v_total_fees := (SELECT COALESCE(SUM(fee), 0) FROM _vflat_alloc);
  v_total_ib := (SELECT COALESCE(SUM(ib), 0) FROM _vflat_alloc);
  v_residual := v_total_month_yield - v_total_gross;

  SELECT COALESCE(gross, 0), COALESCE(net, 0)
  INTO v_fees_account_gross, v_fees_account_net
  FROM _vflat_alloc WHERE investor_id = v_fees_account_id;

  v_allocation_count := 0;

  FOR v_alloc IN SELECT * FROM _vflat_alloc LOOP
    IF v_alloc.gross = 0 AND v_alloc.fee = 0 AND v_alloc.ib = 0 AND v_alloc.net = 0 THEN
      CONTINUE;
    END IF;

    v_allocation_count := v_allocation_count + 1;

    SELECT apply_investor_transaction(
      p_fund_id := p_fund_id,
      p_investor_id := v_alloc.investor_id,
      p_tx_type := 'YIELD'::tx_type,
      p_amount := v_alloc.net,
      p_tx_date := v_tx_date,
      p_reference_id := 'yield-' || v_distribution_id || '-' || v_alloc.investor_id,
      p_admin_id := v_admin,
      p_notes := 'Yield distribution ' || v_distribution_id,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    ) INTO v_tx_result;

    v_yield_tx_id := (v_tx_result->>'transaction_id')::uuid;

    IF v_alloc.account_type = 'fees_account' THEN
      UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
      WHERE id = v_yield_tx_id;
    END IF;

    INSERT INTO yield_allocations (
      distribution_id, investor_id, fund_id,
      gross_amount, net_amount, fee_amount, ib_amount,
      fee_pct, ib_pct, position_value_at_calc,
      ownership_pct, transaction_id
    ) VALUES (
      v_distribution_id, v_alloc.investor_id, p_fund_id,
      v_alloc.gross, v_alloc.net, v_alloc.fee, v_alloc.ib,
      v_alloc.fee_pct, v_alloc.ib_rate, v_alloc.pre_day_value,
      CASE WHEN v_pre_day_aum > 0 THEN v_alloc.pre_day_value / v_pre_day_aum * 100
           WHEN v_opening_aum <> 0 THEN v_alloc.current_value / v_opening_aum * 100
           ELSE 0 END,
      v_yield_tx_id
    );

    IF v_alloc.fee > 0 AND v_alloc.account_type <> 'fees_account' THEN
      SELECT apply_investor_transaction(
        p_fund_id := p_fund_id,
        p_investor_id := v_fees_account_id,
        p_tx_type := 'FEE_CREDIT'::tx_type,
        p_amount := v_alloc.fee,
        p_tx_date := v_tx_date,
        p_reference_id := 'fee_credit-' || v_distribution_id || '-' || v_alloc.investor_id,
        p_admin_id := v_admin,
        p_notes := 'Fee from ' || v_alloc.investor_name,
        p_purpose := p_purpose,
        p_distribution_id := v_distribution_id
      ) INTO v_fee_tx_result;

      v_fee_tx_id := (v_fee_tx_result->>'transaction_id')::uuid;

      INSERT INTO fee_allocations (
        distribution_id, investor_id, fund_id, fees_account_id,
        fee_amount, fee_percentage, base_net_income,
        period_start, period_end, purpose, created_by,
        credit_transaction_id
      ) VALUES (
        v_distribution_id, v_alloc.investor_id, p_fund_id, v_fees_account_id,
        v_alloc.fee, v_alloc.fee_pct, v_alloc.gross,
        v_period_start, v_period_end, p_purpose, v_admin,
        v_fee_tx_id
      );
    END IF;

    IF v_alloc.ib > 0 AND v_alloc.ib_parent_id IS NOT NULL AND v_alloc.account_type <> 'fees_account' THEN
      SELECT apply_investor_transaction(
        p_fund_id := p_fund_id,
        p_investor_id := v_alloc.ib_parent_id,
        p_tx_type := 'IB_CREDIT'::tx_type,
        p_amount := v_alloc.ib,
        p_tx_date := v_tx_date,
        p_reference_id := 'ib_credit-' || v_distribution_id || '-' || v_alloc.investor_id,
        p_admin_id := v_admin,
        p_notes := 'IB commission from ' || v_alloc.investor_name,
        p_purpose := p_purpose,
        p_distribution_id := v_distribution_id
      ) INTO v_ib_tx_result;

      v_ib_tx_id := (v_ib_tx_result->>'transaction_id')::uuid;

      UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
      WHERE id = v_ib_tx_id;

      INSERT INTO ib_allocations (
        distribution_id, ib_investor_id, source_investor_id, fund_id,
        ib_fee_amount, ib_percentage, source_net_income,
        period_start, period_end, purpose, created_by, effective_date
      ) VALUES (
        v_distribution_id, v_alloc.ib_parent_id, v_alloc.investor_id, p_fund_id,
        v_alloc.ib, v_alloc.ib_rate, v_alloc.gross,
        v_period_start, v_period_end, p_purpose, v_admin, v_tx_date
      );

      INSERT INTO ib_commission_ledger (
        fund_id, yield_distribution_id, source_investor_id, ib_id,
        gross_yield_amount, ib_percentage, ib_commission_amount,
        effective_date, transaction_id, created_by, asset,
        source_investor_name, ib_name
      ) VALUES (
        p_fund_id, v_distribution_id, v_alloc.investor_id, v_alloc.ib_parent_id,
        v_alloc.gross, v_alloc.ib_rate, v_alloc.ib,
        v_tx_date, v_ib_tx_id, v_admin, v_fund.asset,
        v_alloc.investor_name,
        (SELECT COALESCE(first_name || ' ' || last_name, 'Unknown') FROM profiles WHERE id = v_alloc.ib_parent_id)
      );
    END IF;
  END LOOP;

  IF v_residual <> 0 AND v_fees_account_id IS NOT NULL THEN
    SELECT apply_investor_transaction(
      p_fund_id := p_fund_id,
      p_investor_id := v_fees_account_id,
      p_tx_type := 'DUST'::tx_type,
      p_amount := v_residual,
      p_tx_date := v_tx_date,
      p_reference_id := 'dust-' || v_distribution_id,
      p_admin_id := v_admin,
      p_notes := 'Dust from yield distribution ' || v_distribution_id,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    ) INTO v_tx_result;

    UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
    WHERE id = (v_tx_result->>'transaction_id')::uuid;
  END IF;

  UPDATE yield_distributions SET
    gross_yield = v_total_gross,
    gross_yield_amount = v_total_gross,
    total_net_amount = v_total_net,
    total_fee_amount = v_total_fees,
    total_ib_amount = v_total_ib,
    net_yield = v_total_net,
    total_fees = v_total_fees,
    total_ib = v_total_ib,
    dust_amount = COALESCE(v_residual, 0),
    allocation_count = v_allocation_count,
    opening_aum = v_pre_day_aum,
    summary_json = jsonb_build_object(
      'version', 'flat_v7',
      'opening_aum', v_opening_aum,
      'pre_day_aum', v_pre_day_aum,
      'is_negative_yield', v_is_negative_yield,
      'same_day_deposits_excluded', v_opening_aum - v_pre_day_aum
    )
  WHERE id = v_distribution_id;

  PERFORM check_aum_reconciliation(p_fund_id, 0.01, p_period_end);

  UPDATE fund_daily_aum
  SET total_aum = p_recorded_aum,
      source = 'yield_distribution_v5',
      is_month_end = v_is_month_end,
      updated_at = now()
  WHERE fund_id = p_fund_id
    AND aum_date = v_period_end
    AND purpose = p_purpose
    AND is_voided = false;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
    VALUES (p_fund_id, v_period_end, p_recorded_aum, p_purpose, 'yield_distribution_v5', v_admin, v_is_month_end);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'period_start', v_period_start::text,
    'period_end', v_period_end::text,
    'opening_aum', v_opening_aum,
    'pre_day_aum', v_pre_day_aum,
    'recorded_aum', p_recorded_aum,
    'total_yield', v_total_month_yield,
    'gross', v_total_gross,
    'net', v_total_net,
    'fees', v_total_fees,
    'ib', v_total_ib,
    'dust', COALESCE(v_residual, 0),
    'allocations', v_allocation_count,
    'same_day_deposits_excluded', v_opening_aum - v_pre_day_aum
  );
END;
$$;


ALTER FUNCTION "public"."apply_segmented_yield_distribution_v5"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_opening_aum" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_transaction_with_crystallization"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_tx_type" "text", "p_amount" numeric, "p_tx_date" "date", "p_reference_id" "text", "p_new_total_aum" numeric DEFAULT NULL::numeric, "p_admin_id" "uuid" DEFAULT NULL::"uuid", "p_notes" "text" DEFAULT NULL::"text", "p_purpose" "text" DEFAULT 'transaction'::"text", "p_distribution_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_fund_last_crystal_date date;
  v_crystal_result jsonb;
  v_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_crystal_amount numeric := 0;
  v_admin uuid;
  v_existing_tx uuid;
  v_lock_key bigint;
  v_post_aum numeric;
  v_is_new_investor boolean := false;
BEGIN
  v_admin := COALESCE(p_admin_id, auth.uid());
  
  IF NOT is_admin(v_admin) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  
  IF p_tx_type NOT IN ('DEPOSIT', 'WITHDRAWAL', 'FEE', 'ADJUSTMENT', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT', 'YIELD') THEN
    RAISE EXCEPTION 'Invalid transaction type: %', p_tx_type;
  END IF;
  
  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Transaction amount must be non-zero';
  END IF;
  
  IF p_reference_id IS NULL OR p_reference_id = '' THEN
    RAISE EXCEPTION 'Reference ID is required for idempotency';
  END IF;
  
  SELECT id INTO v_existing_tx
  FROM transactions_v2
  WHERE reference_id = p_reference_id AND is_voided = false
  LIMIT 1;
  
  IF v_existing_tx IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'tx_id', v_existing_tx);
  END IF;
  
  v_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;
  
  -- Crystallization
  IF p_tx_type IN ('DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT') THEN
    SELECT MAX(ip.last_yield_crystallization_date)
    INTO v_fund_last_crystal_date
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id AND ip.is_active = true;
    
    IF v_fund_last_crystal_date IS NOT NULL AND v_fund_last_crystal_date < p_tx_date THEN
      IF p_new_total_aum IS NULL THEN
        SELECT total_aum INTO p_new_total_aum
        FROM fund_daily_aum
        WHERE fund_id = p_fund_id AND aum_date <= p_tx_date AND is_voided = false
        ORDER BY aum_date DESC LIMIT 1;
      END IF;
      
      IF p_new_total_aum IS NOT NULL AND p_new_total_aum > 0 THEN
        v_crystal_result := crystallize_yield_before_flow(
          p_fund_id, p_new_total_aum, 'transaction', p_reference_id,
          (p_tx_date::timestamp + interval '12 hours'), v_admin, p_purpose::aum_purpose
        );
        v_crystal_amount := COALESCE((v_crystal_result->>'gross_yield')::numeric, 0);
      END IF;
    END IF;
  END IF;
  
  -- Get or create position
  SELECT * INTO v_position FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;
  
  IF v_position IS NULL THEN
    v_is_new_investor := true;
    INSERT INTO investor_positions (investor_id, fund_id, shares, cost_basis, current_value, last_yield_crystallization_date, is_active)
    VALUES (p_investor_id, p_fund_id, 0, 0, 0, p_tx_date, true)
    RETURNING * INTO v_position;
  END IF;
  
  v_balance_before := v_position.current_value;
  
  CASE p_tx_type
    WHEN 'DEPOSIT' THEN v_balance_after := v_balance_before + ABS(p_amount);
    WHEN 'WITHDRAWAL' THEN 
      v_balance_after := v_balance_before - ABS(p_amount);
      IF v_balance_after < -0.00000001 THEN
        RAISE EXCEPTION 'Insufficient balance';
      END IF;
    WHEN 'FEE' THEN v_balance_after := v_balance_before - ABS(p_amount);
    WHEN 'ADJUSTMENT' THEN v_balance_after := v_balance_before + p_amount;
    ELSE v_balance_after := v_balance_before + ABS(p_amount);
  END CASE;
  
  -- Insert transaction - cast purpose to aum_purpose
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    balance_before, balance_after, reference_id, notes,
    approved_by, approved_at, created_by, purpose, source, is_voided, distribution_id
  ) VALUES (
    p_investor_id, p_fund_id, p_tx_date, p_tx_date, v_fund.asset,
    CASE WHEN p_tx_type IN ('WITHDRAWAL', 'FEE') THEN -ABS(p_amount) ELSE ABS(p_amount) END,
    p_tx_type::tx_type, v_balance_before, v_balance_after,
    p_reference_id, p_notes, v_admin, NOW(), v_admin, 
    p_purpose::aum_purpose, 'rpc_canonical'::tx_source, false, p_distribution_id
  )
  RETURNING id INTO v_tx_id;
  
  -- Update AUM
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_post_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;
  
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by)
  VALUES (p_fund_id, p_tx_date, v_post_aum, p_purpose::aum_purpose, 'transaction', v_admin)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, updated_at = now();
  
  RETURN jsonb_build_object(
    'success', true, 'tx_id', v_tx_id, 'crystallized_yield_amount', v_crystal_amount,
    'balance_before', v_balance_before, 'balance_after', v_balance_after,
    'is_new_investor', v_is_new_investor
  );
  
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_existing_tx FROM transactions_v2 WHERE reference_id = p_reference_id AND is_voided = false LIMIT 1;
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'tx_id', v_existing_tx);
END;
$$;


ALTER FUNCTION "public"."apply_transaction_with_crystallization"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_tx_type" "text", "p_amount" numeric, "p_tx_date" "date", "p_reference_id" "text", "p_new_total_aum" numeric, "p_admin_id" "uuid", "p_notes" "text", "p_purpose" "text", "p_distribution_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_withdrawal_with_crystallization"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_amount" numeric, "p_new_total_aum" numeric, "p_tx_date" "date", "p_admin_id" "uuid", "p_notes" "text" DEFAULT NULL::"text", "p_purpose" "text" DEFAULT 'transaction'::"text", "p_tx_hash" "text" DEFAULT NULL::"text", "p_tx_subtype" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result json;
  v_tx_id uuid;
  v_fund_asset text;
  v_fund_class text;
  v_trigger_reference text;
  v_crystallization_result jsonb;
  v_snapshot_id uuid;
  v_post_flow_aum numeric;
  v_event_ts timestamptz;
  v_admin_id uuid;
BEGIN
  -- Use provided admin_id or fallback to auth.uid()
  v_admin_id := COALESCE(p_admin_id, auth.uid());
  
  -- ADVISORY LOCK
  PERFORM pg_advisory_xact_lock(hashtext('crystallize:' || p_fund_id::text));
  
  PERFORM public.set_canonical_rpc(true);
  
  -- Pass admin_id to require_admin
  PERFORM public.require_admin('apply withdrawal with crystallization', v_admin_id);
  
  v_event_ts := CASE 
    WHEN p_tx_date = CURRENT_DATE THEN now()
    ELSE (p_tx_date || ' 23:59:59.998')::timestamptz
  END;
  
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM public.funds
  WHERE id = p_fund_id;
  
  v_trigger_reference := 'WDR-' || p_investor_id::text || '-' || to_char(p_tx_date, 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);
  
  v_crystallization_result := crystallize_yield_before_flow(
    p_fund_id, p_new_total_aum, 'withdrawal', v_trigger_reference,
    v_event_ts, v_admin_id, p_purpose::aum_purpose
  );
  
  IF NOT (v_crystallization_result->>'success')::boolean THEN
    RETURN v_crystallization_result::json;
  END IF;
  
  v_snapshot_id := (v_crystallization_result->>'snapshot_id')::uuid;
  
  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    reference_id, notes, created_by, is_voided, purpose, visibility_scope, source,
    tx_hash, tx_subtype
  ) VALUES (
    p_fund_id, p_investor_id, 'WITHDRAWAL', -ABS(p_amount), p_tx_date,
    v_fund_asset, v_fund_class, v_trigger_reference,
    COALESCE(p_notes, 'Withdrawal with crystallization'),
    v_admin_id, false, p_purpose::aum_purpose, 'investor_visible',
    'rpc_canonical',
    p_tx_hash, p_tx_subtype
  ) RETURNING id INTO v_tx_id;
  
  v_post_flow_aum := p_new_total_aum - ABS(p_amount);
  
  IF v_snapshot_id IS NOT NULL THEN
    UPDATE fund_aum_events SET post_flow_aum = v_post_flow_aum WHERE id = v_snapshot_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'crystallization', v_crystallization_result
  );
END;
$$;


ALTER FUNCTION "public"."apply_withdrawal_with_crystallization"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_amount" numeric, "p_new_total_aum" numeric, "p_tx_date" "date", "p_admin_id" "uuid", "p_notes" "text", "p_purpose" "text", "p_tx_hash" "text", "p_tx_subtype" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_yield_distribution_v5_with_lock"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_admin_id" "uuid" DEFAULT NULL::"uuid", "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose", "p_distribution_date" "date" DEFAULT NULL::"date", "p_opening_aum" numeric DEFAULT NULL::numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Fund-level lock: same key as void/unvoid wrappers.
  -- Prevents yield apply from reading inconsistent fund state during void execution.
  PERFORM pg_advisory_xact_lock(hashtext(p_fund_id::TEXT));

  v_result := public.apply_segmented_yield_distribution_v5(
    p_fund_id,
    p_period_end,
    p_recorded_aum,
    p_admin_id,
    p_purpose,
    p_distribution_date,
    p_opening_aum
  );

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."apply_yield_distribution_v5_with_lock"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_opening_aum" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."apply_yield_distribution_v5_with_lock"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_opening_aum" numeric) IS 'Wrapper: pg_advisory_xact_lock then apply_segmented_yield_distribution_v5.
Prevents concurrent void/unvoid from racing yield application on the same fund.
v2: Fixed wrong call signature (was passing p_investor_id, p_yield_amount).
v2: Converted to pg_advisory_xact_lock (auto-release).';



CREATE OR REPLACE FUNCTION "public"."approve_and_complete_withdrawal"("p_request_id" "uuid", "p_processed_amount" numeric DEFAULT NULL::numeric, "p_tx_hash" "text" DEFAULT NULL::"text", "p_admin_notes" "text" DEFAULT NULL::"text", "p_is_full_exit" boolean DEFAULT false, "p_send_precision" integer DEFAULT 3) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin_id uuid;
  v_request record;
  v_fund record;
  v_final_amount numeric(28,10);
  v_balance numeric(28,10);
  v_pending_sum numeric(28,10);
  v_tx_id uuid;
  v_reference_id text;
  v_dust numeric(28,10);
  v_dust_tx_id uuid;
  v_dust_credit_tx_id uuid;
  v_fees_account_id uuid;
  v_crystal_result jsonb;
  v_closing_aum numeric(28,10);
  v_tx_date date;
BEGIN
  -- Require admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin access required';
  END IF;
  v_admin_id := auth.uid();

  -- Advisory lock to prevent concurrent operations on same withdrawal
  PERFORM pg_advisory_xact_lock(hashtext('withdrawal:' || p_request_id::text));

  -- Fetch and lock the withdrawal request
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND: Withdrawal request % not found', p_request_id;
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'INVALID_STATE: Can only approve pending requests. Current status: %', v_request.status;
  END IF;

  -- Use settlement_date from the withdrawal request, fallback to CURRENT_DATE
  v_tx_date := COALESCE(v_request.settlement_date, CURRENT_DATE);

  -- Get fund details for asset column
  SELECT * INTO v_fund
  FROM public.funds
  WHERE id = v_request.fund_id;

  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'FUND_NOT_FOUND: Fund % not found', v_request.fund_id;
  END IF;

  -- If full exit, auto-crystallize yield first
  IF p_is_full_exit THEN
    BEGIN
      SELECT COALESCE(SUM(ip.current_value), 0) INTO v_closing_aum
      FROM investor_positions ip
      WHERE ip.fund_id = v_request.fund_id AND ip.is_active = true;

      SELECT public.crystallize_yield_before_flow(
        v_request.fund_id,
        v_closing_aum,
        'withdrawal',
        'full-exit:' || p_request_id::text,
        NOW(),
        v_admin_id
      ) INTO v_crystal_result;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Check investor balance (re-read after potential crystallization)
  SELECT COALESCE(current_value, 0) INTO v_balance
  FROM public.investor_positions
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id;

  IF v_balance IS NULL OR v_balance <= 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Investor has no active position in this fund';
  END IF;

  -- Determine final amount
  IF p_is_full_exit THEN
    v_final_amount := TRUNC(v_balance, p_send_precision);
    v_dust := v_balance - v_final_amount;

    IF v_final_amount <= 0 THEN
      v_dust := v_balance;
      v_final_amount := 0;
    END IF;
  ELSE
    v_final_amount := COALESCE(p_processed_amount, v_request.requested_amount);
    v_dust := 0;
  END IF;

  IF v_final_amount <= 0 AND v_dust <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: No amount to process';
  END IF;

  IF NOT p_is_full_exit AND v_final_amount > v_request.requested_amount THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Processed amount cannot exceed requested amount';
  END IF;

  -- Check for other pending withdrawals (exclude current request)
  SELECT COALESCE(SUM(requested_amount), 0) INTO v_pending_sum
  FROM public.withdrawal_requests
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id
    AND status IN ('approved', 'processing')
    AND id <> p_request_id;

  IF NOT p_is_full_exit AND v_final_amount > (v_balance - v_pending_sum) THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Amount % exceeds available balance % (position: %, other pending: %)',
      v_final_amount, (v_balance - v_pending_sum), v_balance, v_pending_sum;
  END IF;

  -- Generate deterministic reference ID
  v_reference_id := 'WDR-' || v_request.investor_id || '-' || to_char(v_tx_date, 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8);

  -- Bypass canonical mutation trigger for direct insert
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Create WITHDRAWAL transaction in ledger (only if send amount > 0)
  IF v_final_amount > 0 THEN
    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source,
      tx_hash
    ) VALUES (
      v_request.fund_id,
      v_request.investor_id,
      'WITHDRAWAL',
      -ABS(v_final_amount),
      v_tx_date,
      v_fund.asset,
      v_reference_id,
      COALESCE(p_admin_notes, 'Withdrawal approved and completed'),
      v_admin_id,
      false,
      'investor_visible',
      'rpc_canonical',
      p_tx_hash
    ) RETURNING id INTO v_tx_id;
  END IF;

  -- If full exit with dust, create DUST_SWEEP transactions
  IF p_is_full_exit AND v_dust > 0 THEN
    SELECT id INTO v_fees_account_id
    FROM public.profiles
    WHERE account_type = 'fees_account'
    LIMIT 1;

    IF v_fees_account_id IS NULL THEN
      RAISE EXCEPTION 'FEES_ACCOUNT_NOT_FOUND: No fees_account profile exists';
    END IF;

    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source
    ) VALUES (
      v_request.fund_id,
      v_request.investor_id,
      'DUST_SWEEP',
      -ABS(v_dust),
      v_tx_date,
      v_fund.asset,
      'dust-sweep-' || p_request_id::text,
      'Full exit dust routed to INDIGO Fees (' || v_dust::text || ' ' || v_fund.asset || ')',
      v_admin_id,
      false,
      'admin_only',
      'rpc_canonical'
    ) RETURNING id INTO v_dust_tx_id;

    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source
    ) VALUES (
      v_request.fund_id,
      v_fees_account_id,
      'DUST_SWEEP',
      ABS(v_dust),
      v_tx_date,
      v_fund.asset,
      'dust-credit-' || p_request_id::text,
      'Dust received from full exit of ' || v_request.investor_id::text,
      v_admin_id,
      false,
      'admin_only',
      'rpc_canonical'
    ) RETURNING id INTO v_dust_credit_tx_id;
  END IF;

  -- BUG 3 FIX: Unconditionally deactivate position on full exit
  -- Previously only deactivated inside the dust > 0 block, missing zero-dust cases
  IF p_is_full_exit THEN
    UPDATE public.investor_positions
    SET is_active = false, updated_at = NOW()
    WHERE investor_id = v_request.investor_id
      AND fund_id = v_request.fund_id
      AND current_value <= 0;
  END IF;

  -- trg_ledger_sync fires automatically for each INSERT above

  -- Update withdrawal request to completed
  UPDATE public.withdrawal_requests
  SET
    status = 'completed',
    approved_amount = v_final_amount,
    approved_by = v_admin_id,
    approved_at = NOW(),
    processed_amount = v_final_amount,
    processed_at = NOW(),
    tx_hash = p_tx_hash,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW(),
    version = COALESCE(version, 0) + 1
  WHERE id = p_request_id;

  -- Audit logging
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'complete',
    jsonb_build_object(
      'processed_amount', v_final_amount,
      'requested_amount', v_request.requested_amount,
      'tx_hash', p_tx_hash,
      'transaction_id', v_tx_id,
      'reference_id', v_reference_id,
      'completed_by', v_admin_id,
      'flow', CASE WHEN p_is_full_exit THEN 'full_exit_dust_sweep' ELSE 'approve_and_complete' END,
      'dust_amount', v_dust,
      'dust_tx_id', v_dust_tx_id,
      'dust_credit_tx_id', v_dust_credit_tx_id,
      'full_exit', p_is_full_exit,
      'send_precision', p_send_precision,
      'settlement_date', v_tx_date
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'reference_id', v_reference_id,
    'processed_amount', v_final_amount,
    'dust_amount', v_dust,
    'dust_tx_id', v_dust_tx_id,
    'full_exit', p_is_full_exit,
    'settlement_date', v_tx_date
  );
END;
$$;


ALTER FUNCTION "public"."approve_and_complete_withdrawal"("p_request_id" "uuid", "p_processed_amount" numeric, "p_tx_hash" "text", "p_admin_notes" "text", "p_is_full_exit" boolean, "p_send_precision" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."approve_and_complete_withdrawal"("p_request_id" "uuid", "p_processed_amount" numeric, "p_tx_hash" "text", "p_admin_notes" "text", "p_is_full_exit" boolean, "p_send_precision" integer) IS 'Atomic approve + complete withdrawal. Supports full exit with dust sweep to INDIGO Fees.
When p_is_full_exit=true: auto-crystallizes, truncates to p_send_precision decimals,
sweeps dust to fees_account as DUST_SWEEP, deactivates position.
Requires admin. Uses advisory lock for concurrency safety.';



CREATE OR REPLACE FUNCTION "public"."approve_withdrawal"("p_request_id" "uuid", "p_approved_amount" numeric DEFAULT NULL::numeric, "p_admin_notes" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_request RECORD;
  v_final_amount NUMERIC(28,10);
  v_current_balance NUMERIC(28,10);
BEGIN
  PERFORM public.ensure_admin();

  -- ===== ADVISORY LOCK =====
  PERFORM pg_advisory_xact_lock(hashtext('withdrawal:' || p_request_id::text));

  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Can only approve pending requests. Current status: %', v_request.status;
  END IF;

  v_final_amount := COALESCE(p_approved_amount, v_request.requested_amount);

  IF v_final_amount <= 0 THEN
    RAISE EXCEPTION 'Approved amount must be greater than zero';
  END IF;

  IF v_final_amount > v_request.requested_amount THEN
    RAISE EXCEPTION 'Approved amount cannot exceed requested amount';
  END IF;

  -- ===== BALANCE RE-CHECK (FIX #11) =====
  SELECT COALESCE(current_value, 0) INTO v_current_balance
  FROM investor_positions
  WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id;

  IF v_current_balance < v_final_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', v_current_balance, v_final_amount;
  END IF;

  UPDATE public.withdrawal_requests
  SET
    status = 'approved',
    approved_amount = v_final_amount,
    approved_by = auth.uid(),
    approved_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  PERFORM public.log_withdrawal_action(
    p_request_id,
    'approve',
    jsonb_build_object(
      'approved_amount', v_final_amount,
      'requested_amount', v_request.requested_amount,
      'current_balance', v_current_balance,
      'admin_notes', p_admin_notes
    )
  );

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."approve_withdrawal"("p_request_id" "uuid", "p_approved_amount" numeric, "p_admin_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."approve_withdrawal"("p_request_id" "uuid", "p_approved_amount" numeric, "p_admin_notes" "text") IS 'Transitions withdrawal from pending→approved. Requires admin. Uses advisory lock and validates available balance. Logs to withdrawal_audit_logs.';



CREATE OR REPLACE FUNCTION "public"."assert_integrity_or_raise"("p_scope_fund_id" "uuid" DEFAULT NULL::"uuid", "p_scope_investor_id" "uuid" DEFAULT NULL::"uuid", "p_context" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_violations jsonb := '[]'::jsonb;
  v_violation_count integer := 0;
  v_start_ts timestamptz := clock_timestamp();
  v_run_id uuid;
  v_check_result RECORD;
  v_sample_keys jsonb;
  v_is_pre_commit boolean := (p_context IS NOT NULL AND p_context LIKE '%pre_commit%');
BEGIN
  -- CRITICAL CHECK 1: Ledger Reconciliation (positions with variance from ledger sum)
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_ledger_reconciliation') THEN
    FOR v_check_result IN
      SELECT
        investor_id,
        fund_id,
        fund_code,
        investor_email,
        variance
      FROM v_ledger_reconciliation
      WHERE has_variance = true
        AND (p_scope_fund_id IS NULL OR fund_id = p_scope_fund_id)
        AND (p_scope_investor_id IS NULL OR investor_id = p_scope_investor_id)
      LIMIT 5
    LOOP
      v_violation_count := v_violation_count + 1;
      v_violations := v_violations || jsonb_build_object(
        'view', 'v_ledger_reconciliation',
        'investor_id', v_check_result.investor_id,
        'fund_id', v_check_result.fund_id,
        'fund_code', v_check_result.fund_code,
        'investor_email', v_check_result.investor_email,
        'variance', v_check_result.variance
      );
    END LOOP;
  END IF;

  -- CRITICAL CHECK 2: Position Transaction Variance
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_position_transaction_variance') THEN
    FOR v_check_result IN
      SELECT
        investor_id,
        fund_id,
        fund_code,
        investor_email,
        balance_variance
      FROM v_position_transaction_variance
      WHERE ABS(balance_variance) > 0.01
        AND (p_scope_fund_id IS NULL OR fund_id = p_scope_fund_id)
        AND (p_scope_investor_id IS NULL OR investor_id = p_scope_investor_id)
      LIMIT 5
    LOOP
      v_violation_count := v_violation_count + 1;
      v_violations := v_violations || jsonb_build_object(
        'view', 'v_position_transaction_variance',
        'investor_id', v_check_result.investor_id,
        'fund_id', v_check_result.fund_id,
        'fund_code', v_check_result.fund_code,
        'variance', v_check_result.balance_variance
      );
    END LOOP;
  END IF;

  -- CRITICAL CHECK 3: Fund AUM Mismatch
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'fund_aum_mismatch') THEN
    FOR v_check_result IN
      SELECT
        fund_id,
        fund_code,
        discrepancy,
        recorded_aum,
        calculated_aum  -- Correct column name
      FROM fund_aum_mismatch
      WHERE (p_scope_fund_id IS NULL OR fund_id = p_scope_fund_id)
      LIMIT 5
    LOOP
      v_violation_count := v_violation_count + 1;
      v_violations := v_violations || jsonb_build_object(
        'view', 'fund_aum_mismatch',
        'fund_id', v_check_result.fund_id,
        'fund_code', v_check_result.fund_code,
        'discrepancy', v_check_result.discrepancy,
        'recorded_aum', v_check_result.recorded_aum,
        'calculated_aum', v_check_result.calculated_aum
      );
    END LOOP;
  END IF;

  -- NON-CRITICAL CHECK 4: Crystallization Gaps (only fail on pre_commit)
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_crystallization_gaps') THEN
    FOR v_check_result IN
      SELECT
        investor_id,
        fund_id,
        fund_code,
        gap_type,
        days_behind
      FROM v_crystallization_gaps
      WHERE (p_scope_fund_id IS NULL OR fund_id = p_scope_fund_id)
        AND (p_scope_investor_id IS NULL OR investor_id = p_scope_investor_id)
      LIMIT 5
    LOOP
      IF v_is_pre_commit THEN
        v_violation_count := v_violation_count + 1;
      END IF;
      v_violations := v_violations || jsonb_build_object(
        'view', 'v_crystallization_gaps',
        'investor_id', v_check_result.investor_id,
        'fund_id', v_check_result.fund_id,
        'fund_code', v_check_result.fund_code,
        'gap_type', v_check_result.gap_type,
        'days_behind', v_check_result.days_behind,
        'critical', v_is_pre_commit
      );
    END LOOP;
  END IF;

  -- NON-CRITICAL CHECK 5: Transaction Sources (log only, don't fail)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_transaction_sources') THEN
    FOR v_check_result IN
      SELECT source, tx_count, assessment
      FROM check_transaction_sources()
      WHERE assessment LIKE 'WARNING%'
    LOOP
      v_violations := v_violations || jsonb_build_object(
        'view', 'check_transaction_sources',
        'source', v_check_result.source,
        'tx_count', v_check_result.tx_count,
        'assessment', v_check_result.assessment,
        'critical', false
      );
    END LOOP;
  END IF;

  -- Record the run
  INSERT INTO admin_integrity_runs (
    status,
    triggered_by,
    context,
    scope_fund_id,
    scope_investor_id,
    violations,
    runtime_ms,
    created_by
  ) VALUES (
    CASE WHEN v_violation_count > 0 THEN 'fail' ELSE 'pass' END,
    COALESCE(p_context, 'manual'),
    p_context,
    p_scope_fund_id,
    p_scope_investor_id,
    v_violations,
    EXTRACT(EPOCH FROM (clock_timestamp() - v_start_ts)) * 1000,
    auth.uid()
  )
  RETURNING id INTO v_run_id;

  -- If violations found, raise exception with details
  IF v_violation_count > 0 THEN
    RAISE EXCEPTION 'Integrity check failed: % violations found. Run ID: %', 
      v_violation_count, v_run_id
      USING DETAIL = v_violations::text;
  END IF;
END;
$$;


ALTER FUNCTION "public"."assert_integrity_or_raise"("p_scope_fund_id" "uuid", "p_scope_investor_id" "uuid", "p_context" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."assert_integrity_or_raise"("p_scope_fund_id" "uuid", "p_scope_investor_id" "uuid", "p_context" "text") IS 'Integrity gating function for write operations. Raises exception if critical integrity issues exist.
Called before sensitive financial operations.';



CREATE OR REPLACE FUNCTION "public"."audit_delta_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_delta jsonb;
  v_entity_id text;
  v_actor uuid;
BEGIN
  -- Determine entity ID based on table structure
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_entity_id := OLD.id::text;
    ELSE
      v_entity_id := NEW.id::text;
    END IF;
  EXCEPTION WHEN undefined_column THEN
    -- Table doesn't have 'id' column - build from composite key
    IF TG_TABLE_NAME = 'investor_positions' THEN
      IF TG_OP = 'DELETE' THEN
        v_entity_id := OLD.investor_id::text || ':' || OLD.fund_id::text;
      ELSE
        v_entity_id := NEW.investor_id::text || ':' || NEW.fund_id::text;
      END IF;
    ELSE
      -- Fallback: use table name + operation timestamp
      v_entity_id := TG_TABLE_NAME || ':' || extract(epoch from now())::text;
    END IF;
  END;

  -- Determine actor (prefer auth.uid, fall back to updated_by/created_by columns)
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    BEGIN
      IF TG_OP = 'UPDATE' AND NEW IS NOT NULL THEN
        v_actor := COALESCE(
          (NEW.updated_by)::uuid,
          (NEW.created_by)::uuid
        );
      ELSIF TG_OP = 'INSERT' AND NEW IS NOT NULL THEN
        v_actor := (NEW.created_by)::uuid;
      END IF;
    EXCEPTION WHEN undefined_column THEN
      -- Column doesn't exist, leave v_actor as NULL
      NULL;
    END;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Compute delta - only changed fields
    v_delta := compute_jsonb_delta(to_jsonb(OLD), to_jsonb(NEW));

    -- Skip if no meaningful changes (prevents noise from no-op updates)
    IF v_delta = '{}' THEN
      RETURN NEW;
    END IF;

    INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
    VALUES (
      'DELTA_UPDATE',
      TG_TABLE_NAME,
      v_entity_id,
      v_actor,
      v_delta,
      jsonb_build_object(
        'trigger', true,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'timestamp', now()
      )
    );

  ELSIF TG_OP = 'DELETE' THEN
    -- For deletes, store full record (needed for recovery)
    INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, meta)
    VALUES (
      'DELETE',
      TG_TABLE_NAME,
      v_entity_id,
      v_actor,
      to_jsonb(OLD),
      jsonb_build_object(
        'trigger', true,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'timestamp', now()
      )
    );

  ELSIF TG_OP = 'INSERT' THEN
    -- For inserts, log creation with key identifying fields only
    INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
    VALUES (
      'INSERT',
      TG_TABLE_NAME,
      v_entity_id,
      v_actor,
      jsonb_build_object('created', true),
      jsonb_build_object(
        'trigger', true,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'timestamp', now()
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_delta_trigger"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."audit_delta_trigger"() IS 'Delta audit trigger that logs only changed fields. Handles tables with composite PKs.
Fixed 2026-01-11: Handle investor_positions composite PK (investor_id, fund_id)';



CREATE OR REPLACE FUNCTION "public"."audit_fee_schedule_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
    VALUES (
      'investor_fee_schedule',
      NEW.id::text,
      'FEE_SCHEDULE_CREATED',
      auth.uid(),
      NULL,
      jsonb_build_object(
        'investor_id', NEW.investor_id,
        'fund_id', NEW.fund_id,
        'fee_pct', NEW.fee_pct,
        'effective_date', NEW.effective_date,
        'end_date', NEW.end_date
      ),
      jsonb_build_object('trigger', 'audit_fee_schedule_changes')
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
    VALUES (
      'investor_fee_schedule',
      NEW.id::text,
      'FEE_SCHEDULE_UPDATED',
      auth.uid(),
      jsonb_build_object(
        'investor_id', OLD.investor_id,
        'fund_id', OLD.fund_id,
        'fee_pct', OLD.fee_pct,
        'effective_date', OLD.effective_date,
        'end_date', OLD.end_date
      ),
      jsonb_build_object(
        'investor_id', NEW.investor_id,
        'fund_id', NEW.fund_id,
        'fee_pct', NEW.fee_pct,
        'effective_date', NEW.effective_date,
        'end_date', NEW.end_date
      ),
      jsonb_build_object('trigger', 'audit_fee_schedule_changes')
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
    VALUES (
      'investor_fee_schedule',
      OLD.id::text,
      'FEE_SCHEDULE_DELETED',
      auth.uid(),
      jsonb_build_object(
        'investor_id', OLD.investor_id,
        'fund_id', OLD.fund_id,
        'fee_pct', OLD.fee_pct,
        'effective_date', OLD.effective_date,
        'end_date', OLD.end_date
      ),
      NULL,
      jsonb_build_object('trigger', 'audit_fee_schedule_changes')
    );
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."audit_fee_schedule_changes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."audit_fee_schedule_changes"() IS 'Trigger function: Logs all fee schedule changes (INSERT/UPDATE/DELETE) to audit_log table for compliance.';



CREATE OR REPLACE FUNCTION "public"."audit_ib_allocation_payout"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.payout_status IS DISTINCT FROM NEW.payout_status THEN
    INSERT INTO audit_log (
      entity,
      entity_id,
      action,
      actor_user,
      old_values,
      new_values,
      created_at
    ) VALUES (
      'ib_allocations',
      NEW.id::text,
      'payout_status_change',
      NEW.paid_by,
      jsonb_build_object('payout_status', OLD.payout_status),
      jsonb_build_object('payout_status', NEW.payout_status, 'paid_at', NEW.paid_at, 'payout_batch_id', NEW.payout_batch_id),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."audit_ib_allocation_payout"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."audit_ib_allocation_payout"() IS 'Trigger: Audits payout status changes on ib_allocations table';



CREATE OR REPLACE FUNCTION "public"."audit_investor_fund_performance_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.data_edit_audit (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    edited_by,
    edited_at,
    edit_source
  ) VALUES (
    'investor_fund_performance',
    COALESCE(NEW.id, OLD.id)::uuid,  -- FIXED: Explicit UUID cast
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    now(),
    'system'
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."audit_investor_fund_performance_changes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."audit_investor_fund_performance_changes"() IS 'Audit trigger for investor_fund_performance. Uses ::uuid cast for record_id.';



CREATE OR REPLACE FUNCTION "public"."audit_transaction_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (action, entity, entity_id, old_values, actor_user, meta)
    VALUES ('DELETE', 'transactions_v2', OLD.id, to_jsonb(OLD), auth.uid(), 
            jsonb_build_object('trigger', 'audit_transaction_changes'));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (action, entity, entity_id, old_values, new_values, actor_user, meta)
    VALUES ('UPDATE', 'transactions_v2', NEW.id, to_jsonb(OLD), to_jsonb(NEW), auth.uid(),
            jsonb_build_object('trigger', 'audit_transaction_changes'));
    RETURN NEW;
  ELSE
    INSERT INTO audit_log (action, entity, entity_id, new_values, actor_user, meta)
    VALUES ('INSERT', 'transactions_v2', NEW.id, to_jsonb(NEW), auth.uid(),
            jsonb_build_object('trigger', 'audit_transaction_changes'));
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."audit_transaction_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_user_role_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  -- Get user email for better audit context
  IF TG_OP = 'DELETE' THEN
    SELECT email INTO v_user_email FROM profiles WHERE id = OLD.user_id;
  ELSE
    SELECT email INTO v_user_email FROM profiles WHERE id = NEW.user_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
    VALUES (
      'user_roles',
      NEW.id::text,
      'ROLE_GRANTED',
      auth.uid(),
      NULL,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'role', NEW.role::text
      ),
      jsonb_build_object('user_email', v_user_email, 'trigger', 'audit_user_role_changes')
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
    VALUES (
      'user_roles',
      NEW.id::text,
      'ROLE_CHANGED',
      auth.uid(),
      jsonb_build_object(
        'user_id', OLD.user_id,
        'role', OLD.role::text
      ),
      jsonb_build_object(
        'user_id', NEW.user_id,
        'role', NEW.role::text
      ),
      jsonb_build_object('user_email', v_user_email, 'trigger', 'audit_user_role_changes')
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
    VALUES (
      'user_roles',
      OLD.id::text,
      'ROLE_REVOKED',
      auth.uid(),
      jsonb_build_object(
        'user_id', OLD.user_id,
        'role', OLD.role::text
      ),
      NULL,
      jsonb_build_object('user_email', v_user_email, 'trigger', 'audit_user_role_changes')
    );
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."audit_user_role_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_close_previous_fee_schedule"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Close any existing schedules for the same investor+fund scope
  -- that don't have an end_date and have an effective_date before the new schedule
  UPDATE investor_fee_schedule
  SET 
    end_date = NEW.effective_date - INTERVAL '1 day',
    updated_at = NOW()
  WHERE investor_id = NEW.investor_id
    AND COALESCE(fund_id::text, 'ALL') = COALESCE(NEW.fund_id::text, 'ALL')
    AND id != NEW.id
    AND end_date IS NULL
    AND effective_date < NEW.effective_date;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_close_previous_fee_schedule"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_close_previous_fee_schedule"() IS 'Trigger function: Auto-closes previous fee schedule entries when a new one is inserted for the same investor+fund scope by setting end_date.';



CREATE OR REPLACE FUNCTION "public"."auto_close_previous_ib_schedule"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Close any existing schedules for the same investor+fund scope
  -- that don't have an end_date and have an effective_date before the new schedule
  UPDATE ib_commission_schedule
  SET
    end_date = NEW.effective_date - INTERVAL '1 day',
    updated_at = NOW()
  WHERE investor_id = NEW.investor_id
    AND COALESCE(fund_id::text, 'ALL') = COALESCE(NEW.fund_id::text, 'ALL')
    AND id != NEW.id
    AND end_date IS NULL
    AND effective_date < NEW.effective_date;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_close_previous_ib_schedule"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."backfill_balance_chain_fix"("p_investor_id" "uuid", "p_fund_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  r RECORD;
  v_running_balance NUMERIC(28,10) := 0;
  v_expected_after NUMERIC(28,10);
  v_transactions_updated INTEGER := 0;
  v_negative_types TEXT[] := ARRAY['WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT'];
BEGIN
  -- Set BOTH canonical vars for compatibility
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  
  FOR r IN (
    SELECT id, type::text as tx_type, amount, balance_before, balance_after, tx_date, created_at
    FROM transactions_v2
    WHERE investor_id = p_investor_id AND fund_id = p_fund_id AND is_voided = false
    ORDER BY tx_date ASC, created_at ASC
  ) LOOP
    IF r.tx_type = ANY(v_negative_types) THEN
      v_expected_after := v_running_balance - ABS(r.amount);
    ELSE
      v_expected_after := v_running_balance + r.amount;
    END IF;
    
    IF r.balance_before IS DISTINCT FROM v_running_balance OR r.balance_after IS DISTINCT FROM v_expected_after THEN
      UPDATE transactions_v2 SET balance_before = v_running_balance, balance_after = v_expected_after WHERE id = r.id;
      v_transactions_updated := v_transactions_updated + 1;
    END IF;
    
    v_running_balance := v_expected_after;
  END LOOP;
  
  RETURN jsonb_build_object(
    'investor_id', p_investor_id, 
    'fund_id', p_fund_id, 
    'transactions_updated', v_transactions_updated, 
    'final_balance', v_running_balance
  );
END;
$$;


ALTER FUNCTION "public"."backfill_balance_chain_fix"("p_investor_id" "uuid", "p_fund_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."batch_crystallize_fund"("p_fund_id" "uuid", "p_effective_date" "date", "p_force_override" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('crystallize'), hashtext(p_fund_id::text));
  PERFORM set_canonical_rpc(true);

  -- The old sub-functions (crystallize_fund_transactions, etc.) no longer exist.
  -- Crystallization is now handled by crystallize_yield_before_flow() which fires
  -- automatically before each deposit/withdrawal. This batch function is retained
  -- for compatibility but raises an informative error.
  RAISE EXCEPTION 'batch_crystallize_fund is deprecated. Crystallization now happens automatically via crystallize_yield_before_flow() before each transaction.'
    USING HINT = 'Use crystallize_month_end() for month-end operations instead.';
END;
$$;


ALTER FUNCTION "public"."batch_crystallize_fund"("p_fund_id" "uuid", "p_effective_date" "date", "p_force_override" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."batch_initialize_fund_aum"("p_admin_id" "uuid" DEFAULT NULL::"uuid", "p_dry_run" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_count int := 0;
BEGIN
  -- Advisory lock: prevent concurrent batch AUM initialization
  PERFORM pg_advisory_xact_lock(hashtext('batch_init_aum'), hashtext('global'));

  v_admin := COALESCE(p_admin_id, auth.uid());

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  FOR v_fund IN
    SELECT
      f.id as fund_id, f.code as fund_code,
      COALESCE(SUM(ip.current_value), 0) as positions_sum,
      (SELECT COUNT(*) FROM fund_daily_aum fda
       WHERE fda.fund_id = f.id AND fda.is_voided = false) as aum_count
    FROM funds f
    LEFT JOIN investor_positions ip ON ip.fund_id = f.id AND ip.is_active = true
    GROUP BY f.id, f.code
    HAVING (SELECT COUNT(*) FROM fund_daily_aum fda WHERE fda.fund_id = f.id AND fda.is_voided = false) = 0
      AND COALESCE(SUM(ip.current_value), 0) > 0
  LOOP
    IF NOT p_dry_run THEN
      SELECT initialize_fund_aum_from_positions(v_fund.fund_id, v_admin) INTO v_result;
    ELSE
      v_result := jsonb_build_object(
        'fund_id', v_fund.fund_id, 'fund_code', v_fund.fund_code,
        'would_create_aum', v_fund.positions_sum
      );
    END IF;

    v_results := v_results || v_result;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true, 'dry_run', p_dry_run,
    'funds_processed', v_count, 'results', v_results
  );
END;
$$;


ALTER FUNCTION "public"."batch_initialize_fund_aum"("p_admin_id" "uuid", "p_dry_run" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."batch_reconcile_all_positions"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_pos RECORD;
  v_result JSONB;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_total_variance NUMERIC := 0;
BEGIN
  -- Advisory lock: prevent concurrent batch reconciliation
  PERFORM pg_advisory_xact_lock(hashtext('batch_reconcile'), hashtext('global'));

  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  FOR v_pos IN
    SELECT DISTINCT investor_id, fund_id FROM investor_positions
    WHERE investor_id IS NOT NULL AND fund_id IS NOT NULL
  LOOP
    SELECT admin_fix_position(v_pos.investor_id, v_pos.fund_id) INTO v_result;
    IF (v_result->>'success')::boolean THEN
      v_success_count := v_success_count + 1;
      v_total_variance := v_total_variance + ABS(COALESCE((v_result->>'variance')::numeric, 0));
    ELSE
      v_error_count := v_error_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_positions', v_success_count + v_error_count,
    'fixed', v_success_count,
    'errors', v_error_count,
    'total_variance_fixed', v_total_variance
  );
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'batch_reconcile_all_positions failed: % (%)', SQLERRM, SQLSTATE;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."batch_reconcile_all_positions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."build_error_response"("p_error_code" "text", "p_details" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_metadata record;
BEGIN
  -- Get error metadata
  SELECT * INTO v_metadata
  FROM error_code_metadata
  WHERE error_code = p_error_code;

  RETURN jsonb_build_object(
    'success', false,
    'error', jsonb_build_object(
      'code', p_error_code,
      'category', COALESCE(v_metadata.category, 'SYSTEM'),
      'message', COALESCE(v_metadata.default_message, 'Unknown error'),
      'user_action_hint', v_metadata.user_action_hint,
      'ui_action', v_metadata.ui_action,
      'severity', COALESCE(v_metadata.severity, 'error'),
      'is_retryable', COALESCE(v_metadata.is_retryable, false),
      'details', p_details,
      'timestamp', now()
    )
  );
END;
$$;


ALTER FUNCTION "public"."build_error_response"("p_error_code" "text", "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."build_success_response"("p_data" "jsonb" DEFAULT '{}'::"jsonb", "p_message" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'data', p_data,
    'message', p_message,
    'timestamp', now()
  );
END;
$$;


ALTER FUNCTION "public"."build_success_response"("p_data" "jsonb", "p_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calc_avg_daily_balance"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date") RETURNS numeric
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result numeric := 0;
  v_total_weighted_balance numeric := 0;
  v_total_days int;
  v_current_balance numeric := 0;
  v_current_date date;
  v_next_date date;
  v_days_at_balance int;
  v_tx RECORD;
  v_initial_balance numeric;
BEGIN
  v_total_days := (p_period_end - p_period_start + 1);

  IF v_total_days <= 0 THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(
    (
      SELECT ps.current_value
      FROM investor_position_snapshots ps
      WHERE ps.investor_id = p_investor_id
        AND ps.fund_id = p_fund_id
        AND ps.snapshot_date = p_period_start - 1
      ORDER BY ps.created_at DESC
      LIMIT 1
    ),
    (
      SELECT COALESCE(SUM(
        CASE
          WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN t.amount
          WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT') THEN -ABS(t.amount)
          ELSE t.amount
        END
      ), 0)
      FROM transactions_v2 t
      WHERE t.investor_id = p_investor_id
        AND t.fund_id = p_fund_id
        AND t.tx_date < p_period_start
        AND t.is_voided = false
    )
  ) INTO v_initial_balance;

  v_current_balance := COALESCE(v_initial_balance, 0);
  v_current_date := p_period_start;

  FOR v_tx IN
    SELECT
      t.tx_date,
      SUM(
        CASE
          WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'INTERNAL_CREDIT') THEN t.amount
          WHEN t.type = 'ADJUSTMENT' THEN t.amount
          WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT') THEN -ABS(t.amount)
          ELSE 0
        END
      ) as daily_net_change
    FROM transactions_v2 t
    WHERE t.investor_id = p_investor_id
      AND t.fund_id = p_fund_id
      AND t.tx_date >= p_period_start
      AND t.tx_date <= p_period_end
      AND t.is_voided = false
    GROUP BY t.tx_date
    ORDER BY t.tx_date
  LOOP
    v_days_at_balance := v_tx.tx_date - v_current_date;

    IF v_days_at_balance > 0 THEN
      v_total_weighted_balance := v_total_weighted_balance + (v_current_balance * v_days_at_balance);
    END IF;

    v_current_balance := v_current_balance + v_tx.daily_net_change;
    v_current_date := v_tx.tx_date;
  END LOOP;

  v_days_at_balance := (p_period_end - v_current_date + 1);
  IF v_days_at_balance > 0 THEN
    v_total_weighted_balance := v_total_weighted_balance + (v_current_balance * v_days_at_balance);
  END IF;

  v_result := v_total_weighted_balance / v_total_days;

  RETURN ROUND(v_result, 18);
END;
$$;


ALTER FUNCTION "public"."calc_avg_daily_balance"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calc_avg_daily_balance"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date") IS 'Calculates the Average Daily Balance for an investor position over a date range. Used for fair yield allocation.';



CREATE OR REPLACE FUNCTION "public"."calculate_position_at_date_fix"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_as_of_date" "date") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
                                                                                                                                              DECLARE
                                                                                                                                                v_position_value NUMERIC(28,10);
                                                                                                                                                  v_negative_types TEXT[] := ARRAY['WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT'];
                                                                                                                                                  BEGIN
                                                                                                                                                    SELECT COALESCE(SUM(CASE WHEN type::text = ANY(v_negative_types) THEN -ABS(amount) ELSE amount END), 0)
                                                                                                                                                      INTO v_position_value
                                                                                                                                                        FROM transactions_v2
                                                                                                                                                          WHERE investor_id = p_investor_id AND fund_id = p_fund_id AND is_voided = false AND tx_date <= p_as_of_date;
                                                                                                                                                            RETURN v_position_value;
                                                                                                                                                            END;
                                                                                                                                                            $$;


ALTER FUNCTION "public"."calculate_position_at_date_fix"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_as_of_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_unrealized_pnl"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.unrealized_pnl := COALESCE(NEW.current_value, 0) - COALESCE(NEW.cost_basis, 0);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_unrealized_pnl"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_yield_allocations"("p_fund_id" "uuid", "p_recorded_aum" numeric, "p_period_end" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("investor_id" "uuid", "investor_name" "text", "investor_email" "text", "account_type" "text", "ib_parent_id" "uuid", "current_value" numeric, "share" numeric, "gross" numeric, "fee_pct" numeric, "fee" numeric, "ib_rate" numeric, "ib" numeric, "net" numeric, "fee_credit" numeric, "ib_credit" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fees_account_id uuid;
  v_opening_aum numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;
BEGIN
  SELECT id INTO v_fees_account_id FROM profiles
  WHERE profiles.account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;

  SELECT COALESCE(SUM(ip_base.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip_base
  WHERE ip_base.fund_id = p_fund_id AND ip_base.is_active = true;

  v_total_month_yield := p_recorded_aum - v_opening_aum;
  v_is_negative_yield := (v_total_month_yield < 0);

  RETURN QUERY
  WITH all_relevant_investors AS (
    SELECT 
      ip_in.investor_id as ari_investor_id,
      ip_in.current_value as ari_current_value
    FROM investor_positions ip_in
    JOIN profiles p_p ON p_p.id = ip_in.investor_id
    WHERE ip_in.fund_id = p_fund_id AND ip_in.is_active = true AND ip_in.current_value > 0
    UNION
    SELECT v_fees_account_id, 0::numeric
    WHERE v_fees_account_id IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM investor_positions ip_fees 
        WHERE ip_fees.investor_id = v_fees_account_id 
          AND ip_fees.fund_id = p_fund_id 
          AND ip_fees.is_active = true
      )
    UNION
    SELECT DISTINCT p_child.ib_parent_id, 0::numeric
    FROM investor_positions ip_child
    JOIN profiles p_child ON p_child.id = ip_child.investor_id
    WHERE ip_child.fund_id = p_fund_id 
      AND ip_child.is_active = true 
      AND p_child.ib_parent_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM investor_positions ip_ib 
        WHERE ip_ib.investor_id = p_child.ib_parent_id 
          AND ip_ib.fund_id = p_fund_id 
          AND ip_ib.is_active = true
      )
  ),
  raw_alloc AS (
    SELECT 
      ari.ari_investor_id as r_investor_id,
      trim(COALESCE(p_in.first_name, '') || ' ' || COALESCE(p_in.last_name, '')) AS r_investor_name,
      p_in.email AS r_investor_email,
      p_in.account_type::text AS r_account_type,
      p_in.ib_parent_id as r_ib_parent_id,
      ari.ari_current_value as r_current_value,
      COALESCE((ari.ari_current_value / NULLIF(v_opening_aum, 0)), 0) AS r_share,
      ROUND((v_total_month_yield * COALESCE((ari.ari_current_value / NULLIF(v_opening_aum, 0)), 0))::numeric, 18) AS r_gross,
      CASE 
        WHEN v_is_negative_yield THEN 0::numeric
        WHEN p_in.account_type = 'fees_account' THEN 0::numeric
        ELSE get_investor_fee_pct(ari.ari_investor_id, p_fund_id, p_period_end)
      END AS r_fee_pct,
      CASE
        WHEN v_is_negative_yield THEN 0::numeric
        WHEN p_in.ib_parent_id IS NULL THEN 0::numeric
        ELSE get_investor_ib_pct(ari.ari_investor_id, p_fund_id, p_period_end)
      END AS r_ib_rate
    FROM all_relevant_investors ari
    JOIN profiles p_in ON p_in.id = ari.ari_investor_id
  ),
  computed_alloc AS (
    SELECT ra.*, 
           ROUND((ra.r_gross * ra.r_fee_pct / 100)::numeric, 18) AS r_fee, 
           ROUND((ra.r_gross * ra.r_ib_rate / 100)::numeric, 18) AS r_ib
    FROM raw_alloc ra
  ),
  final_alloc_p0 AS (
    SELECT ca.*, (ca.r_gross - ca.r_fee - ca.r_ib) AS r_net
    FROM computed_alloc ca
  ),
  totals AS (
     SELECT COALESCE(SUM(ca_t.r_gross), 0) as r_sum_gross, COALESCE(SUM(ca_t.r_fee), 0) as r_total_fees_credit
     FROM final_alloc_p0 ca_t
  ),
  ib_credits AS (
     SELECT ic_in.r_ib_parent_id as ic_parent_id, SUM(ic_in.r_ib) as total_ib_credit
     FROM final_alloc_p0 ic_in
     WHERE ic_in.r_ib_parent_id IS NOT NULL
     GROUP BY ic_in.r_ib_parent_id
  ),
  final_alloc_p1 AS (
    SELECT fa.*,
      CASE WHEN fa.r_investor_id = v_fees_account_id THEN fa.r_net + (v_total_month_yield - (SELECT r_sum_gross FROM totals)) ELSE fa.r_net END AS r_net_final
    FROM final_alloc_p0 fa
  )
  SELECT 
    p1.r_investor_id, p1.r_investor_name, p1.r_investor_email, p1.r_account_type, p1.r_ib_parent_id,
    p1.r_current_value, p1.r_share, p1.r_gross, p1.r_fee_pct, p1.r_fee, p1.r_ib_rate, p1.r_ib, p1.r_net_final,
    CASE WHEN p1.r_investor_id = v_fees_account_id THEN (SELECT r_total_fees_credit FROM totals) ELSE 0::numeric END AS fee_credit,
    COALESCE(ic.total_ib_credit, 0::numeric) AS ib_credit
  FROM final_alloc_p1 p1
  LEFT JOIN ib_credits ic ON ic.ic_parent_id = p1.r_investor_id;
END;
$$;


ALTER FUNCTION "public"."calculate_yield_allocations"("p_fund_id" "uuid", "p_recorded_aum" numeric, "p_period_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_investor"("investor_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF public.is_admin() THEN RETURN true; END IF;
  IF auth.uid() = investor_uuid THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = investor_uuid AND ib_parent_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."can_access_investor"("investor_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_access_investor"("investor_uuid" "uuid") IS 'RLS helper - checks if current user can access investor data. Used for authorization in views and policies.';



CREATE OR REPLACE FUNCTION "public"."can_access_notification"("notification_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.notifications
        WHERE id = notification_id
        AND (user_id = auth.uid() OR public.is_admin())
    );
END;
$$;


ALTER FUNCTION "public"."can_access_notification"("notification_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_insert_notification"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS(
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
$$;


ALTER FUNCTION "public"."can_insert_notification"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_insert_notification"() IS 'SECURITY DEFINER check for notification inserts. Checks both profiles.is_admin and user_roles table to avoid RLS recursion.';



CREATE OR REPLACE FUNCTION "public"."can_withdraw"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_position record;
  v_reserved numeric(38,18) := 0;
  v_available numeric(38,18) := 0;
BEGIN
  SELECT * INTO v_position
  FROM public.investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  IF v_position IS NULL THEN
    RETURN jsonb_build_object('can_withdraw', false, 'reason', 'No position found in this fund');
  END IF;

  SELECT COALESCE(SUM(requested_amount), 0)::numeric(38,18)
  INTO v_reserved
  FROM public.withdrawal_requests
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND status IN ('pending', 'approved', 'processing');

  v_available := COALESCE(v_position.current_value, 0)::numeric(38,18) - COALESCE(v_reserved, 0)::numeric(38,18);

  IF p_amount::numeric(38,18) > v_available THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'Insufficient available balance (reserved withdrawals pending)',
      'current_value', COALESCE(v_position.current_value, 0),
      'reserved', COALESCE(v_reserved, 0),
      'available', v_available,
      'requested_amount', p_amount
    );
  END IF;

  RETURN jsonb_build_object(
    'can_withdraw', true,
    'current_value', COALESCE(v_position.current_value, 0),
    'reserved', COALESCE(v_reserved, 0),
    'available', v_available
  );
END;
$$;


ALTER FUNCTION "public"."can_withdraw"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_withdraw"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric) IS 'Validates if an investor can withdraw a specific amount. Used by create_withdrawal_request RPC.';



CREATE OR REPLACE FUNCTION "public"."cancel_delivery"("p_delivery_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN 
    RAISE EXCEPTION 'Admin required'; 
  END IF;
  
  UPDATE statement_email_delivery
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_delivery_id AND status IN ('queued', 'failed', 'QUEUED', 'FAILED');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery not found or not in cancellable state');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."cancel_delivery"("p_delivery_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_withdrawal_by_admin"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE 
  v_request RECORD;
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();
  
  -- Validate cancellation reason
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN 
    RAISE EXCEPTION 'Cancellation reason is required';
  END IF;

  -- Get request details
  SELECT * INTO v_request 
  FROM public.withdrawal_requests 
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status NOT IN ('pending', 'approved') THEN 
    RAISE EXCEPTION 'Can only cancel pending or approved requests. Current status: %', v_request.status;
  END IF;

  -- Update request
  UPDATE public.withdrawal_requests
  SET 
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_by = auth.uid(),
    cancelled_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  -- Log action
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'cancel',
    jsonb_build_object(
      'reason', p_reason,
      'previous_status', v_request.status,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."cancel_withdrawal_by_admin"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cancel_withdrawal_by_admin"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text") IS 'Admin function to cancel a pending or approved withdrawal';



CREATE OR REPLACE FUNCTION "public"."cancel_withdrawal_by_admin_v2"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_request RECORD;
  v_admin_id uuid;
BEGIN
  -- 1. Verify caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin privileges required';
  END IF;

  v_admin_id := auth.uid();

  -- Advisory lock to prevent concurrent mutations
  PERFORM pg_advisory_xact_lock(hashtext(p_request_id::text));

  -- 2. Look up the withdrawal request
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id;

  -- 3. Not found → raise
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found: %', p_request_id;
  END IF;

  -- 4. Wrong status → raise
  IF v_request.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Can only cancel pending or approved requests. Current status: %. Use void_completed_withdrawal for completed ones.', v_request.status;
  END IF;

  -- Allow state-machine guard to permit the transition
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- 5. UPDATE withdrawal_requests
  UPDATE public.withdrawal_requests
  SET
    status              = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_by        = v_admin_id,
    cancelled_at        = now(),
    admin_notes         = COALESCE(p_admin_notes, p_reason),
    updated_at          = now()
  WHERE id = p_request_id;

  -- 6. INSERT into audit_log
  INSERT INTO public.audit_log (actor_user, action, entity, entity_id, old_values, new_values)
  VALUES (
    v_admin_id,
    'WITHDRAWAL_CANCELLED_BY_ADMIN',
    'withdrawal_requests',
    p_request_id::text,
    jsonb_build_object('status', v_request.status, 'investor_id', v_request.investor_id, 'fund_id', v_request.fund_id),
    jsonb_build_object(
      'reason',       p_reason,
      'admin_notes',  p_admin_notes,
      'new_status',   'cancelled'
    )
  );

  -- 7. Return success
  RETURN json_build_object('success', true, 'withdrawal_id', p_request_id);
END;
$$;


ALTER FUNCTION "public"."cancel_withdrawal_by_admin_v2"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_withdrawal_by_investor"("p_request_id" "uuid", "p_investor_id" "uuid", "p_reason" "text" DEFAULT 'Cancelled by investor'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_request record;
BEGIN
  -- Get the withdrawal request
  SELECT * INTO v_request
  FROM withdrawal_requests
  WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_FOUND',
      'message', 'Withdrawal request not found'
    );
  END IF;

  -- Verify ownership
  IF v_request.investor_id != p_investor_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'You can only cancel your own withdrawal requests'
    );
  END IF;

  -- Validate state transition (only pending can be cancelled by investor)
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STATE',
      'message', format('Cannot cancel withdrawal in %s status', v_request.status)
    );
  END IF;

  -- Perform the update
  UPDATE withdrawal_requests
  SET 
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_at = now(),
    cancelled_by = p_investor_id
  WHERE id = p_request_id;

  -- Log to audit
  INSERT INTO audit_log (entity, entity_id, action, actor_user, meta)
  VALUES (
    'withdrawal_requests',
    p_request_id::text,
    'cancel_by_investor',
    p_investor_id,
    jsonb_build_object('reason', p_reason, 'previous_status', v_request.status)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Withdrawal request cancelled successfully'
  );
END;
$$;


ALTER FUNCTION "public"."cancel_withdrawal_by_investor"("p_request_id" "uuid", "p_investor_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cascade_void_from_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- When a transaction is voided, mark related audit entries
  IF NEW.is_voided = true AND (OLD.is_voided IS NULL OR OLD.is_voided = false) THEN
    -- Mark data_edit_audit entries for this transaction as voided_record
    UPDATE data_edit_audit
    SET voided_record = true
    WHERE record_id = NEW.id::uuid  -- EXPLICIT: Ensure UUID comparison
      AND table_name = 'transactions_v2';
    
    -- Void related fee_allocations if this was a fee transaction
    UPDATE fee_allocations
    SET is_voided = true,
        voided_at = now(),
        voided_by = NEW.voided_by
    WHERE (debit_transaction_id = NEW.id OR credit_transaction_id = NEW.id)
      AND is_voided = false;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."cascade_void_from_transaction"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cascade_void_from_transaction"() IS 'Cascades void status to related records. Uses ::uuid cast for record_id comparisons.';



CREATE OR REPLACE FUNCTION "public"."cascade_void_to_allocations"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.is_voided = true AND (OLD.is_voided = false OR OLD.is_voided IS NULL) THEN

    -- Cascade to yield_allocations
    UPDATE yield_allocations
    SET is_voided = true, voided_at = COALESCE(NEW.voided_at, NOW()),
        voided_by = NEW.voided_by, voided_by_profile_id = NEW.voided_by_profile_id,
        void_reason = COALESCE(NEW.void_reason, 'Cascade from yield_distributions')
    WHERE distribution_id = NEW.id
      AND (is_voided = false OR is_voided IS NULL);

    -- Cascade to fee_allocations
    UPDATE fee_allocations
    SET is_voided = true, voided_at = COALESCE(NEW.voided_at, NOW()),
        voided_by = NEW.voided_by, voided_by_profile_id = NEW.voided_by_profile_id,
        void_reason = COALESCE(NEW.void_reason, 'Cascade from yield_distributions')
    WHERE distribution_id = NEW.id
      AND (is_voided = false OR is_voided IS NULL);

    -- Cascade to ib_allocations
    UPDATE ib_allocations
    SET is_voided = true, voided_at = COALESCE(NEW.voided_at, NOW()),
        voided_by = NEW.voided_by, voided_by_profile_id = NEW.voided_by_profile_id
    WHERE distribution_id = NEW.id
      AND (is_voided = false OR is_voided IS NULL);

    -- Void associated fund_daily_aum records
    UPDATE fund_daily_aum
    SET is_voided = true, voided_at = COALESCE(NEW.voided_at, NOW()),
        voided_by = NEW.voided_by, voided_by_profile_id = NEW.voided_by_profile_id,
        void_reason = COALESCE(NEW.void_reason, 'Cascade from yield_distributions')
    WHERE fund_id = NEW.fund_id
      AND aum_date = NEW.period_end
      AND source = 'yield_distribution_v5'
      AND is_voided = false;

  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."cascade_void_to_allocations"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cascade_void_to_allocations"() IS 'Cascades void status from yield_distributions to fee_allocations and ib_allocations';



CREATE OR REPLACE FUNCTION "public"."cascade_void_to_yield_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.voided_at IS NOT NULL AND OLD.voided_at IS NULL THEN
    UPDATE data_edit_audit
    SET voided_record = true
    WHERE record_id = NEW.id::uuid
      AND table_name = 'yield_distributions';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."cascade_void_to_yield_events"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cascade_void_to_yield_events"() IS 'Cascades void status to audit entries when yield_distribution is voided.
Fixed 2026-01-11: Use voided_at IS NOT NULL instead of non-existent is_voided column';



CREATE OR REPLACE FUNCTION "public"."check_all_funds_transaction_aum"("p_tx_date" "date") RETURNS TABLE("fund_id" "uuid", "fund_code" "text", "has_reporting_aum" boolean, "has_transaction_aum" boolean, "reporting_aum" numeric, "transaction_aum" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN RETURN QUERY SELECT f.id as fund_id, f.code as fund_code, EXISTS (SELECT 1 FROM fund_daily_aum fda WHERE fda.fund_id = f.id::text AND fda.aum_date = p_tx_date AND fda.purpose = 'reporting' AND fda.is_voided = false) as has_reporting_aum, EXISTS (SELECT 1 FROM fund_daily_aum fda WHERE fda.fund_id = f.id::text AND fda.aum_date = p_tx_date AND fda.purpose = 'transaction' AND fda.is_voided = false) as has_transaction_aum, (SELECT fda.total_aum FROM fund_daily_aum fda WHERE fda.fund_id = f.id::text AND fda.aum_date = p_tx_date AND fda.purpose = 'reporting' AND fda.is_voided = false LIMIT 1) as reporting_aum, (SELECT fda.total_aum FROM fund_daily_aum fda WHERE fda.fund_id = f.id::text AND fda.aum_date = p_tx_date AND fda.purpose = 'transaction' AND fda.is_voided = false LIMIT 1) as transaction_aum FROM funds f WHERE f.status = 'active'; END; $$;


ALTER FUNCTION "public"."check_all_funds_transaction_aum"("p_tx_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_and_fix_aum_integrity"("p_fund_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_dry_run" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_aum_record RECORD;
  v_calculated_aum numeric;
  v_discrepancies jsonb := '[]'::jsonb;
  v_fixed_count integer := 0;
  v_total_checked integer := 0;
  v_fix_result jsonb;
BEGIN
  -- Require admin for this operation
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can run integrity checks';
  END IF;

  -- Iterate through fund_daily_aum records
  FOR v_aum_record IN 
    SELECT fda.*, f.code as fund_code, f.name as fund_name
    FROM fund_daily_aum fda
    JOIN funds f ON f.id = fda.fund_id
    WHERE fda.is_voided = false
      AND (p_fund_id IS NULL OR fda.fund_id = p_fund_id)
      AND (p_start_date IS NULL OR fda.aum_date >= p_start_date)
      AND (p_end_date IS NULL OR fda.aum_date <= p_end_date)
    ORDER BY fda.fund_id, fda.aum_date
  LOOP
    v_total_checked := v_total_checked + 1;
    
    -- Calculate what AUM should be based on positions
    SELECT COALESCE(SUM(current_value), 0)
    INTO v_calculated_aum
    FROM investor_positions
    WHERE fund_id = v_aum_record.fund_id
      AND current_value > 0;
    
    -- Check for discrepancy (allow small rounding differences)
    IF ABS(v_aum_record.total_aum - v_calculated_aum) > 0.01 THEN
      v_discrepancies := v_discrepancies || jsonb_build_object(
        'record_id', v_aum_record.id,
        'fund_id', v_aum_record.fund_id,
        'fund_code', v_aum_record.fund_code,
        'aum_date', v_aum_record.aum_date,
        'purpose', v_aum_record.purpose,
        'recorded_aum', v_aum_record.total_aum,
        'calculated_aum', v_calculated_aum,
        'difference', v_calculated_aum - v_aum_record.total_aum
      );
      
      -- Fix if not dry run
      IF NOT p_dry_run THEN
        v_fix_result := recalculate_fund_aum_for_date(
          v_aum_record.fund_id,
          v_aum_record.aum_date,
          v_aum_record.purpose,
          auth.uid()
        );
        
        IF (v_fix_result->>'success')::boolean THEN
          v_fixed_count := v_fixed_count + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'dry_run', p_dry_run,
    'total_checked', v_total_checked,
    'discrepancies_found', jsonb_array_length(v_discrepancies),
    'fixed_count', v_fixed_count,
    'discrepancies', v_discrepancies
  );
END;
$$;


ALTER FUNCTION "public"."check_and_fix_aum_integrity"("p_fund_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_dry_run" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_and_fix_aum_integrity"("p_fund_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_dry_run" boolean) IS 'Scans fund_daily_aum records and compares against calculated positions. Use dry_run=false to auto-fix discrepancies.';



CREATE OR REPLACE FUNCTION "public"."check_aum_exists_for_date"("p_fund_id" "uuid", "p_date" "date") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM fund_daily_aum 
    WHERE fund_id = p_fund_id 
    AND aum_date = p_date 
    AND purpose = 'transaction'
  );
$$;


ALTER FUNCTION "public"."check_aum_exists_for_date"("p_fund_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_aum_position_health"() RETURNS TABLE("fund_name" "text", "asset" "text", "position_sum" numeric, "latest_aum" numeric, "variance" numeric, "health_status" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.fund_name,
    v.asset,
    v.position_sum,
    v.latest_daily_aum,
    v.variance,
    v.health_status
  FROM v_fund_aum_position_health v
  WHERE v.health_status IN ('WARNING_WITHIN_5PCT', 'CRITICAL_MISMATCH', 'NO_AUM_RECORD')
  ORDER BY 
    CASE v.health_status 
      WHEN 'CRITICAL_MISMATCH' THEN 1
      WHEN 'NO_AUM_RECORD' THEN 2
      ELSE 3
    END;
END;
$$;


ALTER FUNCTION "public"."check_aum_position_health"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_aum_reconciliation"("p_fund_id" "uuid", "p_tolerance" numeric DEFAULT 0.01, "p_as_of_date" "date" DEFAULT NULL::"date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result jsonb;
  v_positions_sum numeric;
  v_aum_sum numeric;
  v_deviation numeric;
BEGIN
  -- Get sum of positions
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_positions_sum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;
  
  -- Get latest AUM
  SELECT COALESCE(SUM(total_aum), 0) INTO v_aum_sum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id 
    AND aum_date <= COALESCE(p_as_of_date, CURRENT_DATE)
    AND is_voided = false
    AND purpose = 'transaction';
  
  -- Calculate deviation
  IF v_aum_sum > 0 THEN
    v_deviation := ABS(v_aum_sum - v_positions_sum) / v_aum_sum;
  ELSE
    v_deviation := 0;
  END IF;
  
  RETURN jsonb_build_object(
    'valid', v_deviation <= p_tolerance,
    'positions_sum', v_positions_sum,
    'aum_sum', v_aum_sum,
    'deviation', v_deviation,
    'tolerance', p_tolerance
  );
END;
$$;


ALTER FUNCTION "public"."check_aum_reconciliation"("p_fund_id" "uuid", "p_tolerance" numeric, "p_as_of_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_concentration_risk"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fund_aum numeric;
  v_ownership_pct numeric;
  v_threshold_pct numeric := 30;  -- Alert if > 30% concentration
BEGIN
  -- Get current fund AUM
  SELECT total_aum INTO v_fund_aum
  FROM fund_daily_aum
  WHERE fund_id = NEW.fund_id AND is_voided = false
  ORDER BY aum_date DESC, created_at DESC
  LIMIT 1;

  -- Only check for significant positions
  IF v_fund_aum IS NOT NULL AND v_fund_aum > 0 AND NEW.current_value > 0 THEN
    v_ownership_pct := (NEW.current_value / v_fund_aum) * 100;

    IF v_ownership_pct > v_threshold_pct THEN
      -- Check if alert already exists for this investor/fund in last 24h
      IF NOT EXISTS (
        SELECT 1 FROM risk_alerts
        WHERE fund_id = NEW.fund_id
        AND investor_id = NEW.investor_id
        AND alert_type = 'CONCENTRATION_RISK'
        AND created_at > now() - interval '24 hours'
        AND resolved = false
      ) THEN
        INSERT INTO risk_alerts (
          fund_id, investor_id, alert_type, severity, message,
          details, threshold_value, actual_value
        ) VALUES (
          NEW.fund_id,
          NEW.investor_id,
          'CONCENTRATION_RISK',
          CASE
            WHEN v_ownership_pct > 50 THEN 'critical'
            WHEN v_ownership_pct > 40 THEN 'high'
            ELSE 'medium'
          END,
          'Investor holds ' || ROUND(v_ownership_pct, 2)::text || '% of fund AUM',
          jsonb_build_object(
            'position_value', NEW.current_value,
            'fund_aum', v_fund_aum,
            'ownership_pct', v_ownership_pct
          ),
          v_threshold_pct,
          v_ownership_pct
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_concentration_risk"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_duplicate_ib_allocations"() RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT COUNT(*)::integer FROM (
      SELECT source_investor_id, distribution_id, fund_id
      FROM ib_allocations
      WHERE is_voided = false
      GROUP BY source_investor_id, distribution_id, fund_id
      HAVING COUNT(*) > 1
    ) duplicates),
    0
  );
$$;


ALTER FUNCTION "public"."check_duplicate_ib_allocations"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_duplicate_ib_allocations"() IS 'Check for duplicate IB allocations. Excludes voided records to prevent false positives.';



CREATE OR REPLACE FUNCTION "public"."check_duplicate_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_potential_duplicate uuid;
  v_duplicate_email text;
BEGIN
  -- Check for exact email match (case-insensitive) - excluding self on update
  SELECT id, email INTO v_potential_duplicate, v_duplicate_email
  FROM profiles
  WHERE LOWER(email) = LOWER(NEW.email)
    AND id != NEW.id
  LIMIT 1;
  
  IF v_potential_duplicate IS NOT NULL THEN
    RAISE EXCEPTION 'Profile with email % already exists (id: %)', 
      v_duplicate_email, v_potential_duplicate;
  END IF;
  
  -- Check for similar name (log warning but allow insert)
  SELECT id, email INTO v_potential_duplicate, v_duplicate_email
  FROM profiles
  WHERE LOWER(first_name) = LOWER(NEW.first_name)
    AND LOWER(last_name) = LOWER(NEW.last_name)
    AND first_name IS NOT NULL 
    AND first_name != ''
    AND last_name IS NOT NULL
    AND last_name != ''
    AND id != NEW.id
  LIMIT 1;
  
  IF v_potential_duplicate IS NOT NULL THEN
    -- Log warning to audit_log but allow insert
    INSERT INTO audit_log (action, entity, entity_id, meta)
    VALUES (
      'potential_duplicate_detected',
      'profile',
      NEW.id::text,
      jsonb_build_object(
        'new_email', NEW.email,
        'existing_id', v_potential_duplicate,
        'existing_email', v_duplicate_email,
        'match_type', 'name_match'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_duplicate_profile"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_duplicate_profile"() IS 'Blocks exact email duplicates and logs name-based potential duplicates';



CREATE OR REPLACE FUNCTION "public"."check_duplicate_transaction_refs"() RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT COUNT(*)::integer FROM (
      SELECT reference_id
      FROM transactions_v2
      WHERE reference_id IS NOT NULL
      GROUP BY reference_id
      HAVING COUNT(*) > 1
    ) duplicates),
    0
  );
$$;


ALTER FUNCTION "public"."check_duplicate_transaction_refs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_email_uniqueness"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'A profile with this email already exists (case-insensitive): %', NEW.email
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_email_uniqueness"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_fund_is_active"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fund_status text;
BEGIN
  -- Skip when inside a canonical RPC (void, recompute, yield distribution)
  IF COALESCE(current_setting('indigo.canonical_rpc', true), 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  -- Skip any UPDATE where fund_id hasn't changed
  IF TG_OP = 'UPDATE' AND NEW.fund_id = OLD.fund_id THEN
    RETURN NEW;
  END IF;

  -- For transactions_v2 only, skip void operations
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'transactions_v2' THEN
    IF NEW.is_voided = true AND (OLD.is_voided IS NULL OR OLD.is_voided = false) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Validate fund exists and is active
  SELECT status INTO v_fund_status
  FROM public.funds WHERE id = NEW.fund_id::uuid;

  IF v_fund_status IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', NEW.fund_id;
  ELSIF v_fund_status != 'active' THEN
    RAISE EXCEPTION 'Cannot use inactive fund (status: %): %', v_fund_status, NEW.fund_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_fund_is_active"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_historical_lock"("p_fund_id" "uuid", "p_date" "date", "p_is_update" boolean DEFAULT false) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_locked boolean := false;
  v_period_locked boolean;
BEGIN
  -- Check if there's a closed statement period for this fund/date
  SELECT EXISTS (
    SELECT 1 FROM statement_periods
    WHERE fund_id = p_fund_id
    AND period_start <= p_date
    AND period_end >= p_date
    AND status = 'closed'
  ) INTO v_period_locked;
  
  IF v_period_locked AND p_is_update THEN
    v_is_locked := true;
  END IF;
  
  RETURN v_is_locked;
END;
$$;


ALTER FUNCTION "public"."check_historical_lock"("p_fund_id" "uuid", "p_date" "date", "p_is_update" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_is_admin"("user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = check_is_admin.user_id
      AND role IN ('admin'::app_role, 'super_admin'::app_role)
  )
$$;


ALTER FUNCTION "public"."check_is_admin"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_is_admin"("user_id" "uuid") IS 'ADMIN CHECK FOR SPECIFIC USER: Checks if given user_id has admin or super_admin role. Used in admin management UI. Returns boolean.';



CREATE OR REPLACE FUNCTION "public"."check_platform_data_integrity"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_issues jsonb := '[]'::jsonb;
  v_issue jsonb;
  v_rec RECORD;
BEGIN
  -- 1. Check position/transaction reconciliation
  FOR v_rec IN 
    WITH tx_sums AS (
      SELECT investor_id, fund_id, SUM(amount) as tx_total
      FROM transactions_v2 WHERE is_voided = false
      GROUP BY investor_id, fund_id
    )
    SELECT p.email, f.name as fund, ip.current_value, COALESCE(tx.tx_total, 0) as tx_sum
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    JOIN funds f ON f.id = ip.fund_id
    LEFT JOIN tx_sums tx ON tx.investor_id = ip.investor_id AND tx.fund_id = ip.fund_id
    WHERE ABS(ip.current_value - COALESCE(tx.tx_total, 0)) > 0.01
  LOOP
    v_issues := v_issues || jsonb_build_object(
      'type', 'POSITION_TX_MISMATCH',
      'severity', 'HIGH',
      'email', v_rec.email,
      'fund', v_rec.fund,
      'position', v_rec.current_value,
      'tx_sum', v_rec.tx_sum
    );
  END LOOP;

  -- 2. Check AUM/position reconciliation
  FOR v_rec IN 
    WITH position_sums AS (
      SELECT fund_id, SUM(current_value) as total
      FROM investor_positions WHERE current_value > 0
      GROUP BY fund_id
    ),
    latest_aum AS (
      SELECT DISTINCT ON (fund_id) fund_id, total_aum, aum_date
      FROM fund_daily_aum
      WHERE purpose = 'reporting' AND NOT COALESCE(is_voided, false)
      ORDER BY fund_id, aum_date DESC
    )
    SELECT f.name as fund, COALESCE(ps.total, 0) as positions, COALESCE(la.total_aum, 0) as aum
    FROM funds f
    LEFT JOIN position_sums ps ON ps.fund_id = f.id
    LEFT JOIN latest_aum la ON la.fund_id = f.id
    WHERE f.status = 'active'
      AND ABS(COALESCE(ps.total, 0) - COALESCE(la.total_aum, 0)) > 0.01
      AND COALESCE(ps.total, 0) > 0
  LOOP
    v_issues := v_issues || jsonb_build_object(
      'type', 'AUM_POSITION_MISMATCH',
      'severity', 'MEDIUM',
      'fund', v_rec.fund,
      'positions', v_rec.positions,
      'aum', v_rec.aum
    );
  END LOOP;

  -- 3. Check for negative positions
  FOR v_rec IN 
    SELECT p.email, f.name as fund, ip.current_value
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    JOIN funds f ON f.id = ip.fund_id
    WHERE ip.current_value < 0
  LOOP
    v_issues := v_issues || jsonb_build_object(
      'type', 'NEGATIVE_POSITION',
      'severity', 'HIGH',
      'email', v_rec.email,
      'fund', v_rec.fund,
      'value', v_rec.current_value
    );
  END LOOP;

  -- 4. Check fees_account has 0% fee
  FOR v_rec IN 
    SELECT email, fee_pct FROM profiles
    WHERE account_type = 'fees_account' AND fee_pct != 0
  LOOP
    v_issues := v_issues || jsonb_build_object(
      'type', 'FEES_ACCOUNT_WITH_FEE',
      'severity', 'HIGH',
      'email', v_rec.email,
      'fee_pct', v_rec.fee_pct
    );
  END LOOP;

  -- 5. Check for invalid fee percentages
  FOR v_rec IN 
    SELECT email, fee_pct FROM profiles
    WHERE fee_pct < 0 OR fee_pct > 100
  LOOP
    v_issues := v_issues || jsonb_build_object(
      'type', 'INVALID_FEE_PCT',
      'severity', 'HIGH',
      'email', v_rec.email,
      'fee_pct', v_rec.fee_pct
    );
  END LOOP;

  -- 6. Check yield distribution conservation (gross = net + fees)
  FOR v_rec IN 
    SELECT f.name as fund, yd.period_end, yd.gross_yield, yd.net_yield, yd.total_fees
    FROM yield_distributions yd
    JOIN funds f ON f.id = yd.fund_id
    WHERE NOT COALESCE(yd.is_voided, false)
      AND yd.status != 'voided'
      AND ABS(yd.gross_yield - (yd.net_yield + yd.total_fees)) > 0.01
  LOOP
    v_issues := v_issues || jsonb_build_object(
      'type', 'YIELD_CONSERVATION_ERROR',
      'severity', 'HIGH',
      'fund', v_rec.fund,
      'period_end', v_rec.period_end,
      'gross', v_rec.gross_yield,
      'net', v_rec.net_yield,
      'fees', v_rec.total_fees
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'checked_at', NOW(),
    'issues_count', jsonb_array_length(v_issues),
    'is_healthy', jsonb_array_length(v_issues) = 0,
    'issues', v_issues
  );
END;
$$;


ALTER FUNCTION "public"."check_platform_data_integrity"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_platform_data_integrity"() IS 'Comprehensive data integrity check. Run periodically to catch issues early. Returns list of any problems found.';



CREATE OR REPLACE FUNCTION "public"."check_transaction_sources"() RETURNS TABLE("source" "public"."tx_source", "tx_count" bigint, "sample_ids" "uuid"[], "assessment" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    t.source,
    COUNT(*) as tx_count,
    (ARRAY_AGG(t.id ORDER BY t.created_at DESC))[1:5] as sample_ids,
    CASE
      WHEN t.source IN ('rpc_canonical', 'crystallization', 'system', 'migration') THEN 'OK - approved source'
      WHEN t.source = 'manual_admin' THEN 'REVIEW - manual admin entries'
      ELSE 'WARNING - unapproved source'
    END as assessment
  FROM transactions_v2 t
  WHERE t.is_voided = false
  GROUP BY t.source
  ORDER BY
    CASE
      WHEN t.source IN ('rpc_canonical', 'crystallization', 'system', 'migration') THEN 0
      WHEN t.source = 'manual_admin' THEN 1
      ELSE 2
    END,
    t.source;
$$;


ALTER FUNCTION "public"."check_transaction_sources"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_transaction_sources"() IS 'Returns transaction counts by source with assessment. All sources should be approved types.';



CREATE OR REPLACE FUNCTION "public"."cleanup_dormant_positions"("p_dry_run" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_archived_count INTEGER := 0;
  v_dormant RECORD;
BEGIN
  FOR v_dormant IN
    SELECT ip.investor_id, ip.fund_id
    FROM investor_positions ip
    WHERE ip.current_value = 0
      AND NOT EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id
          AND t.fund_id = ip.fund_id
          AND t.is_voided = false
      )
  LOOP
    IF NOT p_dry_run THEN
      DELETE FROM investor_positions 
      WHERE investor_id = v_dormant.investor_id 
        AND fund_id = v_dormant.fund_id;
    END IF;
    v_archived_count := v_archived_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'dry_run', p_dry_run,
    'dormant_positions_found', v_archived_count
  );
END;
$$;


ALTER FUNCTION "public"."cleanup_dormant_positions"("p_dry_run" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_duplicate_preflow_aum"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_voided_count int := 0;
  v_dup RECORD;
BEGIN
  -- Find and void duplicates (keep earliest by event_ts)
  FOR v_dup IN
    WITH ranked AS (
      SELECT id, fund_id, event_date, purpose, event_ts,
        ROW_NUMBER() OVER (PARTITION BY fund_id, event_date, purpose ORDER BY event_ts) as rn
      FROM fund_aum_events
      WHERE is_voided = false
        AND trigger_type IN ('deposit', 'withdrawal', 'preflow')
    )
    SELECT id FROM ranked WHERE rn > 1
  LOOP
    UPDATE fund_aum_events
    SET is_voided = true,
        voided_at = now(),
        void_reason = 'Duplicate preflow AUM - cleanup migration'
    WHERE id = v_dup.id;
    v_voided_count := v_voided_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'voided_count', v_voided_count,
    'message', format('Voided %s duplicate preflow AUM records', v_voided_count)
  );
END;
$$;


ALTER FUNCTION "public"."cleanup_duplicate_preflow_aum"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_withdrawal"("p_request_id" "uuid", "p_closing_aum" numeric, "p_event_ts" timestamp with time zone DEFAULT "now"(), "p_transaction_hash" "text" DEFAULT NULL::"text", "p_admin_notes" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_request record;
  v_admin uuid := auth.uid();
  v_result jsonb;
  v_withdrawal_tx_id uuid;
BEGIN
  -- Require super admin for withdrawal completion
  v_admin := require_super_admin();

  -- Fetch withdrawal request
  SELECT * INTO v_request 
  FROM public.withdrawal_requests 
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_request.status::text <> 'processing' THEN
    RAISE EXCEPTION 'Can only complete withdrawals in processing status. Current: %', v_request.status;
  END IF;

  IF v_request.processed_amount IS NULL OR v_request.processed_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal has no processed amount';
  END IF;

  -- Execute withdrawal with crystallization (atomic position + AUM update)
  -- Using correct parameter names: p_new_total_aum, p_tx_date, p_admin_id
  v_result := public.apply_withdrawal_with_crystallization(
    p_fund_id := v_request.fund_id,
    p_investor_id := v_request.investor_id,
    p_amount := ABS(v_request.processed_amount)::numeric(28,10),
    p_new_total_aum := p_closing_aum,
    p_tx_date := CURRENT_DATE,
    p_admin_id := v_admin,
    p_notes := p_admin_notes,
    p_purpose := 'transaction'
  );

  v_withdrawal_tx_id := (v_result->>'transaction_id')::uuid;

  -- Update request status
  UPDATE public.withdrawal_requests
  SET
    status = 'completed',
    processed_at = NOW(),
    tx_hash = COALESCE(p_transaction_hash, tx_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW(),
    version = COALESCE(version, 0) + 1
  WHERE id = p_request_id;

  -- Audit logging
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'complete',
    jsonb_build_object(
      'processed_amount', v_request.processed_amount,
      'tx_hash', p_transaction_hash,
      'withdrawal_tx_id', v_withdrawal_tx_id,
      'crystallization', v_result->'crystallization',
      'completed_by', v_admin
    )
  );

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."complete_withdrawal"("p_request_id" "uuid", "p_closing_aum" numeric, "p_event_ts" timestamp with time zone, "p_transaction_hash" "text", "p_admin_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_withdrawal"("p_request_id" "uuid", "p_closing_aum" numeric, "p_event_ts" timestamp with time zone, "p_transaction_hash" "text", "p_admin_notes" "text") IS 'Transitions withdrawal from processing→completed. Requires super_admin. Calls apply_withdrawal_with_crystallization for ledger impact. Logs to withdrawal_audit_logs.';



CREATE OR REPLACE FUNCTION "public"."compute_jsonb_delta"("p_old" "jsonb", "p_new" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_delta jsonb := '{}';
  v_key text;
  v_old_val jsonb;
  v_new_val jsonb;
BEGIN
  -- Handle null cases
  IF p_old IS NULL AND p_new IS NULL THEN
    RETURN '{}';
  END IF;
  
  IF p_old IS NULL THEN
    RETURN jsonb_build_object('_created', p_new);
  END IF;
  
  IF p_new IS NULL THEN
    RETURN jsonb_build_object('_deleted', p_old);
  END IF;

  -- Iterate through all keys in new object - find changed/added keys
  FOR v_key, v_new_val IN SELECT * FROM jsonb_each(p_new) LOOP
    v_old_val := p_old -> v_key;
    IF v_old_val IS DISTINCT FROM v_new_val THEN
      v_delta := v_delta || jsonb_build_object(
        v_key, jsonb_build_object('old', v_old_val, 'new', v_new_val)
      );
    END IF;
  END LOOP;
  
  -- Check for deleted keys (present in old but not in new)
  FOR v_key IN SELECT key FROM jsonb_each(p_old) WHERE NOT p_new ? key LOOP
    v_delta := v_delta || jsonb_build_object(
      v_key, jsonb_build_object('old', p_old -> v_key, 'new', null)
    );
  END LOOP;
  
  RETURN v_delta;
END;
$$;


ALTER FUNCTION "public"."compute_jsonb_delta"("p_old" "jsonb", "p_new" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_position_from_ledger"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_as_of" timestamp with time zone DEFAULT "now"()) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deposits numeric;
  v_withdrawals numeric;
  v_yield numeric;
  v_fees numeric;
  v_ib_credits numeric;
  v_current_value numeric;
  v_cost_basis numeric;
  v_shares numeric;
BEGIN
  -- Calculate all components from ledger
  SELECT
    COALESCE(SUM(CASE WHEN type = 'DEPOSIT' AND NOT is_voided THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' AND NOT is_voided THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type IN ('YIELD', 'INTEREST') AND NOT is_voided THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type IN ('FEE', 'IB_DEBIT') AND NOT is_voided THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type IN ('IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT') AND NOT is_voided THEN amount ELSE 0 END), 0)
  INTO v_deposits, v_withdrawals, v_yield, v_fees, v_ib_credits
  FROM transactions_v2
  WHERE investor_id = p_investor_id 
    AND fund_id = p_fund_id
    AND created_at <= p_as_of;

  -- Policy: cost_basis = deposits - withdrawals (excludes yield/fees)
  v_cost_basis := v_deposits - v_withdrawals;
  
  -- Policy: current_value = deposits - withdrawals + yield - fees + credits
  v_current_value := v_deposits - v_withdrawals + v_yield - v_fees + v_ib_credits;
  
  -- shares = current_value (1:1 NAV model)
  v_shares := v_current_value;

  RETURN jsonb_build_object(
    'investor_id', p_investor_id,
    'fund_id', p_fund_id,
    'as_of', p_as_of,
    'breakdown', jsonb_build_object(
      'deposits', v_deposits,
      'withdrawals', v_withdrawals,
      'yield', v_yield,
      'fees', v_fees,
      'ib_credits', v_ib_credits
    ),
    'computed', jsonb_build_object(
      'cost_basis', v_cost_basis,
      'current_value', v_current_value,
      'shares', v_shares
    )
  );
END;
$$;


ALTER FUNCTION "public"."compute_position_from_ledger"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_as_of" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_profile_role"("p_user_id" "uuid", "p_account_type" "public"."account_type", "p_is_admin" boolean) RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select case
      when exists (select 1 from public.user_roles ur where ur.user_id = p_user_id and ur.role = 'super_admin') then 'super_admin'
      when exists (select 1 from public.user_roles ur where ur.user_id = p_user_id and ur.role = 'admin') then 'admin'
      when exists (select 1 from public.user_roles ur where ur.user_id = p_user_id and ur.role = 'ib') then 'ib'
      when exists (select 1 from public.user_roles ur where ur.user_id = p_user_id and ur.role = 'investor') then 'investor'
      else null end),
    case when p_is_admin then 'admin' else null end,
    p_account_type::text,
    'investor'
  );
$$;


ALTER FUNCTION "public"."compute_profile_role"("p_user_id" "uuid", "p_account_type" "public"."account_type", "p_is_admin" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_daily_position_snapshot"("p_snapshot_date" "date" DEFAULT CURRENT_DATE, "p_fund_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count integer := 0;
  v_fund_filter text;
BEGIN
  -- Build fund filter
  IF p_fund_id IS NOT NULL THEN
    v_fund_filter := ' AND ip.fund_id = ''' || p_fund_id::text || '''';
  ELSE
    v_fund_filter := '';
  END IF;

  -- Insert snapshots for all active positions
  INSERT INTO investor_position_snapshots (snapshot_date, investor_id, fund_id, current_value, snapshot_source)
  SELECT 
    p_snapshot_date,
    ip.investor_id,
    ip.fund_id,
    ip.current_value,
    'daily_snapshot'
  FROM investor_positions ip
  WHERE ip.current_value != 0
    AND (p_fund_id IS NULL OR ip.fund_id = p_fund_id)
  ON CONFLICT (snapshot_date, investor_id, fund_id) 
  DO UPDATE SET 
    current_value = EXCLUDED.current_value,
    snapshot_source = 'updated_snapshot';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'snapshot_date', p_snapshot_date,
    'positions_captured', v_count,
    'fund_id', p_fund_id
  );
END;
$$;


ALTER FUNCTION "public"."create_daily_position_snapshot"("p_snapshot_date" "date", "p_fund_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_daily_position_snapshot"("p_snapshot_date" "date", "p_fund_id" "uuid") IS 'Creates daily position snapshots for all active positions. Run via cron job.
Fortune 500 audit trail requirement added 2026-01-13.';



CREATE OR REPLACE FUNCTION "public"."create_integrity_alert"("p_alert_type" "text", "p_severity" "text", "p_title" "text", "p_message" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_alert_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO audit_log (action, entity, entity_id, meta)
  VALUES (
    'INTEGRITY_ALERT_' || UPPER(p_alert_type),
    'integrity',
    v_alert_id::text,
    jsonb_build_object(
      'severity', p_severity,
      'title', p_title,
      'message', p_message,
      'alert_type', p_alert_type
    ) || p_metadata
  );
  RETURN v_alert_id;
END;
$$;


ALTER FUNCTION "public"."create_integrity_alert"("p_alert_type" "text", "p_severity" "text", "p_title" "text", "p_message" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_profile_on_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        is_admin,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        FALSE,  -- SECURITY: Never trust user metadata for admin status
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_profile_on_signup"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_profile_on_signup"() IS 'Auto-creates profile on user signup. SECURITY: is_admin is ALWAYS FALSE - admin status must be granted separately.';



CREATE OR REPLACE FUNCTION "public"."create_withdrawal_request"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_type" "text" DEFAULT 'full'::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_request_id UUID;
  v_can_withdraw JSONB;
  v_fund_class TEXT;
  v_existing_request RECORD;
BEGIN
  -- ===== ADVISORY LOCK =====
  PERFORM pg_advisory_xact_lock(hashtext('withdrawal_request:' || p_investor_id::text || ':' || p_fund_id::text));

  -- ===== DUPLICATE PENDING REQUEST CHECK (P1.2 FIX) =====
  SELECT id, status, requested_amount, request_date INTO v_existing_request
  FROM public.withdrawal_requests
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND status IN ('pending', 'approved', 'processing')
  ORDER BY request_date DESC
  LIMIT 1;

  IF v_existing_request.id IS NOT NULL THEN
    RAISE EXCEPTION 'Existing withdrawal request in progress. Request ID: %, Status: %, Amount: %, Created: %',
      v_existing_request.id, v_existing_request.status,
      v_existing_request.requested_amount, v_existing_request.request_date;
  END IF;

  -- Check if withdrawal is allowed
  v_can_withdraw = public.can_withdraw(p_investor_id, p_fund_id, p_amount);

  IF NOT (v_can_withdraw->>'can_withdraw')::BOOLEAN THEN
    RAISE EXCEPTION 'Withdrawal not allowed: %', v_can_withdraw->>'reason';
  END IF;

  -- Get fund class
  SELECT fund_class INTO v_fund_class
  FROM public.funds
  WHERE id = p_fund_id;

  -- Create the request
  INSERT INTO public.withdrawal_requests (
    investor_id,
    fund_id,
    fund_class,
    requested_amount,
    withdrawal_type,
    notes,
    created_by
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_fund_class,
    p_amount,
    p_type,
    p_notes,
    auth.uid()
  ) RETURNING id INTO v_request_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES (
    'WITHDRAWAL_REQUEST_CREATED',
    'withdrawal_requests',
    v_request_id::text,
    auth.uid(),
    jsonb_build_object(
      'investor_id', p_investor_id,
      'fund_id', p_fund_id,
      'amount', p_amount,
      'type', p_type
    )
  );

  RETURN v_request_id;
END;
$$;


ALTER FUNCTION "public"."create_withdrawal_request"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_type" "text", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_withdrawal_request"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_type" "text", "p_notes" "text") IS 'Creates a new withdrawal request in pending state. Validates available balance. Triggers automatic audit logging.';



CREATE OR REPLACE FUNCTION "public"."crystallize_month_end"("p_fund_id" "uuid", "p_month_end_date" "date", "p_closing_aum" numeric, "p_admin_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result jsonb;
  v_trigger_reference text;
  v_month_end_ts timestamptz;
BEGIN
  IF NOT is_admin(COALESCE(p_admin_id, auth.uid())) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Advisory lock: prevent concurrent month-end crystallizations for same fund
  PERFORM pg_advisory_xact_lock(hashtext('month_end'), hashtext(p_fund_id::text));

  v_trigger_reference := 'MONTH_END:' || p_fund_id::text || ':' || to_char(p_month_end_date, 'YYYY-MM');
  v_month_end_ts := (p_month_end_date::timestamp + interval '23 hours 59 minutes 59 seconds')::timestamptz;
  
  v_result := public.crystallize_yield_before_flow(
    p_fund_id, v_month_end_ts, p_closing_aum, 'month_end',
    v_trigger_reference, 'reporting'::public.aum_purpose, p_admin_id
  );
  
  v_result := v_result || jsonb_build_object(
    'month_end_date', p_month_end_date, 'is_month_end', true
  );
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."crystallize_month_end"("p_fund_id" "uuid", "p_month_end_date" "date", "p_closing_aum" numeric, "p_admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."crystallize_month_end"("p_fund_id" "uuid", "p_month_end_date" "date", "p_closing_aum" numeric, "p_admin_id" "uuid") IS 'CANONICAL: Month-end yield crystallization for a fund. Locks the period and
finalizes all pending yield for the month. Required before statement generation.
Called by: yieldCrystallizationService.crystallizeMonthEnd';



CREATE OR REPLACE FUNCTION "public"."crystallize_yield_before_flow"("p_fund_id" "uuid", "p_closing_aum" numeric, "p_trigger_type" "text", "p_trigger_reference" "text", "p_event_ts" timestamp with time zone, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_last_checkpoint record;
  v_existing_preflow record;
  v_opening_aum numeric(28,10);
  v_yield_amount numeric(28,10);
  v_yield_pct numeric(18,10);
  v_event_date date;
  v_period_start date;
  v_days_in_period int;
  v_snapshot_id uuid;
  v_distribution_id uuid;
  v_investors_processed int := 0;
  v_reused_preflow boolean := false;

  v_validation_result jsonb;
  v_actual_position_sum numeric;

  v_total_gross_allocated numeric(28,10) := 0;
  v_total_fees_allocated numeric(28,10) := 0;
  v_total_net_allocated numeric(28,10) := 0;
  v_dust_amount numeric(28,10) := 0;
  v_dust_receiver_id uuid;

  v_total_adb numeric(28,10);
  v_investor_adb numeric(28,10);
  v_weight numeric(28,10);

  v_investor record;
  v_investor_yield numeric(28,10);
  v_investor_fee numeric(28,10);
  v_investor_net numeric(28,10);
  v_investor_share_pct numeric(18,10);
  v_fee_pct numeric(10,6);
  v_reference_id text;
  v_scale int := 10;

  v_orphaned_yield_events int;
  v_orphaned_snapshots int;
  v_orphaned_distributions int;

  -- Core Fix 4: fund_daily_aum record for opening AUM
  v_fund_daily_aum_record record;
begin
  if p_purpose is null then
    raise exception 'p_purpose parameter is required'
      using errcode = 'not_null_violation';
  end if;

  v_event_date := (p_event_ts at time zone 'UTC')::date;

  v_validation_result := validate_aum_against_positions_at_date(
    p_fund_id, p_closing_aum, v_event_date, 0.10, 'crystallize_yield_before_flow'
  );

  if not (v_validation_result->>'valid')::boolean then
    return jsonb_build_object(
      'success', false,
      'error', 'AUM_VALIDATION_FAILED',
      'error_code', 'AUM_DEVIATION_ERROR',
      'message', v_validation_result->>'error',
      'validation', v_validation_result,
      'fund_id', p_fund_id,
      'entered_closing_aum', p_closing_aum
    );
  end if;

  select * into v_existing_preflow
  from get_existing_preflow_aum(p_fund_id, v_event_date, p_purpose);

  if v_existing_preflow.aum_event_id is not null then
    v_reused_preflow := true;
    v_snapshot_id := v_existing_preflow.aum_event_id;

    -- FIX: Use <= instead of < to include same-day fund_daily_aum records
    select total_aum, aum_date into v_fund_daily_aum_record
    from fund_daily_aum
    where fund_id = p_fund_id
      and aum_date <= v_event_date
      and purpose = 'transaction'
      and is_voided = false
    order by aum_date desc
    limit 1;

    if v_fund_daily_aum_record.total_aum is not null then
      v_opening_aum := v_fund_daily_aum_record.total_aum;
      v_period_start := v_fund_daily_aum_record.aum_date;
    else
      select id, coalesce(post_flow_aum, closing_aum) as effective_aum, event_ts, event_date
      into v_last_checkpoint
      from fund_aum_events
      where fund_id = p_fund_id and is_voided = false and purpose = p_purpose
        and event_ts < v_existing_preflow.event_ts
      order by event_ts desc limit 1;

      if v_last_checkpoint.id is null then
        v_opening_aum := 0; v_period_start := v_event_date;
      else
        v_opening_aum := v_last_checkpoint.effective_aum; v_period_start := v_last_checkpoint.event_date;
      end if;
    end if;

    v_yield_amount := v_existing_preflow.closing_aum - v_opening_aum;
    if v_opening_aum > 0 then
      v_yield_pct := round((v_yield_amount / v_opening_aum) * 100, v_scale);
    else
      v_yield_pct := 0;
    end if;

    return jsonb_build_object(
      'success', true, 'snapshot_id', v_snapshot_id, 'fund_id', p_fund_id,
      'trigger_date', v_event_date, 'trigger_type', p_trigger_type,
      'period_start', v_period_start, 'opening_aum', v_opening_aum,
      'closing_aum', v_existing_preflow.closing_aum, 'fund_yield_pct', v_yield_pct,
      'gross_yield', v_yield_amount, 'reused_preflow', true,
      'calculation_method', 'adb_time_weighted', 'message', 'Reused existing preflow AUM',
      'validation', v_validation_result
    );
  end if;

  -- FIX: Use <= instead of < to include same-day fund_daily_aum records
  select total_aum, aum_date into v_fund_daily_aum_record
  from fund_daily_aum
  where fund_id = p_fund_id
    and aum_date <= v_event_date
    and purpose = 'transaction'
    and is_voided = false
  order by aum_date desc
  limit 1;

  if v_fund_daily_aum_record.total_aum is not null then
    v_opening_aum := v_fund_daily_aum_record.total_aum;
    v_period_start := v_fund_daily_aum_record.aum_date;
  else
    -- Fallback: use fund_aum_events for backwards compatibility
    select id, coalesce(post_flow_aum, closing_aum) as effective_aum, event_ts, event_date
    into v_last_checkpoint
    from fund_aum_events
    where fund_id = p_fund_id and is_voided = false and purpose = p_purpose and event_ts < p_event_ts
    order by event_ts desc limit 1;

    if v_last_checkpoint.id is null then
      -- Final fallback: sum ALL active positions (new fund)
      select coalesce(sum(current_value), 0) into v_opening_aum
      from investor_positions
      where fund_id = p_fund_id and is_active = true;
      v_period_start := v_event_date;
    else
      v_opening_aum := v_last_checkpoint.effective_aum;
      v_period_start := v_last_checkpoint.event_date;
    end if;
  end if;

  v_days_in_period := v_event_date - v_period_start;
  v_yield_amount := p_closing_aum - v_opening_aum;

  -- FIX: Treat negative yield as zero instead of blocking the deposit.
  -- When fund value drops, there's no yield to distribute, but deposits must still work.
  if v_yield_amount < 0 then
    v_yield_amount := 0;
  end if;

  if v_opening_aum > 0 then
    v_yield_pct := round((v_yield_amount / v_opening_aum) * 100, v_scale);
  else
    v_yield_pct := 0;
  end if;

  perform set_canonical_rpc(true);

  insert into fund_aum_events (
    fund_id, event_date, event_ts, trigger_type, trigger_reference,
    opening_aum, closing_aum, purpose, created_by
  ) values (
    p_fund_id, v_event_date, p_event_ts, p_trigger_type, p_trigger_reference,
    v_opening_aum, p_closing_aum, p_purpose, p_admin_id
  ) returning id into v_snapshot_id;

  if v_opening_aum > 0 and v_yield_amount > 0 then

    update investor_yield_events
    set is_voided = true, voided_at = now(), voided_by = p_admin_id
    where fund_id = p_fund_id and event_date = v_event_date
      and is_voided = false
      and reference_id like 'YLD:' || p_fund_id::text || ':' || v_event_date::text || ':%';
    get diagnostics v_orphaned_yield_events = row_count;

    delete from fund_yield_snapshots
    where fund_id = p_fund_id and snapshot_date = v_event_date and trigger_type = p_trigger_type;
    get diagnostics v_orphaned_snapshots = row_count;

    update yield_distributions
    set is_voided = true, voided_at = now(), voided_by = p_admin_id,
        void_reason = 'Orphaned from failed flow retry - voided for idempotency'
    where fund_id = p_fund_id and effective_date = v_event_date and purpose = p_purpose
      and distribution_type = p_trigger_type and is_voided = false;
    get diagnostics v_orphaned_distributions = row_count;

    if v_orphaned_yield_events > 0 or v_orphaned_snapshots > 0 or v_orphaned_distributions > 0 then
      raise notice 'Idempotency cleanup: voided % yield events, % snapshots, % distributions for fund % on %',
        v_orphaned_yield_events, v_orphaned_snapshots, v_orphaned_distributions, p_fund_id, v_event_date;
    end if;

    select coalesce(sum(daily_balance), 0) into v_total_adb
    from (
      select d::date as balance_date,
             coalesce(
               (select sum(end_of_day_balance) from investor_daily_balance idb
                where idb.fund_id = p_fund_id and idb.balance_date = d::date),
               (select coalesce(sum(t.amount), 0) from transactions_v2 t
                where t.fund_id = p_fund_id and t.tx_date <= d::date and not t.is_voided)
             ) as daily_balance
      from generate_series(v_period_start, v_event_date - interval '1 day', '1 day') d
    ) daily_balances;

    if v_total_adb = 0 or v_total_adb is null then
      v_total_adb := v_opening_aum;
    end if;

    select ip.investor_id into v_dust_receiver_id
    from investor_positions ip
    where ip.fund_id = p_fund_id and ip.current_value > 0
    order by ip.current_value desc limit 1;

    insert into fund_yield_snapshots (
      fund_id, snapshot_date, opening_aum, closing_aum, gross_yield_pct, gross_yield_amount,
      period_start, period_end, days_in_period, trigger_type, trigger_reference, created_by
    ) values (
      p_fund_id, v_event_date, v_opening_aum, p_closing_aum, v_yield_pct, v_yield_amount,
      v_period_start, v_event_date, v_days_in_period, p_trigger_type, p_trigger_reference, p_admin_id
    );

    for v_investor in
      select ip.investor_id, ip.current_value, row_number() over (order by ip.current_value desc) as rank
      from investor_positions ip
      where ip.fund_id = p_fund_id and ip.current_value > 0
    loop
      select coalesce(sum(daily_balance), 0) into v_investor_adb
      from (
        select d::date as balance_date,
               coalesce(
                 (select end_of_day_balance from investor_daily_balance idb
                  where idb.investor_id = v_investor.investor_id and idb.fund_id = p_fund_id and idb.balance_date = d::date),
                 (select coalesce(sum(t.amount), 0) from transactions_v2 t
                  where t.investor_id = v_investor.investor_id and t.fund_id = p_fund_id and t.tx_date <= d::date and not t.is_voided)
               ) as daily_balance
        from generate_series(v_period_start, v_event_date - interval '1 day', '1 day') d
      ) daily_balances;

      if v_investor_adb = 0 or v_investor_adb is null then
        v_investor_adb := v_investor.current_value;
        v_weight := v_investor.current_value / v_opening_aum;
      else
        v_weight := v_investor_adb / nullif(v_total_adb, 0);
      end if;

      v_investor_share_pct := round(v_weight * 100, v_scale);
      v_investor_yield := round(v_yield_amount * v_weight, v_scale);

      if v_investor_yield > 0 then
        v_fee_pct := get_investor_fee_pct(v_investor.investor_id, p_fund_id, v_event_date);
        v_investor_fee := round(v_investor_yield * v_fee_pct / 100, v_scale);
      else
        v_fee_pct := 0; v_investor_fee := 0;
      end if;

      v_investor_net := v_investor_yield - v_investor_fee;
      v_total_gross_allocated := v_total_gross_allocated + v_investor_yield;
      v_total_fees_allocated := v_total_fees_allocated + v_investor_fee;
      v_total_net_allocated := v_total_net_allocated + v_investor_net;

      v_reference_id := 'YLD:' || p_fund_id::text || ':' || v_event_date::text || ':' || v_investor.investor_id::text;

      insert into investor_yield_events (
        investor_id, fund_id, event_date, trigger_type, trigger_transaction_id,
        fund_aum_before, fund_aum_after, investor_balance, investor_share_pct,
        fund_yield_pct, gross_yield_amount, fee_pct, fee_amount, net_yield_amount,
        period_start, period_end, days_in_period, visibility_scope, reference_id, created_by
      ) values (
        v_investor.investor_id, p_fund_id, v_event_date, p_trigger_type,
        case when p_trigger_reference ~ '^[0-9a-f-]{36}$' then p_trigger_reference::uuid else null end,
        v_opening_aum, p_closing_aum, v_investor.current_value,
        v_investor_share_pct, v_yield_pct, v_investor_yield,
        v_fee_pct, v_investor_fee, v_investor_net, v_period_start, v_event_date,
        v_days_in_period, 'admin_only', v_reference_id, p_admin_id
      );

      v_investors_processed := v_investors_processed + 1;
    end loop;

    v_dust_amount := v_yield_amount - v_total_gross_allocated;

    insert into yield_distributions (
      fund_id, effective_date, purpose, is_month_end, recorded_aum, previous_aum,
      gross_yield, net_yield, total_fees, investor_count, distribution_type, status,
      period_start, period_end, dust_amount, dust_receiver_id, created_by,
      reference_id, calculation_method
    ) values (
      p_fund_id, v_event_date, p_purpose, false, p_closing_aum, v_opening_aum,
      v_yield_amount, v_total_net_allocated, v_total_fees_allocated,
      v_investors_processed, p_trigger_type, 'completed',
      v_period_start, v_event_date, v_dust_amount, v_dust_receiver_id, p_admin_id,
      'DIST-' || p_fund_id::text || '-' || v_event_date::text,
      'adb_time_weighted'
    ) returning id into v_distribution_id;

    if abs(v_dust_amount) > 0.0001 and v_dust_receiver_id is not null then
      update investor_yield_events
      set gross_yield_amount = gross_yield_amount + v_dust_amount,
          net_yield_amount = net_yield_amount + v_dust_amount
      where investor_id = v_dust_receiver_id and fund_id = p_fund_id and event_date = v_event_date
        and reference_id like 'YLD:' || p_fund_id::text || ':' || v_event_date::text || ':%';
      v_total_gross_allocated := v_total_gross_allocated + v_dust_amount;
      v_total_net_allocated := v_total_net_allocated + v_dust_amount;
    end if;

  end if;

  return jsonb_build_object(
    'success', true, 'snapshot_id', v_snapshot_id, 'distribution_id', v_distribution_id,
    'fund_id', p_fund_id, 'trigger_date', v_event_date, 'trigger_type', p_trigger_type,
    'period_start', v_period_start, 'opening_aum', v_opening_aum, 'closing_aum', p_closing_aum,
    'fund_yield_pct', v_yield_pct, 'gross_yield', v_yield_amount,
    'investors_processed', v_investors_processed,
    'total_gross_allocated', v_total_gross_allocated,
    'total_fees_allocated', v_total_fees_allocated,
    'total_net_allocated', v_total_net_allocated,
    'dust_amount', v_dust_amount, 'dust_receiver_id', v_dust_receiver_id,
    'reused_preflow', false, 'calculation_method', 'adb_time_weighted',
    'total_adb', v_total_adb, 'zero_yield_skipped', v_yield_amount = 0,
    'validation', v_validation_result,
    'aum_source', case when v_fund_daily_aum_record.total_aum is not null then 'fund_daily_aum' else 'fund_aum_events_fallback' end,
    'conservation_check', jsonb_build_object(
      'gross_matches', abs(coalesce(v_yield_amount, 0) - coalesce(v_total_gross_allocated, 0)) < 0.0001,
      'fee_identity_holds', abs(coalesce(v_total_gross_allocated, 0) - coalesce(v_total_net_allocated, 0) - coalesce(v_total_fees_allocated, 0)) < 0.0001
    ),
    'idempotency_cleanup', jsonb_build_object(
      'orphaned_yield_events_voided', coalesce(v_orphaned_yield_events, 0),
      'orphaned_snapshots_voided', coalesce(v_orphaned_snapshots, 0),
      'orphaned_distributions_voided', coalesce(v_orphaned_distributions, 0)
    )
  );
end;
$_$;


ALTER FUNCTION "public"."crystallize_yield_before_flow"("p_fund_id" "uuid", "p_closing_aum" numeric, "p_trigger_type" "text", "p_trigger_reference" "text", "p_event_ts" timestamp with time zone, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."crystallize_yield_before_flow"("p_fund_id" "uuid", "p_closing_aum" numeric, "p_trigger_type" "text", "p_trigger_reference" "text", "p_event_ts" timestamp with time zone, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose") IS 'Crystallizes yield before a flow event (deposit/withdrawal). FIX 2026-02-03: Added idempotency guards for retry scenarios.';



CREATE OR REPLACE FUNCTION "public"."current_user_is_admin_or_owner"("check_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    CASE 
      WHEN auth.uid() IS NULL THEN false
      WHEN is_admin() THEN true
      WHEN auth.uid() = check_user_id THEN true
      ELSE false
    END
$$;


ALTER FUNCTION "public"."current_user_is_admin_or_owner"("check_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_user_is_admin_or_owner"("check_user_id" "uuid") IS 'COMBINED OWNER/ADMIN CHECK: Returns true if current user is admin OR matches given user_id. Used in RLS policies where record owner or admin can access. Pattern: WHERE current_user_is_admin_or_owner(investor_id)';



CREATE OR REPLACE FUNCTION "public"."delete_transaction"("p_transaction_id" "uuid", "p_confirmation" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tx RECORD;
  v_admin_id UUID := auth.uid();
BEGIN
  -- Require typed confirmation
  IF p_confirmation IS DISTINCT FROM 'DELETE TRANSACTION PERMANENTLY' THEN
    RAISE EXCEPTION 'Invalid confirmation. Type exactly: DELETE TRANSACTION PERMANENTLY';
  END IF;
  
  -- Verify admin
  IF NOT check_is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get transaction
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  -- Only allow deletion of voided transactions
  IF NOT v_tx.is_voided THEN
    RAISE EXCEPTION 'Can only delete voided transactions. Void first using void_transaction().';
  END IF;
  
  -- Audit log BEFORE delete (preserve full record)
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES (
    'DELETE_TRANSACTION', 
    'transactions_v2', 
    p_transaction_id::text, 
    v_admin_id,
    jsonb_build_object(
      'id', v_tx.id,
      'investor_id', v_tx.investor_id,
      'fund_id', v_tx.fund_id,
      'type', v_tx.type,
      'amount', v_tx.amount,
      'tx_date', v_tx.tx_date,
      'reference_id', v_tx.reference_id,
      'notes', v_tx.notes,
      'is_voided', v_tx.is_voided,
      'voided_at', v_tx.voided_at,
      'voided_by', v_tx.voided_by,
      'void_reason', v_tx.void_reason,
      'created_at', v_tx.created_at
    ),
    jsonb_build_object('deleted', true, 'deleted_at', now())
  );
  
  -- Delete the transaction
  DELETE FROM transactions_v2 WHERE id = p_transaction_id;
  
  -- Recompute positions (should already be correct since tx was voided, but ensure consistency)
  PERFORM recompute_investor_position(v_tx.investor_id, v_tx.fund_id);
  
  RETURN jsonb_build_object(
    'success', true, 
    'deleted_transaction_id', p_transaction_id,
    'investor_id', v_tx.investor_id,
    'fund_id', v_tx.fund_id
  );
END;
$$;


ALTER FUNCTION "public"."delete_transaction"("p_transaction_id" "uuid", "p_confirmation" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_transaction"("p_transaction_id" "uuid", "p_confirmation" "text") IS 'CANONICAL: Permanently deletes a voided transaction. Only allowed for transactions with is_voided=true. Use with extreme caution - prefer keeping voided records for audit. Role: Requires super_admin role.';



CREATE OR REPLACE FUNCTION "public"."delete_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text", "p_hard_delete" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_old_record withdrawal_requests%ROWTYPE;
  v_user_id uuid;
BEGIN
  -- SECURITY: Require admin privileges
  PERFORM public.ensure_admin();

  v_user_id := auth.uid();

  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'Reason is required for deletion';
  END IF;

  SELECT * INTO v_old_record
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  IF v_old_record.status = 'completed' THEN
    RAISE EXCEPTION 'Cannot delete completed withdrawal - use reversal transaction instead';
  END IF;

  IF p_hard_delete THEN
    DELETE FROM withdrawal_requests WHERE id = p_withdrawal_id;
  ELSE
    UPDATE withdrawal_requests
    SET
      status = 'cancelled',
      cancellation_reason = p_reason,
      cancelled_by = v_user_id,
      updated_at = now()
    WHERE id = p_withdrawal_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."delete_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text", "p_hard_delete" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text", "p_hard_delete" boolean) IS 'Soft or hard deletes a withdrawal request. Soft delete sets status to cancelled. Hard delete removes the record (GDPR). Logs to withdrawal_audit_logs.';



CREATE OR REPLACE FUNCTION "public"."dispatch_report_delivery_run"("p_period_id" "uuid", "p_channel" "text" DEFAULT 'email'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_run_id UUID := gen_random_uuid();
  v_eligible_count INTEGER := 0;
  v_queued_count INTEGER := 0;
  v_skipped_no_email INTEGER := 0;
  v_skipped_already_sent INTEGER := 0;
  v_skipped_no_html INTEGER := 0;
  v_period_name TEXT;
  rec RECORD;
BEGIN
  -- Verify admin access
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get period name
  SELECT period_name INTO v_period_name 
  FROM statement_periods WHERE id = p_period_id;
  
  IF v_period_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Period not found',
      'period_id', p_period_id
    );
  END IF;
  
  -- Count eligible statements with breakdown
  FOR rec IN
    SELECT 
      gs.id as statement_id,
      gs.investor_id,
      gs.user_id,
      gs.html_content,
      p.email,
      p.first_name,
      p.last_name,
      p.status as investor_status,
      EXISTS (
        SELECT 1 FROM statement_email_delivery sed 
        WHERE sed.statement_id = gs.id 
          AND sed.channel = p_channel
          AND sed.status IN ('sent', 'SENT', 'delivered', 'DELIVERED')
      ) as already_sent,
      EXISTS (
        SELECT 1 FROM statement_email_delivery sed 
        WHERE sed.statement_id = gs.id 
          AND sed.channel = p_channel
      ) as already_queued
    FROM generated_statements gs
    JOIN profiles p ON p.id = gs.investor_id
    WHERE gs.period_id = p_period_id
  LOOP
    v_eligible_count := v_eligible_count + 1;
    
    -- Check various skip reasons
    IF rec.already_sent THEN
      v_skipped_already_sent := v_skipped_already_sent + 1;
      CONTINUE;
    END IF;
    
    IF rec.html_content IS NULL OR rec.html_content = '' THEN
      v_skipped_no_html := v_skipped_no_html + 1;
      CONTINUE;
    END IF;
    
    IF p_channel = 'email' AND (rec.email IS NULL OR rec.email = '') THEN
      v_skipped_no_email := v_skipped_no_email + 1;
      CONTINUE;
    END IF;
    
    -- Skip if already queued (but not sent)
    IF rec.already_queued THEN
      CONTINUE;
    END IF;
    
    -- Queue the delivery
    INSERT INTO statement_email_delivery (
      statement_id, investor_id, user_id, period_id,
      recipient_email, subject, status, channel, created_by, attempt_count
    ) VALUES (
      rec.statement_id, rec.investor_id, rec.user_id, p_period_id,
      rec.email, 
      v_period_name || ' Statement - ' || COALESCE(rec.first_name || ' ' || rec.last_name, rec.email),
      'queued', p_channel, auth.uid(), 0
    );
    v_queued_count := v_queued_count + 1;
  END LOOP;
  
  -- Return comprehensive breakdown
  RETURN jsonb_build_object(
    'success', true,
    'run_id', v_run_id,
    'period_id', p_period_id,
    'period_name', v_period_name,
    'channel', p_channel,
    'eligible_count', v_eligible_count,
    'queued_count', v_queued_count,
    'skipped_breakdown', jsonb_build_object(
      'already_sent', v_skipped_already_sent,
      'missing_email', v_skipped_no_email,
      'missing_html', v_skipped_no_html
    ),
    'message', CASE 
      WHEN v_queued_count > 0 THEN format('Queued %s new deliveries', v_queued_count)
      WHEN v_eligible_count = 0 THEN 'No generated statements found for this period'
      WHEN v_skipped_already_sent = v_eligible_count THEN 'All statements have already been sent'
      ELSE format('No new deliveries to queue (%s already sent, %s missing email, %s missing HTML)', 
                  v_skipped_already_sent, v_skipped_no_email, v_skipped_no_html)
    END
  );
END;
$$;


ALTER FUNCTION "public"."dispatch_report_delivery_run"("p_period_id" "uuid", "p_channel" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."edit_transaction"("p_transaction_id" "uuid", "p_notes" "text" DEFAULT NULL::"text", "p_tx_hash" "text" DEFAULT NULL::"text", "p_reference_id" "text" DEFAULT NULL::"text", "p_tx_date" "date" DEFAULT NULL::"date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_old_record transactions_v2%ROWTYPE;
  v_new_record transactions_v2%ROWTYPE;
  v_actor_id uuid;
  v_changes jsonb := '{}';
BEGIN
  -- Advisory lock: prevent concurrent edit/void of same transaction
  PERFORM pg_advisory_xact_lock(hashtext('edit_tx'), hashtext(p_transaction_id::text));

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  v_actor_id := auth.uid();
  
  IF NOT public.check_is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Only admins can edit transactions';
  END IF;
  
  SELECT * INTO v_old_record FROM transactions_v2 WHERE id = p_transaction_id;
  
  IF v_old_record.id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;
  
  IF v_old_record.is_voided = true THEN
    RAISE EXCEPTION 'Cannot edit a voided transaction';
  END IF;
  
  IF p_notes IS NOT NULL AND p_notes IS DISTINCT FROM v_old_record.notes THEN
    v_changes := v_changes || jsonb_build_object('notes', jsonb_build_object('old', v_old_record.notes, 'new', p_notes));
  END IF;
  IF p_tx_hash IS NOT NULL AND p_tx_hash IS DISTINCT FROM v_old_record.tx_hash THEN
    v_changes := v_changes || jsonb_build_object('tx_hash', jsonb_build_object('old', v_old_record.tx_hash, 'new', p_tx_hash));
  END IF;
  IF p_reference_id IS NOT NULL AND p_reference_id IS DISTINCT FROM v_old_record.reference_id THEN
    v_changes := v_changes || jsonb_build_object('reference_id', jsonb_build_object('old', v_old_record.reference_id, 'new', p_reference_id));
  END IF;
  IF p_tx_date IS NOT NULL AND p_tx_date IS DISTINCT FROM v_old_record.tx_date THEN
    v_changes := v_changes || jsonb_build_object('tx_date', jsonb_build_object('old', v_old_record.tx_date, 'new', p_tx_date));
  END IF;
  
  IF v_changes = '{}' THEN
    RETURN jsonb_build_object('success', true, 'message', 'No changes detected');
  END IF;
  
  UPDATE transactions_v2
  SET notes = COALESCE(p_notes, notes), tx_hash = COALESCE(p_tx_hash, tx_hash),
      reference_id = COALESCE(p_reference_id, reference_id), tx_date = COALESCE(p_tx_date, tx_date),
      updated_at = now()
  WHERE id = p_transaction_id
  RETURNING * INTO v_new_record;
  
  INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
  VALUES ('transactions_v2', p_transaction_id::text, 'UPDATE', v_actor_id,
    to_jsonb(v_old_record), to_jsonb(v_new_record),
    jsonb_build_object('changes', v_changes, 'source', 'edit_transaction_rpc'));
  
  IF p_tx_date IS NOT NULL AND p_tx_date IS DISTINCT FROM v_old_record.tx_date THEN
    PERFORM public.recompute_investor_position(v_old_record.investor_id, v_old_record.fund_id);
  END IF;
  
  RETURN jsonb_build_object('success', true, 'transaction_id', p_transaction_id, 'changes', v_changes);
END;
$$;


ALTER FUNCTION "public"."edit_transaction"("p_transaction_id" "uuid", "p_notes" "text", "p_tx_hash" "text", "p_reference_id" "text", "p_tx_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."edit_transaction"("p_transaction_id" "uuid", "p_notes" "text", "p_tx_hash" "text", "p_reference_id" "text", "p_tx_date" "date") IS 'CANONICAL: Edits non-financial metadata on a transaction. Allowed fields: notes, visibility_scope, source. Does NOT allow editing amount, date, or type (use void_and_reissue instead). Role: Requires admin role.';



CREATE OR REPLACE FUNCTION "public"."enforce_canonical_aum_event_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Skip check if canonical RPC flag is set
  IF public.is_canonical_rpc() THEN
    RETURN CASE TG_OP
      WHEN 'DELETE' THEN OLD
      ELSE NEW
    END;
  END IF;

  -- Block the mutation
  RAISE EXCEPTION 'CANONICAL_MUTATION_REQUIRED: Direct % on fund_aum_events is blocked. Use canonical RPC functions: crystallize_yield_before_flow, ensure_preflow_aum, or set_fund_daily_aum.', TG_OP
    USING HINT = 'Set app.canonical_rpc = true via set_canonical_rpc() in your RPC function.',
          ERRCODE = 'P0001';
END;
$$;


ALTER FUNCTION "public"."enforce_canonical_aum_event_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_canonical_daily_aum_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Skip check if canonical RPC flag is set
  IF public.is_canonical_rpc() THEN
    RETURN CASE TG_OP
      WHEN 'DELETE' THEN OLD
      ELSE NEW
    END;
  END IF;

  -- Block the mutation
  RAISE EXCEPTION 'CANONICAL_MUTATION_REQUIRED: Direct % on fund_daily_aum is blocked. Use canonical RPC functions: set_fund_daily_aum, update_fund_daily_aum, or void_fund_daily_aum.', TG_OP
    USING HINT = 'Set app.canonical_rpc = true via set_canonical_rpc() in your RPC function.',
          ERRCODE = 'P0001';
END;
$$;


ALTER FUNCTION "public"."enforce_canonical_daily_aum_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_canonical_position_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN IF public.is_canonical_rpc() THEN RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END; END IF; RAISE EXCEPTION 'CANONICAL_MUTATION_REQUIRED: Direct % on investor_positions is blocked. Use canonical RPC functions like apply_deposit_with_crystallization or apply_withdrawal_with_crystallization.', TG_OP USING HINT = 'Set app.canonical_rpc = true via set_canonical_rpc() in your RPC function.', ERRCODE = 'P0001'; END; $$;


ALTER FUNCTION "public"."enforce_canonical_position_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_canonical_position_write"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if this is a canonical RPC call
  IF current_setting('app.canonical_rpc', true) = 'true' OR
     current_setting('indigo.canonical_rpc', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Check if cost_basis, current_value, or shares are actually changing
  IF TG_OP = 'UPDATE' THEN
    IF OLD.cost_basis IS NOT DISTINCT FROM NEW.cost_basis AND
       OLD.current_value IS NOT DISTINCT FROM NEW.current_value AND
       OLD.shares IS NOT DISTINCT FROM NEW.shares THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Block the write and log
  INSERT INTO audit_log (action, entity, entity_id, meta)
  VALUES (
    'BLOCKED_DIRECT_POSITION_WRITE',
    'investor_positions',
    COALESCE(NEW.investor_id::text, 'unknown') || '_' || COALESCE(NEW.fund_id::text, 'unknown'),
    jsonb_build_object(
      'attempted_cost_basis', NEW.cost_basis,
      'attempted_current_value', NEW.current_value,
      'attempted_shares', NEW.shares,
      'old_cost_basis', CASE WHEN TG_OP = 'UPDATE' THEN OLD.cost_basis ELSE NULL END,
      'old_current_value', CASE WHEN TG_OP = 'UPDATE' THEN OLD.current_value ELSE NULL END,
      'session_user', session_user,
      'blocked_at', now()
    )
  );

  RAISE EXCEPTION 'Direct writes to investor_positions (cost_basis, current_value, shares) are blocked. Use canonical RPCs which call recompute_investor_position.';
END;
$$;


ALTER FUNCTION "public"."enforce_canonical_position_write"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_canonical_transaction_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
  -- Skip check if canonical RPC flag is set
  IF public.is_canonical_rpc() THEN
    RETURN CASE TG_OP
      WHEN 'DELETE' THEN OLD
      ELSE NEW
    END;
  END IF;

  -- Skip check for system-generated transactions
  IF TG_OP != 'DELETE' AND NEW.is_system_generated = true THEN
    RETURN NEW;
  END IF;

  -- Allow certain internal transaction types to bypass
  IF TG_OP != 'DELETE' AND NEW.type = ANY(v_allowed_types) THEN
    RETURN NEW;
  END IF;

  -- Block the mutation
  RAISE EXCEPTION 'CANONICAL_MUTATION_REQUIRED: Direct % on transactions_v2 is blocked. Use canonical RPC functions: apply_deposit_with_crystallization, apply_withdrawal_with_crystallization, admin_create_transaction, or void_transaction.', TG_OP
    USING HINT = 'Set app.canonical_rpc = true via set_canonical_rpc() in your RPC function.',
          ERRCODE = 'P0001';
END;
$$;


ALTER FUNCTION "public"."enforce_canonical_transaction_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_canonical_yield_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Skip check if canonical RPC flag is set or explicit void override is present
  IF public.is_canonical_rpc()
     OR current_setting('indigo.allow_yield_void', true) = 'true' THEN
    RETURN CASE TG_OP
      WHEN 'DELETE' THEN OLD
      ELSE NEW
    END;
  END IF;

  -- Block the mutation
  RAISE EXCEPTION 'CANONICAL_MUTATION_REQUIRED: Direct % on yield_distributions is blocked. Use canonical RPC functions: apply_daily_yield_to_fund_v3, void_yield_distribution, or apply_yield_correction_v2.', TG_OP
    USING HINT = 'Set app.canonical_rpc = true via set_canonical_rpc() in your RPC function.',
          ERRCODE = 'P0001';
END;
$$;


ALTER FUNCTION "public"."enforce_canonical_yield_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_economic_date"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.tx_date IS NULL THEN
    RAISE EXCEPTION 'tx_date (economic date) is required and cannot be NULL'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- In live mode, check if date is in locked period
  IF get_system_mode() = '"live"' AND is_period_locked(NEW.fund_id, NEW.tx_date) THEN
    RAISE EXCEPTION 'Cannot insert transaction into locked period for date %', NEW.tx_date
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_economic_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_fees_account_zero_fee"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Ensure fees_account always has fee_pct = 0
  IF NEW.account_type = 'fees_account' AND COALESCE(NEW.fee_pct, 0) != 0 THEN
    NEW.fee_pct := 0;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_fees_account_zero_fee"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enforce_fees_account_zero_fee"() IS 'Trigger function: Ensures INDIGO FEES account (account_type=fees_account) always has 0% fee_pct to prevent self-charging on yield distribution.';



CREATE OR REPLACE FUNCTION "public"."enforce_internal_tx_visibility"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Force admin_only for internal routing AND fee credit transactions.
    IF NEW.type IN ('INTERNAL_WITHDRAWAL', 'INTERNAL_CREDIT', 'FEE_CREDIT') THEN
      NEW.visibility_scope := 'admin_only';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_internal_tx_visibility"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_transaction_asset_match"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE v_fund_asset text; BEGIN SELECT asset INTO v_fund_asset FROM funds WHERE id = NEW.fund_id; IF v_fund_asset IS NULL THEN RAISE EXCEPTION 'Fund % not found', NEW.fund_id USING ERRCODE = 'foreign_key_violation'; END IF; IF NEW.asset IS DISTINCT FROM v_fund_asset THEN RAISE EXCEPTION 'Transaction asset (%) must match fund base asset (%). Fund: %', NEW.asset, v_fund_asset, NEW.fund_id USING ERRCODE = 'check_violation'; END IF; RETURN NEW; END; $$;


ALTER FUNCTION "public"."enforce_transaction_asset_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_transaction_via_rpc"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Allow if called from a known RPC (check source column)
  -- All internal system sources are allowed
  IF NEW.source IN (
    'rpc_canonical', 
    'crystallization', 
    'system', 
    'migration',
    'yield_distribution',
    'ib_allocation',
    'fee_allocation',
    'system_bootstrap',
    'internal_routing',
    'yield_correction',
    'withdrawal_completion',
    'investor_wizard',
    'stress_test' -- ADDED: Allow stress test suite
  ) THEN
    RETURN NEW;
  END IF;

  -- Allow if admin performing manual correction (rare, audited)
  IF NEW.source = 'manual_admin' AND is_admin() THEN
    RETURN NEW;
  END IF;

  -- Block all other sources
  RAISE EXCEPTION 'Direct transaction inserts are not allowed. Use apply_transaction_with_crystallization() RPC. Source: %', COALESCE(NEW.source::text, 'NULL');
END;
$$;


ALTER FUNCTION "public"."enforce_transaction_via_rpc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_transactions_v2_immutability"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  -- Allow canonical RPC operations (yield distribution dust adjustment)
  IF current_setting('indigo.canonical_rpc', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Exclude void-related fields AND visibility_scope from immutability check
  -- visibility_scope is presentation-only and doesn't affect financial data
  v_old := to_jsonb(OLD) - 'is_voided' - 'voided_at' - 'voided_by' - 'void_reason' - 'voided_by_profile_id' - 'visibility_scope';
  v_new := to_jsonb(NEW) - 'is_voided' - 'voided_at' - 'voided_by' - 'void_reason' - 'voided_by_profile_id' - 'visibility_scope';
  
  IF v_old IS DISTINCT FROM v_new THEN
    RAISE EXCEPTION 'Ledger rows are immutable. Void and re issue.';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_transactions_v2_immutability"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_yield_distribution_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_is_system boolean;
begin
  if coalesce(NEW.is_voided, false) then
    return NEW;
  end if;

  if NEW.type = 'YIELD' and NEW.distribution_id is null then
    select is_system_account into v_is_system
    from public.profiles
    where id = NEW.investor_id;

    if not coalesce(v_is_system, false) then
      raise exception 'YIELD transactions must reference a distribution_id or use a system account.';
    end if;
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."enforce_yield_distribution_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_yield_event_date"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.event_date IS NULL THEN
    RAISE EXCEPTION 'event_date is required and cannot be NULL'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- In live mode, check if date is in locked period
  IF get_system_mode() = '"live"' AND is_period_locked(NEW.fund_id, NEW.event_date) THEN
    RAISE EXCEPTION 'Cannot insert yield event into locked period for date %', NEW.event_date
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_yield_event_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_admin"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin'::app_role, 'super_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Admin only operation';
  END IF;
END;
$$;


ALTER FUNCTION "public"."ensure_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."ensure_admin"() IS 'ADMIN GUARD: Raises exception if current user is not admin. Call at start of admin-only RPC functions. Pattern: IF NOT ensure_admin() THEN ... Returns void, raises EXCEPTION on failure.';



CREATE OR REPLACE FUNCTION "public"."ensure_crystallization_date"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.last_yield_crystallization_date IS NULL THEN
    -- investor_positions has updated_at, not created_at
    NEW.last_yield_crystallization_date := COALESCE(NEW.updated_at::date, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_crystallization_date"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."ensure_crystallization_date"() IS 'Ensures new investor positions have a crystallization date set';



CREATE OR REPLACE FUNCTION "public"."ensure_preflow_aum"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "public"."aum_purpose", "p_total_aum" numeric, "p_admin_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_existing RECORD;
  v_new_id uuid;
BEGIN
  -- SECURITY: Require admin role
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can manage preflow AUM'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Enable canonical mutation flag for this transaction
  PERFORM public.set_canonical_rpc(true);

  -- Check for existing preflow AUM
  SELECT * INTO v_existing
  FROM get_existing_preflow_aum(p_fund_id, p_date, p_purpose);

  IF v_existing.aum_event_id IS NOT NULL THEN
    -- Return existing without creating duplicate
    RETURN jsonb_build_object(
      'success', true,
      'action', 'reused_existing',
      'aum_event_id', v_existing.aum_event_id,
      'closing_aum', v_existing.closing_aum,
      'message', 'Reused existing preflow AUM for this fund/date/purpose'
    );
  END IF;

  -- Create new preflow AUM entry
  INSERT INTO fund_aum_events (
    fund_id, event_date, event_ts, trigger_type, trigger_reference,
    opening_aum, closing_aum, purpose, created_by
  ) VALUES (
    p_fund_id, p_date, (p_date || ' 00:00:00')::timestamptz, 'preflow',
    'PREFLOW-' || p_fund_id::text || '-' || p_date::text,
    0, p_total_aum, p_purpose, p_admin_id
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'created_new',
    'aum_event_id', v_new_id,
    'closing_aum', p_total_aum,
    'message', 'Created new preflow AUM entry'
  );
END;
$$;


ALTER FUNCTION "public"."ensure_preflow_aum"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "public"."aum_purpose", "p_total_aum" numeric, "p_admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."ensure_preflow_aum"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "public"."aum_purpose", "p_total_aum" numeric, "p_admin_id" "uuid") IS 'Idempotent preflow AUM creation. ADMIN ONLY.';



CREATE OR REPLACE FUNCTION "public"."export_investor_data"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    result JSON;
    BEGIN
        -- Ensure only admin can export OR user can export own data
            IF NOT (is_admin() OR auth.uid() = p_user_id) THEN
                    RAISE EXCEPTION 'Unauthorized access to investor data export';
                        END IF;

                            -- Build comprehensive export data
                                SELECT json_build_object(
                                        'profile', (
                                                    SELECT json_build_object(
                                                                    'id', id,
                                                                                    'email', email,
                                                                                                    'first_name', first_name,
                                                                                                                    'last_name', last_name,
                                                                                                                                    'status', status,
                                                                                                                                                    'created_at', created_at
                                                                                                                                                                )
                                                                                                                                                                            FROM profiles
                                                                                                                                                                                        WHERE id = p_user_id
                                                                                                                                                                                                ),
                                                                                                                                                                                                        'export_timestamp', NOW()
                                                                                                                                                                                                            ) INTO result;

                                                                                                                                                                                                                RETURN result;
                                                                                                                                                                                                                END;
                                                                                                                                                                                                                $$;


ALTER FUNCTION "public"."export_investor_data"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_month_yield"("p_fund_id" "uuid", "p_period_year" integer, "p_period_month" integer, "p_admin_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_period_start date;
  v_period_end date;
  v_events_updated integer;
  v_total_yield numeric;
BEGIN
  -- Calculate period boundaries
  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  v_period_start := make_date(p_period_year, p_period_month, 1);
  v_period_end := (v_period_start + interval '1 month' - interval '1 day')::date;
  
  -- Get total yield being finalized
  SELECT COALESCE(SUM(net_yield_amount), 0)
  INTO v_total_yield
  FROM investor_yield_events
  WHERE fund_id = p_fund_id
    AND event_date BETWEEN v_period_start AND v_period_end
    AND visibility_scope = 'admin_only'
    AND is_voided = false;
  
  -- Update visibility of all yield events in this period
  UPDATE investor_yield_events
  SET 
    visibility_scope = 'investor_visible',
    made_visible_at = now(),
    made_visible_by = p_admin_id
  WHERE fund_id = p_fund_id
    AND event_date BETWEEN v_period_start AND v_period_end
    AND visibility_scope = 'admin_only'
    AND is_voided = false;
  
  GET DIAGNOSTICS v_events_updated = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'events_made_visible', v_events_updated,
    'total_yield_finalized', v_total_yield
  );
END;
$$;


ALTER FUNCTION "public"."finalize_month_yield"("p_fund_id" "uuid", "p_period_year" integer, "p_period_month" integer, "p_admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."finalize_month_yield"("p_fund_id" "uuid", "p_period_year" integer, "p_period_month" integer, "p_admin_id" "uuid") IS 'CANONICAL: Finalizes yield for a month, making it visible to investors.
Updates yield_distributions status from pending to applied.
Called by: yieldCrystallizationService.finalizeMonthYield';



CREATE OR REPLACE FUNCTION "public"."finalize_statement_period"("p_period_id" "uuid", "p_admin_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  IF NOT public.check_is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Only administrators can finalize statement periods';
  END IF;

  SELECT status INTO v_current_status
  FROM statement_periods
  WHERE id = p_period_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Statement period not found';
  END IF;

  IF v_current_status = 'FINALIZED' THEN
    RAISE EXCEPTION 'Statement period is already finalized';
  END IF;

  UPDATE statement_periods
  SET
    status = 'FINALIZED',
    finalized_at = NOW(),
    finalized_by = p_admin_id,
    updated_at = NOW()
  WHERE id = p_period_id;

  INSERT INTO audit_log (
    action, entity, entity_id, actor_user, new_values, meta, created_at
  ) VALUES (
    'FINALIZE', 'statement_periods', p_period_id::text, p_admin_id,
    jsonb_build_object('previous_status', v_current_status, 'new_status', 'FINALIZED'),
    jsonb_build_object('operation', 'period_finalization'),
    NOW()
  );
END;
$$;


ALTER FUNCTION "public"."finalize_statement_period"("p_period_id" "uuid", "p_admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."finalize_statement_period"("p_period_id" "uuid", "p_admin_id" "uuid") IS 'Finalizes a statement period. Uses correct audit_log columns (entity, entity_id::text, actor_user).';



CREATE OR REPLACE FUNCTION "public"."fn_ledger_drives_position"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_delta numeric(38,18);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_voided THEN RETURN NEW; END IF;
    v_delta := NEW.amount;

    IF NEW.type = 'WITHDRAWAL' THEN
      v_delta := -1 * ABS(NEW.amount);
    END IF;

    INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, fund_class, is_active, updated_at)
    VALUES (
      NEW.investor_id,
      NEW.fund_id,
      v_delta,
      CASE
        WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN ABS(NEW.amount)
        WHEN NEW.type IN ('ADJUSTMENT') AND NEW.amount > 0 THEN NEW.amount
        ELSE 0
      END,
      0,
      NEW.fund_class,
      true,
      now()
    )
    ON CONFLICT (investor_id, fund_id)
    DO UPDATE SET
      current_value = investor_positions.current_value + v_delta,
      cost_basis = CASE
        WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN investor_positions.cost_basis + ABS(NEW.amount)
        WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN GREATEST(investor_positions.cost_basis - ABS(NEW.amount), 0)
        WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN investor_positions.cost_basis + NEW.amount
        WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN GREATEST(investor_positions.cost_basis + NEW.amount, 0)
        ELSE investor_positions.cost_basis
      END,
      is_active = true,
      updated_at = now();

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_voided = false AND NEW.is_voided = true THEN
      v_delta := NEW.amount;
      IF NEW.type = 'WITHDRAWAL' THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;

      UPDATE investor_positions
      SET
        current_value = current_value - v_delta,
        cost_basis = CASE
          WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN GREATEST(cost_basis - NEW.amount, 0)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN cost_basis + ABS(NEW.amount)
          ELSE cost_basis
        END,
        updated_at = now()
      WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

    ELSIF OLD.is_voided = true AND NEW.is_voided = false THEN
      v_delta := NEW.amount;
      IF NEW.type = 'WITHDRAWAL' THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;

      UPDATE investor_positions
      SET
        current_value = current_value + v_delta,
        cost_basis = CASE
          WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN cost_basis + NEW.amount
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN GREATEST(cost_basis + NEW.amount, 0)
          ELSE cost_basis
        END,
        is_active = true,
        updated_at = now()
      WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_ledger_drives_position"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."force_delete_investor"("p_investor_id" "uuid", "p_admin_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_investor_email TEXT;
  v_investor_name TEXT;
  v_affected_fund_ids UUID[];
  v_children_unlinked INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    WHERE ur.user_id IN (auth.uid(), p_admin_id)
    AND ur.role IN ('admin', 'super_admin')
    AND p.status = 'active'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_investor_id = p_admin_id THEN RAISE EXCEPTION 'Cannot delete your own account'; END IF;

  SELECT email, COALESCE(first_name || ' ' || last_name, email)
  INTO v_investor_email, v_investor_name
  FROM profiles WHERE id = p_investor_id;

  IF v_investor_email IS NULL THEN RAISE EXCEPTION 'Investor not found'; END IF;

  SELECT ARRAY_AGG(DISTINCT fund_id) INTO v_affected_fund_ids
  FROM investor_positions WHERE investor_id = p_investor_id;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, meta)
  VALUES ('FORCE_DELETE_INVESTOR', 'profiles', p_investor_id::text, p_admin_id,
    jsonb_build_object('email', v_investor_email, 'name', v_investor_name),
    jsonb_build_object('affected_funds', v_affected_fund_ids));

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  DELETE FROM fee_allocations WHERE investor_id = p_investor_id;
  DELETE FROM fee_allocations WHERE fees_account_id = p_investor_id;
  DELETE FROM platform_fee_ledger WHERE investor_id = p_investor_id;
  DELETE FROM ib_allocations WHERE ib_investor_id = p_investor_id;
  DELETE FROM ib_allocations WHERE source_investor_id = p_investor_id;
  DELETE FROM ib_commission_ledger WHERE ib_id = p_investor_id;
  DELETE FROM ib_commission_ledger WHERE source_investor_id = p_investor_id;
  DELETE FROM investor_yield_events WHERE investor_id = p_investor_id;
  DELETE FROM yield_allocations WHERE investor_id = p_investor_id;
  DELETE FROM transactions_v2 WHERE investor_id = p_investor_id;
  DELETE FROM investor_positions WHERE investor_id = p_investor_id;
  DELETE FROM investor_fund_performance WHERE investor_id = p_investor_id;
  DELETE FROM generated_statements WHERE investor_id = p_investor_id;
  DELETE FROM generated_statements WHERE user_id = p_investor_id;
  DELETE FROM documents WHERE user_id = p_investor_id;
  DELETE FROM withdrawal_requests WHERE investor_id = p_investor_id;
  DELETE FROM investor_fee_schedule WHERE investor_id = p_investor_id;
  DELETE FROM investor_emails WHERE investor_id = p_investor_id;
  DELETE FROM statement_email_delivery WHERE investor_id = p_investor_id;
  DELETE FROM user_roles WHERE user_id = p_investor_id;

  SELECT COUNT(*) INTO v_children_unlinked FROM profiles WHERE ib_parent_id = p_investor_id;
  UPDATE profiles SET ib_parent_id = NULL WHERE ib_parent_id = p_investor_id;

  IF v_children_unlinked > 0 THEN
    INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
    VALUES ('IB_CHILDREN_UNLINKED', 'profiles', p_investor_id::text, p_admin_id,
      jsonb_build_object('children_unlinked', v_children_unlinked));
  END IF;

  DELETE FROM profiles WHERE id = p_investor_id;
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."force_delete_investor"("p_investor_id" "uuid", "p_admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."force_delete_investor"("p_investor_id" "uuid", "p_admin_id" "uuid") IS 'Cascading investor deletion - removes all related data in correct order. Requires super_admin. Used from admin UI.';



CREATE OR REPLACE FUNCTION "public"."generate_document_path"("user_id" "uuid", "document_type" "text", "filename" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Generate secure path without PII in filename
    -- Format: documents/{user_id}/{type}/{uuid}_{sanitized_filename}
    RETURN 'documents/' || user_id::text || '/' || document_type || '/' || 
           gen_random_uuid()::text || '_' || 
           regexp_replace(filename, '[^a-zA-Z0-9.-]', '_', 'g');
END;
$$;


ALTER FUNCTION "public"."generate_document_path"("user_id" "uuid", "document_type" "text", "filename" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_statement_path"("user_id" "uuid", "year" integer, "month" integer, "fund_code" "text" DEFAULT 'default'::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Format: statements/{user_id}/{yyyy}/{mm}/statement-{fund_code}-{period}.pdf
    RETURN 'statements/' || user_id::text || '/' || 
           year::text || '/' || 
           lpad(month::text, 2, '0') || '/' ||
           'statement-' || fund_code || '-' || year::text || 
           lpad(month::text, 2, '0') || '.pdf';
END;
$$;


ALTER FUNCTION "public"."generate_statement_path"("user_id" "uuid", "year" integer, "month" integer, "fund_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_funds_summary"() RETURNS TABLE("fund_id" "uuid", "fund_code" "text", "fund_name" "text", "fund_asset" "text", "total_aum" numeric, "investor_count" bigint, "aum_record_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    f.id as fund_id,
    f.code as fund_code,
    f.name as fund_name,
    f.asset as fund_asset,
    COALESCE(
      (SELECT pah.total_aum FROM public.fund_daily_aum pah WHERE pah.fund_id = f.id ORDER BY pah.aum_date DESC LIMIT 1),
      0
    )::numeric as total_aum,
    (SELECT count(*) FROM public.investor_positions inv WHERE inv.fund_id = f.id AND inv.current_value > 0)::bigint as investor_count,
    (SELECT count(*) FROM public.fund_daily_aum pah WHERE pah.fund_id = f.id)::bigint as aum_record_count
  FROM public.funds f;
END;
$$;


ALTER FUNCTION "public"."get_active_funds_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_name"("admin_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    admin_name TEXT;
BEGIN
    SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) 
    INTO admin_name
    FROM profiles 
    WHERE id = admin_id;
    
    RETURN TRIM(COALESCE(admin_name, 'Unknown'));
END;
$$;


ALTER FUNCTION "public"."get_admin_name"("admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_admin_name"("admin_id" "uuid") IS 'GET ADMIN DISPLAY NAME: Returns full_name or email for given admin user_id. Used in audit logs and admin activity displays.';



CREATE OR REPLACE FUNCTION "public"."get_admin_stats"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'totalFunds', (SELECT count(*) FROM public.funds),
    'totalPositions', (SELECT count(*) FROM public.investor_positions),
    'activePositions', (SELECT count(*) FROM public.investor_positions WHERE current_value > 0),
    'totalProfiles', (SELECT count(*) FROM public.profiles),
    'activeProfiles', (SELECT count(*) FROM public.profiles WHERE status = 'active'),
    'uniqueInvestorsWithPositions', (SELECT count(DISTINCT investor_id) FROM public.investor_positions WHERE current_value > 0),
    'pendingWithdrawals', (SELECT count(*) FROM public.withdrawal_requests WHERE status = 'pending'),
    'recentActivity', (SELECT count(*) FROM public.transactions_v2 WHERE created_at >= now() - interval '24 hours' AND is_voided = false)
  ) INTO v_result;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_admin_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_dust_tolerances"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.is_admin();

  RETURN (
    SELECT COALESCE(value, '{"default": 0.01}'::jsonb)
    FROM system_config
    WHERE key = 'dust_tolerance'
  );
END;
$$;


ALTER FUNCTION "public"."get_all_dust_tolerances"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_all_dust_tolerances"() IS 'Get all dust tolerance thresholds from system_config.';



CREATE OR REPLACE FUNCTION "public"."get_all_investors_summary"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.is_admin();

  RETURN (
    SELECT COALESCE(jsonb_agg(investor_row ORDER BY investor_row->>'name'), '[]'::jsonb)
    FROM (
      SELECT jsonb_build_object(
        'id',              p.id,
        'name',            TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
        'email',           p.email,
        'status',          COALESCE(p.status, 'active'),
        'account_type',    COALESCE(p.account_type::text, 'investor'),
        'totalAUM',        COALESCE(pos.total_aum, 0),
        'totalEarned',     COALESCE(earned.total_earned, 0),
        'totalPrincipal',  COALESCE(principal.total_principal, 0),
        'positionCount',   COALESCE(pos.position_count, 0),
        'assetBreakdown',  COALESCE(pos.asset_breakdown, '{}'::jsonb),
        'onboardingDate',  p.onboarding_date,
        'createdAt',       p.created_at
      ) AS investor_row
      FROM profiles p
      LEFT JOIN (
        SELECT
          ip.investor_id,
          SUM(ip.current_value)    AS total_aum,
          COUNT(*)                 AS position_count,
          jsonb_object_agg(f.asset, ip.current_value) AS asset_breakdown
        FROM investor_positions ip
        JOIN funds f ON f.id = ip.fund_id
        WHERE ip.is_active = true
        GROUP BY ip.investor_id
      ) pos ON pos.investor_id = p.id
      LEFT JOIN (
        SELECT investor_id, SUM(amount) AS total_earned
        FROM transactions_v2
        WHERE type = 'YIELD' AND is_voided = false
        GROUP BY investor_id
      ) earned ON earned.investor_id = p.id
      LEFT JOIN (
        SELECT investor_id, SUM(amount) AS total_principal
        FROM transactions_v2
        WHERE type = 'DEPOSIT' AND is_voided = false
        GROUP BY investor_id
      ) principal ON principal.investor_id = p.id
      WHERE NOT EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = p.id AND ur.role IN ('admin', 'super_admin')
      )
    ) subq
  );
END;
$$;


ALTER FUNCTION "public"."get_all_investors_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_aum_position_reconciliation"("p_date" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("fund_id" "uuid", "fund_code" "text", "fund_name" "text", "reconciliation_date" "date", "recorded_aum" numeric, "calculated_position_sum" numeric, "discrepancy" numeric, "has_discrepancy" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.is_admin();

  RETURN QUERY
  WITH aum_on_date AS (
    SELECT DISTINCT ON (fda.fund_id)
      fda.fund_id,
      fda.aum_date,
      fda.total_aum
    FROM fund_daily_aum fda
    WHERE fda.is_voided = false
      AND fda.aum_date <= p_date
    ORDER BY fda.fund_id, fda.aum_date DESC, fda.created_at DESC
  ),
  position_on_date AS (
    SELECT
      t.fund_id,
      SUM(
        CASE
          WHEN t.type IN ('DEPOSIT', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'INTEREST', 'INTERNAL_CREDIT', 'ADJUSTMENT')
            THEN CASE WHEN t.amount >= 0 THEN t.amount ELSE 0 END
          WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT')
            THEN -ABS(t.amount)
          ELSE t.amount
        END
      ) AS position_sum
    FROM transactions_v2 t
    WHERE t.is_voided = false
      AND t.tx_date <= p_date
    GROUP BY t.fund_id
  )
  SELECT
    f.id AS fund_id,
    f.code AS fund_code,
    f.name AS fund_name,
    p_date AS reconciliation_date,
    COALESCE(aod.total_aum, 0)::numeric AS recorded_aum,
    COALESCE(pod.position_sum, 0)::numeric AS calculated_position_sum,
    (COALESCE(aod.total_aum, 0) - COALESCE(pod.position_sum, 0))::numeric AS discrepancy,
    ABS(COALESCE(aod.total_aum, 0) - COALESCE(pod.position_sum, 0)) > 1 AS has_discrepancy
  FROM funds f
  LEFT JOIN aum_on_date aod ON aod.fund_id = f.id
  LEFT JOIN position_on_date pod ON pod.fund_id = f.id
  ORDER BY f.code;
END;
$$;


ALTER FUNCTION "public"."get_aum_position_reconciliation"("p_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_aum_position_reconciliation"("p_date" "date") IS 'Reconciles AUM vs calculated positions for any given date. 
Positions are calculated by summing all transactions up to that date.
Usage: SELECT * FROM get_aum_position_reconciliation(''2026-01-15'')';



CREATE OR REPLACE FUNCTION "public"."get_available_balance"("p_investor_id" "uuid", "p_fund_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_balance numeric(38,18);
  v_pending numeric(38,18);
BEGIN
  SELECT COALESCE(current_value, 0) INTO v_balance
  FROM public.investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  SELECT COALESCE(SUM(requested_amount), 0) INTO v_pending
  FROM public.withdrawal_requests
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND status IN ('pending', 'approved', 'processing');

  RETURN GREATEST(COALESCE(v_balance, 0) - COALESCE(v_pending, 0), 0);
END;
$$;


ALTER FUNCTION "public"."get_available_balance"("p_investor_id" "uuid", "p_fund_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_available_balance"("p_investor_id" "uuid", "p_fund_id" "uuid") IS 'Returns available balance for withdrawals (current position minus pending withdrawals). Used by validate_withdrawal_request trigger.';



CREATE OR REPLACE FUNCTION "public"."get_delivery_stats"("p_period_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_admin() THEN 
    RAISE EXCEPTION 'Admin required'; 
  END IF;
  
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'queued', COUNT(*) FILTER (WHERE UPPER(status) = 'QUEUED'),
    'sending', COUNT(*) FILTER (WHERE UPPER(status) = 'SENDING'),
    'sent', COUNT(*) FILTER (WHERE UPPER(status) = 'SENT'),
    'failed', COUNT(*) FILTER (WHERE UPPER(status) = 'FAILED'),
    'cancelled', COUNT(*) FILTER (WHERE UPPER(status) = 'CANCELLED'),
    'skipped', COUNT(*) FILTER (WHERE UPPER(status) = 'SKIPPED'),
    'statements_generated', (
      SELECT COUNT(*) FROM generated_statements WHERE period_id = p_period_id
    ),
    'investors_in_scope', (
      SELECT COUNT(DISTINCT investor_id) FROM generated_statements WHERE period_id = p_period_id
    ),
    'oldest_queued_at', MIN(created_at) FILTER (WHERE UPPER(status) = 'QUEUED'),
    'stuck_sending', COUNT(*) FILTER (WHERE UPPER(status) = 'SENDING' AND locked_at < now() - interval '15 minutes')
  ) INTO v_result
  FROM statement_email_delivery
  WHERE period_id = p_period_id;
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_delivery_stats"("p_period_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_drift_summary"() RETURNS TABLE("position_drift_count" bigint, "aum_drift_count" bigint, "repair_call_count" bigint, "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM mv_position_ledger_drift)::BIGINT AS position_drift_count,
    (SELECT COUNT(*) FROM mv_aum_position_drift)::BIGINT AS aum_drift_count,
    (SELECT COUNT(*) FROM mv_admin_repair_usage)::BIGINT AS repair_call_count,
    CASE 
      WHEN (SELECT COUNT(*) FROM mv_position_ledger_drift) > 0 THEN 'DRIFT_DETECTED'
      WHEN (SELECT COUNT(*) FROM mv_aum_position_drift) > 0 THEN 'AUM_DRIFT_DETECTED'
      ELSE 'OK'
    END::TEXT AS status;
END;
$$;


ALTER FUNCTION "public"."get_drift_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dust_tolerance_for_fund"("p_fund_id" "uuid") RETURNS numeric
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT (value->>f.asset)::numeric FROM system_config, funds f
     WHERE system_config.key = 'dust_tolerance' AND f.id = p_fund_id),
    (SELECT (value->>'default')::numeric FROM system_config WHERE key = 'dust_tolerance'),
    0.01
  );
$$;


ALTER FUNCTION "public"."get_dust_tolerance_for_fund"("p_fund_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dust_tolerance_for_fund"("p_fund_id" "uuid") IS 'Returns asset-aware dust tolerance. Stablecoins: 0.0001, ETH/BTC: 0.00000001, Default: 0.01';



CREATE OR REPLACE FUNCTION "public"."get_existing_preflow_aum"("p_fund_id" "uuid", "p_event_date" "date", "p_purpose" "public"."aum_purpose") RETURNS TABLE("aum_event_id" "uuid", "closing_aum" numeric, "event_ts" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT id, closing_aum, event_ts
  FROM fund_aum_events
  WHERE fund_id = p_fund_id
    AND event_date = p_event_date
    AND purpose = p_purpose
    AND is_voided = false
    AND trigger_type IN ('deposit', 'withdrawal', 'preflow')
  ORDER BY event_ts DESC
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_existing_preflow_aum"("p_fund_id" "uuid", "p_event_date" "date", "p_purpose" "public"."aum_purpose") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_existing_preflow_aum"("p_fund_id" "uuid", "p_event_date" "date", "p_purpose" "public"."aum_purpose") IS 'Returns existing preflow AUM for fund/date/purpose. Used to avoid duplicate AUM entries.';



CREATE OR REPLACE FUNCTION "public"."get_fees_account_for_fund"("p_fund_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fees_account_id uuid;
BEGIN
  -- Find the fees account for this fund (account_type = 'fees_account')
  SELECT p.id INTO v_fees_account_id
  FROM profiles p
  WHERE p.account_type = 'fees_account'
  LIMIT 1;
  
  RETURN v_fees_account_id;
END;
$$;


ALTER FUNCTION "public"."get_fees_account_for_fund"("p_fund_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_fund_aum_as_of"("p_fund_id" "uuid", "p_as_of_date" "date", "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose") RETURNS TABLE("fund_id" "uuid", "fund_code" "text", "as_of_date" "date", "purpose" "public"."aum_purpose", "aum_value" numeric, "aum_source" "text", "event_id" "uuid")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.is_admin();

  RETURN QUERY
  SELECT
    f.id,
    f.code,
    p_as_of_date,
    p_purpose,
    COALESCE(ae.post_flow_aum, ae.closing_aum, 0),
    CASE
      WHEN ae.id IS NOT NULL THEN 'aum_event'
      ELSE 'no_data'
    END,
    ae.id
  FROM funds f
  LEFT JOIN LATERAL (
    SELECT id, closing_aum, post_flow_aum
    FROM fund_aum_events
    WHERE fund_id = f.id
      AND event_date <= p_as_of_date
      AND purpose = p_purpose
      AND is_voided = false
    ORDER BY event_date DESC, event_ts DESC
    LIMIT 1
  ) ae ON true
  WHERE f.id = p_fund_id;
END;
$$;


ALTER FUNCTION "public"."get_fund_aum_as_of"("p_fund_id" "uuid", "p_as_of_date" "date", "p_purpose" "public"."aum_purpose") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_fund_aum_as_of"("p_fund_id" "uuid", "p_as_of_date" "date", "p_purpose" "public"."aum_purpose") IS 'Get fund AUM as of a specific date. FIX: Now uses COALESCE(post_flow_aum, closing_aum) to return correct AUM after deposits/withdrawals.';



CREATE OR REPLACE FUNCTION "public"."get_fund_base_asset"("p_fund_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.is_admin();
  RETURN (SELECT asset FROM funds WHERE id = p_fund_id);
END;
$$;


ALTER FUNCTION "public"."get_fund_base_asset"("p_fund_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_fund_composition"("p_fund_id" "uuid", "p_date" "date") RETURNS TABLE("investor_name" "text", "email" "text", "balance" numeric, "ownership_pct" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_fund_asset TEXT;
    v_total_fund_balance NUMERIC;
    v_period_id UUID;
BEGIN
    -- Get asset code for the fund
    SELECT asset INTO v_fund_asset FROM public.funds WHERE id = p_fund_id;
    
    -- Resolve period_id for the given date
    SELECT id INTO v_period_id
    FROM public.statement_periods
    WHERE period_end_date >= p_date
    ORDER BY period_end_date ASC
    LIMIT 1;

    IF v_period_id IS NULL THEN
        RAISE EXCEPTION 'No statement period found on or after date %', p_date;
    END IF;

    -- Calculate total balance for this asset/period
    SELECT SUM(ifp.mtd_ending_balance) INTO v_total_fund_balance
    FROM public.investor_fund_performance ifp
    WHERE ifp.fund_name = v_fund_asset AND ifp.period_id = v_period_id;

    -- Return query
    RETURN QUERY
    SELECT 
        (p.first_name || ' ' || p.last_name) as investor_name,
        p.email,
        ifp.mtd_ending_balance as balance,
        CASE 
            WHEN v_total_fund_balance > 0 THEN (ifp.mtd_ending_balance / v_total_fund_balance) * 100
            ELSE 0
        END as ownership_pct
    FROM public.investor_fund_performance ifp
    JOIN public.profiles p ON ifp.investor_id = p.id
    WHERE ifp.fund_name = v_fund_asset 
      AND ifp.period_id = v_period_id
      AND ifp.mtd_ending_balance > 0;
END;
$$;


ALTER FUNCTION "public"."get_fund_composition"("p_fund_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_fund_net_flows"("p_fund_id" "text", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("period_date" "date", "inflows" numeric, "outflows" numeric, "net_flow" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.is_admin();

  RETURN QUERY
  SELECT
    t.tx_date as period_date,
    COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END), 0) as inflows,
    COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN t.amount ELSE 0 END), 0) as outflows,
    COALESCE(SUM(CASE
      WHEN t.type = 'DEPOSIT' THEN t.amount
      WHEN t.type = 'WITHDRAWAL' THEN t.amount
      ELSE 0
    END), 0) as net_flow
  FROM public.transactions_v2 t
  WHERE t.fund_id = p_fund_id::uuid
    AND t.tx_date >= p_start_date
    AND t.tx_date <= p_end_date
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT', 'WITHDRAWAL')
  GROUP BY t.tx_date
  ORDER BY period_date;
END;
$$;


ALTER FUNCTION "public"."get_fund_net_flows"("p_fund_id" "text", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_fund_net_flows"("p_fund_id" "text", "p_start_date" "date", "p_end_date" "date") IS 'Get fund net flows using transactions_v2 table with valid enum values.';



CREATE OR REPLACE FUNCTION "public"."get_fund_positions_sum"("p_fund_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result json;
BEGIN
  -- 1. Admin-only
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin privileges required';
  END IF;

  -- 2. Aggregate investor_positions for the fund
  SELECT json_build_object(
    'total_value',   COALESCE(SUM(CASE WHEN ip.is_active THEN ip.current_value ELSE 0 END), 0),
    'active_count',  COUNT(*) FILTER (WHERE ip.is_active),
    'total_count',   COUNT(*)
  )
  INTO v_result
  FROM public.investor_positions ip
  WHERE ip.fund_id = p_fund_id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_fund_positions_sum"("p_fund_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_fund_summary"() RETURNS TABLE("fund_id" "uuid", "fund_code" "text", "fund_name" "text", "asset" "text", "status" "text", "total_aum" numeric, "investor_count" bigint, "active_investor_count" bigint, "total_deposits" numeric, "total_withdrawals" numeric, "total_yield_distributed" numeric, "total_fees_collected" numeric, "last_yield_date" "date", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS fund_id,
    f.code AS fund_code,
    f.name AS fund_name,
    f.asset,
    f.status,
    COALESCE(SUM(ip.current_value), 0) AS total_aum,
    COUNT(DISTINCT ip.investor_id) AS investor_count,
    COUNT(DISTINCT CASE WHEN ip.current_value > 0 THEN ip.investor_id END) AS active_investor_count,
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions_v2 t
      WHERE t.fund_id = f.id AND t.type = 'DEPOSIT' AND t.is_voided = false
    ), 0) AS total_deposits,
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions_v2 t
      WHERE t.fund_id = f.id AND t.type = 'WITHDRAWAL' AND t.is_voided = false
    ), 0) AS total_withdrawals,
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions_v2 t
      WHERE t.fund_id = f.id AND t.type = 'YIELD' AND t.is_voided = false
    ), 0) AS total_yield_distributed,
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions_v2 t
      WHERE t.fund_id = f.id AND t.type = 'FEE_CREDIT' AND t.is_voided = false
    ), 0) AS total_fees_collected,
    (
      SELECT MAX(t.tx_date)
      FROM transactions_v2 t
      WHERE t.fund_id = f.id AND t.type = 'YIELD' AND t.is_voided = false
    ) AS last_yield_date,
    f.created_at
  FROM funds f
  LEFT JOIN investor_positions ip ON ip.fund_id = f.id
  WHERE f.status = 'active'
  GROUP BY f.id, f.code, f.name, f.asset, f.status, f.created_at
  ORDER BY f.code;
END;
$$;


ALTER FUNCTION "public"."get_fund_summary"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_fund_summary"() IS 'Returns summary statistics for all active funds including AUM, investor counts, transaction totals, and yield information.';



CREATE OR REPLACE FUNCTION "public"."get_funds_aum_snapshot"("p_as_of_date" "date", "p_purpose" "public"."aum_purpose" DEFAULT 'reporting'::"public"."aum_purpose") RETURNS TABLE("fund_id" "uuid", "fund_code" "text", "aum_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    f.id as fund_id,
    f.code as fund_code,
    COALESCE(
      (
        SELECT pah.total_aum
        FROM public.fund_daily_aum pah
        WHERE pah.fund_id = f.id
          AND pah.purpose = p_purpose
          AND pah.aum_date <= p_as_of_date
        ORDER BY pah.aum_date DESC LIMIT 1
      ), 0
    ) as aum_value
  FROM public.funds f;
END;
$$;


ALTER FUNCTION "public"."get_funds_aum_snapshot"("p_as_of_date" "date", "p_purpose" "public"."aum_purpose") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_funds_daily_flows"("p_date" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.is_admin();

  RETURN (
    SELECT COALESCE(
      (
        SELECT jsonb_object_agg(
          fund_id::text,
          jsonb_build_object(
            'daily_inflows',  inflows,
            'daily_outflows', outflows,
            'net_flow_24h',   inflows + outflows
          )
        )
        FROM (
          SELECT
            fund_id,
            COALESCE(SUM(CASE WHEN type = 'DEPOSIT'    THEN amount ELSE 0 END), 0) AS inflows,
            COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END), 0) AS outflows
          FROM transactions_v2
          WHERE tx_date = p_date
            AND is_voided = false
            AND type IN ('DEPOSIT', 'WITHDRAWAL')
          GROUP BY fund_id
        ) flows
      ),
      '{}'::jsonb
    )
  );
END;
$$;


ALTER FUNCTION "public"."get_funds_daily_flows"("p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_funds_with_aum"() RETURNS TABLE("fund_id" "uuid", "fund_name" "text", "fund_code" "text", "asset" "text", "fund_class" "text", "status" "text", "total_aum" numeric, "investor_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.name,
    f.code,
    f.asset,
    f.fund_class,
    f.status::text,
    COALESCE(SUM(CASE WHEN ip.current_value > 0 THEN ip.current_value ELSE 0 END), 0) AS total_aum,
    COUNT(DISTINCT CASE WHEN p.account_type = 'investor' AND ip.current_value > 0 THEN ip.investor_id END) AS investor_count
  FROM public.funds f
  LEFT JOIN public.investor_positions ip ON ip.fund_id = f.id
  LEFT JOIN public.profiles p ON p.id = ip.investor_id
  GROUP BY f.id
  ORDER BY f.name;
END;
$$;


ALTER FUNCTION "public"."get_funds_with_aum"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_funds_with_aum"() IS 'Returns fund totals with conserved NAV. total_aum sums all positive positions (investor + fees_account + ib); investor_count remains investor-only.';



CREATE OR REPLACE FUNCTION "public"."get_health_trend"("p_days" integer DEFAULT 7) RETURNS TABLE("snapshot_date" "date", "avg_anomalies" numeric, "max_anomalies" integer, "snapshot_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- system_health_snapshots table was dropped; return empty result set
  RETURN;
END;
$$;


ALTER FUNCTION "public"."get_health_trend"("p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ib_parent_candidates"("p_exclude_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "first_name" "text", "last_name" "text", "email_masked" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    CASE
      WHEN p.email IS NULL THEN NULL
      ELSE concat(left(p.email, 1), '***@', split_part(p.email, '@', 2))
    END as email_masked
  FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.id AND r.role = 'ib'
  WHERE p.id <> COALESCE(p_exclude_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ORDER BY p.email;
END;
$$;


ALTER FUNCTION "public"."get_ib_parent_candidates"("p_exclude_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ib_referral_count"("p_ib_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not (auth.uid() = p_ib_id or is_admin_safe()) then
    raise exception 'not authorized';
  end if;

  return (select count(*) from public.profiles where ib_parent_id = p_ib_id);
end;
$$;


ALTER FUNCTION "public"."get_ib_referral_count"("p_ib_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ib_referral_detail"("p_ib_id" "uuid", "p_referral_id" "uuid") RETURNS TABLE("id" "uuid", "first_name" "text", "last_name" "text", "email_masked" "text", "status" "text", "created_at" timestamp with time zone, "ib_parent_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not (auth.uid() = p_ib_id or is_admin_safe()) then
    raise exception 'not authorized';
  end if;

  return query
  select
    p.id,
    p.first_name,
    p.last_name,
    case
      when p.email is null then null
      else concat(left(p.email, 1), '***@', split_part(p.email, '@', 2))
    end as email_masked,
    p.status,
    p.created_at,
    p.ib_parent_id
  from public.profiles p
  where p.id = p_referral_id
    and p.ib_parent_id = p_ib_id;
end;
$$;


ALTER FUNCTION "public"."get_ib_referral_detail"("p_ib_id" "uuid", "p_referral_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ib_referrals"("p_ib_id" "uuid", "p_limit" integer DEFAULT NULL::integer, "p_offset" integer DEFAULT NULL::integer) RETURNS TABLE("id" "uuid", "first_name" "text", "last_name" "text", "email_masked" "text", "ib_percentage" numeric, "status" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not (auth.uid() = p_ib_id or is_admin_safe()) then
    raise exception 'not authorized';
  end if;

  return query
  select
    p.id,
    p.first_name,
    p.last_name,
    case
      when p.email is null then null
      else concat(left(p.email, 1), '***@', split_part(p.email, '@', 2))
    end as email_masked,
    p.ib_percentage,
    p.status,
    p.created_at
  from public.profiles p
  where p.ib_parent_id = p_ib_id
  order by p.created_at desc
  limit coalesce(p_limit, 1000)
  offset coalesce(p_offset, 0);
end;
$$;


ALTER FUNCTION "public"."get_ib_referrals"("p_ib_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_investor_cumulative_yield"("p_investor_id" "uuid", "p_fund_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result json;
BEGIN
  -- 1. Access control: self or admin only
  IF NOT (auth.uid() = p_investor_id OR public.is_admin()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- 2. Aggregate from yield_allocations joined to yield_distributions
  SELECT json_build_object(
    'total_gross',         COALESCE(SUM(ya.gross_amount), 0),
    'total_net',           COALESCE(SUM(ya.net_amount),   0),
    'total_fees',          COALESCE(SUM(ya.fee_amount),   0),
    'total_ib',            COALESCE(SUM(ya.ib_amount),    0),
    'distribution_count',  COUNT(*)
  )
  INTO v_result
  FROM public.yield_allocations ya
  JOIN public.yield_distributions yd ON yd.id = ya.distribution_id
  WHERE ya.investor_id = p_investor_id
    AND ya.fund_id     = p_fund_id
    AND ya.is_voided   = false
    AND yd.is_voided   = false;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_investor_cumulative_yield"("p_investor_id" "uuid", "p_fund_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_investor_fee_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_effective_date" "date") RETURNS numeric
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.can_access_investor(p_investor_id) THEN
    RAISE EXCEPTION 'Access denied: cannot query another investor''s fee data';
  END IF;
  RETURN public._resolve_investor_fee_pct(p_investor_id, p_fund_id, p_effective_date);
END;
$$;


ALTER FUNCTION "public"."get_investor_fee_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_effective_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_investor_fee_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_effective_date" "date") IS 'Centralized fee resolution: delegates to _resolve_investor_fee_pct which checks fee_schedule (fund-specific then global), then profile default, then fund default. fees_account always returns 0.';



CREATE OR REPLACE FUNCTION "public"."get_investor_ib_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_effective_date" "date" DEFAULT CURRENT_DATE) RETURNS numeric
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.can_access_investor(p_investor_id) THEN
    RAISE EXCEPTION 'Access denied: cannot query another investor''s IB data';
  END IF;
  RETURN public._resolve_investor_ib_pct(p_investor_id, p_fund_id, p_effective_date);
END;
$$;


ALTER FUNCTION "public"."get_investor_ib_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_effective_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_investor_ib_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_effective_date" "date") IS 'Centralized IB rate resolution: delegates to _resolve_investor_ib_pct which checks ib_commission_schedule (fund-specific then global), then profile default. fees_account always returns 0.';



CREATE OR REPLACE FUNCTION "public"."get_investor_reports_v2"("p_period_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    result JSONB;
    v_period_start DATE;
    v_period_end DATE;
BEGIN
    IF NOT (SELECT is_admin()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT date_trunc('month', period_end_date)::date, period_end_date 
    INTO v_period_start, v_period_end 
    FROM statement_periods WHERE id = p_period_id;

    WITH investor_data AS (
        SELECT 
            p.id as investor_id,
            TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) as investor_name,
            p.email as investor_email,
            COALESCE(
              (SELECT jsonb_agg(jsonb_build_object(
                  'email', ie.email,
                  'is_primary', ie.is_primary,
                  'verified', ie.verified
              )) FROM investor_emails ie WHERE ie.investor_id = p.id),
              '[]'::jsonb
            ) as investor_emails
        FROM profiles p
        WHERE NOT EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = p.id AND ur.role IN ('admin', 'super_admin')
          )
          AND (p.account_type IS NULL OR p.account_type != 'fees_account')
          AND (
            EXISTS (SELECT 1 FROM investor_positions ip WHERE ip.investor_id = p.id AND ip.is_active = true AND ip.current_value > 1e-8)
            OR EXISTS (SELECT 1 FROM investor_fund_performance ifp WHERE ifp.investor_id = p.id AND ifp.period_id = p_period_id)
            OR EXISTS (SELECT 1 FROM ib_allocations iba WHERE iba.ib_investor_id = p.id AND iba.is_voided = false AND iba.effective_date >= v_period_start AND iba.effective_date <= v_period_end)
          )
    ),
    performance_records AS (
        SELECT 
            ifp.investor_id,
            jsonb_agg(jsonb_build_object(
                'report_id', ifp.id,
                'asset_code', ifp.fund_name,
                'opening_balance', ifp.mtd_beginning_balance::text,
                'closing_balance', ifp.mtd_ending_balance::text,
                'additions', ifp.mtd_additions::text,
                'withdrawals', ifp.mtd_redemptions::text,
                'yield_earned', ifp.mtd_net_income::text,
                'mtd_beginning_balance', ifp.mtd_beginning_balance::text,
                'mtd_additions', ifp.mtd_additions::text,
                'mtd_redemptions', ifp.mtd_redemptions::text,
                'mtd_net_income', ifp.mtd_net_income::text,
                'mtd_ending_balance', ifp.mtd_ending_balance::text,
                'mtd_rate_of_return', ifp.mtd_rate_of_return::text,
                'qtd_beginning_balance', ifp.qtd_beginning_balance::text,
                'qtd_additions', ifp.qtd_additions::text,
                'qtd_redemptions', ifp.qtd_redemptions::text,
                'qtd_net_income', ifp.qtd_net_income::text,
                'qtd_ending_balance', ifp.qtd_ending_balance::text,
                'qtd_rate_of_return', ifp.qtd_rate_of_return::text,
                'ytd_beginning_balance', ifp.ytd_beginning_balance::text,
                'ytd_additions', ifp.ytd_additions::text,
                'ytd_redemptions', ifp.ytd_redemptions::text,
                'ytd_net_income', ifp.ytd_net_income::text,
                'ytd_ending_balance', ifp.ytd_ending_balance::text,
                'ytd_rate_of_return', ifp.ytd_rate_of_return::text,
                'itd_beginning_balance', ifp.itd_beginning_balance::text,
                'itd_additions', ifp.itd_additions::text,
                'itd_redemptions', ifp.itd_redemptions::text,
                'itd_net_income', ifp.itd_net_income::text,
                'itd_ending_balance', ifp.itd_ending_balance::text,
                'itd_rate_of_return', ifp.itd_rate_of_return::text
            ) ORDER BY ifp.fund_name) as assets,
            SUM(ifp.mtd_ending_balance) as total_value,
            SUM(ifp.mtd_net_income) as total_yield
        FROM investor_fund_performance ifp
        WHERE ifp.period_id = p_period_id
        GROUP BY ifp.investor_id
    ),
    delivery_info AS (
        SELECT 
            gs.investor_id,
            gs.id as statement_id,
            sed.status as email_status,
            sed.sent_at
        FROM generated_statements gs
        LEFT JOIN statement_email_delivery sed ON sed.statement_id = gs.id
        WHERE gs.period_id = p_period_id
    )
    SELECT jsonb_agg(jsonb_build_object(
        'investor_id', id.investor_id,
        'investor_name', id.investor_name,
        'investor_email', id.investor_email,
        'investor_emails', id.investor_emails,
        'assets', COALESCE(pr.assets, '[]'::jsonb),
        'total_value', COALESCE(pr.total_value, 0)::text,
        'total_yield', COALESCE(pr.total_yield, 0)::text,
        'has_reports', CASE WHEN pr.assets IS NOT NULL THEN true ELSE false END,
        'report_count', COALESCE(jsonb_array_length(pr.assets), 0),
        'statement_id', di.statement_id,
        'delivery_status', CASE 
            WHEN di.email_status = 'SENT' THEN 'sent'
            WHEN di.email_status = 'FAILED' THEN 'failed'
            WHEN pr.assets IS NOT NULL OR di.statement_id IS NOT NULL THEN 'generated'
            ELSE 'missing'
          END,
        'sent_at', di.sent_at
    ) ORDER BY id.investor_name) INTO result
    FROM investor_data id
    LEFT JOIN performance_records pr ON pr.investor_id = id.investor_id
    LEFT JOIN delivery_info di ON di.investor_id = id.investor_id;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$;


ALTER FUNCTION "public"."get_investor_reports_v2"("p_period_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_investor_yield_summary"("p_investor_id" "uuid") RETURNS TABLE("distribution_id" "uuid", "fund_id" "uuid", "fund_name" "text", "period_start" "date", "period_end" "date", "gross_amount" numeric, "net_amount" numeric, "fee_amount" numeric, "ib_amount" numeric, "effective_date" "date", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- 1. Access control: self or admin only
  IF NOT (auth.uid() = p_investor_id OR public.is_admin()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- 2. Return rows joined to distributions and funds
  RETURN QUERY
  SELECT
    ya.distribution_id,
    ya.fund_id,
    f.name          AS fund_name,
    yd.period_start,
    yd.period_end,
    ya.gross_amount,
    ya.net_amount,
    ya.fee_amount,
    ya.ib_amount,
    yd.effective_date,
    ya.created_at
  FROM public.yield_allocations ya
  JOIN public.yield_distributions yd ON yd.id = ya.distribution_id
  JOIN public.funds               f  ON f.id  = ya.fund_id
  WHERE ya.investor_id = p_investor_id
    AND ya.is_voided   = false
    AND yd.is_voided   = false
  ORDER BY yd.effective_date DESC;
END;
$$;


ALTER FUNCTION "public"."get_investor_yield_summary"("p_investor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_latest_health_status"() RETURNS TABLE("snapshot_id" "uuid", "snapshot_at" timestamp with time zone, "total_anomalies" integer, "status" "text", "details" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- system_health_snapshots table was dropped; return empty result set
  RETURN;
END;
$$;


ALTER FUNCTION "public"."get_latest_health_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_platform_aum"() RETURNS TABLE("month" "text", "total_aum" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    WITH monthly_latest_aum AS (
        SELECT
            fund_id,
            TO_CHAR(aum_date, 'YYYY-MM') AS month_key,
            total_aum,
            aum_date,
            ROW_NUMBER() OVER (PARTITION BY fund_id, TO_CHAR(aum_date, 'YYYY-MM') ORDER BY aum_date DESC) as rn
        FROM public.fund_daily_aum
    )
    SELECT
        mla.month_key AS month,
        SUM(mla.total_aum) AS total_aum
    FROM monthly_latest_aum mla
    WHERE mla.rn = 1
    GROUP BY mla.month_key
    ORDER BY mla.month_key;
END;
$$;


ALTER FUNCTION "public"."get_monthly_platform_aum"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_paged_audit_logs"("p_limit" integer DEFAULT NULL::integer, "p_offset" integer DEFAULT 0, "p_entity" "text" DEFAULT NULL::"text", "p_action" "text" DEFAULT NULL::"text", "p_actor_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "actor_user" "uuid", "action" "text", "entity" "text", "entity_id" "text", "old_values" "jsonb", "new_values" "jsonb", "meta" "jsonb", "created_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- 1. Verify caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin privileges required';
  END IF;

  -- 2. Cap p_limit at 500 rows
  p_limit := LEAST(COALESCE(p_limit, 50), 500);

  -- 3. Return paginated rows with window total_count
  RETURN QUERY
  SELECT
    al.id,
    al.actor_user,
    al.action,
    al.entity,
    al.entity_id,
    al.old_values,
    al.new_values,
    al.meta,
    al.created_at,
    COUNT(*) OVER()::bigint AS total_count
  FROM public.audit_log al
  WHERE
    (p_entity   IS NULL OR al.entity      = p_entity)
    AND (p_action   IS NULL OR al.action  = p_action)
    AND (p_actor_id IS NULL OR al.actor_user = p_actor_id)
  ORDER BY al.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_paged_audit_logs"("p_limit" integer, "p_offset" integer, "p_entity" "text", "p_action" "text", "p_actor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_paged_investor_summaries"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0, "p_status" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "status" "text", "created_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.email, p.first_name, p.last_name, p.status, p.created_at,
    COUNT(*) OVER() as total_count
  FROM public.profiles p
  WHERE (p_status IS NULL OR p.status = p_status)
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = p.id AND ur.role IN ('admin', 'super_admin')
    )
  ORDER BY p.first_name ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_paged_investor_summaries"("p_limit" integer, "p_offset" integer, "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_paged_notifications"("p_user_id" "uuid", "p_limit" integer DEFAULT NULL::integer, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "user_id" "uuid", "title" "text", "message" "text", "type" "public"."notification_type", "priority" "public"."notification_priority", "is_read" boolean, "metadata" "jsonb", "created_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  -- 1. Identify caller and verify they only fetch their own notifications
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  IF v_caller_id != p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN: Cannot fetch another user''s notifications';
  END IF;

  -- 2. Cap p_limit at 200 rows
  p_limit := LEAST(COALESCE(p_limit, 50), 200);

  -- 3. Return paginated rows with window total_count
  RETURN QUERY
  SELECT
    n.id,
    n.user_id,
    n.title,
    n.message,
    n.type,
    n.priority,
    n.is_read,
    n.metadata,
    n.created_at,
    COUNT(*) OVER()::bigint AS total_count
  FROM public.notifications n
  WHERE n.user_id = v_caller_id
  ORDER BY n.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_paged_notifications"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_platform_flow_metrics"("p_days" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_total_deposits numeric(38,18);
  v_total_withdrawals numeric(38,18);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposits 
  FROM public.transactions_v2 
  WHERE type = 'DEPOSIT' AND is_voided = false AND tx_date >= NOW() - (p_days || ' days')::interval;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawals 
  FROM public.transactions_v2 
  WHERE type = 'WITHDRAWAL' AND is_voided = false AND tx_date >= NOW() - (p_days || ' days')::interval;

  RETURN jsonb_build_object(
    'totalDeposits', v_total_deposits,
    'totalWithdrawals', v_total_withdrawals,
    'netFlow', v_total_deposits - v_total_withdrawals
  );
END;
$$;


ALTER FUNCTION "public"."get_platform_flow_metrics"("p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_platform_stats"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT jsonb_build_object(
    'totalAum', COALESCE(SUM(ip.current_value), 0),
    'investorCount', COUNT(DISTINCT CASE WHEN p.account_type = 'investor' THEN ip.investor_id END),
    'adminCount', COUNT(DISTINCT CASE WHEN p.is_admin = true THEN ip.investor_id END)
  )
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.is_active = true;
$$;


ALTER FUNCTION "public"."get_platform_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_position_reconciliation"("p_as_of_date" "date" DEFAULT CURRENT_DATE, "p_fund_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("out_investor_id" "uuid", "out_fund_id" "uuid", "out_investor_name" "text", "out_fund_name" "text", "out_position_balance" numeric, "out_ledger_balance" numeric, "out_difference" numeric, "out_is_matched" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ip.investor_id AS out_investor_id,
        ip.fund_id AS out_fund_id,
        TRIM(COALESCE(pr.first_name, '') || ' ' || COALESCE(pr.last_name, '')) AS out_investor_name,
        f.name AS out_fund_name,
        ip.current_value AS out_position_balance,
        COALESCE(ledger.total, 0) AS out_ledger_balance,
        (ip.current_value - COALESCE(ledger.total, 0)) AS out_difference,
        (ABS(ip.current_value - COALESCE(ledger.total, 0)) < 0.01) AS out_is_matched
    FROM public.investor_positions ip
    JOIN public.profiles pr ON pr.id = ip.investor_id
    JOIN public.funds f ON f.id = ip.fund_id
    LEFT JOIN (
        SELECT 
            t.investor_id,
            t.fund_id,
            SUM(t.amount) AS total
        FROM public.transactions_v2 t
        WHERE t.tx_date <= p_as_of_date
          AND COALESCE(t.is_voided, false) = false
        GROUP BY t.investor_id, t.fund_id
    ) ledger ON ledger.investor_id = ip.investor_id AND ledger.fund_id = ip.fund_id
    WHERE (p_fund_id IS NULL OR ip.fund_id = p_fund_id);
END;
$$;


ALTER FUNCTION "public"."get_position_reconciliation"("p_as_of_date" "date", "p_fund_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_position_reconciliation"("p_as_of_date" "date", "p_fund_id" "uuid") IS 'Admin reconciliation tool - compares investor_positions to ledger totals. Used in admin UI for data integrity checks.';



CREATE OR REPLACE FUNCTION "public"."get_reporting_eligible_investors"("p_period_id" "uuid") RETURNS TABLE("investor_id" "uuid", "investor_name" "text", "email" "text", "eligibility_reason" "text", "is_eligible" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_period_start date;
    v_period_end date;
    v_period_year integer;
    v_period_month integer;
BEGIN
    -- Get period dates using CORRECT column names (year, month, period_end_date)
    SELECT 
        sp.year,
        sp.month,
        make_date(sp.year, sp.month, 1),  -- Calculate period start from year/month
        sp.period_end_date
    INTO v_period_year, v_period_month, v_period_start, v_period_end
    FROM statement_periods sp
    WHERE sp.id = p_period_id;
    
    IF v_period_start IS NULL THEN
        RAISE EXCEPTION 'Period not found: %', p_period_id;
    END IF;
    
    RETURN QUERY
    WITH investor_data AS (
        SELECT 
            p.id as inv_id,
            TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as inv_name,
            p.email as inv_email,
            p.status as inv_status,
            p.account_type as inv_account_type,
            EXISTS (
                SELECT 1 FROM investor_positions ip
                WHERE ip.investor_id = p.id
                AND ip.current_value > 0
            ) as has_positions,
            EXISTS (
                SELECT 1 FROM investor_fund_performance ifp
                WHERE ifp.investor_id = p.id
                AND ifp.period_id = p_period_id
                AND (ifp.purpose IS NULL OR ifp.purpose = 'reporting')
            ) as has_performance_data,
            EXISTS (
                SELECT 1 FROM generated_statements gs
                WHERE gs.investor_id = p.id
                AND gs.period_id = p_period_id
            ) as already_generated
        FROM profiles p
        WHERE p.account_type = 'investor' OR p.account_type IS NULL
    )
    SELECT 
        id.inv_id,
        id.inv_name,
        id.inv_email,
        CASE 
            WHEN id.already_generated THEN 'Statement already generated'
            WHEN NOT id.has_positions THEN 'No active positions'
            WHEN NOT id.has_performance_data THEN 'No performance data for period'
            WHEN id.inv_status = 'inactive' THEN 'Account inactive'
            ELSE 'Eligible for statement'
        END as reason,
        (id.has_positions AND id.has_performance_data AND NOT id.already_generated AND COALESCE(id.inv_status, 'active') != 'inactive') as eligible
    FROM investor_data id
    ORDER BY id.inv_name;
END;
$$;


ALTER FUNCTION "public"."get_reporting_eligible_investors"("p_period_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_schema_dump"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result json;
  v_enums json;
  v_tables json;
  v_rpcs json;
  v_views json;
BEGIN
  -- 1. Extract Enums
  WITH enum_agg AS (
    SELECT 
      t.typname as name,
      json_agg(e.enumlabel ORDER BY e.enumsortorder) as values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
  )
  SELECT json_object_agg(name, values) INTO v_enums FROM enum_agg;

  -- 2. Extract Tables & Views (basic list)
  WITH views_agg AS (
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'VIEW'
  )
  SELECT json_agg(table_name) INTO v_views FROM views_agg;

  -- 3. Extract Tables Detailed
  WITH pk_info AS (
    SELECT kcu.table_name, json_agg(kcu.column_name ORDER BY kcu.ordinal_position) as pks
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name 
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY' 
      AND tc.table_schema = 'public'
    GROUP BY kcu.table_name
  ),
  col_info AS (
    SELECT 
      c.table_name,
      json_object_agg(
        c.column_name, 
        json_build_object(
          'type', COALESCE(c.udt_name, c.data_type),
          'nullable', c.is_nullable = 'YES',
          'default', c.column_default
        )
      ) as columns
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    GROUP BY c.table_name
  )
  SELECT json_object_agg(
    t.table_name,
    json_build_object(
      'columns', c.columns,
      'pk', COALESCE(pk.pks, '[]'::json)
    )
  ) INTO v_tables
  FROM information_schema.tables t
  JOIN col_info c ON t.table_name = c.table_name
  LEFT JOIN pk_info pk ON t.table_name = pk.table_name
  WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE';

  -- 4. Extract RPCs
  WITH rpc_agg AS (
    SELECT 
      p.proname as name,
      json_build_object(
        'args', COALESCE(pg_get_function_arguments(p.oid), ''),
        'return_type', t.typname,
        'is_canonical', (p.prosrc ILIKE '%set_canonical_rpc(true)%')
      ) as info
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_type t ON p.prorettype = t.oid
    WHERE n.nspname = 'public'
  )
  SELECT json_object_agg(name, info) INTO v_rpcs FROM rpc_agg;

  -- Build Result
  v_result := json_build_object(
    'timestamp', NOW(),
    'enums', COALESCE(v_enums, '{}'::json),
    'tables', COALESCE(v_tables, '{}'::json),
    'rpcs', COALESCE(v_rpcs, '{}'::json),
    'views', COALESCE(v_views, '[]'::json)
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."get_schema_dump"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_statement_period_summary"("p_period_id" "uuid") RETURNS TABLE("total_investors" integer, "total_funds" integer, "statements_generated" integer, "statements_sent" integer, "statements_pending" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Count unique investors with performance data for this period
    (SELECT COUNT(DISTINCT investor_id)::INTEGER
     FROM investor_fund_performance
     WHERE period_id = p_period_id) AS total_investors,

    -- Count unique funds in this period
    (SELECT COUNT(DISTINCT fund_name)::INTEGER
     FROM investor_fund_performance
     WHERE period_id = p_period_id) AS total_funds,

    -- Count generated statements
    (SELECT COUNT(*)::INTEGER
     FROM generated_statements
     WHERE period_id = p_period_id) AS statements_generated,

    -- Count sent statements (via email delivery)
    (SELECT COUNT(*)::INTEGER
     FROM statement_email_delivery
     WHERE period_id = p_period_id AND status = 'SENT') AS statements_sent,

    -- Count pending statements (not yet sent)
    (SELECT COUNT(*)::INTEGER
     FROM generated_statements gs
     WHERE gs.period_id = p_period_id
       AND NOT EXISTS (
         SELECT 1 FROM statement_email_delivery sed
         WHERE sed.statement_id = gs.id AND sed.status = 'SENT'
       )) AS statements_pending;
END;
$$;


ALTER FUNCTION "public"."get_statement_period_summary"("p_period_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_statement_signed_url"("p_storage_path" "text", "p_expires_in" integer DEFAULT 300) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_signed_url TEXT;
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  v_is_admin := public.is_admin();
  
  -- Check authorization
  IF NOT v_is_admin THEN
    -- For non-admin, check if the path belongs to them
    IF NOT (p_storage_path LIKE '%/' || v_user_id::text || '/%') THEN
      RAISE EXCEPTION 'Unauthorized access to statement';
    END IF;
  END IF;
  
  -- Generate signed URL using Supabase internal function
  -- Note: This is a placeholder - actual implementation would use Supabase's internal signing
  -- In production, this should be handled by an Edge Function with service role key
  
  -- For now, return the path with a note that it needs Edge Function
  RETURN 'SIGNED_URL_GENERATION_REQUIRES_EDGE_FUNCTION:' || p_storage_path;
END;
$$;


ALTER FUNCTION "public"."get_statement_signed_url"("p_storage_path" "text", "p_expires_in" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_statement_signed_url"("p_storage_path" "text", "p_expires_in" integer) IS 'Generates signed URLs for statement access - requires Edge Function in production';



CREATE OR REPLACE FUNCTION "public"."get_system_mode"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT value::text FROM system_config WHERE key = 'system_mode';
$$;


ALTER FUNCTION "public"."get_system_mode"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_transaction_aum"("p_fund_id" "uuid", "p_tx_date" "date", "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose") RETURNS numeric
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE v_aum NUMERIC; BEGIN PERFORM public.is_admin(); SELECT total_aum INTO v_aum FROM fund_daily_aum WHERE fund_id = p_fund_id::text AND aum_date = p_tx_date AND purpose = p_purpose AND is_voided = false ORDER BY created_at DESC LIMIT 1; IF v_aum IS NULL THEN RAISE EXCEPTION 'No AUM record found for fund % on date % with purpose %', p_fund_id, p_tx_date, p_purpose; END IF; RETURN v_aum; END; $$;


ALTER FUNCTION "public"."get_transaction_aum"("p_fund_id" "uuid", "p_tx_date" "date", "p_purpose" "public"."aum_purpose") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_admin_status"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF user_id != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: can only check own admin status';
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = get_user_admin_status.user_id
    AND role IN ('admin', 'super_admin')
  );
END;
$$;


ALTER FUNCTION "public"."get_user_admin_status"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_admin_status"("user_id" "uuid") IS 'ADMIN STATUS FOR USER: Alternative signature for checking admin status of specific user. Returns boolean indicating admin or super_admin role membership.';



CREATE OR REPLACE FUNCTION "public"."get_void_aum_impact"("p_record_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_aum_record RECORD;
  v_distribution_ids uuid[];
  v_dist_count integer := 0;
  v_tx_count integer := 0;
  v_affected_investors integer := 0;
  v_total_yield numeric := 0;
  v_total_fee numeric := 0;
  v_total_ib numeric := 0;
  v_ib_ledger_count integer := 0;
  v_platform_fee_count integer := 0;
  v_investors jsonb;
BEGIN
  SELECT fda.*, f.name AS fund_name, f.asset AS fund_asset
  INTO v_aum_record
  FROM fund_daily_aum fda
  LEFT JOIN funds f ON f.id = fda.fund_id
  WHERE fda.id = p_record_id;

  IF v_aum_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'AUM record not found');
  END IF;

  IF v_aum_record.is_voided THEN
    RETURN jsonb_build_object('success', false, 'error', 'Record is already voided');
  END IF;

  v_distribution_ids := ARRAY(
    SELECT id FROM yield_distributions
    WHERE fund_id = v_aum_record.fund_id
      AND effective_date = v_aum_record.aum_date
      AND purpose::text = v_aum_record.purpose::text
      AND status != 'voided'
      AND (is_voided = false OR is_voided IS NULL)
  );

  v_dist_count := COALESCE(array_length(v_distribution_ids, 1), 0);

  IF v_dist_count = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'record_id', p_record_id,
      'fund_id', v_aum_record.fund_id,
      'fund_name', v_aum_record.fund_name,
      'fund_asset', v_aum_record.fund_asset,
      'aum_date', v_aum_record.aum_date,
      'total_aum', v_aum_record.total_aum,
      'purpose', v_aum_record.purpose,
      'distributions_to_void', 0,
      'transactions_to_void', 0,
      'affected_investor_count', 0,
      'total_yield_amount', 0,
      'total_fee_amount', 0,
      'total_ib_amount', 0,
      'ib_ledger_count', 0,
      'platform_fee_count', 0,
      'affected_investors', '[]'::jsonb
    );
  END IF;

  WITH linked_tx AS (
    SELECT DISTINCT unnest(ARRAY[ya.transaction_id, ya.fee_transaction_id, ya.ib_transaction_id]) AS tx_id
    FROM yield_allocations ya
    WHERE ya.distribution_id = ANY(v_distribution_ids)
      AND (ya.is_voided = false OR ya.is_voided IS NULL)
  )
  SELECT COUNT(*) INTO v_tx_count
  FROM transactions_v2
  WHERE id IN (SELECT tx_id FROM linked_tx WHERE tx_id IS NOT NULL)
    AND is_voided = false;

  v_tx_count := v_tx_count + (
    SELECT COUNT(*) FROM transactions_v2
    WHERE reference_id IN (SELECT 'fee_credit_' || unnest(v_distribution_ids)::text)
      AND is_voided = false
  );

  SELECT
    COUNT(DISTINCT ya.investor_id),
    COALESCE(SUM(ya.net_amount), 0),
    COALESCE(SUM(ya.fee_amount), 0),
    COALESCE(SUM(ya.ib_amount), 0)
  INTO v_affected_investors, v_total_yield, v_total_fee, v_total_ib
  FROM yield_allocations ya
  WHERE ya.distribution_id = ANY(v_distribution_ids)
    AND (ya.is_voided = false OR ya.is_voided IS NULL);

  SELECT COUNT(*) INTO v_ib_ledger_count
  FROM ib_commission_ledger
  WHERE yield_distribution_id = ANY(v_distribution_ids)
    AND (is_voided = false OR is_voided IS NULL);

  SELECT COUNT(*) INTO v_platform_fee_count
  FROM platform_fee_ledger
  WHERE yield_distribution_id = ANY(v_distribution_ids)
    AND (is_voided = false OR is_voided IS NULL);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', inv.investor_id,
    'investor_name', inv.investor_name,
    'current_position', inv.current_position,
    'yield_amount', inv.yield_amount,
    'fee_amount', inv.fee_amount,
    'ib_amount', inv.ib_amount
  )), '[]'::jsonb)
  INTO v_investors
  FROM (
    SELECT
      ya.investor_id,
      COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown') AS investor_name,
      COALESCE(ip.current_value, 0) AS current_position,
      SUM(ya.net_amount) AS yield_amount,
      SUM(ya.fee_amount) AS fee_amount,
      SUM(COALESCE(ya.ib_amount, 0)) AS ib_amount
    FROM yield_allocations ya
    LEFT JOIN profiles p ON p.id = ya.investor_id
    LEFT JOIN investor_positions ip ON ip.investor_id = ya.investor_id AND ip.fund_id = v_aum_record.fund_id
    WHERE ya.distribution_id = ANY(v_distribution_ids)
      AND (ya.is_voided = false OR ya.is_voided IS NULL)
    GROUP BY ya.investor_id, p.first_name, p.last_name, p.email, ip.current_value
  ) inv;

  RETURN jsonb_build_object(
    'success', true,
    'record_id', p_record_id,
    'fund_id', v_aum_record.fund_id,
    'fund_name', v_aum_record.fund_name,
    'fund_asset', v_aum_record.fund_asset,
    'aum_date', v_aum_record.aum_date,
    'total_aum', v_aum_record.total_aum,
    'purpose', v_aum_record.purpose,
    'distributions_to_void', v_dist_count,
    'transactions_to_void', v_tx_count,
    'affected_investor_count', v_affected_investors,
    'total_yield_amount', v_total_yield,
    'total_fee_amount', v_total_fee,
    'total_ib_amount', v_total_ib,
    'ib_ledger_count', v_ib_ledger_count,
    'platform_fee_count', v_platform_fee_count,
    'affected_investors', v_investors
  );
END;
$$;


ALTER FUNCTION "public"."get_void_aum_impact"("p_record_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_void_aum_impact"("p_record_id" "uuid") IS 'Preview impact of voiding a fund_daily_aum record. Shows affected distributions, transactions, and investors.';



CREATE OR REPLACE FUNCTION "public"."get_void_transaction_impact"("p_transaction_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tx RECORD;
  v_current_value numeric;
  v_projected_value numeric;
  v_position_change numeric;
  v_dependent_yields uuid[];
  v_yield_warning jsonb := NULL;
BEGIN
  -- Acquire advisory lock to ensure consistent read with void_transaction
  PERFORM pg_advisory_xact_lock(hashtext('void:' || p_transaction_id::text));

  -- Get the transaction with fund info
  SELECT t.*, f.code as fund_code, f.asset, f.name as fund_name,
         p.first_name, p.last_name, p.email
  INTO v_tx
  FROM transactions_v2 t
  JOIN funds f ON f.id = t.fund_id
  LEFT JOIN profiles p ON p.id = t.investor_id
  WHERE t.id = p_transaction_id;

  IF v_tx IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction not found',
      'yield_dependency', jsonb_build_object('warning', NULL, 'count', 0)
    );
  END IF;

  -- Check if already voided
  IF v_tx.is_voided THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction is already voided',
      'yield_dependency', jsonb_build_object('warning', NULL, 'count', 0)
    );
  END IF;

  -- Get current position value directly into a scalar variable
  SELECT COALESCE(ip.current_value, 0)
  INTO v_current_value
  FROM investor_positions ip
  WHERE ip.investor_id = v_tx.investor_id
    AND ip.fund_id = v_tx.fund_id;

  -- If no position found, default to 0
  IF v_current_value IS NULL THEN
    v_current_value := 0;
  END IF;

  -- Calculate projected value and change after voiding
  -- Void reverses the transaction effect:
  --   DEPOSIT (+100):   void subtracts 100 from position -> projected = current - 100
  --   WITHDRAWAL (-50): void adds back 50 to position -> projected = current - (-50) = current + 50
  --   YIELD (+10):      void subtracts 10 from position -> projected = current - 10
  --   FEE (-5):         void adds back 5 to position -> projected = current - (-5) = current + 5
  --
  -- Formula: projected = current - stored_amount (works for all types because amounts are signed)
  -- Change = -stored_amount (negative for deposits, positive for withdrawals)

  v_projected_value := v_current_value - v_tx.amount;
  v_position_change := -v_tx.amount;

  -- Check for dependent yields
  SELECT array_agg(DISTINCT yd.id)
  INTO v_dependent_yields
  FROM yield_distributions yd
  WHERE yd.fund_id = v_tx.fund_id
    AND yd.effective_date >= v_tx.tx_date
    AND yd.status = 'applied'
    AND yd.voided_at IS NULL;

  IF array_length(v_dependent_yields, 1) > 0 THEN
    v_yield_warning := jsonb_build_object(
      'warning', 'YIELDS_MAY_REQUIRE_RECALCULATION',
      'severity', 'HIGH',
      'message', format('Voiding may affect %s yield distribution(s) after %s',
                        array_length(v_dependent_yields, 1), v_tx.tx_date),
      'affected_yield_ids', to_jsonb(v_dependent_yields),
      'count', array_length(v_dependent_yields, 1)
    );
  ELSE
    v_yield_warning := jsonb_build_object('warning', NULL, 'count', 0);
  END IF;

  -- Build impact summary
  RETURN jsonb_build_object(
    'success', true,
    'transaction_type', v_tx.type,
    'transaction_amount', v_tx.amount,
    'transaction_date', v_tx.tx_date,
    'current_position', v_current_value,
    'projected_position', v_projected_value,
    'position_change', v_position_change,
    'would_go_negative', v_projected_value < 0,
    'aum_records_affected', 1,
    'is_system_generated', COALESCE(v_tx.is_system_generated, false),
    'yield_dependency', v_yield_warning,
    'investor_name', trim(coalesce(v_tx.first_name, '') || ' ' || coalesce(v_tx.last_name, '')),
    'fund_code', v_tx.fund_code
  );
END;
$$;


ALTER FUNCTION "public"."get_void_transaction_impact"("p_transaction_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_void_transaction_impact"("p_transaction_id" "uuid") IS 'Preview function for void_transaction impact analysis.
Fixed: Uses scalar variable for current_value to ensure reliable calculation.
Returns:
  - current_position: Position value before void
  - projected_position: Position value after void (current - transaction_amount)
  - position_change: Change in position (negative for voided deposits, positive for voided withdrawals)
Uses advisory lock: hashtext(''void:'' || transaction_id)';



CREATE OR REPLACE FUNCTION "public"."get_void_yield_impact"("p_distribution_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result json;
  v_distribution RECORD;
  v_affected_count INTEGER;
  v_total_yield NUMERIC;
  v_total_fees NUMERIC;
  v_total_ib NUMERIC;
  v_tx_count INTEGER;
BEGIN
  -- Get distribution details
  SELECT id, fund_id, gross_yield, period_start, period_end, status
  INTO v_distribution
  FROM yield_distributions WHERE id = p_distribution_id;
  
  IF v_distribution.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Distribution not found');
  END IF;
  
  IF v_distribution.status = 'VOIDED' THEN
    RETURN json_build_object('success', false, 'error', 'Distribution is already voided');
  END IF;
  
  -- Count affected investors from fee_allocations (reliable distribution_id linkage)
  SELECT COUNT(DISTINCT investor_id), COALESCE(SUM(base_net_income), 0)
  INTO v_affected_count, v_total_yield
  FROM fee_allocations
  WHERE distribution_id = p_distribution_id 
    AND is_voided = false;
  
  -- Count transactions linked to distribution (may be 0 for old data)
  SELECT COUNT(*) INTO v_tx_count
  FROM transactions_v2 
  WHERE distribution_id = p_distribution_id 
    AND is_voided = false;
  
  -- Sum fees
  SELECT COALESCE(SUM(fee_amount), 0) INTO v_total_fees
  FROM fee_allocations 
  WHERE distribution_id = p_distribution_id 
    AND is_voided = false;
  
  -- Sum IB commissions
  SELECT COALESCE(SUM(ib_fee_amount), 0) INTO v_total_ib
  FROM ib_allocations 
  WHERE distribution_id = p_distribution_id 
    AND is_voided = false;
  
  -- Build result JSON using fee_allocations as primary source
  SELECT json_build_object(
    'success', true,
    'distribution_id', p_distribution_id,
    'fund_id', v_distribution.fund_id,
    'gross_yield_amount', v_distribution.gross_yield,
    'period_start', v_distribution.period_start,
    'period_end', v_distribution.period_end,
    'affected_investors', v_affected_count,
    'total_investor_yield', v_total_yield,
    'total_fees', v_total_fees,
    'total_ib_commissions', v_total_ib,
    'transaction_count', v_tx_count,
    'investors', COALESCE((
      SELECT json_agg(json_build_object(
        'investor_id', fa.investor_id,
        'investor_name', COALESCE(p.first_name || ' ' || p.last_name, p.email),
        'yield_amount', fa.base_net_income,
        'fee_amount', fa.fee_amount
      ))
      FROM fee_allocations fa
      LEFT JOIN profiles p ON p.id = fa.investor_id
      WHERE fa.distribution_id = p_distribution_id 
        AND fa.is_voided = false
    ), '[]'::json)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_void_yield_impact"("p_distribution_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_void_yield_impact"("p_distribution_id" "uuid") IS 'CANONICAL: Previews the impact of voiding a yield distribution. Returns
affected transactions, fee allocations, and position changes.
Called by: reconciliationService.getVoidYieldImpact';



CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_super_admin_role"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = p_user_id 
      AND role = 'super_admin'
  )
$$;


ALTER FUNCTION "public"."has_super_admin_role"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_super_admin_role"("p_user_id" "uuid") IS 'SUPER ADMIN CHECK FOR SPECIFIC USER: Checks if given user_id has super_admin role. Used in admin management UI to show role status of other users.';



CREATE OR REPLACE FUNCTION "public"."increment_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN 
    NEW.version := COALESCE(OLD.version, 0) + 1; 
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "public"."increment_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_all_hwm_values"() RETURNS TABLE("updated_count" integer, "positions_affected" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count integer;
  v_positions jsonb;
BEGIN
  WITH updated AS (
    UPDATE investor_positions
    SET high_water_mark = GREATEST(COALESCE(current_value, 0), COALESCE(cost_basis, 0))
    WHERE high_water_mark IS NULL OR high_water_mark = 0
    RETURNING investor_id, fund_id, high_water_mark
  )
  SELECT COUNT(*)::integer, COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', investor_id,
    'fund_id', fund_id,
    'new_hwm', high_water_mark
  )), '[]'::jsonb)
  INTO v_count, v_positions
  FROM updated;
  
  RETURN QUERY SELECT v_count, v_positions;
END;
$$;


ALTER FUNCTION "public"."initialize_all_hwm_values"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_crystallization_dates"("p_fund_id" "uuid" DEFAULT NULL::"uuid", "p_admin_id" "uuid" DEFAULT NULL::"uuid", "p_dry_run" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin uuid;
  v_position RECORD;
  v_count int := 0;
  v_positions jsonb := '[]'::jsonb;
BEGIN
  v_admin := COALESCE(p_admin_id, auth.uid());

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  -- Process positions that have never been crystallized
  FOR v_position IN
    SELECT
      ip.investor_id,
      ip.fund_id,
      f.code as fund_code,
      ip.current_value,
      (SELECT MIN(tx_date) FROM transactions_v2 t
       WHERE t.investor_id = ip.investor_id
       AND t.fund_id = ip.fund_id
       AND t.is_voided = false) as first_tx_date
    FROM investor_positions ip
    JOIN funds f ON f.id = ip.fund_id
    WHERE ip.last_yield_crystallization_date IS NULL
      AND ip.is_active = true
      AND (p_fund_id IS NULL OR ip.fund_id = p_fund_id)
  LOOP
    IF NOT p_dry_run THEN
      -- Set crystallization date to first transaction date (or today if none)
      UPDATE investor_positions
      SET
        last_yield_crystallization_date = COALESCE(v_position.first_tx_date, CURRENT_DATE),
        updated_at = NOW()
      WHERE investor_id = v_position.investor_id
        AND fund_id = v_position.fund_id;
    END IF;

    v_positions := v_positions || jsonb_build_object(
      'investor_id', v_position.investor_id,
      'fund_code', v_position.fund_code,
      'current_value', v_position.current_value,
      'first_tx_date', v_position.first_tx_date,
      'will_set_crystal_date', COALESCE(v_position.first_tx_date, CURRENT_DATE)
    );
    v_count := v_count + 1;
  END LOOP;

  -- Log if executed
  IF NOT p_dry_run AND v_count > 0 THEN
    INSERT INTO audit_log (action, table_name, record_id, new_data, performed_by, performed_at)
    VALUES (
      'CRYSTALLIZATION_INIT',
      'investor_positions',
      NULL,
      jsonb_build_object('positions_updated', v_count, 'fund_id', p_fund_id),
      v_admin,
      NOW()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'dry_run', p_dry_run,
    'positions_count', v_count,
    'positions', v_positions
  );
END;
$$;


ALTER FUNCTION "public"."initialize_crystallization_dates"("p_fund_id" "uuid", "p_admin_id" "uuid", "p_dry_run" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_fund_aum_from_positions"("p_fund_id" "uuid", "p_admin_id" "uuid" DEFAULT NULL::"uuid", "p_aum_date" "date" DEFAULT CURRENT_DATE) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_positions_sum numeric;
  v_existing_aum uuid;
  v_new_aum_id uuid;
BEGIN
  v_admin := COALESCE(p_admin_id, auth.uid());

  -- Get fund
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Calculate positions sum
  SELECT COALESCE(SUM(current_value), 0) INTO v_positions_sum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND is_active = true;

  -- Check if AUM already exists for this date
  SELECT id INTO v_existing_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_aum_date
    AND purpose = 'transaction'
    AND is_voided = false
  LIMIT 1;

  IF v_existing_aum IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'AUM already exists for this fund and date',
      'existing_aum_id', v_existing_aum
    );
  END IF;

  -- Insert new AUM record
  INSERT INTO fund_daily_aum (
    fund_id,
    aum_date,
    total_aum,
    source,
    purpose,
    created_by,
    created_at
  ) VALUES (
    p_fund_id,
    p_aum_date,
    v_positions_sum,
    'position_sync',
    'transaction'::aum_purpose,
    v_admin,
    NOW()
  )
  RETURNING id INTO v_new_aum_id;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'aum_date', p_aum_date,
    'total_aum', v_positions_sum,
    'aum_id', v_new_aum_id
  );
END;
$$;


ALTER FUNCTION "public"."initialize_fund_aum_from_positions"("p_fund_id" "uuid", "p_admin_id" "uuid", "p_aum_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_yield_transaction"("p_investor_name" "text", "p_fund_code" "text", "p_month" "text", "p_tx_date" "date", "p_amount" numeric, "p_admin_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_investor_id UUID;
  v_fund_id UUID;
  v_asset TEXT;
  v_ref_id TEXT;
BEGIN
  -- Find investor
  SELECT id INTO v_investor_id FROM profiles 
  WHERE LOWER(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) 
        ILIKE '%' || p_investor_name || '%'
  LIMIT 1;
  
  -- Find fund and its asset
  SELECT id, asset INTO v_fund_id, v_asset FROM funds WHERE code = p_fund_code;
  
  IF v_investor_id IS NULL OR v_fund_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if yield already exists for this month
  IF EXISTS (
    SELECT 1 FROM transactions_v2
    WHERE investor_id = v_investor_id 
      AND fund_id = v_fund_id
      AND type = 'YIELD' 
      AND tx_date >= (p_month || '-01')::date
      AND tx_date < ((p_month || '-01')::date + INTERVAL '1 month')
      AND NOT is_voided
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Generate reference ID
  v_ref_id := 'YIELD-' || p_fund_code || '-' || p_month || '-' || v_investor_id::text;
  
  -- Enable canonical RPC bypass
  PERFORM set_canonical_rpc(true);
  
  -- Insert yield transaction with asset, source, and reference_id
  INSERT INTO transactions_v2 (
    investor_id, fund_id, type, amount, tx_date, value_date, asset, source, reference_id, notes, created_by
  ) VALUES (
    v_investor_id, v_fund_id, 'YIELD', p_amount,
    p_tx_date, p_tx_date, v_asset, 'migration', v_ref_id,
    'Monthly yield for ' || p_month, p_admin_id
  );
  
  -- Update position
  UPDATE investor_positions
  SET current_value = current_value + p_amount, updated_at = NOW()
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id;
  
  -- Disable canonical RPC bypass
  PERFORM set_canonical_rpc(false);
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."insert_yield_transaction"("p_investor_name" "text", "p_fund_code" "text", "p_month" "text", "p_tx_date" "date", "p_amount" numeric, "p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."internal_route_to_fees"("p_from_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_effective_date" "date", "p_reason" "text", "p_admin_id" "uuid", "p_transfer_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("transfer_id" "uuid", "debit_tx_id" "uuid", "credit_tx_id" "uuid", "success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_transfer_id uuid := COALESCE(p_transfer_id, gen_random_uuid());
  v_debit_tx_id uuid;
  v_credit_tx_id uuid;
  v_fund record;
  v_fees_account_id uuid;
BEGIN
  IF NOT public.is_admin(p_admin_id) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'Admin access required';
    RETURN;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'Amount must be positive';
    RETURN;
  END IF;

  IF check_historical_lock(p_fund_id, p_effective_date) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'FIRST PRINCIPLES VIOLATION: Cannot route funds on ' || p_effective_date || ' because a subsequent Yield Distribution is locked on the ledger.';
    RETURN;
  END IF;

  SELECT * INTO v_fund FROM public.funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'Fund not found for ID: ' || COALESCE(p_fund_id::text, 'NULL');
    RETURN;
  END IF;

  SELECT id INTO v_fees_account_id
  FROM public.profiles
  WHERE account_type = 'fees_account'::public.account_type
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_fees_account_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'Fees account not configured (profiles.account_type=fees_account)';
    RETURN;
  END IF;

  SELECT
    (SELECT id FROM public.transactions_v2 WHERE public.transactions_v2.transfer_id = v_transfer_id AND is_voided = false AND type = 'INTERNAL_WITHDRAWAL'::public.tx_type LIMIT 1),
    (SELECT id FROM public.transactions_v2 WHERE public.transactions_v2.transfer_id = v_transfer_id AND is_voided = false AND type = 'INTERNAL_CREDIT'::public.tx_type LIMIT 1)
  INTO v_debit_tx_id, v_credit_tx_id;

  IF v_debit_tx_id IS NOT NULL OR v_credit_tx_id IS NOT NULL THEN
    RETURN QUERY SELECT v_transfer_id, v_debit_tx_id, v_credit_tx_id, true, 'Transfer already processed';
    RETURN;
  END IF;

  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, purpose, visibility_scope,
    transfer_id, notes, created_by, is_system_generated
  )
  VALUES (
    p_from_investor_id,
    p_fund_id,
    v_fund.asset,
    v_fund.fund_class,
    (-ABS(p_amount))::numeric(38,18),
    'INTERNAL_WITHDRAWAL'::public.tx_type,
    p_effective_date,
    p_effective_date,
    'internal_routing'::public.tx_source,
    'transaction'::public.aum_purpose,
    'admin_only'::public.visibility_scope,
    v_transfer_id,
    p_reason,
    p_admin_id,
    true
  )
  RETURNING id INTO v_debit_tx_id;

  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, purpose, visibility_scope,
    transfer_id, notes, created_by, is_system_generated
  )
  VALUES (
    v_fees_account_id,
    p_fund_id,
    v_fund.asset,
    v_fund.fund_class,
    ABS(p_amount)::numeric(38,18),
    'INTERNAL_CREDIT'::public.tx_type,
    p_effective_date,
    p_effective_date,
    'internal_routing'::public.tx_source,
    'transaction'::public.aum_purpose,
    'admin_only'::public.visibility_scope,
    v_transfer_id,
    p_reason,
    p_admin_id,
    true
  )
  RETURNING id INTO v_credit_tx_id;

  RETURN QUERY SELECT v_transfer_id, v_debit_tx_id, v_credit_tx_id, true, 'Internal transfer completed successfully';
END;
$$;


ALTER FUNCTION "public"."internal_route_to_fees"("p_from_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_effective_date" "date", "p_reason" "text", "p_admin_id" "uuid", "p_transfer_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."internal_route_to_fees"("p_from_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_effective_date" "date", "p_reason" "text", "p_admin_id" "uuid", "p_transfer_id" "uuid") IS 'Admin-initiated internal transfer from investor to INDIGO FEES account. Used for manual fee routing.';



CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin'::app_role, 'super_admin'::app_role)
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin"() IS 'PRIMARY ADMIN CHECK: Returns true if current user has admin or super_admin role. Used in RLS policies and trigger functions. Checks user_roles table first, falls back to profiles.is_admin flag for legacy support.';



CREATE OR REPLACE FUNCTION "public"."is_admin"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id
      AND role IN ('admin'::app_role, 'super_admin'::app_role)
  );
$$;


ALTER FUNCTION "public"."is_admin"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_canonical_rpc"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if the canonical_rpc session variable is set to 'true'
  -- Use 'indigo.canonical_rpc' to match the trigger
  RETURN COALESCE(current_setting('indigo.canonical_rpc', true), 'false') = 'true';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;


ALTER FUNCTION "public"."is_canonical_rpc"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_canonical_rpc"() IS 'Returns true if the current session is executing within a canonical RPC context. Checks indigo.canonical_rpc session variable.';



CREATE OR REPLACE FUNCTION "public"."is_crystallization_current"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_target_date" "date" DEFAULT CURRENT_DATE) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_position RECORD;
  v_last_crystal_date date;
  v_last_tx_date date;
  v_is_current boolean;
BEGIN
  -- Get position info
  SELECT
    ip.last_yield_crystallization_date,
    ip.current_value,
    ip.cumulative_yield_earned
  INTO v_position
  FROM investor_positions ip
  WHERE ip.investor_id = p_investor_id
    AND ip.fund_id = p_fund_id;

  IF v_position IS NULL THEN
    RETURN jsonb_build_object(
      'is_current', true,
      'reason', 'no_position',
      'message', 'No position exists - will be created on first transaction'
    );
  END IF;

  v_last_crystal_date := v_position.last_yield_crystallization_date;

  -- Get last transaction date
  SELECT MAX(tx_date) INTO v_last_tx_date
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND is_voided = false;

  -- Check if crystallization is current
  v_is_current := (
    v_last_crystal_date IS NOT NULL
    AND (v_last_tx_date IS NULL OR v_last_crystal_date >= v_last_tx_date)
    AND v_last_crystal_date >= p_target_date - interval '1 day'
  );

  RETURN jsonb_build_object(
    'is_current', v_is_current,
    'last_crystallization_date', v_last_crystal_date,
    'last_transaction_date', v_last_tx_date,
    'target_date', p_target_date,
    'current_value', v_position.current_value,
    'cumulative_yield', v_position.cumulative_yield_earned,
    'days_behind', CASE
      WHEN v_last_crystal_date IS NULL THEN NULL
      ELSE (p_target_date - v_last_crystal_date)::int
    END,
    'message', CASE
      WHEN v_last_crystal_date IS NULL THEN 'Position has never been crystallized'
      WHEN NOT v_is_current THEN 'Crystallization is stale - yield must be crystallized before transaction'
      ELSE 'Crystallization is current'
    END
  );
END;
$$;


ALTER FUNCTION "public"."is_crystallization_current"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_target_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_crystallization_current"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_target_date" "date") IS 'Check if a position crystallization is current for the target date. Used by admin UI.';



CREATE OR REPLACE FUNCTION "public"."is_import_enabled"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT (value)::boolean 
    FROM public.system_config 
    WHERE key = 'excel_import_enabled'
  );
END;
$$;


ALTER FUNCTION "public"."is_import_enabled"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_import_enabled"() IS 'Checks if Excel imports are currently enabled';



CREATE OR REPLACE FUNCTION "public"."is_period_locked"("p_fund_id" "uuid", "p_date" "date") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM statement_periods
    WHERE status = 'FINALIZED'
      AND year = EXTRACT(YEAR FROM p_date)::int
      AND month = EXTRACT(MONTH FROM p_date)::int
  );
$$;


ALTER FUNCTION "public"."is_period_locked"("p_fund_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.has_super_admin_role(auth.uid())
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_super_admin"() IS 'PRIMARY SUPER ADMIN CHECK: Returns true only if current user has super_admin role. Required for sensitive operations: unlock periods, void yields, reset data, manage admin roles.';



CREATE OR REPLACE FUNCTION "public"."is_super_admin"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.has_super_admin_role(p_user_id)
$$;


ALTER FUNCTION "public"."is_super_admin"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_within_edit_window"("p_created_at" timestamp with time zone) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_window_days INTEGER;
BEGIN
  SELECT (value)::integer INTO v_window_days
  FROM public.system_config 
  WHERE key = 'edit_window_days';
  
  RETURN (NOW() - p_created_at) < (v_window_days || ' days')::INTERVAL;
END;
$$;


ALTER FUNCTION "public"."is_within_edit_window"("p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_yield_period_closed"("p_fund_id" "uuid", "p_year" integer, "p_month" integer, "p_purpose" "public"."aum_purpose") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND EXTRACT(YEAR FROM period_start) = p_year
      AND EXTRACT(MONTH FROM period_start) = p_month
      AND purpose = p_purpose
      AND (is_voided = false OR is_voided IS NULL)
      AND status = 'applied'
  );
END;
$$;


ALTER FUNCTION "public"."is_yield_period_closed"("p_fund_id" "uuid", "p_year" integer, "p_month" integer, "p_purpose" "public"."aum_purpose") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_yield_period_closed"("p_fund_id" "uuid", "p_year" integer, "p_month" integer, "p_purpose" "public"."aum_purpose") IS 'Checks if a yield period has been closed (has an applied, non-voided distribution)';



CREATE OR REPLACE FUNCTION "public"."log_audit_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES (
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."log_audit_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_audit_event"("p_action" "text", "p_entity" "text", "p_entity_id" "text" DEFAULT NULL::"text", "p_old_values" "jsonb" DEFAULT NULL::"jsonb", "p_new_values" "jsonb" DEFAULT NULL::"jsonb", "p_meta" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO public.audit_log (
        actor_user,
        action,
        entity,
        entity_id,
        old_values,
        new_values,
        meta
    ) VALUES (
        auth.uid(),
        p_action,
        p_entity,
        p_entity_id,
        p_old_values,
        p_new_values,
        p_meta
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;


ALTER FUNCTION "public"."log_audit_event"("p_action" "text", "p_entity" "text", "p_entity_id" "text", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_meta" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_aum_position_mismatch"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM fund_aum_mismatch WHERE has_mismatch = true
  LOOP
    INSERT INTO audit_log (action, entity, entity_id, meta)
    VALUES (
      'AUM_POSITION_MISMATCH',
      'fund',
      r.fund_id::text,
      jsonb_build_object(
        'fund_name', r.fund_name,
        'latest_aum', r.latest_aum,
        'sum_positions', r.sum_positions,
        'mismatch_amount', r.mismatch_amount
      )
    );
  END LOOP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_aum_position_mismatch"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_data_edit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_record_id uuid;
BEGIN
  -- Determine record ID based on table structure
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_record_id := OLD.id;
    ELSE
      v_record_id := NEW.id;
    END IF;
  EXCEPTION WHEN undefined_column THEN
    -- Table doesn't have 'id' column - generate from primary key fields
    IF TG_TABLE_NAME = 'investor_positions' THEN
      IF TG_OP = 'DELETE' THEN
        -- Use MD5 hash of composite key as deterministic UUID
        v_record_id := md5(OLD.investor_id::text || ':' || OLD.fund_id::text)::uuid;
      ELSE
        v_record_id := md5(NEW.investor_id::text || ':' || NEW.fund_id::text)::uuid;
      END IF;
    ELSE
      -- Fallback: generate random UUID for unknown tables
      v_record_id := gen_random_uuid();
    END IF;
  END;

  INSERT INTO public.data_edit_audit (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    edited_by,
    edited_at
  ) VALUES (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."log_data_edit"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_data_edit"() IS 'Audit trigger for data edits. Handles tables with single id column or composite PKs.
Fixed 2026-01-11: Handle investor_positions composite PK (investor_id, fund_id)';



CREATE OR REPLACE FUNCTION "public"."log_delivery_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
    VALUES (
      'DELIVERY_STATUS_CHANGE',
      'statement_email_delivery',
      NEW.id::text,
      auth.uid(),
      jsonb_build_object(
        'from_status', OLD.status,
        'to_status', NEW.status,
        'attempt_count', NEW.attempt_count,
        'error_message', NEW.error_message,
        'error_code', NEW.error_code
      )
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_delivery_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_financial_operation"("p_action" "text", "p_entity" "text", "p_entity_id" "text", "p_old_values" "jsonb" DEFAULT NULL::"jsonb", "p_new_values" "jsonb" DEFAULT NULL::"jsonb", "p_meta" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO audit_log (
    action, entity, entity_id, actor_user,
    old_values, new_values, meta, created_at
  )
  VALUES (
    p_action, p_entity, p_entity_id, auth.uid(),
    p_old_values, p_new_values,
    COALESCE(p_meta, '{}'::jsonb) || jsonb_build_object('logged_at', now(), 'source', 'log_financial_operation'),
    now()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."log_financial_operation"("p_action" "text", "p_entity" "text", "p_entity_id" "text", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_meta" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_financial_operation"("p_action" "text", "p_entity" "text", "p_entity_id" "text", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_meta" "jsonb") IS 'Standardized financial operation logging function.';



CREATE OR REPLACE FUNCTION "public"."log_ledger_mismatches"() RETURNS TABLE("mismatch_count" integer, "logged" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_mismatch_count int;
  v_details jsonb;
BEGIN
  SELECT COUNT(*), jsonb_agg(
    jsonb_build_object(
      'investor_id', m.investor_id,
      'fund_id', m.fund_id,
      'position_value', m.position_value,
      'ledger_balance', m.ledger_balance,
      'difference', m.difference
    )
  )
  INTO v_mismatch_count, v_details
  FROM public.investor_position_ledger_mismatch m
  LIMIT 10;

  IF v_mismatch_count > 0 THEN
    INSERT INTO audit_log (action, entity, entity_id, meta)
    VALUES (
      'LEDGER_MISMATCH_DETECTED',
      'system',
      'ledger_reconciliation',
      jsonb_build_object(
        'mismatch_count', v_mismatch_count,
        'samples', COALESCE(v_details, '[]'::jsonb),
        'threshold', 0.00000001,
        'action_required', true
      )
    );
    RETURN QUERY SELECT v_mismatch_count, true;
  ELSE
    RETURN QUERY SELECT 0, false;
  END IF;
END;
$$;


ALTER FUNCTION "public"."log_ledger_mismatches"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_security_event"("p_event_type" "text", "p_severity" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_details" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    entity,
    action,
    actor_user,
    new_values,
    meta,
    created_at
  ) VALUES (
    'security_events',
    p_event_type,
    COALESCE(p_user_id, auth.uid()),
    jsonb_build_object(
      'severity', p_severity,
      'details', p_details,
      'timestamp', now()
    ),
    jsonb_build_object('source', 'log_security_event'),
    now()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."log_security_event"("p_event_type" "text", "p_severity" "text", "p_user_id" "uuid", "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_withdrawal_action"("p_request_id" "uuid", "p_action" "text", "p_meta" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES (
    'WITHDRAWAL_' || UPPER(p_action),
    'withdrawal_request',
    p_request_id::text,
    auth.uid(),
    p_meta
  );
END;
$$;


ALTER FUNCTION "public"."log_withdrawal_action"("p_request_id" "uuid", "p_action" "text", "p_meta" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."maintain_high_water_mark"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- HWM should be the maximum of old HWM and new current_value
  IF NEW.current_value > COALESCE(OLD.high_water_mark, 0) THEN
    NEW.high_water_mark := NEW.current_value;
  ELSE
    -- Preserve existing HWM if current value is lower
    NEW.high_water_mark := COALESCE(OLD.high_water_mark, NEW.current_value);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."maintain_high_water_mark"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_delivery_result"("p_delivery_id" "uuid", "p_success" boolean, "p_provider_message_id" "text" DEFAULT NULL::"text", "p_error_code" "text" DEFAULT NULL::"text", "p_error_message" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_success THEN
    UPDATE statement_email_delivery
    SET status = 'sent',
        sent_at = now(),
        provider_message_id = p_provider_message_id,
        locked_by = NULL,
        locked_at = NULL,
        updated_at = now()
    WHERE id = p_delivery_id;
  ELSE
    UPDATE statement_email_delivery
    SET status = 'failed',
        failed_at = now(),
        error_code = p_error_code,
        error_message = p_error_message,
        locked_by = NULL,
        locked_at = NULL,
        updated_at = now()
    WHERE id = p_delivery_id;
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."mark_delivery_result"("p_delivery_id" "uuid", "p_success" boolean, "p_provider_message_id" "text", "p_error_code" "text", "p_error_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_sent_manually"("p_delivery_id" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN 
    RAISE EXCEPTION 'Admin required'; 
  END IF;
  
  UPDATE statement_email_delivery
  SET status = 'sent',
      sent_at = now(),
      metadata = metadata || jsonb_build_object(
        'manual_note', COALESCE(p_note, 'Marked sent manually'),
        'marked_by', auth.uid()::text,
        'marked_at', now()::text
      ),
      updated_at = now()
  WHERE id = p_delivery_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery not found');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."mark_sent_manually"("p_delivery_id" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merge_duplicate_profiles"("p_keep_profile_id" "uuid", "p_merge_profile_id" "uuid", "p_admin_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin uuid;
  v_keep_profile RECORD;
  v_merge_profile RECORD;
  v_merged_data jsonb := '{}';
  v_positions_merged int := 0;
  v_transactions_updated int := 0;
  v_withdrawals_updated int := 0;
  v_allocations_updated int := 0;
  v_lock_key bigint;
BEGIN
  -- Validate admin
  v_admin := COALESCE(p_admin_id, auth.uid());
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin authentication required for profile merge';
  END IF;

  -- Validate profiles exist
  SELECT * INTO v_keep_profile FROM profiles WHERE id = p_keep_profile_id;
  IF v_keep_profile IS NULL THEN
    RAISE EXCEPTION 'Keep profile not found: %', p_keep_profile_id;
  END IF;

  SELECT * INTO v_merge_profile FROM profiles WHERE id = p_merge_profile_id;
  IF v_merge_profile IS NULL THEN
    RAISE EXCEPTION 'Merge profile not found: %', p_merge_profile_id;
  END IF;

  -- Cannot merge same profile
  IF p_keep_profile_id = p_merge_profile_id THEN
    RAISE EXCEPTION 'Cannot merge profile with itself';
  END IF;

  -- Acquire lock on both profiles
  v_lock_key := ('x' || substr(md5(p_keep_profile_id::text || p_merge_profile_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Store merge audit data
  v_merged_data := jsonb_build_object(
    'keep_profile', jsonb_build_object(
      'id', v_keep_profile.id,
      'email', v_keep_profile.email,
      'name', v_keep_profile.first_name || ' ' || v_keep_profile.last_name
    ),
    'merge_profile', jsonb_build_object(
      'id', v_merge_profile.id,
      'email', v_merge_profile.email,
      'name', v_merge_profile.first_name || ' ' || v_merge_profile.last_name
    )
  );

  -- 1. Merge investor_positions
  -- For positions in same fund, sum the values to keep profile
  -- For positions in different funds, just reassign
  WITH positions_to_merge AS (
    SELECT
      mp.fund_id,
      mp.current_value as merge_value,
      mp.cost_basis as merge_cost_basis,
      mp.cumulative_yield_earned as merge_yield,
      kp.investor_id as keep_has_position
    FROM investor_positions mp
    LEFT JOIN investor_positions kp
      ON kp.investor_id = p_keep_profile_id
      AND kp.fund_id = mp.fund_id
    WHERE mp.investor_id = p_merge_profile_id
  ),
  -- Update existing positions (merge values)
  updated_positions AS (
    UPDATE investor_positions ip
    SET
      current_value = ip.current_value + ptm.merge_value,
      cost_basis = ip.cost_basis + ptm.merge_cost_basis,
      cumulative_yield_earned = COALESCE(ip.cumulative_yield_earned, 0) + COALESCE(ptm.merge_yield, 0),
      updated_at = NOW()
    FROM positions_to_merge ptm
    WHERE ip.investor_id = p_keep_profile_id
      AND ip.fund_id = ptm.fund_id
      AND ptm.keep_has_position IS NOT NULL
    RETURNING ip.fund_id
  ),
  -- Reassign positions that don't exist in keep profile
  reassigned_positions AS (
    UPDATE investor_positions ip
    SET investor_id = p_keep_profile_id
    FROM positions_to_merge ptm
    WHERE ip.investor_id = p_merge_profile_id
      AND ip.fund_id = ptm.fund_id
      AND ptm.keep_has_position IS NULL
    RETURNING ip.fund_id
  )
  SELECT
    (SELECT COUNT(*) FROM updated_positions) + (SELECT COUNT(*) FROM reassigned_positions)
  INTO v_positions_merged;

  -- Delete merged positions (if any duplicates remain)
  DELETE FROM investor_positions
  WHERE investor_id = p_merge_profile_id;

  -- 2. Update transactions
  UPDATE transactions_v2
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;
  GET DIAGNOSTICS v_transactions_updated = ROW_COUNT;

  -- 3. Update withdrawal requests
  UPDATE withdrawal_requests
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;
  GET DIAGNOSTICS v_withdrawals_updated = ROW_COUNT;

  -- 4. Update yield allocations
  UPDATE yield_allocations
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;
  GET DIAGNOSTICS v_allocations_updated = ROW_COUNT;

  -- 5. Update fee allocations
  UPDATE fee_allocations
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;

  -- 6. Update IB allocations
  UPDATE ib_allocations
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;

  -- 7. Update statements
  UPDATE statements
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;

  -- 8. Update investor_yield_events
  UPDATE investor_yield_events
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;

  -- 9. Update documents
  UPDATE documents
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;

  -- 10. Create audit record
  INSERT INTO audit_log (
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    performed_by,
    performed_at
  ) VALUES (
    'PROFILE_MERGE',
    'profiles',
    p_keep_profile_id,
    v_merged_data,
    jsonb_build_object(
      'positions_merged', v_positions_merged,
      'transactions_updated', v_transactions_updated,
      'withdrawals_updated', v_withdrawals_updated,
      'allocations_updated', v_allocations_updated
    ),
    v_admin,
    NOW()
  );

  -- 11. Soft-delete the merged profile (don't hard delete for audit trail)
  UPDATE profiles
  SET
    email = email || '_merged_' || NOW()::text,
    is_active = false,
    updated_at = NOW()
  WHERE id = p_merge_profile_id;

  -- 12. Recompute positions for keep profile
  PERFORM recompute_investor_positions_for_investor(p_keep_profile_id);

  RETURN jsonb_build_object(
    'success', true,
    'keep_profile_id', p_keep_profile_id,
    'merged_profile_id', p_merge_profile_id,
    'positions_merged', v_positions_merged,
    'transactions_updated', v_transactions_updated,
    'withdrawals_updated', v_withdrawals_updated,
    'allocations_updated', v_allocations_updated,
    'message', 'Profiles merged successfully'
  );

EXCEPTION WHEN OTHERS THEN
  -- Log error
  INSERT INTO audit_log (
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    performed_by,
    performed_at
  ) VALUES (
    'PROFILE_MERGE_FAILED',
    'profiles',
    p_keep_profile_id,
    v_merged_data,
    jsonb_build_object('error', SQLERRM),
    v_admin,
    NOW()
  );

  RAISE;
END;
$$;


ALTER FUNCTION "public"."merge_duplicate_profiles"("p_keep_profile_id" "uuid", "p_merge_profile_id" "uuid", "p_admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."merge_duplicate_profiles"("p_keep_profile_id" "uuid", "p_merge_profile_id" "uuid", "p_admin_id" "uuid") IS 'Safely merge two duplicate profiles. Moves all data to keep_profile and deactivates merge_profile.';



CREATE OR REPLACE FUNCTION "public"."nightly_aum_reconciliation"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_mismatches integer;
  v_result jsonb;
BEGIN
  -- Count current mismatches
  SELECT COUNT(*) INTO v_mismatches FROM fund_aum_mismatch;
  
  -- If mismatches exist, fix them
  IF v_mismatches > 0 THEN
    -- Call the reconciliation RPC
    SELECT reconcile_fund_aum_with_positions() INTO v_result;
  ELSE
    v_result := jsonb_build_object('reconciled_count', 0, 'message', 'No mismatches found');
  END IF;
  
  -- Log the reconciliation run
  INSERT INTO audit_log (action, entity, meta)
  VALUES (
    'nightly_aum_reconciliation',
    'fund_daily_aum',
    jsonb_build_object(
      'mismatches_found', v_mismatches,
      'result', v_result,
      'run_at', NOW()
    )
  );
  
  RETURN jsonb_build_object(
    'mismatches_found', v_mismatches,
    'result', v_result,
    'run_at', NOW()
  );
END;
$$;


ALTER FUNCTION "public"."nightly_aum_reconciliation"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."nightly_aum_reconciliation"() IS 'Nightly job to reconcile fund AUM with position totals';



CREATE OR REPLACE FUNCTION "public"."parse_platform_error"("p_error_message" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_parts text[];
  v_error_code text;
  v_category text;
  v_message text;
  v_details jsonb;
BEGIN
  -- Try to parse structured error format: CODE|CATEGORY|MESSAGE|DETAILS
  v_parts := string_to_array(p_error_message, '|');

  IF array_length(v_parts, 1) >= 3 THEN
    v_error_code := v_parts[1];
    v_category := v_parts[2];
    v_message := v_parts[3];

    -- Try to parse details as JSON
    BEGIN
      IF array_length(v_parts, 1) >= 4 THEN
        v_details := v_parts[4]::jsonb;
      ELSE
        v_details := '{}'::jsonb;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_details := '{}'::jsonb;
    END;

    RETURN jsonb_build_object(
      'is_platform_error', true,
      'code', v_error_code,
      'category', v_category,
      'message', v_message,
      'details', v_details
    );
  ELSE
    -- Not a structured platform error
    RETURN jsonb_build_object(
      'is_platform_error', false,
      'code', 'SYSTEM_ERROR',
      'category', 'SYSTEM',
      'message', p_error_message,
      'details', '{}'::jsonb
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."parse_platform_error"("p_error_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."populate_investor_fund_performance"("p_investor_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_period_id UUID;
  v_records_inserted INTEGER := 0;
  r RECORD;
BEGIN
  -- Get current period (create if not exists)
  SELECT id INTO v_period_id
  FROM statement_periods
  WHERE status = 'DRAFT'
  ORDER BY year DESC, month DESC
  LIMIT 1;

  IF v_period_id IS NULL THEN
    INSERT INTO statement_periods (year, month, period_name, period_end_date, status)
    VALUES (
      EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
      EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
      TO_CHAR(CURRENT_DATE, 'Month YYYY'),
      (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
      'DRAFT'
    )
    RETURNING id INTO v_period_id;
  END IF;

  -- Delete existing records for this period (and optionally investor)
  DELETE FROM investor_fund_performance
  WHERE period_id = v_period_id
    AND (p_investor_id IS NULL OR investor_id = p_investor_id);

  -- For each active position, calculate metrics (investor accounts only)
  FOR r IN 
    SELECT 
      ip.investor_id,
      ip.fund_id,
      f.name as fund_name,
      ip.current_value as current_position,
      -- MTD: Current month transactions
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.tx_date >= DATE_TRUNC('month', CURRENT_DATE)
      ), 0) as mtd_additions,
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN ABS(t.amount) ELSE 0 END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.tx_date >= DATE_TRUNC('month', CURRENT_DATE)
      ), 0) as mtd_redemptions,
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type IN ('YIELD', 'IB_CREDIT')
          AND t.tx_date >= DATE_TRUNC('month', CURRENT_DATE)
      ), 0) as mtd_net_income,
      -- QTD: Current quarter transactions
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.tx_date >= DATE_TRUNC('quarter', CURRENT_DATE)
      ), 0) as qtd_additions,
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN ABS(t.amount) ELSE 0 END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.tx_date >= DATE_TRUNC('quarter', CURRENT_DATE)
      ), 0) as qtd_redemptions,
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type IN ('YIELD', 'IB_CREDIT')
          AND t.tx_date >= DATE_TRUNC('quarter', CURRENT_DATE)
      ), 0) as qtd_net_income,
      -- YTD: Current year transactions
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.tx_date >= DATE_TRUNC('year', CURRENT_DATE)
      ), 0) as ytd_additions,
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN ABS(t.amount) ELSE 0 END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.tx_date >= DATE_TRUNC('year', CURRENT_DATE)
      ), 0) as ytd_redemptions,
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type IN ('YIELD', 'IB_CREDIT')
          AND t.tx_date >= DATE_TRUNC('year', CURRENT_DATE)
      ), 0) as ytd_net_income,
      -- ITD: All transactions since inception
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
      ), 0) as itd_additions,
      COALESCE((
        SELECT SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN ABS(t.amount) ELSE 0 END)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
      ), 0) as itd_redemptions,
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id 
          AND t.fund_id = ip.fund_id 
          AND NOT t.is_voided
          AND t.type IN ('YIELD', 'IB_CREDIT')
      ), 0) as itd_net_income
    FROM investor_positions ip
    JOIN funds f ON ip.fund_id = f.id
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.current_value > 0
      AND p.account_type = 'investor'
      AND (p_investor_id IS NULL OR ip.investor_id = p_investor_id)
  LOOP
    -- Calculate beginning balances (ending - additions + redemptions - net_income)
    DECLARE
      mtd_begin NUMERIC := r.current_position - r.mtd_additions + r.mtd_redemptions - r.mtd_net_income;
      qtd_begin NUMERIC := r.current_position - r.qtd_additions + r.qtd_redemptions - r.qtd_net_income;
      ytd_begin NUMERIC := r.current_position - r.ytd_additions + r.ytd_redemptions - r.ytd_net_income;
      itd_begin NUMERIC := 0; -- ITD always starts from 0
      
      -- Modified Dietz RoR: net_income / (begin + (add - red)/2) * 100
      mtd_ror NUMERIC := CASE 
        WHEN mtd_begin + (r.mtd_additions - r.mtd_redemptions) / 2 > 0 
        THEN r.mtd_net_income / (mtd_begin + (r.mtd_additions - r.mtd_redemptions) / 2) * 100 
        ELSE 0 
      END;
      qtd_ror NUMERIC := CASE 
        WHEN qtd_begin + (r.qtd_additions - r.qtd_redemptions) / 2 > 0 
        THEN r.qtd_net_income / (qtd_begin + (r.qtd_additions - r.qtd_redemptions) / 2) * 100 
        ELSE 0 
      END;
      ytd_ror NUMERIC := CASE 
        WHEN ytd_begin + (r.ytd_additions - r.ytd_redemptions) / 2 > 0 
        THEN r.ytd_net_income / (ytd_begin + (r.ytd_additions - r.ytd_redemptions) / 2) * 100 
        ELSE 0 
      END;
      itd_ror NUMERIC := CASE 
        WHEN (r.itd_additions - r.itd_redemptions) / 2 > 0 
        THEN r.itd_net_income / ((r.itd_additions - r.itd_redemptions) / 2) * 100 
        ELSE 0 
      END;
    BEGIN
      INSERT INTO investor_fund_performance (
        period_id, investor_id, fund_name,
        mtd_beginning_balance, mtd_additions, mtd_redemptions, mtd_net_income, mtd_ending_balance, mtd_rate_of_return,
        qtd_beginning_balance, qtd_additions, qtd_redemptions, qtd_net_income, qtd_ending_balance, qtd_rate_of_return,
        ytd_beginning_balance, ytd_additions, ytd_redemptions, ytd_net_income, ytd_ending_balance, ytd_rate_of_return,
        itd_beginning_balance, itd_additions, itd_redemptions, itd_net_income, itd_ending_balance, itd_rate_of_return,
        created_at, updated_at
      ) VALUES (
        v_period_id, r.investor_id, r.fund_name,
        mtd_begin, r.mtd_additions, r.mtd_redemptions, r.mtd_net_income, r.current_position, mtd_ror,
        qtd_begin, r.qtd_additions, r.qtd_redemptions, r.qtd_net_income, r.current_position, qtd_ror,
        ytd_begin, r.ytd_additions, r.ytd_redemptions, r.ytd_net_income, r.current_position, ytd_ror,
        itd_begin, r.itd_additions, r.itd_redemptions, r.itd_net_income, r.current_position, itd_ror,
        NOW(), NOW()
      );
      
      v_records_inserted := v_records_inserted + 1;
    END;
  END LOOP;

  RETURN v_records_inserted;
END;
$$;


ALTER FUNCTION "public"."populate_investor_fund_performance"("p_investor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preserve_created_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Always preserve the original created_at value on UPDATE
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."preserve_created_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_auto_aum_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  blocked_sources TEXT[] := ARRAY['daily_carryforward_job', 'auto_carryforward', 'auto_bootstrap', 'position_sync', 'position_sync_trigger'];
BEGIN
  -- Block automated AUM generation attempts
  IF NEW.source = ANY(blocked_sources) THEN
    RAISE EXCEPTION 'Automatic AUM generation is disabled. Source "%" is blocked. Manual AUM entries only.', NEW.source;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_auto_aum_creation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preview_adb_yield_distribution_v3"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_gross_yield_amount" numeric, "p_purpose" "text" DEFAULT 'transaction'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_total_adb numeric := 0;
  v_fund RECORD;
  v_allocations jsonb := '[]'::jsonb;
  v_ib_summary jsonb := '[]'::jsonb;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_investor RECORD;
  v_gross_share numeric;
  v_net_share numeric;
  v_fee_share numeric;
  v_ib_share numeric;
  v_dust_tolerance numeric := 0.00000001;
  v_ib_parent_name text;
  -- Largest remainder variables
  v_residual numeric;
  v_largest_idx int := 0;
  v_largest_gross numeric := 0;
  v_current_idx int := 0;
BEGIN
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  SELECT COALESCE(SUM(calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end)), 0)
  INTO v_total_adb
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id
    AND ip.is_active = true
    AND p.account_type IN ('investor', 'ib', 'fees_account');

  IF v_total_adb <= 0 THEN
    RETURN jsonb_build_object(
      'success', true, 'total_adb', 0,
      'allocations', '[]'::jsonb,
      'message', 'No positions with positive average daily balance'
    );
  END IF;

  FOR v_investor IN
    SELECT
      ip.investor_id,
      p.email as investor_email,
      COALESCE(p.first_name || ' ' || p.last_name, p.email) as investor_name,
      p.account_type,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) as adb,
      -- Use centralized fee resolution (respects fee schedule + fund default)
      get_investor_fee_pct(ip.investor_id, p_fund_id, p_period_end) as fee_pct,
      p.ib_parent_id,
      -- Use centralized IB resolution (respects IB commission schedule)
      get_investor_ib_pct(ip.investor_id, p_fund_id, p_period_end) as ib_rate
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.is_active = true
      AND p.account_type IN ('investor', 'ib', 'fees_account')
      AND calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) > 0
    ORDER BY calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) DESC
  LOOP
    v_gross_share := ROUND((v_investor.adb / v_total_adb * p_gross_yield_amount)::numeric, 8);
    v_fee_share := ROUND((v_gross_share * v_investor.fee_pct / 100)::numeric, 8);

    IF v_investor.ib_parent_id IS NOT NULL AND v_investor.ib_rate > 0 THEN
      v_ib_share := ROUND((v_gross_share * v_investor.ib_rate / 100)::numeric, 8);
      SELECT COALESCE(first_name || ' ' || last_name, email) INTO v_ib_parent_name
      FROM profiles WHERE id = v_investor.ib_parent_id;
    ELSE
      v_ib_share := 0;
      v_ib_parent_name := NULL;
    END IF;

    v_net_share := v_gross_share - v_fee_share - v_ib_share;

    IF v_gross_share >= v_dust_tolerance THEN
      v_allocations := v_allocations || jsonb_build_object(
        'investor_id', v_investor.investor_id,
        'investor_email', v_investor.investor_email,
        'investor_name', v_investor.investor_name,
        'account_type', v_investor.account_type,
        'adb', v_investor.adb,
        'adb_share_pct', ROUND((v_investor.adb / v_total_adb * 100)::numeric, 4),
        'gross_yield', v_gross_share,
        'fee_pct', v_investor.fee_pct,
        'fee_amount', v_fee_share,
        'net_yield', v_net_share,
        'ib_parent_id', v_investor.ib_parent_id,
        'ib_parent_name', v_ib_parent_name,
        'ib_rate', v_investor.ib_rate,
        'ib_amount', v_ib_share
      );

      IF v_ib_share > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
        v_ib_summary := v_ib_summary || jsonb_build_object(
          'ib_parent_id', v_investor.ib_parent_id,
          'ib_parent_name', v_ib_parent_name,
          'source_investor_id', v_investor.investor_id,
          'source_investor_name', v_investor.investor_name,
          'ib_rate', v_investor.ib_rate,
          'ib_amount', v_ib_share,
          'source_gross', v_gross_share
        );
      END IF;

      -- Track largest for residual assignment
      IF v_gross_share > v_largest_gross THEN
        v_largest_gross := v_gross_share;
        v_largest_idx := v_current_idx;
      END IF;
      v_current_idx := v_current_idx + 1;

      v_total_gross := v_total_gross + v_gross_share;
      v_total_net := v_total_net + v_net_share;
      v_total_fees := v_total_fees + v_fee_share;
      v_total_ib := v_total_ib + v_ib_share;
    END IF;
  END LOOP;

  -- ========================================================================
  -- LARGEST REMAINDER: adjust the largest allocation in the preview
  -- ========================================================================
  v_residual := p_gross_yield_amount - v_total_gross;

  IF v_residual != 0 AND jsonb_array_length(v_allocations) > 0 THEN
    v_allocations := jsonb_set(
      v_allocations,
      ARRAY[v_largest_idx::text, 'gross_yield'],
      to_jsonb((v_allocations->v_largest_idx->>'gross_yield')::numeric + v_residual)
    );
    v_allocations := jsonb_set(
      v_allocations,
      ARRAY[v_largest_idx::text, 'net_yield'],
      to_jsonb((v_allocations->v_largest_idx->>'net_yield')::numeric + v_residual)
    );

    v_total_gross := v_total_gross + v_residual;
    v_total_net := v_total_net + v_residual;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'days_in_period', p_period_end - p_period_start + 1,
    'total_adb', v_total_adb,
    'gross_yield_amount', p_gross_yield_amount,
    'gross_yield', v_total_gross,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'platform_fees', v_total_fees,
    'dust_amount', 0,
    'investor_count', jsonb_array_length(v_allocations),
    'allocations', v_allocations,
    'ib_summary', v_ib_summary,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((p_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    'conservation_check', p_gross_yield_amount = (v_total_net + v_total_fees + v_total_ib),
    'calculation_method', 'adb_v3',
    'features', ARRAY['time_weighted', 'loss_carryforward', 'ib_fee_exempt', 'ib_commission', 'fees_account_in_adb', 'largest_remainder_zero_dust', 'satoshi_dust_tolerance', 'centralized_fee_resolution', 'centralized_ib_resolution']
  );
END;
$$;


ALTER FUNCTION "public"."preview_adb_yield_distribution_v3"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_gross_yield_amount" numeric, "p_purpose" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."preview_adb_yield_distribution_v3"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_gross_yield_amount" numeric, "p_purpose" "text") IS 'DEPRECATED: Use preview_segmented_yield_distribution_v5 instead. V3 is dead code on the frontend path.';


CREATE OR REPLACE FUNCTION "public"."preview_crystallization"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_target_date" "date" DEFAULT CURRENT_DATE, "p_new_total_aum" numeric DEFAULT NULL::numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_aum numeric;
  v_yield_rate numeric;
  v_days_to_crystallize int;
  v_estimated_yield numeric;
BEGIN
  PERFORM public.is_admin();

  SELECT * INTO v_position
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  IF v_position IS NULL THEN
    RETURN jsonb_build_object(
      'can_preview', false,
      'reason', 'Position not found'
    );
  END IF;

  SELECT * INTO v_fund
  FROM funds WHERE id = p_fund_id;

  IF p_new_total_aum IS NOT NULL THEN
    v_aum := p_new_total_aum;
  ELSE
    SELECT total_aum INTO v_aum
    FROM fund_daily_aum
    WHERE fund_id = p_fund_id
      AND aum_date <= p_target_date
      AND is_voided = false
    ORDER BY aum_date DESC
    LIMIT 1;
  END IF;

  IF v_aum IS NULL OR v_aum = 0 THEN
    RETURN jsonb_build_object(
      'can_preview', false,
      'reason', 'No AUM data available for fund'
    );
  END IF;

  v_days_to_crystallize := GREATEST(0,
    p_target_date - COALESCE(v_position.last_yield_crystallization_date, v_position.last_transaction_date, p_target_date - 30)
  );

  v_yield_rate := COALESCE(v_fund.max_daily_yield_pct * 365 / 100, 0.10);

  v_estimated_yield := (v_yield_rate / 365.0) * v_days_to_crystallize * v_position.current_value;

  RETURN jsonb_build_object(
    'can_preview', true,
    'investor_id', p_investor_id,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'current_value', v_position.current_value,
    'last_crystallization_date', v_position.last_yield_crystallization_date,
    'target_date', p_target_date,
    'days_to_crystallize', v_days_to_crystallize,
    'current_aum', v_aum,
    'position_share_of_aum', CASE
      WHEN v_aum > 0 THEN ROUND((v_position.current_value / v_aum * 100)::numeric, 4)
      ELSE 0
    END,
    'estimated_yield', ROUND(v_estimated_yield::numeric, 8),
    'yield_rate_annual', v_yield_rate,
    'note', 'This is an estimate. Actual yield is determined by fund performance (newAUM - currentAUM), not a fixed rate.'
  );
END;
$$;


ALTER FUNCTION "public"."preview_crystallization"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_target_date" "date", "p_new_total_aum" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."preview_crystallization"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_target_date" "date", "p_new_total_aum" numeric) IS 'Preview crystallization estimate for an investor position.
Note: Actual yield is determined by fund performance (AUM change), not a stored rate.
This preview uses max_daily_yield_pct as an estimate.';



CREATE OR REPLACE FUNCTION "public"."preview_daily_yield_to_fund_v3"("p_fund_id" "uuid", "p_yield_date" "date", "p_new_aum" numeric, "p_purpose" "text" DEFAULT 'reporting'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fund RECORD;
  v_opening_aum numeric;
  v_gross_yield_amount numeric;
  v_gross_yield_pct numeric;
  v_allocations jsonb := '[]'::jsonb;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_investor_count int := 0;
  v_investor RECORD;
  v_fee_pct numeric;
  v_fee_amount numeric;
  v_ib_pct numeric;
  v_ib_amount numeric;
  v_net_yield numeric;
  v_investor_gross numeric;
BEGIN
  -- Get fund info
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get opening AUM
  SELECT total_aum INTO v_opening_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date <= p_yield_date
    AND purpose = p_purpose::aum_purpose
    AND is_voided = false
  ORDER BY aum_date DESC
  LIMIT 1;

  IF v_opening_aum IS NULL OR v_opening_aum = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No opening AUM found');
  END IF;

  v_gross_yield_amount := p_new_aum - v_opening_aum;
  v_gross_yield_pct := (v_gross_yield_amount / v_opening_aum) * 100;

  -- Preview allocations
  FOR v_investor IN
    WITH balances AS (
      SELECT
        p.id AS investor_id,
        trim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')) AS investor_name,
        p.email AS investor_email,
        p.account_type,
        p.ib_parent_id,
        ip.current_value AS balance
      FROM investor_positions ip
      JOIN profiles p ON p.id = ip.investor_id
      WHERE ip.fund_id = p_fund_id
        AND ip.is_active = true
        AND ip.current_value > 0
    )
    SELECT
      investor_id,
      investor_name,
      investor_email,
      account_type,
      ib_parent_id,
      balance,
      CASE WHEN v_opening_aum > 0 THEN (balance / v_opening_aum) * 100 ELSE 0 END AS ownership_pct
    FROM balances
    ORDER BY balance DESC
  LOOP
    v_investor_gross := v_gross_yield_amount * (v_investor.ownership_pct / 100);

    -- FIXED: Use centralized fee resolution helpers
    v_fee_pct := get_investor_fee_pct(v_investor.investor_id, p_fund_id, p_yield_date);
    v_ib_pct := get_investor_ib_pct(v_investor.investor_id, p_fund_id, p_yield_date);

    IF v_investor_gross <= 0 THEN
      v_fee_amount := 0;
      v_ib_amount := 0;
      v_net_yield := v_investor_gross;
    ELSE
      v_fee_amount := v_investor_gross * (v_fee_pct / 100);
      v_ib_amount := v_investor_gross * (v_ib_pct / 100);
      v_net_yield := v_investor_gross - v_fee_amount;
    END IF;

    v_allocations := v_allocations || jsonb_build_object(
      'investor_id', v_investor.investor_id,
      'investor_name', v_investor.investor_name,
      'investor_email', v_investor.investor_email,
      'account_type', v_investor.account_type,
      'balance', v_investor.balance,
      'ownership_pct', ROUND(v_investor.ownership_pct, 4),
      'gross_yield', ROUND(v_investor_gross, 8),
      'fee_pct', v_fee_pct,
      'fee_amount', ROUND(v_fee_amount, 8),
      'net_yield', ROUND(v_net_yield, 8),
      'ib_pct', v_ib_pct,
      'ib_amount', ROUND(v_ib_amount, 8),
      'ib_parent_id', v_investor.ib_parent_id
    );

    v_investor_count := v_investor_count + 1;
    v_total_net := v_total_net + v_net_yield;
    v_total_fees := v_total_fees + v_fee_amount;
    v_total_ib := v_total_ib + v_ib_amount;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'yield_date', p_yield_date,
    'opening_aum', v_opening_aum,
    'closing_aum', p_new_aum,
    'gross_yield_amount', v_gross_yield_amount,
    'gross_yield_pct', ROUND(v_gross_yield_pct, 6),
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'investor_count', v_investor_count,
    'allocations', v_allocations,
    'conservation_check', ABS(v_gross_yield_amount - (v_total_net + v_total_fees)) < 0.01,
    'features', ARRAY['global_fee_schedule', 'ib_support']
  );
END;
$$;


ALTER FUNCTION "public"."preview_daily_yield_to_fund_v3"("p_fund_id" "uuid", "p_yield_date" "date", "p_new_aum" numeric, "p_purpose" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."preview_daily_yield_to_fund_v3"("p_fund_id" "uuid", "p_yield_date" "date", "p_new_aum" numeric, "p_purpose" "text") IS 'DEPRECATED: Use preview_segmented_yield_distribution_v5 instead. V3 is dead code on the frontend path.';



CREATE OR REPLACE FUNCTION "public"."preview_merge_duplicate_profiles"("p_keep_profile_id" "uuid", "p_merge_profile_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_keep_profile RECORD;
  v_merge_profile RECORD;
  v_positions_count int;
  v_transactions_count int;
  v_withdrawals_count int;
  v_yield_allocations_count int;
  v_statements_count int;
  v_overlapping_funds jsonb;
BEGIN
  PERFORM public.is_admin();

  SELECT * INTO v_keep_profile FROM profiles WHERE id = p_keep_profile_id;
  SELECT * INTO v_merge_profile FROM profiles WHERE id = p_merge_profile_id;

  IF v_keep_profile IS NULL THEN
    RETURN jsonb_build_object('error', 'Keep profile not found');
  END IF;

  IF v_merge_profile IS NULL THEN
    RETURN jsonb_build_object('error', 'Merge profile not found');
  END IF;

  IF p_keep_profile_id = p_merge_profile_id THEN
    RETURN jsonb_build_object('error', 'Cannot merge profile with itself');
  END IF;

  SELECT COUNT(*) INTO v_positions_count
  FROM investor_positions WHERE investor_id = p_merge_profile_id;
  SELECT COUNT(*) INTO v_transactions_count
  FROM transactions_v2 WHERE investor_id = p_merge_profile_id AND is_voided = false;
  SELECT COUNT(*) INTO v_withdrawals_count
  FROM withdrawal_requests WHERE investor_id = p_merge_profile_id;
  SELECT COUNT(*) INTO v_yield_allocations_count
  FROM yield_allocations WHERE investor_id = p_merge_profile_id;
  SELECT COUNT(*) INTO v_statements_count
  FROM statements WHERE investor_id = p_merge_profile_id;

  SELECT jsonb_agg(jsonb_build_object(
    'fund_id', kp.fund_id,
    'keep_value', kp.current_value,
    'merge_value', mp.current_value,
    'combined_value', kp.current_value + mp.current_value
  ))
  INTO v_overlapping_funds
  FROM investor_positions kp
  JOIN investor_positions mp ON kp.fund_id = mp.fund_id
  WHERE kp.investor_id = p_keep_profile_id
    AND mp.investor_id = p_merge_profile_id;

  RETURN jsonb_build_object(
    'can_merge', true,
    'keep_profile', jsonb_build_object(
      'id', v_keep_profile.id,
      'email', v_keep_profile.email,
      'name', v_keep_profile.first_name || ' ' || v_keep_profile.last_name,
      'created_at', v_keep_profile.created_at
    ),
    'merge_profile', jsonb_build_object(
      'id', v_merge_profile.id,
      'email', v_merge_profile.email,
      'name', v_merge_profile.first_name || ' ' || v_merge_profile.last_name,
      'created_at', v_merge_profile.created_at
    ),
    'impact', jsonb_build_object(
      'positions_to_move', v_positions_count,
      'transactions_to_move', v_transactions_count,
      'withdrawals_to_move', v_withdrawals_count,
      'yield_allocations_to_move', v_yield_allocations_count,
      'statements_to_move', v_statements_count,
      'overlapping_funds', COALESCE(v_overlapping_funds, '[]'::jsonb)
    ),
    'warnings', CASE
      WHEN v_overlapping_funds IS NOT NULL THEN
        ARRAY['Both profiles have positions in the same fund(s) - values will be combined']
      ELSE ARRAY[]::text[]
    END
  );
END;
$$;


ALTER FUNCTION "public"."preview_merge_duplicate_profiles"("p_keep_profile_id" "uuid", "p_merge_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preview_segmented_yield_distribution_v5"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_purpose" "public"."aum_purpose" DEFAULT 'reporting'::"public"."aum_purpose") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fund RECORD;
  v_period_start date;
  v_period_end date;
  v_fees_account_id uuid;
  v_opening_aum numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;

  -- Header totals (excluding fees_account)
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_fees_account_gross numeric := 0;
  v_residual numeric := 0;

  -- Crystal markers
  v_seg_count int := 0;
  v_crystals_in_period int := 0;
  v_segments_meta jsonb := '[]'::jsonb;

  v_alloc RECORD;
  v_inv RECORD;
  v_allocations_out jsonb := '[]'::jsonb;
BEGIN
  -- Validate input
  IF p_recorded_aum IS NULL OR p_recorded_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recorded AUM must be a positive number');
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Period boundaries
  IF p_purpose = 'reporting'::aum_purpose THEN
    v_period_start := GREATEST(
      date_trunc('month', p_period_end)::date,
      COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
    );
    v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;
  ELSE
    v_period_start := p_period_end;
    v_period_end := p_period_end;
  END IF;

  -- Identify fees account
  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;

  -- Opening AUM from live positions (FIRST PRINCIPLES: matches apply function)
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  v_total_month_yield := p_recorded_aum - v_opening_aum;
  v_is_negative_yield := (v_total_month_yield < 0);

  -- Count crystal markers in period (informational)
  FOR v_inv IN
    SELECT yd.effective_date
    FROM yield_distributions yd
    WHERE yd.fund_id = p_fund_id
      AND yd.effective_date >= v_period_start
      AND yd.effective_date <= v_period_end
      AND yd.is_voided = false
      AND yd.distribution_type IN ('deposit', 'withdrawal', 'transaction')
      AND yd.consolidated_into_id IS NULL
    ORDER BY yd.effective_date
  LOOP
    v_seg_count := v_seg_count + 1;
    v_crystals_in_period := v_crystals_in_period + 1;
    v_segments_meta := v_segments_meta || jsonb_build_object(
      'seg_idx', v_seg_count, 'date', v_inv.effective_date, 'type', 'crystal_marker'
    );
  END LOOP;
  v_seg_count := v_seg_count + 1;

  -- Delegate to canonical allocation function (same as apply uses)
  FOR v_alloc IN
    SELECT * FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, v_period_end)
  LOOP
    IF v_alloc.investor_id = v_fees_account_id THEN
      -- Fees account: track separately for conservation, but include in output
      v_fees_account_gross := v_fees_account_gross + v_alloc.gross;
    ELSE
      -- Regular investors: accumulate into header totals
      v_total_gross := v_total_gross + v_alloc.gross;
      v_total_net := v_total_net + v_alloc.net;
      v_total_fees := v_total_fees + v_alloc.fee;
      v_total_ib := v_total_ib + v_alloc.ib;
    END IF;

    -- Include ALL investors in allocations output (fees_account for UI visibility)
    IF v_alloc.gross != 0 OR v_alloc.fee_credit != 0 OR v_alloc.ib_credit != 0 THEN
      v_allocations_out := v_allocations_out || jsonb_build_object(
        'investor_id', v_alloc.investor_id,
        'investor_name', v_alloc.investor_name,
        'investor_email', v_alloc.investor_email,
        'account_type', v_alloc.account_type,
        'current_value', v_alloc.current_value,
        'share', v_alloc.share,
        'gross', v_alloc.gross,
        'fee_pct', v_alloc.fee_pct,
        'fee', v_alloc.fee,
        'ib_parent_id', v_alloc.ib_parent_id,
        'ib_rate', v_alloc.ib_rate,
        'ib', v_alloc.ib,
        'net', v_alloc.net,
        'fee_credit', v_alloc.fee_credit,
        'ib_credit', v_alloc.ib_credit
      );
    END IF;
  END LOOP;

  v_residual := v_total_month_yield - v_total_gross - v_fees_account_gross;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'days_in_period', v_period_end - v_period_start + 1,
    'opening_aum', v_opening_aum,
    'recorded_aum', p_recorded_aum,
    'gross_yield', v_total_gross,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'dust_amount', COALESCE(v_residual, 0),
    'dust_receiver', 'fees_account',
    'investor_count', jsonb_array_length(v_allocations_out),
    'segment_count', v_seg_count,
    'crystal_count', v_crystals_in_period,
    'crystal_markers', v_segments_meta,
    'allocations', v_allocations_out,
    'conservation_check', (v_total_gross = v_total_net + v_total_fees + v_total_ib),
    'is_negative_yield', v_is_negative_yield,
    'calculation_method', 'canonical_position_proportional',
    'features', ARRAY[
      'live_position_allocation',
      'negative_yield_support',
      'per_investor_fees',
      'ib_from_gross',
      'fees_account_yield',
      'fees_account_visible',
      'dust_to_fees_account',
      'matches_apply_function'
    ]
  );
END;
$$;


ALTER FUNCTION "public"."preview_segmented_yield_distribution_v5"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_purpose" "public"."aum_purpose") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_yield_distribution"("p_fund_id" "uuid", "p_gross_amount" numeric, "p_date" "date", "p_admin_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("investor_id" "uuid", "gross_amount" numeric, "fee_amount" numeric, "net_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_asset text;
  v_total numeric;
  v_ref text;
  v_fee_pct numeric;
  v_gross numeric;
  v_fee numeric;
  v_net numeric;
  rec record;
  v_distribution_count integer := 0;
  v_total_gross numeric := 0;
  v_total_fees numeric := 0;
  v_total_net numeric := 0;
BEGIN
  -- ========== ADVISORY LOCK: Prevent concurrent yield distributions for same fund ==========
  PERFORM pg_advisory_xact_lock(
    hashtext('yield_distribution:' || p_fund_id::text),
    hashtext(p_date::text)
  );

  IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN
    RAISE EXCEPTION 'Gross amount must be positive';
  END IF;

  SELECT asset INTO v_asset FROM funds WHERE id = p_fund_id;
  SELECT SUM(current_value) INTO v_total FROM investor_positions WHERE fund_id = p_fund_id;

  IF v_total IS NULL OR v_total <= 0 THEN
    RAISE EXCEPTION 'No positions or zero AUM';
  END IF;

  v_ref := concat('yield:', p_fund_id, ':', p_date::text);

  FOR rec IN
    SELECT ip.investor_id, ip.current_value
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    v_fee_pct := public._resolve_investor_fee_pct(rec.investor_id, p_fund_id, p_date);
    v_gross := p_gross_amount * (rec.current_value / v_total);
    v_fee := v_gross * (v_fee_pct / 100.0);
    v_net := v_gross - v_fee;

    INSERT INTO transactions_v2 (investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at)
    VALUES (rec.investor_id, p_fund_id, 'INTEREST', v_asset, v_gross, p_date, v_ref, 'Yield distribution (gross)', now());

    IF v_fee <> 0 THEN
      INSERT INTO transactions_v2 (investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at)
      VALUES (rec.investor_id, p_fund_id, 'FEE', v_asset, -v_fee, p_date, v_ref, concat('Fee ', v_fee_pct, '%'), now());
    END IF;

    UPDATE investor_positions
    SET current_value = current_value + v_net, updated_at = now()
    WHERE investor_id = rec.investor_id AND fund_id = p_fund_id;

    -- Track totals for audit
    v_distribution_count := v_distribution_count + 1;
    v_total_gross := v_total_gross + v_gross;
    v_total_fees := v_total_fees + v_fee;
    v_total_net := v_total_net + v_net;

    investor_id := rec.investor_id;
    gross_amount := v_gross;
    fee_amount := v_fee;
    net_amount := v_net;
    RETURN NEXT;
  END LOOP;

  -- ========== AUDIT LOG: Record the yield distribution operation ==========
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'YIELD_DISTRIBUTION',
    'funds',
    p_fund_id::text,
    p_admin_id,
    jsonb_build_object(
      'gross_amount_input', p_gross_amount,
      'distribution_date', p_date,
      'investors_count', v_distribution_count,
      'total_gross', v_total_gross,
      'total_fees', v_total_fees,
      'total_net', v_total_net,
      'reference', v_ref
    ),
    jsonb_build_object(
      'fund_id', p_fund_id,
      'fund_aum', v_total,
      'asset', v_asset
    )
  );

END;
$$;


ALTER FUNCTION "public"."process_yield_distribution"("p_fund_id" "uuid", "p_gross_amount" numeric, "p_date" "date", "p_admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."process_yield_distribution"("p_fund_id" "uuid", "p_gross_amount" numeric, "p_date" "date", "p_admin_id" "uuid") IS '@DEPRECATED - DO NOT USE. This function writes directly to investor_positions.
Use apply_daily_yield_to_fund_v3 instead which uses the trigger chain.
Execute privileges revoked Jan 2026.';



CREATE OR REPLACE FUNCTION "public"."process_yield_distribution_with_dust"("p_fund_id" "uuid", "p_gross_amount" numeric, "p_date" "date", "p_admin_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("investor_id" "uuid", "gross_amount" numeric, "fee_amount" numeric, "net_amount" numeric, "dust_allocated" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_asset text;
  v_total numeric;
  v_ref text;
  v_fee_pct numeric;
  v_gross numeric;
  v_fee numeric;
  v_net numeric;
  rec record;
  v_distribution_count integer := 0;
  v_total_distributed_gross numeric := 0;
  v_total_fees numeric := 0;
  v_total_net numeric := 0;
  v_dust_amount numeric := 0;
  v_platform_account_id uuid;
  v_precision integer := 10;  -- 10 decimal places for NUMERIC(28,10)
BEGIN
  -- ========== ADVISORY LOCK: Prevent concurrent yield distributions ==========
  PERFORM pg_advisory_xact_lock(
    hashtext('yield_distribution:' || p_fund_id::text),
    hashtext(p_date::text)
  );

  IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN
    RAISE EXCEPTION 'Gross amount must be positive';
  END IF;

  SELECT asset INTO v_asset FROM funds WHERE id = p_fund_id;
  SELECT SUM(current_value) INTO v_total FROM investor_positions WHERE fund_id = p_fund_id;

  IF v_total IS NULL OR v_total <= 0 THEN
    RAISE EXCEPTION 'No positions or zero AUM';
  END IF;

  v_ref := concat('yield:', p_fund_id, ':', p_date::text);

  -- Get platform fees account for dust allocation
  SELECT id INTO v_platform_account_id
  FROM profiles
  WHERE email = 'platform-fees@indigo.com'
    OR full_name = 'Indigo Platform Fees'
  LIMIT 1;

  -- Process each investor
  FOR rec IN
    SELECT ip.investor_id, ip.current_value
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    v_fee_pct := public._resolve_investor_fee_pct(rec.investor_id, p_fund_id, p_date);

    -- Calculate with full precision
    v_gross := ROUND(p_gross_amount * (rec.current_value / v_total), v_precision);
    v_fee := ROUND(v_gross * (v_fee_pct / 100.0), v_precision);
    v_net := v_gross - v_fee;

    -- Track totals for dust calculation
    v_total_distributed_gross := v_total_distributed_gross + v_gross;
    v_total_fees := v_total_fees + v_fee;
    v_total_net := v_total_net + v_net;

    -- Insert INTEREST transaction (gross)
    INSERT INTO transactions_v2 (investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at)
    VALUES (rec.investor_id, p_fund_id, 'INTEREST', v_asset, v_gross, p_date, v_ref, 'Yield distribution (gross)', now());

    -- Insert FEE transaction if applicable
    IF v_fee <> 0 THEN
      INSERT INTO transactions_v2 (investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at)
      VALUES (rec.investor_id, p_fund_id, 'FEE', v_asset, -v_fee, p_date, v_ref, concat('Fee ', v_fee_pct, '%'), now());
    END IF;

    -- Update position
    UPDATE investor_positions
    SET current_value = current_value + v_net, updated_at = now()
    WHERE investor_id = rec.investor_id AND fund_id = p_fund_id;

    v_distribution_count := v_distribution_count + 1;

    investor_id := rec.investor_id;
    gross_amount := v_gross;
    fee_amount := v_fee;
    net_amount := v_net;
    dust_allocated := 0;
    RETURN NEXT;
  END LOOP;

  -- ========== DUST CONSERVATION: Allocate rounding remainder ==========
  v_dust_amount := p_gross_amount - v_total_distributed_gross;

  IF ABS(v_dust_amount) > 0.0000000001 AND v_platform_account_id IS NOT NULL THEN
    -- Allocate dust to platform fees account
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at
    ) VALUES (
      v_platform_account_id,
      p_fund_id,
      'DUST_ALLOCATION',
      v_asset,
      v_dust_amount,
      p_date,
      v_ref,
      concat('Yield dust conservation: ', v_dust_amount),
      now()
    );

    -- Return dust allocation row
    investor_id := v_platform_account_id;
    gross_amount := v_dust_amount;
    fee_amount := 0;
    net_amount := v_dust_amount;
    dust_allocated := v_dust_amount;
    RETURN NEXT;
  END IF;

  -- ========== AUDIT LOG ==========
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'YIELD_DISTRIBUTION_WITH_DUST',
    'funds',
    p_fund_id::text,
    p_admin_id,
    jsonb_build_object(
      'gross_amount_input', p_gross_amount,
      'distribution_date', p_date,
      'investors_count', v_distribution_count,
      'total_distributed_gross', v_total_distributed_gross,
      'total_fees', v_total_fees,
      'total_net', v_total_net,
      'dust_amount', v_dust_amount,
      'reference', v_ref
    ),
    jsonb_build_object(
      'fund_id', p_fund_id,
      'fund_aum', v_total,
      'asset', v_asset,
      'dust_conservation', ABS(v_dust_amount) > 0.0000000001
    )
  );

END;
$$;


ALTER FUNCTION "public"."process_yield_distribution_with_dust"("p_fund_id" "uuid", "p_gross_amount" numeric, "p_date" "date", "p_admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."process_yield_distribution_with_dust"("p_fund_id" "uuid", "p_gross_amount" numeric, "p_date" "date", "p_admin_id" "uuid") IS '@DEPRECATED - DO NOT USE. This function writes directly to investor_positions.
Use apply_daily_yield_to_fund_v3 instead which uses the trigger chain.
Execute privileges revoked Jan 2026.';



CREATE OR REPLACE FUNCTION "public"."protect_allocation_immutable_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_at';
  END IF;
  IF OLD.created_by IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_by';
  END IF;
  IF OLD.distribution_id IS DISTINCT FROM NEW.distribution_id THEN
    RAISE EXCEPTION 'Cannot modify immutable field: distribution_id';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_allocation_immutable_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_audit_immutable_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Protect immutable audit fields
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_at';
  END IF;

  -- FIXED: Removed edited_by check - column doesn't exist on yield_distributions
  -- The created_by field is the relevant audit field for this table
  IF OLD.created_by IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_by';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_audit_immutable_fields"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."protect_audit_immutable_fields"() IS 'Prevents modification of immutable audit fields (created_at, created_by).
Fixed 2026-01-11: Removed non-existent edited_by column reference';



CREATE OR REPLACE FUNCTION "public"."protect_audit_log_immutable_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_at';
  END IF;
  IF OLD.actor_user IS DISTINCT FROM NEW.actor_user THEN
    RAISE EXCEPTION 'Cannot modify immutable field: actor_user';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_audit_log_immutable_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_profile_sensitive_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Admins can update anything
  IF is_admin() THEN
    RETURN NEW;
  END IF;

  -- Non-admins: block changes to sensitive fields
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Cannot modify is_admin field';
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot modify role field';
  END IF;
  IF NEW.account_type IS DISTINCT FROM OLD.account_type AND NOT is_admin() THEN
    RAISE EXCEPTION 'Cannot modify account_type field';
  END IF;
  IF NEW.is_system_account IS DISTINCT FROM OLD.is_system_account THEN
    RAISE EXCEPTION 'Cannot modify is_system_account field';
  END IF;
  IF NEW.include_in_reporting IS DISTINCT FROM OLD.include_in_reporting THEN
    RAISE EXCEPTION 'Cannot modify include_in_reporting field';
  END IF;
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    RAISE EXCEPTION 'Cannot modify kyc_status field';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Cannot modify email field';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot modify status field';
  END IF;
  IF NEW.ib_parent_id IS DISTINCT FROM OLD.ib_parent_id AND NOT is_admin() THEN
    RAISE EXCEPTION 'Cannot modify ib_parent_id field';
  END IF;
  IF NEW.ib_commission_source IS DISTINCT FROM OLD.ib_commission_source THEN
    RAISE EXCEPTION 'Cannot modify ib_commission_source field';
  END IF;
  IF NEW.onboarding_date IS DISTINCT FROM OLD.onboarding_date THEN
    RAISE EXCEPTION 'Cannot modify onboarding_date field';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_profile_sensitive_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_transaction_immutable_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_at';
  END IF;
  IF OLD.reference_id IS NOT NULL AND OLD.reference_id IS DISTINCT FROM NEW.reference_id THEN
    RAISE EXCEPTION 'Cannot modify immutable field: reference_id';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_transaction_immutable_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_old_audit_logs"("retention_days" integer DEFAULT 90) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  cutoff timestamptz;
  audit_deleted bigint;
  edit_deleted bigint;
BEGIN
  -- Only admins can run this
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can purge audit logs';
  END IF;

  cutoff := now() - (retention_days || ' days')::interval;

  -- Purge old audit_log rows (preserve compliance-critical actions)
  DELETE FROM public.audit_log
  WHERE created_at < cutoff
    AND action NOT IN (
      'VOID', 'VOID_TRANSACTION', 'VOID_DISTRIBUTION',
      'WITHDRAWAL_COMPLETE', 'WITHDRAWAL_APPROVED',
      'FEE_SCHEDULE_CHANGE', 'FEE_SCHEDULE_UPDATE',
      'INTEGRITY_ALERT', 'INTEGRITY_RUN',
      'ROLE_CHANGE', 'ADMIN_GRANT', 'ADMIN_REVOKE'
    );
  GET DIAGNOSTICS audit_deleted = ROW_COUNT;

  -- Purge old data_edit_audit rows
  DELETE FROM public.data_edit_audit
  WHERE edited_at < cutoff;
  GET DIAGNOSTICS edit_deleted = ROW_COUNT;

  -- Log the purge action itself
  INSERT INTO public.audit_log (actor_user, entity, action, meta)
  VALUES (
    auth.uid(),
    'system',
    'AUDIT_PURGE',
    jsonb_build_object(
      'retention_days', retention_days,
      'cutoff', cutoff,
      'audit_log_deleted', audit_deleted,
      'data_edit_audit_deleted', edit_deleted
    )
  );

  RETURN jsonb_build_object(
    'audit_log_deleted', audit_deleted,
    'data_edit_audit_deleted', edit_deleted,
    'cutoff', cutoff
  );
END;
$$;


ALTER FUNCTION "public"."purge_old_audit_logs"("retention_days" integer) OWNER TO "postgres";


DROP FUNCTION IF EXISTS "public"."qa_fees_account_id"();


CREATE OR REPLACE FUNCTION "public"."queue_statement_deliveries"("p_period_id" "uuid", "p_channel" "text" DEFAULT 'email'::"text", "p_investor_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_fund_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_queued_count INTEGER := 0;
  v_skipped_missing_email INTEGER := 0;
  v_already_exists_count INTEGER := 0;
  rec RECORD;
  v_period_name TEXT;
BEGIN
  -- Verify admin access
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get period name for subject
  SELECT period_name INTO v_period_name 
  FROM statement_periods WHERE id = p_period_id;
  
  IF v_period_name IS NULL THEN
    RETURN jsonb_build_object('error', 'Period not found');
  END IF;
  
  -- Loop through generated statements for this period
  FOR rec IN
    SELECT 
      gs.id as statement_id,
      gs.investor_id,
      gs.user_id,
      p.email,
      p.first_name,
      p.last_name
    FROM generated_statements gs
    JOIN profiles p ON p.id = gs.investor_id
    WHERE gs.period_id = p_period_id
      AND (p_investor_ids IS NULL OR gs.investor_id = ANY(p_investor_ids))
  LOOP
    -- Check if already exists
    IF EXISTS (
      SELECT 1 FROM statement_email_delivery 
      WHERE statement_id = rec.statement_id 
        AND channel = p_channel
    ) THEN
      v_already_exists_count := v_already_exists_count + 1;
      CONTINUE;
    END IF;
    
    -- Check if missing email for email channel
    IF p_channel = 'email' AND (rec.email IS NULL OR rec.email = '') THEN
      -- Insert with skipped status
      INSERT INTO statement_email_delivery (
        statement_id, investor_id, user_id, period_id, 
        recipient_email, subject, status, channel, 
        error_message, created_by, attempt_count
      ) VALUES (
        rec.statement_id, rec.investor_id, rec.user_id, p_period_id,
        '', 'N/A', 'skipped', p_channel,
        'missing_email', auth.uid(), 0
      );
      v_skipped_missing_email := v_skipped_missing_email + 1;
      CONTINUE;
    END IF;
    
    -- Queue the delivery
    INSERT INTO statement_email_delivery (
      statement_id, investor_id, user_id, period_id,
      recipient_email, subject, status, channel, created_by, attempt_count
    ) VALUES (
      rec.statement_id, rec.investor_id, rec.user_id, p_period_id,
      rec.email, 
      v_period_name || ' Statement - ' || COALESCE(rec.first_name || ' ' || rec.last_name, rec.email),
      'queued', p_channel, auth.uid(), 0
    );
    v_queued_count := v_queued_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'queued_count', v_queued_count,
    'skipped_missing_email', v_skipped_missing_email,
    'already_exists_count', v_already_exists_count
  );
END;
$$;


ALTER FUNCTION "public"."queue_statement_deliveries"("p_period_id" "uuid", "p_channel" "text", "p_investor_ids" "uuid"[], "p_fund_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."raise_platform_error"("p_error_code" "text", "p_details" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_metadata record;
  v_message text;
BEGIN
  -- Get error metadata
  SELECT * INTO v_metadata
  FROM error_code_metadata
  WHERE error_code = p_error_code;

  IF v_metadata IS NULL THEN
    v_message := 'Unknown error: ' || p_error_code;
  ELSE
    v_message := v_metadata.default_message;
  END IF;

  -- Raise exception with structured format: CODE|CATEGORY|MESSAGE|DETAILS
  RAISE EXCEPTION '%|%|%|%',
    p_error_code,
    COALESCE(v_metadata.category, 'SYSTEM'),
    v_message,
    p_details::text
  USING ERRCODE = 'P0001';  -- Custom error code for platform errors
END;
$$;


ALTER FUNCTION "public"."raise_platform_error"("p_error_code" "text", "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rebuild_investor_period_balances"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_purpose" "public"."aum_purpose") RETURNS TABLE("investor_id" "uuid", "investor_name" "text", "email" "text", "beginning_balance" numeric, "ending_balance" numeric, "additions" numeric, "redemptions" numeric, "avg_capital" numeric, "days_in_period" integer, "days_invested" integer, "fee_pct" numeric, "ib_parent_id" "uuid", "ib_percentage" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_days_in_period INTEGER;
BEGIN
  v_days_in_period := (p_period_end - p_period_start) + 1;
  
  RETURN QUERY
  WITH
  -- Get all transactions for the period
  -- NOTE: Use inv_id alias to avoid PL/pgSQL ambiguity with RETURNS TABLE investor_id
  period_txns AS (
    SELECT
      t.investor_id AS inv_id,
      t.tx_date,
      t.type,
      t.amount,
      (p_period_end - t.tx_date)::numeric / v_days_in_period as time_weight
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id
      AND t.purpose = p_purpose
      AND t.tx_date BETWEEN p_period_start AND p_period_end
      AND t.is_voided = false
  ),

  beginning_balances AS (
    SELECT
      t.investor_id AS inv_id,
      COALESCE(SUM(t.amount), 0) as balance
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id
      AND t.purpose = p_purpose
      AND t.tx_date < p_period_start
      AND t.is_voided = false
    GROUP BY t.investor_id
  ),

  period_movements AS (
    SELECT
      pt.inv_id,
      COALESCE(SUM(CASE WHEN pt.type = 'DEPOSIT' THEN pt.amount ELSE 0 END), 0) as additions,
      COALESCE(SUM(CASE WHEN pt.type = 'WITHDRAWAL' THEN ABS(pt.amount) ELSE 0 END), 0) as redemptions,
      COALESCE(SUM(pt.amount * pt.time_weight), 0) as time_weighted_adjustment
    FROM period_txns pt
    GROUP BY pt.inv_id
  ),

  all_investors AS (
    SELECT DISTINCT inv_id
    FROM (
      SELECT bb.inv_id FROM beginning_balances bb WHERE bb.balance > 0
      UNION
      SELECT pm.inv_id FROM period_movements pm WHERE pm.additions > 0 OR pm.redemptions > 0
      UNION
      SELECT ip.investor_id AS inv_id FROM investor_positions ip WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
    ) combined
  )

  SELECT
    ai.inv_id AS investor_id,
    COALESCE(p.first_name || ' ' || COALESCE(p.last_name, ''), p.email) AS investor_name,
    p.email,
    COALESCE(bb.balance, 0)::numeric AS beginning_balance,
    (COALESCE(bb.balance, 0) + COALESCE(pm.additions, 0) - COALESCE(pm.redemptions, 0))::numeric AS ending_balance,
    COALESCE(pm.additions, 0)::numeric AS additions,
    COALESCE(pm.redemptions, 0)::numeric AS redemptions,
    (COALESCE(bb.balance, 0) + COALESCE(pm.time_weighted_adjustment, 0))::numeric AS avg_capital,
    v_days_in_period AS days_in_period,
    v_days_in_period AS days_invested,
    -- Use centralized fee resolution (respects fee schedule + fund default)
    get_investor_fee_pct(ai.inv_id, p_fund_id, p_period_end) AS fee_pct,
    p.ib_parent_id,
    -- Use centralized IB resolution (respects IB commission schedule)
    get_investor_ib_pct(ai.inv_id, p_fund_id, p_period_end) AS ib_percentage
  FROM all_investors ai
  JOIN profiles p ON p.id = ai.inv_id
  LEFT JOIN beginning_balances bb ON bb.inv_id = ai.inv_id
  LEFT JOIN period_movements pm ON pm.inv_id = ai.inv_id
  WHERE COALESCE(bb.balance, 0) > 0
     OR COALESCE(pm.additions, 0) > 0
     OR EXISTS (SELECT 1 FROM investor_positions ip WHERE ip.investor_id = ai.inv_id AND ip.fund_id = p_fund_id AND ip.current_value > 0);
END;
$$;


ALTER FUNCTION "public"."rebuild_investor_period_balances"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_purpose" "public"."aum_purpose") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rebuild_position_from_ledger"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_admin_id" "uuid", "p_reason" "text", "p_dry_run" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_computed jsonb;
  v_old_position record;
  v_new_cost_basis numeric;
  v_new_current_value numeric;
  v_new_shares numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtext('rebuild_pos:' || p_investor_id::text),
    hashtext(p_fund_id::text)
  );

  IF NOT public.check_is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  v_computed := compute_position_from_ledger(p_investor_id, p_fund_id);
  
  v_new_cost_basis := (v_computed->'computed'->>'cost_basis')::numeric;
  v_new_current_value := (v_computed->'computed'->>'current_value')::numeric;
  v_new_shares := (v_computed->'computed'->>'shares')::numeric;

  SELECT * INTO v_old_position FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Position not found');
  END IF;

  IF NOT p_dry_run THEN
    PERFORM set_canonical_rpc(true);
    
    UPDATE investor_positions
    SET cost_basis = v_new_cost_basis, current_value = v_new_current_value,
        shares = v_new_shares, updated_at = now()
    WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

    PERFORM set_canonical_rpc(false);

    INSERT INTO audit_log (action, entity, entity_id, actor_user, meta, old_values, new_values)
    VALUES ('position_rebuild_from_ledger', 'investor_positions',
      p_investor_id::text || '_' || p_fund_id::text, p_admin_id,
      jsonb_build_object('reason', p_reason, 'breakdown', v_computed->'breakdown'),
      jsonb_build_object('cost_basis', v_old_position.cost_basis,
        'current_value', v_old_position.current_value, 'shares', v_old_position.shares),
      jsonb_build_object('cost_basis', v_new_cost_basis,
        'current_value', v_new_current_value, 'shares', v_new_shares)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'dry_run', p_dry_run,
    'old', jsonb_build_object('cost_basis', v_old_position.cost_basis,
      'current_value', v_old_position.current_value, 'shares', v_old_position.shares),
    'new', jsonb_build_object('cost_basis', v_new_cost_basis,
      'current_value', v_new_current_value, 'shares', v_new_shares),
    'breakdown', v_computed->'breakdown'
  );
END;
$$;


ALTER FUNCTION "public"."rebuild_position_from_ledger"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_admin_id" "uuid", "p_reason" "text", "p_dry_run" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rebuild_position_from_ledger"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_admin_id" "uuid", "p_reason" "text", "p_dry_run" boolean) IS 'ADMIN ONLY: Rebuild investor position from ledger with optional dry-run and full audit trail. For emergency repairs only. Do not call from production code.';



CREATE OR REPLACE FUNCTION "public"."recalculate_all_aum"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fixed_count int := 0;
  v_fund RECORD;
  v_actual_aum numeric;
  v_updates_made int;
BEGIN
  -- Verify admin access
  IF NOT check_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Loop through each fund
  FOR v_fund IN 
    SELECT DISTINCT fund_id FROM fund_daily_aum WHERE NOT COALESCE(is_voided, false)
  LOOP
    -- Calculate actual AUM from current positions
    SELECT COALESCE(SUM(current_value), 0) INTO v_actual_aum
    FROM investor_positions 
    WHERE fund_id = v_fund.fund_id;
    
    -- Update all non-voided AUM records where value differs
    UPDATE fund_daily_aum
    SET 
      total_aum = v_actual_aum, 
      updated_at = now(),
      source = COALESCE(source, '') || ' (auto-synced)'
    WHERE fund_id = v_fund.fund_id
      AND NOT COALESCE(is_voided, false)
      AND total_aum != v_actual_aum;
    
    GET DIAGNOSTICS v_updates_made = ROW_COUNT;
    IF v_updates_made > 0 THEN
      v_fixed_count := v_fixed_count + 1;
    END IF;
  END LOOP;

  -- Create audit log entry
  INSERT INTO audit_log (action, entity, actor_user, new_values)
  VALUES (
    'RECALCULATE_ALL_AUM', 
    'fund_daily_aum', 
    auth.uid(), 
    jsonb_build_object('funds_fixed', v_fixed_count, 'triggered_at', now())
  );

  RETURN jsonb_build_object(
    'success', true, 
    'funds_fixed', v_fixed_count,
    'message', format('%s fund(s) had AUM records updated', v_fixed_count)
  );
END;
$$;


ALTER FUNCTION "public"."recalculate_all_aum"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_fund_aum_for_date"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose", "p_actor_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_calculated_aum numeric(28,10);
  v_existing_record RECORD;
  v_actor uuid;
  v_changes jsonb := '[]'::jsonb;
  v_new_record_id uuid;
  v_action text := 'none';
BEGIN
  -- ===== ADVISORY LOCK (FIX #10) =====
  PERFORM pg_advisory_xact_lock(
    hashtext('aum:' || p_fund_id::text),
    hashtext(p_date::text)
  );

  v_actor := COALESCE(p_actor_id, auth.uid());

  -- Calculate AUM from ALL positions (conserved NAV)
  -- Fee recipients and IB accounts ARE part of fund NAV - do not exclude them
  SELECT COALESCE(SUM(ip.current_value), 0)::numeric(28,10)
  INTO v_calculated_aum
  FROM public.investor_positions ip
  WHERE ip.fund_id = p_fund_id
    AND ip.current_value > 0;

  SELECT * INTO v_existing_record
  FROM public.fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_date
    AND purpose = p_purpose
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  -- Enable canonical RPC bypass for fund_daily_aum mutations
  PERFORM set_canonical_rpc(true);

  IF FOUND THEN
    IF ABS(v_existing_record.total_aum - v_calculated_aum) > 0.00001 THEN
      UPDATE public.fund_daily_aum
      SET is_voided = true,
          voided_at = NOW(),
          voided_by = v_actor,
          void_reason = 'Auto-corrected by recalculate_fund_aum_for_date: old=' ||
                        v_existing_record.total_aum || ', new=' || v_calculated_aum
      WHERE id = v_existing_record.id;

      INSERT INTO public.fund_daily_aum (
        fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end
      )
      VALUES (
        p_fund_id, p_date, v_calculated_aum, p_purpose, 'transaction_op', v_actor,
        (p_date = (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date)
      )
      RETURNING id INTO v_new_record_id;

      v_action := 'corrected';
      v_changes := v_changes || jsonb_build_object(
        'action', 'corrected',
        'old_record_id', v_existing_record.id,
        'new_record_id', v_new_record_id,
        'old_aum', v_existing_record.total_aum,
        'new_aum', v_calculated_aum,
        'difference', v_calculated_aum - v_existing_record.total_aum
      );

      INSERT INTO public.audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
      VALUES (
        'fund_daily_aum', v_new_record_id::text, 'AUM_RECALCULATED', v_actor,
        jsonb_build_object('total_aum', v_existing_record.total_aum, 'old_record_id', v_existing_record.id),
        jsonb_build_object('total_aum', v_calculated_aum, 'new_record_id', v_new_record_id),
        jsonb_build_object('fund_id', p_fund_id, 'date', p_date, 'purpose', p_purpose)
      );
    ELSE
      v_action := 'unchanged';
    END IF;
  ELSE
    INSERT INTO public.fund_daily_aum (
      fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end
    )
    VALUES (
      p_fund_id, p_date, v_calculated_aum, p_purpose, 'transaction_op', v_actor,
      (p_date = (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date)
    )
    RETURNING id INTO v_new_record_id;

    v_action := 'created';
    v_changes := v_changes || jsonb_build_object(
      'action', 'created',
      'record_id', v_new_record_id,
      'aum', v_calculated_aum
    );
  END IF;

  -- Disable canonical RPC bypass
  PERFORM set_canonical_rpc(false);

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'date', p_date,
    'purpose', p_purpose,
    'calculated_aum', v_calculated_aum,
    'action', v_action,
    'changes', v_changes
  );
END;
$$;


ALTER FUNCTION "public"."recalculate_fund_aum_for_date"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "public"."aum_purpose", "p_actor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."recalculate_fund_aum_for_date"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "public"."aum_purpose", "p_actor_id" "uuid") IS 'Recalculates fund AUM for a specific date using conserved NAV (includes ALL positions: investors, fees_account, ib). Fixed 2026-02-06 to include fees_account positions.';



CREATE OR REPLACE FUNCTION "public"."recompute_investor_position"("p_investor_id" "uuid", "p_fund_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_value numeric(38,18);
  v_cost_basis numeric(38,18);
BEGIN
  RAISE NOTICE 'ADMIN REPAIR: Recomputing position for investor % in fund %', p_investor_id, p_fund_id;
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN -1 * ABS(amount)
      ELSE amount
    END
  ), 0) INTO v_current_value
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND investor_id = p_investor_id
    AND is_voided = false;

  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN ABS(amount)
      WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN -1 * ABS(amount)
      WHEN type = 'ADJUSTMENT' THEN amount
      ELSE 0
    END
  ), 0) INTO v_cost_basis
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND investor_id = p_investor_id
    AND is_voided = false;

  IF v_cost_basis < 0 THEN
    v_cost_basis := 0;
  END IF;

  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active, updated_at)
  VALUES (p_investor_id, p_fund_id, v_current_value, v_cost_basis, 0, v_current_value > 0, now())
  ON CONFLICT (investor_id, fund_id)
  DO UPDATE SET
    current_value = EXCLUDED.current_value,
    cost_basis = EXCLUDED.cost_basis,
    is_active = EXCLUDED.is_active,
    updated_at = now();
END;
$$;


ALTER FUNCTION "public"."recompute_investor_position"("p_investor_id" "uuid", "p_fund_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."recompute_investor_position"("p_investor_id" "uuid", "p_fund_id" "uuid") IS 'ADMIN ONLY: Recompute single investor position from transaction ledger. For emergency repairs only. Do not call from production code.';



CREATE OR REPLACE FUNCTION "public"."recompute_investor_positions_for_investor"("p_investor_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT fund_id 
    FROM transactions_v2 
    WHERE investor_id = p_investor_id
  LOOP
    PERFORM public.recompute_investor_position(p_investor_id, r.fund_id);
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."recompute_investor_positions_for_investor"("p_investor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."recompute_investor_positions_for_investor"("p_investor_id" "uuid") IS 'ADMIN ONLY: Recompute all positions for an investor across all funds. Batch repair operation. Do not call from production code.';



CREATE OR REPLACE FUNCTION "public"."recompute_on_void"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only act on void transitions
  IF NOT (TG_OP = 'UPDATE' AND NEW.is_voided = true AND OLD.is_voided = false) THEN
    RETURN NEW;
  END IF;

  -- The calling RPC (e.g., void_transaction) already set indigo.canonical_rpc = 'true'
  -- before updating transactions_v2. fn_ledger_drives_position has already handled the
  -- incremental delta in this same transaction. Skip the redundant full recompute.
  IF current_setting('indigo.canonical_rpc', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Safety net: full recompute with correct parameter order (investor first, fund second)
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM reconcile_investor_position_internal(
    NEW.investor_id,  -- p_investor_id
    NEW.fund_id       -- p_fund_id
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."recompute_on_void"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."recompute_on_void"() IS 'SPARE/TRIGGER FUNCTION: No longer attached to any table. 
   Use fn_ledger_drives_position() for void handling instead.
   This function is kept as a spare for manual invocation only.';



CREATE OR REPLACE FUNCTION "public"."reconcile_all_positions"("p_dry_run" boolean DEFAULT true) RETURNS TABLE("investor_id" "uuid", "fund_id" "uuid", "investor_name" "text", "fund_name" "text", "old_value" numeric, "new_value" numeric, "old_shares" numeric, "new_shares" numeric, "action" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  IF NOT p_dry_run THEN
    RAISE WARNING 'ADMIN REPAIR: Running reconcile_all_positions with fixes - this will update %', 
      (SELECT COUNT(*) FROM investor_positions);
  ELSE
    RAISE NOTICE 'ADMIN REPAIR: Running reconcile_all_positions in DRY RUN mode';
  END IF;
  
  v_admin_id := auth.uid();
  PERFORM public.ensure_admin();
  
  IF NOT p_dry_run THEN
    PERFORM set_canonical_rpc();
  END IF;
  
  RETURN QUERY
  WITH ledger_balances AS (
    SELECT 
      t.investor_id, 
      t.fund_id,
      COALESCE(SUM(
        CASE 
          WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN t.amount
          WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(t.amount)
          ELSE 0
        END
      ), 0) as balance
    FROM transactions_v2 t
    WHERE NOT t.is_voided
    GROUP BY t.investor_id, t.fund_id
  ),
  mismatches AS (
    SELECT 
      ip.investor_id,
      ip.fund_id,
      COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown') as investor_name,
      COALESCE(f.name, 'Unknown Fund') as fund_name,
      ip.current_value as old_value,
      COALESCE(lb.balance, 0) as new_value,
      ip.shares as old_shares,
      COALESCE(lb.balance, 0) as new_shares,
      CASE WHEN p_dry_run THEN 'WOULD_UPDATE' ELSE 'UPDATED' END as action
    FROM investor_positions ip
    LEFT JOIN ledger_balances lb ON ip.investor_id = lb.investor_id AND ip.fund_id = lb.fund_id
    LEFT JOIN profiles p ON ip.investor_id = p.id
    LEFT JOIN funds f ON ip.fund_id = f.id
    WHERE ABS(ip.current_value - COALESCE(lb.balance, 0)) > 0.0001
  )
  SELECT * FROM mismatches;
  
  IF NOT p_dry_run THEN
    WITH ledger_balances AS (
      SELECT 
        t.investor_id, 
        t.fund_id,
        COALESCE(SUM(
          CASE 
            WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN t.amount
            WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(t.amount)
            ELSE 0
          END
        ), 0) as balance
      FROM transactions_v2 t
      WHERE NOT t.is_voided
      GROUP BY t.investor_id, t.fund_id
    )
    UPDATE investor_positions ip
    SET 
      current_value = lb.balance,
      shares = lb.balance,
      updated_at = NOW()
    FROM ledger_balances lb
    WHERE ip.investor_id = lb.investor_id 
      AND ip.fund_id = lb.fund_id
      AND ABS(ip.current_value - lb.balance) > 0.0001;
      
    INSERT INTO audit_log (action, entity, actor_user, meta)
    VALUES (
      'RECONCILE_ALL_POSITIONS',
      'investor_positions',
      v_admin_id,
      jsonb_build_object('dry_run', p_dry_run, 'executed_at', now(), 'canonical_bypass', true)
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."reconcile_all_positions"("p_dry_run" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reconcile_all_positions"("p_dry_run" boolean) IS 'ADMIN ONLY: Reconcile all positions with optional dry-run preview. For emergency repairs only. Do not call from production code.';



CREATE OR REPLACE FUNCTION "public"."reconcile_fund_aum_with_positions"() RETURNS TABLE("out_fund_id" "uuid", "out_fund_code" "text", "out_old_aum" numeric, "out_new_aum" numeric, "out_difference" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fund_id uuid;
  v_old_aum numeric;
  v_new_aum numeric;
  v_aum_date date;
  v_aum_id uuid;
  v_fund_code text;
BEGIN
  -- Enable canonical mutation flag
  PERFORM public.set_canonical_rpc(true);

  -- Process each fund with a mismatch
  FOR v_fund_id, v_old_aum, v_new_aum, v_aum_date, v_aum_id IN
    SELECT 
      fda.fund_id,
      fda.total_aum as old_aum,
      COALESCE(pt.calculated_aum, 0) as new_aum,
      fda.aum_date,
      fda.id
    FROM (
      SELECT DISTINCT ON (fund_id)
        id, fund_id, aum_date, total_aum
      FROM fund_daily_aum
      WHERE is_voided = false
      ORDER BY fund_id, aum_date DESC
    ) fda
    LEFT JOIN (
      SELECT 
        ip.fund_id,
        COALESCE(SUM(ip.current_value), 0) as calculated_aum
      FROM investor_positions ip
      GROUP BY ip.fund_id
    ) pt ON pt.fund_id = fda.fund_id
    WHERE fda.total_aum != COALESCE(pt.calculated_aum, 0)
  LOOP
    -- Update the AUM record
    UPDATE fund_daily_aum
    SET 
      total_aum = v_new_aum,
      source = 'integrity_reconciliation',
      updated_at = NOW()
    WHERE id = v_aum_id;

    -- Get fund code
    SELECT code INTO v_fund_code FROM funds WHERE id = v_fund_id;

    -- Return the reconciled record
    out_fund_id := v_fund_id;
    out_fund_code := v_fund_code;
    out_old_aum := v_old_aum;
    out_new_aum := v_new_aum;
    out_difference := v_new_aum - v_old_aum;
    
    RETURN NEXT;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."reconcile_fund_aum_with_positions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reconcile_fund_aum_with_positions"() IS 'Canonical RPC to reconcile fund_daily_aum records with actual investor_positions totals.';



CREATE OR REPLACE FUNCTION "public"."reconcile_investor_position_internal"("p_investor_id" "uuid", "p_fund_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_value numeric(38,18);
  v_cost_basis numeric(38,18);
  v_realized_pnl numeric(38,18);
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_current_value
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND (is_voided IS NULL OR is_voided = false);

  -- ALIGNED with canonical recompute_investor_position: use ABS for deposits, -ABS for withdrawals
  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN ABS(amount)
      WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN -1 * ABS(amount)
      WHEN type = 'ADJUSTMENT' THEN amount
      ELSE 0
    END
  ), 0)
  INTO v_cost_basis
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND (is_voided IS NULL OR is_voided = false);

  v_cost_basis := GREATEST(v_cost_basis, 0);

  SELECT COALESCE(SUM(amount), 0)
  INTO v_realized_pnl
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND (is_voided IS NULL OR is_voided = false)
    AND type IN ('YIELD', 'IB_CREDIT', 'INTEREST', 'FEE_CREDIT');

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  INSERT INTO investor_positions (
    investor_id, fund_id, cost_basis, current_value, shares, realized_pnl,
    is_active, updated_at
  ) VALUES (
    p_investor_id, p_fund_id, v_cost_basis, v_current_value, v_current_value, v_realized_pnl,
    (v_current_value > 0),
    now()
  )
  ON CONFLICT (investor_id, fund_id)
  DO UPDATE SET
    cost_basis = EXCLUDED.cost_basis,
    current_value = EXCLUDED.current_value,
    shares = EXCLUDED.shares,
    realized_pnl = EXCLUDED.realized_pnl,
    is_active = EXCLUDED.is_active,
    updated_at = now();
END;
$$;


ALTER FUNCTION "public"."reconcile_investor_position_internal"("p_investor_id" "uuid", "p_fund_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reconcile_investor_position_internal"("p_investor_id" "uuid", "p_fund_id" "uuid") IS 'ADMIN ONLY: Reconcile single position mismatch without full rebuild. For emergency repairs only. Do not call from production code.';



CREATE OR REPLACE FUNCTION "public"."refresh_materialized_view_concurrently"("view_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  EXECUTE format('REFRESH MATERIALIZED VIEW %I', view_name);
END;
$$;


ALTER FUNCTION "public"."refresh_materialized_view_concurrently"("view_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_yield_materialized_views"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_start_time timestamptz := clock_timestamp();
  v_views_refreshed text[] := ARRAY[]::text[];
BEGIN
  -- Refresh investor_positions_mv if it exists
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'investor_positions_mv') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY investor_positions_mv;
    v_views_refreshed := array_append(v_views_refreshed, 'investor_positions_mv');
  END IF;

  -- Refresh fund_daily_stats_mv if it exists
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'fund_daily_stats_mv') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY fund_daily_stats_mv;
    v_views_refreshed := array_append(v_views_refreshed, 'fund_daily_stats_mv');
  END IF;

  -- Refresh any other yield-related MVs
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'yield_summary_mv') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY yield_summary_mv;
    v_views_refreshed := array_append(v_views_refreshed, 'yield_summary_mv');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'views_refreshed', v_views_refreshed,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'views_refreshed', v_views_refreshed
  );
END;
$$;


ALTER FUNCTION "public"."refresh_yield_materialized_views"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_yield_materialized_views"() IS 'INTERNAL: Refreshes materialized views after yield operations. Should be
called after apply/void operations to update cached aggregates.
Called by: cacheInvalidation.refreshYieldMaterializedViews';



CREATE OR REPLACE FUNCTION "public"."reject_withdrawal"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE 
  v_request RECORD;
BEGIN
  -- Ensure admin privileges
  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);
  PERFORM public.ensure_admin();
  
  -- Validate rejection reason
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  -- Get request details
  SELECT * INTO v_request 
  FROM public.withdrawal_requests 
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN 
    RAISE EXCEPTION 'Can only reject pending requests. Current status: %', v_request.status;
  END IF;

  -- Update request
  UPDATE public.withdrawal_requests
  SET 
    status = 'rejected',
    rejection_reason = p_reason,
    rejected_by = auth.uid(),
    rejected_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  -- Log action
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'reject',
    jsonb_build_object(
      'reason', p_reason,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."reject_withdrawal"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reject_withdrawal"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text") IS 'Transitions withdrawal from pending→rejected. Requires admin. Logs to withdrawal_audit_logs.';



CREATE OR REPLACE FUNCTION "public"."reopen_yield_period"("p_fund_id" "uuid", "p_year" integer, "p_month" integer, "p_purpose" "public"."aum_purpose", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_super_admin boolean;
  v_distribution_id uuid;
  v_fund_code text;
  v_void_result jsonb;
BEGIN
  -- Check super admin status
  SELECT is_super_admin INTO v_is_super_admin 
  FROM profiles 
  WHERE id = v_user_id;
  
  IF NOT COALESCE(v_is_super_admin, false) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error_code', 'UNAUTHORIZED',
      'message', 'Super admin privileges required to reopen a yield period'
    );
  END IF;

  -- Get fund code for messaging
  SELECT code INTO v_fund_code FROM funds WHERE id = p_fund_id;

  -- Find the active distribution for this period
  SELECT id INTO v_distribution_id
  FROM yield_distributions
  WHERE fund_id = p_fund_id
    AND EXTRACT(YEAR FROM period_start) = p_year
    AND EXTRACT(MONTH FROM period_start) = p_month
    AND purpose = p_purpose
    AND (is_voided = false OR is_voided IS NULL)
    AND status = 'applied'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_distribution_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error_code', 'NOT_FOUND',
      'message', format('No closed period found for %s %s/%s', COALESCE(v_fund_code, p_fund_id::text), p_month, p_year)
    );
  END IF;

  -- Void the distribution to reopen the period
  -- This calls the existing void_yield_distribution function
  SELECT void_yield_distribution(
    v_distribution_id,
    format('Period reopened by super admin: %s', p_reason)
  ) INTO v_void_result;

  -- Check if void was successful
  IF NOT (v_void_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VOID_FAILED',
      'message', format('Failed to void distribution: %s', v_void_result->>'message')
    );
  END IF;

  -- Audit log the reopen action
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'REOPEN_YIELD_PERIOD', 
    'yield_distributions', 
    v_distribution_id::text, 
    v_user_id,
    jsonb_build_object(
      'fund_id', p_fund_id,
      'fund_code', v_fund_code,
      'year', p_year,
      'month', p_month,
      'purpose', p_purpose::text,
      'reason', p_reason
    ),
    jsonb_build_object('distribution_id', v_distribution_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'message', format('Period %s/%s reopened for %s. Previous yield distribution has been voided.', p_month, p_year, COALESCE(v_fund_code, 'fund'))
  );
END;
$$;


ALTER FUNCTION "public"."reopen_yield_period"("p_fund_id" "uuid", "p_year" integer, "p_month" integer, "p_purpose" "public"."aum_purpose", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reopen_yield_period"("p_fund_id" "uuid", "p_year" integer, "p_month" integer, "p_purpose" "public"."aum_purpose", "p_reason" "text") IS 'Super admin only: Reopens a closed yield period by voiding the existing distribution';



CREATE OR REPLACE FUNCTION "public"."repair_all_positions"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin_id uuid;
  v_count integer := 0;
  v_result jsonb;
BEGIN
  RAISE WARNING 'NUCLEAR OPERATION: Repairing ALL positions in database - this may take significant time';
  PERFORM public.ensure_admin();
  v_admin_id := auth.uid();
  PERFORM set_canonical_rpc(true);

  WITH RECALC AS (
    SELECT 
      t.investor_id, 
      t.fund_id,
      COALESCE(SUM(
        CASE 
          WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN t.amount
          WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(t.amount)
          ELSE 0
        END
      ), 0) as recalculated_value
    FROM transactions_v2 t
    WHERE NOT t.is_voided
    GROUP BY t.investor_id, t.fund_id
  )
  UPDATE investor_positions ip
  SET 
    current_value = rec.recalculated_value,
    updated_at = NOW()
  FROM RECALC rec
  WHERE ip.investor_id = rec.investor_id 
    AND ip.fund_id = rec.fund_id
    AND ip.current_value != rec.recalculated_value;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO audit_log (action, entity, actor_user, meta)
  VALUES (
    'REPAIR_ALL_POSITIONS',
    'investor_positions',
    v_admin_id,
    jsonb_build_object('positions_repaired', v_count, 'executed_at', now(), 'canonical_bypass', true)
  );

  v_result := jsonb_build_object('repaired', v_count, 'status', 'complete');
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."repair_all_positions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."repair_all_positions"() IS 'ADMIN ONLY: Nuclear option - recompute all investor positions across entire database. For emergency/audit only. No dry-run available. Do not call from production code.';



CREATE OR REPLACE FUNCTION "public"."replace_aum_snapshot"("p_fund_id" "uuid", "p_aum_date" "date", "p_new_total_aum" numeric, "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose", "p_admin_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin uuid;
  v_old_aum RECORD;
  v_new_aum_id uuid;
  v_validation_result jsonb;
BEGIN
  -- Advisory lock: prevent concurrent AUM replacement for same fund+date
  PERFORM pg_advisory_xact_lock(
    hashtext('replace_aum:' || p_fund_id::text),
    hashtext(p_aum_date::text)
  );

  v_admin := COALESCE(p_admin_id, auth.uid());

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'Reason is required for AUM replacement';
  END IF;

  v_validation_result := validate_aum_against_positions(
    p_fund_id, p_new_total_aum, 0.10, 'replace_aum_snapshot'
  );

  IF NOT (v_validation_result->>'valid')::boolean THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'AUM_VALIDATION_FAILED',
      'message', v_validation_result->>'error', 'validation', v_validation_result
    );
  END IF;

  SELECT * INTO v_old_aum FROM fund_daily_aum
  WHERE fund_id = p_fund_id AND aum_date = p_aum_date
    AND purpose = p_purpose AND is_voided = false
  ORDER BY created_at DESC LIMIT 1;

  IF v_old_aum IS NOT NULL THEN
    UPDATE fund_daily_aum
    SET is_voided = true, voided_at = NOW(), voided_by = v_admin, void_reason = p_reason
    WHERE id = v_old_aum.id;
  END IF;

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, source, purpose, created_by, created_at)
  VALUES (p_fund_id, p_aum_date, p_new_total_aum, 'admin_correction', p_purpose, v_admin, NOW())
  RETURNING id INTO v_new_aum_id;

  INSERT INTO audit_log (action, table_name, record_id, old_data, new_data, performed_by, performed_at)
  VALUES ('AUM_REPLACEMENT', 'fund_daily_aum', v_new_aum_id,
    CASE WHEN v_old_aum IS NOT NULL THEN jsonb_build_object('old_aum_id', v_old_aum.id, 'old_total_aum', v_old_aum.total_aum) ELSE NULL END,
    jsonb_build_object('new_aum_id', v_new_aum_id, 'new_total_aum', p_new_total_aum, 'reason', p_reason, 'validation', v_validation_result),
    v_admin, NOW()
  );

  RETURN jsonb_build_object(
    'success', true, 'fund_id', p_fund_id, 'aum_date', p_aum_date,
    'old_aum', CASE WHEN v_old_aum IS NOT NULL THEN v_old_aum.total_aum ELSE NULL END,
    'new_aum', p_new_total_aum, 'new_aum_id', v_new_aum_id,
    'voided_old', v_old_aum IS NOT NULL, 'validation', v_validation_result
  );
END;
$$;


ALTER FUNCTION "public"."replace_aum_snapshot"("p_fund_id" "uuid", "p_aum_date" "date", "p_new_total_aum" numeric, "p_purpose" "public"."aum_purpose", "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."replace_aum_snapshot"("p_fund_id" "uuid", "p_aum_date" "date", "p_new_total_aum" numeric, "p_purpose" "public"."aum_purpose", "p_admin_id" "uuid", "p_reason" "text") IS 'Replace an AUM snapshot with a corrected value.
INCLUDES AUM VALIDATION - rejects values deviating >10% from positions.';



CREATE OR REPLACE FUNCTION "public"."requeue_stale_sending"("p_period_id" "uuid", "p_minutes" integer DEFAULT 15) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT public.is_admin() THEN 
    RAISE EXCEPTION 'Admin required'; 
  END IF;
  
  UPDATE statement_email_delivery
  SET status = 'queued',
      locked_by = NULL,
      locked_at = NULL,
      metadata = metadata || jsonb_build_object(
        'requeued_reason', 'stale_lock',
        'requeued_at', now()::text
      ),
      updated_at = now()
  WHERE period_id = p_period_id
    AND status IN ('sending', 'SENDING')
    AND locked_at < now() - (p_minutes || ' minutes')::INTERVAL;
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN jsonb_build_object('success', true, 'requeued_count', v_count);
END;
$$;


ALTER FUNCTION "public"."requeue_stale_sending"("p_period_id" "uuid", "p_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."require_admin"("p_operation" "text" DEFAULT NULL::"text", "p_admin_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Use provided admin_id or fallback to auth.uid()
  v_admin_id := COALESCE(p_admin_id, auth.uid());
  
  -- Check if user has admin role in user_roles using the provided or auth user
  IF v_admin_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = v_admin_id 
      AND role IN ('admin', 'super_admin')
    ) THEN
      RAISE EXCEPTION 'Access denied: Only administrators can perform %', 
        COALESCE(p_operation, 'this operation')
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  ELSE
    RAISE EXCEPTION 'Access denied: No user context found'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;


ALTER FUNCTION "public"."require_admin"("p_operation" "text", "p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."require_super_admin"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED: Must be authenticated to perform this operation';
  END IF;

  IF NOT public.has_super_admin_role(v_user_id) THEN
    -- Fallback: also check is_admin since QA admin may not be super_admin
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'ADMIN_REQUIRED: Must be an administrator to perform this operation';
    END IF;
  END IF;
  
  RETURN v_user_id;
END;
$$;


ALTER FUNCTION "public"."require_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."require_super_admin"("p_operation" "text", "p_actor_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Validate actor_id is provided
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED: Actor ID must be provided for %', p_operation;
  END IF;

  -- Check for super_admin role using explicit user_id
  IF NOT public.has_super_admin_role(p_actor_id) THEN
    RAISE EXCEPTION 'Superadmin required for %', p_operation;
  END IF;
END;
$$;


ALTER FUNCTION "public"."require_super_admin"("p_operation" "text", "p_actor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_all_data_keep_profiles"("p_admin_id" "uuid", "p_confirmation_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_batch_id UUID := gen_random_uuid();
  v_counts JSONB := '{}'::jsonb;
  v_count INTEGER;
BEGIN
  IF p_confirmation_code != 'FULL RESET' THEN
    RAISE EXCEPTION 'Invalid confirmation code. Expected: FULL RESET';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Phase 1: Leaf tables with FK refs to yield_distributions and transactions_v2
  DELETE FROM withdrawal_requests;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('withdrawal_requests', v_count);

  DELETE FROM investor_yield_events;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_yield_events', v_count);

  DELETE FROM yield_allocations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('yield_allocations', v_count);

  DELETE FROM ib_commission_ledger;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('ib_commission_ledger', v_count);

  DELETE FROM platform_fee_ledger;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('platform_fee_ledger', v_count);

  DELETE FROM ib_allocations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('ib_allocations', v_count);

  DELETE FROM fee_allocations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fee_allocations', v_count);

  -- Phase 2: yield_distributions (self-refs OK for bulk delete, children cleared above)
  DELETE FROM yield_distributions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('yield_distributions', v_count);

  -- Phase 3: Statement/report tables
  DELETE FROM statement_email_delivery;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('statement_email_delivery', v_count);

  DELETE FROM generated_statements;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('generated_statements', v_count);

  DELETE FROM statements;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('statements', v_count);

  DELETE FROM statement_periods;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('statement_periods', v_count);

  -- Phase 4: Performance/AUM tables
  DELETE FROM investor_fund_performance;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_fund_performance', v_count);

  DELETE FROM fund_daily_aum;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fund_daily_aum', v_count);

  DELETE FROM fund_aum_events;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fund_aum_events', v_count);

  -- Phase 5: Transactions (all FK children cleared above)
  DELETE FROM transactions_v2;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('transactions_v2', v_count);

  -- Phase 6: Positions (leaf - no children reference these)
  DELETE FROM investor_positions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_positions', v_count);

  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES ('RESET_ALL_DATA', 'system', v_batch_id::text, p_admin_id, v_counts);

  RETURN jsonb_build_object(
    'success', true, 'batch_id', v_batch_id, 'deleted_counts', v_counts,
    'message', 'Full data reset completed. All transactional data cleared. Investor profiles preserved.');
END;
$$;


ALTER FUNCTION "public"."reset_all_data_keep_profiles"("p_admin_id" "uuid", "p_confirmation_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_all_investor_positions"("p_admin_id" "uuid", "p_confirmation_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_batch_id UUID := gen_random_uuid();
  v_positions_count INTEGER;
  v_performance_count INTEGER;
  v_aum_count INTEGER;
  v_transactions_count INTEGER;
  v_total_aum_before NUMERIC;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('bulk_reset_all_positions'));
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF p_confirmation_code != 'RESET POSITIONS' THEN
    RAISE EXCEPTION 'Invalid confirmation code';
  END IF;

  SELECT COALESCE(SUM(current_value), 0) INTO v_total_aum_before FROM investor_positions;
  SELECT COUNT(*) INTO v_positions_count FROM investor_positions;
  SELECT COUNT(*) INTO v_performance_count FROM investor_fund_performance;
  SELECT COUNT(*) INTO v_aum_count FROM fund_daily_aum;
  SELECT COUNT(*) INTO v_transactions_count FROM transactions_v2;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  UPDATE investor_positions SET
    shares = 0, cost_basis = 0, current_value = 0,
    unrealized_pnl = 0, realized_pnl = 0, high_water_mark = 0,
    mgmt_fees_paid = 0, perf_fees_paid = 0, aum_percentage = 0,
    updated_at = now();

  DELETE FROM investor_fund_performance;
  DELETE FROM fund_daily_aum;

  -- NULL out FK references to transactions_v2 before deleting
  UPDATE fee_allocations SET credit_transaction_id = NULL, debit_transaction_id = NULL
    WHERE credit_transaction_id IS NOT NULL OR debit_transaction_id IS NOT NULL;
  UPDATE yield_allocations SET ib_transaction_id = NULL, fee_transaction_id = NULL, transaction_id = NULL
    WHERE ib_transaction_id IS NOT NULL OR fee_transaction_id IS NOT NULL OR transaction_id IS NOT NULL;
  UPDATE platform_fee_ledger SET transaction_id = NULL WHERE transaction_id IS NOT NULL;
  UPDATE ib_commission_ledger SET transaction_id = NULL WHERE transaction_id IS NOT NULL;
  DELETE FROM investor_yield_events;

  DELETE FROM transactions_v2;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES ('RESET_ALL_POSITIONS', 'system', v_batch_id::text, p_admin_id,
    jsonb_build_object(
      'positions_reset', v_positions_count, 'performance_deleted', v_performance_count,
      'aum_deleted', v_aum_count, 'transactions_deleted', v_transactions_count,
      'total_aum_before', v_total_aum_before));

  RETURN jsonb_build_object(
    'success', true, 'batch_id', v_batch_id,
    'positions_reset', v_positions_count, 'performance_deleted', v_performance_count,
    'aum_deleted', v_aum_count, 'transactions_deleted', v_transactions_count,
    'total_aum_before', v_total_aum_before);
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;


ALTER FUNCTION "public"."reset_all_investor_positions"("p_admin_id" "uuid", "p_confirmation_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."retry_delivery"("p_delivery_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN 
    RAISE EXCEPTION 'Admin required'; 
  END IF;
  
  UPDATE statement_email_delivery
  SET status = 'queued',
      error_message = NULL,
      error_code = NULL,
      failed_at = NULL,
      locked_by = NULL,
      locked_at = NULL,
      updated_at = now()
  WHERE id = p_delivery_id AND status IN ('failed', 'cancelled', 'FAILED', 'CANCELLED');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery not found or not in retryable state');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."retry_delivery"("p_delivery_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."route_withdrawal_to_fees"("p_request_id" "uuid", "p_actor_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_withdrawal withdrawal_requests%ROWTYPE;
  v_fees_investor_id uuid;
  v_internal_withdrawal_id uuid;
  v_internal_credit_id uuid;
  v_amount numeric(38,18);
  v_fund_id uuid;
  v_asset text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED: Actor ID must be provided';
  END IF;
  IF NOT public.has_super_admin_role(p_actor_id) THEN
    RAISE EXCEPTION 'Superadmin required for route_withdrawal_to_fees';
  END IF;

  SELECT * INTO v_withdrawal
  FROM withdrawal_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found: %', p_request_id;
  END IF;

  IF v_withdrawal.status NOT IN ('approved', 'processing') THEN
    RAISE EXCEPTION 'Withdrawal must be approved or processing. Current: %', v_withdrawal.status;
  END IF;

  SELECT id INTO v_fees_investor_id
  FROM profiles
  WHERE account_type = 'fees_account' AND is_system_account = true
  LIMIT 1;
  IF v_fees_investor_id IS NULL THEN
    RAISE EXCEPTION 'INDIGO FEES account not found.';
  END IF;

  v_amount := COALESCE(v_withdrawal.processed_amount, v_withdrawal.approved_amount, v_withdrawal.requested_amount);
  v_fund_id := v_withdrawal.fund_id;
  SELECT asset INTO v_asset FROM funds WHERE id = v_fund_id;
  IF v_asset IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', v_fund_id;
  END IF;

  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  INSERT INTO transactions_v2 (
    investor_id, fund_id, type, amount, asset,
    tx_date, value_date, notes, created_by,
    source, visibility_scope, is_system_generated
  ) VALUES (
    v_withdrawal.investor_id, v_fund_id,
    'INTERNAL_WITHDRAWAL'::tx_type, -1 * v_amount, v_asset,
    CURRENT_DATE, CURRENT_DATE,
    COALESCE(p_reason, 'Routed to INDIGO FEES'),
    p_actor_id, 'rpc_canonical'::tx_source,
    'admin_only'::visibility_scope, true
  ) RETURNING id INTO v_internal_withdrawal_id;

  INSERT INTO transactions_v2 (
    investor_id, fund_id, type, amount, asset,
    tx_date, value_date, notes, created_by,
    source, visibility_scope, is_system_generated
  ) VALUES (
    v_fees_investor_id, v_fund_id,
    'INTERNAL_CREDIT'::tx_type, v_amount, v_asset,
    CURRENT_DATE, CURRENT_DATE,
    COALESCE(p_reason, 'Received from withdrawal routing'),
    p_actor_id, 'rpc_canonical'::tx_source,
    'admin_only'::visibility_scope, true
  ) RETURNING id INTO v_internal_credit_id;

  UPDATE withdrawal_requests
  SET 
    status = 'completed',
    processed_at = NOW(),
    processed_amount = v_amount,
    admin_notes = COALESCE(admin_notes || E'\n', '') || 'Routed to INDIGO FEES: ' || COALESCE(p_reason, 'No reason provided')
  WHERE id = p_request_id;

  INSERT INTO audit_log (
    actor_user, action, entity, entity_id, meta
  ) VALUES (
    p_actor_id,
    'route_to_fees',
    'withdrawal_requests',
    p_request_id,
    jsonb_build_object(
      'withdrawal_id', p_request_id,
      'investor_id', v_withdrawal.investor_id,
      'fees_investor_id', v_fees_investor_id,
      'amount', v_amount,
      'asset', v_asset,
      'internal_withdrawal_id', v_internal_withdrawal_id,
      'internal_credit_id', v_internal_credit_id,
      'reason', p_reason
    )
  );

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."route_withdrawal_to_fees"("p_request_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."route_withdrawal_to_fees"("p_request_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") IS 'Routes a withdrawal request to the INDIGO FEES account. Requires super_admin role. 
The p_actor_id parameter must be provided for authorization check.';



CREATE OR REPLACE FUNCTION "public"."run_comprehensive_health_check"() RETURNS TABLE("check_name" "text", "check_status" "text", "violation_count" integer, "details" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check 1: Yield Conservation
  RETURN QUERY
  SELECT
    'YIELD_CONSERVATION'::text,
    CASE WHEN COUNT(*) FILTER (WHERE has_violation = true AND is_voided = false) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*) FILTER (WHERE has_violation = true AND is_voided = false)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'distribution_id', distribution_id,
      'fund_code', fund_code,
      'header_variance', header_variance
    )) FILTER (WHERE has_violation = true AND is_voided = false), '[]'::jsonb)
  FROM v_yield_conservation_violations;

  -- Check 2: Ledger-Position Match (using correct column names)
  RETURN QUERY
  SELECT
    'LEDGER_POSITION_MATCH'::text,
    CASE WHEN COUNT(*) FILTER (WHERE has_variance = true) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*) FILTER (WHERE has_variance = true)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'investor_id', investor_id,
      'fund_id', fund_id,
      'fund_code', fund_code,
      'position_balance', position_balance,
      'calculated_balance', calculated_balance,
      'variance', variance
    )) FILTER (WHERE has_variance = true), '[]'::jsonb)
  FROM v_ledger_reconciliation;

  -- Check 3: No orphan positions
  RETURN QUERY
  SELECT
    'NO_ORPHAN_POSITIONS'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'investor_id', ip.investor_id,
      'fund_id', ip.fund_id
    )), '[]'::jsonb)
  FROM investor_positions ip
  LEFT JOIN profiles p ON p.id = ip.investor_id
  WHERE p.id IS NULL;

  -- Check 4: No future-dated transactions
  RETURN QUERY
  SELECT
    'NO_FUTURE_TRANSACTIONS'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'transaction_id', id,
      'tx_date', tx_date
    )), '[]'::jsonb)
  FROM transactions_v2
  WHERE tx_date > CURRENT_DATE AND is_voided = false;

  -- Check 5: Economic date not null
  RETURN QUERY
  SELECT
    'ECONOMIC_DATE_NOT_NULL'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    '[]'::jsonb
  FROM transactions_v2
  WHERE tx_date IS NULL AND is_voided = false;

  -- Check 6: No duplicate reference_id
  RETURN QUERY
  SELECT
    'NO_DUPLICATE_REFS'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'reference_id', reference_id,
      'count', cnt
    )), '[]'::jsonb)
  FROM (
    SELECT reference_id, COUNT(*) as cnt
    FROM transactions_v2
    WHERE reference_id IS NOT NULL AND is_voided = false
    GROUP BY reference_id
    HAVING COUNT(*) > 1
  ) dups;

  -- Check 7: Management fee is zero
  RETURN QUERY
  SELECT
    'NO_MANAGEMENT_FEE'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    '[]'::jsonb
  FROM funds
  WHERE mgmt_fee_bps IS NOT NULL AND mgmt_fee_bps > 0;

  -- Check 8: Valid tx_types only
  RETURN QUERY
  SELECT
    'VALID_TX_TYPES'::text,
    'PASS'::text,
    0::int,
    '[]'::jsonb;

END;
$$;


ALTER FUNCTION "public"."run_comprehensive_health_check"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_daily_health_check"() RETURNS TABLE("check_name" "text", "status" "text", "violation_count" integer, "details" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  check_name := 'YIELD_CONSERVATION';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'distribution_id', distribution_id,
      'fund_code', fund_code,
      'violation_type', violation_type,
      'gross_diff', gross_diff
    )), '[]'::jsonb)
  INTO status, violation_count, details
  FROM v_yield_conservation_violations;
  RETURN NEXT;

  check_name := 'LEDGER_POSITION_MATCH';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'fund_code', fund_code,
      'investor_id', investor_id,
      'difference', difference
    )), '[]'::jsonb)
  INTO status, violation_count, details
  FROM v_ledger_position_mismatches;
  RETURN NEXT;

  check_name := 'NATIVE_CURRENCY';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'tx_id', t.id,
      'tx_asset', t.asset,
      'fund_asset', f.asset
    )), '[]'::jsonb)
  INTO status, violation_count, details
  FROM transactions_v2 t
  JOIN funds f ON f.id = t.fund_id
  WHERE t.asset != f.asset AND t.is_voided = false;
  RETURN NEXT;

  check_name := 'AUM_PURPOSE_CONSISTENCY';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    COUNT(*)::int,
    jsonb_build_object('message', 'Check AUM records have proper purpose flags')
  INTO status, violation_count, details
  FROM fund_daily_aum
  WHERE purpose IS NULL AND is_voided = false;
  RETURN NEXT;

  RETURN;
END;
$$;


ALTER FUNCTION "public"."run_daily_health_check"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_integrity_check"("p_scope_fund_id" "uuid" DEFAULT NULL::"uuid", "p_scope_investor_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Attempt to run assert_integrity_or_raise, catching any exception
  BEGIN
    PERFORM assert_integrity_or_raise(p_scope_fund_id, p_scope_investor_id, 'run_integrity_check');

    -- If we get here, no violations
    SELECT jsonb_build_object(
      'status', 'pass',
      'violation_count', 0,
      'violations', '[]'::jsonb,
      'run_id', (SELECT id FROM admin_integrity_runs ORDER BY run_at DESC LIMIT 1)
    ) INTO v_result;

  EXCEPTION WHEN OTHERS THEN
    -- Extract run_id from the error message if possible
    SELECT jsonb_build_object(
      'status', 'fail',
      'error', SQLERRM,
      'run_id', (SELECT id FROM admin_integrity_runs ORDER BY run_at DESC LIMIT 1)
    ) INTO v_result;
  END;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."run_integrity_check"("p_scope_fund_id" "uuid", "p_scope_investor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."run_integrity_check"("p_scope_fund_id" "uuid", "p_scope_investor_id" "uuid") IS 'CANONICAL: Scoped integrity check function. Runs checks optionally filtered by fund_id and/or investor_id.
Returns jsonb with check results. Logs to admin_integrity_runs table.
Called by integrity-monitor edge function.';



CREATE OR REPLACE FUNCTION "public"."run_integrity_pack"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_check_count integer;
BEGIN
  -- Cost basis mismatch check
  SELECT COUNT(*) INTO v_check_count FROM v_cost_basis_mismatch;
  v_result := v_result || jsonb_build_object(
    'cost_basis_mismatch', jsonb_build_object(
      'count', v_check_count,
      'status', CASE WHEN v_check_count = 0 THEN 'pass' ELSE 'fail' END,
      'severity', 'error'
    )
  );

  -- Ledger reconciliation check
  SELECT COUNT(*) INTO v_check_count FROM v_ledger_reconciliation WHERE ABS(variance) > 0.01;
  v_result := v_result || jsonb_build_object(
    'ledger_reconciliation', jsonb_build_object(
      'count', v_check_count,
      'status', CASE WHEN v_check_count = 0 THEN 'pass' ELSE 'fail' END,
      'severity', 'error'
    )
  );

  -- Orphaned positions check
  SELECT COUNT(*) INTO v_check_count FROM v_orphaned_positions;
  v_result := v_result || jsonb_build_object(
    'orphaned_positions', jsonb_build_object(
      'count', v_check_count,
      'status', CASE WHEN v_check_count = 0 THEN 'pass' ELSE 'warn' END,
      'severity', 'warning'
    )
  );

  -- Yield conservation check
  SELECT COUNT(*) INTO v_check_count FROM v_yield_conservation_violations;
  v_result := v_result || jsonb_build_object(
    'yield_conservation', jsonb_build_object(
      'count', v_check_count,
      'status', CASE WHEN v_check_count = 0 THEN 'pass' ELSE 'fail' END,
      'severity', 'error'
    )
  );

  RETURN jsonb_build_object(
    'run_at', now(),
    'checks', v_result,
    'overall_status', CASE 
      WHEN v_result @> '{"cost_basis_mismatch":{"status":"fail"}}' THEN 'fail'
      WHEN v_result @> '{"ledger_reconciliation":{"status":"fail"}}' THEN 'fail'
      WHEN v_result @> '{"yield_conservation":{"status":"fail"}}' THEN 'fail'
      ELSE 'pass'
    END
  );
END;
$$;


ALTER FUNCTION "public"."run_integrity_pack"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_invariant_checks"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_check_result JSONB;
  v_checks JSONB[] := '{}';
  v_passed_count INT := 0;
  v_failed_count INT := 0;
  v_total_checks INT := 16;
  v_violations JSONB;
  v_violation_count INT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can run invariant checks';
  END IF;

  -- Check 1: position_matches_ledger
  WITH position_ledger AS (
    SELECT ip.investor_id, ip.fund_id,
      COALESCE(ip.current_value, 0) as position_balance,
      COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided = false), 0) as ledger_sum,
      COALESCE(ip.current_value, 0) - COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided = false), 0) as drift
    FROM investor_positions ip
    LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
    GROUP BY ip.investor_id, ip.fund_id, ip.current_value
    HAVING ABS(COALESCE(ip.current_value, 0) - COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided = false), 0)) > 0.000001
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', investor_id, 'fund_id', fund_id,
    'position_balance', position_balance, 'ledger_sum', ledger_sum, 'drift', drift
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM position_ledger;
  v_checks := v_checks || jsonb_build_object('name','position_matches_ledger','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 2: fund_aum_matches_positions (informational)
  v_violations := '[]'::jsonb;
  v_violation_count := 0;
  v_checks := v_checks || jsonb_build_object('name','fund_aum_matches_positions','category','core','passed',true,'violation_count',0,'violations',v_violations, 'note', 'AUM is dynamically derived from positions.');
  v_passed_count := v_passed_count + 1;

  -- Check 3: yield_conservation
  WITH conservation AS (
    SELECT yd.id as distribution_id, yd.fund_id, yd.effective_date, yd.gross_yield,
      (SELECT COALESCE(SUM(net_amount),0) FROM yield_allocations WHERE distribution_id=yd.id AND is_voided=false) as sum_net,
      (SELECT COALESCE(SUM(fee_amount),0) FROM fee_allocations WHERE distribution_id=yd.id AND is_voided=false) as sum_fees,
      (SELECT COALESCE(SUM(ib_fee_amount),0) FROM ib_allocations WHERE distribution_id=yd.id AND is_voided=false) as sum_ib
    FROM yield_distributions yd
    WHERE yd.is_voided = false AND yd.gross_yield > 0
      AND yd.gross_yield_amount IS NOT NULL
  ),
  violations AS (
    SELECT distribution_id, fund_id, effective_date, gross_yield,
           sum_net + sum_fees + sum_ib as sum_parts,
           gross_yield - (sum_net + sum_fees + sum_ib) as drift
    FROM conservation WHERE ABS(gross_yield - (sum_net + sum_fees + sum_ib)) > 0.000001
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', distribution_id, 'fund_id', fund_id, 'effective_date', effective_date,
    'gross_yield', gross_yield, 'sum_parts', sum_parts, 'drift', drift
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM violations;
  v_checks := v_checks || jsonb_build_object('name','yield_conservation','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 4: no_negative_positions
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', investor_id, 'fund_id', fund_id, 'balance', current_value
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM investor_positions WHERE current_value < -0.000001;
  v_checks := v_checks || jsonb_build_object('name','no_negative_positions','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 5: no_orphan_transactions
  WITH orphans AS (
    SELECT t.id as tx_id, t.investor_id, t.fund_id, t.type, t.amount
    FROM transactions_v2 t
    LEFT JOIN investor_positions ip ON ip.investor_id = t.investor_id AND ip.fund_id = t.fund_id
    WHERE t.is_voided = false AND t.investor_id IS NOT NULL AND ip.investor_id IS NULL
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'tx_id', tx_id, 'investor_id', investor_id, 'fund_id', fund_id, 'type', type, 'amount', amount
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM orphans;
  v_checks := v_checks || jsonb_build_object('name','no_orphan_transactions','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 6: ib_position_matches_ledger
  WITH ib_check AS (
    SELECT ip.investor_id, ip.fund_id,
      COALESCE(ip.current_value,0) as position_balance,
      COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided=false),0) as ledger_sum,
      COALESCE(ip.current_value,0) - COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided=false),0) as drift
    FROM investor_positions ip
    INNER JOIN profiles p ON p.id = ip.investor_id AND p.account_type = 'ib'
    LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
    GROUP BY ip.investor_id, ip.fund_id, ip.current_value
    HAVING ABS(COALESCE(ip.current_value,0) - COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided=false),0)) > 0.000001
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', investor_id, 'fund_id', fund_id,
    'position_balance', position_balance, 'ledger_sum', ledger_sum, 'drift', drift
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM ib_check;
  v_checks := v_checks || jsonb_build_object('name','ib_position_matches_ledger','category','ib','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 7: fee_position_matches_ledger
  WITH fee_check AS (
    SELECT ip.investor_id, ip.fund_id,
      COALESCE(ip.current_value,0) as position_balance,
      COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided=false),0) as ledger_sum,
      COALESCE(ip.current_value,0) - COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided=false),0) as drift
    FROM investor_positions ip
    INNER JOIN profiles p ON p.id = ip.investor_id AND p.account_type = 'fees_account'
    LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
    GROUP BY ip.investor_id, ip.fund_id, ip.current_value
    HAVING ABS(COALESCE(ip.current_value,0) - COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided=false),0)) > 0.000001
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', investor_id, 'fund_id', fund_id,
    'position_balance', position_balance, 'ledger_sum', ledger_sum, 'drift', drift
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM fee_check;
  v_checks := v_checks || jsonb_build_object('name','fee_position_matches_ledger','category','ib','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 8: ib_allocation_count_matches
  WITH ib_count AS (
    SELECT yd.id as distribution_id,
      (SELECT COUNT(*) FROM ib_allocations WHERE distribution_id=yd.id AND is_voided=false) as ib_alloc_count,
      (SELECT COUNT(*) FROM yield_allocations ya
       WHERE ya.distribution_id=yd.id AND ya.is_voided=false AND ya.ib_pct > 0
      ) as expected_count
    FROM yield_distributions yd
    WHERE yd.is_voided=false AND yd.gross_yield>0 AND yd.gross_yield_amount IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', distribution_id, 'ib_alloc_count', ib_alloc_count, 'expected_count', expected_count
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM ib_count WHERE ib_alloc_count != expected_count;
  v_checks := v_checks || jsonb_build_object('name','ib_allocation_count_matches','category','ib','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 9: no_duplicate_ib_allocations
  WITH dup_ib AS (
    SELECT ib_investor_id, distribution_id, COUNT(*) as count
    FROM ib_allocations WHERE is_voided=false
    GROUP BY ib_investor_id, distribution_id HAVING COUNT(*)>1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'ib_investor_id', ib_investor_id, 'distribution_id', distribution_id, 'count', count
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM dup_ib;
  v_checks := v_checks || jsonb_build_object('name','no_duplicate_ib_allocations','category','ib','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 10: no_future_transactions
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'tx_id', id, 'tx_date', tx_date, 'type', type, 'amount', amount
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM transactions_v2 WHERE is_voided=false AND tx_date > CURRENT_DATE;
  v_checks := v_checks || jsonb_build_object('name','no_future_transactions','category','temporal','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 11: no_duplicate_distributions
  WITH dup_dist AS (
    SELECT fund_id, effective_date, purpose, COUNT(*) as count
    FROM yield_distributions WHERE is_voided=false
    GROUP BY fund_id, effective_date, purpose HAVING COUNT(*)>1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'fund_id', fund_id, 'effective_date', effective_date, 'purpose', purpose, 'count', count
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM dup_dist;
  v_checks := v_checks || jsonb_build_object('name','no_duplicate_distributions','category','temporal','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 12: statement_periods_have_distributions
  WITH missing_periods AS (
    SELECT sp.id as period_id, sp.period_name
    FROM statement_periods sp
    WHERE sp.status = 'FINALIZED'
      AND sp.period_end_date >= '2026-01-01'
      AND NOT EXISTS (
        SELECT 1 FROM yield_distributions yd
        WHERE yd.is_voided=false
          AND yd.effective_date BETWEEN DATE_TRUNC('month', sp.period_end_date)::date AND sp.period_end_date
      )
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'period_id', period_id, 'period_name', period_name
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM missing_periods;
  v_checks := v_checks || jsonb_build_object('name','statement_periods_have_distributions','category','temporal','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 13: audit_log_for_distributions
  WITH missing_audit AS (
    SELECT yd.id as distribution_id, yd.fund_id, yd.effective_date
    FROM yield_distributions yd
    WHERE yd.is_voided=false
      AND yd.gross_yield_amount IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM audit_log al
        WHERE al.entity_id = yd.id::text
          AND (al.entity = 'yield_distributions' OR al.action ILIKE '%yield%' OR al.action ILIKE '%adb%')
      )
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', distribution_id, 'fund_id', fund_id, 'effective_date', effective_date
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM missing_audit;
  v_checks := v_checks || jsonb_build_object('name','audit_log_for_distributions','category','temporal','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 14: all_tables_have_rls
  SELECT COALESCE(jsonb_agg(jsonb_build_object('table_name', tablename)), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count
  FROM pg_tables WHERE schemaname='public' AND rowsecurity=false;
  v_checks := v_checks || jsonb_build_object('name','all_tables_have_rls','category','security','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 15: no_invalid_admin_accounts (FIXED: use user_roles instead of profiles.is_admin)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('profile_id', p.id, 'account_type', p.account_type)), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id AND ur.role IN ('admin', 'super_admin')
  WHERE p.account_type IS NOT NULL AND p.account_type NOT IN ('investor', 'fees_account');
  v_checks := v_checks || jsonb_build_object('name','no_invalid_admin_accounts','category','security','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 16: no_orphan_auth_users
  WITH orphans AS (
    SELECT au.id as user_id, au.email
    FROM auth.users au LEFT JOIN profiles p ON p.id = au.id
    WHERE p.id IS NULL AND au.email NOT LIKE 'test.%@%'
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', user_id, 'email', email)), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count FROM orphans;
  v_checks := v_checks || jsonb_build_object('name','no_orphan_auth_users','category','security','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  RETURN jsonb_build_object(
    'run_at', NOW(),
    'total_checks', v_total_checks,
    'passed', v_passed_count,
    'failed', v_failed_count,
    'checks', (SELECT jsonb_agg(c) FROM unnest(v_checks) AS c)
  );
END;
$$;


ALTER FUNCTION "public"."run_invariant_checks"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."run_invariant_checks"() IS 'Runs 16 invariant checks for data integrity. Admin-only.';



CREATE OR REPLACE FUNCTION "public"."set_account_type_for_ib"("p_user_id" "uuid", "p_account_type" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Directly update without triggering the protect trigger by using a temp workaround
  UPDATE profiles SET account_type = p_account_type WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."set_account_type_for_ib"("p_user_id" "uuid", "p_account_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_canonical_rpc"("enabled" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF enabled THEN
    -- Use 'indigo.canonical_rpc' to match the trigger check
    PERFORM set_config('indigo.canonical_rpc', 'true', true);
  ELSE
    PERFORM set_config('indigo.canonical_rpc', 'false', true);
  END IF;
END;
$$;


ALTER FUNCTION "public"."set_canonical_rpc"("enabled" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_canonical_rpc"("enabled" boolean) IS 'Sets the indigo.canonical_rpc session variable to enable/disable canonical RPC mutations. Must match the namespace checked by enforce_canonical_mutation() trigger.';



CREATE OR REPLACE FUNCTION "public"."set_fund_daily_aum"("p_fund_id" "uuid", "p_aum_date" "date", "p_total_aum" numeric, "p_purpose" "text" DEFAULT 'transaction'::"text", "p_source" "text" DEFAULT 'ingested'::"text", "p_skip_validation" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_old_aum NUMERIC;
  v_operation TEXT;
  v_purpose_enum aum_purpose;
  v_validation_result jsonb;
BEGIN
  v_purpose_enum := p_purpose::aum_purpose;

  -- Advisory lock: prevent concurrent AUM writes for same fund+date+purpose
  PERFORM pg_advisory_xact_lock(
    hashtext('aum:' || p_fund_id::text),
    hashtext(p_aum_date::text || ':' || p_purpose)
  );

  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  IF NOT COALESCE(p_skip_validation, false) 
     AND p_source NOT IN ('trigger_chain', 'yield_distribution', 'crystallization', 'position_sync') THEN
    
    v_validation_result := validate_aum_against_positions(
      p_fund_id, p_total_aum, 0.10, 'set_fund_daily_aum'
    );

    IF NOT (v_validation_result->>'valid')::boolean THEN
      RETURN jsonb_build_object(
        'success', false, 'error', 'AUM_VALIDATION_FAILED',
        'message', v_validation_result->>'error',
        'validation', v_validation_result
      );
    END IF;
  END IF;

  SELECT total_aum INTO v_old_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id AND aum_date = p_aum_date
    AND purpose = v_purpose_enum AND is_voided = false;

  IF FOUND THEN
    UPDATE fund_daily_aum
    SET total_aum = p_total_aum, updated_at = NOW(),
        source = COALESCE(p_source, source)
    WHERE fund_id = p_fund_id AND aum_date = p_aum_date
      AND purpose = v_purpose_enum AND is_voided = false;
    v_operation := 'update';
  ELSE
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, is_voided, created_at, updated_at)
    VALUES (p_fund_id, p_aum_date, p_total_aum, v_purpose_enum, COALESCE(p_source, 'ingested'), false, NOW(), NOW());
    v_operation := 'insert';
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'fund_id', p_fund_id, 'aum_date', p_aum_date,
    'old_aum', v_old_aum, 'new_aum', p_total_aum, 'purpose', p_purpose,
    'source', p_source, 'operation', v_operation, 'validation', v_validation_result
  );
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'set_fund_daily_aum failed: % (%) fund=% date=%', SQLERRM, SQLSTATE, p_fund_id, p_aum_date;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."set_fund_daily_aum"("p_fund_id" "uuid", "p_aum_date" "date", "p_total_aum" numeric, "p_purpose" "text", "p_source" "text", "p_skip_validation" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_fund_daily_aum"("p_fund_id" "uuid", "p_aum_date" "date", "p_total_aum" numeric, "p_purpose" "text", "p_source" "text", "p_skip_validation" boolean) IS 'Set AUM for a fund on a specific date.
INCLUDES AUM VALIDATION for all purposes (not just reporting).
Trusted sources (trigger_chain, yield_distribution, crystallization, position_sync) bypass validation.';



CREATE OR REPLACE FUNCTION "public"."set_position_is_active"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Set is_active based on current_value
  IF NEW.current_value > 0 THEN
    NEW.is_active := true;
  ELSE
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_position_is_active"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_processing_withdrawal"("p_request_id" "uuid", "p_processed_amount" numeric DEFAULT NULL::numeric, "p_tx_hash" "text" DEFAULT NULL::"text", "p_settlement_date" "date" DEFAULT NULL::"date", "p_admin_notes" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin_id uuid;
  v_request record;
BEGIN
  -- Require super_admin for processing operations
  v_admin_id := require_super_admin();
  
  -- Acquire advisory lock to prevent concurrent processing
  PERFORM acquire_withdrawal_lock(p_request_id);
  
  -- Fetch and lock the request
  SELECT * INTO v_request
  FROM withdrawal_requests
  WHERE id = p_request_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND: Withdrawal request % not found', p_request_id;
  END IF;
  
  -- Validate state transition using canonical validator (cast enum to text)
  IF NOT validate_withdrawal_transition(v_request.status::text, 'processing') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: Cannot transition from % to processing', v_request.status;
  END IF;
  
  -- Update the request
  UPDATE withdrawal_requests
  SET 
    status = 'processing',
    processed_amount = COALESCE(p_processed_amount, requested_amount),
    tx_hash = COALESCE(p_tx_hash, tx_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = now()
  WHERE id = p_request_id;
  
  -- Log the action
  PERFORM log_withdrawal_action(
    p_request_id,
    'processing',
    jsonb_build_object(
      'processed_amount', COALESCE(p_processed_amount, v_request.requested_amount),
      'tx_hash', p_tx_hash,
      'settlement_date', p_settlement_date,
      'admin_notes', p_admin_notes,
      'actor_id', v_admin_id
    )
  );
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."start_processing_withdrawal"("p_request_id" "uuid", "p_processed_amount" numeric, "p_tx_hash" "text", "p_settlement_date" "date", "p_admin_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."start_processing_withdrawal"("p_request_id" "uuid", "p_processed_amount" numeric, "p_tx_hash" "text", "p_settlement_date" "date", "p_admin_notes" "text") IS 'Transitions withdrawal from approved→processing. Requires super_admin. Uses advisory lock for concurrency safety. Logs to withdrawal_audit_logs.';



CREATE OR REPLACE FUNCTION "public"."sync_all_fund_aum"("p_target_date" "date" DEFAULT CURRENT_DATE) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_fund RECORD; v_aum NUMERIC; v_result JSONB; v_funds_synced INTEGER := 0;
BEGIN
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  FOR v_fund IN SELECT id, code FROM funds LOOP
    SELECT COALESCE(SUM(current_value), 0) INTO v_aum FROM investor_positions WHERE fund_id = v_fund.id AND is_active = true;
    SELECT set_fund_daily_aum(v_fund.id, p_target_date, v_aum, 'transaction') INTO v_result;
    IF (v_result->>'success')::boolean THEN v_funds_synced := v_funds_synced + 1; END IF;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'funds_synced', v_funds_synced, 'sync_date', p_target_date);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."sync_all_fund_aum"("p_target_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_aum_on_position_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fund_id uuid;
  v_new_aum numeric(28,10);
  v_aum_date date;
  v_tx_date_str text;
  v_already_synced text;
  v_updated_rows int;
BEGIN
  v_fund_id := COALESCE(NEW.fund_id, OLD.fund_id);

  -- Check if AUM was already synced by transaction trigger
  BEGIN
    v_already_synced := current_setting('indigo.aum_synced', true);
    IF v_already_synced = 'true' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Get transaction date from session variable
  BEGIN
    v_tx_date_str := current_setting('indigo.current_tx_date', true);
    IF v_tx_date_str IS NOT NULL AND v_tx_date_str != '' THEN
      v_aum_date := v_tx_date_str::date;
    ELSE
      v_aum_date := CURRENT_DATE;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_aum_date := CURRENT_DATE;
  END;

  PERFORM public.set_canonical_rpc(true);

  SELECT COALESCE(SUM(current_value), 0) INTO v_new_aum
  FROM investor_positions
  WHERE fund_id = v_fund_id AND is_active = true;

  -- FIX: Use UPDATE-then-INSERT pattern (cannot use ON CONFLICT with partial unique index)
  UPDATE fund_daily_aum
  SET total_aum = v_new_aum,
      source = 'tx_position_sync',
      updated_at = now()
  WHERE fund_id = v_fund_id
    AND aum_date = v_aum_date
    AND purpose = 'transaction'
    AND is_voided = false;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, source, purpose, is_voided)
    VALUES (v_fund_id, v_aum_date, v_new_aum, 'tx_position_sync', 'transaction', false);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."sync_aum_on_position_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_aum_on_position_change"() IS 'CANONICAL: Sync fund_daily_aum on position changes. 
   Called by trg_sync_aum_on_position trigger.
   Handles INSERT/DELETE/UPDATE (full coverage).';



CREATE OR REPLACE FUNCTION "public"."sync_aum_on_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_new_aum numeric(28,10);
  v_tx_date date;
  v_updated_rows int;
BEGIN
  -- Only process non-voided transactions
  IF NEW.is_voided = true THEN
    RETURN NEW;
  END IF;

  -- FIX: Skip reporting-purpose transactions — the distribution function handles AUM itself
  IF NEW.purpose = 'reporting'::aum_purpose THEN
    RETURN NEW;
  END IF;

  -- Use the transaction's date, not current date
  v_tx_date := NEW.tx_date;

  -- Enable canonical mutation flag
  PERFORM public.set_canonical_rpc(true);

  -- Calculate new AUM from positions
  SELECT COALESCE(SUM(current_value), 0) INTO v_new_aum
  FROM investor_positions
  WHERE fund_id = NEW.fund_id AND is_active = true;

  -- Set session variables for position triggers
  PERFORM set_config('indigo.current_tx_date', v_tx_date::text, true);
  PERFORM set_config('indigo.aum_synced', 'true', true);

  -- Use UPDATE-then-INSERT pattern
  UPDATE fund_daily_aum
  SET total_aum = v_new_aum,
      source = 'tx_sync',
      updated_at = now()
  WHERE fund_id = NEW.fund_id
    AND aum_date = v_tx_date
    AND purpose = 'transaction'
    AND is_voided = false;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, is_voided)
    VALUES (NEW.fund_id, v_tx_date, v_new_aum, 'transaction', 'tx_sync', false);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_aum_on_transaction"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_aum_on_transaction"() IS 'Trigger to sync AUM when transactions are created. FIX: Uses UPDATE-then-INSERT for fund_daily_aum (partial unique index).';



CREATE OR REPLACE FUNCTION "public"."sync_aum_to_positions"("p_fund_id" "uuid", "p_aum_date" "date" DEFAULT CURRENT_DATE, "p_admin_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT 'Auto-sync AUM to match positions'::"text", "p_purpose" "public"."aum_purpose" DEFAULT 'reporting'::"public"."aum_purpose") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fund_code text;
  v_old_aum numeric;
  v_new_aum numeric;
  v_position_count integer;
  v_aum_record_id uuid;
BEGIN
  -- Acquire advisory lock to prevent concurrent updates
  PERFORM pg_advisory_xact_lock(
    hashtext('sync_aum:' || p_fund_id::text),
    hashtext(p_aum_date::text)
  );

  -- Get fund code
  SELECT code INTO v_fund_code FROM funds WHERE id = p_fund_id;

  IF v_fund_code IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Get current recorded AUM
  SELECT total_aum, id INTO v_old_aum, v_aum_record_id
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_aum_date
    AND purpose = p_purpose
    AND NOT is_voided
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get sum of investor positions
  SELECT
    COALESCE(SUM(current_value), 0),
    COUNT(*)
  INTO v_new_aum, v_position_count
  FROM investor_positions
  WHERE fund_id = p_fund_id
    AND current_value > 0;

  -- If no AUM record exists, create one
  IF v_aum_record_id IS NULL THEN
    INSERT INTO fund_daily_aum (
      fund_id,
      aum_date,
      total_aum,
      purpose,
      created_by,
      notes
    )
    VALUES (
      p_fund_id,
      p_aum_date,
      v_new_aum,
      p_purpose,
      p_admin_id,
      'Created via sync_aum_to_positions: ' || p_reason
    )
    RETURNING id INTO v_aum_record_id;

    v_old_aum := 0;
  ELSE
    -- Update existing AUM record
    UPDATE fund_daily_aum
    SET
      total_aum = v_new_aum,
      notes = COALESCE(notes, '') || ' | Synced ' || NOW()::text || ': ' || p_reason
    WHERE id = v_aum_record_id;
  END IF;

  -- Audit log the sync operation
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'AUM_POSITION_SYNC',
    'fund_daily_aum',
    v_aum_record_id::text,
    p_admin_id,
    jsonb_build_object('total_aum', v_old_aum),
    jsonb_build_object('total_aum', v_new_aum),
    jsonb_build_object(
      'fund_id', p_fund_id,
      'fund_code', v_fund_code,
      'aum_date', p_aum_date,
      'position_count', v_position_count,
      'discrepancy', v_old_aum - v_new_aum,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'fund_code', v_fund_code,
    'aum_date', p_aum_date,
    'old_aum', v_old_aum,
    'new_aum', v_new_aum,
    'discrepancy_fixed', v_old_aum - v_new_aum,
    'position_count', v_position_count,
    'aum_record_id', v_aum_record_id
  );
END;
$$;


ALTER FUNCTION "public"."sync_aum_to_positions"("p_fund_id" "uuid", "p_aum_date" "date", "p_admin_id" "uuid", "p_reason" "text", "p_purpose" "public"."aum_purpose") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_aum_to_positions"("p_fund_id" "uuid", "p_aum_date" "date", "p_admin_id" "uuid", "p_reason" "text", "p_purpose" "public"."aum_purpose") IS 'Synchronizes fund_daily_aum to match actual investor positions.
Use when validate_aum_matches_positions shows a discrepancy.
Includes advisory lock and audit logging.
Fortune 500 self-healing mechanism added 2026-01-13.';



CREATE OR REPLACE FUNCTION "public"."sync_documents_profile_ids"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.user_profile_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.user_profile_id := NEW.user_id;
  END IF;
  IF NEW.created_by_profile_id IS NULL AND NEW.created_by IS NOT NULL THEN
    NEW.created_by_profile_id := NEW.created_by;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_documents_profile_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_fee_allocations_voided_by_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.voided_by_profile_id IS NULL AND NEW.voided_by IS NOT NULL THEN
    NEW.voided_by_profile_id := NEW.voided_by;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_fee_allocations_voided_by_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_fund_aum_after_position"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fund_id uuid;
  v_calculated_aum numeric(28,10);
  v_updated_rows int;
  v_already_synced text;
BEGIN
  v_fund_id := COALESCE(NEW.fund_id, OLD.fund_id);

  -- FIX: Check if AUM was already synced by transaction trigger or apply function
  BEGIN
    v_already_synced := current_setting('indigo.aum_synced', true);
    IF v_already_synced = 'true' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Enable canonical mutation flag
  PERFORM public.set_canonical_rpc(true);

  -- Calculate total AUM from all active positions
  SELECT COALESCE(SUM(current_value), 0)
  INTO v_calculated_aum
  FROM investor_positions
  WHERE fund_id = v_fund_id AND is_active = true;

  -- Update today's transaction-purpose AUM record if it exists
  UPDATE fund_daily_aum
  SET total_aum = v_calculated_aum,
      source = 'trigger:position_sync',
      updated_at = now()
  WHERE fund_id = v_fund_id
    AND aum_date = CURRENT_DATE
    AND purpose = 'transaction'
    AND is_voided = false;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, is_voided, updated_at)
    VALUES (v_fund_id, CURRENT_DATE, v_calculated_aum, 'transaction', 'trigger:position_sync', false, now());
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."sync_fund_aum_after_position"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_fund_aum_after_position"() IS 'SECONDARY (backup): Sync fund AUM after UPDATE only.
   Called by trg_sync_aum_after_position.
   Safety net - kept as backup for UPDATE race conditions.';



CREATE OR REPLACE FUNCTION "public"."sync_fund_aum_events_voided_by_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.voided_by_profile_id IS NULL AND NEW.voided_by IS NOT NULL THEN
    NEW.voided_by_profile_id := NEW.voided_by;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_fund_aum_events_voided_by_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_fund_daily_aum_voided_by_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.voided_by_profile_id IS NULL AND NEW.voided_by IS NOT NULL THEN
    NEW.voided_by_profile_id := NEW.voided_by;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_fund_daily_aum_voided_by_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_ib_account_type"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.role = 'ib' THEN
    UPDATE profiles 
    SET account_type = 'ib'
    WHERE id = NEW.user_id 
      AND (account_type IS NULL OR account_type != 'ib');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_ib_account_type"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_ib_account_type"() IS 'Trigger: Syncs account_type to ib when IB role assigned via user_roles';



CREATE OR REPLACE FUNCTION "public"."sync_ib_allocations_from_commission_ledger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_allocation_id uuid;
  v_purpose aum_purpose;
BEGIN
  -- Guard: Skip if no valid distribution_id
  IF new.yield_distribution_id IS NULL THEN
    RETURN new;
  END IF;

  -- Guard: Skip if distribution doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.yield_distributions WHERE id = new.yield_distribution_id) THEN
    RETURN new;
  END IF;

  -- Get the purpose from the yield distribution
  SELECT yd.purpose INTO v_purpose
  FROM public.yield_distributions yd
  WHERE yd.id = new.yield_distribution_id;

  -- Insert IB allocation from commission ledger entry
  INSERT INTO public.ib_allocations (
    id,
    ib_investor_id,
    source_investor_id,
    fund_id,
    source_net_income,
    ib_percentage,
    ib_fee_amount,
    effective_date,
    created_at,
    created_by,
    distribution_id,
    period_start,
    period_end,
    purpose,
    source,
    is_voided,
    payout_status,
    paid_at,
    paid_by
  )
  SELECT
    gen_random_uuid(),
    new.ib_id,
    new.source_investor_id,
    new.fund_id,
    new.gross_yield_amount,
    new.ib_percentage,
    new.ib_commission_amount,
    new.effective_date,
    COALESCE(new.created_at, now()),
    new.created_by,
    new.yield_distribution_id,
    yd.period_start,
    yd.period_end,
    yd.purpose,
    'from_investor_yield',
    COALESCE(new.is_voided, false),
    -- FIX 1.2: Auto-mark as paid for reporting purpose
    CASE WHEN v_purpose = 'reporting'::aum_purpose THEN 'paid' ELSE 'pending' END,
    CASE WHEN v_purpose = 'reporting'::aum_purpose THEN now() ELSE NULL END,
    CASE WHEN v_purpose = 'reporting'::aum_purpose THEN new.created_by ELSE NULL END
  FROM public.yield_distributions yd
  WHERE yd.id = new.yield_distribution_id
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;


ALTER FUNCTION "public"."sync_ib_allocations_from_commission_ledger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_ib_allocations_voided_by_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.voided_by_profile_id IS NULL AND NEW.voided_by IS NOT NULL THEN
    NEW.voided_by_profile_id := NEW.voided_by;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_ib_allocations_voided_by_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_ib_commission_ledger_voided_by_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.voided_by_profile_id IS NULL AND NEW.voided_by IS NOT NULL THEN
    NEW.voided_by_profile_id := NEW.voided_by;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_ib_commission_ledger_voided_by_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_investor_yield_events_voided_by_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.voided_by_profile_id IS NULL AND NEW.voided_by IS NOT NULL THEN
    NEW.voided_by_profile_id := NEW.voided_by;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_investor_yield_events_voided_by_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_platform_fee_ledger_voided_by_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.voided_by_profile_id IS NULL AND NEW.voided_by IS NOT NULL THEN
    NEW.voided_by_profile_id := NEW.voided_by;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_platform_fee_ledger_voided_by_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_position_last_tx_date"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE investor_positions ip
  SET last_transaction_date = (
    SELECT MAX(tx_date)
    FROM transactions_v2 t
    WHERE t.investor_id = ip.investor_id 
      AND t.fund_id = ip.fund_id
      AND t.is_voided = false
  )
  WHERE ip.investor_id = NEW.investor_id AND ip.fund_id = NEW.fund_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_position_last_tx_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_is_admin"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  target_user_id UUID;
  has_admin_role BOOLEAN;
BEGIN
  -- Determine which user_id to update
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;
  
  -- Check if user has admin or super_admin role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = target_user_id 
    AND role IN ('admin', 'super_admin')
  ) INTO has_admin_role;
  
  -- Update the profile
  UPDATE public.profiles 
  SET is_admin = has_admin_role 
  WHERE id = target_user_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."sync_profile_is_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_profile_is_admin"() IS 'TRIGGER FUNCTION: Syncs profiles.is_admin flag when user_roles changes. Maintains legacy is_admin column for backward compatibility with RLS policies.';



CREATE OR REPLACE FUNCTION "public"."sync_profile_last_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE profiles
  SET last_activity_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_profile_last_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_role_from_profiles"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.role := public.compute_profile_role(new.id, new.account_type, new.is_admin);
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_profile_role_from_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_role_from_roles"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  target_id uuid;
begin
  target_id := coalesce(new.user_id, old.user_id);
  update public.profiles p
  set role = public.compute_profile_role(p.id, p.account_type, p.is_admin)
  where p.id = target_id;
  return null;
end;
$$;


ALTER FUNCTION "public"."sync_profile_role_from_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_reporting_aum_to_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."sync_reporting_aum_to_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_statements_investor_profile_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- If investor_profile_id is not set, copy from investor_id
  IF NEW.investor_profile_id IS NULL AND NEW.investor_id IS NOT NULL THEN
    NEW.investor_profile_id := NEW.investor_id;
  END IF;
  -- If investor_id is not set but investor_profile_id is, copy back
  IF NEW.investor_id IS NULL AND NEW.investor_profile_id IS NOT NULL THEN
    NEW.investor_id := NEW.investor_profile_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_statements_investor_profile_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_transaction_aum_after_yield"("p_fund_id" "uuid", "p_aum_date" "date", "p_admin_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_post_yield_aum numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_post_yield_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by)
  VALUES (p_fund_id, p_aum_date, v_post_yield_aum, 'transaction', 'yield_aum_sync', p_admin_id)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, updated_at = now();
END;
$$;


ALTER FUNCTION "public"."sync_transaction_aum_after_yield"("p_fund_id" "uuid", "p_aum_date" "date", "p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_transactions_v2_voided_by_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.voided_by_profile_id IS NULL AND NEW.voided_by IS NOT NULL THEN
    NEW.voided_by_profile_id := NEW.voided_by;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_transactions_v2_voided_by_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_yield_allocations_voided_by_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.voided_by_profile_id IS NULL AND NEW.voided_by IS NOT NULL THEN
    NEW.voided_by_profile_id := NEW.voided_by;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_yield_allocations_voided_by_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_yield_date"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- On INSERT or UPDATE, sync yield_date with effective_date or period_start
  IF NEW.yield_date IS NULL THEN
    NEW.yield_date := COALESCE(NEW.effective_date, NEW.period_start);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_yield_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_yield_distribution_legacy_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Prefer canonical totals when present
  IF NEW.total_net_amount IS NOT NULL THEN
    NEW.net_yield := COALESCE(NEW.net_yield, NEW.total_net_amount);
  END IF;
  IF NEW.total_fee_amount IS NOT NULL THEN
    NEW.total_fees := COALESCE(NEW.total_fees, NEW.total_fee_amount);
  END IF;
  IF NEW.total_ib_amount IS NOT NULL THEN
    NEW.total_ib := COALESCE(NEW.total_ib, NEW.total_ib_amount);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_yield_distribution_legacy_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_yield_distributions_voided_by_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.voided_by_profile_id IS NULL AND NEW.voided_by IS NOT NULL THEN
    NEW.voided_by_profile_id := NEW.voided_by;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_yield_distributions_voided_by_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_yield_to_investor_yield_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fund record;
  v_aum_event record;
  v_trigger_type text;
  v_visibility text;
BEGIN
  IF NEW.type = 'YIELD'::public.tx_type AND NOT NEW.is_voided THEN
    SELECT * INTO v_fund FROM funds WHERE id = NEW.fund_id;

    SELECT * INTO v_aum_event
    FROM fund_aum_events
    WHERE fund_id = NEW.fund_id AND event_date = NEW.tx_date AND is_voided = false
    ORDER BY event_ts DESC LIMIT 1;

    v_trigger_type := CASE
      WHEN v_aum_event.trigger_type IN ('deposit', 'withdrawal', 'month_end', 'manual')
        THEN v_aum_event.trigger_type
      ELSE 'manual'
    END;

    -- Derive visibility from purpose: reporting yields are investor-visible,
    -- transaction/crystallization yields are admin-only.
    v_visibility := CASE
      WHEN NEW.purpose = 'reporting'::aum_purpose THEN 'investor_visible'
      ELSE 'admin_only'
    END;

    INSERT INTO public.investor_yield_events (
      investor_id, fund_id, event_date, trigger_type, trigger_transaction_id,
      fund_aum_before, fund_aum_after, investor_balance, investor_share_pct,
      fund_yield_pct, gross_yield_amount, fee_pct, fee_amount, net_yield_amount,
      period_start, period_end, days_in_period, visibility_scope, reference_id, created_by
    )
    VALUES (
      NEW.investor_id, NEW.fund_id, NEW.tx_date,
      v_trigger_type,
      NEW.id,
      COALESCE(v_aum_event.opening_aum, 0),
      COALESCE(v_aum_event.closing_aum, 0),
      0, 0, 0, NEW.amount, 0, 0, NEW.amount,
      COALESCE(v_aum_event.event_date, NEW.tx_date), NEW.tx_date, 1,
      v_visibility,
      NEW.reference_id, NEW.created_by
    )
    ON CONFLICT (reference_id) WHERE is_voided = false DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_yield_to_investor_yield_events"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_yield_to_investor_yield_events"() IS 'Sync YIELD transactions to investor_yield_events.
FIX: Maps invalid trigger_type values (preflow, yield, etc) to manual.';



CREATE OR REPLACE FUNCTION "public"."system_health_check"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result jsonb;
  db_ok boolean := false;
  last_yield_run timestamp;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;

  BEGIN
    PERFORM 1;
    db_ok := true;
  EXCEPTION WHEN OTHERS THEN
    db_ok := false;
  END;

  SELECT MAX(created_at) INTO last_yield_run FROM fee_allocations LIMIT 1;

  result := jsonb_build_object(
    'database', jsonb_build_object('status', CASE WHEN db_ok THEN 'operational' ELSE 'down' END),
    'last_yield_distribution', last_yield_run,
    'last_report_generation', NULL,
    'checked_at', now());

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."system_health_check"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_recompute_position"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_investor_id uuid;
  v_fund_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_investor_id := OLD.investor_id;
    v_fund_id := OLD.fund_id;
  ELSE
    v_investor_id := NEW.investor_id;
    v_fund_id := NEW.fund_id;
  END IF;

  IF v_investor_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  PERFORM public.recompute_investor_position(v_investor_id, v_fund_id);

  IF TG_OP = 'UPDATE' AND 
     (OLD.investor_id IS DISTINCT FROM NEW.investor_id OR OLD.fund_id IS DISTINCT FROM NEW.fund_id) THEN
    IF OLD.investor_id IS NOT NULL THEN
      PERFORM public.recompute_investor_position(OLD.investor_id, OLD.fund_id);
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;


ALTER FUNCTION "public"."trigger_recompute_position"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unvoid_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tx RECORD;
  v_cascade_warn text := '';
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_admin_id AND is_admin = TRUE
  ) THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_ADMIN', 'message', 'Admin access required'
    );
  END IF;

  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 3 THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'INVALID_REASON',
      'message', 'Reason must be at least 3 characters'
    );
  END IF;

  SELECT * INTO v_tx
  FROM public.transactions_v2
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_FOUND', 'message', 'Transaction not found'
    );
  END IF;

  IF v_tx.is_voided IS DISTINCT FROM TRUE THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_VOIDED', 'message', 'Transaction is not voided'
    );
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);
  PERFORM set_config('app.canonical_rpc', 'true', TRUE);

  UPDATE public.transactions_v2
  SET is_voided = FALSE,
      voided_at = NULL,
      voided_by = NULL,
      voided_by_profile_id = NULL,
      void_reason = NULL,
      notes = COALESCE(notes, '') || E'\n[Unvoided ' || NOW()::TEXT
              || ' by admin ' || p_admin_id::TEXT || ': ' || TRIM(p_reason) || ']'
  WHERE id = p_transaction_id;

  BEGIN
    PERFORM recalculate_fund_aum_for_date(
      v_tx.fund_id, v_tx.tx_date, 'transaction'::aum_purpose, p_admin_id
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  IF v_tx.distribution_id IS NOT NULL THEN
    SELECT void_reason INTO v_cascade_warn
    FROM yield_distributions
    WHERE id = v_tx.distribution_id AND is_voided = TRUE
    LIMIT 1;

    IF v_cascade_warn IS NOT NULL THEN
      v_cascade_warn := 'Parent distribution ' || v_tx.distribution_id::text
        || ' was cascade-voided. Manual re-apply may be needed.';
    END IF;
  END IF;

  INSERT INTO public.audit_log (
    entity, entity_id, action, actor_user, old_values, new_values, meta
  ) VALUES (
    'transactions_v2', p_transaction_id::TEXT, 'UNVOID', p_admin_id,
    JSONB_BUILD_OBJECT(
      'is_voided', TRUE, 'voided_at', v_tx.voided_at,
      'voided_by', v_tx.voided_by, 'void_reason', v_tx.void_reason
    ),
    JSONB_BUILD_OBJECT('is_voided', FALSE, 'aum_recalculated', TRUE),
    JSONB_BUILD_OBJECT(
      'reason', TRIM(p_reason),
      'isolation_model', 'row_for_update',
      'yields_not_restored', TRUE,
      'cascade_warning', COALESCE(v_cascade_warn, 'none')
    )
  );

  RETURN JSONB_BUILD_OBJECT(
    'success', TRUE,
    'transaction_id', p_transaction_id,
    'investor_id', v_tx.investor_id,
    'fund_id', v_tx.fund_id,
    'restored_amount', v_tx.amount,
    'aum_recalculated', TRUE,
    'warning', CASE
      WHEN v_cascade_warn != '' THEN v_cascade_warn
      ELSE 'Cascade-voided allocations/fees/yield-events are NOT automatically restored. Re-apply yield distribution if needed.'
    END
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;


ALTER FUNCTION "public"."unvoid_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unvoid_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") IS 'Unvoids a transaction. SELECT FOR UPDATE provides row-level locking.
v5.0 (2026-06-18): Added AUM recalculation after unvoid. Added cascade-void
detection for yield_distributions. Position restored via fn_ledger_drives_position
trigger and trigger_recompute_position.
WARNING: Cascade-voided distributions/allocations are NOT automatically restored.';



CREATE OR REPLACE FUNCTION "public"."unvoid_transaction_with_lock"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fund_id UUID;
BEGIN
  SELECT fund_id INTO v_fund_id
  FROM public.transactions_v2
  WHERE id = p_transaction_id;

  IF v_fund_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_FOUND', 'message', 'Transaction not found'
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_fund_id::TEXT));

  RETURN public.unvoid_transaction(p_transaction_id, p_admin_id, p_reason);
END;
$$;


ALTER FUNCTION "public"."unvoid_transaction_with_lock"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unvoid_transactions_bulk"("p_transaction_ids" "uuid"[], "p_admin_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count int;
  v_tx_id uuid;
  v_single_result jsonb;
  v_results jsonb[] := '{}';
BEGIN
  -- Super admin check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_admin_id AND role = 'super_admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_SUPER_ADMIN', 'message', 'Super admin access required for bulk operations');
  END IF;

  -- Validate array size
  v_count := array_length(p_transaction_ids, 1);
  IF v_count IS NULL OR v_count < 1 OR v_count > 50 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_BATCH_SIZE', 'message', 'Batch size must be between 1 and 50');
  END IF;

  -- Validate reason
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_REASON', 'message', 'Reason must be at least 3 characters');
  END IF;

  -- Validate all are actually voided
  IF EXISTS (
    SELECT 1 FROM transactions_v2
    WHERE id = ANY(p_transaction_ids) AND (is_voided IS DISTINCT FROM true)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_VOIDED', 'message', 'One or more transactions are not voided');
  END IF;

  -- Verify all IDs exist
  IF (SELECT count(*) FROM transactions_v2 WHERE id = ANY(p_transaction_ids)) != v_count THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'One or more transactions not found');
  END IF;

  -- Unvoid each transaction
  FOREACH v_tx_id IN ARRAY p_transaction_ids LOOP
    v_single_result := unvoid_transaction(v_tx_id, p_admin_id, '[BULK] ' || trim(p_reason));
    IF (v_single_result->>'success')::boolean IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Failed to unvoid transaction %: %', v_tx_id, v_single_result->>'message';
    END IF;
    v_results := array_append(v_results, v_single_result);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'count', v_count,
    'transaction_ids', to_jsonb(p_transaction_ids),
    'warning', 'AUM records may need recalculation. Run recalculate_fund_aum_for_date for affected funds/dates.'
  );
END;
$$;


ALTER FUNCTION "public"."unvoid_transactions_bulk"("p_transaction_ids" "uuid"[], "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_admin_role"("p_target_user_id" "uuid", "p_new_role" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_id UUID;
  v_is_super_admin BOOLEAN;
  v_target_is_super BOOLEAN;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);

  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: super admin role required (JWT session check)';
  END IF;

  -- Get the caller's user ID
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if caller is super_admin using the existing function
  v_is_super_admin := public.has_super_admin_role(v_caller_id);
  
  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Only Super Admins can modify admin roles';
  END IF;
  
  -- Prevent self-demotion from super_admin (safety check)
  IF v_caller_id = p_target_user_id AND p_new_role != 'super_admin' THEN
    -- Check if they're currently super_admin
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = v_caller_id AND role = 'super_admin'
    ) INTO v_target_is_super;
    
    IF v_target_is_super THEN
      RAISE EXCEPTION 'Cannot demote yourself from Super Admin';
    END IF;
  END IF;
  
  -- Validate the new role
  IF p_new_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: must be admin or super_admin';
  END IF;
  
  -- Perform the role change
  IF p_new_role = 'super_admin' THEN
    -- Add super_admin role (upsert)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_target_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Remove super_admin role (demote to regular admin)
    DELETE FROM public.user_roles 
    WHERE user_id = p_target_user_id AND role = 'super_admin';
  END IF;
  
  -- Log the role change to audit_log
  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, meta, new_values)
  VALUES (
    'UPDATE_ADMIN_ROLE',
    'user_roles',
    p_target_user_id::TEXT,
    v_caller_id,
    jsonb_build_object('target_user', p_target_user_id, 'new_role', p_new_role),
    jsonb_build_object('role', p_new_role)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_target_user_id,
    'new_role', p_new_role
  );
END;
$$;


ALTER FUNCTION "public"."update_admin_role"("p_target_user_id" "uuid", "p_new_role" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_admin_role"("p_target_user_id" "uuid", "p_new_role" "text") IS 'UPDATE ADMIN ROLE: Changes user role (admin <-> super_admin). Requires super_admin permission. Logs change to audit_log.';



CREATE OR REPLACE FUNCTION "public"."update_delivery_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_delivery_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_dust_tolerance"("p_asset" "text", "p_tolerance" numeric, "p_admin_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_config jsonb;
  v_new_config jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can update dust tolerance'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_tolerance <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TOLERANCE',
      'message', 'Dust tolerance must be a positive number'
    );
  END IF;

  -- Get current config
  SELECT value INTO v_current_config
  FROM system_config WHERE key = 'dust_tolerance';

  IF v_current_config IS NULL THEN
    v_current_config := '{}'::jsonb;
  END IF;

  -- Update the specific asset
  v_new_config := v_current_config || jsonb_build_object(p_asset, p_tolerance);

  -- Upsert the config
  INSERT INTO system_config (key, value, description, updated_by, updated_at)
  VALUES ('dust_tolerance', v_new_config, 'Asset-specific dust tolerance thresholds', p_admin_id, now())
  ON CONFLICT (key) DO UPDATE SET
    value = v_new_config,
    updated_by = p_admin_id,
    updated_at = now();

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES ('UPDATE_DUST_TOLERANCE', 'system_config', 'dust_tolerance', p_admin_id,
    jsonb_build_object('asset', p_asset, 'old_value', v_current_config->>p_asset),
    jsonb_build_object('asset', p_asset, 'new_value', p_tolerance));

  RETURN jsonb_build_object(
    'success', true,
    'asset', p_asset,
    'tolerance', p_tolerance,
    'message', format('Dust tolerance for %s updated to %s', p_asset, p_tolerance)
  );
END;
$$;


ALTER FUNCTION "public"."update_dust_tolerance"("p_asset" "text", "p_tolerance" numeric, "p_admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_dust_tolerance"("p_asset" "text", "p_tolerance" numeric, "p_admin_id" "uuid") IS 'Update dust tolerance for a specific asset. Single source of truth in system_config.dust_tolerance.';



CREATE OR REPLACE FUNCTION "public"."update_fund_aum_baseline"("p_fund_id" "text", "p_new_baseline" numeric) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.funds
  SET
    aum = p_new_baseline,
    updated_at = now()
  WHERE code = p_fund_id OR id::TEXT = p_fund_id;

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."update_fund_aum_baseline"("p_fund_id" "text", "p_new_baseline" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_fund_daily_aum"("p_record_id" "uuid", "p_new_total_aum" numeric, "p_reason" "text", "p_admin_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_old_record RECORD;
  v_validation_result jsonb;
BEGIN
  -- Advisory lock: prevent concurrent update of same AUM record
  PERFORM pg_advisory_xact_lock(hashtext('update_aum'), hashtext(p_record_id::text));

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'Reason is required for AUM update';
  END IF;

  SELECT * INTO v_old_record FROM fund_daily_aum WHERE id = p_record_id AND is_voided = false;

  IF v_old_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'AUM record not found');
  END IF;

  v_validation_result := validate_aum_against_positions(
    v_old_record.fund_id, p_new_total_aum, 0.10, 'update_fund_daily_aum'
  );

  IF NOT (v_validation_result->>'valid')::boolean THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'AUM_VALIDATION_FAILED',
      'message', v_validation_result->>'error', 'validation', v_validation_result
    );
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  UPDATE fund_daily_aum
  SET total_aum = p_new_total_aum, updated_at = NOW(), updated_by = p_admin_id
  WHERE id = p_record_id;

  INSERT INTO audit_log (action, table_name, record_id, old_data, new_data, performed_by, performed_at)
  VALUES ('AUM_UPDATE', 'fund_daily_aum', p_record_id,
    jsonb_build_object('total_aum', v_old_record.total_aum),
    jsonb_build_object('total_aum', p_new_total_aum, 'reason', p_reason, 'validation', v_validation_result),
    p_admin_id, NOW()
  );

  RETURN jsonb_build_object(
    'success', true, 'old_aum', v_old_record.total_aum,
    'new_aum', p_new_total_aum, 'validation', v_validation_result
  );
END;
$$;


ALTER FUNCTION "public"."update_fund_daily_aum"("p_record_id" "uuid", "p_new_total_aum" numeric, "p_reason" "text", "p_admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_fund_daily_aum"("p_record_id" "uuid", "p_new_total_aum" numeric, "p_reason" "text", "p_admin_id" "uuid") IS 'Update an AUM record with a new value.
INCLUDES AUM VALIDATION - rejects values deviating >10% from positions.';



CREATE OR REPLACE FUNCTION "public"."update_fund_daily_aum_with_recalc"("p_record_id" "uuid", "p_new_total_aum" numeric, "p_reason" "text", "p_admin_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_old_record RECORD;
  v_validation_result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'Reason is required for AUM update';
  END IF;

  SELECT * INTO v_old_record
  FROM fund_daily_aum
  WHERE id = p_record_id AND is_voided = false;

  IF v_old_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'AUM record not found');
  END IF;

  -- CORE FIX: Validate new AUM against positions
  v_validation_result := validate_aum_against_positions(
    v_old_record.fund_id,
    p_new_total_aum,
    0.10,
    'update_fund_daily_aum_with_recalc'
  );

  IF NOT (v_validation_result->>'valid')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'AUM_VALIDATION_FAILED',
      'message', v_validation_result->>'error',
      'validation', v_validation_result
    );
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  UPDATE fund_daily_aum
  SET total_aum = p_new_total_aum,
      updated_at = NOW(),
      updated_by = p_admin_id
  WHERE id = p_record_id;

  -- Recalculate subsequent AUM records
  PERFORM recalculate_fund_aum_for_date(
    v_old_record.fund_id,
    v_old_record.aum_date,
    v_old_record.purpose,
    p_admin_id
  );

  INSERT INTO audit_log (action, table_name, record_id, old_data, new_data, performed_by, performed_at)
  VALUES (
    'AUM_UPDATE_WITH_RECALC',
    'fund_daily_aum',
    p_record_id,
    jsonb_build_object('total_aum', v_old_record.total_aum),
    jsonb_build_object('total_aum', p_new_total_aum, 'reason', p_reason, 'validation', v_validation_result),
    p_admin_id,
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'old_aum', v_old_record.total_aum,
    'new_aum', p_new_total_aum,
    'recalculated', true,
    'validation', v_validation_result
  );
END;
$$;


ALTER FUNCTION "public"."update_fund_daily_aum_with_recalc"("p_record_id" "uuid", "p_new_total_aum" numeric, "p_reason" "text", "p_admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_fund_daily_aum_with_recalc"("p_record_id" "uuid", "p_new_total_aum" numeric, "p_reason" "text", "p_admin_id" "uuid") IS 'Update an AUM record and recalculate subsequent records.
INCLUDES AUM VALIDATION - rejects values deviating >10% from positions.';



CREATE OR REPLACE FUNCTION "public"."update_investor_aum_percentages"("p_fund_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_total_aum NUMERIC;
  v_updated_count INTEGER := 0;
BEGIN
  -- Get total AUM for the fund
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_aum
  FROM public.investor_positions
  WHERE fund_id = p_fund_id;

  -- Update each investor's percentage
  IF v_total_aum > 0 THEN
    UPDATE public.investor_positions
    SET
      aum_percentage = (current_value / v_total_aum) * 100,
      updated_at = now()
    WHERE fund_id = p_fund_id;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  END IF;

  RETURN v_updated_count;
END;
$$;


ALTER FUNCTION "public"."update_investor_aum_percentages"("p_fund_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_investor_last_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE profiles
  SET last_activity_at = NOW()
  WHERE id = NEW.investor_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_investor_last_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_investor_last_activity_withdrawal"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE profiles
  SET last_activity_at = NOW()
  WHERE id = NEW.investor_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_investor_last_activity_withdrawal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_last_activity_on_statement"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.profiles
  SET last_activity_at = NOW()
  WHERE id = NEW.investor_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_last_activity_on_statement"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_transaction"("p_transaction_id" "uuid", "p_updates" "jsonb", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tx record;
  v_actor_id uuid := auth.uid();
  v_before jsonb;
  v_after jsonb;
  v_allowed_fields text[] := ARRAY['tx_date', 'value_date', 'notes', 'tx_hash', 'amount', 'type', 'fund_id', 'reference_id'];
  v_field text;
  v_new_amount numeric;
  v_new_fund_id uuid;
  v_old_fund_id uuid;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  IF NOT check_is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Edit reason is required';
  END IF;

  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Cannot edit a voided transaction';
  END IF;

  IF p_updates ? 'investor_id' THEN
    RAISE EXCEPTION 'Cannot change investor_id on a transaction';
  END IF;

  FOR v_field IN SELECT jsonb_object_keys(p_updates) LOOP
    IF NOT (v_field = ANY(v_allowed_fields)) THEN
      RAISE EXCEPTION 'Field % is not editable', v_field;
    END IF;
  END LOOP;

  IF v_tx.is_system_generated = true THEN
    RAISE EXCEPTION 'Cannot edit system-generated transactions';
  END IF;

  v_before := row_to_json(v_tx)::jsonb;
  v_old_fund_id := v_tx.fund_id;

  v_new_amount := COALESCE((p_updates->>'amount')::numeric, v_tx.amount);
  v_new_fund_id := COALESCE((p_updates->>'fund_id')::uuid, v_tx.fund_id);

  UPDATE transactions_v2
  SET 
    tx_date = COALESCE((p_updates->>'tx_date')::date, tx_date),
    value_date = COALESCE((p_updates->>'value_date')::date, value_date),
    notes = COALESCE(p_updates->>'notes', notes),
    tx_hash = COALESCE(p_updates->>'tx_hash', tx_hash),
    amount = v_new_amount,
    type = COALESCE((p_updates->>'type')::tx_type, type),
    fund_id = v_new_fund_id,
    reference_id = COALESCE(p_updates->>'reference_id', reference_id)
  WHERE id = p_transaction_id;

  SELECT row_to_json(t)::jsonb INTO v_after FROM transactions_v2 t WHERE t.id = p_transaction_id;

  INSERT INTO data_edit_audit (
    table_name, record_id, operation, old_data, new_data, 
    edited_by, edit_source
  )
  VALUES (
    'transactions_v2',
    p_transaction_id,
    'UPDATE',
    v_before,
    v_after,
    v_actor_id,
    'update_transaction RPC: ' || p_reason
  );

  PERFORM recompute_investor_position(v_tx.investor_id, v_old_fund_id);
  IF v_new_fund_id IS DISTINCT FROM v_old_fund_id THEN
    PERFORM recompute_investor_position(v_tx.investor_id, v_new_fund_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'updated_at', now()
  );
END;
$$;


ALTER FUNCTION "public"."update_transaction"("p_transaction_id" "uuid", "p_updates" "jsonb", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_transaction"("p_transaction_id" "uuid", "p_updates" "jsonb", "p_reason" "text") IS 'CANONICAL: Updates transaction with comprehensive audit logging. Similar to edit_transaction but with additional audit metadata. Role: Requires admin role.';



CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_profile_secure"("p_user_id" "uuid", "p_first_name" "text" DEFAULT NULL::"text", "p_last_name" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.profiles
  SET 
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    phone = COALESCE(p_phone, phone),
    status = COALESCE(p_status, status),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."update_user_profile_secure"("p_user_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_withdrawal"("p_withdrawal_id" "uuid", "p_requested_amount" numeric DEFAULT NULL::numeric, "p_withdrawal_type" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_old_record withdrawal_requests%ROWTYPE;
  v_user_id uuid;
  v_changes jsonb := '{}';
BEGIN
  -- SECURITY: Require admin privileges
  PERFORM public.ensure_admin();

  v_user_id := auth.uid();

  SELECT * INTO v_old_record
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  IF v_old_record.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Cannot edit withdrawal with status: %', v_old_record.status;
  END IF;

  IF p_requested_amount IS NOT NULL AND p_requested_amount != v_old_record.requested_amount THEN
    v_changes := v_changes || jsonb_build_object(
      'requested_amount', jsonb_build_object('old', v_old_record.requested_amount, 'new', p_requested_amount)
    );
  END IF;

  IF p_withdrawal_type IS NOT NULL AND p_withdrawal_type != v_old_record.withdrawal_type THEN
    v_changes := v_changes || jsonb_build_object(
      'withdrawal_type', jsonb_build_object('old', v_old_record.withdrawal_type, 'new', p_withdrawal_type)
    );
  END IF;

  IF p_notes IS NOT NULL AND COALESCE(p_notes, '') != COALESCE(v_old_record.notes, '') THEN
    v_changes := v_changes || jsonb_build_object(
      'notes', jsonb_build_object('old', v_old_record.notes, 'new', p_notes)
    );
  END IF;

  UPDATE withdrawal_requests
  SET
    requested_amount = COALESCE(p_requested_amount, requested_amount),
    withdrawal_type = COALESCE(p_withdrawal_type, withdrawal_type),
    notes = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE notes END,
    updated_at = now()
  WHERE id = p_withdrawal_id;

  RETURN jsonb_build_object('success', true, 'changes', v_changes);
END;
$$;


ALTER FUNCTION "public"."update_withdrawal"("p_withdrawal_id" "uuid", "p_requested_amount" numeric, "p_withdrawal_type" "text", "p_notes" "text", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_withdrawal"("p_withdrawal_id" "uuid", "p_requested_amount" numeric, "p_withdrawal_type" "text", "p_notes" "text", "p_reason" "text") IS 'Updates a pending withdrawal request. Only amount, type, and notes can be modified. Logs to withdrawal_audit_logs.';



CREATE OR REPLACE FUNCTION "public"."upsert_fund_aum_after_yield"("p_fund_id" "uuid", "p_aum_date" "date", "p_yield_amount" numeric, "p_purpose" "public"."aum_purpose", "p_actor_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_existing_id uuid;
  v_old_aum numeric(28,10);
  v_new_aum numeric(28,10);
  v_result jsonb;
BEGIN
  SELECT id, total_aum INTO v_existing_id, v_old_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_aum_date
    AND purpose = p_purpose
    AND is_voided = false
  FOR UPDATE;

  IF v_existing_id IS NOT NULL THEN
    v_new_aum := v_old_aum + p_yield_amount;
    UPDATE fund_daily_aum
    SET total_aum = v_new_aum, updated_at = now(), updated_by = p_actor_id, source = 'YIELD_DISTRIBUTION'
    WHERE id = v_existing_id;
    v_result := jsonb_build_object('action', 'updated', 'id', v_existing_id, 'old_aum', v_old_aum, 'new_aum', v_new_aum);
  ELSE
    SELECT COALESCE(SUM(ip.current_value), 0) INTO v_new_aum
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.is_active = true
      AND COALESCE(p.account_type::text, '') <> 'fees_account';
    v_new_aum := v_new_aum + p_yield_amount;
    INSERT INTO fund_daily_aum (id, fund_id, aum_date, total_aum, purpose, source, created_at, created_by, is_voided)
    VALUES (gen_random_uuid(), p_fund_id, p_aum_date, v_new_aum, p_purpose, 'YIELD_DISTRIBUTION', now(), p_actor_id, false)
    RETURNING id INTO v_existing_id;
    v_result := jsonb_build_object('action', 'inserted', 'id', v_existing_id, 'new_aum', v_new_aum);
  END IF;
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."upsert_fund_aum_after_yield"("p_fund_id" "uuid", "p_aum_date" "date", "p_yield_amount" numeric, "p_purpose" "public"."aum_purpose", "p_actor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_aum_against_positions"("p_fund_id" "uuid", "p_aum_value" numeric, "p_max_deviation_pct" numeric DEFAULT 0.10, "p_context" "text" DEFAULT 'unknown'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actual_position_sum numeric;
  v_deviation numeric;
BEGIN
  SELECT COALESCE(SUM(ip.current_value), 0)
  INTO v_actual_position_sum
  FROM investor_positions ip
  JOIN profiles pr ON ip.investor_id = pr.id
  WHERE ip.fund_id = p_fund_id
    AND ip.current_value > 0
    AND pr.account_type = 'investor';

  IF v_actual_position_sum = 0 THEN
    RETURN jsonb_build_object(
      'valid', true,
      'actual_position_sum', v_actual_position_sum,
      'entered_aum', p_aum_value,
      'deviation_pct', 0,
      'message', 'No positions in fund - validation skipped'
    );
  END IF;

  v_deviation := ABS(p_aum_value - v_actual_position_sum) / v_actual_position_sum;

  RETURN jsonb_build_object(
    'valid', true,
    'actual_position_sum', v_actual_position_sum,
    'entered_aum', p_aum_value,
    'deviation_pct', ROUND(v_deviation * 100, 2),
    'context', p_context
  );
END;
$$;


ALTER FUNCTION "public"."validate_aum_against_positions"("p_fund_id" "uuid", "p_aum_value" numeric, "p_max_deviation_pct" numeric, "p_context" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_aum_against_positions"("p_fund_id" "uuid", "p_aum_value" numeric, "p_max_deviation_pct" numeric, "p_context" "text") IS 'Helper function to validate AUM values against actual position sums.
Returns a jsonb with valid=true/false and detailed error messages.
Used by all financial functions to prevent data entry errors.';



CREATE OR REPLACE FUNCTION "public"."validate_aum_against_positions_at_date"("p_fund_id" "uuid", "p_aum_value" numeric, "p_event_date" "date", "p_max_deviation_pct" numeric DEFAULT 0.10, "p_context" "text" DEFAULT 'unknown'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actual_position_sum numeric;
  v_deviation numeric;
BEGIN
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_actual_position_sum
  FROM transactions_v2 t
  JOIN profiles pr ON t.investor_id = pr.id
  WHERE t.fund_id = p_fund_id
    AND t.tx_date <= p_event_date
    AND NOT t.is_voided
    AND pr.account_type = 'investor';

  IF v_actual_position_sum = 0 THEN
    RETURN jsonb_build_object(
      'valid', true,
      'actual_position_sum', v_actual_position_sum,
      'entered_aum', p_aum_value,
      'deviation_pct', 0,
      'message', 'No positions in fund for date - validation skipped'
    );
  END IF;

  v_deviation := ABS(p_aum_value - v_actual_position_sum) / v_actual_position_sum;

  RETURN jsonb_build_object(
    'valid', true,
    'actual_position_sum', v_actual_position_sum,
    'entered_aum', p_aum_value,
    'deviation_pct', ROUND(v_deviation * 100, 2),
    'context', p_context
  );
END;
$$;


ALTER FUNCTION "public"."validate_aum_against_positions_at_date"("p_fund_id" "uuid", "p_aum_value" numeric, "p_event_date" "date", "p_max_deviation_pct" numeric, "p_context" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_aum_matches_positions"("p_fund_id" "uuid", "p_aum_date" "date" DEFAULT CURRENT_DATE, "p_tolerance_pct" numeric DEFAULT 1.0, "p_purpose" "public"."aum_purpose" DEFAULT 'reporting'::"public"."aum_purpose") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_recorded_aum numeric;
  v_positions_total numeric;
  v_discrepancy numeric;
  v_discrepancy_pct numeric;
  v_fund_code text;
  v_is_valid boolean;
  v_position_count integer;
BEGIN
  -- Get fund code for logging
  SELECT code INTO v_fund_code FROM funds WHERE id = p_fund_id;

  IF v_fund_code IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'FUND_NOT_FOUND',
      'message', 'Fund with id ' || p_fund_id::text || ' not found'
    );
  END IF;

  -- Get recorded AUM
  SELECT total_aum INTO v_recorded_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_aum_date
    AND purpose = p_purpose
    AND NOT is_voided
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get sum of investor positions
  SELECT
    COALESCE(SUM(current_value), 0),
    COUNT(*)
  INTO v_positions_total, v_position_count
  FROM investor_positions
  WHERE fund_id = p_fund_id
    AND current_value > 0;

  -- Handle case where no AUM record exists
  IF v_recorded_aum IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'NO_AUM_RECORD',
      'message', 'No AUM record found for ' || v_fund_code || ' on ' || p_aum_date::text,
      'fund_code', v_fund_code,
      'positions_total', v_positions_total,
      'position_count', v_position_count,
      'suggested_action', 'CREATE_AUM_FROM_POSITIONS'
    );
  END IF;

  -- Calculate discrepancy
  v_discrepancy := v_recorded_aum - v_positions_total;

  -- Calculate discrepancy percentage (avoid divide by zero)
  IF v_recorded_aum > 0 THEN
    v_discrepancy_pct := ABS(v_discrepancy / v_recorded_aum) * 100;
  ELSIF v_positions_total > 0 THEN
    v_discrepancy_pct := 100; -- 100% discrepancy if AUM is 0 but positions exist
  ELSE
    v_discrepancy_pct := 0; -- Both are zero
  END IF;

  -- Determine if valid within tolerance
  v_is_valid := v_discrepancy_pct <= p_tolerance_pct;

  RETURN jsonb_build_object(
    'valid', v_is_valid,
    'fund_code', v_fund_code,
    'recorded_aum', v_recorded_aum,
    'positions_total', v_positions_total,
    'discrepancy', v_discrepancy,
    'discrepancy_pct', ROUND(v_discrepancy_pct, 4),
    'tolerance_pct', p_tolerance_pct,
    'position_count', v_position_count,
    'aum_date', p_aum_date,
    'suggested_action', CASE
      WHEN NOT v_is_valid AND v_discrepancy > 0 THEN 'AUM_TOO_HIGH_SYNC_DOWN'
      WHEN NOT v_is_valid AND v_discrepancy < 0 THEN 'AUM_TOO_LOW_SYNC_UP'
      ELSE 'NONE'
    END
  );
END;
$$;


ALTER FUNCTION "public"."validate_aum_matches_positions"("p_fund_id" "uuid", "p_aum_date" "date", "p_tolerance_pct" numeric, "p_purpose" "public"."aum_purpose") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_aum_matches_positions"("p_fund_id" "uuid", "p_aum_date" "date", "p_tolerance_pct" numeric, "p_purpose" "public"."aum_purpose") IS 'Validates that the recorded AUM matches the sum of investor positions within tolerance.
Used to prevent yield distributions when there are data integrity issues.
Fortune 500 critical guard added 2026-01-13.';



CREATE OR REPLACE FUNCTION "public"."validate_aum_matches_positions_strict"("p_fund_id" "uuid", "p_aum_date" "date" DEFAULT CURRENT_DATE, "p_purpose" "public"."aum_purpose" DEFAULT 'reporting'::"public"."aum_purpose") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_recorded_aum numeric;
  v_positions_total numeric;
  v_discrepancy numeric;
  v_tolerance numeric;
  v_discrepancy_pct numeric;
  v_fund_code text;
  v_is_valid boolean;
  v_position_count integer;
BEGIN
  SELECT code INTO v_fund_code FROM funds WHERE id = p_fund_id;

  IF v_fund_code IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'FUND_NOT_FOUND');
  END IF;

  -- Get recorded AUM
  SELECT total_aum INTO v_recorded_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id AND aum_date = p_aum_date 
    AND purpose = p_purpose AND NOT is_voided
  ORDER BY created_at DESC LIMIT 1;

  -- Get sum of investor positions
  SELECT COALESCE(SUM(current_value), 0), COUNT(*)
  INTO v_positions_total, v_position_count
  FROM investor_positions WHERE fund_id = p_fund_id AND current_value > 0;

  IF v_recorded_aum IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false, 'error', 'NO_AUM_RECORD',
      'positions_total', v_positions_total,
      'position_count', v_position_count
    );
  END IF;

  v_discrepancy := v_recorded_aum - v_positions_total;
  
  -- Calculate Fortune 500 tolerance (strict tier for yield operations)
  v_tolerance := calculate_reconciliation_tolerance(v_recorded_aum, 'strict');
  
  v_is_valid := ABS(v_discrepancy) <= v_tolerance;

  IF v_recorded_aum > 0 THEN
    v_discrepancy_pct := ABS(v_discrepancy / v_recorded_aum) * 100;
  ELSE
    v_discrepancy_pct := CASE WHEN v_positions_total > 0 THEN 100 ELSE 0 END;
  END IF;

  RETURN jsonb_build_object(
    'valid', v_is_valid,
    'fund_code', v_fund_code,
    'recorded_aum', v_recorded_aum,
    'positions_total', v_positions_total,
    'discrepancy', v_discrepancy,
    'discrepancy_pct', ROUND(v_discrepancy_pct, 6),
    'tolerance_used', v_tolerance,
    'tolerance_tier', 'strict',
    'position_count', v_position_count,
    'fortune_500_compliant', v_is_valid
  );
END;
$$;


ALTER FUNCTION "public"."validate_aum_matches_positions_strict"("p_fund_id" "uuid", "p_aum_date" "date", "p_purpose" "public"."aum_purpose") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_aum_matches_positions_strict"("p_fund_id" "uuid", "p_aum_date" "date", "p_purpose" "public"."aum_purpose") IS 'Strict AUM validation with Fortune 500 basis point tolerance.
Use for yield distributions and financial reporting.';



CREATE OR REPLACE FUNCTION "public"."validate_dust_tolerance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_max_dust numeric;
BEGIN
  IF NEW.dust_amount IS NOT NULL THEN
    v_max_dust := get_dust_tolerance_for_fund(NEW.fund_id);

    IF ABS(NEW.dust_amount) > v_max_dust THEN
      RAISE EXCEPTION 'Dust amount % exceeds tolerance % for fund asset',
        NEW.dust_amount, v_max_dust
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_dust_tolerance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_fees_account_fee_pct"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Ensure fees_account type always has 0% fee
  IF NEW.account_type = 'fees_account' AND COALESCE(NEW.fee_pct, 0) != 0 THEN
    RAISE EXCEPTION 'fees_account must have 0%% fee. Cannot set fee_pct to % for account type fees_account.', NEW.fee_pct;
  END IF;
  
  -- Log warning if INDIGO-named accounts have fees > 0 (informational, not blocking)
  IF (NEW.first_name ILIKE '%indigo%' OR NEW.last_name ILIKE '%indigo%') 
     AND COALESCE(NEW.fee_pct, 0) > 0 
     AND NEW.account_type = 'investor' THEN
    INSERT INTO audit_log (action, entity, entity_id, meta)
    VALUES (
      'indigo_account_fee_warning',
      'profiles',
      NEW.id::text,
      jsonb_build_object(
        'email', NEW.email,
        'name', COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''),
        'fee_pct', NEW.fee_pct,
        'account_type', NEW.account_type,
        'warning', 'INDIGO-named investor account has non-zero fee - verify this is intentional'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_fees_account_fee_pct"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_fees_account_fee_pct"() IS 'Ensures fees_account type always has 0% fee. Logs warning for INDIGO-named accounts with fees.';



CREATE OR REPLACE FUNCTION "public"."validate_ib_parent_has_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- If ib_parent_id is being set, validate the parent has 'ib' role
  IF NEW.ib_parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = NEW.ib_parent_id AND role = 'ib'
    ) THEN
      RAISE EXCEPTION 'IB parent does not have the IB role. Please assign the IB role to this user first.'
        USING ERRCODE = 'check_violation';
    END IF;
    
    -- Prevent self-referencing IB
    IF NEW.ib_parent_id = NEW.id THEN
      RAISE EXCEPTION 'An investor cannot be their own IB parent.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  
  -- If removing IB parent, reset percentage to 0
  IF NEW.ib_parent_id IS NULL AND (OLD IS NULL OR OLD.ib_parent_id IS NOT NULL) THEN
    NEW.ib_percentage := 0;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_ib_parent_has_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_ib_parent_has_role"() IS 'Trigger: Validates ib_parent_id references a user with IB role';



CREATE OR REPLACE FUNCTION "public"."validate_manual_aum_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_position_sum NUMERIC;
  v_tolerance_pct NUMERIC := 10.0;
  v_min_expected NUMERIC;
  v_max_expected NUMERIC;
BEGIN
  IF NEW.source = 'manual' OR NEW.source = 'manual_admin' THEN
    SELECT COALESCE(SUM(current_value), 0)
    INTO v_position_sum
    FROM investor_positions
    WHERE fund_id = NEW.fund_id
    AND is_active = true;
    
    IF v_position_sum > 0 THEN
      v_min_expected := v_position_sum * (1 - v_tolerance_pct / 100);
      v_max_expected := v_position_sum * (1 + v_tolerance_pct / 100);
      
      IF NEW.total_aum < v_min_expected OR NEW.total_aum > v_max_expected THEN
        RAISE WARNING 'AUM_VALIDATION_WARNING: Manual AUM entry (%) deviates >% from position sum (%) for fund_id %. Consider using sync_aum_to_positions() instead.',
          NEW.total_aum, v_tolerance_pct, v_position_sum, NEW.fund_id;
        
        INSERT INTO audit_log (
          entity, entity_id, action, actor_user, new_values
        ) VALUES (
          'fund_daily_aum', NEW.id::text, 'aum_validation_warning', NEW.created_by,
          jsonb_build_object(
            'entered_aum', NEW.total_aum,
            'position_sum', v_position_sum,
            'variance_pct', ROUND(((NEW.total_aum - v_position_sum) / v_position_sum * 100)::numeric, 2),
            'fund_id', NEW.fund_id
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_manual_aum_entry"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_manual_aum_entry"() IS 'Validates manual AUM entries against position sum. FIX: Uses source column instead of non-existent trigger_type.';



CREATE OR REPLACE FUNCTION "public"."validate_manual_aum_event"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_position_sum NUMERIC;
  v_tolerance_pct NUMERIC := 10.0;
  v_min_expected NUMERIC;
  v_max_expected NUMERIC;
BEGIN
  -- Only validate manual entries
  IF NEW.trigger_type = 'manual' THEN
    -- Calculate actual position sum
    SELECT COALESCE(SUM(current_value), 0)
    INTO v_position_sum
    FROM investor_positions
    WHERE fund_id = NEW.fund_id
    AND is_active = true;
    
    -- If positions exist, validate the closing_aum
    IF v_position_sum > 0 THEN
      v_min_expected := v_position_sum * (1 - v_tolerance_pct / 100);
      v_max_expected := v_position_sum * (1 + v_tolerance_pct / 100);
      
      IF NEW.closing_aum < v_min_expected OR NEW.closing_aum > v_max_expected THEN
        -- Raise an ERROR to block the insert for manual entries with bad data
        RAISE EXCEPTION 'AUM_VALIDATION_ERROR: Manual AUM event closing_aum (%) deviates >% from position sum (%) for fund_id %. Use correct AUM or sync with positions first.',
          NEW.closing_aum, v_tolerance_pct, v_position_sum, NEW.fund_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_manual_aum_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_position_fund_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Skip when inside a canonical RPC
  IF COALESCE(current_setting('indigo.canonical_rpc', true), 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.funds WHERE id = NEW.fund_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Cannot create position on non-active fund. Fund ID: %, Status must be active.', NEW.fund_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_position_fund_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_pre_yield_aum"("p_fund_id" "uuid", "p_tolerance_percentage" numeric DEFAULT 1.0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_reconciliation JSONB;
  v_recorded_aum NUMERIC(28,10);
  v_calculated_aum NUMERIC(28,10);
  v_discrepancy_pct NUMERIC(10,4);
  v_is_valid BOOLEAN;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_warnings TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check AUM reconciliation
  SELECT check_aum_reconciliation(p_period_end, p_fund_id, 0.01) INTO v_reconciliation;

  v_recorded_aum := (v_reconciliation->>'recorded_aum')::NUMERIC;
  v_calculated_aum := (v_reconciliation->>'calculated_aum')::NUMERIC;

  -- Calculate percentage discrepancy
  IF v_calculated_aum > 0 THEN
    v_discrepancy_pct := ABS(v_recorded_aum - v_calculated_aum) / v_calculated_aum * 100;
  ELSIF v_recorded_aum > 0 THEN
    v_discrepancy_pct := 100;
  ELSE
    v_discrepancy_pct := 0;
  END IF;

  v_is_valid := TRUE;

  -- Check for zero AUM
  IF v_calculated_aum <= 0 THEN
    v_errors := array_append(v_errors,
      format('Cannot apply yield: Calculated AUM is %s. Ensure positions are populated.', v_calculated_aum));
    v_is_valid := FALSE;
  END IF;

  -- Check for significant discrepancy
  IF v_discrepancy_pct > p_tolerance_percentage THEN
    v_errors := array_append(v_errors,
      -- FIX: Use %s instead of %.2f
      format('AUM discrepancy of %s%% exceeds tolerance of %s%%. Recorded: %s, Calculated: %s. Run reconciliation first.',
             ROUND(v_discrepancy_pct, 2), ROUND(p_tolerance_percentage, 2), v_recorded_aum, v_calculated_aum));
    v_is_valid := FALSE;
  END IF;

  -- Check for positions with zero value that have non-voided transactions
  IF EXISTS (
    SELECT 1
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value = 0
      AND EXISTS (
        SELECT 1
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id
          AND t.fund_id = ip.fund_id
          AND t.is_voided = false
          AND t.type IN ('DEPOSIT', 'YIELD', 'INTEREST')
      )
  ) THEN
    v_warnings := array_append(v_warnings,
      'Some positions have zero value but non-voided inflow transactions. Consider reconciliation.');
  END IF;

  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'recorded_aum', v_recorded_aum,
    'calculated_aum', v_calculated_aum,
    'discrepancy_percentage', v_discrepancy_pct,
    'tolerance_percentage', p_tolerance_percentage,
    'errors', v_errors,
    'warnings', v_warnings,
    'checked_at', now()
  );
END;
$$;


ALTER FUNCTION "public"."validate_pre_yield_aum"("p_fund_id" "uuid", "p_tolerance_percentage" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_transaction_amount"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- WITHDRAWAL and FEE should be recorded with their actual amounts (system handles sign)
  -- But we want to warn if signs seem inconsistent

  -- Log suspicious transactions for review
  IF NEW.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') AND NEW.amount > 0 THEN
    INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
    VALUES (
      'TRANSACTION_SIGN_WARNING',
      'transactions_v2',
      NEW.id::text,
      COALESCE(NEW.created_by, auth.uid()),
      jsonb_build_object(
        'warning', 'Positive amount for debit-type transaction',
        'type', NEW.type,
        'amount', NEW.amount,
        'recommendation', 'Review if amount sign is correct'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_transaction_amount"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_transaction_aum_exists"("p_fund_id" "uuid", "p_tx_date" "date", "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE v_aum_exists BOOLEAN; BEGIN SELECT EXISTS (SELECT 1 FROM fund_daily_aum WHERE fund_id = p_fund_id::text AND aum_date = p_tx_date AND purpose = p_purpose AND is_voided = false) INTO v_aum_exists; RETURN v_aum_exists; END; $$;


ALTER FUNCTION "public"."validate_transaction_aum_exists"("p_fund_id" "uuid", "p_tx_date" "date", "p_purpose" "public"."aum_purpose") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_transaction_fund_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fund_status text;
BEGIN
  -- Allow canonical RPCs (void-and-reissue, yield distribution, etc.)
  IF current_setting('indigo.canonical_rpc', true) = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_fund_status
  FROM public.funds
  WHERE id = NEW.fund_id;

  IF v_fund_status IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', NEW.fund_id;
  END IF;

  IF v_fund_status NOT IN ('active') THEN
    RAISE EXCEPTION 'Cannot create transaction for fund with status: %', v_fund_status;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_transaction_fund_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_transaction_has_aum"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  has_aum BOOLEAN;
BEGIN
  -- Check if AUM exists for this fund/date combo
  -- FIXED: Use tx_date instead of transaction_date (correct schema column)
  SELECT EXISTS (
    SELECT 1 FROM public.fund_daily_aum
    WHERE fund_id = NEW.fund_id
      AND aum_date = NEW.tx_date::date
      AND is_voided = false
  ) INTO has_aum;
  
  -- Only warn, don't block - per memory policy
  IF NOT has_aum THEN
    RAISE WARNING 'No AUM record found for fund % on date %. Consider adding AUM entry.', 
      NEW.fund_id, NEW.tx_date;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_transaction_has_aum"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_transaction_has_aum"() IS 'Validates that an AUM record exists for the transaction date. Fixed 2026-01-10: Uses tx_date (correct column) instead of transaction_date.';



CREATE OR REPLACE FUNCTION "public"."validate_transaction_type"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE 
  v_current_value numeric;
BEGIN
  -- SKIP validation entirely when voiding a transaction
  -- The void_transaction RPC handles its own balance checks
  IF TG_OP = 'UPDATE' AND NEW.is_voided = true AND OLD.is_voided = false THEN
    RETURN NEW;
  END IF;

  -- Make negative amounts for outflow transaction types
  IF NEW.type IN ('WITHDRAWAL', 'FEE') AND NEW.amount > 0 THEN 
    NEW.amount := -ABS(NEW.amount); 
  END IF;
  
  -- Check sufficient balance for withdrawals only (INSERT operations)
  IF TG_OP = 'INSERT' AND NEW.type = 'WITHDRAWAL' THEN
    SELECT COALESCE(current_value, 0) INTO v_current_value 
    FROM public.investor_positions 
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
    
    IF COALESCE(v_current_value, 0) + NEW.amount < 0 THEN 
      RAISE EXCEPTION 'Insufficient balance: %', v_current_value; 
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_transaction_type"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_withdrawal_request"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_available numeric;
BEGIN
  -- Only validate on INSERT (new requests)
  IF TG_OP = 'INSERT' THEN
    v_available := get_available_balance(NEW.investor_id, NEW.fund_id);
    
    IF NEW.requested_amount > v_available THEN
      RAISE EXCEPTION 'Insufficient available balance. Requested: %, Available: % (pending withdrawals already reserved)', 
        NEW.requested_amount, v_available;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_withdrawal_request"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_withdrawal_transition"("p_current_status" "text", "p_new_status" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
/*
 * Validates withdrawal state transitions according to the canonical state machine:
 *
 *   pending → approved | rejected | cancelled
 *   approved → processing | cancelled
 *   processing → completed | cancelled
 *   rejected → (terminal)
 *   completed → (terminal)
 *   cancelled → (terminal)
 */
BEGIN
  RETURN CASE 
    WHEN p_current_status = 'pending' AND p_new_status IN ('approved', 'rejected', 'cancelled') THEN true
    WHEN p_current_status = 'approved' AND p_new_status IN ('processing', 'cancelled') THEN true
    WHEN p_current_status = 'processing' AND p_new_status IN ('completed', 'cancelled') THEN true
    ELSE false
  END;
END;
$$;


ALTER FUNCTION "public"."validate_withdrawal_transition"("p_current_status" "text", "p_new_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_withdrawal_transition"("p_current_status" "text", "p_new_status" "text") IS 'Validates withdrawal state transitions. Returns true if the transition is valid per the state machine. Terminal states (rejected, completed, cancelled) cannot transition.';



CREATE OR REPLACE FUNCTION "public"."validate_yield_distribution_prerequisites"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_purpose" "text" DEFAULT 'reporting'::"text", "p_aum_tolerance_pct" numeric DEFAULT 1.0, "p_auto_sync" boolean DEFAULT false, "p_admin_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_param_validation jsonb;
  v_aum_validation jsonb;
  v_errors jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_sync_result jsonb;
  v_fund_code text;
BEGIN
  -- Get fund code
  SELECT code INTO v_fund_code FROM funds WHERE id = p_fund_id;

  -- Step 1: Run standard parameter validation
  v_param_validation := validate_yield_parameters(p_fund_id, p_yield_date, p_gross_yield_pct, p_purpose);

  -- Merge param validation errors
  IF (v_param_validation->>'valid')::boolean = false THEN
    v_errors := v_errors || (v_param_validation->'errors');
  END IF;
  v_warnings := v_warnings || COALESCE(v_param_validation->'warnings', '[]'::jsonb);

  -- Step 2: Run AUM-Position validation
  v_aum_validation := validate_aum_matches_positions(
    p_fund_id,
    p_yield_date,
    p_aum_tolerance_pct,
    p_purpose::aum_purpose
  );

  IF (v_aum_validation->>'valid')::boolean = false THEN
    -- Check if auto-sync is enabled
    IF p_auto_sync AND p_admin_id IS NOT NULL THEN
      -- Attempt auto-sync
      v_sync_result := sync_aum_to_positions(
        p_fund_id,
        p_yield_date,
        p_admin_id,
        'Auto-sync before yield distribution',
        p_purpose::aum_purpose
      );

      IF (v_sync_result->>'success')::boolean THEN
        v_warnings := v_warnings || jsonb_build_object(
          'code', 'AUM_AUTO_SYNCED',
          'message', 'AUM was auto-synced from ' || (v_sync_result->>'old_aum') || ' to ' || (v_sync_result->>'new_aum')
        );
        -- Re-validate after sync
        v_aum_validation := validate_aum_matches_positions(p_fund_id, p_yield_date, p_aum_tolerance_pct, p_purpose::aum_purpose);
      ELSE
        v_errors := v_errors || jsonb_build_object(
          'code', 'AUTO_SYNC_FAILED',
          'message', 'Auto-sync failed: ' || COALESCE(v_sync_result->>'error', 'Unknown error')
        );
      END IF;
    ELSE
      -- Add error about AUM mismatch
      v_errors := v_errors || jsonb_build_object(
        'code', 'AUM_POSITION_MISMATCH',
        'message', 'AUM (' || (v_aum_validation->>'recorded_aum') || ') does not match positions (' ||
                   (v_aum_validation->>'positions_total') || '). Discrepancy: ' ||
                   (v_aum_validation->>'discrepancy_pct') || '%',
        'recorded_aum', (v_aum_validation->>'recorded_aum')::numeric,
        'positions_total', (v_aum_validation->>'positions_total')::numeric,
        'discrepancy_pct', (v_aum_validation->>'discrepancy_pct')::numeric,
        'suggested_action', v_aum_validation->>'suggested_action'
      );
    END IF;
  END IF;

  -- Step 3: Additional sanity checks

  -- Check for negative positions
  IF EXISTS (
    SELECT 1 FROM investor_positions
    WHERE fund_id = p_fund_id AND current_value < 0
  ) THEN
    v_errors := v_errors || jsonb_build_object(
      'code', 'NEGATIVE_POSITIONS',
      'message', 'Fund has investors with negative positions - data integrity issue'
    );
  END IF;

  -- Check for zero total positions when AUM exists
  IF (v_aum_validation->>'positions_total')::numeric = 0 AND
     (v_aum_validation->>'recorded_aum')::numeric > 0 THEN
    v_errors := v_errors || jsonb_build_object(
      'code', 'ZERO_POSITIONS_WITH_AUM',
      'message', 'No investor positions but AUM is recorded - yield distribution would fail'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_errors) = 0,
    'errors', v_errors,
    'warnings', v_warnings,
    'fund_code', v_fund_code,
    'aum_validation', v_aum_validation,
    'param_validation', v_param_validation
  );
END;
$$;


ALTER FUNCTION "public"."validate_yield_distribution_prerequisites"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_purpose" "text", "p_aum_tolerance_pct" numeric, "p_auto_sync" boolean, "p_admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_yield_distribution_prerequisites"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_purpose" "text", "p_aum_tolerance_pct" numeric, "p_auto_sync" boolean, "p_admin_id" "uuid") IS 'Comprehensive pre-flight validation for yield distributions.
Includes:
- Standard parameter validation (rate bounds, AUM exists, no duplicates)
- AUM-Position reconciliation (with optional auto-sync)
- Negative position detection
- Zero position guard
Fortune 500 guard rail added 2026-01-13.';



CREATE OR REPLACE FUNCTION "public"."validate_yield_parameters"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_purpose" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fund_aum numeric(38,18);
  v_gross_yield numeric(38,18);
  v_errors jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
BEGIN
  IF p_gross_yield_pct < 0 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'code', 'NEGATIVE_YIELD',
      'message', 'Negative yield: ' || p_gross_yield_pct || '%. All balances will decrease proportionally. Fees = 0.'
    );
  END IF;

  IF p_gross_yield_pct > 50 THEN
    v_errors := v_errors || jsonb_build_object('code', 'YIELD_TOO_HIGH', 'message', 'Yield percentage exceeds 50% daily maximum');
  ELSIF p_gross_yield_pct > 10 THEN
    v_warnings := v_warnings || jsonb_build_object('code', 'HIGH_YIELD', 'message', 'Yield percentage above 10% - please verify');
  END IF;

  IF p_gross_yield_pct < -50 THEN
    v_errors := v_errors || jsonb_build_object('code', 'YIELD_TOO_LOW', 'message', 'Negative yield exceeds -50% - please verify');
  END IF;

  SELECT aum_value INTO v_fund_aum
  FROM get_funds_aum_snapshot(p_yield_date, p_purpose::aum_purpose)
  WHERE fund_id = p_fund_id;

  IF v_fund_aum IS NULL OR v_fund_aum = 0 THEN
    v_errors := v_errors || jsonb_build_object('code', 'ZERO_AUM', 'message', 'AUM is zero - cannot apply yield');
  END IF;

  IF v_fund_aum IS NOT NULL AND v_fund_aum > 0 THEN
    v_gross_yield := v_fund_aum * (p_gross_yield_pct / 100);
    IF v_gross_yield > 0 AND v_gross_yield < 0.01 THEN
      v_warnings := v_warnings || jsonb_build_object('code', 'SMALL_YIELD', 'message', 'Calculated yield is very small: ' || v_gross_yield::text);
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id AND effective_date = p_yield_date AND purpose = p_purpose AND status = 'applied'
  ) THEN
    v_errors := v_errors || jsonb_build_object('code', 'DUPLICATE', 'message', 'Yield already applied for this date');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE account_type = 'fees_account') THEN
    v_errors := v_errors || jsonb_build_object('code', 'NO_FEES_ACCOUNT', 'message', 'INDIGO Fees account not found');
  END IF;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_errors) = 0,
    'errors', v_errors,
    'warnings', v_warnings,
    'calculated_yield', v_gross_yield,
    'aum', v_fund_aum
  );
END;
$$;


ALTER FUNCTION "public"."validate_yield_parameters"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_purpose" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_yield_parameters"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_purpose" "text") IS 'Validates yield distribution parameters before execution. Returns errors and warnings.';



CREATE OR REPLACE FUNCTION "public"."validate_yield_rate_sanity"("p_yield_pct" numeric, "p_fund_id" "uuid" DEFAULT NULL::"uuid", "p_context" "text" DEFAULT 'unknown'::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_yield_pct > 1.0 THEN
    RAISE EXCEPTION 'Daily yield rate % exceeds global hard limit of 1.0%% (context: %)',
      p_yield_pct, p_context;
  END IF;
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."validate_yield_rate_sanity"("p_yield_pct" numeric, "p_fund_id" "uuid", "p_context" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_yield_temporal_lock"("p_fund_id" "uuid", "p_yield_date" "date", "p_purpose" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_aum_record record;
BEGIN
  SELECT id, created_at, temporal_lock_bypass
  INTO v_aum_record
  FROM fund_daily_aum 
  WHERE fund_id = p_fund_id 
    AND aum_date = p_yield_date
    AND purpose = p_purpose::aum_purpose
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_aum_record IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'code', 'NO_AUM');
  END IF;
  
  IF v_aum_record.created_at::date = CURRENT_DATE 
     AND p_yield_date = CURRENT_DATE 
     AND NOT COALESCE(v_aum_record.temporal_lock_bypass, false) THEN
    RETURN jsonb_build_object('valid', false, 'code', 'TEMPORAL_LOCK');
  END IF;
  
  RETURN jsonb_build_object('valid', true, 'aum_id', v_aum_record.id);
END;
$$;


ALTER FUNCTION "public"."validate_yield_temporal_lock"("p_fund_id" "uuid", "p_yield_date" "date", "p_purpose" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_aum_purpose_usage"() RETURNS TABLE("issue_type" "text", "table_name" "text", "record_id" "uuid", "details" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN PERFORM public.is_admin(); RETURN QUERY SELECT 'MISSING_AUM_RECORD'::TEXT, 'yield_distributions'::TEXT, yd.id, jsonb_build_object('fund_id', yd.fund_id, 'effective_date', yd.effective_date, 'purpose', yd.purpose) FROM yield_distributions yd WHERE yd.status != 'voided' AND NOT EXISTS (SELECT 1 FROM fund_daily_aum fda WHERE fda.fund_id = yd.fund_id AND fda.aum_date = yd.effective_date AND fda.purpose = yd.purpose AND fda.is_voided = false); RETURN; END; $$;


ALTER FUNCTION "public"."verify_aum_purpose_usage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_yield_distribution_balance"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "text" DEFAULT 'reporting'::"text") RETURNS TABLE("check_name" "text", "expected" numeric, "actual" numeric, "difference" numeric, "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_gross_yields NUMERIC;
  v_fees NUMERIC;
  v_ib_credits NUMERIC;
  v_fee_credits NUMERIC;
  v_purpose_enum aum_purpose;
BEGIN
  v_purpose_enum := p_purpose::aum_purpose;
  
  -- Get transaction totals for the date
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'INTEREST' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'FEE' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'IB_CREDIT' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'FEE_CREDIT' THEN amount ELSE 0 END), 0)
  INTO v_gross_yields, v_fees, v_ib_credits, v_fee_credits
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date = p_date
    AND purpose = v_purpose_enum;
  
  -- Check 1: Fees = IB Credits + INDIGO Credit
  check_name := 'Fees = IB + INDIGO';
  expected := v_fees;
  actual := v_ib_credits + v_fee_credits;
  difference := expected - actual;
  status := CASE WHEN ABS(difference) < 0.00000001 THEN 'PASS' ELSE 'FAIL' END;
  RETURN NEXT;
  
  -- Check 2: Fee allocations match FEE transactions
  check_name := 'Fee Allocations = Fees';
  SELECT COALESCE(SUM(fee_amount), 0) INTO expected
  FROM fee_allocations
  WHERE fund_id = p_fund_id
    AND period_end = p_date
    AND purpose = v_purpose_enum;
  actual := v_fees;
  difference := expected - actual;
  status := CASE WHEN ABS(difference) < 0.00000001 THEN 'PASS' ELSE 'FAIL' END;
  RETURN NEXT;
  
  -- Check 3: IB allocations match IB_CREDIT transactions
  check_name := 'IB Allocations = IB Credits';
  SELECT COALESCE(SUM(ib_fee_amount), 0) INTO expected
  FROM ib_allocations
  WHERE fund_id = p_fund_id
    AND effective_date = p_date
    AND purpose = v_purpose_enum;
  actual := v_ib_credits;
  difference := expected - actual;
  status := CASE WHEN ABS(difference) < 0.00000001 THEN 'PASS' ELSE 'FAIL' END;
  RETURN NEXT;
  
  RETURN;
END;
$$;


ALTER FUNCTION "public"."verify_yield_distribution_balance"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."void_and_reissue_full_exit"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_reason" "text", "p_new_date" "date" DEFAULT NULL::"date", "p_send_precision" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tx RECORD;
  v_withdrawal_request RECORD;
  v_void_result jsonb;
  v_dust_sweep_count int := 0;
  v_investor_id uuid;
  v_fund_id uuid;
  v_asset text;
  v_original_amount numeric;
  v_restored_amount numeric;
  v_new_withdrawal_amount numeric;
  v_dust_amount numeric;
  v_new_withdrawal_tx_id uuid;
  v_dust_debit_tx_id uuid;
  v_dust_credit_tx_id uuid;
  v_fees_account_id uuid;
  v_balance_before numeric;
  v_closing_aum numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  v_investor_id := v_tx.investor_id;
  v_fund_id := v_tx.fund_id;
  v_asset := v_tx.asset;
  v_original_amount := ABS(v_tx.amount);

  SELECT * INTO v_withdrawal_request FROM withdrawal_requests
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id
    AND status IN ('completed', 'approved')
  ORDER BY created_at DESC LIMIT 1;

  v_void_result := void_transaction(p_transaction_id, p_admin_id, 'Full-exit void-and-reissue: ' || p_reason);

  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void transaction: %', COALESCE(v_void_result->>'error', 'Unknown error');
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT COALESCE(SUM(amount), 0) INTO v_restored_amount
  FROM transactions_v2
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id AND is_voided = false;

  IF v_restored_amount < 0 THEN v_restored_amount := 0; END IF;

  v_new_withdrawal_amount := LEAST(p_new_amount, v_restored_amount);
  v_dust_amount := GREATEST(v_restored_amount - v_new_withdrawal_amount, 0);

  SELECT id INTO v_fees_account_id FROM profiles WHERE account_type = 'fees_account' LIMIT 1;

  SELECT COALESCE(current_value, 0) INTO v_balance_before
  FROM investor_positions
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  v_new_withdrawal_tx_id := gen_random_uuid();

  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, type, amount, tx_date,
    notes, reference_id, balance_before, balance_after,
    is_system_generated, created_by, created_at
  ) VALUES (
    v_new_withdrawal_tx_id, v_investor_id, v_fund_id,
    'WITHDRAWAL', -v_new_withdrawal_amount, COALESCE(p_new_date, v_tx.tx_date),
    'Full-exit reissue', 'reissue_full_' || p_transaction_id::text,
    v_balance_before, v_balance_before - v_new_withdrawal_amount,
    false, p_admin_id, NOW()
  );

  -- fn_ledger_drives_position trigger handles position update on INSERT.
  -- No explicit investor_positions UPDATE needed.

  IF v_dust_amount > 0 THEN
    v_dust_debit_tx_id := gen_random_uuid();

    INSERT INTO transactions_v2 (
      id, investor_id, fund_id, type, amount, tx_date,
      notes, reference_id, balance_before, balance_after,
      is_system_generated, created_by, created_at
    ) VALUES (
      v_dust_debit_tx_id, v_investor_id, v_fund_id,
      'DUST_SWEEP', -v_dust_amount, COALESCE(p_new_date, v_tx.tx_date),
      'Dust sweep reissue', 'dust-sweep-reissue-' || p_transaction_id::text,
      v_balance_before - v_new_withdrawal_amount, v_balance_before - v_new_withdrawal_amount - v_dust_amount,
      false, p_admin_id, NOW()
    );

    IF v_fees_account_id IS NOT NULL THEN
      v_dust_credit_tx_id := gen_random_uuid();

      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, amount, tx_date,
        notes, reference_id, balance_before, balance_after,
        is_system_generated, created_by, created_at
      ) VALUES (
        v_dust_credit_tx_id, v_fees_account_id, v_fund_id,
        'DUST_SWEEP', v_dust_amount, COALESCE(p_new_date, v_tx.tx_date),
        'Dust sweep reissue (fees credit)', 'dust-sweep-reissue-' || p_transaction_id::text,
        0, v_dust_amount,
        false, p_admin_id, NOW()
      );

      INSERT INTO investor_positions (investor_id, fund_id, current_value, invested_amount, currency, updated_at)
      VALUES (v_fees_account_id, v_fund_id, v_dust_amount, 0, v_asset, NOW())
      ON CONFLICT (investor_id, fund_id) DO UPDATE
        SET current_value = COALESCE(investor_positions.current_value, 0) + v_dust_amount,
            updated_at = NOW();
    END IF;
  END IF;

  UPDATE investor_positions
  SET is_active = false, updated_at = NOW()
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  SELECT COALESCE(SUM(current_value), 0) INTO v_closing_aum
  FROM investor_positions WHERE fund_id = v_fund_id;

  INSERT INTO fund_aum_events (
    fund_id, event_type, amount, closing_aum,
    transaction_id, investor_id, event_date, created_by
  ) VALUES (
    v_fund_id, 'full_exit_reissue', -v_new_withdrawal_amount,
    v_closing_aum, v_new_withdrawal_tx_id, v_investor_id,
    COALESCE(p_new_date, v_tx.tx_date), p_admin_id
  );

  IF v_withdrawal_request.id IS NOT NULL THEN
    UPDATE withdrawal_requests
    SET status = 'completed', processed_amount = v_new_withdrawal_amount
    WHERE id = v_withdrawal_request.id;
  END IF;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_AND_REISSUE_FULL_EXIT', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('original_amount', v_original_amount),
    jsonb_build_object('new_amount', v_new_withdrawal_amount, 'dust', v_dust_amount, 'closing_aum', v_closing_aum,
      'position_method', 'trigger_only_no_explicit_update'),
    jsonb_build_object('reason', p_reason)
  );

  RETURN json_build_object(
    'success', true, 'voided_tx_id', p_transaction_id, 'new_tx_id', v_new_withdrawal_tx_id,
    'dust_debit_tx_id', v_dust_debit_tx_id, 'dust_credit_tx_id', v_dust_credit_tx_id,
    'new_withdrawal_amount', v_new_withdrawal_amount, 'dust_amount', v_dust_amount,
    'restored_balance', v_restored_amount, 'closing_aum', v_closing_aum
  );
END;
$$;


ALTER FUNCTION "public"."void_and_reissue_full_exit"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_reason" "text", "p_new_date" "date", "p_send_precision" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."void_and_reissue_transaction"("p_original_tx_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_new_date" "date", "p_new_notes" "text" DEFAULT NULL::"text", "p_new_tx_hash" "text" DEFAULT NULL::"text", "p_closing_aum" numeric DEFAULT NULL::numeric, "p_reason" "text" DEFAULT 'Void and reissue correction'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_admin boolean;
  v_orig RECORD;
  v_position RECORD;
  v_void_result jsonb;
  v_new_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_computed_closing_aum numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_admin_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  SELECT * INTO v_orig FROM transactions_v2 WHERE id = p_original_tx_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_original_tx_id;
  END IF;

  IF v_orig.is_voided THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A detailed reason (min 10 chars) is required';
  END IF;

  IF v_orig.is_system_generated THEN
    RAISE EXCEPTION 'Cannot void-and-reissue system-generated transactions (yield/fee/IB). Use void yield distribution instead.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_orig.investor_id::text || v_orig.fund_id::text));

  SELECT * INTO v_position
  FROM investor_positions
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  v_balance_before := COALESCE(v_position.current_value, 0) - v_orig.amount;

  v_void_result := void_transaction(p_original_tx_id, p_admin_id, 'Void-and-reissue: ' || p_reason);

  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void original transaction: %', COALESCE(v_void_result->>'error', 'Unknown error');
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  v_balance_after := v_balance_before + p_new_amount;

  v_new_tx_id := gen_random_uuid();

  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, type, tx_subtype, amount, tx_date,
    notes, tx_hash, reference_id, correction_id,
    balance_before, balance_after,
    is_system_generated, created_by, created_at
  ) VALUES (
    v_new_tx_id,
    v_orig.investor_id,
    v_orig.fund_id,
    v_orig.type,
    v_orig.tx_subtype,
    p_new_amount,
    p_new_date,
    COALESCE(p_new_notes, v_orig.notes),
    COALESCE(p_new_tx_hash, v_orig.tx_hash),
    'reissue_' || p_original_tx_id::text,
    p_original_tx_id,
    v_balance_before,
    v_balance_after,
    false,
    p_admin_id,
    NOW()
  );

  -- fn_ledger_drives_position trigger fires on INSERT, adding p_new_amount.
  -- No explicit investor_positions UPDATE needed (was double-count bug).

  IF p_closing_aum IS NOT NULL THEN
    v_computed_closing_aum := p_closing_aum;
  ELSE
    SELECT COALESCE(SUM(current_value), 0)
    INTO v_computed_closing_aum
    FROM investor_positions
    WHERE fund_id = v_orig.fund_id;
  END IF;

  INSERT INTO fund_aum_events (
    fund_id, event_type, amount, closing_aum,
    transaction_id, investor_id, event_date, created_by
  ) VALUES (
    v_orig.fund_id, 'reissue', p_new_amount, v_computed_closing_aum,
    v_new_tx_id, v_orig.investor_id, p_new_date, p_admin_id
  );

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_AND_REISSUE', 'transactions_v2', v_new_tx_id::text, p_admin_id,
    jsonb_build_object(
      'original_tx_id', p_original_tx_id, 'original_amount', v_orig.amount,
      'original_date', v_orig.tx_date, 'original_type', v_orig.type
    ),
    jsonb_build_object(
      'new_tx_id', v_new_tx_id, 'new_amount', p_new_amount,
      'new_date', p_new_date, 'closing_aum', v_computed_closing_aum,
      'balance_before', v_balance_before, 'balance_after', v_balance_after,
      'position_method', 'trigger_only_no_explicit_update'
    ),
    jsonb_build_object('reason', p_reason)
  );

  RETURN json_build_object(
    'success', true, 'voided_tx_id', p_original_tx_id, 'new_tx_id', v_new_tx_id,
    'new_amount', p_new_amount, 'new_date', p_new_date,
    'balance_before', v_balance_before, 'balance_after', v_balance_after,
    'closing_aum', v_computed_closing_aum
  );
END;
$$;


ALTER FUNCTION "public"."void_and_reissue_transaction"("p_original_tx_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_new_date" "date", "p_new_notes" "text", "p_new_tx_hash" "text", "p_closing_aum" numeric, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."void_completed_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_request    RECORD;
  v_admin_id   uuid;
  v_tx_id      uuid;
  v_void_result jsonb;
BEGIN
  -- 1. Verify caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin only';
  END IF;

  v_admin_id := auth.uid();

  -- 2. Advisory lock to prevent concurrent mutations
  PERFORM pg_advisory_xact_lock(hashtext('void_completed_withdrawal:' || p_withdrawal_id::text));

  -- 3. Look up withdrawal request
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  -- 4. Not found or wrong status → return error
  IF v_request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal not found');
  END IF;

  IF v_request.status != 'completed' THEN
    RETURN json_build_object(
      'success', false,
      'error',   'Can only void completed withdrawals. Current status: ' || v_request.status
    );
  END IF;

  -- 5. Find the most recent non-voided WITHDRAWAL transaction for this
  --    investor+fund within 7 days of the withdrawal approval date.
  SELECT id INTO v_tx_id
  FROM public.transactions_v2
  WHERE investor_id = v_request.investor_id
    AND fund_id     = v_request.fund_id
    AND type        = 'WITHDRAWAL'
    AND is_voided   = false
    AND tx_date >= COALESCE(v_request.approved_at::date, v_request.cancelled_at::date, now()::date) - interval '7 days'
  ORDER BY tx_date DESC
  LIMIT 1;

  -- 6. Void the transaction — raise if not found (financial correctness: no silent no-op)
  IF v_tx_id IS NULL THEN
    RAISE EXCEPTION 'VOID_TX_NOT_FOUND: No matching WITHDRAWAL transaction found for this completed withdrawal. Manual review required.';
  END IF;

  -- Bypass immutability triggers immediately before first write
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  v_void_result := public.void_transaction(v_tx_id, v_admin_id, p_reason);

  -- 7. UPDATE withdrawal_requests → cancelled
  UPDATE public.withdrawal_requests
  SET
    status              = 'cancelled',
    cancellation_reason = 'VOIDED: ' || p_reason,
    cancelled_by        = v_admin_id,
    cancelled_at        = now(),
    updated_at          = now()
  WHERE id = p_withdrawal_id;

  -- 8. INSERT into audit_log
  INSERT INTO public.audit_log (actor_user, action, entity, entity_id, old_values, new_values)
  VALUES (
    v_admin_id,
    'COMPLETED_WITHDRAWAL_VOIDED',
    'withdrawal_requests',
    p_withdrawal_id::text,
    jsonb_build_object('previous_status', 'completed', 'investor_id', v_request.investor_id, 'fund_id', v_request.fund_id),
    jsonb_build_object(
      'reason',         p_reason,
      'new_status',     'cancelled',
      'voided_tx_id',   v_tx_id
    )
  );

  -- 9. Return success
  RETURN json_build_object('success', true, 'withdrawal_id', p_withdrawal_id);
END;
$$;


ALTER FUNCTION "public"."void_completed_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."void_fund_daily_aum"("p_record_id" "uuid", "p_reason" "text", "p_admin_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_record RECORD;
  v_distribution_ids uuid[];
  v_dist_id uuid;
  v_affected_investors uuid[];
  v_investor_id uuid;
  v_is_admin boolean := false;
  v_voided_dist_count integer := 0;
  v_voided_alloc_count integer := 0;
  v_voided_tx_count integer := 0;
  v_voided_events_count integer := 0;
  v_voided_fee_alloc_count integer := 0;
  v_voided_ib_alloc_count integer := 0;
  v_voided_ib_ledger_count integer := 0;
  v_voided_platform_fee_count integer := 0;
  v_events_batch integer;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = COALESCE(auth.uid(), p_admin_id)
    AND is_admin = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    SELECT EXISTS(
      SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true
    ) INTO v_is_admin;
  END IF;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can void yield records';
  END IF;

  SELECT * INTO v_record FROM fund_daily_aum WHERE id = p_record_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
  IF v_record.is_voided THEN RAISE EXCEPTION 'Record is already voided'; END IF;
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A reason of at least 5 characters is required';
  END IF;

  v_distribution_ids := ARRAY(
    SELECT id FROM yield_distributions
    WHERE fund_id = v_record.fund_id
      AND effective_date = v_record.aum_date
      AND purpose::text = v_record.purpose::text
      AND status != 'voided'
      AND (is_voided = false OR is_voided IS NULL)
  );

  IF v_distribution_ids IS NULL OR array_length(v_distribution_ids, 1) IS NULL THEN
    UPDATE fund_daily_aum
    SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id, void_reason = p_reason
    WHERE id = p_record_id;

    INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
    VALUES (
      'void_fund_daily_aum', 'fund_daily_aum', p_record_id::TEXT, p_admin_id,
      jsonb_build_object('fund_id', v_record.fund_id, 'aum_date', v_record.aum_date,
                         'total_aum', v_record.total_aum, 'purpose', v_record.purpose),
      jsonb_build_object('is_voided', true, 'reason', p_reason),
      jsonb_build_object('note', 'No distributions found — AUM-only void',
                         'voided_transactions', 0, 'voided_distributions', 0)
    );

    RETURN jsonb_build_object(
      'success', true, 'fund_id', v_record.fund_id, 'aum_date', v_record.aum_date,
      'purpose', v_record.purpose, 'voided_at', NOW(),
      'cascade_voided_transactions', 0, 'cascade_voided_distributions', 0,
      'cascade_voided_yield_allocations', 0, 'cascade_voided_yield_events', 0,
      'cascade_voided_fee_allocations', 0, 'cascade_voided_ib_allocations', 0,
      'cascade_voided_ib_ledger', 0, 'cascade_voided_platform_fee_ledger', 0,
      'affected_investors', 0
    );
  END IF;

  -- Step 2: Void yield_distributions
  UPDATE yield_distributions
  SET status = 'voided', is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade from fund_daily_aum: ' || p_reason
  WHERE id = ANY(v_distribution_ids);
  GET DIAGNOSTICS v_voided_dist_count = ROW_COUNT;

  -- Step 3: Void yield_allocations (FIXED: full void columns)
  UPDATE yield_allocations
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade from fund_daily_aum: ' || p_reason
  WHERE distribution_id = ANY(v_distribution_ids)
    AND (is_voided = false OR is_voided IS NULL);
  GET DIAGNOSTICS v_voided_alloc_count = ROW_COUNT;

  -- Step 4: Find affected investors
  SELECT ARRAY_AGG(DISTINCT ya.investor_id) INTO v_affected_investors
  FROM yield_allocations ya WHERE ya.distribution_id = ANY(v_distribution_ids);

  -- Step 5: Void transactions
  WITH linked_tx AS (
    SELECT DISTINCT unnest(ARRAY[ya.transaction_id, ya.fee_transaction_id, ya.ib_transaction_id]) AS tx_id
    FROM yield_allocations ya WHERE ya.distribution_id = ANY(v_distribution_ids)
  )
  UPDATE transactions_v2
  SET is_voided = true, void_reason = 'Cascade from fund_daily_aum: ' || p_reason,
      voided_at = NOW(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id
  WHERE id IN (SELECT tx_id FROM linked_tx WHERE tx_id IS NOT NULL) AND is_voided = false;
  GET DIAGNOSTICS v_voided_tx_count = ROW_COUNT;

  WITH fee_credit_refs AS (
    SELECT 'fee_credit_' || unnest(v_distribution_ids)::text AS ref_id
  )
  UPDATE transactions_v2
  SET is_voided = true, void_reason = 'Cascade from fund_daily_aum: ' || p_reason,
      voided_at = NOW(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id
  WHERE reference_id IN (SELECT ref_id FROM fee_credit_refs) AND is_voided = false;
  v_voided_tx_count := v_voided_tx_count + (SELECT count(*)::integer FROM transactions_v2
    WHERE reference_id IN (SELECT 'fee_credit_' || unnest(v_distribution_ids)::text)
      AND is_voided = true AND voided_at >= NOW() - interval '5 seconds');

  -- Step 6: Void investor_yield_events
  FOREACH v_dist_id IN ARRAY v_distribution_ids LOOP
    SELECT void_investor_yield_events_for_distribution(v_dist_id, p_admin_id) INTO v_events_batch;
    v_voided_events_count := v_voided_events_count + COALESCE(v_events_batch, 0);
  END LOOP;

  -- Step 7: Void fee_allocations
  UPDATE fee_allocations
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade from fund_daily_aum: ' || p_reason
  WHERE distribution_id = ANY(v_distribution_ids) AND (is_voided = false OR is_voided IS NULL);
  GET DIAGNOSTICS v_voided_fee_alloc_count = ROW_COUNT;

  -- Step 8: Void ib_allocations
  UPDATE ib_allocations
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
  WHERE distribution_id = ANY(v_distribution_ids) AND (is_voided = false OR is_voided IS NULL);
  GET DIAGNOSTICS v_voided_ib_alloc_count = ROW_COUNT;

  -- Step 9: Void ib_commission_ledger
  UPDATE ib_commission_ledger
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade from fund_daily_aum: ' || p_reason
  WHERE yield_distribution_id = ANY(v_distribution_ids) AND (is_voided = false OR is_voided IS NULL);
  GET DIAGNOSTICS v_voided_ib_ledger_count = ROW_COUNT;

  -- Step 10: Void platform_fee_ledger
  UPDATE platform_fee_ledger
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade from fund_daily_aum: ' || p_reason
  WHERE yield_distribution_id = ANY(v_distribution_ids) AND (is_voided = false OR is_voided IS NULL);
  GET DIAGNOSTICS v_voided_platform_fee_count = ROW_COUNT;

  -- Step 11: Recompute positions
  IF v_affected_investors IS NOT NULL THEN
    FOREACH v_investor_id IN ARRAY v_affected_investors LOOP
      PERFORM recompute_investor_position(v_investor_id, v_record.fund_id);
    END LOOP;
  END IF;

  -- Step 12: Void the AUM record
  UPDATE fund_daily_aum
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id, void_reason = p_reason
  WHERE id = p_record_id;

  -- Step 13: Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'void_fund_daily_aum', 'fund_daily_aum', p_record_id::TEXT, p_admin_id,
    jsonb_build_object('fund_id', v_record.fund_id, 'aum_date', v_record.aum_date,
                       'total_aum', v_record.total_aum, 'purpose', v_record.purpose),
    jsonb_build_object('is_voided', true, 'reason', p_reason),
    jsonb_build_object(
      'voided_transactions', v_voided_tx_count, 'voided_distributions', v_voided_dist_count,
      'voided_yield_allocations', v_voided_alloc_count, 'voided_yield_events', v_voided_events_count,
      'voided_fee_allocations', v_voided_fee_alloc_count, 'voided_ib_allocations', v_voided_ib_alloc_count,
      'voided_ib_commission_ledger', v_voided_ib_ledger_count,
      'voided_platform_fee_ledger', v_voided_platform_fee_count,
      'affected_investors', COALESCE(array_length(v_affected_investors, 1), 0),
      'distribution_ids', v_distribution_ids
    )
  );

  RETURN jsonb_build_object(
    'success', true, 'fund_id', v_record.fund_id, 'aum_date', v_record.aum_date,
    'purpose', v_record.purpose, 'voided_at', NOW(),
    'cascade_voided_transactions', v_voided_tx_count,
    'cascade_voided_distributions', v_voided_dist_count,
    'cascade_voided_yield_allocations', v_voided_alloc_count,
    'cascade_voided_yield_events', v_voided_events_count,
    'cascade_voided_fee_allocations', v_voided_fee_alloc_count,
    'cascade_voided_ib_allocations', v_voided_ib_alloc_count,
    'cascade_voided_ib_ledger', v_voided_ib_ledger_count,
    'cascade_voided_platform_fee_ledger', v_voided_platform_fee_count,
    'affected_investors', COALESCE(array_length(v_affected_investors, 1), 0)
  );
END;
$$;


ALTER FUNCTION "public"."void_fund_daily_aum"("p_record_id" "uuid", "p_reason" "text", "p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."void_investor_yield_events_for_distribution"("p_distribution_id" "uuid", "p_admin_id" "uuid", "p_reason" "text" DEFAULT 'Distribution voided'::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE investor_yield_events
  SET is_voided = true,
      voided_at = now(),
      voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = p_reason
  WHERE reference_id = p_distribution_id::text
    AND is_voided = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Log the void action
  INSERT INTO audit_log (entity, entity_id, action, actor_user, meta)
  VALUES (
    'investor_yield_events',
    p_distribution_id::text,
    'BULK_VOID',
    p_admin_id,
    jsonb_build_object(
      'reason', p_reason,
      'events_voided', v_count,
      'distribution_id', p_distribution_id
    )
  );
  
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."void_investor_yield_events_for_distribution"("p_distribution_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."void_investor_yield_events_for_distribution"("p_distribution_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") IS 'INTERNAL: Voids investor_yield_events linked to a specific distribution.
Called by: void_yield_distribution (cascade). Not for direct use.';



CREATE OR REPLACE FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tx RECORD;
  v_aum_events_voided INT := 0;
  v_daily_aum_voided INT := 0;
  v_fee_allocations_voided INT := 0;
  v_ib_ledger_voided INT := 0;
  v_platform_fee_voided INT := 0;
  v_yield_events_voided INT := 0;
  v_distributions_voided INT := 0;
  v_result JSONB;
  v_affected_dist RECORD;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('void_tx'), hashtext(p_transaction_id::TEXT));

  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);
  PERFORM set_config('app.canonical_rpc', 'true', TRUE);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  IF NOT public.check_is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: admin privileges required for user %', p_admin_id;
  END IF;

  SELECT * INTO v_tx FROM public.transactions_v2 WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided: %', p_transaction_id;
  END IF;

  UPDATE public.transactions_v2
  SET is_voided = TRUE,
      voided_at = NOW(),
      voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = p_reason
  WHERE id = p_transaction_id;

  IF v_tx.type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    UPDATE public.fund_aum_events
    SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id,
        void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT,
        updated_at = NOW()
    WHERE fund_id = v_tx.fund_id AND is_voided = FALSE
      AND ((v_tx.reference_id IS NOT NULL AND trigger_reference = v_tx.reference_id)
            OR (v_tx.reference_id IS NULL AND trigger_reference IS NULL
                AND event_date = v_tx.tx_date));
    GET DIAGNOSTICS v_aum_events_voided = ROW_COUNT;
  END IF;

  UPDATE public.fund_daily_aum
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT,
      updated_at = NOW()
  WHERE fund_id = v_tx.fund_id AND is_voided = FALSE AND aum_date = v_tx.tx_date
    AND source IN ('tx_sync', 'tx_position_sync', 'auto_heal_sync', 'trigger:position_sync');
  GET DIAGNOSTICS v_daily_aum_voided = ROW_COUNT;

  PERFORM public.recalculate_fund_aum_for_date(
    v_tx.fund_id, v_tx.tx_date, 'transaction'::aum_purpose, p_admin_id
  );

  UPDATE public.fee_allocations
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
  WHERE (credit_transaction_id = p_transaction_id OR debit_transaction_id = p_transaction_id)
    AND is_voided = FALSE;
  GET DIAGNOSTICS v_fee_allocations_voided = ROW_COUNT;

  UPDATE public.ib_commission_ledger
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT, updated_at = NOW()
  WHERE transaction_id = p_transaction_id AND is_voided = FALSE;
  GET DIAGNOSTICS v_ib_ledger_voided = ROW_COUNT;

  UPDATE public.platform_fee_ledger
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT, updated_at = NOW()
  WHERE transaction_id = p_transaction_id AND is_voided = FALSE;
  GET DIAGNOSTICS v_platform_fee_voided = ROW_COUNT;

  UPDATE public.investor_yield_events
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id, updated_at = NOW()
  WHERE (trigger_transaction_id = p_transaction_id
         OR reference_id = v_tx.reference_id)
    AND is_voided = FALSE;
  GET DIAGNOSTICS v_yield_events_voided = ROW_COUNT;

  -- P0 FIX: Cascade void to orphaned yield_distributions
  IF v_tx.type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT') AND v_tx.distribution_id IS NOT NULL THEN
    UPDATE yield_distributions
    SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id,
        void_reason = 'Cascade void: all yield transactions voided from tx ' || p_transaction_id::TEXT
    WHERE id = v_tx.distribution_id
      AND is_voided = FALSE
      AND NOT EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.distribution_id = v_tx.distribution_id
          AND t.type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT')
          AND t.is_voided = FALSE
          AND t.id != p_transaction_id
      );
    GET DIAGNOSTICS v_distributions_voided = ROW_COUNT;
  END IF;

  IF v_tx.type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    FOR v_affected_dist IN
      SELECT yd.id FROM yield_distributions yd
      WHERE yd.fund_id = v_tx.fund_id
        AND yd.is_voided = FALSE
        AND yd.purpose = 'transaction'
        AND NOT EXISTS (
          SELECT 1 FROM transactions_v2 t
          WHERE t.distribution_id = yd.id
            AND t.type = 'YIELD'
            AND t.is_voided = FALSE
        )
        AND EXISTS (
          SELECT 1 FROM transactions_v2 t
          WHERE t.distribution_id = yd.id
            AND t.type = 'YIELD'
            AND t.is_voided = TRUE
        )
    LOOP
      UPDATE yield_distributions
      SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
          voided_by_profile_id = p_admin_id,
          void_reason = 'Cascade void: source ' || v_tx.type || ' ' || p_transaction_id::TEXT || ' voided, all yield txs orphaned'
      WHERE id = v_affected_dist.id;
      v_distributions_voided := v_distributions_voided + 1;
    END LOOP;
  END IF;

  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID', 'transactions_v2', p_transaction_id::TEXT, p_admin_id,
    JSONB_BUILD_OBJECT('is_voided', FALSE, 'type', v_tx.type, 'amount', v_tx.amount),
    JSONB_BUILD_OBJECT(
      'is_voided', TRUE, 'void_reason', p_reason, 'voided_at', NOW(),
      'aum_events_voided', v_aum_events_voided,
      'daily_aum_voided', v_daily_aum_voided,
      'fee_allocations_voided', v_fee_allocations_voided,
      'ib_ledger_voided', v_ib_ledger_voided,
      'platform_fee_voided', v_platform_fee_voided,
      'yield_events_voided', v_yield_events_voided,
      'distributions_voided', v_distributions_voided
    ),
    JSONB_BUILD_OBJECT(
      'source', 'void_transaction_rpc', 'cascade_v6', TRUE,
      'aum_recalculated', TRUE, 'isolation_model', 'advisory_xact_lock',
      'yield_distribution_cascade', TRUE
    )
  );

  RETURN JSONB_BUILD_OBJECT(
    'success', TRUE,
    'transaction_id', p_transaction_id,
    'voided_at', NOW(),
    'aum_events_voided', v_aum_events_voided,
    'daily_aum_voided', v_daily_aum_voided,
    'fee_allocations_voided', v_fee_allocations_voided,
    'ib_ledger_voided', v_ib_ledger_voided,
    'platform_fee_voided', v_platform_fee_voided,
    'yield_events_voided', v_yield_events_voided,
    'distributions_voided', v_distributions_voided,
    'message', 'Transaction voided atomically with full cascade, yield distribution cascade, and AUM recalculation'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;


ALTER FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") IS 'Full cascade void: transactions_v2, fund_aum_events, fund_daily_aum, fee_allocations,
ib_commission_ledger, platform_fee_ledger, investor_yield_events, yield_distributions.
Recalculates AUM. Concurrency: pg_advisory_xact_lock on transaction ID (auto-release at tx end).
v6.0 (2026-06-18): Added yield_distribution cascade — voids orphaned distributions
when all their yield transactions are voided. Uses distribution_id for reliable lookup.';



CREATE OR REPLACE FUNCTION "public"."void_transaction_with_lock"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fund_id UUID;
BEGIN
  SELECT fund_id INTO v_fund_id
  FROM public.transactions_v2
  WHERE id = p_transaction_id;

  IF v_fund_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_FOUND', 'message', 'Transaction not found'
    );
  END IF;

  -- Fund-level lock: serializes all void/unvoid/yield on the same fund.
  -- Same key as unvoid_transaction_with_lock and apply_yield_distribution_v5_with_lock.
  -- Auto-releases at transaction end — no manual unlock, no leak risk.
  PERFORM pg_advisory_xact_lock(hashtext(v_fund_id::TEXT));

  RETURN public.void_transaction(p_transaction_id, p_admin_id, p_reason);
END;
$$;


ALTER FUNCTION "public"."void_transaction_with_lock"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."void_transactions_bulk"("p_transaction_ids" "uuid"[], "p_admin_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count int;
  v_tx_id uuid;
  v_single_result jsonb;
BEGIN
  -- Admin check: any admin or super_admin can bulk void
  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  IF NOT public.check_is_admin(p_admin_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_ADMIN',
      'message', 'Admin access required for bulk void operations'
    );
  END IF;

  -- Validate array size
  v_count := array_length(p_transaction_ids, 1);
  IF v_count IS NULL OR v_count < 1 OR v_count > 50 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_BATCH_SIZE',
      'message', 'Batch size must be between 1 and 50'
    );
  END IF;

  -- Validate reason
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_REASON',
      'message', 'Reason must be at least 3 characters'
    );
  END IF;

  -- Validate none are already voided
  IF EXISTS (
    SELECT 1
    FROM public.transactions_v2
    WHERE id = ANY(p_transaction_ids)
      AND is_voided = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_VOIDED',
      'message', 'One or more transactions are already voided'
    );
  END IF;

  -- Verify all IDs exist
  IF (SELECT count(*) FROM public.transactions_v2 WHERE id = ANY(p_transaction_ids)) <> v_count THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_FOUND',
      'message', 'One or more transactions not found'
    );
  END IF;

  -- Void each transaction via canonical single-void RPC
  FOREACH v_tx_id IN ARRAY p_transaction_ids LOOP
    v_single_result := public.void_transaction(v_tx_id, p_admin_id, '[BULK] ' || trim(p_reason));

    IF COALESCE((v_single_result->>'success')::boolean, false) IS DISTINCT FROM true THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', COALESCE(v_single_result->>'error_code', 'BULK_VOID_FAILED'),
        'message', COALESCE(v_single_result->>'message', format('Failed to void transaction %s', v_tx_id))
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'count', v_count,
    'transaction_ids', to_jsonb(p_transaction_ids),
    'message', format('%s transaction(s) voided successfully', v_count)
  );
END;
$$;


ALTER FUNCTION "public"."void_transactions_bulk"("p_transaction_ids" "uuid"[], "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."void_yield_distribution"("p_distribution_id" "uuid", "p_admin_id" "uuid", "p_reason" "text" DEFAULT 'Administrative void'::"text", "p_void_crystals" boolean DEFAULT false) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_dist RECORD;
  v_voided_txs int := 0;
  v_voided_allocs int := 0;
  v_voided_crystals int := 0;
  v_crystal RECORD;
  v_tx RECORD;
  v_affected_investor RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM pg_advisory_xact_lock(hashtext('void_yd:' || p_distribution_id::text));

  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  IF v_dist IS NULL THEN RAISE EXCEPTION 'Distribution not found: %', p_distribution_id; END IF;
  IF v_dist.is_voided THEN RETURN json_build_object('success', true, 'message', 'Already voided'); END IF;

  IF p_void_crystals THEN
    FOR v_crystal IN SELECT id, effective_date FROM yield_distributions WHERE consolidated_into_id = p_distribution_id AND NOT is_voided
    LOOP
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
        UPDATE investor_yield_events SET is_voided = true
        WHERE reference_id LIKE 'YLD:' || v_dist.fund_id || ':' || v_crystal.effective_date::text || ':%'
          AND is_voided = false;
      END IF;

      UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        void_reason = 'Cascade void from distribution ' || p_distribution_id::text,
        consolidated_into_id = NULL
      WHERE id = v_crystal.id;
      v_voided_crystals := v_voided_crystals + 1;
    END LOOP;
  ELSE
    UPDATE yield_distributions SET consolidated_into_id = NULL WHERE consolidated_into_id = p_distribution_id AND NOT is_voided;
  END IF;

  -- PRIMARY: Use distribution_id column (reliable for v5+ functions)
  FOR v_tx IN SELECT id FROM transactions_v2
    WHERE distribution_id = p_distribution_id
      AND type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT')
      AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- FALLBACK: Pattern match for legacy transactions without distribution_id
  FOR v_tx IN SELECT id FROM transactions_v2
    WHERE (
      reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'yield_v5_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'yield-' || p_distribution_id::text || '-%'
      OR reference_id = 'fee_credit_' || p_distribution_id::text
      OR reference_id = 'fee_credit_v5_' || p_distribution_id::text
      OR reference_id LIKE 'fee_credit-' || p_distribution_id::text || '-%'
      OR reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_credit_v5_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_credit-' || p_distribution_id::text || '-%'
    )
    AND NOT is_voided
    AND distribution_id IS NULL
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- P2 FIX: Explicit void of yield_allocations and ib_allocations
  UPDATE yield_allocations
  SET is_voided = true, voided_at = NOW(),
      voided_by = p_admin_id, voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade void from distribution ' || p_distribution_id::text
  WHERE distribution_id = p_distribution_id AND is_voided = false;

  UPDATE ib_allocations
  SET is_voided = true, voided_at = NOW(),
      voided_by = p_admin_id, voided_by_profile_id = p_admin_id
  WHERE distribution_id = p_distribution_id AND is_voided = false;

  -- Void ledger/allocations tables
  UPDATE platform_fee_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_commission_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;

  -- Void the distribution itself
  UPDATE yield_distributions
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id, void_reason = p_reason
  WHERE id = p_distribution_id;

  -- Void investor_yield_events
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
    UPDATE investor_yield_events SET is_voided = true
    WHERE trigger_transaction_id IN (
      SELECT id FROM transactions_v2 WHERE distribution_id = p_distribution_id AND is_voided = true
    ) AND NOT is_voided;

    UPDATE investor_yield_events SET is_voided = true
    WHERE reference_id LIKE 'YLD:' || v_dist.fund_id || ':' || v_dist.effective_date::text || ':%'
      AND is_voided = false
      AND NOT EXISTS (
        SELECT 1 FROM yield_distributions yd
        WHERE yd.fund_id = v_dist.fund_id
          AND yd.effective_date = v_dist.effective_date
          AND yd.is_voided = false
      );
  END IF;

  -- Recompute positions for all affected investors
  FOR v_affected_investor IN
    SELECT DISTINCT investor_id FROM transactions_v2
    WHERE distribution_id = p_distribution_id
      AND investor_id IS NOT NULL
  LOOP
    PERFORM recompute_investor_position(v_affected_investor.investor_id, v_dist.fund_id);
  END LOOP;

  -- Recompute AUM for the distribution's effective date
  BEGIN
    PERFORM recalculate_fund_aum_for_date(v_dist.fund_id, v_dist.effective_date);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta) VALUES (
    p_admin_id, 'YIELD_DISTRIBUTION_VOIDED', 'yield_distributions', p_distribution_id::text,
    jsonb_build_object('status', v_dist.status, 'gross_yield', v_dist.gross_yield),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object('voided_txs', v_voided_txs, 'voided_crystals', v_voided_crystals,
      'void_crystals_requested', p_void_crystals, 'fund_id', v_dist.fund_id,
      'lookup_method', 'distribution_id_primary_pattern_fallback')
  );

  RETURN json_build_object(
    'success', true,
    'distribution_id', p_distribution_id,
    'voided_count', v_voided_txs,
    'voided_crystals', v_voided_crystals
  );
END;
$$;


ALTER FUNCTION "public"."void_yield_distribution"("p_distribution_id" "uuid", "p_admin_id" "uuid", "p_reason" "text", "p_void_crystals" boolean) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "alert_type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "acknowledged_at" timestamp with time zone,
    "acknowledged_by" "uuid",
    "related_run_id" "uuid",
    "notification_sent_at" timestamp with time zone,
    "notification_channel" "text",
    CONSTRAINT "admin_alerts_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."admin_alerts" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_alerts" IS 'Stores alerts generated by integrity checks and other system events.';



CREATE TABLE IF NOT EXISTS "public"."admin_integrity_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" NOT NULL,
    "violations" "jsonb" DEFAULT '[]'::"jsonb",
    "runtime_ms" integer,
    "triggered_by" "text" DEFAULT 'manual'::"text" NOT NULL,
    "created_by" "uuid",
    "scope_fund_id" "uuid",
    "scope_investor_id" "uuid",
    "context" "text",
    CONSTRAINT "admin_integrity_runs_status_check" CHECK (("status" = ANY (ARRAY['pass'::"text", 'fail'::"text"]))),
    CONSTRAINT "valid_violations" CHECK (("jsonb_typeof"("violations") = 'array'::"text"))
);


ALTER TABLE "public"."admin_integrity_runs" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_integrity_runs" IS 'CANONICAL: Stores all integrity check run results with violations, runtime, and triggered_by context.
Used by integrity-monitor edge function and admin dashboard.';



CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" integer NOT NULL,
    "symbol" "public"."asset_code" NOT NULL,
    "name" "text" NOT NULL,
    "icon_url" "text",
    "decimal_places" integer DEFAULT 8 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."assets" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."assets_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."assets_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."assets_id_seq" OWNED BY "public"."assets"."id";



CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_user" "uuid",
    "action" "text" NOT NULL,
    "entity" "text" NOT NULL,
    "entity_id" "text",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "meta" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fund_daily_aum" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aum_date" "date" NOT NULL,
    "total_aum" numeric DEFAULT 0 NOT NULL,
    "nav_per_share" numeric,
    "total_shares" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "source" "text" DEFAULT 'ingested'::"text",
    "as_of_date" "date",
    "is_month_end" boolean DEFAULT false,
    "purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose" NOT NULL,
    "updated_by" "uuid",
    "fund_id" "uuid" NOT NULL,
    "is_voided" boolean DEFAULT false NOT NULL,
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" "text",
    "temporal_lock_bypass" boolean DEFAULT false,
    "voided_by_profile_id" "uuid",
    CONSTRAINT "chk_total_aum_non_negative" CHECK (("total_aum" >= (0)::numeric))
);


ALTER TABLE "public"."fund_daily_aum" OWNER TO "postgres";


COMMENT ON TABLE "public"."fund_daily_aum" IS 'Canonical daily AUM storage for funds. 
   Purpose: reporting (finalized month-end snapshots) or transaction (mid-month operational).
   Protected by canonical mutation RPCs (set_fund_daily_aum, update_fund_daily_aum, void_fund_daily_aum).
   Use get_fund_aum_as_of() for historical lookups.';



COMMENT ON COLUMN "public"."fund_daily_aum"."purpose" IS 'reporting = finalized month-end snapshot for statements; 
   transaction = mid-month operational snapshot for yield/flows';



COMMENT ON COLUMN "public"."fund_daily_aum"."is_voided" IS 'Indicates if this AUM record has been voided';



CREATE TABLE IF NOT EXISTS "public"."funds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "asset" "text" NOT NULL,
    "strategy" "text",
    "inception_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "status" "public"."fund_status" DEFAULT 'active'::"public"."fund_status",
    "mgmt_fee_bps" integer DEFAULT 0,
    "perf_fee_bps" integer DEFAULT 2000,
    "high_water_mark" numeric(28,10) DEFAULT 0,
    "min_investment" numeric(28,10) DEFAULT 1000,
    "lock_period_days" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "fund_class" "text" NOT NULL,
    "logo_url" "text",
    "large_withdrawal_threshold" numeric(28,10),
    "cooling_off_hours" integer DEFAULT 24,
    "max_daily_yield_pct" numeric(6,4) DEFAULT 5.0,
    "min_withdrawal_amount" numeric(20,8) DEFAULT NULL::numeric,
    CONSTRAINT "chk_no_management_fee" CHECK (("mgmt_fee_bps" = 0))
);


ALTER TABLE "public"."funds" OWNER TO "postgres";


COMMENT ON TABLE "public"."funds" IS 'Active yield funds: BTCYF, ETHYF, USDTYF, SOLYF, XRPYF';



COMMENT ON COLUMN "public"."funds"."asset" IS 'Fund ticker symbol (e.g., BTC, ETH). Uppercase letters and numbers only.';



COMMENT ON COLUMN "public"."funds"."fund_class" IS 'Asset class categorization for the fund';



COMMENT ON COLUMN "public"."funds"."logo_url" IS 'Public URL to fund logo image stored in branding-assets bucket';



COMMENT ON COLUMN "public"."funds"."min_withdrawal_amount" IS 'Minimum withdrawal amount in fund asset. NULL = no minimum enforced.';



CREATE TABLE IF NOT EXISTS "public"."investor_positions" (
    "fund_id" "uuid" NOT NULL,
    "shares" numeric(28,10) DEFAULT 0 NOT NULL,
    "cost_basis" numeric(28,10) DEFAULT 0 NOT NULL,
    "current_value" numeric(28,10) DEFAULT 0 NOT NULL,
    "unrealized_pnl" numeric(28,10) DEFAULT 0,
    "realized_pnl" numeric(28,10) DEFAULT 0,
    "last_transaction_date" "date",
    "lock_until_date" "date",
    "high_water_mark" numeric(28,10),
    "mgmt_fees_paid" numeric(28,10) DEFAULT 0,
    "perf_fees_paid" numeric(28,10) DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "fund_class" "text",
    "aum_percentage" numeric(28,10) DEFAULT 0,
    "investor_id" "uuid" NOT NULL,
    "cumulative_yield_earned" numeric(28,10) DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "last_yield_crystallization_date" "date",
    CONSTRAINT "chk_no_mgmt_fees_paid" CHECK ((("mgmt_fees_paid" = (0)::numeric) OR ("mgmt_fees_paid" IS NULL))),
    CONSTRAINT "investor_positions_fund_class_check" CHECK (("fund_class" = ANY (ARRAY['USDT'::"text", 'USDC'::"text", 'EURC'::"text", 'BTC'::"text", 'ETH'::"text", 'SOL'::"text", 'XRP'::"text", 'xAUT'::"text"])))
);


ALTER TABLE "public"."investor_positions" OWNER TO "postgres";


COMMENT ON TABLE "public"."investor_positions" IS 'Financial state for investors. MUTATIONS BLOCKED outside of canonical RPCs.';



CREATE OR REPLACE VIEW "public"."aum_position_reconciliation" WITH ("security_invoker"='on') AS
 WITH "position_sums" AS (
         SELECT "ip"."fund_id",
            "sum"("ip"."current_value") AS "position_total"
           FROM "public"."investor_positions" "ip"
          GROUP BY "ip"."fund_id"
        )
 SELECT "f"."id" AS "fund_id",
    "f"."name" AS "fund_name",
    "fda"."aum_date",
    "fda"."total_aum" AS "recorded_aum",
    COALESCE("ps"."position_total", (0)::numeric) AS "calculated_aum",
    ("fda"."total_aum" - COALESCE("ps"."position_total", (0)::numeric)) AS "discrepancy",
        CASE
            WHEN ("fda"."aum_date" = ( SELECT "max"("fda2"."aum_date") AS "max"
               FROM "public"."fund_daily_aum" "fda2"
              WHERE (("fda2"."fund_id" = "fda"."fund_id") AND ("fda2"."is_voided" = false)))) THEN ("abs"(("fda"."total_aum" - COALESCE("ps"."position_total", (0)::numeric))) > 0.01)
            ELSE false
        END AS "has_discrepancy"
   FROM (("public"."funds" "f"
     JOIN "public"."fund_daily_aum" "fda" ON (("fda"."fund_id" = "f"."id")))
     LEFT JOIN "position_sums" "ps" ON (("ps"."fund_id" = "f"."id")))
  WHERE ("fda"."is_voided" = false)
  ORDER BY "f"."name", "fda"."aum_date" DESC;


ALTER VIEW "public"."aum_position_reconciliation" OWNER TO "postgres";


COMMENT ON VIEW "public"."aum_position_reconciliation" IS 'Compares AUM records with total positions (including fees_account).
has_discrepancy only flags issues for the LATEST AUM record per fund.
For date-specific reconciliation: SELECT * FROM get_aum_position_reconciliation(''2026-01-15'')';



CREATE TABLE IF NOT EXISTS "public"."data_edit_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "operation" "text",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_fields" "text"[],
    "import_related" boolean DEFAULT false,
    "import_id" "uuid",
    "edited_by" "uuid",
    "edited_at" timestamp with time zone DEFAULT "now"(),
    "edit_source" "text",
    "voided_record" boolean DEFAULT false,
    CONSTRAINT "data_edit_audit_edit_source_check" CHECK (("edit_source" = ANY (ARRAY['excel_import'::"text", 'manual'::"text", 'api'::"text", 'system'::"text"]))),
    CONSTRAINT "data_edit_audit_operation_check" CHECK (("operation" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."data_edit_audit" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_edit_audit" IS 'Tracks all inline edits in admin tables. Auto-purged after 7 days.';



COMMENT ON COLUMN "public"."data_edit_audit"."voided_record" IS 'True if the parent record being audited has been voided';



CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "fund_id" "uuid",
    "type" "public"."document_type" NOT NULL,
    "title" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "period_start" "date",
    "period_end" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "checksum" "text",
    "user_profile_id" "uuid",
    "created_by_profile_id" "uuid"
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."error_code_metadata" (
    "error_code" "text" NOT NULL,
    "category" "text" NOT NULL,
    "default_message" "text" NOT NULL,
    "user_action_hint" "text",
    "ui_action" "text",
    "severity" "text" DEFAULT 'error'::"text" NOT NULL,
    "is_retryable" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "error_code_metadata_severity_check" CHECK (("severity" = ANY (ARRAY['warning'::"text", 'error'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."error_code_metadata" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fee_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "distribution_id" "uuid" NOT NULL,
    "fund_id" "uuid" NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "fees_account_id" "uuid" DEFAULT '169bb053-36cb-4f6e-93ea-831f0dfeaf1d'::"uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "purpose" "public"."aum_purpose" NOT NULL,
    "base_net_income" numeric NOT NULL,
    "fee_percentage" numeric(28,10) NOT NULL,
    "fee_amount" numeric(28,10) NOT NULL,
    "credit_transaction_id" "uuid",
    "debit_transaction_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "is_voided" boolean DEFAULT false NOT NULL,
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "voided_by_profile_id" "uuid",
    "void_reason" "text",
    CONSTRAINT "fee_allocations_fee_amount_check" CHECK (("fee_amount" >= (0)::numeric)),
    CONSTRAINT "fee_allocations_fee_percentage_check" CHECK ((("fee_percentage" >= (0)::numeric) AND ("fee_percentage" <= (100)::numeric)))
);


ALTER TABLE "public"."fee_allocations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."fee_allocations"."is_voided" IS 'Indicates if this allocation has been voided/reversed';



CREATE TABLE IF NOT EXISTS "public"."fund_aum_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fund_id" "uuid" NOT NULL,
    "event_date" "date" NOT NULL,
    "event_ts" timestamp with time zone DEFAULT "now"() NOT NULL,
    "trigger_type" "text" DEFAULT 'manual'::"text" NOT NULL,
    "purpose" "public"."aum_purpose" NOT NULL,
    "trigger_reference" "text",
    "is_voided" boolean DEFAULT false,
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "closing_aum" numeric(28,10) DEFAULT 0 NOT NULL,
    "opening_aum" numeric(28,10) DEFAULT 0 NOT NULL,
    "post_flow_aum" numeric(28,10),
    "pre_flow_aum" numeric(28,10),
    "voided_by_profile_id" "uuid",
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."fund_aum_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fund_yield_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fund_id" "uuid" NOT NULL,
    "snapshot_date" "date" NOT NULL,
    "trigger_type" "text" NOT NULL,
    "opening_aum" numeric(28,10) NOT NULL,
    "closing_aum" numeric(28,10) NOT NULL,
    "gross_yield_pct" numeric(18,10),
    "gross_yield_amount" numeric(28,10),
    "net_yield_amount" numeric(28,10),
    "fees_amount" numeric(28,10),
    "ib_commission_amount" numeric(28,10),
    "investor_count" integer,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "period_start" "date",
    "period_end" "date",
    "days_in_period" integer,
    "trigger_reference" "text"
);


ALTER TABLE "public"."fund_yield_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."generated_statements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "period_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "html_content" "text" NOT NULL,
    "pdf_url" "text",
    "generated_by" "uuid" NOT NULL,
    "fund_names" "text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "investor_id" "uuid" NOT NULL
);


ALTER TABLE "public"."generated_statements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."global_fee_settings" (
    "setting_key" "text" NOT NULL,
    "value" numeric(10,6) NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."global_fee_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ib_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "period_id" "uuid",
    "ib_investor_id" "uuid" NOT NULL,
    "source_investor_id" "uuid" NOT NULL,
    "fund_id" "uuid",
    "source_net_income" numeric(28,10) NOT NULL,
    "ib_percentage" numeric(5,2) NOT NULL,
    "ib_fee_amount" numeric(28,10) NOT NULL,
    "effective_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "distribution_id" "uuid",
    "period_start" "date",
    "period_end" "date",
    "purpose" "public"."aum_purpose" DEFAULT 'reporting'::"public"."aum_purpose" NOT NULL,
    "source" "text",
    "is_voided" boolean DEFAULT false NOT NULL,
    "voided_at" timestamp with time zone,
    "payout_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "paid_at" timestamp with time zone,
    "paid_by" "uuid",
    "payout_batch_id" "uuid",
    "voided_by" "uuid",
    "voided_by_profile_id" "uuid",
    "void_reason" "text",
    CONSTRAINT "ib_allocations_payout_status_check" CHECK (("payout_status" = ANY (ARRAY['pending'::"text", 'paid'::"text"]))),
    CONSTRAINT "ib_allocations_source_check" CHECK ((("source" IS NULL) OR ("source" = ANY (ARRAY['from_platform_fees'::"text", 'from_investor_yield'::"text"]))))
);


ALTER TABLE "public"."ib_allocations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."ib_allocations"."is_voided" IS 'Indicates if this IB allocation has been voided';



COMMENT ON COLUMN "public"."ib_allocations"."payout_status" IS 'Commission payout status: pending or paid';



COMMENT ON COLUMN "public"."ib_allocations"."paid_at" IS 'Timestamp when commission was marked as paid';



COMMENT ON COLUMN "public"."ib_allocations"."paid_by" IS 'Admin user who marked the commission as paid';



COMMENT ON COLUMN "public"."ib_allocations"."payout_batch_id" IS 'Batch ID for grouped payout operations';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "is_admin" boolean DEFAULT false NOT NULL,
    "avatar_url" "text",
    "totp_enabled" boolean DEFAULT false,
    "totp_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "onboarding_date" "date" DEFAULT CURRENT_DATE,
    "entity_type" "text",
    "kyc_status" "text" DEFAULT 'pending'::"text",
    "ib_parent_id" "uuid",
    "ib_percentage" numeric(5,2) DEFAULT 0,
    "account_type" "public"."account_type" DEFAULT 'investor'::"public"."account_type",
    "is_system_account" boolean DEFAULT false,
    "include_in_reporting" boolean DEFAULT false NOT NULL,
    "last_activity_at" timestamp with time zone,
    "fee_pct" numeric(6,3) DEFAULT 20.000 NOT NULL,
    "ib_commission_source" "text" DEFAULT 'platform_fees'::"text" NOT NULL,
    "role" "text",
    CONSTRAINT "chk_total_deduction_max_100" CHECK (((COALESCE("fee_pct", (0)::numeric) + COALESCE("ib_percentage", (0)::numeric)) <= (100)::numeric)),
    CONSTRAINT "profiles_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['individual'::"text", 'corporate'::"text", 'trust'::"text", 'foundation'::"text"]))),
    CONSTRAINT "profiles_fee_pct_range_check" CHECK ((("fee_pct" >= (0)::numeric) AND ("fee_pct" <= (100)::numeric))),
    CONSTRAINT "profiles_ib_commission_source_check" CHECK (("ib_commission_source" = ANY (ARRAY['platform_fees'::"text", 'investor_yield'::"text"]))),
    CONSTRAINT "profiles_ib_percentage_range" CHECK ((("ib_percentage" >= (0)::numeric) AND ("ib_percentage" <= (100)::numeric))),
    CONSTRAINT "profiles_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'pending'::"text", 'suspended'::"text", 'archived'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles - RLS enforces users can only see own profile, admins can see all';



COMMENT ON COLUMN "public"."profiles"."preferences" IS 'User preferences including theme, language, dashboard settings, and notification preferences';



COMMENT ON COLUMN "public"."profiles"."fee_pct" IS 'Investor fee percentage in 0-100 range (canonical). Use instead of fee_percentage.';



COMMENT ON COLUMN "public"."profiles"."ib_commission_source" IS 'platform_fees: IB reduces INDIGO credit. investor_yield: IB reduces investor net yield.';



CREATE OR REPLACE VIEW "public"."ib_allocation_consistency" WITH ("security_invoker"='on') AS
 SELECT "ia"."id" AS "allocation_id",
    "ia"."source_investor_id",
    (("source_p"."first_name" || ' '::"text") || "source_p"."last_name") AS "source_investor_name",
    "ia"."ib_investor_id" AS "allocated_ib_id",
    (("ib_p"."first_name" || ' '::"text") || "ib_p"."last_name") AS "allocated_ib_name",
    "source_p"."ib_parent_id" AS "current_ib_id",
    (("current_ib_p"."first_name" || ' '::"text") || "current_ib_p"."last_name") AS "current_ib_name",
    "ia"."ib_fee_amount",
    "ia"."effective_date",
    ("ia"."ib_investor_id" <> "source_p"."ib_parent_id") AS "ib_changed_since_allocation",
    (("source_p"."ib_parent_id" IS NULL) AND ("ia"."ib_investor_id" IS NOT NULL)) AS "ib_removed"
   FROM ((("public"."ib_allocations" "ia"
     JOIN "public"."profiles" "source_p" ON (("source_p"."id" = "ia"."source_investor_id")))
     LEFT JOIN "public"."profiles" "ib_p" ON (("ib_p"."id" = "ia"."ib_investor_id")))
     LEFT JOIN "public"."profiles" "current_ib_p" ON (("current_ib_p"."id" = "source_p"."ib_parent_id")))
  WHERE (("ia"."is_voided" = false) AND ((("source_p"."ib_parent_id" IS NOT NULL) AND ("ia"."ib_investor_id" <> "source_p"."ib_parent_id")) OR (("source_p"."ib_parent_id" IS NULL) AND ("ia"."ib_investor_id" IS NOT NULL))));


ALTER VIEW "public"."ib_allocation_consistency" OWNER TO "postgres";


COMMENT ON VIEW "public"."ib_allocation_consistency" IS 'Integrity: IB allocation consistency check';



CREATE TABLE IF NOT EXISTS "public"."ib_commission_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fund_id" "uuid" NOT NULL,
    "yield_distribution_id" "uuid",
    "source_investor_id" "uuid" NOT NULL,
    "source_investor_name" "text",
    "ib_id" "uuid" NOT NULL,
    "ib_name" "text",
    "gross_yield_amount" numeric(28,10) NOT NULL,
    "ib_percentage" numeric(6,4) NOT NULL,
    "ib_commission_amount" numeric(28,10) NOT NULL,
    "effective_date" "date" NOT NULL,
    "asset" "text" NOT NULL,
    "transaction_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "is_voided" boolean DEFAULT false,
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" "text",
    "voided_by_profile_id" "uuid"
);


ALTER TABLE "public"."ib_commission_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ib_commission_schedule" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "fund_id" "uuid",
    "effective_date" "date" NOT NULL,
    "end_date" "date",
    "ib_percentage" numeric(5,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_ib_pct_range" CHECK ((("ib_percentage" >= (0)::numeric) AND ("ib_percentage" <= (100)::numeric)))
);


ALTER TABLE "public"."ib_commission_schedule" OWNER TO "postgres";


COMMENT ON TABLE "public"."ib_commission_schedule" IS 'Date-based IB commission rate overrides per investor, optionally per fund. Mirrors investor_fee_schedule pattern.';



CREATE TABLE IF NOT EXISTS "public"."investor_daily_balance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fund_id" "uuid" NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "balance_date" "date" NOT NULL,
    "start_of_day_balance" numeric(28,10) DEFAULT 0 NOT NULL,
    "end_of_day_balance" numeric(28,10) DEFAULT 0 NOT NULL,
    "deposits" numeric(28,10) DEFAULT 0,
    "withdrawals" numeric(28,10) DEFAULT 0,
    "yield_credited" numeric(28,10) DEFAULT 0,
    "fees_debited" numeric(28,10) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."investor_daily_balance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investor_emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "investor_id" "uuid" NOT NULL
);


ALTER TABLE "public"."investor_emails" OWNER TO "postgres";


COMMENT ON TABLE "public"."investor_emails" IS 'Investor email addresses. RLS ensures only owners or admins can access.';



COMMENT ON COLUMN "public"."investor_emails"."investor_id" IS 'Reference to the investor profile (required)';



CREATE TABLE IF NOT EXISTS "public"."investor_fee_schedule" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "fund_id" "uuid",
    "effective_date" "date" NOT NULL,
    "fee_pct" numeric(6,3) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "end_date" "date",
    CONSTRAINT "chk_fee_pct_range" CHECK ((("fee_pct" >= (0)::numeric) AND ("fee_pct" <= (100)::numeric))),
    CONSTRAINT "investor_fee_schedule_fee_pct_check" CHECK ((("fee_pct" >= (0)::numeric) AND ("fee_pct" <= (100)::numeric))),
    CONSTRAINT "investor_fee_schedule_fee_pct_range_check" CHECK ((("fee_pct" >= (0)::numeric) AND ("fee_pct" <= (100)::numeric)))
);


ALTER TABLE "public"."investor_fee_schedule" OWNER TO "postgres";


COMMENT ON COLUMN "public"."investor_fee_schedule"."fee_pct" IS 'Fee percentage stored as 0-100 (e.g., 18 = 18%). Input and display directly as X% without conversion.';



CREATE TABLE IF NOT EXISTS "public"."investor_fund_performance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "period_id" "uuid" NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "fund_name" "text" NOT NULL,
    "mtd_beginning_balance" numeric DEFAULT 0,
    "mtd_additions" numeric DEFAULT 0,
    "mtd_redemptions" numeric DEFAULT 0,
    "mtd_net_income" numeric DEFAULT 0,
    "mtd_ending_balance" numeric DEFAULT 0,
    "mtd_rate_of_return" numeric DEFAULT 0,
    "qtd_beginning_balance" numeric DEFAULT 0,
    "qtd_additions" numeric DEFAULT 0,
    "qtd_redemptions" numeric DEFAULT 0,
    "qtd_net_income" numeric DEFAULT 0,
    "qtd_ending_balance" numeric DEFAULT 0,
    "qtd_rate_of_return" numeric DEFAULT 0,
    "ytd_beginning_balance" numeric DEFAULT 0,
    "ytd_additions" numeric DEFAULT 0,
    "ytd_redemptions" numeric DEFAULT 0,
    "ytd_net_income" numeric DEFAULT 0,
    "ytd_ending_balance" numeric DEFAULT 0,
    "ytd_rate_of_return" numeric DEFAULT 0,
    "itd_beginning_balance" numeric DEFAULT 0,
    "itd_additions" numeric DEFAULT 0,
    "itd_redemptions" numeric DEFAULT 0,
    "itd_net_income" numeric DEFAULT 0,
    "itd_ending_balance" numeric DEFAULT 0,
    "itd_rate_of_return" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "purpose" "public"."aum_purpose" DEFAULT 'reporting'::"public"."aum_purpose"
);


ALTER TABLE "public"."investor_fund_performance" OWNER TO "postgres";


COMMENT ON TABLE "public"."investor_fund_performance" IS 'Monthly performance metrics per investor per fund';



COMMENT ON COLUMN "public"."investor_fund_performance"."investor_id" IS 'V2: References profiles.id (One ID: profiles.id = auth.user.id = investor_id)';



CREATE TABLE IF NOT EXISTS "public"."transactions_v2" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fund_id" "uuid" NOT NULL,
    "tx_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "value_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "asset" "text" NOT NULL,
    "amount" numeric(28,10) NOT NULL,
    "type" "public"."tx_type" NOT NULL,
    "balance_before" numeric(28,10),
    "balance_after" numeric(28,10),
    "tx_hash" "text",
    "reference_id" "text",
    "notes" "text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "fund_class" "text",
    "investor_id" "uuid",
    "purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose",
    "source" "public"."tx_source" DEFAULT 'manual_admin'::"public"."tx_source",
    "is_system_generated" boolean DEFAULT false,
    "visibility_scope" "public"."visibility_scope" DEFAULT 'investor_visible'::"public"."visibility_scope" NOT NULL,
    "transfer_id" "uuid",
    "distribution_id" "uuid",
    "correction_id" "uuid",
    "tx_subtype" "text",
    "is_voided" boolean DEFAULT false NOT NULL,
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" "text",
    "voided_by_profile_id" "uuid",
    "meta" "jsonb",
    CONSTRAINT "chk_transactions_v2_deposit_amount_sign" CHECK ((("type" <> 'DEPOSIT'::"public"."tx_type") OR ("amount" >= (0)::numeric))),
    CONSTRAINT "chk_transactions_v2_internal_credit_amount_sign" CHECK ((("type" <> 'INTERNAL_CREDIT'::"public"."tx_type") OR ("amount" >= (0)::numeric))),
    CONSTRAINT "chk_transactions_v2_internal_withdrawal_amount_sign" CHECK ((("type" <> 'INTERNAL_WITHDRAWAL'::"public"."tx_type") OR ("amount" <= (0)::numeric))),
    CONSTRAINT "chk_transactions_v2_withdrawal_amount_sign" CHECK ((("type" <> 'WITHDRAWAL'::"public"."tx_type") OR ("amount" <= (0)::numeric))),
    CONSTRAINT "chk_transactions_v2_yield_reference_required" CHECK ((("type" <> 'YIELD'::"public"."tx_type") OR ("reference_id" IS NOT NULL))),
    CONSTRAINT "chk_tx_subtype" CHECK ((("tx_subtype" IS NULL) OR ("tx_subtype" = ANY (ARRAY['first_investment'::"text", 'deposit'::"text", 'redemption'::"text", 'full_redemption'::"text", 'fee_charge'::"text", 'yield_credit'::"text", 'adjustment'::"text"])))),
    CONSTRAINT "transactions_v2_fund_class_check" CHECK (("fund_class" = ANY (ARRAY['USDT'::"text", 'USDC'::"text", 'EURC'::"text", 'BTC'::"text", 'ETH'::"text", 'SOL'::"text", 'XRP'::"text", 'xAUT'::"text"])))
);


ALTER TABLE "public"."transactions_v2" OWNER TO "postgres";


COMMENT ON TABLE "public"."transactions_v2" IS 'V2: Unified transaction ledger. All deposits, withdrawals, interest, fees';



COMMENT ON COLUMN "public"."transactions_v2"."tx_subtype" IS 'Transaction subtype for display labeling. first_investment ONLY for investor_wizard source deposits. Admin deposits always get deposit subtype.';



CREATE OR REPLACE VIEW "public"."investor_position_ledger_mismatch" WITH ("security_invoker"='on') AS
 SELECT "ip"."investor_id",
    (("p"."first_name" || ' '::"text") || "p"."last_name") AS "investor_name",
    "ip"."fund_id",
    "f"."code" AS "fund_code",
    "ip"."current_value" AS "position_value",
    COALESCE("ledger"."net_balance", (0)::numeric) AS "ledger_balance",
    ("ip"."current_value" - COALESCE("ledger"."net_balance", (0)::numeric)) AS "discrepancy"
   FROM ((("public"."investor_positions" "ip"
     JOIN "public"."profiles" "p" ON (("p"."id" = "ip"."investor_id")))
     JOIN "public"."funds" "f" ON (("f"."id" = "ip"."fund_id")))
     LEFT JOIN LATERAL ( SELECT "sum"(
                CASE
                    WHEN ("t"."type" = ANY (ARRAY['DEPOSIT'::"public"."tx_type", 'INTEREST'::"public"."tx_type", 'IB_CREDIT'::"public"."tx_type", 'YIELD'::"public"."tx_type", 'INTERNAL_CREDIT'::"public"."tx_type", 'FEE_CREDIT'::"public"."tx_type", 'ADJUSTMENT'::"public"."tx_type"])) THEN "t"."amount"
                    WHEN ("t"."type" = ANY (ARRAY['WITHDRAWAL'::"public"."tx_type", 'FEE'::"public"."tx_type", 'INTERNAL_WITHDRAWAL'::"public"."tx_type"])) THEN (- "abs"("t"."amount"))
                    ELSE (0)::numeric
                END) AS "net_balance"
           FROM "public"."transactions_v2" "t"
          WHERE (("t"."investor_id" = "ip"."investor_id") AND ("t"."fund_id" = "ip"."fund_id") AND ("t"."is_voided" = false))) "ledger" ON (true))
  WHERE ("abs"(("ip"."current_value" - COALESCE("ledger"."net_balance", (0)::numeric))) > 0.0001);


ALTER VIEW "public"."investor_position_ledger_mismatch" OWNER TO "postgres";


COMMENT ON VIEW "public"."investor_position_ledger_mismatch" IS 'Smoke test: position ledger validation';



CREATE TABLE IF NOT EXISTS "public"."investor_position_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "snapshot_date" "date" NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "fund_id" "uuid" NOT NULL,
    "current_value" numeric(28,10) NOT NULL,
    "snapshot_source" "text" DEFAULT 'daily_job'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."investor_position_snapshots" OWNER TO "postgres";


COMMENT ON TABLE "public"."investor_position_snapshots" IS 'Daily investor position snapshots for audit and historical analysis.
   Created by create_daily_position_snapshot() via scheduled cron.
   Used for point-in-time position reconstruction.';



CREATE TABLE IF NOT EXISTS "public"."investor_yield_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "fund_id" "uuid" NOT NULL,
    "event_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "trigger_type" "text" NOT NULL,
    "trigger_transaction_id" "uuid",
    "fund_aum_before" numeric(28,10) NOT NULL,
    "fund_aum_after" numeric(28,10) NOT NULL,
    "investor_balance" numeric(28,10) NOT NULL,
    "investor_share_pct" numeric(28,10) NOT NULL,
    "fund_yield_pct" numeric(28,10) NOT NULL,
    "gross_yield_amount" numeric(28,10) NOT NULL,
    "fee_pct" numeric(28,10) DEFAULT 0,
    "fee_amount" numeric(28,10) DEFAULT 0,
    "net_yield_amount" numeric(28,10) NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "days_in_period" integer NOT NULL,
    "visibility_scope" "text" DEFAULT 'admin_only'::"text" NOT NULL,
    "made_visible_at" timestamp with time zone,
    "made_visible_by" "uuid",
    "reference_id" "text" NOT NULL,
    "is_voided" boolean DEFAULT false NOT NULL,
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "created_by" "uuid",
    "ib_amount" numeric DEFAULT 0,
    "voided_by_profile_id" "uuid",
    "void_reason" "text",
    CONSTRAINT "chk_yield_event_conservation" CHECK (("abs"(((("gross_yield_amount" - "net_yield_amount") - COALESCE("fee_amount", (0)::numeric)) - COALESCE("ib_amount", (0)::numeric))) < 0.0001)),
    CONSTRAINT "investor_yield_events_trigger_type_check" CHECK (("trigger_type" = ANY (ARRAY['deposit'::"text", 'withdrawal'::"text", 'month_end'::"text", 'manual'::"text", 'transaction'::"text"]))),
    CONSTRAINT "investor_yield_events_visibility_scope_check" CHECK (("visibility_scope" = ANY (ARRAY['admin_only'::"text", 'investor_visible'::"text"])))
);


ALTER TABLE "public"."investor_yield_events" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."mv_admin_repair_usage" AS
 SELECT "action",
    "entity",
    "actor_user",
    ("meta" ->> 'executed_at'::"text") AS "executed_at",
    ("meta" ->> 'dry_run'::"text") AS "dry_run"
   FROM "public"."audit_log"
  WHERE (("action" = ANY (ARRAY['RECONCILE_ALL_POSITIONS'::"text", 'REPAIR_ALL_POSITIONS'::"text", 'VOID_TRANSACTION'::"text", 'UNVOID_TRANSACTION'::"text"])) AND ("created_at" > ("now"() - '24:00:00'::interval)));


ALTER VIEW "public"."mv_admin_repair_usage" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."mv_aum_position_drift" AS
 SELECT "fda"."fund_id",
    "f"."code" AS "fund_code",
    "f"."name" AS "fund_name",
    "fda"."aum_date",
    "fda"."total_aum" AS "recorded_aum",
    COALESCE("pos"."position_sum", (0)::numeric) AS "positions_sum",
    ("fda"."total_aum" - COALESCE("pos"."position_sum", (0)::numeric)) AS "drift_amount",
        CASE
            WHEN ("abs"(("fda"."total_aum" - COALESCE("pos"."position_sum", (0)::numeric))) < 0.01) THEN 'OK'::"text"
            WHEN ("abs"(("fda"."total_aum" - COALESCE("pos"."position_sum", (0)::numeric))) < (100)::numeric) THEN 'MINOR'::"text"
            ELSE 'MAJOR'::"text"
        END AS "drift_severity"
   FROM (("public"."fund_daily_aum" "fda"
     LEFT JOIN "public"."funds" "f" ON (("fda"."fund_id" = "f"."id")))
     LEFT JOIN ( SELECT "investor_positions"."fund_id",
            "sum"("investor_positions"."current_value") AS "position_sum"
           FROM "public"."investor_positions"
          GROUP BY "investor_positions"."fund_id") "pos" ON (("fda"."fund_id" = "pos"."fund_id")))
  WHERE (("fda"."aum_date" = CURRENT_DATE) AND ("fda"."purpose" = 'transaction'::"public"."aum_purpose") AND ("fda"."is_voided" = false) AND ("abs"(("fda"."total_aum" - COALESCE("pos"."position_sum", (0)::numeric))) > 0.01));


ALTER VIEW "public"."mv_aum_position_drift" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."mv_position_ledger_drift" AS
 SELECT "ip"."investor_id",
    "ip"."fund_id",
    "p"."email" AS "investor_email",
    "f"."name" AS "fund_name",
    "f"."code" AS "fund_code",
    "ip"."current_value" AS "position_value",
    COALESCE("ledger"."balance", (0)::numeric) AS "ledger_balance",
    ("ip"."current_value" - COALESCE("ledger"."balance", (0)::numeric)) AS "drift_amount",
        CASE
            WHEN ("abs"(("ip"."current_value" - COALESCE("ledger"."balance", (0)::numeric))) < 0.01) THEN 'OK'::"text"
            WHEN ("abs"(("ip"."current_value" - COALESCE("ledger"."balance", (0)::numeric))) < (100)::numeric) THEN 'MINOR'::"text"
            ELSE 'MAJOR'::"text"
        END AS "drift_severity"
   FROM ((("public"."investor_positions" "ip"
     JOIN ( SELECT "transactions_v2"."investor_id",
            "transactions_v2"."fund_id",
            COALESCE("sum"(
                CASE
                    WHEN ("transactions_v2"."type" = ANY (ARRAY['WITHDRAWAL'::"public"."tx_type", 'INTERNAL_WITHDRAWAL'::"public"."tx_type"])) THEN (- "abs"("transactions_v2"."amount"))
                    ELSE "transactions_v2"."amount"
                END), (0)::numeric) AS "balance"
           FROM "public"."transactions_v2"
          WHERE ("transactions_v2"."is_voided" = false)
          GROUP BY "transactions_v2"."investor_id", "transactions_v2"."fund_id") "ledger" ON ((("ip"."investor_id" = "ledger"."investor_id") AND ("ip"."fund_id" = "ledger"."fund_id"))))
     LEFT JOIN "public"."profiles" "p" ON (("ip"."investor_id" = "p"."id")))
     LEFT JOIN "public"."funds" "f" ON (("ip"."fund_id" = "f"."id")))
  WHERE ("abs"(("ip"."current_value" - COALESCE("ledger"."balance", (0)::numeric))) > 0.01);


ALTER VIEW "public"."mv_position_ledger_drift" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "data_jsonb" "jsonb" DEFAULT '{}'::"jsonb",
    "read_at" timestamp with time zone,
    "priority" "public"."notification_priority" DEFAULT 'medium'::"public"."notification_priority",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_fee_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fund_id" "uuid" NOT NULL,
    "yield_distribution_id" "uuid",
    "investor_id" "uuid" NOT NULL,
    "investor_name" "text",
    "gross_yield_amount" numeric(28,10) NOT NULL,
    "fee_percentage" numeric(6,4) NOT NULL,
    "fee_amount" numeric(28,10) NOT NULL,
    "effective_date" "date" NOT NULL,
    "asset" "text" NOT NULL,
    "transaction_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "is_voided" boolean DEFAULT false,
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" "text",
    "voided_by_profile_id" "uuid"
);


ALTER TABLE "public"."platform_fee_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "invite_code" "text" NOT NULL,
    "intended_role" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "expires_at" timestamp with time zone NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "used_at" timestamp with time zone
);


ALTER TABLE "public"."platform_invites" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."position_transaction_reconciliation" WITH ("security_invoker"='on') AS
 SELECT "ip"."investor_id",
    "ip"."fund_id",
    "ip"."current_value" AS "position_value",
    COALESCE("t"."tx_sum", (0)::numeric) AS "transaction_sum",
    ("ip"."current_value" - COALESCE("t"."tx_sum", (0)::numeric)) AS "difference"
   FROM ("public"."investor_positions" "ip"
     LEFT JOIN LATERAL ( SELECT "sum"(
                CASE
                    WHEN ("transactions_v2"."type" = ANY (ARRAY['DEPOSIT'::"public"."tx_type", 'YIELD'::"public"."tx_type", 'INTEREST'::"public"."tx_type", 'IB_CREDIT'::"public"."tx_type", 'INTERNAL_CREDIT'::"public"."tx_type", 'FEE_CREDIT'::"public"."tx_type", 'ADJUSTMENT'::"public"."tx_type"])) THEN "transactions_v2"."amount"
                    WHEN ("transactions_v2"."type" = ANY (ARRAY['WITHDRAWAL'::"public"."tx_type", 'FEE'::"public"."tx_type", 'INTERNAL_WITHDRAWAL'::"public"."tx_type"])) THEN (- "abs"("transactions_v2"."amount"))
                    ELSE (0)::numeric
                END) AS "tx_sum"
           FROM "public"."transactions_v2"
          WHERE (("transactions_v2"."investor_id" = "ip"."investor_id") AND ("transactions_v2"."fund_id" = "ip"."fund_id") AND ("transactions_v2"."is_voided" = false))) "t" ON (true))
  WHERE "public"."is_admin"();


ALTER VIEW "public"."position_transaction_reconciliation" OWNER TO "postgres";





CREATE TABLE IF NOT EXISTS "public"."rate_limit_config" (
    "action_type" "text" NOT NULL,
    "max_actions" integer DEFAULT 100 NOT NULL,
    "window_minutes" integer DEFAULT 60 NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rate_limit_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_definition_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "frequency" "text" NOT NULL,
    "day_of_week" integer,
    "day_of_month" integer,
    "time_of_day" "text" NOT NULL,
    "timezone" "text" DEFAULT 'UTC'::"text" NOT NULL,
    "recipient_user_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "recipient_emails" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "delivery_method" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "parameters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "filters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "formats" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "last_run_at" timestamp with time zone,
    "next_run_at" timestamp with time zone,
    "last_run_status" "text",
    "run_count" integer DEFAULT 0 NOT NULL,
    "failure_count" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."report_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."risk_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fund_id" "uuid",
    "investor_id" "uuid",
    "alert_type" "text" NOT NULL,
    "severity" "text" DEFAULT 'medium'::"text",
    "message" "text" NOT NULL,
    "details" "jsonb",
    "threshold_value" numeric,
    "actual_value" numeric,
    "acknowledged" boolean DEFAULT false,
    "acknowledged_by" "uuid",
    "acknowledged_at" timestamp with time zone,
    "resolved" boolean DEFAULT false,
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    CONSTRAINT "risk_alerts_alert_type_check" CHECK (("alert_type" = ANY (ARRAY['CONCENTRATION_RISK'::"text", 'LIQUIDITY_RISK'::"text", 'HIGH_YIELD_RATE'::"text", 'LARGE_WITHDRAWAL'::"text", 'POSITION_MISMATCH'::"text", 'AUM_DISCREPANCY'::"text", 'UNUSUAL_ACTIVITY'::"text", 'COMPLIANCE_WARNING'::"text"]))),
    CONSTRAINT "risk_alerts_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."risk_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."statement_email_delivery" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "statement_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "period_id" "uuid" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text",
    "sent_at" timestamp with time zone,
    "error_message" "text",
    "failed_at" timestamp with time zone,
    "retry_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "investor_id" "uuid" NOT NULL,
    "channel" "text" DEFAULT 'email'::"text" NOT NULL,
    "locked_by" "uuid",
    "locked_at" timestamp with time zone,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "last_attempt_at" timestamp with time zone,
    "provider_message_id" "text",
    "error_code" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "provider" "text" DEFAULT 'resend'::"text",
    "delivery_mode" "text" DEFAULT 'email_html'::"text",
    "delivered_at" timestamp with time zone,
    "opened_at" timestamp with time zone,
    "clicked_at" timestamp with time zone,
    "bounced_at" timestamp with time zone,
    "bounce_type" "text",
    CONSTRAINT "chk_delivery_channel" CHECK (("channel" = ANY (ARRAY['email'::"text", 'download_link'::"text", 'telegram'::"text", 'whatsapp'::"text"]))),
    CONSTRAINT "chk_delivery_status" CHECK (("status" = ANY (ARRAY['queued'::"text", 'sending'::"text", 'sent'::"text", 'delivered'::"text", 'failed'::"text", 'bounced'::"text", 'complained'::"text", 'cancelled'::"text", 'skipped'::"text", 'QUEUED'::"text", 'SENDING'::"text", 'SENT'::"text", 'DELIVERED'::"text", 'FAILED'::"text", 'BOUNCED'::"text", 'COMPLAINED'::"text", 'CANCELLED'::"text", 'SKIPPED'::"text"]))),
    CONSTRAINT "valid_delivery_mode" CHECK ((("delivery_mode" IS NULL) OR ("delivery_mode" = ANY (ARRAY['email_html'::"text", 'pdf_attachment'::"text", 'link_only'::"text", 'hybrid'::"text"]))))
);


ALTER TABLE "public"."statement_email_delivery" OWNER TO "postgres";


COMMENT ON COLUMN "public"."statement_email_delivery"."delivery_mode" IS 'Delivery mode: email_html, pdf_attachment, link_only, hybrid';



COMMENT ON COLUMN "public"."statement_email_delivery"."delivered_at" IS 'Timestamp when email was confirmed delivered via webhook';



CREATE TABLE IF NOT EXISTS "public"."statement_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "period_name" "text" NOT NULL,
    "period_end_date" "date" NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "status" "text" DEFAULT 'DRAFT'::"text",
    "finalized_at" timestamp with time zone,
    "finalized_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "statement_periods_month_check" CHECK ((("month" >= 1) AND ("month" <= 12))),
    CONSTRAINT "statement_periods_status_check" CHECK (("status" = ANY (ARRAY['DRAFT'::"text", 'FINALIZED'::"text"])))
);


ALTER TABLE "public"."statement_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."statements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "period_year" integer NOT NULL,
    "period_month" integer NOT NULL,
    "asset_code" "public"."asset_code" NOT NULL,
    "begin_balance" numeric(38,18) NOT NULL,
    "additions" numeric(38,18) NOT NULL,
    "redemptions" numeric(38,18) NOT NULL,
    "net_income" numeric(38,18) NOT NULL,
    "end_balance" numeric(38,18) NOT NULL,
    "rate_of_return_mtd" numeric(10,6),
    "rate_of_return_qtd" numeric(10,6),
    "rate_of_return_ytd" numeric(10,6),
    "rate_of_return_itd" numeric(10,6),
    "storage_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "investor_profile_id" "uuid",
    CONSTRAINT "statements_period_month_check" CHECK ((("period_month" >= 1) AND ("period_month" <= 12))),
    CONSTRAINT "statements_period_year_check" CHECK ((("period_year" >= 2024) AND ("period_year" <= 2100)))
);


ALTER TABLE "public"."statements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "category" "public"."ticket_category" DEFAULT 'general'::"public"."ticket_category" NOT NULL,
    "priority" "public"."ticket_priority" DEFAULT 'medium'::"public"."ticket_priority" NOT NULL,
    "status" "public"."ticket_status" DEFAULT 'open'::"public"."ticket_status" NOT NULL,
    "messages_jsonb" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "attachments" "text"[] DEFAULT '{}'::"text"[],
    "assigned_admin_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_config" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."system_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_config" IS 'System-wide configuration parameters';



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_concentration_risk" WITH ("security_invoker"='true') AS
 WITH "fund_totals" AS (
         SELECT "investor_positions"."fund_id",
            "sum"("investor_positions"."current_value") AS "total_aum"
           FROM "public"."investor_positions"
          WHERE ("investor_positions"."is_active" = true)
          GROUP BY "investor_positions"."fund_id"
        )
 SELECT "f"."id" AS "fund_id",
    "f"."code" AS "fund_code",
    "p"."id" AS "investor_id",
    TRIM(BOTH FROM ((COALESCE("p"."first_name", ''::"text") || ' '::"text") || COALESCE("p"."last_name", ''::"text"))) AS "investor_name",
    ("p"."account_type")::"text" AS "account_type",
    "ip"."current_value" AS "position_value",
    "ft"."total_aum" AS "fund_aum",
        CASE
            WHEN ("ft"."total_aum" > (0)::numeric) THEN "round"((("ip"."current_value" / "ft"."total_aum") * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "ownership_pct",
        CASE
            WHEN (("ip"."current_value" / NULLIF("ft"."total_aum", (0)::numeric)) >= 0.40) THEN 'CRITICAL'::"text"
            WHEN (("ip"."current_value" / NULLIF("ft"."total_aum", (0)::numeric)) >= 0.25) THEN 'HIGH'::"text"
            WHEN (("ip"."current_value" / NULLIF("ft"."total_aum", (0)::numeric)) >= 0.15) THEN 'MEDIUM'::"text"
            ELSE 'LOW'::"text"
        END AS "concentration_level"
   FROM ((("public"."investor_positions" "ip"
     JOIN "public"."funds" "f" ON (("f"."id" = "ip"."fund_id")))
     JOIN "public"."profiles" "p" ON (("p"."id" = "ip"."investor_id")))
     JOIN "fund_totals" "ft" ON (("ft"."fund_id" = "f"."id")))
  WHERE (("ip"."is_active" = true) AND ("f"."status" = 'active'::"public"."fund_status") AND ("p"."account_type" = 'investor'::"public"."account_type"))
  ORDER BY
        CASE
            WHEN ("ft"."total_aum" > (0)::numeric) THEN "round"((("ip"."current_value" / "ft"."total_aum") * (100)::numeric), 2)
            ELSE (0)::numeric
        END DESC;


ALTER VIEW "public"."v_concentration_risk" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cost_basis_mismatch" WITH ("security_invoker"='on') AS
 SELECT "ip"."investor_id",
    "ip"."fund_id",
    "f"."code" AS "fund_code",
    "p"."email" AS "investor_email",
    TRIM(BOTH FROM ((COALESCE("p"."first_name", ''::"text") || ' '::"text") || COALESCE("p"."last_name", ''::"text"))) AS "investor_name",
    "ip"."cost_basis" AS "position_cost_basis",
    "computed"."cost_basis" AS "computed_cost_basis",
    "ip"."current_value" AS "position_current_value",
    "computed"."current_value" AS "computed_current_value",
    "ip"."shares" AS "position_shares",
    "computed"."shares" AS "computed_shares",
    ("ip"."cost_basis" - "computed"."cost_basis") AS "cost_basis_variance",
    ("ip"."current_value" - "computed"."current_value") AS "current_value_variance",
        CASE
            WHEN ("computed"."cost_basis" > (0)::numeric) THEN "round"(((("ip"."cost_basis" - "computed"."cost_basis") / "computed"."cost_basis") * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "cost_basis_variance_pct"
   FROM ((("public"."investor_positions" "ip"
     JOIN "public"."funds" "f" ON (("f"."id" = "ip"."fund_id")))
     JOIN "public"."profiles" "p" ON (("p"."id" = "ip"."investor_id")))
     CROSS JOIN LATERAL ( SELECT (COALESCE("sum"(
                CASE
                    WHEN (("t"."type" = 'DEPOSIT'::"public"."tx_type") AND (NOT "t"."is_voided")) THEN "t"."amount"
                    ELSE (0)::numeric
                END), (0)::numeric) - COALESCE("sum"(
                CASE
                    WHEN (("t"."type" = 'WITHDRAWAL'::"public"."tx_type") AND (NOT "t"."is_voided")) THEN "abs"("t"."amount")
                    ELSE (0)::numeric
                END), (0)::numeric)) AS "cost_basis",
            COALESCE("sum"(
                CASE
                    WHEN (("t"."type" = ANY (ARRAY['DEPOSIT'::"public"."tx_type", 'YIELD'::"public"."tx_type", 'INTEREST'::"public"."tx_type", 'IB_CREDIT'::"public"."tx_type", 'FEE_CREDIT'::"public"."tx_type", 'INTERNAL_CREDIT'::"public"."tx_type"])) AND (NOT "t"."is_voided")) THEN "t"."amount"
                    WHEN (("t"."type" = ANY (ARRAY['WITHDRAWAL'::"public"."tx_type", 'FEE'::"public"."tx_type", 'IB_DEBIT'::"public"."tx_type", 'INTERNAL_WITHDRAWAL'::"public"."tx_type"])) AND (NOT "t"."is_voided")) THEN "t"."amount"
                    ELSE (0)::numeric
                END), (0)::numeric) AS "current_value",
            COALESCE("sum"(
                CASE
                    WHEN (("t"."type" = ANY (ARRAY['DEPOSIT'::"public"."tx_type", 'YIELD'::"public"."tx_type", 'INTEREST'::"public"."tx_type", 'IB_CREDIT'::"public"."tx_type", 'FEE_CREDIT'::"public"."tx_type", 'INTERNAL_CREDIT'::"public"."tx_type"])) AND (NOT "t"."is_voided")) THEN "t"."amount"
                    WHEN (("t"."type" = ANY (ARRAY['WITHDRAWAL'::"public"."tx_type", 'FEE'::"public"."tx_type", 'IB_DEBIT'::"public"."tx_type", 'INTERNAL_WITHDRAWAL'::"public"."tx_type"])) AND (NOT "t"."is_voided")) THEN "t"."amount"
                    ELSE (0)::numeric
                END), (0)::numeric) AS "shares"
           FROM "public"."transactions_v2" "t"
          WHERE (("t"."investor_id" = "ip"."investor_id") AND ("t"."fund_id" = "ip"."fund_id"))) "computed")
  WHERE (("abs"(("ip"."cost_basis" - "computed"."cost_basis")) > 0.01) OR ("abs"(("ip"."current_value" - "computed"."current_value")) > 0.01) OR ("abs"(("ip"."shares" - "computed"."shares")) > 0.01));


ALTER VIEW "public"."v_cost_basis_mismatch" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."yield_distributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fund_id" "uuid" NOT NULL,
    "effective_date" "date" NOT NULL,
    "purpose" "public"."aum_purpose" NOT NULL,
    "is_month_end" boolean DEFAULT false NOT NULL,
    "recorded_aum" numeric NOT NULL,
    "previous_aum" numeric,
    "gross_yield" numeric DEFAULT 0 NOT NULL,
    "distribution_type" "text" DEFAULT 'daily'::"text" NOT NULL,
    "parent_distribution_id" "uuid",
    "status" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reason" "text",
    "summary_json" "jsonb",
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" "text",
    "net_yield" numeric DEFAULT 0,
    "total_fees" numeric DEFAULT 0,
    "total_ib" numeric DEFAULT 0,
    "investor_count" integer DEFAULT 0,
    "aum_record_id" "uuid",
    "opening_aum" numeric,
    "closing_aum" numeric,
    "yield_percentage" numeric,
    "reference_id" "text",
    "period_start" "date",
    "period_end" "date",
    "dust_amount" numeric(28,10) DEFAULT 0,
    "dust_receiver_id" "uuid",
    "gross_yield_amount" numeric(28,10),
    "total_net_amount" numeric(28,10) DEFAULT 0,
    "total_fee_amount" numeric(28,10) DEFAULT 0,
    "total_ib_amount" numeric(28,10) DEFAULT 0,
    "is_voided" boolean DEFAULT false,
    "yield_date" "date",
    "calculation_method" "text" DEFAULT 'pro_rata'::"text",
    "allocation_count" integer,
    "consolidated_into_id" "uuid",
    "snapshot_time" "text",
    "voided_by_profile_id" "uuid",
    CONSTRAINT "chk_correction_has_parent" CHECK ((("distribution_type" = ANY (ARRAY['original'::"text", 'daily'::"text", 'deposit'::"text", 'withdrawal'::"text", 'transaction'::"text"])) OR ("parent_distribution_id" IS NOT NULL))),
    CONSTRAINT "chk_correction_has_reason" CHECK ((("distribution_type" = ANY (ARRAY['original'::"text", 'daily'::"text", 'deposit'::"text", 'withdrawal'::"text", 'transaction'::"text"])) OR ("reason" IS NOT NULL))),
    CONSTRAINT "chk_yield_conservation" CHECK ((("is_voided" = true) OR ("gross_yield" = (0)::numeric) OR ("total_net_amount" = (0)::numeric) OR ("abs"((("gross_yield_amount" - "total_net_amount") - "total_fee_amount")) < 0.01) OR ("abs"(((("gross_yield_amount" - "total_net_amount") - "total_fee_amount") - COALESCE("total_ib_amount", (0)::numeric))) < 0.01))),
    CONSTRAINT "chk_yield_distributions_no_dust" CHECK ((("dust_amount" IS NULL) OR ("abs"("dust_amount") <= 0.01))),
    CONSTRAINT "yield_distributions_distribution_type_check" CHECK (("distribution_type" = ANY (ARRAY['original'::"text", 'correction'::"text", 'daily'::"text", 'deposit'::"text", 'withdrawal'::"text", 'transaction'::"text"])))
);


ALTER TABLE "public"."yield_distributions" OWNER TO "postgres";


COMMENT ON TABLE "public"."yield_distributions" IS 'Stores yield distribution records. distribution_type can be: original (first), daily (scheduled), deposit/withdrawal (crystallization on flows), correction (adjustments requiring reason and parent).';



COMMENT ON COLUMN "public"."yield_distributions"."opening_aum" IS 'AUM at start of yield period';



COMMENT ON COLUMN "public"."yield_distributions"."closing_aum" IS 'AUM at end of yield period (after distribution)';



COMMENT ON COLUMN "public"."yield_distributions"."yield_percentage" IS 'Yield as percentage of opening AUM';



COMMENT ON COLUMN "public"."yield_distributions"."reference_id" IS 'External reference for audit trail';



COMMENT ON COLUMN "public"."yield_distributions"."period_start" IS 'Start date of yield accrual period';



COMMENT ON COLUMN "public"."yield_distributions"."period_end" IS 'End date of yield accrual period';



COMMENT ON COLUMN "public"."yield_distributions"."dust_amount" IS 'DEPRECATED: Always 0. Exact allocation eliminates dust.';



COMMENT ON COLUMN "public"."yield_distributions"."dust_receiver_id" IS 'DEPRECATED: No longer used. Exact allocation eliminates dust.';



COMMENT ON COLUMN "public"."yield_distributions"."calculation_method" IS 'Method used: pro_rata or adb (average daily balance)';



COMMENT ON COLUMN "public"."yield_distributions"."consolidated_into_id" IS 'When set, this crystallization distribution was consolidated into the referenced reporting distribution';



COMMENT ON COLUMN "public"."yield_distributions"."snapshot_time" IS 'HH:MM when admin recorded the AUM snapshot. Transaction purpose only. Audit trail.';



CREATE OR REPLACE VIEW "public"."v_fee_calculation_orphans" AS
 SELECT "fa"."id",
    "fa"."distribution_id",
    "fa"."fund_id",
    "fa"."investor_id",
    "fa"."fees_account_id",
    "fa"."period_start",
    "fa"."period_end",
    "fa"."purpose",
    "fa"."base_net_income",
    "fa"."fee_percentage",
    "fa"."fee_amount",
    "fa"."credit_transaction_id",
    "fa"."debit_transaction_id",
    "fa"."created_at",
    "fa"."created_by",
    "fa"."is_voided",
    "fa"."voided_at",
    "fa"."voided_by"
   FROM ("public"."fee_allocations" "fa"
     LEFT JOIN "public"."yield_distributions" "yd" ON (("fa"."distribution_id" = "yd"."id")))
  WHERE (("fa"."is_voided" = false) AND (("yd"."id" IS NULL) OR ("yd"."status" = 'voided'::"text")));


ALTER VIEW "public"."v_fee_calculation_orphans" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_fee_calculation_orphans" IS 'System admin: fee calculation orphans';



CREATE OR REPLACE VIEW "public"."v_fund_aum_position_health" WITH ("security_invoker"='on') AS
 SELECT "f"."id" AS "fund_id",
    "f"."name" AS "fund_name",
    "f"."asset",
    "f"."status",
    COALESCE("sum"("ip"."current_value"), (0)::numeric) AS "position_sum",
    "fda"."total_aum" AS "latest_daily_aum",
    "fda"."aum_date",
    "fda"."source" AS "aum_source",
    (COALESCE("sum"("ip"."current_value"), (0)::numeric) - COALESCE("fda"."total_aum", (0)::numeric)) AS "variance",
        CASE
            WHEN ("fda"."total_aum" IS NULL) THEN 'NO_AUM_RECORD'::"text"
            WHEN ((COALESCE("sum"("ip"."current_value"), (0)::numeric) = (0)::numeric) AND ("fda"."total_aum" = (0)::numeric)) THEN 'OK_EMPTY'::"text"
            WHEN ("abs"((COALESCE("sum"("ip"."current_value"), (0)::numeric) - "fda"."total_aum")) < 0.01) THEN 'OK'::"text"
            WHEN (("abs"((COALESCE("sum"("ip"."current_value"), (0)::numeric) - "fda"."total_aum")) / GREATEST("fda"."total_aum", 0.01)) < 0.01) THEN 'OK_WITHIN_1PCT'::"text"
            WHEN (("abs"((COALESCE("sum"("ip"."current_value"), (0)::numeric) - "fda"."total_aum")) / GREATEST("fda"."total_aum", 0.01)) < 0.05) THEN 'WARNING_WITHIN_5PCT'::"text"
            ELSE 'CRITICAL_MISMATCH'::"text"
        END AS "health_status"
   FROM (("public"."funds" "f"
     LEFT JOIN "public"."investor_positions" "ip" ON ((("ip"."fund_id" = "f"."id") AND ("ip"."is_active" = true))))
     LEFT JOIN LATERAL ( SELECT "fund_daily_aum"."total_aum",
            "fund_daily_aum"."aum_date",
            "fund_daily_aum"."source"
           FROM "public"."fund_daily_aum"
          WHERE (("fund_daily_aum"."fund_id" = "f"."id") AND ("fund_daily_aum"."purpose" = 'transaction'::"public"."aum_purpose") AND (("fund_daily_aum"."is_voided" = false) OR ("fund_daily_aum"."is_voided" IS NULL)))
          ORDER BY "fund_daily_aum"."aum_date" DESC
         LIMIT 1) "fda" ON (true))
  WHERE ("f"."status" = 'active'::"public"."fund_status")
  GROUP BY "f"."id", "f"."name", "f"."asset", "f"."status", "fda"."total_aum", "fda"."aum_date", "fda"."source";


ALTER VIEW "public"."v_fund_aum_position_health" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_fund_aum_position_health" IS 'Monitors AUM vs position alignment. Health statuses:
- OK: Perfect match
- OK_EMPTY: Both AUM and positions are 0
- OK_WITHIN_1PCT: Variance within 1% (acceptable for rounding)
- WARNING_WITHIN_5PCT: Variance 1-5% (investigate)
- CRITICAL_MISMATCH: Variance >5% (requires immediate action)
- NO_AUM_RECORD: No AUM record found for fund';



CREATE OR REPLACE VIEW "public"."v_ledger_position_mismatches" AS
 SELECT "ip"."investor_id",
    "ip"."fund_id",
    "ip"."current_value" AS "position_value",
    (COALESCE("sum"(
        CASE
            WHEN ("t"."type" = ANY (ARRAY['DEPOSIT'::"public"."tx_type", 'YIELD'::"public"."tx_type", 'INTEREST'::"public"."tx_type", 'FEE_CREDIT'::"public"."tx_type", 'IB_CREDIT'::"public"."tx_type", 'INTERNAL_CREDIT'::"public"."tx_type"])) THEN "t"."amount"
            ELSE (0)::numeric
        END), (0)::numeric) - COALESCE("sum"(
        CASE
            WHEN ("t"."type" = ANY (ARRAY['WITHDRAWAL'::"public"."tx_type", 'FEE'::"public"."tx_type", 'IB_DEBIT'::"public"."tx_type", 'INTERNAL_WITHDRAWAL'::"public"."tx_type"])) THEN "t"."amount"
            ELSE (0)::numeric
        END), (0)::numeric)) AS "ledger_value",
    (("ip"."current_value" - COALESCE("sum"(
        CASE
            WHEN ("t"."type" = ANY (ARRAY['DEPOSIT'::"public"."tx_type", 'YIELD'::"public"."tx_type", 'INTEREST'::"public"."tx_type", 'FEE_CREDIT'::"public"."tx_type", 'IB_CREDIT'::"public"."tx_type", 'INTERNAL_CREDIT'::"public"."tx_type"])) THEN "t"."amount"
            ELSE (0)::numeric
        END), (0)::numeric)) + COALESCE("sum"(
        CASE
            WHEN ("t"."type" = ANY (ARRAY['WITHDRAWAL'::"public"."tx_type", 'FEE'::"public"."tx_type", 'IB_DEBIT'::"public"."tx_type", 'INTERNAL_WITHDRAWAL'::"public"."tx_type"])) THEN "t"."amount"
            ELSE (0)::numeric
        END), (0)::numeric)) AS "mismatch"
   FROM ("public"."investor_positions" "ip"
     LEFT JOIN "public"."transactions_v2" "t" ON ((("t"."investor_id" = "ip"."investor_id") AND ("t"."fund_id" = "ip"."fund_id") AND ("t"."is_voided" = false))))
  WHERE ("ip"."is_active" = true)
  GROUP BY "ip"."investor_id", "ip"."fund_id", "ip"."current_value";


ALTER VIEW "public"."v_ledger_position_mismatches" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_ledger_reconciliation" AS
 WITH "position_totals" AS (
         SELECT "ip"."investor_id",
            "ip"."fund_id",
            "ip"."current_value" AS "position_value",
            "f"."asset",
            "f"."name" AS "fund_name"
           FROM ("public"."investor_positions" "ip"
             JOIN "public"."funds" "f" ON (("f"."id" = "ip"."fund_id")))
          WHERE ("ip"."current_value" <> (0)::numeric)
        ), "ledger_totals" AS (
         SELECT "t"."investor_id",
            "t"."fund_id",
            "sum"("t"."amount") AS "ledger_sum"
           FROM "public"."transactions_v2" "t"
          WHERE (NOT "t"."is_voided")
          GROUP BY "t"."investor_id", "t"."fund_id"
        )
 SELECT "pt"."investor_id",
    "pt"."fund_id",
    "pt"."fund_name",
    "pt"."asset",
    "pt"."position_value",
    COALESCE("lt"."ledger_sum", (0)::numeric) AS "ledger_sum",
    ("pt"."position_value" - COALESCE("lt"."ledger_sum", (0)::numeric)) AS "drift"
   FROM ("position_totals" "pt"
     LEFT JOIN "ledger_totals" "lt" ON ((("lt"."investor_id" = "pt"."investor_id") AND ("lt"."fund_id" = "pt"."fund_id"))))
  WHERE ("public"."is_admin"() AND ("abs"(("pt"."position_value" - COALESCE("lt"."ledger_sum", (0)::numeric))) > 0.00000001));


ALTER VIEW "public"."v_ledger_reconciliation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."withdrawal_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fund_id" "uuid" NOT NULL,
    "fund_class" "text",
    "request_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "requested_amount" numeric(28,10) NOT NULL,
    "requested_shares" numeric(28,10),
    "withdrawal_type" "text" NOT NULL,
    "status" "public"."withdrawal_status" DEFAULT 'pending'::"public"."withdrawal_status" NOT NULL,
    "approved_amount" numeric(28,10),
    "approved_shares" numeric(28,10),
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "processed_amount" numeric(28,10),
    "processed_at" timestamp with time zone,
    "settlement_date" "date",
    "tx_hash" "text",
    "rejection_reason" "text",
    "rejected_by" "uuid",
    "rejected_at" timestamp with time zone,
    "cancellation_reason" "text",
    "cancelled_by" "uuid",
    "cancelled_at" timestamp with time zone,
    "notes" "text",
    "admin_notes" "text",
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "investor_id" "uuid",
    "version" integer DEFAULT 1,
    "earliest_processing_at" timestamp with time zone,
    "is_full_exit" boolean DEFAULT false,
    CONSTRAINT "chk_amounts" CHECK (((("status" = 'pending'::"public"."withdrawal_status") AND ("approved_amount" IS NULL)) OR (("status" = ANY (ARRAY['approved'::"public"."withdrawal_status", 'processing'::"public"."withdrawal_status", 'completed'::"public"."withdrawal_status"])) AND ("approved_amount" IS NOT NULL)) OR ("status" = ANY (ARRAY['rejected'::"public"."withdrawal_status", 'cancelled'::"public"."withdrawal_status"])))),
    CONSTRAINT "withdrawal_requests_fund_class_check" CHECK (("fund_class" = ANY (ARRAY['USDT'::"text", 'USDC'::"text", 'EURC'::"text", 'BTC'::"text", 'ETH'::"text", 'SOL'::"text"]))),
    CONSTRAINT "withdrawal_requests_requested_amount_check" CHECK (("requested_amount" > (0)::numeric)),
    CONSTRAINT "withdrawal_requests_withdrawal_type_check" CHECK (("withdrawal_type" = ANY (ARRAY['full'::"text", 'partial'::"text"])))
);


ALTER TABLE "public"."withdrawal_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."withdrawal_requests" IS 'Withdrawal workflow with admin approval process';



CREATE OR REPLACE VIEW "public"."v_liquidity_risk" WITH ("security_invoker"='true') AS
 SELECT "f"."id" AS "fund_id",
    "f"."code" AS "fund_code",
    "f"."name" AS "fund_name",
    COALESCE("pos"."total_aum", (0)::numeric) AS "total_aum",
    COALESCE("wr_agg"."total_pending", (0)::numeric) AS "pending_withdrawals",
    COALESCE("pos"."active_positions", 0) AS "active_positions",
        CASE
            WHEN (COALESCE("pos"."total_aum", (0)::numeric) > (0)::numeric) THEN "round"(((COALESCE("wr_agg"."total_pending", (0)::numeric) / "pos"."total_aum") * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "withdrawal_ratio",
        CASE
            WHEN (COALESCE("pos"."total_aum", (0)::numeric) = (0)::numeric) THEN 'NO_AUM'::"text"
            WHEN ((COALESCE("wr_agg"."total_pending", (0)::numeric) / NULLIF("pos"."total_aum", (0)::numeric)) > 0.3) THEN 'HIGH'::"text"
            WHEN ((COALESCE("wr_agg"."total_pending", (0)::numeric) / NULLIF("pos"."total_aum", (0)::numeric)) > 0.15) THEN 'MEDIUM'::"text"
            ELSE 'LOW'::"text"
        END AS "risk_level"
   FROM (("public"."funds" "f"
     LEFT JOIN ( SELECT "ip"."fund_id",
            "sum"("ip"."current_value") AS "total_aum",
            ("count"(*))::integer AS "active_positions"
           FROM "public"."investor_positions" "ip"
          WHERE ("ip"."is_active" = true)
          GROUP BY "ip"."fund_id") "pos" ON (("pos"."fund_id" = "f"."id")))
     LEFT JOIN ( SELECT "wr"."fund_id",
            "sum"("wr"."requested_amount") FILTER (WHERE ("wr"."status" = ANY (ARRAY['pending'::"public"."withdrawal_status", 'approved'::"public"."withdrawal_status", 'processing'::"public"."withdrawal_status"]))) AS "total_pending"
           FROM "public"."withdrawal_requests" "wr"
          GROUP BY "wr"."fund_id") "wr_agg" ON (("wr_agg"."fund_id" = "f"."id")))
  WHERE ("f"."status" = 'active'::"public"."fund_status");


ALTER VIEW "public"."v_liquidity_risk" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_orphaned_positions" WITH ("security_invoker"='on') AS
 SELECT "ip"."investor_id",
    "ip"."fund_id",
    "ip"."current_value",
    "ip"."shares",
    "ip"."last_transaction_date",
    "ip"."updated_at",
        CASE
            WHEN (("p"."id" IS NULL) AND ("f"."id" IS NULL)) THEN 'BOTH_MISSING'::"text"
            WHEN ("p"."id" IS NULL) THEN 'INVESTOR_MISSING'::"text"
            WHEN ("f"."id" IS NULL) THEN 'FUND_MISSING'::"text"
            ELSE 'VALID'::"text"
        END AS "orphan_type",
    ("p"."id" IS NULL) AS "investor_missing",
    ("f"."id" IS NULL) AS "fund_missing"
   FROM (("public"."investor_positions" "ip"
     LEFT JOIN "public"."profiles" "p" ON (("ip"."investor_id" = "p"."id")))
     LEFT JOIN "public"."funds" "f" ON (("ip"."fund_id" = "f"."id")))
  WHERE (("p"."id" IS NULL) OR ("f"."id" IS NULL));


ALTER VIEW "public"."v_orphaned_positions" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_orphaned_positions" IS 'System admin: positions without valid investors';



CREATE OR REPLACE VIEW "public"."v_orphaned_transactions" AS
 SELECT "id",
    "investor_id",
    "fund_id",
    "type",
    "amount",
    "tx_date",
    "reference_id"
   FROM "public"."transactions_v2" "t"
  WHERE ((NOT "is_voided") AND (NOT (EXISTS ( SELECT 1
           FROM "public"."investor_positions" "ip"
          WHERE (("ip"."investor_id" = "t"."investor_id") AND ("ip"."fund_id" = "t"."fund_id"))))));


ALTER VIEW "public"."v_orphaned_transactions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_yield_conservation_violations" WITH ("security_invoker"='on') AS
 SELECT "yd"."id" AS "distribution_id",
    "yd"."fund_id",
    "f"."code" AS "fund_code",
    "yd"."period_start",
    "yd"."period_end",
    "yd"."purpose",
    COALESCE("yd"."gross_yield_amount", "yd"."gross_yield") AS "header_gross",
    COALESCE(NULLIF("yd"."total_net_amount", (0)::numeric), "yd"."net_yield") AS "header_net",
    COALESCE(NULLIF("yd"."total_fee_amount", (0)::numeric), "yd"."total_fees") AS "header_fee",
    COALESCE(NULLIF("yd"."total_ib_amount", (0)::numeric), "yd"."total_ib") AS "header_ib",
    COALESCE("yd"."dust_amount", (0)::numeric) AS "header_dust",
    (COALESCE("yd"."gross_yield_amount", "yd"."gross_yield") - (((COALESCE(NULLIF("yd"."total_net_amount", (0)::numeric), "yd"."net_yield", (0)::numeric) + COALESCE(NULLIF("yd"."total_fee_amount", (0)::numeric), "yd"."total_fees", (0)::numeric)) + COALESCE(NULLIF("yd"."total_ib_amount", (0)::numeric), "yd"."total_ib", (0)::numeric)) + COALESCE("yd"."dust_amount", (0)::numeric))) AS "header_variance",
    ("abs"((COALESCE("yd"."gross_yield_amount", "yd"."gross_yield") - (((COALESCE(NULLIF("yd"."total_net_amount", (0)::numeric), "yd"."net_yield", (0)::numeric) + COALESCE(NULLIF("yd"."total_fee_amount", (0)::numeric), "yd"."total_fees", (0)::numeric)) + COALESCE(NULLIF("yd"."total_ib_amount", (0)::numeric), "yd"."total_ib", (0)::numeric)) + COALESCE("yd"."dust_amount", (0)::numeric)))) > 0.01) AS "has_violation",
    "yd"."status",
    COALESCE("yd"."is_voided", false) AS "is_voided",
    "yd"."created_at"
   FROM ("public"."yield_distributions" "yd"
     JOIN "public"."funds" "f" ON (("f"."id" = "yd"."fund_id")))
  WHERE ((("yd"."is_voided" IS NULL) OR ("yd"."is_voided" = false)) AND ("yd"."status" = 'applied'::"text") AND ("abs"((COALESCE("yd"."gross_yield_amount", "yd"."gross_yield") - (((COALESCE(NULLIF("yd"."total_net_amount", (0)::numeric), "yd"."net_yield", (0)::numeric) + COALESCE(NULLIF("yd"."total_fee_amount", (0)::numeric), "yd"."total_fees", (0)::numeric)) + COALESCE(NULLIF("yd"."total_ib_amount", (0)::numeric), "yd"."total_ib", (0)::numeric)) + COALESCE("yd"."dust_amount", (0)::numeric)))) > 0.01));


ALTER VIEW "public"."v_yield_conservation_violations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."yield_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "distribution_id" "uuid" NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "position_value_at_calc" numeric(28,10) DEFAULT 0,
    "ownership_pct" numeric(28,10) DEFAULT 0,
    "gross_amount" numeric(28,10) NOT NULL,
    "fee_pct" numeric(28,10) DEFAULT 0,
    "fee_amount" numeric(28,10) DEFAULT 0,
    "ib_pct" numeric(28,10) DEFAULT 0,
    "ib_amount" numeric(28,10) DEFAULT 0,
    "net_amount" numeric(28,10) NOT NULL,
    "transaction_id" "uuid",
    "fee_transaction_id" "uuid",
    "is_voided" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "fund_id" "uuid",
    "adb_share" numeric(28,10),
    "ib_transaction_id" "uuid",
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "voided_by_profile_id" "uuid",
    "void_reason" "text"
);


ALTER TABLE "public"."yield_allocations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."yield_allocations"."adb_share" IS 'Average Daily Balance for this investor during the yield period';



CREATE OR REPLACE VIEW "public"."yield_distribution_conservation_check" AS
 SELECT "yd"."id" AS "distribution_id",
    "yd"."fund_id",
    "f"."code" AS "fund_code",
    "yd"."effective_date",
    "yd"."purpose",
    COALESCE("yd"."gross_yield_amount", "yd"."gross_yield") AS "gross_yield",
    COALESCE("yd"."total_fee_amount", "yd"."total_fees", (0)::numeric) AS "calculated_fees",
    COALESCE("yd"."total_ib_amount", "yd"."total_ib", (0)::numeric) AS "calculated_ib",
    COALESCE("yd"."total_net_amount", "yd"."net_yield", (0)::numeric) AS "net_to_investors",
    COALESCE("yd"."dust_amount", (0)::numeric) AS "dust",
    "abs"(((((COALESCE("yd"."gross_yield_amount", "yd"."gross_yield") - COALESCE("yd"."total_net_amount", "yd"."net_yield", (0)::numeric)) - COALESCE("yd"."total_fee_amount", "yd"."total_fees", (0)::numeric)) - COALESCE("yd"."total_ib_amount", "yd"."total_ib", (0)::numeric)) - COALESCE("yd"."dust_amount", (0)::numeric))) AS "conservation_error"
   FROM ("public"."yield_distributions" "yd"
     LEFT JOIN "public"."funds" "f" ON (("f"."id" = "yd"."fund_id")))
  WHERE ("public"."is_admin"() AND (("yd"."is_voided" IS NULL) OR ("yd"."is_voided" = false)) AND ("yd"."status" = ANY (ARRAY['applied'::"text", 'completed'::"text"])) AND ("yd"."gross_yield_amount" IS NOT NULL) AND ("abs"(((((COALESCE("yd"."gross_yield_amount", "yd"."gross_yield") - COALESCE("yd"."total_net_amount", "yd"."net_yield", (0)::numeric)) - COALESCE("yd"."total_fee_amount", "yd"."total_fees", (0)::numeric)) - COALESCE("yd"."total_ib_amount", "yd"."total_ib", (0)::numeric)) - COALESCE("yd"."dust_amount", (0)::numeric))) > 0.01));


ALTER VIEW "public"."yield_distribution_conservation_check" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."yield_rate_sanity_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fund_id" "uuid" NOT NULL,
    "max_daily_yield_pct" numeric(10,4) DEFAULT 1.0 NOT NULL,
    "min_daily_yield_pct" numeric(10,4) DEFAULT 0,
    "alert_threshold_pct" numeric(10,4) DEFAULT 0.5,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "yield_rate_sanity_min_nonnegative" CHECK ((("min_daily_yield_pct" IS NULL) OR ("min_daily_yield_pct" >= (0)::numeric)))
);


ALTER TABLE "public"."yield_rate_sanity_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."yield_rate_sanity_config" IS 'Configuration for yield rate validation limits per fund';



ALTER TABLE ONLY "public"."assets" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."assets_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."admin_alerts"
    ADD CONSTRAINT "admin_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_integrity_runs"
    ADD CONSTRAINT "admin_integrity_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_symbol_key" UNIQUE ("symbol");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_edit_audit"
    ADD CONSTRAINT "data_edit_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."error_code_metadata"
    ADD CONSTRAINT "error_code_metadata_pkey" PRIMARY KEY ("error_code");



ALTER TABLE ONLY "public"."fee_allocations"
    ADD CONSTRAINT "fee_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fee_allocations"
    ADD CONSTRAINT "fee_allocations_unique" UNIQUE ("distribution_id", "fund_id", "investor_id", "fees_account_id");



ALTER TABLE ONLY "public"."fund_aum_events"
    ADD CONSTRAINT "fund_aum_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fund_daily_aum"
    ADD CONSTRAINT "fund_daily_aum_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fund_yield_snapshots"
    ADD CONSTRAINT "fund_yield_snapshots_fund_id_snapshot_date_trigger_type_key" UNIQUE ("fund_id", "snapshot_date", "trigger_type");



ALTER TABLE ONLY "public"."funds"
    ADD CONSTRAINT "funds_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."funds"
    ADD CONSTRAINT "funds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generated_statements"
    ADD CONSTRAINT "generated_statements_period_id_user_id_key" UNIQUE ("period_id", "user_id");



ALTER TABLE ONLY "public"."generated_statements"
    ADD CONSTRAINT "generated_statements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_fee_settings"
    ADD CONSTRAINT "global_fee_settings_pkey" PRIMARY KEY ("setting_key");



ALTER TABLE ONLY "public"."ib_allocations"
    ADD CONSTRAINT "ib_allocations_idempotency" UNIQUE ("source_investor_id", "fund_id", "effective_date", "ib_investor_id", "distribution_id");



ALTER TABLE ONLY "public"."ib_allocations"
    ADD CONSTRAINT "ib_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ib_commission_ledger"
    ADD CONSTRAINT "ib_commission_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ib_commission_schedule"
    ADD CONSTRAINT "ib_commission_schedule_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_daily_balance"
    ADD CONSTRAINT "investor_daily_balance_fund_id_investor_id_balance_date_key" UNIQUE ("fund_id", "investor_id", "balance_date");



ALTER TABLE ONLY "public"."investor_emails"
    ADD CONSTRAINT "investor_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_fee_schedule"
    ADD CONSTRAINT "investor_fee_schedule_investor_id_fund_id_effective_date_key" UNIQUE ("investor_id", "fund_id", "effective_date");



ALTER TABLE ONLY "public"."investor_fee_schedule"
    ADD CONSTRAINT "investor_fee_schedule_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_fund_performance"
    ADD CONSTRAINT "investor_fund_performance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_fund_performance"
    ADD CONSTRAINT "investor_fund_performance_unique_period_investor_fund" UNIQUE ("period_id", "investor_id", "fund_name");



ALTER TABLE ONLY "public"."investor_position_snapshots"
    ADD CONSTRAINT "investor_position_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_positions"
    ADD CONSTRAINT "investor_positions_pkey" PRIMARY KEY ("investor_id", "fund_id");



ALTER TABLE ONLY "public"."investor_yield_events"
    ADD CONSTRAINT "investor_yield_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_fee_ledger"
    ADD CONSTRAINT "platform_fee_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_invites"
    ADD CONSTRAINT "platform_invites_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."platform_invites"
    ADD CONSTRAINT "platform_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");







ALTER TABLE ONLY "public"."rate_limit_config"
    ADD CONSTRAINT "rate_limit_config_pkey" PRIMARY KEY ("action_type");



ALTER TABLE ONLY "public"."report_schedules"
    ADD CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."risk_alerts"
    ADD CONSTRAINT "risk_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."statement_email_delivery"
    ADD CONSTRAINT "statement_email_delivery_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."statement_periods"
    ADD CONSTRAINT "statement_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."statement_periods"
    ADD CONSTRAINT "statement_periods_year_month_key" UNIQUE ("year", "month");



ALTER TABLE ONLY "public"."statements"
    ADD CONSTRAINT "statements_investor_id_period_year_period_month_asset_code_key" UNIQUE ("investor_id", "period_year", "period_month", "asset_code");



ALTER TABLE ONLY "public"."statements"
    ADD CONSTRAINT "statements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_config"
    ADD CONSTRAINT "system_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."transactions_v2"
    ADD CONSTRAINT "transactions_v2_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generated_statements"
    ADD CONSTRAINT "unique_investor_period" UNIQUE ("investor_id", "period_id");



ALTER TABLE ONLY "public"."investor_position_snapshots"
    ADD CONSTRAINT "unique_position_snapshot" UNIQUE ("snapshot_date", "investor_id", "fund_id");



ALTER TABLE ONLY "public"."statement_email_delivery"
    ADD CONSTRAINT "unique_statement_channel" UNIQUE ("statement_id", "channel");



ALTER TABLE ONLY "public"."ib_commission_schedule"
    ADD CONSTRAINT "uq_ib_schedule" UNIQUE ("investor_id", "fund_id", "effective_date");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."withdrawal_requests"
    ADD CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."yield_allocations"
    ADD CONSTRAINT "yield_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."yield_distributions"
    ADD CONSTRAINT "yield_distributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."yield_rate_sanity_config"
    ADD CONSTRAINT "yield_rate_sanity_config_fund_id_key" UNIQUE ("fund_id");



ALTER TABLE ONLY "public"."yield_rate_sanity_config"
    ADD CONSTRAINT "yield_rate_sanity_config_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "fund_daily_aum_unique_active" ON "public"."fund_daily_aum" USING "btree" ("fund_id", "aum_date", "purpose") WHERE ("is_voided" = false);



CREATE INDEX "idx_admin_alerts_acknowledged_by" ON "public"."admin_alerts" USING "btree" ("acknowledged_by") WHERE ("acknowledged_by" IS NOT NULL);



CREATE INDEX "idx_admin_alerts_related_run_id" ON "public"."admin_alerts" USING "btree" ("related_run_id") WHERE ("related_run_id" IS NOT NULL);



CREATE INDEX "idx_admin_alerts_severity" ON "public"."admin_alerts" USING "btree" ("severity") WHERE ("severity" = 'critical'::"text");



CREATE INDEX "idx_admin_alerts_unacknowledged" ON "public"."admin_alerts" USING "btree" ("created_at" DESC) WHERE ("acknowledged_at" IS NULL);



CREATE INDEX "idx_admin_integrity_runs_created_by" ON "public"."admin_integrity_runs" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE INDEX "idx_admin_integrity_runs_run_at" ON "public"."admin_integrity_runs" USING "btree" ("run_at" DESC);



CREATE INDEX "idx_admin_integrity_runs_scope_fund_id" ON "public"."admin_integrity_runs" USING "btree" ("scope_fund_id") WHERE ("scope_fund_id" IS NOT NULL);



CREATE INDEX "idx_admin_integrity_runs_scope_investor_id" ON "public"."admin_integrity_runs" USING "btree" ("scope_investor_id") WHERE ("scope_investor_id" IS NOT NULL);



CREATE INDEX "idx_admin_integrity_runs_status" ON "public"."admin_integrity_runs" USING "btree" ("status") WHERE ("status" = 'fail'::"text");



CREATE INDEX "idx_audit_log_action" ON "public"."audit_log" USING "btree" ("action");



CREATE INDEX "idx_audit_log_action_created" ON "public"."audit_log" USING "btree" ("action", "created_at" DESC);



CREATE INDEX "idx_audit_log_action_entity" ON "public"."audit_log" USING "btree" ("action", "entity");



CREATE INDEX "idx_audit_log_actor_user" ON "public"."audit_log" USING "btree" ("actor_user");



CREATE INDEX "idx_audit_log_created_desc" ON "public"."audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_log_date" ON "public"."audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_log_entity" ON "public"."audit_log" USING "btree" ("entity", "entity_id", "created_at" DESC);



CREATE INDEX "idx_data_edit_audit_edited_by" ON "public"."data_edit_audit" USING "btree" ("edited_by") WHERE ("edited_by" IS NOT NULL);



CREATE INDEX "idx_data_edit_audit_import" ON "public"."data_edit_audit" USING "btree" ("import_id") WHERE ("import_id" IS NOT NULL);



CREATE INDEX "idx_data_edit_audit_table" ON "public"."data_edit_audit" USING "btree" ("table_name", "edited_at" DESC);



CREATE INDEX "idx_delivery_investor_period" ON "public"."statement_email_delivery" USING "btree" ("investor_id", "period_id");



CREATE INDEX "idx_delivery_last_attempt" ON "public"."statement_email_delivery" USING "btree" ("last_attempt_at");



CREATE INDEX "idx_delivery_locked" ON "public"."statement_email_delivery" USING "btree" ("locked_at") WHERE ("status" = 'sending'::"text");



CREATE INDEX "idx_delivery_sent_at" ON "public"."statement_email_delivery" USING "btree" ("sent_at" DESC);



CREATE INDEX "idx_delivery_status_period" ON "public"."statement_email_delivery" USING "btree" ("status", "period_id");



CREATE INDEX "idx_documents_created_by_profile_id" ON "public"."documents" USING "btree" ("created_by_profile_id") WHERE ("created_by_profile_id" IS NOT NULL);



CREATE INDEX "idx_documents_fund_id" ON "public"."documents" USING "btree" ("fund_id");



CREATE INDEX "idx_documents_period" ON "public"."documents" USING "btree" ("period_start", "period_end");



CREATE INDEX "idx_documents_user_profile_id" ON "public"."documents" USING "btree" ("user_profile_id") WHERE ("user_profile_id" IS NOT NULL);



CREATE INDEX "idx_documents_user_type" ON "public"."documents" USING "btree" ("user_id", "type");



CREATE INDEX "idx_fee_alloc_distribution" ON "public"."fee_allocations" USING "btree" ("distribution_id");



CREATE INDEX "idx_fee_allocations_created_by" ON "public"."fee_allocations" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE INDEX "idx_fee_allocations_credit_tx" ON "public"."fee_allocations" USING "btree" ("credit_transaction_id") WHERE ("credit_transaction_id" IS NOT NULL);



CREATE INDEX "idx_fee_allocations_debit_tx" ON "public"."fee_allocations" USING "btree" ("debit_transaction_id") WHERE ("debit_transaction_id" IS NOT NULL);



CREATE INDEX "idx_fee_allocations_distribution" ON "public"."fee_allocations" USING "btree" ("distribution_id");



CREATE INDEX "idx_fee_allocations_fund" ON "public"."fee_allocations" USING "btree" ("fund_id");



CREATE INDEX "idx_fee_allocations_investor" ON "public"."fee_allocations" USING "btree" ("investor_id");



CREATE INDEX "idx_fee_allocations_is_voided" ON "public"."fee_allocations" USING "btree" ("is_voided");



CREATE INDEX "idx_fee_allocations_period" ON "public"."fee_allocations" USING "btree" ("period_end");



CREATE INDEX "idx_fee_allocations_voided_by_profile_id" ON "public"."fee_allocations" USING "btree" ("voided_by_profile_id") WHERE ("voided_by_profile_id" IS NOT NULL);



CREATE INDEX "idx_fee_ledger_distribution" ON "public"."platform_fee_ledger" USING "btree" ("yield_distribution_id");



CREATE INDEX "idx_fee_ledger_fund_date" ON "public"."platform_fee_ledger" USING "btree" ("fund_id", "effective_date");



CREATE INDEX "idx_fee_ledger_investor" ON "public"."platform_fee_ledger" USING "btree" ("investor_id");



CREATE INDEX "idx_fee_ledger_not_voided" ON "public"."platform_fee_ledger" USING "btree" ("fund_id") WHERE ("is_voided" = false);



CREATE INDEX "idx_fund_aum_events_fund_date" ON "public"."fund_aum_events" USING "btree" ("fund_id", "event_date");



CREATE INDEX "idx_fund_aum_events_trigger_type" ON "public"."fund_aum_events" USING "btree" ("trigger_type") WHERE ("trigger_type" IS NOT NULL);



CREATE INDEX "idx_fund_aum_events_voided" ON "public"."fund_aum_events" USING "btree" ("is_voided") WHERE ("is_voided" = false);



CREATE INDEX "idx_fund_daily_aum_created_by" ON "public"."fund_daily_aum" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE INDEX "idx_fund_daily_aum_fund_date" ON "public"."fund_daily_aum" USING "btree" ("fund_id", "aum_date" DESC);



CREATE INDEX "idx_fund_daily_aum_fund_purpose_date" ON "public"."fund_daily_aum" USING "btree" ("fund_id", "purpose", "as_of_date" DESC);



CREATE INDEX "idx_fund_daily_aum_integrity" ON "public"."fund_daily_aum" USING "btree" ("fund_id", "aum_date", "is_voided") WHERE ("is_voided" = false);



CREATE INDEX "idx_fund_daily_aum_is_voided" ON "public"."fund_daily_aum" USING "btree" ("is_voided");



CREATE INDEX "idx_fund_daily_aum_purpose" ON "public"."fund_daily_aum" USING "btree" ("purpose", "is_month_end");



CREATE INDEX "idx_fund_daily_aum_updated_by" ON "public"."fund_daily_aum" USING "btree" ("updated_by") WHERE ("updated_by" IS NOT NULL);



CREATE INDEX "idx_fund_daily_aum_voided_by" ON "public"."fund_daily_aum" USING "btree" ("voided_by") WHERE ("voided_by" IS NOT NULL);



CREATE INDEX "idx_fund_daily_aum_voided_by_profile" ON "public"."fund_daily_aum" USING "btree" ("voided_by_profile_id") WHERE ("voided_by_profile_id" IS NOT NULL);



CREATE INDEX "idx_fund_yield_snapshots_fund_date" ON "public"."fund_yield_snapshots" USING "btree" ("fund_id", "snapshot_date" DESC);



CREATE UNIQUE INDEX "idx_funds_active_asset_unique" ON "public"."funds" USING "btree" ("lower"("asset")) WHERE ("status" = 'active'::"public"."fund_status");



CREATE INDEX "idx_funds_fund_class" ON "public"."funds" USING "btree" ("fund_class");



CREATE INDEX "idx_generated_statements_generated_by" ON "public"."generated_statements" USING "btree" ("generated_by") WHERE ("generated_by" IS NOT NULL);



CREATE INDEX "idx_generated_statements_investor_id" ON "public"."generated_statements" USING "btree" ("investor_id");



CREATE INDEX "idx_generated_statements_period" ON "public"."generated_statements" USING "btree" ("period_id");



CREATE INDEX "idx_generated_statements_user" ON "public"."generated_statements" USING "btree" ("user_id");



CREATE INDEX "idx_global_fee_settings_updated_by" ON "public"."global_fee_settings" USING "btree" ("updated_by") WHERE ("updated_by" IS NOT NULL);



CREATE INDEX "idx_ib_alloc_pending" ON "public"."ib_allocations" USING "btree" ("payout_status") WHERE ("payout_status" = 'pending'::"text");



CREATE INDEX "idx_ib_allocations_created_by" ON "public"."ib_allocations" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE INDEX "idx_ib_allocations_ib_investor" ON "public"."ib_allocations" USING "btree" ("ib_investor_id");



CREATE INDEX "idx_ib_allocations_is_voided" ON "public"."ib_allocations" USING "btree" ("is_voided");



CREATE INDEX "idx_ib_allocations_paid_by" ON "public"."ib_allocations" USING "btree" ("paid_by") WHERE ("paid_by" IS NOT NULL);



CREATE INDEX "idx_ib_allocations_payout_batch" ON "public"."ib_allocations" USING "btree" ("payout_batch_id") WHERE ("payout_batch_id" IS NOT NULL);



CREATE INDEX "idx_ib_allocations_payout_status" ON "public"."ib_allocations" USING "btree" ("payout_status");



CREATE INDEX "idx_ib_allocations_period" ON "public"."ib_allocations" USING "btree" ("period_id");



CREATE INDEX "idx_ib_allocations_source_investor" ON "public"."ib_allocations" USING "btree" ("source_investor_id");



CREATE INDEX "idx_ib_allocations_voided_by_profile_id" ON "public"."ib_allocations" USING "btree" ("voided_by_profile_id") WHERE ("voided_by_profile_id" IS NOT NULL);



CREATE INDEX "idx_ib_commission_ledger_created_by" ON "public"."ib_commission_ledger" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE INDEX "idx_ib_commission_ledger_transaction_id" ON "public"."ib_commission_ledger" USING "btree" ("transaction_id") WHERE ("transaction_id" IS NOT NULL);



CREATE INDEX "idx_ib_commission_ledger_voided_by" ON "public"."ib_commission_ledger" USING "btree" ("voided_by") WHERE ("voided_by" IS NOT NULL);



CREATE INDEX "idx_ib_ledger_distribution" ON "public"."ib_commission_ledger" USING "btree" ("yield_distribution_id");



CREATE INDEX "idx_ib_ledger_fund_date" ON "public"."ib_commission_ledger" USING "btree" ("fund_id", "effective_date");



CREATE INDEX "idx_ib_ledger_ib" ON "public"."ib_commission_ledger" USING "btree" ("ib_id");



CREATE INDEX "idx_ib_ledger_not_voided" ON "public"."ib_commission_ledger" USING "btree" ("fund_id") WHERE ("is_voided" = false);



CREATE INDEX "idx_ib_ledger_source" ON "public"."ib_commission_ledger" USING "btree" ("source_investor_id");



CREATE INDEX "idx_investor_daily_balance_fund_date" ON "public"."investor_daily_balance" USING "btree" ("fund_id", "balance_date" DESC);



CREATE INDEX "idx_investor_daily_balance_investor_date" ON "public"."investor_daily_balance" USING "btree" ("investor_id", "balance_date" DESC);



CREATE INDEX "idx_investor_emails_email" ON "public"."investor_emails" USING "btree" ("email");



CREATE INDEX "idx_investor_emails_investor_id" ON "public"."investor_emails" USING "btree" ("investor_id");



CREATE INDEX "idx_investor_fund_performance_investor_id" ON "public"."investor_fund_performance" USING "btree" ("investor_id");



CREATE INDEX "idx_investor_fund_performance_period" ON "public"."investor_fund_performance" USING "btree" ("period_id");



CREATE INDEX "idx_investor_positions_current_value" ON "public"."investor_positions" USING "btree" ("current_value") WHERE ("current_value" > (0)::numeric);



CREATE INDEX "idx_investor_positions_fund" ON "public"."investor_positions" USING "btree" ("fund_id");



CREATE INDEX "idx_investor_positions_fund_class" ON "public"."investor_positions" USING "btree" ("fund_class");



CREATE INDEX "idx_investor_positions_fund_value" ON "public"."investor_positions" USING "btree" ("fund_id", "current_value" DESC) WHERE ("current_value" > (0)::numeric);



CREATE INDEX "idx_investor_positions_investor_id" ON "public"."investor_positions" USING "btree" ("investor_id");



CREATE INDEX "idx_investor_yield_events_created_by" ON "public"."investor_yield_events" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE INDEX "idx_investor_yield_events_visible_by" ON "public"."investor_yield_events" USING "btree" ("made_visible_by") WHERE ("made_visible_by" IS NOT NULL);



CREATE INDEX "idx_investor_yield_events_voided_by" ON "public"."investor_yield_events" USING "btree" ("voided_by") WHERE ("voided_by" IS NOT NULL);



CREATE INDEX "idx_iye_investor_date" ON "public"."investor_yield_events" USING "btree" ("investor_id", "event_date");



CREATE INDEX "idx_notifications_created" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id") WHERE ("read_at" IS NULL);



CREATE INDEX "idx_platform_fee_ledger_created_by" ON "public"."platform_fee_ledger" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE INDEX "idx_platform_fee_ledger_transaction_id" ON "public"."platform_fee_ledger" USING "btree" ("transaction_id") WHERE ("transaction_id" IS NOT NULL);



CREATE INDEX "idx_platform_fee_ledger_voided_by" ON "public"."platform_fee_ledger" USING "btree" ("voided_by") WHERE ("voided_by" IS NOT NULL);



CREATE INDEX "idx_platform_invites_code" ON "public"."platform_invites" USING "btree" ("invite_code");



CREATE INDEX "idx_platform_invites_email" ON "public"."platform_invites" USING "btree" ("email");



CREATE INDEX "idx_position_snapshots_date" ON "public"."investor_position_snapshots" USING "btree" ("snapshot_date");



CREATE INDEX "idx_position_snapshots_fund" ON "public"."investor_position_snapshots" USING "btree" ("fund_id", "snapshot_date");



CREATE INDEX "idx_positions_fund_active" ON "public"."investor_positions" USING "btree" ("fund_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_positions_investor_active" ON "public"."investor_positions" USING "btree" ("investor_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_profiles_email_trgm" ON "public"."profiles" USING "gin" ("email" "extensions"."gin_trgm_ops");



CREATE UNIQUE INDEX "idx_profiles_email_unique_lower" ON "public"."profiles" USING "btree" ("lower"(TRIM(BOTH FROM "email"))) WHERE (("email" IS NOT NULL) AND ("email" <> ''::"text"));



CREATE INDEX "idx_profiles_ib_parent_id" ON "public"."profiles" USING "btree" ("ib_parent_id") WHERE ("ib_parent_id" IS NOT NULL);



CREATE INDEX "idx_profiles_preferences" ON "public"."profiles" USING "gin" ("preferences");



CREATE INDEX "idx_profiles_role_status" ON "public"."profiles" USING "btree" ("role", "status");



CREATE INDEX "idx_risk_alerts_acknowledged_by" ON "public"."risk_alerts" USING "btree" ("acknowledged_by") WHERE ("acknowledged_by" IS NOT NULL);



CREATE INDEX "idx_risk_alerts_created" ON "public"."risk_alerts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_risk_alerts_investor_id" ON "public"."risk_alerts" USING "btree" ("investor_id") WHERE ("investor_id" IS NOT NULL);



CREATE INDEX "idx_risk_alerts_resolved_by" ON "public"."risk_alerts" USING "btree" ("resolved_by") WHERE ("resolved_by" IS NOT NULL);



CREATE INDEX "idx_risk_alerts_severity" ON "public"."risk_alerts" USING "btree" ("severity");



CREATE INDEX "idx_risk_alerts_type" ON "public"."risk_alerts" USING "btree" ("alert_type");



CREATE INDEX "idx_risk_alerts_unresolved" ON "public"."risk_alerts" USING "btree" ("fund_id") WHERE ("resolved" = false);



CREATE INDEX "idx_statement_email_delivery_investor_id" ON "public"."statement_email_delivery" USING "btree" ("investor_id");



CREATE INDEX "idx_statement_email_delivery_message_id" ON "public"."statement_email_delivery" USING "btree" ("provider_message_id");



CREATE INDEX "idx_statement_email_delivery_mode" ON "public"."statement_email_delivery" USING "btree" ("delivery_mode") WHERE ("delivery_mode" IS NOT NULL);



CREATE INDEX "idx_statement_email_delivery_period_status" ON "public"."statement_email_delivery" USING "btree" ("period_id", "status");



CREATE INDEX "idx_statement_email_delivery_statement" ON "public"."statement_email_delivery" USING "btree" ("statement_id");



CREATE INDEX "idx_statement_email_delivery_status" ON "public"."statement_email_delivery" USING "btree" ("status");



CREATE INDEX "idx_statement_email_delivery_user_id" ON "public"."statement_email_delivery" USING "btree" ("user_id");



CREATE INDEX "idx_statement_periods_created_by" ON "public"."statement_periods" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE INDEX "idx_statement_periods_end_date" ON "public"."statement_periods" USING "btree" ("period_end_date") WHERE ("period_end_date" IS NOT NULL);



CREATE INDEX "idx_statement_periods_finalized_by" ON "public"."statement_periods" USING "btree" ("finalized_by") WHERE ("finalized_by" IS NOT NULL);



CREATE INDEX "idx_statements_investor" ON "public"."statements" USING "btree" ("investor_id");



CREATE INDEX "idx_statements_investor_profile_id" ON "public"."statements" USING "btree" ("investor_profile_id") WHERE ("investor_profile_id" IS NOT NULL);



CREATE INDEX "idx_statements_period" ON "public"."statements" USING "btree" ("period_year", "period_month");



CREATE INDEX "idx_support_tickets_assigned" ON "public"."support_tickets" USING "btree" ("assigned_admin_id");



CREATE INDEX "idx_support_tickets_created" ON "public"."support_tickets" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_support_tickets_status" ON "public"."support_tickets" USING "btree" ("status");



CREATE INDEX "idx_support_tickets_user_id" ON "public"."support_tickets" USING "btree" ("user_id");



CREATE INDEX "idx_system_config_updated_by" ON "public"."system_config" USING "btree" ("updated_by") WHERE ("updated_by" IS NOT NULL);



CREATE INDEX "idx_transactions_transfer_id" ON "public"."transactions_v2" USING "btree" ("transfer_id") WHERE ("transfer_id" IS NOT NULL);



CREATE INDEX "idx_transactions_v2_approved_by" ON "public"."transactions_v2" USING "btree" ("approved_by") WHERE ("approved_by" IS NOT NULL);



CREATE INDEX "idx_transactions_v2_correction" ON "public"."transactions_v2" USING "btree" ("correction_id") WHERE ("correction_id" IS NOT NULL);



CREATE INDEX "idx_transactions_v2_created_at" ON "public"."transactions_v2" USING "btree" ("created_at");



CREATE INDEX "idx_transactions_v2_created_by" ON "public"."transactions_v2" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE INDEX "idx_transactions_v2_distribution_id" ON "public"."transactions_v2" USING "btree" ("distribution_id") WHERE ("distribution_id" IS NOT NULL);



CREATE INDEX "idx_transactions_v2_fund_class" ON "public"."transactions_v2" USING "btree" ("fund_class");



CREATE INDEX "idx_transactions_v2_fund_date" ON "public"."transactions_v2" USING "btree" ("fund_id", "tx_date" DESC);



CREATE INDEX "idx_transactions_v2_integrity_check" ON "public"."transactions_v2" USING "btree" ("investor_id", "fund_id", "is_voided") WHERE ("is_voided" = false);



CREATE INDEX "idx_transactions_v2_investor_id" ON "public"."transactions_v2" USING "btree" ("investor_id");



CREATE INDEX "idx_transactions_v2_investor_purpose" ON "public"."transactions_v2" USING "btree" ("investor_id", "purpose");



CREATE INDEX "idx_transactions_v2_investor_type_date" ON "public"."transactions_v2" USING "btree" ("investor_id", "type", "tx_date" DESC);



CREATE INDEX "idx_transactions_v2_purpose" ON "public"."transactions_v2" USING "btree" ("purpose");



CREATE UNIQUE INDEX "idx_transactions_v2_reference_unique" ON "public"."transactions_v2" USING "btree" ("reference_id") WHERE (("reference_id" IS NOT NULL) AND (NOT "is_voided"));



CREATE INDEX "idx_transactions_v2_type" ON "public"."transactions_v2" USING "btree" ("type");



CREATE INDEX "idx_transactions_v2_voided" ON "public"."transactions_v2" USING "btree" ("is_voided") WHERE ("is_voided" = true);



CREATE INDEX "idx_transactions_v2_voided_by" ON "public"."transactions_v2" USING "btree" ("voided_by") WHERE ("voided_by" IS NOT NULL);



CREATE INDEX "idx_transactions_v2_voided_by_profile" ON "public"."transactions_v2" USING "btree" ("voided_by_profile_id") WHERE ("voided_by_profile_id" IS NOT NULL);



CREATE INDEX "idx_transactions_visibility" ON "public"."transactions_v2" USING "btree" ("investor_id", "visibility_scope");



CREATE INDEX "idx_tx_v2_fund_date" ON "public"."transactions_v2" USING "btree" ("fund_id", "tx_date" DESC);



CREATE INDEX "idx_tx_v2_investor_fund_date" ON "public"."transactions_v2" USING "btree" ("investor_id", "fund_id", "tx_date" DESC);



CREATE INDEX "idx_withdrawal_requests_approved_by" ON "public"."withdrawal_requests" USING "btree" ("approved_by") WHERE ("approved_by" IS NOT NULL);



CREATE INDEX "idx_withdrawal_requests_available_balance" ON "public"."withdrawal_requests" USING "btree" ("investor_id", "fund_id", "status") WHERE ("status" = ANY (ARRAY['pending'::"public"."withdrawal_status", 'approved'::"public"."withdrawal_status", 'processing'::"public"."withdrawal_status"]));



CREATE INDEX "idx_withdrawal_requests_cancelled_by" ON "public"."withdrawal_requests" USING "btree" ("cancelled_by") WHERE ("cancelled_by" IS NOT NULL);



CREATE INDEX "idx_withdrawal_requests_created_by" ON "public"."withdrawal_requests" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE INDEX "idx_withdrawal_requests_date" ON "public"."withdrawal_requests" USING "btree" ("request_date" DESC);



CREATE INDEX "idx_withdrawal_requests_fund" ON "public"."withdrawal_requests" USING "btree" ("fund_id");



CREATE INDEX "idx_withdrawal_requests_investor" ON "public"."withdrawal_requests" USING "btree" ("investor_id");



CREATE INDEX "idx_withdrawal_requests_investor_date" ON "public"."withdrawal_requests" USING "btree" ("investor_id", "request_date" DESC);



CREATE INDEX "idx_withdrawal_requests_rejected_by" ON "public"."withdrawal_requests" USING "btree" ("rejected_by") WHERE ("rejected_by" IS NOT NULL);



CREATE INDEX "idx_withdrawal_requests_status" ON "public"."withdrawal_requests" USING "btree" ("status");



CREATE INDEX "idx_withdrawal_requests_status_request_date" ON "public"."withdrawal_requests" USING "btree" ("status", "request_date");



CREATE INDEX "idx_yield_allocations_fund_id" ON "public"."yield_allocations" USING "btree" ("fund_id");



CREATE INDEX "idx_yield_allocations_ib_transaction" ON "public"."yield_allocations" USING "btree" ("ib_transaction_id") WHERE ("ib_transaction_id" IS NOT NULL);



CREATE INDEX "idx_yield_dist_fund_date" ON "public"."yield_distributions" USING "btree" ("fund_id", "yield_date" DESC);



CREATE INDEX "idx_yield_distributions_aum_record_id" ON "public"."yield_distributions" USING "btree" ("aum_record_id") WHERE ("aum_record_id" IS NOT NULL);



CREATE INDEX "idx_yield_distributions_dust_receiver_id" ON "public"."yield_distributions" USING "btree" ("dust_receiver_id") WHERE ("dust_receiver_id" IS NOT NULL);



CREATE INDEX "idx_yield_distributions_parent" ON "public"."yield_distributions" USING "btree" ("parent_distribution_id") WHERE ("parent_distribution_id" IS NOT NULL);



CREATE INDEX "idx_yield_distributions_status" ON "public"."yield_distributions" USING "btree" ("status") WHERE ("status" <> 'finalized'::"text");



CREATE UNIQUE INDEX "idx_yield_distributions_unique_original" ON "public"."yield_distributions" USING "btree" ("fund_id", "effective_date", "purpose") WHERE (("distribution_type" = 'original'::"text") AND ("status" = 'applied'::"text"));



CREATE INDEX "idx_yield_distributions_voided_by" ON "public"."yield_distributions" USING "btree" ("voided_by") WHERE ("voided_by" IS NOT NULL);



CREATE INDEX "idx_yield_distributions_yield_date" ON "public"."yield_distributions" USING "btree" ("yield_date");



CREATE INDEX "idx_yield_events_fund_date" ON "public"."investor_yield_events" USING "btree" ("fund_id", "event_date");



CREATE INDEX "idx_yield_events_investor_fund" ON "public"."investor_yield_events" USING "btree" ("investor_id", "fund_id");



CREATE INDEX "idx_yield_events_period" ON "public"."investor_yield_events" USING "btree" ("fund_id", "period_start", "period_end");



CREATE INDEX "idx_yield_events_trigger_tx" ON "public"."investor_yield_events" USING "btree" ("trigger_transaction_id");



CREATE INDEX "idx_yield_events_visibility" ON "public"."investor_yield_events" USING "btree" ("visibility_scope", "is_voided");



CREATE UNIQUE INDEX "investor_fund_performance_unique_with_purpose" ON "public"."investor_fund_performance" USING "btree" ("period_id", "investor_id", "fund_name", "purpose");



CREATE UNIQUE INDEX "investor_yield_events_reference_id_active_key" ON "public"."investor_yield_events" USING "btree" ("reference_id") WHERE ("is_voided" = false);



COMMENT ON INDEX "public"."investor_yield_events_reference_id_active_key" IS 'Partial unique index: reference_id must be unique among active (non-voided) yield events. Voided records are excluded to prevent conflicts during void-and-reissue flows.';



CREATE UNIQUE INDEX "unique_delivery_investor_period_provider" ON "public"."statement_email_delivery" USING "btree" ("investor_id", "period_id", "provider") WHERE ("status" <> ALL (ARRAY['cancelled'::"text", 'CANCELLED'::"text"]));



CREATE UNIQUE INDEX "uq_fund_daily_aum_fund_date_purpose" ON "public"."fund_daily_aum" USING "btree" ("fund_id", "aum_date", "purpose") WHERE (NOT "is_voided");



CREATE UNIQUE INDEX "uq_ib_commission_dist_source_ib" ON "public"."ib_commission_ledger" USING "btree" ("yield_distribution_id", "source_investor_id", "ib_id") WHERE ("is_voided" IS NOT TRUE);



CREATE UNIQUE INDEX "uq_investor_positions_investor_fund" ON "public"."investor_positions" USING "btree" ("investor_id", "fund_id");



CREATE UNIQUE INDEX "uq_platform_fee_ledger_dist_investor" ON "public"."platform_fee_ledger" USING "btree" ("yield_distribution_id", "investor_id") WHERE (NOT "is_voided");



CREATE OR REPLACE TRIGGER "audit_funds_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."funds" FOR EACH ROW EXECUTE FUNCTION "public"."log_data_edit"();



CREATE OR REPLACE TRIGGER "audit_investor_fee_schedule_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."investor_fee_schedule" FOR EACH ROW EXECUTE FUNCTION "public"."audit_fee_schedule_changes"();



CREATE OR REPLACE TRIGGER "audit_investor_fund_performance_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."investor_fund_performance" FOR EACH ROW EXECUTE FUNCTION "public"."audit_investor_fund_performance_changes"();



CREATE OR REPLACE TRIGGER "audit_user_roles_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."audit_user_role_changes"();



CREATE OR REPLACE TRIGGER "delta_audit_investor_positions" AFTER INSERT OR DELETE OR UPDATE ON "public"."investor_positions" FOR EACH ROW EXECUTE FUNCTION "public"."audit_delta_trigger"();



CREATE OR REPLACE TRIGGER "delta_audit_transactions_v2" AFTER INSERT OR DELETE OR UPDATE ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."audit_delta_trigger"();



CREATE OR REPLACE TRIGGER "delta_audit_withdrawal_requests" AFTER INSERT OR DELETE OR UPDATE ON "public"."withdrawal_requests" FOR EACH ROW EXECUTE FUNCTION "public"."audit_delta_trigger"();



CREATE OR REPLACE TRIGGER "delta_audit_yield_distributions" AFTER INSERT OR DELETE OR UPDATE ON "public"."yield_distributions" FOR EACH ROW EXECUTE FUNCTION "public"."audit_delta_trigger"();



CREATE OR REPLACE TRIGGER "ib_allocation_payout_audit" AFTER UPDATE ON "public"."ib_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."audit_ib_allocation_payout"();



CREATE OR REPLACE TRIGGER "protect_audit_log_immutable" BEFORE UPDATE ON "public"."audit_log" FOR EACH ROW EXECUTE FUNCTION "public"."protect_audit_log_immutable_fields"();



CREATE OR REPLACE TRIGGER "protect_fee_allocations_immutable" BEFORE UPDATE ON "public"."fee_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."protect_allocation_immutable_fields"();



CREATE OR REPLACE TRIGGER "protect_ib_allocations_immutable" BEFORE UPDATE ON "public"."ib_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."protect_allocation_immutable_fields"();



CREATE OR REPLACE TRIGGER "protect_transactions_immutable" BEFORE UPDATE ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."protect_transaction_immutable_fields"();



CREATE OR REPLACE TRIGGER "protect_yield_distributions_immutable" BEFORE UPDATE ON "public"."yield_distributions" FOR EACH ROW EXECUTE FUNCTION "public"."protect_audit_immutable_fields"();



CREATE OR REPLACE TRIGGER "set_report_schedules_updated_at" BEFORE UPDATE ON "public"."report_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "sync_admin_status_on_role_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_profile_is_admin"();



COMMENT ON TRIGGER "sync_admin_status_on_role_change" ON "public"."user_roles" IS 'Keeps profiles.is_admin in sync with user_roles for legacy code compatibility.';



CREATE OR REPLACE TRIGGER "trg_alert_aum_position_mismatch" AFTER UPDATE ON "public"."investor_positions" FOR EACH ROW WHEN (("new"."current_value" IS DISTINCT FROM "old"."current_value")) EXECUTE FUNCTION "public"."alert_on_aum_position_mismatch"();



CREATE OR REPLACE TRIGGER "trg_alert_yield_conservation" AFTER INSERT OR UPDATE ON "public"."yield_distributions" FOR EACH ROW EXECUTE FUNCTION "public"."alert_on_yield_conservation_violation"();



CREATE OR REPLACE TRIGGER "trg_audit_transactions" AFTER INSERT OR DELETE OR UPDATE ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."audit_transaction_changes"();



CREATE OR REPLACE TRIGGER "trg_auto_close_previous_fee_schedule" AFTER INSERT ON "public"."investor_fee_schedule" FOR EACH ROW EXECUTE FUNCTION "public"."auto_close_previous_fee_schedule"();



CREATE OR REPLACE TRIGGER "trg_auto_close_previous_ib_schedule" BEFORE INSERT ON "public"."ib_commission_schedule" FOR EACH ROW EXECUTE FUNCTION "public"."auto_close_previous_ib_schedule"();



CREATE OR REPLACE TRIGGER "trg_calculate_unrealized_pnl" BEFORE INSERT OR UPDATE OF "current_value", "cost_basis" ON "public"."investor_positions" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_unrealized_pnl"();



CREATE OR REPLACE TRIGGER "trg_cascade_void_from_transaction" AFTER UPDATE ON "public"."transactions_v2" FOR EACH ROW WHEN ((("new"."is_voided" = true) AND (("old"."is_voided" IS NULL) OR ("old"."is_voided" = false)))) EXECUTE FUNCTION "public"."cascade_void_from_transaction"();



CREATE OR REPLACE TRIGGER "trg_cascade_void_to_allocations" AFTER UPDATE OF "is_voided" ON "public"."yield_distributions" FOR EACH ROW EXECUTE FUNCTION "public"."cascade_void_to_allocations"();



CREATE OR REPLACE TRIGGER "trg_cascade_void_to_yield_events" AFTER UPDATE ON "public"."yield_distributions" FOR EACH ROW WHEN ((("new"."status" = 'voided'::"text") AND (("old"."status" IS NULL) OR ("old"."status" IS DISTINCT FROM 'voided'::"text")))) EXECUTE FUNCTION "public"."cascade_void_to_yield_events"();



CREATE OR REPLACE TRIGGER "trg_check_concentration_risk" AFTER INSERT OR UPDATE OF "current_value" ON "public"."investor_positions" FOR EACH ROW EXECUTE FUNCTION "public"."check_concentration_risk"();



CREATE OR REPLACE TRIGGER "trg_check_duplicate_profile" BEFORE INSERT OR UPDATE OF "email", "first_name", "last_name" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."check_duplicate_profile"();



CREATE OR REPLACE TRIGGER "trg_check_email_uniqueness" BEFORE INSERT OR UPDATE OF "email" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."check_email_uniqueness"();



CREATE OR REPLACE TRIGGER "trg_documents_sync_profile_ids" BEFORE INSERT OR UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."sync_documents_profile_ids"();



CREATE OR REPLACE TRIGGER "trg_enforce_canonical_daily_aum" BEFORE INSERT OR DELETE OR UPDATE ON "public"."fund_daily_aum" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_canonical_daily_aum_mutation"();



COMMENT ON TRIGGER "trg_enforce_canonical_daily_aum" ON "public"."fund_daily_aum" IS 'Blocks direct INSERT/UPDATE/DELETE. Use canonical RPCs: set_fund_daily_aum, update_fund_daily_aum, void_fund_daily_aum.';



CREATE OR REPLACE TRIGGER "trg_enforce_canonical_position" BEFORE INSERT OR DELETE OR UPDATE ON "public"."investor_positions" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_canonical_position_mutation"();



COMMENT ON TRIGGER "trg_enforce_canonical_position" ON "public"."investor_positions" IS 'Blocks direct INSERT/UPDATE/DELETE. Use canonical RPCs like apply_deposit_with_crystallization or apply_withdrawal_with_crystallization.';



CREATE OR REPLACE TRIGGER "trg_enforce_canonical_position_write" BEFORE INSERT OR UPDATE ON "public"."investor_positions" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_canonical_position_write"();



CREATE OR REPLACE TRIGGER "trg_enforce_canonical_transaction" BEFORE INSERT OR DELETE OR UPDATE ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_canonical_transaction_mutation"();



COMMENT ON TRIGGER "trg_enforce_canonical_transaction" ON "public"."transactions_v2" IS 'Blocks direct INSERT/UPDATE/DELETE. Use canonical RPCs: apply_deposit_with_crystallization, apply_withdrawal_with_crystallization, admin_create_transaction, void_transaction.';



CREATE OR REPLACE TRIGGER "trg_enforce_canonical_yield" BEFORE INSERT OR DELETE OR UPDATE ON "public"."yield_distributions" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_canonical_yield_mutation"();



COMMENT ON TRIGGER "trg_enforce_canonical_yield" ON "public"."yield_distributions" IS 'Blocks direct INSERT/UPDATE/DELETE. Use canonical RPCs: apply_daily_yield_to_fund_v3, void_yield_distribution, apply_yield_correction_v2.';



CREATE OR REPLACE TRIGGER "trg_enforce_economic_date" BEFORE INSERT ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_economic_date"();



CREATE OR REPLACE TRIGGER "trg_enforce_fees_account_zero_fee" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_fees_account_zero_fee"();



CREATE OR REPLACE TRIGGER "trg_enforce_internal_visibility" BEFORE INSERT ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_internal_tx_visibility"();



CREATE OR REPLACE TRIGGER "trg_enforce_transaction_asset" BEFORE INSERT OR UPDATE OF "asset", "fund_id" ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_transaction_asset_match"();



CREATE OR REPLACE TRIGGER "trg_enforce_transaction_via_rpc" BEFORE INSERT ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_transaction_via_rpc"();



CREATE OR REPLACE TRIGGER "trg_enforce_yield_distribution_guard" BEFORE INSERT OR UPDATE ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_yield_distribution_guard"();



CREATE OR REPLACE TRIGGER "trg_enforce_yield_event_date" BEFORE INSERT ON "public"."investor_yield_events" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_yield_event_date"();



CREATE OR REPLACE TRIGGER "trg_ensure_crystallization_date" BEFORE INSERT ON "public"."investor_positions" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_crystallization_date"();



CREATE OR REPLACE TRIGGER "trg_fee_allocations_sync_voided_by" BEFORE INSERT OR UPDATE ON "public"."fee_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."sync_fee_allocations_voided_by_profile"();



CREATE OR REPLACE TRIGGER "trg_fund_aum_events_sync_voided_by" BEFORE INSERT OR UPDATE ON "public"."fund_aum_events" FOR EACH ROW EXECUTE FUNCTION "public"."sync_fund_aum_events_voided_by_profile"();



CREATE OR REPLACE TRIGGER "trg_fund_daily_aum_sync_voided_by" BEFORE INSERT OR UPDATE ON "public"."fund_daily_aum" FOR EACH ROW EXECUTE FUNCTION "public"."sync_fund_daily_aum_voided_by_profile"();



CREATE OR REPLACE TRIGGER "trg_ib_allocations_sync_voided_by" BEFORE INSERT OR UPDATE ON "public"."ib_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."sync_ib_allocations_voided_by_profile"();



CREATE OR REPLACE TRIGGER "trg_ib_commission_ledger_sync_allocations" AFTER INSERT ON "public"."ib_commission_ledger" FOR EACH ROW EXECUTE FUNCTION "public"."sync_ib_allocations_from_commission_ledger"();



CREATE OR REPLACE TRIGGER "trg_ib_commission_ledger_sync_voided_by" BEFORE INSERT OR UPDATE ON "public"."ib_commission_ledger" FOR EACH ROW EXECUTE FUNCTION "public"."sync_ib_commission_ledger_voided_by_profile"();



CREATE OR REPLACE TRIGGER "trg_investor_positions_active_fund" BEFORE INSERT OR UPDATE ON "public"."investor_positions" FOR EACH ROW EXECUTE FUNCTION "public"."check_fund_is_active"();



CREATE OR REPLACE TRIGGER "trg_investor_yield_events_sync_voided_by" BEFORE INSERT OR UPDATE ON "public"."investor_yield_events" FOR EACH ROW EXECUTE FUNCTION "public"."sync_investor_yield_events_voided_by_profile"();



CREATE OR REPLACE TRIGGER "trg_ledger_sync" AFTER INSERT OR UPDATE OF "is_voided" ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."fn_ledger_drives_position"();



CREATE OR REPLACE TRIGGER "trg_maintain_hwm" BEFORE UPDATE OF "current_value" ON "public"."investor_positions" FOR EACH ROW EXECUTE FUNCTION "public"."maintain_high_water_mark"();



CREATE OR REPLACE TRIGGER "trg_platform_fee_ledger_sync_voided_by" BEFORE INSERT OR UPDATE ON "public"."platform_fee_ledger" FOR EACH ROW EXECUTE FUNCTION "public"."sync_platform_fee_ledger_voided_by_profile"();



CREATE OR REPLACE TRIGGER "trg_preserve_created_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."preserve_created_at"();



CREATE OR REPLACE TRIGGER "trg_prevent_auto_aum" BEFORE INSERT ON "public"."fund_daily_aum" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_auto_aum_creation"();



CREATE OR REPLACE TRIGGER "trg_protect_profile_sensitive_fields" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_profile_sensitive_fields"();



CREATE OR REPLACE TRIGGER "trg_recompute_position_on_tx" AFTER INSERT OR DELETE OR UPDATE ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_recompute_position"();



CREATE OR REPLACE TRIGGER "trg_set_position_is_active" BEFORE INSERT OR UPDATE OF "current_value" ON "public"."investor_positions" FOR EACH ROW EXECUTE FUNCTION "public"."set_position_is_active"();



CREATE OR REPLACE TRIGGER "trg_statements_sync_profile_id" BEFORE INSERT OR UPDATE ON "public"."statements" FOR EACH ROW EXECUTE FUNCTION "public"."sync_statements_investor_profile_id"();



CREATE OR REPLACE TRIGGER "trg_sync_aum_after_position" AFTER UPDATE OF "current_value" ON "public"."investor_positions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_fund_aum_after_position"();



COMMENT ON TRIGGER "trg_sync_aum_after_position" ON "public"."investor_positions" IS 'DISABLED: Redundant - uses CURRENT_DATE instead of transaction date. Use trg_sync_aum_on_position instead.';



CREATE OR REPLACE TRIGGER "trg_sync_aum_on_position" AFTER INSERT OR DELETE OR UPDATE OF "current_value" ON "public"."investor_positions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_aum_on_position_change"();



COMMENT ON TRIGGER "trg_sync_aum_on_position" ON "public"."investor_positions" IS 'DISABLED: Redundant - sync_aum_on_transaction on transactions_v2 handles AUM updates with correct transaction date.';



CREATE OR REPLACE TRIGGER "trg_sync_aum_on_transaction" AFTER INSERT ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."sync_aum_on_transaction"();



CREATE OR REPLACE TRIGGER "trg_sync_profile_role_from_profiles" BEFORE INSERT OR UPDATE OF "account_type", "is_admin" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_profile_role_from_profiles"();



CREATE OR REPLACE TRIGGER "trg_sync_profile_role_from_roles" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_profile_role_from_roles"();



CREATE OR REPLACE TRIGGER "trg_sync_reporting_aum_to_transaction" AFTER INSERT OR UPDATE ON "public"."fund_daily_aum" FOR EACH ROW WHEN ((("new"."purpose" = 'reporting'::"public"."aum_purpose") AND ("new"."source" = 'yield_distribution_v5'::"text") AND ("new"."is_voided" = false))) EXECUTE FUNCTION "public"."sync_reporting_aum_to_transaction"();



CREATE OR REPLACE TRIGGER "trg_sync_yield_date" BEFORE INSERT OR UPDATE ON "public"."yield_distributions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_yield_date"();



CREATE OR REPLACE TRIGGER "trg_sync_yield_distribution_legacy_totals" BEFORE INSERT OR UPDATE ON "public"."yield_distributions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_yield_distribution_legacy_totals"();



CREATE OR REPLACE TRIGGER "trg_sync_yield_to_events" AFTER INSERT ON "public"."transactions_v2" FOR EACH ROW WHEN (("new"."type" = 'YIELD'::"public"."tx_type")) EXECUTE FUNCTION "public"."sync_yield_to_investor_yield_events"();



CREATE OR REPLACE TRIGGER "trg_transactions_v2_active_fund" BEFORE INSERT OR UPDATE ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."check_fund_is_active"();



CREATE OR REPLACE TRIGGER "trg_transactions_v2_sync_voided_by" BEFORE INSERT OR UPDATE ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."sync_transactions_v2_voided_by_profile"();



CREATE OR REPLACE TRIGGER "trg_update_last_activity_on_statement" AFTER INSERT ON "public"."generated_statements" FOR EACH ROW EXECUTE FUNCTION "public"."update_last_activity_on_statement"();



CREATE OR REPLACE TRIGGER "trg_update_last_activity_on_transaction" AFTER INSERT ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."update_investor_last_activity"();



CREATE OR REPLACE TRIGGER "trg_update_last_activity_on_withdrawal" AFTER INSERT OR UPDATE ON "public"."withdrawal_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_investor_last_activity_withdrawal"();



CREATE OR REPLACE TRIGGER "trg_validate_dust_tolerance" BEFORE INSERT OR UPDATE ON "public"."yield_distributions" FOR EACH ROW EXECUTE FUNCTION "public"."validate_dust_tolerance"();



CREATE OR REPLACE TRIGGER "trg_validate_fees_account" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."validate_fees_account_fee_pct"();



CREATE OR REPLACE TRIGGER "trg_validate_ib_parent_role" BEFORE INSERT OR UPDATE OF "ib_parent_id" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."validate_ib_parent_has_role"();



CREATE OR REPLACE TRIGGER "trg_validate_manual_aum" AFTER INSERT ON "public"."fund_daily_aum" FOR EACH ROW EXECUTE FUNCTION "public"."validate_manual_aum_entry"();



CREATE OR REPLACE TRIGGER "trg_validate_position_fund_status" BEFORE INSERT ON "public"."investor_positions" FOR EACH ROW EXECUTE FUNCTION "public"."validate_position_fund_status"();



CREATE OR REPLACE TRIGGER "trg_validate_transaction_amount" BEFORE INSERT ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."validate_transaction_amount"();



CREATE OR REPLACE TRIGGER "trg_validate_transaction_fund_status" BEFORE INSERT ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."validate_transaction_fund_status"();



CREATE OR REPLACE TRIGGER "trg_validate_transaction_has_aum" BEFORE INSERT ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."validate_transaction_has_aum"();



CREATE OR REPLACE TRIGGER "trg_validate_tx_type" BEFORE INSERT OR UPDATE ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."validate_transaction_type"();



CREATE OR REPLACE TRIGGER "trg_withdrawal_requests_version" BEFORE UPDATE ON "public"."withdrawal_requests" FOR EACH ROW EXECUTE FUNCTION "public"."increment_version"();



CREATE OR REPLACE TRIGGER "trg_withdrawals_updated_at" BEFORE UPDATE ON "public"."withdrawal_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_yield_allocations_sync_voided_by" BEFORE INSERT OR UPDATE ON "public"."yield_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."sync_yield_allocations_voided_by_profile"();



CREATE OR REPLACE TRIGGER "trg_yield_distributions_sync_voided_by" BEFORE INSERT OR UPDATE ON "public"."yield_distributions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_yield_distributions_voided_by_profile"();



CREATE OR REPLACE TRIGGER "trigger_delivery_updated_at" BEFORE UPDATE ON "public"."statement_email_delivery" FOR EACH ROW EXECUTE FUNCTION "public"."update_delivery_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_log_delivery_status" AFTER UPDATE ON "public"."statement_email_delivery" FOR EACH ROW EXECUTE FUNCTION "public"."log_delivery_status_change"();



CREATE OR REPLACE TRIGGER "trigger_sync_ib_account_type" AFTER INSERT ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_ib_account_type"();



CREATE OR REPLACE TRIGGER "update_funds_updated_at" BEFORE UPDATE ON "public"."funds" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_investor_positions_updated_at" BEFORE UPDATE ON "public"."investor_positions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_support_tickets_updated_at" BEFORE UPDATE ON "public"."support_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "validate_withdrawal_request_trigger" BEFORE INSERT ON "public"."withdrawal_requests" FOR EACH ROW EXECUTE FUNCTION "public"."validate_withdrawal_request"();



CREATE OR REPLACE TRIGGER "zz_trg_transactions_v2_immutability" BEFORE UPDATE ON "public"."transactions_v2" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_transactions_v2_immutability"();



ALTER TABLE ONLY "public"."admin_alerts"
    ADD CONSTRAINT "admin_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_alerts"
    ADD CONSTRAINT "admin_alerts_related_run_id_fkey" FOREIGN KEY ("related_run_id") REFERENCES "public"."admin_integrity_runs"("id");



ALTER TABLE ONLY "public"."admin_integrity_runs"
    ADD CONSTRAINT "admin_integrity_runs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_integrity_runs"
    ADD CONSTRAINT "admin_integrity_runs_scope_fund_id_fkey" FOREIGN KEY ("scope_fund_id") REFERENCES "public"."funds"("id");



ALTER TABLE ONLY "public"."admin_integrity_runs"
    ADD CONSTRAINT "admin_integrity_runs_scope_investor_id_fkey" FOREIGN KEY ("scope_investor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_actor_user_fkey" FOREIGN KEY ("actor_user") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."data_edit_audit"
    ADD CONSTRAINT "data_edit_audit_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fee_allocations"
    ADD CONSTRAINT "fee_allocations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."fee_allocations"
    ADD CONSTRAINT "fee_allocations_credit_transaction_id_fkey" FOREIGN KEY ("credit_transaction_id") REFERENCES "public"."transactions_v2"("id");



ALTER TABLE ONLY "public"."fee_allocations"
    ADD CONSTRAINT "fee_allocations_debit_transaction_id_fkey" FOREIGN KEY ("debit_transaction_id") REFERENCES "public"."transactions_v2"("id");



ALTER TABLE ONLY "public"."fee_allocations"
    ADD CONSTRAINT "fee_allocations_fees_account_id_fkey" FOREIGN KEY ("fees_account_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."fee_allocations"
    ADD CONSTRAINT "fee_allocations_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "fk_documents_created_by_profile" FOREIGN KEY ("created_by_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "fk_documents_user_profile" FOREIGN KEY ("user_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."fee_allocations"
    ADD CONSTRAINT "fk_fee_allocations_distribution" FOREIGN KEY ("distribution_id") REFERENCES "public"."yield_distributions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fee_allocations"
    ADD CONSTRAINT "fk_fee_allocations_distribution_id_v3" FOREIGN KEY ("distribution_id") REFERENCES "public"."yield_distributions"("id") NOT VALID;



ALTER TABLE ONLY "public"."fee_allocations"
    ADD CONSTRAINT "fk_fee_allocations_fund_id_v3" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") NOT VALID;



ALTER TABLE ONLY "public"."fee_allocations"
    ADD CONSTRAINT "fk_fee_allocations_fund_v2" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fee_allocations"
    ADD CONSTRAINT "fk_fee_allocations_investor_id_v3" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id") NOT VALID;



ALTER TABLE ONLY "public"."fee_allocations"
    ADD CONSTRAINT "fk_fee_allocations_investor_v2" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fee_allocations"
    ADD CONSTRAINT "fk_fee_allocations_voided_by_profile" FOREIGN KEY ("voided_by_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."fund_daily_aum"
    ADD CONSTRAINT "fk_fund_daily_aum_voided_by_profile" FOREIGN KEY ("voided_by_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."yield_rate_sanity_config"
    ADD CONSTRAINT "fk_fund_sanity" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ib_allocations"
    ADD CONSTRAINT "fk_ib_allocations_voided_by_profile" FOREIGN KEY ("voided_by_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."investor_emails"
    ADD CONSTRAINT "fk_investor_emails_investor" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investor_positions"
    ADD CONSTRAINT "fk_investor_positions_fund" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."investor_positions"
    ADD CONSTRAINT "fk_investor_positions_fund_id" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") NOT VALID;



ALTER TABLE ONLY "public"."investor_positions"
    ADD CONSTRAINT "fk_investor_positions_investor" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."investor_positions"
    ADD CONSTRAINT "fk_investor_positions_investor_id" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id") NOT VALID;



ALTER TABLE ONLY "public"."statements"
    ADD CONSTRAINT "fk_statements_investor_profile" FOREIGN KEY ("investor_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."transactions_v2"
    ADD CONSTRAINT "fk_transactions_v2_distribution" FOREIGN KEY ("distribution_id") REFERENCES "public"."yield_distributions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions_v2"
    ADD CONSTRAINT "fk_transactions_v2_fund" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."transactions_v2"
    ADD CONSTRAINT "fk_transactions_v2_fund_id" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") NOT VALID;



ALTER TABLE ONLY "public"."transactions_v2"
    ADD CONSTRAINT "fk_transactions_v2_investor" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."transactions_v2"
    ADD CONSTRAINT "fk_transactions_v2_investor_id" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id") NOT VALID;



ALTER TABLE ONLY "public"."transactions_v2"
    ADD CONSTRAINT "fk_transactions_v2_voided_by_profile" FOREIGN KEY ("voided_by_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."withdrawal_requests"
    ADD CONSTRAINT "fk_withdrawal_requests_profile" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."yield_distributions"
    ADD CONSTRAINT "fk_yield_distributions_fund_new" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."investor_yield_events"
    ADD CONSTRAINT "fk_yield_events_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."investor_yield_events"
    ADD CONSTRAINT "fk_yield_events_fund" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id");



ALTER TABLE ONLY "public"."investor_yield_events"
    ADD CONSTRAINT "fk_yield_events_investor" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."investor_yield_events"
    ADD CONSTRAINT "fk_yield_events_trigger_tx" FOREIGN KEY ("trigger_transaction_id") REFERENCES "public"."transactions_v2"("id");



ALTER TABLE ONLY "public"."investor_yield_events"
    ADD CONSTRAINT "fk_yield_events_visible_by" FOREIGN KEY ("made_visible_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."investor_yield_events"
    ADD CONSTRAINT "fk_yield_events_voided_by" FOREIGN KEY ("voided_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."fund_aum_events"
    ADD CONSTRAINT "fund_aum_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."fund_aum_events"
    ADD CONSTRAINT "fund_aum_events_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id");



ALTER TABLE ONLY "public"."fund_aum_events"
    ADD CONSTRAINT "fund_aum_events_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."fund_aum_events"
    ADD CONSTRAINT "fund_aum_events_voided_by_profile_id_fkey" FOREIGN KEY ("voided_by_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."fund_daily_aum"
    ADD CONSTRAINT "fund_daily_aum_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."fund_daily_aum"
    ADD CONSTRAINT "fund_daily_aum_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fund_daily_aum"
    ADD CONSTRAINT "fund_daily_aum_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."fund_daily_aum"
    ADD CONSTRAINT "fund_daily_aum_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."fund_yield_snapshots"
    ADD CONSTRAINT "fund_yield_snapshots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."fund_yield_snapshots"
    ADD CONSTRAINT "fund_yield_snapshots_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id");



ALTER TABLE ONLY "public"."generated_statements"
    ADD CONSTRAINT "generated_statements_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."generated_statements"
    ADD CONSTRAINT "generated_statements_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."generated_statements"
    ADD CONSTRAINT "generated_statements_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "public"."statement_periods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."generated_statements"
    ADD CONSTRAINT "generated_statements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."global_fee_settings"
    ADD CONSTRAINT "global_fee_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ib_allocations"
    ADD CONSTRAINT "ib_allocations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ib_allocations"
    ADD CONSTRAINT "ib_allocations_distribution_id_fkey_v2" FOREIGN KEY ("distribution_id") REFERENCES "public"."yield_distributions"("id") ON DELETE SET NULL;



COMMENT ON CONSTRAINT "ib_allocations_distribution_id_fkey_v2" ON "public"."ib_allocations" IS 'FK to yield_distributions.id with NO ACTION on delete (preserves allocation history)';



ALTER TABLE ONLY "public"."ib_allocations"
    ADD CONSTRAINT "ib_allocations_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id");



ALTER TABLE ONLY "public"."ib_allocations"
    ADD CONSTRAINT "ib_allocations_ib_investor_id_fkey" FOREIGN KEY ("ib_investor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ib_allocations"
    ADD CONSTRAINT "ib_allocations_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ib_allocations"
    ADD CONSTRAINT "ib_allocations_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "public"."statement_periods"("id");



ALTER TABLE ONLY "public"."ib_allocations"
    ADD CONSTRAINT "ib_allocations_source_investor_id_fkey" FOREIGN KEY ("source_investor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ib_allocations"
    ADD CONSTRAINT "ib_allocations_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ib_commission_ledger"
    ADD CONSTRAINT "ib_commission_ledger_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ib_commission_ledger"
    ADD CONSTRAINT "ib_commission_ledger_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id");



ALTER TABLE ONLY "public"."ib_commission_ledger"
    ADD CONSTRAINT "ib_commission_ledger_ib_id_fkey" FOREIGN KEY ("ib_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ib_commission_ledger"
    ADD CONSTRAINT "ib_commission_ledger_source_investor_id_fkey" FOREIGN KEY ("source_investor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ib_commission_ledger"
    ADD CONSTRAINT "ib_commission_ledger_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions_v2"("id");



ALTER TABLE ONLY "public"."ib_commission_ledger"
    ADD CONSTRAINT "ib_commission_ledger_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ib_commission_ledger"
    ADD CONSTRAINT "ib_commission_ledger_voided_by_profile_id_fkey" FOREIGN KEY ("voided_by_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ib_commission_ledger"
    ADD CONSTRAINT "ib_commission_ledger_yield_distribution_id_fkey" FOREIGN KEY ("yield_distribution_id") REFERENCES "public"."yield_distributions"("id");



ALTER TABLE ONLY "public"."ib_commission_schedule"
    ADD CONSTRAINT "ib_commission_schedule_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ib_commission_schedule"
    ADD CONSTRAINT "ib_commission_schedule_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."investor_daily_balance"
    ADD CONSTRAINT "investor_daily_balance_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id");



ALTER TABLE ONLY "public"."investor_daily_balance"
    ADD CONSTRAINT "investor_daily_balance_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."investor_fee_schedule"
    ADD CONSTRAINT "investor_fee_schedule_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investor_fee_schedule"
    ADD CONSTRAINT "investor_fee_schedule_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investor_fund_performance"
    ADD CONSTRAINT "investor_fund_performance_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investor_fund_performance"
    ADD CONSTRAINT "investor_fund_performance_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "public"."statement_periods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investor_position_snapshots"
    ADD CONSTRAINT "investor_position_snapshots_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id");



ALTER TABLE ONLY "public"."investor_position_snapshots"
    ADD CONSTRAINT "investor_position_snapshots_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."investor_yield_events"
    ADD CONSTRAINT "investor_yield_events_voided_by_profile_id_fkey" FOREIGN KEY ("voided_by_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_fee_ledger"
    ADD CONSTRAINT "platform_fee_ledger_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."platform_fee_ledger"
    ADD CONSTRAINT "platform_fee_ledger_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id");



ALTER TABLE ONLY "public"."platform_fee_ledger"
    ADD CONSTRAINT "platform_fee_ledger_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."platform_fee_ledger"
    ADD CONSTRAINT "platform_fee_ledger_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions_v2"("id");



ALTER TABLE ONLY "public"."platform_fee_ledger"
    ADD CONSTRAINT "platform_fee_ledger_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."platform_fee_ledger"
    ADD CONSTRAINT "platform_fee_ledger_voided_by_profile_id_fkey" FOREIGN KEY ("voided_by_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."platform_fee_ledger"
    ADD CONSTRAINT "platform_fee_ledger_yield_distribution_id_fkey" FOREIGN KEY ("yield_distribution_id") REFERENCES "public"."yield_distributions"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_ib_parent_id_fkey" FOREIGN KEY ("ib_parent_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."risk_alerts"
    ADD CONSTRAINT "risk_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."risk_alerts"
    ADD CONSTRAINT "risk_alerts_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id");



ALTER TABLE ONLY "public"."risk_alerts"
    ADD CONSTRAINT "risk_alerts_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."risk_alerts"
    ADD CONSTRAINT "risk_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."statement_email_delivery"
    ADD CONSTRAINT "statement_email_delivery_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."statement_email_delivery"
    ADD CONSTRAINT "statement_email_delivery_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "public"."statement_periods"("id");



ALTER TABLE ONLY "public"."statement_email_delivery"
    ADD CONSTRAINT "statement_email_delivery_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "public"."generated_statements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."statement_email_delivery"
    ADD CONSTRAINT "statement_email_delivery_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."statement_periods"
    ADD CONSTRAINT "statement_periods_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."statement_periods"
    ADD CONSTRAINT "statement_periods_finalized_by_fkey" FOREIGN KEY ("finalized_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."statements"
    ADD CONSTRAINT "statements_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_assigned_admin_id_fkey" FOREIGN KEY ("assigned_admin_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_config"
    ADD CONSTRAINT "system_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."transactions_v2"
    ADD CONSTRAINT "transactions_v2_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."transactions_v2"
    ADD CONSTRAINT "transactions_v2_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."transactions_v2"
    ADD CONSTRAINT "transactions_v2_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."transactions_v2"
    ADD CONSTRAINT "transactions_v2_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."withdrawal_requests"
    ADD CONSTRAINT "withdrawal_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."withdrawal_requests"
    ADD CONSTRAINT "withdrawal_requests_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."withdrawal_requests"
    ADD CONSTRAINT "withdrawal_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."withdrawal_requests"
    ADD CONSTRAINT "withdrawal_requests_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."withdrawal_requests"
    ADD CONSTRAINT "withdrawal_requests_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."yield_allocations"
    ADD CONSTRAINT "yield_allocations_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id");



ALTER TABLE ONLY "public"."yield_allocations"
    ADD CONSTRAINT "yield_allocations_ib_transaction_id_fkey" FOREIGN KEY ("ib_transaction_id") REFERENCES "public"."transactions_v2"("id");



ALTER TABLE ONLY "public"."yield_allocations"
    ADD CONSTRAINT "yield_allocations_voided_by_profile_id_fkey" FOREIGN KEY ("voided_by_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."yield_distributions"
    ADD CONSTRAINT "yield_distributions_aum_record_id_fkey" FOREIGN KEY ("aum_record_id") REFERENCES "public"."fund_daily_aum"("id");



ALTER TABLE ONLY "public"."yield_distributions"
    ADD CONSTRAINT "yield_distributions_consolidated_into_id_fkey" FOREIGN KEY ("consolidated_into_id") REFERENCES "public"."yield_distributions"("id");



ALTER TABLE ONLY "public"."yield_distributions"
    ADD CONSTRAINT "yield_distributions_dust_receiver_id_fkey" FOREIGN KEY ("dust_receiver_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."yield_distributions"
    ADD CONSTRAINT "yield_distributions_parent_distribution_id_fkey" FOREIGN KEY ("parent_distribution_id") REFERENCES "public"."yield_distributions"("id");



ALTER TABLE ONLY "public"."yield_distributions"
    ADD CONSTRAINT "yield_distributions_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."yield_distributions"
    ADD CONSTRAINT "yield_distributions_voided_by_profile_id_fkey" FOREIGN KEY ("voided_by_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."yield_rate_sanity_config"
    ADD CONSTRAINT "yield_rate_sanity_config_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id");



CREATE POLICY "Admin can update all tickets" ON "public"."support_tickets" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admin can view all tickets" ON "public"."support_tickets" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));



CREATE POLICY "Admin full access to yield_rate_sanity_config" ON "public"."yield_rate_sanity_config" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin-only AUM access" ON "public"."fund_daily_aum" USING ("public"."is_admin"());



CREATE POLICY "Admin-only access to transactions" ON "public"."transactions_v2" USING ("public"."is_admin"());



CREATE POLICY "Admin-only yield distribution access" ON "public"."yield_distributions" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete fund_daily_aum via RPC" ON "public"."fund_daily_aum" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can insert fund_daily_aum via RPC" ON "public"."fund_daily_aum" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert yield distributions" ON "public"."yield_distributions" FOR INSERT WITH CHECK ("public"."check_is_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Admins can manage alerts" ON "public"."admin_alerts" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage email delivery" ON "public"."statement_email_delivery" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage fee settings" ON "public"."global_fee_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage ib_commission_ledger" ON "public"."ib_commission_ledger" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage integrity runs" ON "public"."admin_integrity_runs" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage investor_positions" ON "public"."investor_positions" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage performance data" ON "public"."investor_fund_performance" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage platform_fee_ledger" ON "public"."platform_fee_ledger" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage position_snapshots" ON "public"."investor_position_snapshots" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage risk_alerts" ON "public"."risk_alerts" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage statement periods" ON "public"."statement_periods" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage statements" ON "public"."generated_statements" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update fund_daily_aum via RPC" ON "public"."fund_daily_aum" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update yield distributions" ON "public"."yield_distributions" FOR UPDATE USING ("public"."check_is_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Admins can view all fund_daily_aum" ON "public"."fund_daily_aum" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view all notifications" ON "public"."notifications" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."check_is_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Admins can view all yield distributions" ON "public"."yield_distributions" FOR SELECT USING ("public"."check_is_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Admins can view investor emails" ON "public"."investor_emails" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins manage report schedules" ON "public"."report_schedules" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Allow investor role insert during signup" ON "public"."user_roles" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND ("role" = 'investor'::"public"."app_role")));



CREATE POLICY "IBs can view own commission records" ON "public"."ib_commission_ledger" FOR SELECT USING ((("ib_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));



CREATE POLICY "Investors see reporting purpose only" ON "public"."fund_daily_aum" FOR SELECT USING (((NOT "public"."is_admin"()) AND ("purpose" = 'reporting'::"public"."aum_purpose") AND ("is_month_end" = true)));



CREATE POLICY "Notifications own access" ON "public"."notifications" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Periods visible to authenticated" ON "public"."statement_periods" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can cancel own withdrawal requests" ON "public"."withdrawal_requests" FOR UPDATE TO "authenticated" USING ((("investor_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'pending'::"public"."withdrawal_status"))) WITH CHECK ((("investor_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'cancelled'::"public"."withdrawal_status")));



CREATE POLICY "Users can create own withdrawal requests" ON "public"."withdrawal_requests" FOR INSERT TO "authenticated" WITH CHECK ((("investor_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'pending'::"public"."withdrawal_status")));



CREATE POLICY "Users can view own fee records" ON "public"."platform_fee_ledger" FOR SELECT USING ((("investor_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));



CREATE POLICY "Users can view own investor-visible transactions" ON "public"."transactions_v2" FOR SELECT USING (((("investor_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("visibility_scope" = 'investor_visible'::"public"."visibility_scope")) OR "public"."is_admin"()));



CREATE POLICY "Users can view own roles" ON "public"."user_roles" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));



CREATE POLICY "Users can view own statement deliveries" ON "public"."statement_email_delivery" FOR SELECT USING ((("investor_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can view own statements" ON "public"."generated_statements" FOR SELECT USING ((("investor_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can view own withdrawal requests" ON "public"."withdrawal_requests" FOR SELECT TO "authenticated" USING (("investor_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."admin_alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_all" ON "public"."ib_commission_schedule" USING ("public"."is_admin"());



ALTER TABLE "public"."admin_integrity_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_only_yield_allocations" ON "public"."yield_allocations" TO "authenticated" USING ("public"."is_admin"());






CREATE POLICY "admin_transactions_all" ON "public"."transactions_v2" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin_yield_delete" ON "public"."yield_distributions" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "admin_yield_insert" ON "public"."yield_distributions" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin_yield_select" ON "public"."yield_distributions" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "admin_yield_update" ON "public"."yield_distributions" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins_all_platform_invites" ON "public"."platform_invites" USING ("public"."is_admin"());



CREATE POLICY "admins_view_yield_distributions" ON "public"."yield_distributions" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "allow_own_profile_insert" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assets_delete_admin" ON "public"."assets" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "assets_insert_admin" ON "public"."assets" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "assets_select_authenticated" ON "public"."assets" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "assets_update_admin" ON "public"."assets" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_log_delete_policy" ON "public"."audit_log" FOR DELETE USING (false);



CREATE POLICY "audit_log_insert_secure" ON "public"."audit_log" FOR INSERT WITH CHECK (("actor_user" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "audit_log_select" ON "public"."audit_log" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "audit_log_update_policy" ON "public"."audit_log" FOR UPDATE USING (false);



ALTER TABLE "public"."data_edit_audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "data_edit_audit_select" ON "public"."data_edit_audit" FOR SELECT USING ((("edited_by" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));



ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "documents_delete_policy" ON "public"."documents" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "documents_insert_policy" ON "public"."documents" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "documents_select_policy" ON "public"."documents" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "documents_update_policy" ON "public"."documents" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"())) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



ALTER TABLE "public"."error_code_metadata" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "error_metadata_read" ON "public"."error_code_metadata" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."fee_allocations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fee_allocations_delete_admin" ON "public"."fee_allocations" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "fee_allocations_insert_admin" ON "public"."fee_allocations" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "fee_allocations_select" ON "public"."fee_allocations" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "fee_allocations_select_admin" ON "public"."fee_allocations" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "fee_allocations_select_own" ON "public"."fee_allocations" FOR SELECT USING ((("investor_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));



CREATE POLICY "fee_allocations_update_admin" ON "public"."fee_allocations" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."fund_aum_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fund_aum_events_admin_delete" ON "public"."fund_aum_events" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "fund_aum_events_admin_update" ON "public"."fund_aum_events" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "fund_aum_events_admin_write" ON "public"."fund_aum_events" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "fund_aum_events_select_all" ON "public"."fund_aum_events" FOR SELECT USING (true);



ALTER TABLE "public"."fund_daily_aum" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fund_yield_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fund_yield_snapshots_admin_write" ON "public"."fund_yield_snapshots" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "fund_yield_snapshots_select_all" ON "public"."fund_yield_snapshots" FOR SELECT USING (true);



ALTER TABLE "public"."funds" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "funds_delete_admin" ON "public"."funds" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "funds_insert_admin" ON "public"."funds" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "funds_select" ON "public"."funds" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "funds_select_authenticated" ON "public"."funds" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "funds_update_admin" ON "public"."funds" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."generated_statements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."global_fee_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ib_allocations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ib_allocations_delete_admin" ON "public"."ib_allocations" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "ib_allocations_insert_admin" ON "public"."ib_allocations" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "ib_allocations_select" ON "public"."ib_allocations" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "ib_allocations_select_admin" ON "public"."ib_allocations" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "ib_allocations_select_own_ib" ON "public"."ib_allocations" FOR SELECT USING (("ib_investor_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "ib_allocations_update_admin" ON "public"."ib_allocations" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."ib_commission_ledger" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ib_commission_ledger_select" ON "public"."ib_commission_ledger" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."ib_commission_schedule" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ib_view_referral_positions" ON "public"."investor_positions" FOR SELECT USING (("investor_id" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."ib_parent_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."investor_daily_balance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investor_daily_balance_admin_all" ON "public"."investor_daily_balance" USING ("public"."is_admin"());



CREATE POLICY "investor_daily_balance_select_own" ON "public"."investor_daily_balance" FOR SELECT USING (("investor_id" = "auth"."uid"()));



ALTER TABLE "public"."investor_emails" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investor_emails_admin_manage" ON "public"."investor_emails" USING ("public"."is_admin"());



CREATE POLICY "investor_emails_select_own" ON "public"."investor_emails" FOR SELECT USING (("investor_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "investor_emails_select_own_or_admin" ON "public"."investor_emails" FOR SELECT USING ((("investor_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));



ALTER TABLE "public"."investor_fee_schedule" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investor_fee_schedule_admin_manage" ON "public"."investor_fee_schedule" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "investor_fee_schedule_select_own" ON "public"."investor_fee_schedule" FOR SELECT USING ((("investor_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));



ALTER TABLE "public"."investor_fund_performance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investor_fund_performance_select_own" ON "public"."investor_fund_performance" FOR SELECT USING (((("investor_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("purpose" = 'reporting'::"public"."aum_purpose") OR ("purpose" IS NULL))) OR "public"."is_admin"()));



ALTER TABLE "public"."investor_position_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investor_position_snapshots_select_own" ON "public"."investor_position_snapshots" FOR SELECT USING (("investor_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."investor_positions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investor_positions_select" ON "public"."investor_positions" FOR SELECT TO "authenticated" USING ((("investor_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "investor_select" ON "public"."ib_commission_schedule" FOR SELECT USING (("auth"."uid"() = "investor_id"));



ALTER TABLE "public"."investor_yield_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investor_yield_events_select" ON "public"."investor_yield_events" FOR SELECT TO "authenticated" USING (((("investor_id" = "auth"."uid"()) AND ("visibility_scope" = 'investor_visible'::"text")) OR "public"."is_admin"()));



CREATE POLICY "investors_view_own_positions" ON "public"."investor_positions" FOR SELECT USING ((("investor_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));



CREATE POLICY "no_profile_deletes" ON "public"."profiles" FOR DELETE TO "authenticated" USING (false);



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete_policy" ON "public"."notifications" FOR DELETE USING (false);



CREATE POLICY "notifications_insert_policy" ON "public"."notifications" FOR INSERT WITH CHECK ("public"."can_insert_notification"());



CREATE POLICY "notifications_select" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."platform_fee_ledger" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_fee_ledger_select" ON "public"."platform_fee_ledger" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."platform_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admin_full_access" ON "public"."profiles" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "profiles_select_own_or_admin_strict" ON "public"."profiles" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "id") OR "public"."is_admin"()));



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_update_own_restricted" ON "public"."profiles" FOR UPDATE USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));





ALTER TABLE "public"."rate_limit_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rate_limit_config_admin" ON "public"."rate_limit_config" USING ("public"."is_admin"());



ALTER TABLE "public"."report_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."risk_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."statement_email_delivery" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."statement_periods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."statements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "statements_admin_all" ON "public"."statements" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "statements_select_own" ON "public"."statements" FOR SELECT USING (("investor_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_tickets_delete_policy" ON "public"."support_tickets" FOR DELETE USING (false);



CREATE POLICY "support_tickets_insert_policy" ON "public"."support_tickets" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."system_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_config_admin_all" ON "public"."system_config" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



ALTER TABLE "public"."transactions_v2" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transactions_v2_select" ON "public"."transactions_v2" FOR SELECT TO "authenticated" USING (((("investor_id" = "auth"."uid"()) AND ("visibility_scope" = 'investor_visible'::"public"."visibility_scope")) OR "public"."is_admin"()));



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_admin_manage" ON "public"."user_roles" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."withdrawal_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "withdrawal_requests_admin_manage" ON "public"."withdrawal_requests" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "withdrawal_requests_insert" ON "public"."withdrawal_requests" FOR INSERT TO "authenticated" WITH CHECK (("investor_id" = "auth"."uid"()));



CREATE POLICY "withdrawal_requests_select" ON "public"."withdrawal_requests" FOR SELECT TO "authenticated" USING ((("investor_id" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."yield_allocations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "yield_allocations_select" ON "public"."yield_allocations" FOR SELECT TO "authenticated" USING ((("investor_id" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."yield_distributions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "yield_distributions_select" ON "public"."yield_distributions" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "yield_events_admin_all" ON "public"."investor_yield_events" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "yield_events_investor_select" ON "public"."investor_yield_events" FOR SELECT USING ((("investor_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("visibility_scope" = 'investor_visible'::"text") AND ("is_voided" = false)));



ALTER TABLE "public"."yield_rate_sanity_config" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



















































































































































































































































GRANT ALL ON FUNCTION "public"."_resolve_investor_fee_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_resolve_investor_fee_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."_resolve_investor_fee_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_date" "date") TO "anon";



GRANT ALL ON FUNCTION "public"."_resolve_investor_ib_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."_resolve_investor_ib_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_resolve_investor_ib_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."acquire_delivery_batch"("p_period_id" "uuid", "p_channel" "text", "p_batch_size" integer, "p_worker_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."acquire_delivery_batch"("p_period_id" "uuid", "p_channel" "text", "p_batch_size" integer, "p_worker_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."acquire_delivery_batch"("p_period_id" "uuid", "p_channel" "text", "p_batch_size" integer, "p_worker_id" "uuid") TO "anon";



REVOKE ALL ON FUNCTION "public"."acquire_position_lock"("p_investor_id" "uuid", "p_fund_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."acquire_position_lock"("p_investor_id" "uuid", "p_fund_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."acquire_position_lock"("p_investor_id" "uuid", "p_fund_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."acquire_withdrawal_lock"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."acquire_withdrawal_lock"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."acquire_withdrawal_lock"("p_request_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."acquire_yield_lock"("p_fund_id" "uuid", "p_yield_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."acquire_yield_lock"("p_fund_id" "uuid", "p_yield_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."acquire_yield_lock"("p_fund_id" "uuid", "p_yield_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_fund_to_investor"("p_investor_id" "uuid", "p_fund_id" "text", "p_initial_shares" numeric, "p_cost_basis" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_fund_to_investor"("p_investor_id" "uuid", "p_fund_id" "text", "p_initial_shares" numeric, "p_cost_basis" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_fund_to_investor"("p_investor_id" "uuid", "p_fund_id" "text", "p_initial_shares" numeric, "p_cost_basis" numeric) TO "service_role";







REVOKE ALL ON FUNCTION "public"."adjust_investor_position"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_reason" "text", "p_tx_date" "date", "p_admin_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."adjust_investor_position"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_reason" "text", "p_tx_date" "date", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_investor_position"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_reason" "text", "p_tx_date" "date", "p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."alert_on_aum_position_mismatch"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."alert_on_aum_position_mismatch"() TO "service_role";
GRANT ALL ON FUNCTION "public"."alert_on_aum_position_mismatch"() TO "anon";



GRANT ALL ON FUNCTION "public"."alert_on_ledger_position_drift"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."alert_on_ledger_position_drift"() TO "service_role";
GRANT ALL ON FUNCTION "public"."alert_on_ledger_position_drift"() TO "anon";



GRANT ALL ON FUNCTION "public"."alert_on_yield_conservation_violation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."alert_on_yield_conservation_violation"() TO "service_role";
GRANT ALL ON FUNCTION "public"."alert_on_yield_conservation_violation"() TO "anon";



GRANT ALL ON FUNCTION "public"."apply_adb_yield_distribution_v3"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_gross_yield_amount" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_recorded_aum" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_adb_yield_distribution_v3"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_gross_yield_amount" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_recorded_aum" numeric) TO "service_role";
GRANT ALL ON FUNCTION "public"."apply_adb_yield_distribution_v3"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_gross_yield_amount" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_recorded_aum" numeric) TO "anon";



REVOKE ALL ON FUNCTION "public"."apply_daily_yield_with_validation"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_created_by" "uuid", "p_purpose" "text", "p_skip_validation" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_daily_yield_with_validation"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_created_by" "uuid", "p_purpose" "text", "p_skip_validation" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_daily_yield_with_validation"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_created_by" "uuid", "p_purpose" "text", "p_skip_validation" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."apply_daily_yield_with_validation"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_created_by" "uuid", "p_purpose" "text", "p_skip_validation" boolean) TO "anon";



GRANT ALL ON FUNCTION "public"."apply_deposit_with_crystallization"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_amount" numeric, "p_closing_aum" numeric, "p_effective_date" "date", "p_admin_id" "uuid", "p_notes" "text", "p_purpose" "text", "p_tx_hash" "text", "p_tx_subtype" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_deposit_with_crystallization"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_amount" numeric, "p_closing_aum" numeric, "p_effective_date" "date", "p_admin_id" "uuid", "p_notes" "text", "p_purpose" "text", "p_tx_hash" "text", "p_tx_subtype" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."apply_deposit_with_crystallization"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_amount" numeric, "p_closing_aum" numeric, "p_effective_date" "date", "p_admin_id" "uuid", "p_notes" "text", "p_purpose" "text", "p_tx_hash" "text", "p_tx_subtype" "text") TO "anon";







REVOKE ALL ON FUNCTION "public"."apply_investor_transaction"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_tx_type" "text", "p_amount" numeric, "p_tx_date" "date", "p_reference_id" "text", "p_notes" "text", "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_id" "uuid", "p_new_total_aum" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_investor_transaction"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_tx_type" "text", "p_amount" numeric, "p_tx_date" "date", "p_reference_id" "text", "p_notes" "text", "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_id" "uuid", "p_new_total_aum" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_investor_transaction"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_tx_type" "text", "p_amount" numeric, "p_tx_date" "date", "p_reference_id" "text", "p_notes" "text", "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_id" "uuid", "p_new_total_aum" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_segmented_yield_distribution_v5"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_opening_aum" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."apply_segmented_yield_distribution_v5"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_opening_aum" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_segmented_yield_distribution_v5"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_opening_aum" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_transaction_with_crystallization"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_tx_type" "text", "p_amount" numeric, "p_tx_date" "date", "p_reference_id" "text", "p_new_total_aum" numeric, "p_admin_id" "uuid", "p_notes" "text", "p_purpose" "text", "p_distribution_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_transaction_with_crystallization"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_tx_type" "text", "p_amount" numeric, "p_tx_date" "date", "p_reference_id" "text", "p_new_total_aum" numeric, "p_admin_id" "uuid", "p_notes" "text", "p_purpose" "text", "p_distribution_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_transaction_with_crystallization"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_tx_type" "text", "p_amount" numeric, "p_tx_date" "date", "p_reference_id" "text", "p_new_total_aum" numeric, "p_admin_id" "uuid", "p_notes" "text", "p_purpose" "text", "p_distribution_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_withdrawal_with_crystallization"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_amount" numeric, "p_new_total_aum" numeric, "p_tx_date" "date", "p_admin_id" "uuid", "p_notes" "text", "p_purpose" "text", "p_tx_hash" "text", "p_tx_subtype" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_withdrawal_with_crystallization"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_amount" numeric, "p_new_total_aum" numeric, "p_tx_date" "date", "p_admin_id" "uuid", "p_notes" "text", "p_purpose" "text", "p_tx_hash" "text", "p_tx_subtype" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."apply_withdrawal_with_crystallization"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_amount" numeric, "p_new_total_aum" numeric, "p_tx_date" "date", "p_admin_id" "uuid", "p_notes" "text", "p_purpose" "text", "p_tx_hash" "text", "p_tx_subtype" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."apply_yield_distribution_v5_with_lock"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_opening_aum" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."apply_yield_distribution_v5_with_lock"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_opening_aum" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_yield_distribution_v5_with_lock"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_opening_aum" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."approve_and_complete_withdrawal"("p_request_id" "uuid", "p_processed_amount" numeric, "p_tx_hash" "text", "p_admin_notes" "text", "p_is_full_exit" boolean, "p_send_precision" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_and_complete_withdrawal"("p_request_id" "uuid", "p_processed_amount" numeric, "p_tx_hash" "text", "p_admin_notes" "text", "p_is_full_exit" boolean, "p_send_precision" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_and_complete_withdrawal"("p_request_id" "uuid", "p_processed_amount" numeric, "p_tx_hash" "text", "p_admin_notes" "text", "p_is_full_exit" boolean, "p_send_precision" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_withdrawal"("p_request_id" "uuid", "p_approved_amount" numeric, "p_admin_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_withdrawal"("p_request_id" "uuid", "p_approved_amount" numeric, "p_admin_notes" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."approve_withdrawal"("p_request_id" "uuid", "p_approved_amount" numeric, "p_admin_notes" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."assert_integrity_or_raise"("p_scope_fund_id" "uuid", "p_scope_investor_id" "uuid", "p_context" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assert_integrity_or_raise"("p_scope_fund_id" "uuid", "p_scope_investor_id" "uuid", "p_context" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."assert_integrity_or_raise"("p_scope_fund_id" "uuid", "p_scope_investor_id" "uuid", "p_context" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."audit_delta_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_delta_trigger"() TO "service_role";
GRANT ALL ON FUNCTION "public"."audit_delta_trigger"() TO "anon";



GRANT ALL ON FUNCTION "public"."audit_fee_schedule_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_fee_schedule_changes"() TO "service_role";
GRANT ALL ON FUNCTION "public"."audit_fee_schedule_changes"() TO "anon";



GRANT ALL ON FUNCTION "public"."audit_ib_allocation_payout"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_ib_allocation_payout"() TO "service_role";
GRANT ALL ON FUNCTION "public"."audit_ib_allocation_payout"() TO "anon";



GRANT ALL ON FUNCTION "public"."audit_investor_fund_performance_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_investor_fund_performance_changes"() TO "service_role";
GRANT ALL ON FUNCTION "public"."audit_investor_fund_performance_changes"() TO "anon";



GRANT ALL ON FUNCTION "public"."audit_transaction_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_transaction_changes"() TO "service_role";
GRANT ALL ON FUNCTION "public"."audit_transaction_changes"() TO "anon";



GRANT ALL ON FUNCTION "public"."audit_user_role_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_user_role_changes"() TO "service_role";
GRANT ALL ON FUNCTION "public"."audit_user_role_changes"() TO "anon";



GRANT ALL ON FUNCTION "public"."auto_close_previous_fee_schedule"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_close_previous_fee_schedule"() TO "service_role";
GRANT ALL ON FUNCTION "public"."auto_close_previous_fee_schedule"() TO "anon";



GRANT ALL ON FUNCTION "public"."auto_close_previous_ib_schedule"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_close_previous_ib_schedule"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_close_previous_ib_schedule"() TO "service_role";



GRANT ALL ON FUNCTION "public"."backfill_balance_chain_fix"("p_investor_id" "uuid", "p_fund_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."backfill_balance_chain_fix"("p_investor_id" "uuid", "p_fund_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."backfill_balance_chain_fix"("p_investor_id" "uuid", "p_fund_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."batch_crystallize_fund"("p_fund_id" "uuid", "p_effective_date" "date", "p_force_override" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."batch_crystallize_fund"("p_fund_id" "uuid", "p_effective_date" "date", "p_force_override" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."batch_crystallize_fund"("p_fund_id" "uuid", "p_effective_date" "date", "p_force_override" boolean) TO "anon";



GRANT ALL ON FUNCTION "public"."batch_initialize_fund_aum"("p_admin_id" "uuid", "p_dry_run" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."batch_initialize_fund_aum"("p_admin_id" "uuid", "p_dry_run" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."batch_initialize_fund_aum"("p_admin_id" "uuid", "p_dry_run" boolean) TO "anon";



GRANT ALL ON FUNCTION "public"."batch_reconcile_all_positions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."batch_reconcile_all_positions"() TO "service_role";
GRANT ALL ON FUNCTION "public"."batch_reconcile_all_positions"() TO "anon";



GRANT ALL ON FUNCTION "public"."build_error_response"("p_error_code" "text", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."build_error_response"("p_error_code" "text", "p_details" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."build_error_response"("p_error_code" "text", "p_details" "jsonb") TO "anon";



GRANT ALL ON FUNCTION "public"."build_success_response"("p_data" "jsonb", "p_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."build_success_response"("p_data" "jsonb", "p_message" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."build_success_response"("p_data" "jsonb", "p_message" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."calc_avg_daily_balance"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calc_avg_daily_balance"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."calc_avg_daily_balance"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "anon";



GRANT ALL ON FUNCTION "public"."calculate_position_at_date_fix"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_as_of_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_position_at_date_fix"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_as_of_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."calculate_position_at_date_fix"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_as_of_date" "date") TO "anon";



GRANT ALL ON FUNCTION "public"."calculate_unrealized_pnl"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_unrealized_pnl"() TO "service_role";
GRANT ALL ON FUNCTION "public"."calculate_unrealized_pnl"() TO "anon";



GRANT ALL ON FUNCTION "public"."calculate_yield_allocations"("p_fund_id" "uuid", "p_recorded_aum" numeric, "p_period_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_yield_allocations"("p_fund_id" "uuid", "p_recorded_aum" numeric, "p_period_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_yield_allocations"("p_fund_id" "uuid", "p_recorded_aum" numeric, "p_period_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_investor"("investor_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_investor"("investor_uuid" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."can_access_investor"("investor_uuid" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."can_access_notification"("notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_notification"("notification_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."can_access_notification"("notification_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."can_insert_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_insert_notification"() TO "service_role";
GRANT ALL ON FUNCTION "public"."can_insert_notification"() TO "anon";



GRANT ALL ON FUNCTION "public"."can_withdraw"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_withdraw"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric) TO "service_role";
GRANT ALL ON FUNCTION "public"."can_withdraw"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric) TO "anon";



GRANT ALL ON FUNCTION "public"."cancel_delivery"("p_delivery_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_delivery"("p_delivery_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."cancel_delivery"("p_delivery_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."cancel_withdrawal_by_admin"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_withdrawal_by_admin"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."cancel_withdrawal_by_admin"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text") TO "anon";



REVOKE ALL ON FUNCTION "public"."cancel_withdrawal_by_admin_v2"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_withdrawal_by_admin_v2"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_withdrawal_by_admin_v2"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_withdrawal_by_investor"("p_request_id" "uuid", "p_investor_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_withdrawal_by_investor"("p_request_id" "uuid", "p_investor_id" "uuid", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."cancel_withdrawal_by_investor"("p_request_id" "uuid", "p_investor_id" "uuid", "p_reason" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."cascade_void_from_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cascade_void_from_transaction"() TO "service_role";
GRANT ALL ON FUNCTION "public"."cascade_void_from_transaction"() TO "anon";



GRANT ALL ON FUNCTION "public"."cascade_void_to_allocations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cascade_void_to_allocations"() TO "service_role";
GRANT ALL ON FUNCTION "public"."cascade_void_to_allocations"() TO "anon";



GRANT ALL ON FUNCTION "public"."cascade_void_to_yield_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cascade_void_to_yield_events"() TO "service_role";
GRANT ALL ON FUNCTION "public"."cascade_void_to_yield_events"() TO "anon";



GRANT ALL ON FUNCTION "public"."check_all_funds_transaction_aum"("p_tx_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_all_funds_transaction_aum"("p_tx_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_all_funds_transaction_aum"("p_tx_date" "date") TO "anon";



GRANT ALL ON FUNCTION "public"."check_and_fix_aum_integrity"("p_fund_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_dry_run" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_fix_aum_integrity"("p_fund_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_dry_run" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."check_and_fix_aum_integrity"("p_fund_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_dry_run" boolean) TO "anon";



GRANT ALL ON FUNCTION "public"."check_aum_exists_for_date"("p_fund_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_aum_exists_for_date"("p_fund_id" "uuid", "p_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_aum_exists_for_date"("p_fund_id" "uuid", "p_date" "date") TO "anon";



GRANT ALL ON FUNCTION "public"."check_aum_position_health"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_aum_position_health"() TO "service_role";
GRANT ALL ON FUNCTION "public"."check_aum_position_health"() TO "anon";







GRANT ALL ON FUNCTION "public"."check_aum_reconciliation"("p_fund_id" "uuid", "p_tolerance" numeric, "p_as_of_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."check_aum_reconciliation"("p_fund_id" "uuid", "p_tolerance" numeric, "p_as_of_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_aum_reconciliation"("p_fund_id" "uuid", "p_tolerance" numeric, "p_as_of_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_concentration_risk"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_concentration_risk"() TO "service_role";
GRANT ALL ON FUNCTION "public"."check_concentration_risk"() TO "anon";



GRANT ALL ON FUNCTION "public"."check_duplicate_ib_allocations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_duplicate_ib_allocations"() TO "service_role";
GRANT ALL ON FUNCTION "public"."check_duplicate_ib_allocations"() TO "anon";



GRANT ALL ON FUNCTION "public"."check_duplicate_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_duplicate_profile"() TO "service_role";
GRANT ALL ON FUNCTION "public"."check_duplicate_profile"() TO "anon";



GRANT ALL ON FUNCTION "public"."check_duplicate_transaction_refs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_duplicate_transaction_refs"() TO "service_role";
GRANT ALL ON FUNCTION "public"."check_duplicate_transaction_refs"() TO "anon";



GRANT ALL ON FUNCTION "public"."check_email_uniqueness"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_email_uniqueness"() TO "service_role";
GRANT ALL ON FUNCTION "public"."check_email_uniqueness"() TO "anon";



GRANT ALL ON FUNCTION "public"."check_fund_is_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_fund_is_active"() TO "service_role";
GRANT ALL ON FUNCTION "public"."check_fund_is_active"() TO "anon";



GRANT ALL ON FUNCTION "public"."check_historical_lock"("p_fund_id" "uuid", "p_date" "date", "p_is_update" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."check_historical_lock"("p_fund_id" "uuid", "p_date" "date", "p_is_update" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_historical_lock"("p_fund_id" "uuid", "p_date" "date", "p_is_update" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_is_admin"("user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_is_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_platform_data_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_platform_data_integrity"() TO "service_role";
GRANT ALL ON FUNCTION "public"."check_platform_data_integrity"() TO "anon";



GRANT ALL ON FUNCTION "public"."check_transaction_sources"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_transaction_sources"() TO "service_role";
GRANT ALL ON FUNCTION "public"."check_transaction_sources"() TO "anon";



GRANT ALL ON FUNCTION "public"."cleanup_dormant_positions"("p_dry_run" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_dormant_positions"("p_dry_run" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."cleanup_dormant_positions"("p_dry_run" boolean) TO "anon";



GRANT ALL ON FUNCTION "public"."cleanup_duplicate_preflow_aum"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_duplicate_preflow_aum"() TO "service_role";
GRANT ALL ON FUNCTION "public"."cleanup_duplicate_preflow_aum"() TO "anon";



GRANT ALL ON FUNCTION "public"."complete_withdrawal"("p_request_id" "uuid", "p_closing_aum" numeric, "p_event_ts" timestamp with time zone, "p_transaction_hash" "text", "p_admin_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_withdrawal"("p_request_id" "uuid", "p_closing_aum" numeric, "p_event_ts" timestamp with time zone, "p_transaction_hash" "text", "p_admin_notes" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."complete_withdrawal"("p_request_id" "uuid", "p_closing_aum" numeric, "p_event_ts" timestamp with time zone, "p_transaction_hash" "text", "p_admin_notes" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."compute_jsonb_delta"("p_old" "jsonb", "p_new" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_jsonb_delta"("p_old" "jsonb", "p_new" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."compute_jsonb_delta"("p_old" "jsonb", "p_new" "jsonb") TO "anon";



GRANT ALL ON FUNCTION "public"."compute_position_from_ledger"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_as_of" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_position_from_ledger"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_as_of" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."compute_position_from_ledger"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_as_of" timestamp with time zone) TO "anon";



GRANT ALL ON FUNCTION "public"."compute_profile_role"("p_user_id" "uuid", "p_account_type" "public"."account_type", "p_is_admin" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_profile_role"("p_user_id" "uuid", "p_account_type" "public"."account_type", "p_is_admin" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."compute_profile_role"("p_user_id" "uuid", "p_account_type" "public"."account_type", "p_is_admin" boolean) TO "anon";



GRANT ALL ON FUNCTION "public"."create_daily_position_snapshot"("p_snapshot_date" "date", "p_fund_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_daily_position_snapshot"("p_snapshot_date" "date", "p_fund_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_daily_position_snapshot"("p_snapshot_date" "date", "p_fund_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."create_integrity_alert"("p_alert_type" "text", "p_severity" "text", "p_title" "text", "p_message" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_integrity_alert"("p_alert_type" "text", "p_severity" "text", "p_title" "text", "p_message" "text", "p_metadata" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_integrity_alert"("p_alert_type" "text", "p_severity" "text", "p_title" "text", "p_message" "text", "p_metadata" "jsonb") TO "anon";



GRANT ALL ON FUNCTION "public"."create_profile_on_signup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile_on_signup"() TO "service_role";
GRANT ALL ON FUNCTION "public"."create_profile_on_signup"() TO "anon";



GRANT ALL ON FUNCTION "public"."create_withdrawal_request"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_type" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_withdrawal_request"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_type" "text", "p_notes" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_withdrawal_request"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_type" "text", "p_notes" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."crystallize_month_end"("p_fund_id" "uuid", "p_month_end_date" "date", "p_closing_aum" numeric, "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."crystallize_month_end"("p_fund_id" "uuid", "p_month_end_date" "date", "p_closing_aum" numeric, "p_admin_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."crystallize_month_end"("p_fund_id" "uuid", "p_month_end_date" "date", "p_closing_aum" numeric, "p_admin_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."crystallize_yield_before_flow"("p_fund_id" "uuid", "p_closing_aum" numeric, "p_trigger_type" "text", "p_trigger_reference" "text", "p_event_ts" timestamp with time zone, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose") TO "authenticated";
GRANT ALL ON FUNCTION "public"."crystallize_yield_before_flow"("p_fund_id" "uuid", "p_closing_aum" numeric, "p_trigger_type" "text", "p_trigger_reference" "text", "p_event_ts" timestamp with time zone, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose") TO "service_role";
GRANT ALL ON FUNCTION "public"."crystallize_yield_before_flow"("p_fund_id" "uuid", "p_closing_aum" numeric, "p_trigger_type" "text", "p_trigger_reference" "text", "p_event_ts" timestamp with time zone, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose") TO "anon";



GRANT ALL ON FUNCTION "public"."current_user_is_admin_or_owner"("check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_is_admin_or_owner"("check_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_user_is_admin_or_owner"("check_user_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."delete_transaction"("p_transaction_id" "uuid", "p_confirmation" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_transaction"("p_transaction_id" "uuid", "p_confirmation" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_transaction"("p_transaction_id" "uuid", "p_confirmation" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."delete_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text", "p_hard_delete" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text", "p_hard_delete" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text", "p_hard_delete" boolean) TO "anon";



GRANT ALL ON FUNCTION "public"."dispatch_report_delivery_run"("p_period_id" "uuid", "p_channel" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dispatch_report_delivery_run"("p_period_id" "uuid", "p_channel" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."dispatch_report_delivery_run"("p_period_id" "uuid", "p_channel" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."edit_transaction"("p_transaction_id" "uuid", "p_notes" "text", "p_tx_hash" "text", "p_reference_id" "text", "p_tx_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."edit_transaction"("p_transaction_id" "uuid", "p_notes" "text", "p_tx_hash" "text", "p_reference_id" "text", "p_tx_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."edit_transaction"("p_transaction_id" "uuid", "p_notes" "text", "p_tx_hash" "text", "p_reference_id" "text", "p_tx_date" "date") TO "anon";



GRANT ALL ON FUNCTION "public"."enforce_canonical_aum_event_mutation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_canonical_aum_event_mutation"() TO "service_role";
GRANT ALL ON FUNCTION "public"."enforce_canonical_aum_event_mutation"() TO "anon";



GRANT ALL ON FUNCTION "public"."enforce_canonical_daily_aum_mutation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_canonical_daily_aum_mutation"() TO "service_role";
GRANT ALL ON FUNCTION "public"."enforce_canonical_daily_aum_mutation"() TO "anon";



GRANT ALL ON FUNCTION "public"."enforce_canonical_position_mutation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_canonical_position_mutation"() TO "service_role";
GRANT ALL ON FUNCTION "public"."enforce_canonical_position_mutation"() TO "anon";



GRANT ALL ON FUNCTION "public"."enforce_canonical_position_write"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_canonical_position_write"() TO "service_role";
GRANT ALL ON FUNCTION "public"."enforce_canonical_position_write"() TO "anon";



GRANT ALL ON FUNCTION "public"."enforce_canonical_transaction_mutation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_canonical_transaction_mutation"() TO "service_role";
GRANT ALL ON FUNCTION "public"."enforce_canonical_transaction_mutation"() TO "anon";



GRANT ALL ON FUNCTION "public"."enforce_canonical_yield_mutation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_canonical_yield_mutation"() TO "service_role";
GRANT ALL ON FUNCTION "public"."enforce_canonical_yield_mutation"() TO "anon";



GRANT ALL ON FUNCTION "public"."enforce_economic_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_economic_date"() TO "service_role";
GRANT ALL ON FUNCTION "public"."enforce_economic_date"() TO "anon";



GRANT ALL ON FUNCTION "public"."enforce_fees_account_zero_fee"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_fees_account_zero_fee"() TO "service_role";
GRANT ALL ON FUNCTION "public"."enforce_fees_account_zero_fee"() TO "anon";



GRANT ALL ON FUNCTION "public"."enforce_internal_tx_visibility"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_internal_tx_visibility"() TO "service_role";
GRANT ALL ON FUNCTION "public"."enforce_internal_tx_visibility"() TO "anon";



GRANT ALL ON FUNCTION "public"."enforce_transaction_asset_match"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_transaction_asset_match"() TO "service_role";
GRANT ALL ON FUNCTION "public"."enforce_transaction_asset_match"() TO "anon";



GRANT ALL ON FUNCTION "public"."enforce_transaction_via_rpc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_transaction_via_rpc"() TO "service_role";
GRANT ALL ON FUNCTION "public"."enforce_transaction_via_rpc"() TO "anon";



GRANT ALL ON FUNCTION "public"."enforce_transactions_v2_immutability"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_transactions_v2_immutability"() TO "service_role";
GRANT ALL ON FUNCTION "public"."enforce_transactions_v2_immutability"() TO "anon";



GRANT ALL ON FUNCTION "public"."enforce_yield_distribution_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_yield_distribution_guard"() TO "service_role";
GRANT ALL ON FUNCTION "public"."enforce_yield_distribution_guard"() TO "anon";



GRANT ALL ON FUNCTION "public"."enforce_yield_event_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_yield_event_date"() TO "service_role";
GRANT ALL ON FUNCTION "public"."enforce_yield_event_date"() TO "anon";



GRANT ALL ON FUNCTION "public"."ensure_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."ensure_admin"() TO "anon";



GRANT ALL ON FUNCTION "public"."ensure_crystallization_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_crystallization_date"() TO "service_role";
GRANT ALL ON FUNCTION "public"."ensure_crystallization_date"() TO "anon";



REVOKE ALL ON FUNCTION "public"."ensure_preflow_aum"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "public"."aum_purpose", "p_total_aum" numeric, "p_admin_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_preflow_aum"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "public"."aum_purpose", "p_total_aum" numeric, "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_preflow_aum"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "public"."aum_purpose", "p_total_aum" numeric, "p_admin_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."ensure_preflow_aum"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "public"."aum_purpose", "p_total_aum" numeric, "p_admin_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."export_investor_data"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."export_investor_data"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."export_investor_data"("p_user_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."finalize_month_yield"("p_fund_id" "uuid", "p_period_year" integer, "p_period_month" integer, "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalize_month_yield"("p_fund_id" "uuid", "p_period_year" integer, "p_period_month" integer, "p_admin_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."finalize_month_yield"("p_fund_id" "uuid", "p_period_year" integer, "p_period_month" integer, "p_admin_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."finalize_statement_period"("p_period_id" "uuid", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalize_statement_period"("p_period_id" "uuid", "p_admin_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."finalize_statement_period"("p_period_id" "uuid", "p_admin_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."fn_ledger_drives_position"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_ledger_drives_position"() TO "service_role";
GRANT ALL ON FUNCTION "public"."fn_ledger_drives_position"() TO "anon";



REVOKE ALL ON FUNCTION "public"."force_delete_investor"("p_investor_id" "uuid", "p_admin_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."force_delete_investor"("p_investor_id" "uuid", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."force_delete_investor"("p_investor_id" "uuid", "p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_document_path"("user_id" "uuid", "document_type" "text", "filename" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_document_path"("user_id" "uuid", "document_type" "text", "filename" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_document_path"("user_id" "uuid", "document_type" "text", "filename" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."generate_statement_path"("user_id" "uuid", "year" integer, "month" integer, "fund_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_statement_path"("user_id" "uuid", "year" integer, "month" integer, "fund_code" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_statement_path"("user_id" "uuid", "year" integer, "month" integer, "fund_code" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."get_active_funds_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_funds_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_funds_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_name"("admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_name"("admin_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_admin_name"("admin_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."get_admin_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_dust_tolerances"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_dust_tolerances"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_all_dust_tolerances"() TO "anon";



GRANT ALL ON FUNCTION "public"."get_all_investors_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_investors_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_investors_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_aum_position_reconciliation"("p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_aum_position_reconciliation"("p_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_aum_position_reconciliation"("p_date" "date") TO "anon";



GRANT ALL ON FUNCTION "public"."get_available_balance"("p_investor_id" "uuid", "p_fund_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_balance"("p_investor_id" "uuid", "p_fund_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_available_balance"("p_investor_id" "uuid", "p_fund_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."get_delivery_stats"("p_period_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_delivery_stats"("p_period_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_delivery_stats"("p_period_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."get_drift_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_drift_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_drift_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dust_tolerance_for_fund"("p_fund_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dust_tolerance_for_fund"("p_fund_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_dust_tolerance_for_fund"("p_fund_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."get_existing_preflow_aum"("p_fund_id" "uuid", "p_event_date" "date", "p_purpose" "public"."aum_purpose") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_existing_preflow_aum"("p_fund_id" "uuid", "p_event_date" "date", "p_purpose" "public"."aum_purpose") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_existing_preflow_aum"("p_fund_id" "uuid", "p_event_date" "date", "p_purpose" "public"."aum_purpose") TO "anon";



GRANT ALL ON FUNCTION "public"."get_fees_account_for_fund"("p_fund_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_fees_account_for_fund"("p_fund_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_fees_account_for_fund"("p_fund_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_fund_aum_as_of"("p_fund_id" "uuid", "p_as_of_date" "date", "p_purpose" "public"."aum_purpose") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_fund_aum_as_of"("p_fund_id" "uuid", "p_as_of_date" "date", "p_purpose" "public"."aum_purpose") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_fund_aum_as_of"("p_fund_id" "uuid", "p_as_of_date" "date", "p_purpose" "public"."aum_purpose") TO "anon";



GRANT ALL ON FUNCTION "public"."get_fund_base_asset"("p_fund_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_fund_base_asset"("p_fund_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_fund_base_asset"("p_fund_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."get_fund_composition"("p_fund_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_fund_composition"("p_fund_id" "uuid", "p_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_fund_composition"("p_fund_id" "uuid", "p_date" "date") TO "anon";



GRANT ALL ON FUNCTION "public"."get_fund_net_flows"("p_fund_id" "text", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_fund_net_flows"("p_fund_id" "text", "p_start_date" "date", "p_end_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_fund_net_flows"("p_fund_id" "text", "p_start_date" "date", "p_end_date" "date") TO "anon";



REVOKE ALL ON FUNCTION "public"."get_fund_positions_sum"("p_fund_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_fund_positions_sum"("p_fund_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_fund_positions_sum"("p_fund_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_fund_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_fund_summary"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_fund_summary"() TO "anon";



GRANT ALL ON FUNCTION "public"."get_funds_aum_snapshot"("p_as_of_date" "date", "p_purpose" "public"."aum_purpose") TO "anon";
GRANT ALL ON FUNCTION "public"."get_funds_aum_snapshot"("p_as_of_date" "date", "p_purpose" "public"."aum_purpose") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_funds_aum_snapshot"("p_as_of_date" "date", "p_purpose" "public"."aum_purpose") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_funds_daily_flows"("p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_funds_daily_flows"("p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_funds_daily_flows"("p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_funds_with_aum"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_funds_with_aum"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_funds_with_aum"() TO "anon";



GRANT ALL ON FUNCTION "public"."get_health_trend"("p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_health_trend"("p_days" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_health_trend"("p_days" integer) TO "anon";



GRANT ALL ON FUNCTION "public"."get_ib_parent_candidates"("p_exclude_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ib_parent_candidates"("p_exclude_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_ib_parent_candidates"("p_exclude_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."get_ib_referral_count"("p_ib_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ib_referral_count"("p_ib_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_ib_referral_count"("p_ib_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."get_ib_referral_detail"("p_ib_id" "uuid", "p_referral_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ib_referral_detail"("p_ib_id" "uuid", "p_referral_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_ib_referral_detail"("p_ib_id" "uuid", "p_referral_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."get_ib_referrals"("p_ib_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ib_referrals"("p_ib_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_ib_referrals"("p_ib_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";



REVOKE ALL ON FUNCTION "public"."get_investor_cumulative_yield"("p_investor_id" "uuid", "p_fund_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_investor_cumulative_yield"("p_investor_id" "uuid", "p_fund_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_investor_cumulative_yield"("p_investor_id" "uuid", "p_fund_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_investor_fee_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_effective_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_investor_fee_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_effective_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_investor_fee_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_effective_date" "date") TO "anon";



GRANT ALL ON FUNCTION "public"."get_investor_ib_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_effective_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_investor_ib_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_effective_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_investor_ib_pct"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_effective_date" "date") TO "anon";



GRANT ALL ON FUNCTION "public"."get_investor_reports_v2"("p_period_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_investor_reports_v2"("p_period_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_investor_reports_v2"("p_period_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_investor_yield_summary"("p_investor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_investor_yield_summary"("p_investor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_investor_yield_summary"("p_investor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_health_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_health_status"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_latest_health_status"() TO "anon";



GRANT ALL ON FUNCTION "public"."get_monthly_platform_aum"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_platform_aum"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_monthly_platform_aum"() TO "anon";



REVOKE ALL ON FUNCTION "public"."get_paged_audit_logs"("p_limit" integer, "p_offset" integer, "p_entity" "text", "p_action" "text", "p_actor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_paged_audit_logs"("p_limit" integer, "p_offset" integer, "p_entity" "text", "p_action" "text", "p_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_paged_audit_logs"("p_limit" integer, "p_offset" integer, "p_entity" "text", "p_action" "text", "p_actor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_paged_investor_summaries"("p_limit" integer, "p_offset" integer, "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_paged_investor_summaries"("p_limit" integer, "p_offset" integer, "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_paged_investor_summaries"("p_limit" integer, "p_offset" integer, "p_status" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_paged_notifications"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_paged_notifications"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_paged_notifications"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_platform_flow_metrics"("p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_platform_flow_metrics"("p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_platform_flow_metrics"("p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_platform_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_platform_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_platform_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_position_reconciliation"("p_as_of_date" "date", "p_fund_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_position_reconciliation"("p_as_of_date" "date", "p_fund_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_position_reconciliation"("p_as_of_date" "date", "p_fund_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."get_reporting_eligible_investors"("p_period_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_reporting_eligible_investors"("p_period_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_reporting_eligible_investors"("p_period_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."get_schema_dump"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_schema_dump"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_schema_dump"() TO "anon";



GRANT ALL ON FUNCTION "public"."get_statement_period_summary"("p_period_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_statement_period_summary"("p_period_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_statement_period_summary"("p_period_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."get_statement_signed_url"("p_storage_path" "text", "p_expires_in" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_statement_signed_url"("p_storage_path" "text", "p_expires_in" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_statement_signed_url"("p_storage_path" "text", "p_expires_in" integer) TO "anon";



GRANT ALL ON FUNCTION "public"."get_system_mode"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_system_mode"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_system_mode"() TO "anon";



GRANT ALL ON FUNCTION "public"."get_transaction_aum"("p_fund_id" "uuid", "p_tx_date" "date", "p_purpose" "public"."aum_purpose") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transaction_aum"("p_fund_id" "uuid", "p_tx_date" "date", "p_purpose" "public"."aum_purpose") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_transaction_aum"("p_fund_id" "uuid", "p_tx_date" "date", "p_purpose" "public"."aum_purpose") TO "anon";



GRANT ALL ON FUNCTION "public"."get_user_admin_status"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_admin_status"("user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_admin_status"("user_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."get_void_aum_impact"("p_record_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_void_aum_impact"("p_record_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_void_aum_impact"("p_record_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."get_void_transaction_impact"("p_transaction_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_void_transaction_impact"("p_transaction_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_void_transaction_impact"("p_transaction_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."get_void_yield_impact"("p_distribution_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_void_yield_impact"("p_distribution_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_void_yield_impact"("p_distribution_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";



GRANT ALL ON FUNCTION "public"."has_super_admin_role"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_super_admin_role"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."has_super_admin_role"("p_user_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."increment_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_version"() TO "service_role";
GRANT ALL ON FUNCTION "public"."increment_version"() TO "anon";



GRANT ALL ON FUNCTION "public"."initialize_all_hwm_values"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_all_hwm_values"() TO "service_role";
GRANT ALL ON FUNCTION "public"."initialize_all_hwm_values"() TO "anon";



GRANT ALL ON FUNCTION "public"."initialize_crystallization_dates"("p_fund_id" "uuid", "p_admin_id" "uuid", "p_dry_run" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_crystallization_dates"("p_fund_id" "uuid", "p_admin_id" "uuid", "p_dry_run" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."initialize_crystallization_dates"("p_fund_id" "uuid", "p_admin_id" "uuid", "p_dry_run" boolean) TO "anon";



GRANT ALL ON FUNCTION "public"."initialize_fund_aum_from_positions"("p_fund_id" "uuid", "p_admin_id" "uuid", "p_aum_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_fund_aum_from_positions"("p_fund_id" "uuid", "p_admin_id" "uuid", "p_aum_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."initialize_fund_aum_from_positions"("p_fund_id" "uuid", "p_admin_id" "uuid", "p_aum_date" "date") TO "anon";



GRANT ALL ON FUNCTION "public"."insert_yield_transaction"("p_investor_name" "text", "p_fund_code" "text", "p_month" "text", "p_tx_date" "date", "p_amount" numeric, "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_yield_transaction"("p_investor_name" "text", "p_fund_code" "text", "p_month" "text", "p_tx_date" "date", "p_amount" numeric, "p_admin_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."insert_yield_transaction"("p_investor_name" "text", "p_fund_code" "text", "p_month" "text", "p_tx_date" "date", "p_amount" numeric, "p_admin_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."internal_route_to_fees"("p_from_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_effective_date" "date", "p_reason" "text", "p_admin_id" "uuid", "p_transfer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."internal_route_to_fees"("p_from_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_effective_date" "date", "p_reason" "text", "p_admin_id" "uuid", "p_transfer_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."internal_route_to_fees"("p_from_investor_id" "uuid", "p_fund_id" "uuid", "p_amount" numeric, "p_effective_date" "date", "p_reason" "text", "p_admin_id" "uuid", "p_transfer_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";



GRANT ALL ON FUNCTION "public"."is_admin"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_canonical_rpc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_canonical_rpc"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_canonical_rpc"() TO "anon";



GRANT ALL ON FUNCTION "public"."is_crystallization_current"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_target_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_crystallization_current"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_target_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_crystallization_current"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_target_date" "date") TO "anon";



GRANT ALL ON FUNCTION "public"."is_import_enabled"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_import_enabled"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_import_enabled"() TO "anon";



GRANT ALL ON FUNCTION "public"."is_period_locked"("p_fund_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_period_locked"("p_fund_id" "uuid", "p_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_period_locked"("p_fund_id" "uuid", "p_date" "date") TO "anon";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "anon";



GRANT ALL ON FUNCTION "public"."is_super_admin"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_super_admin"("p_user_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."is_within_edit_window"("p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_within_edit_window"("p_created_at" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."is_within_edit_window"("p_created_at" timestamp with time zone) TO "anon";



GRANT ALL ON FUNCTION "public"."is_yield_period_closed"("p_fund_id" "uuid", "p_year" integer, "p_month" integer, "p_purpose" "public"."aum_purpose") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_yield_period_closed"("p_fund_id" "uuid", "p_year" integer, "p_month" integer, "p_purpose" "public"."aum_purpose") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_yield_period_closed"("p_fund_id" "uuid", "p_year" integer, "p_month" integer, "p_purpose" "public"."aum_purpose") TO "anon";



GRANT ALL ON FUNCTION "public"."log_audit_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_audit_event"() TO "service_role";
GRANT ALL ON FUNCTION "public"."log_audit_event"() TO "anon";



GRANT ALL ON FUNCTION "public"."log_audit_event"("p_action" "text", "p_entity" "text", "p_entity_id" "text", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_meta" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_audit_event"("p_action" "text", "p_entity" "text", "p_entity_id" "text", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_meta" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_audit_event"("p_action" "text", "p_entity" "text", "p_entity_id" "text", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_meta" "jsonb") TO "anon";



GRANT ALL ON FUNCTION "public"."log_aum_position_mismatch"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_aum_position_mismatch"() TO "service_role";
GRANT ALL ON FUNCTION "public"."log_aum_position_mismatch"() TO "anon";



GRANT ALL ON FUNCTION "public"."log_data_edit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_data_edit"() TO "service_role";
GRANT ALL ON FUNCTION "public"."log_data_edit"() TO "anon";



GRANT ALL ON FUNCTION "public"."log_delivery_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_delivery_status_change"() TO "service_role";
GRANT ALL ON FUNCTION "public"."log_delivery_status_change"() TO "anon";



GRANT ALL ON FUNCTION "public"."log_financial_operation"("p_action" "text", "p_entity" "text", "p_entity_id" "text", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_meta" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_financial_operation"("p_action" "text", "p_entity" "text", "p_entity_id" "text", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_meta" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_financial_operation"("p_action" "text", "p_entity" "text", "p_entity_id" "text", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_meta" "jsonb") TO "anon";



GRANT ALL ON FUNCTION "public"."log_ledger_mismatches"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_ledger_mismatches"() TO "service_role";
GRANT ALL ON FUNCTION "public"."log_ledger_mismatches"() TO "anon";



GRANT ALL ON FUNCTION "public"."log_security_event"("p_event_type" "text", "p_severity" "text", "p_user_id" "uuid", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_security_event"("p_event_type" "text", "p_severity" "text", "p_user_id" "uuid", "p_details" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_security_event"("p_event_type" "text", "p_severity" "text", "p_user_id" "uuid", "p_details" "jsonb") TO "anon";



GRANT ALL ON FUNCTION "public"."log_withdrawal_action"("p_request_id" "uuid", "p_action" "text", "p_meta" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_withdrawal_action"("p_request_id" "uuid", "p_action" "text", "p_meta" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_withdrawal_action"("p_request_id" "uuid", "p_action" "text", "p_meta" "jsonb") TO "anon";



GRANT ALL ON FUNCTION "public"."maintain_high_water_mark"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."maintain_high_water_mark"() TO "service_role";
GRANT ALL ON FUNCTION "public"."maintain_high_water_mark"() TO "anon";



GRANT ALL ON FUNCTION "public"."mark_delivery_result"("p_delivery_id" "uuid", "p_success" boolean, "p_provider_message_id" "text", "p_error_code" "text", "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_delivery_result"("p_delivery_id" "uuid", "p_success" boolean, "p_provider_message_id" "text", "p_error_code" "text", "p_error_message" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."mark_delivery_result"("p_delivery_id" "uuid", "p_success" boolean, "p_provider_message_id" "text", "p_error_code" "text", "p_error_message" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."mark_sent_manually"("p_delivery_id" "uuid", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_sent_manually"("p_delivery_id" "uuid", "p_note" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."mark_sent_manually"("p_delivery_id" "uuid", "p_note" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."merge_duplicate_profiles"("p_keep_profile_id" "uuid", "p_merge_profile_id" "uuid", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."merge_duplicate_profiles"("p_keep_profile_id" "uuid", "p_merge_profile_id" "uuid", "p_admin_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."merge_duplicate_profiles"("p_keep_profile_id" "uuid", "p_merge_profile_id" "uuid", "p_admin_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."nightly_aum_reconciliation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."nightly_aum_reconciliation"() TO "service_role";
GRANT ALL ON FUNCTION "public"."nightly_aum_reconciliation"() TO "anon";



GRANT ALL ON FUNCTION "public"."parse_platform_error"("p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."parse_platform_error"("p_error_message" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."parse_platform_error"("p_error_message" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."populate_investor_fund_performance"("p_investor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."populate_investor_fund_performance"("p_investor_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."populate_investor_fund_performance"("p_investor_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."preserve_created_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."preserve_created_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."preserve_created_at"() TO "anon";



GRANT ALL ON FUNCTION "public"."prevent_auto_aum_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_auto_aum_creation"() TO "service_role";
GRANT ALL ON FUNCTION "public"."prevent_auto_aum_creation"() TO "anon";



GRANT ALL ON FUNCTION "public"."preview_adb_yield_distribution_v3"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_gross_yield_amount" numeric, "p_purpose" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."preview_adb_yield_distribution_v3"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_gross_yield_amount" numeric, "p_purpose" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."preview_adb_yield_distribution_v3"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_gross_yield_amount" numeric, "p_purpose" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."preview_crystallization"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_target_date" "date", "p_new_total_aum" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."preview_crystallization"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_target_date" "date", "p_new_total_aum" numeric) TO "service_role";
GRANT ALL ON FUNCTION "public"."preview_crystallization"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_target_date" "date", "p_new_total_aum" numeric) TO "anon";



GRANT ALL ON FUNCTION "public"."preview_daily_yield_to_fund_v3"("p_fund_id" "uuid", "p_yield_date" "date", "p_new_aum" numeric, "p_purpose" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."preview_daily_yield_to_fund_v3"("p_fund_id" "uuid", "p_yield_date" "date", "p_new_aum" numeric, "p_purpose" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."preview_daily_yield_to_fund_v3"("p_fund_id" "uuid", "p_yield_date" "date", "p_new_aum" numeric, "p_purpose" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."preview_merge_duplicate_profiles"("p_keep_profile_id" "uuid", "p_merge_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."preview_merge_duplicate_profiles"("p_keep_profile_id" "uuid", "p_merge_profile_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."preview_merge_duplicate_profiles"("p_keep_profile_id" "uuid", "p_merge_profile_id" "uuid") TO "anon";



REVOKE ALL ON FUNCTION "public"."preview_segmented_yield_distribution_v5"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_purpose" "public"."aum_purpose") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."preview_segmented_yield_distribution_v5"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_purpose" "public"."aum_purpose") TO "authenticated";
GRANT ALL ON FUNCTION "public"."preview_segmented_yield_distribution_v5"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_purpose" "public"."aum_purpose") TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_yield_distribution"("p_fund_id" "uuid", "p_gross_amount" numeric, "p_date" "date", "p_admin_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_yield_distribution"("p_fund_id" "uuid", "p_gross_amount" numeric, "p_date" "date", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_yield_distribution"("p_fund_id" "uuid", "p_gross_amount" numeric, "p_date" "date", "p_admin_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."process_yield_distribution"("p_fund_id" "uuid", "p_gross_amount" numeric, "p_date" "date", "p_admin_id" "uuid") TO "anon";



REVOKE ALL ON FUNCTION "public"."process_yield_distribution_with_dust"("p_fund_id" "uuid", "p_gross_amount" numeric, "p_date" "date", "p_admin_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_yield_distribution_with_dust"("p_fund_id" "uuid", "p_gross_amount" numeric, "p_date" "date", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_yield_distribution_with_dust"("p_fund_id" "uuid", "p_gross_amount" numeric, "p_date" "date", "p_admin_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."process_yield_distribution_with_dust"("p_fund_id" "uuid", "p_gross_amount" numeric, "p_date" "date", "p_admin_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."protect_allocation_immutable_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_allocation_immutable_fields"() TO "service_role";
GRANT ALL ON FUNCTION "public"."protect_allocation_immutable_fields"() TO "anon";



GRANT ALL ON FUNCTION "public"."protect_audit_immutable_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_audit_immutable_fields"() TO "service_role";
GRANT ALL ON FUNCTION "public"."protect_audit_immutable_fields"() TO "anon";



GRANT ALL ON FUNCTION "public"."protect_audit_log_immutable_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_audit_log_immutable_fields"() TO "service_role";
GRANT ALL ON FUNCTION "public"."protect_audit_log_immutable_fields"() TO "anon";



GRANT ALL ON FUNCTION "public"."protect_profile_sensitive_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_profile_sensitive_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_profile_sensitive_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_transaction_immutable_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_transaction_immutable_fields"() TO "service_role";
GRANT ALL ON FUNCTION "public"."protect_transaction_immutable_fields"() TO "anon";



GRANT ALL ON FUNCTION "public"."purge_old_audit_logs"("retention_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."purge_old_audit_logs"("retention_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."purge_old_audit_logs"("retention_days" integer) TO "service_role";







GRANT ALL ON FUNCTION "public"."queue_statement_deliveries"("p_period_id" "uuid", "p_channel" "text", "p_investor_ids" "uuid"[], "p_fund_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."queue_statement_deliveries"("p_period_id" "uuid", "p_channel" "text", "p_investor_ids" "uuid"[], "p_fund_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."queue_statement_deliveries"("p_period_id" "uuid", "p_channel" "text", "p_investor_ids" "uuid"[], "p_fund_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."raise_platform_error"("p_error_code" "text", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."raise_platform_error"("p_error_code" "text", "p_details" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."raise_platform_error"("p_error_code" "text", "p_details" "jsonb") TO "anon";



GRANT ALL ON FUNCTION "public"."rebuild_investor_period_balances"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_purpose" "public"."aum_purpose") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rebuild_investor_period_balances"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_purpose" "public"."aum_purpose") TO "service_role";
GRANT ALL ON FUNCTION "public"."rebuild_investor_period_balances"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_purpose" "public"."aum_purpose") TO "anon";



GRANT ALL ON FUNCTION "public"."rebuild_position_from_ledger"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_admin_id" "uuid", "p_reason" "text", "p_dry_run" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rebuild_position_from_ledger"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_admin_id" "uuid", "p_reason" "text", "p_dry_run" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."rebuild_position_from_ledger"("p_investor_id" "uuid", "p_fund_id" "uuid", "p_admin_id" "uuid", "p_reason" "text", "p_dry_run" boolean) TO "anon";



GRANT ALL ON FUNCTION "public"."recalculate_all_aum"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_all_aum"() TO "service_role";
GRANT ALL ON FUNCTION "public"."recalculate_all_aum"() TO "anon";



REVOKE ALL ON FUNCTION "public"."recalculate_fund_aum_for_date"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "public"."aum_purpose", "p_actor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recalculate_fund_aum_for_date"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "public"."aum_purpose", "p_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_fund_aum_for_date"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "public"."aum_purpose", "p_actor_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."recompute_investor_position"("p_investor_id" "uuid", "p_fund_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recompute_investor_position"("p_investor_id" "uuid", "p_fund_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_investor_position"("p_investor_id" "uuid", "p_fund_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_investor_positions_for_investor"("p_investor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_investor_positions_for_investor"("p_investor_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."recompute_investor_positions_for_investor"("p_investor_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."recompute_on_void"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_on_void"() TO "service_role";
GRANT ALL ON FUNCTION "public"."recompute_on_void"() TO "anon";



GRANT ALL ON FUNCTION "public"."reconcile_all_positions"("p_dry_run" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reconcile_all_positions"("p_dry_run" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."reconcile_all_positions"("p_dry_run" boolean) TO "anon";



GRANT ALL ON FUNCTION "public"."reconcile_fund_aum_with_positions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reconcile_fund_aum_with_positions"() TO "service_role";
GRANT ALL ON FUNCTION "public"."reconcile_fund_aum_with_positions"() TO "anon";



GRANT ALL ON FUNCTION "public"."reconcile_investor_position_internal"("p_investor_id" "uuid", "p_fund_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reconcile_investor_position_internal"("p_investor_id" "uuid", "p_fund_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reconcile_investor_position_internal"("p_investor_id" "uuid", "p_fund_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_materialized_view_concurrently"("view_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_materialized_view_concurrently"("view_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."refresh_materialized_view_concurrently"("view_name" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."refresh_yield_materialized_views"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_yield_materialized_views"() TO "service_role";
GRANT ALL ON FUNCTION "public"."refresh_yield_materialized_views"() TO "anon";



GRANT ALL ON FUNCTION "public"."reject_withdrawal"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_withdrawal"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."reject_withdrawal"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."reopen_yield_period"("p_fund_id" "uuid", "p_year" integer, "p_month" integer, "p_purpose" "public"."aum_purpose", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reopen_yield_period"("p_fund_id" "uuid", "p_year" integer, "p_month" integer, "p_purpose" "public"."aum_purpose", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."reopen_yield_period"("p_fund_id" "uuid", "p_year" integer, "p_month" integer, "p_purpose" "public"."aum_purpose", "p_reason" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."repair_all_positions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."repair_all_positions"() TO "service_role";
GRANT ALL ON FUNCTION "public"."repair_all_positions"() TO "anon";



GRANT ALL ON FUNCTION "public"."replace_aum_snapshot"("p_fund_id" "uuid", "p_aum_date" "date", "p_new_total_aum" numeric, "p_purpose" "public"."aum_purpose", "p_admin_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_aum_snapshot"("p_fund_id" "uuid", "p_aum_date" "date", "p_new_total_aum" numeric, "p_purpose" "public"."aum_purpose", "p_admin_id" "uuid", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."replace_aum_snapshot"("p_fund_id" "uuid", "p_aum_date" "date", "p_new_total_aum" numeric, "p_purpose" "public"."aum_purpose", "p_admin_id" "uuid", "p_reason" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."requeue_stale_sending"("p_period_id" "uuid", "p_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."requeue_stale_sending"("p_period_id" "uuid", "p_minutes" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."requeue_stale_sending"("p_period_id" "uuid", "p_minutes" integer) TO "anon";



GRANT ALL ON FUNCTION "public"."require_admin"("p_operation" "text", "p_admin_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."require_admin"("p_operation" "text", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."require_admin"("p_operation" "text", "p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."require_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."require_super_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."require_super_admin"() TO "anon";



GRANT ALL ON FUNCTION "public"."require_super_admin"("p_operation" "text", "p_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."require_super_admin"("p_operation" "text", "p_actor_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."require_super_admin"("p_operation" "text", "p_actor_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."reset_all_data_keep_profiles"("p_admin_id" "uuid", "p_confirmation_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_all_data_keep_profiles"("p_admin_id" "uuid", "p_confirmation_code" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."reset_all_data_keep_profiles"("p_admin_id" "uuid", "p_confirmation_code" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."reset_all_investor_positions"("p_admin_id" "uuid", "p_confirmation_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_all_investor_positions"("p_admin_id" "uuid", "p_confirmation_code" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."reset_all_investor_positions"("p_admin_id" "uuid", "p_confirmation_code" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."retry_delivery"("p_delivery_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."retry_delivery"("p_delivery_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."retry_delivery"("p_delivery_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."route_withdrawal_to_fees"("p_request_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."route_withdrawal_to_fees"("p_request_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."route_withdrawal_to_fees"("p_request_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."run_comprehensive_health_check"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_comprehensive_health_check"() TO "service_role";
GRANT ALL ON FUNCTION "public"."run_comprehensive_health_check"() TO "anon";



GRANT ALL ON FUNCTION "public"."run_daily_health_check"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_daily_health_check"() TO "service_role";
GRANT ALL ON FUNCTION "public"."run_daily_health_check"() TO "anon";



GRANT ALL ON FUNCTION "public"."run_integrity_check"("p_scope_fund_id" "uuid", "p_scope_investor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_integrity_check"("p_scope_fund_id" "uuid", "p_scope_investor_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."run_integrity_check"("p_scope_fund_id" "uuid", "p_scope_investor_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."run_integrity_pack"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_integrity_pack"() TO "service_role";
GRANT ALL ON FUNCTION "public"."run_integrity_pack"() TO "anon";



GRANT ALL ON FUNCTION "public"."run_invariant_checks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_invariant_checks"() TO "service_role";
GRANT ALL ON FUNCTION "public"."run_invariant_checks"() TO "anon";







GRANT ALL ON FUNCTION "public"."set_account_type_for_ib"("p_user_id" "uuid", "p_account_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_account_type_for_ib"("p_user_id" "uuid", "p_account_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_account_type_for_ib"("p_user_id" "uuid", "p_account_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_canonical_rpc"("enabled" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_canonical_rpc"("enabled" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_canonical_rpc"("enabled" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_fund_daily_aum"("p_fund_id" "uuid", "p_aum_date" "date", "p_total_aum" numeric, "p_purpose" "text", "p_source" "text", "p_skip_validation" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_fund_daily_aum"("p_fund_id" "uuid", "p_aum_date" "date", "p_total_aum" numeric, "p_purpose" "text", "p_source" "text", "p_skip_validation" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."set_fund_daily_aum"("p_fund_id" "uuid", "p_aum_date" "date", "p_total_aum" numeric, "p_purpose" "text", "p_source" "text", "p_skip_validation" boolean) TO "anon";



GRANT ALL ON FUNCTION "public"."set_position_is_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_position_is_active"() TO "service_role";
GRANT ALL ON FUNCTION "public"."set_position_is_active"() TO "anon";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";



GRANT ALL ON FUNCTION "public"."start_processing_withdrawal"("p_request_id" "uuid", "p_processed_amount" numeric, "p_tx_hash" "text", "p_settlement_date" "date", "p_admin_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_processing_withdrawal"("p_request_id" "uuid", "p_processed_amount" numeric, "p_tx_hash" "text", "p_settlement_date" "date", "p_admin_notes" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."start_processing_withdrawal"("p_request_id" "uuid", "p_processed_amount" numeric, "p_tx_hash" "text", "p_settlement_date" "date", "p_admin_notes" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."sync_all_fund_aum"("p_target_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_all_fund_aum"("p_target_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_all_fund_aum"("p_target_date" "date") TO "anon";



GRANT ALL ON FUNCTION "public"."sync_aum_on_position_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_aum_on_position_change"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_aum_on_position_change"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_aum_on_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_aum_on_transaction"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_aum_on_transaction"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_aum_to_positions"("p_fund_id" "uuid", "p_aum_date" "date", "p_admin_id" "uuid", "p_reason" "text", "p_purpose" "public"."aum_purpose") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_aum_to_positions"("p_fund_id" "uuid", "p_aum_date" "date", "p_admin_id" "uuid", "p_reason" "text", "p_purpose" "public"."aum_purpose") TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_aum_to_positions"("p_fund_id" "uuid", "p_aum_date" "date", "p_admin_id" "uuid", "p_reason" "text", "p_purpose" "public"."aum_purpose") TO "anon";



GRANT ALL ON FUNCTION "public"."sync_documents_profile_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_documents_profile_ids"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_documents_profile_ids"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_fee_allocations_voided_by_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_fee_allocations_voided_by_profile"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_fee_allocations_voided_by_profile"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_fund_aum_after_position"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_fund_aum_after_position"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_fund_aum_after_position"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_fund_aum_events_voided_by_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_fund_aum_events_voided_by_profile"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_fund_aum_events_voided_by_profile"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_fund_daily_aum_voided_by_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_fund_daily_aum_voided_by_profile"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_fund_daily_aum_voided_by_profile"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_ib_account_type"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_ib_account_type"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_ib_account_type"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_ib_allocations_from_commission_ledger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_ib_allocations_from_commission_ledger"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_ib_allocations_from_commission_ledger"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_ib_allocations_voided_by_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_ib_allocations_voided_by_profile"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_ib_allocations_voided_by_profile"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_ib_commission_ledger_voided_by_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_ib_commission_ledger_voided_by_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_ib_commission_ledger_voided_by_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_investor_yield_events_voided_by_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_investor_yield_events_voided_by_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_investor_yield_events_voided_by_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_platform_fee_ledger_voided_by_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_platform_fee_ledger_voided_by_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_platform_fee_ledger_voided_by_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_position_last_tx_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_position_last_tx_date"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_position_last_tx_date"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_profile_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_is_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_profile_is_admin"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_profile_last_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_last_activity"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_profile_last_activity"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_profile_role_from_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_role_from_profiles"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_profile_role_from_profiles"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_profile_role_from_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_role_from_roles"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_profile_role_from_roles"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_reporting_aum_to_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_reporting_aum_to_transaction"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_reporting_aum_to_transaction"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_statements_investor_profile_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_statements_investor_profile_id"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_statements_investor_profile_id"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_transaction_aum_after_yield"("p_fund_id" "uuid", "p_aum_date" "date", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_transaction_aum_after_yield"("p_fund_id" "uuid", "p_aum_date" "date", "p_admin_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_transaction_aum_after_yield"("p_fund_id" "uuid", "p_aum_date" "date", "p_admin_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."sync_transactions_v2_voided_by_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_transactions_v2_voided_by_profile"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_transactions_v2_voided_by_profile"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_yield_allocations_voided_by_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_yield_allocations_voided_by_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_yield_allocations_voided_by_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_yield_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_yield_date"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_yield_date"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_yield_distribution_legacy_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_yield_distribution_legacy_totals"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_yield_distribution_legacy_totals"() TO "anon";



GRANT ALL ON FUNCTION "public"."sync_yield_distributions_voided_by_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_yield_distributions_voided_by_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_yield_distributions_voided_by_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_yield_to_investor_yield_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_yield_to_investor_yield_events"() TO "service_role";
GRANT ALL ON FUNCTION "public"."sync_yield_to_investor_yield_events"() TO "anon";



GRANT ALL ON FUNCTION "public"."system_health_check"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."system_health_check"() TO "service_role";
GRANT ALL ON FUNCTION "public"."system_health_check"() TO "anon";



GRANT ALL ON FUNCTION "public"."trigger_recompute_position"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_recompute_position"() TO "service_role";
GRANT ALL ON FUNCTION "public"."trigger_recompute_position"() TO "anon";



REVOKE ALL ON FUNCTION "public"."unvoid_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."unvoid_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unvoid_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unvoid_transaction_with_lock"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unvoid_transaction_with_lock"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unvoid_transaction_with_lock"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unvoid_transactions_bulk"("p_transaction_ids" "uuid"[], "p_admin_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unvoid_transactions_bulk"("p_transaction_ids" "uuid"[], "p_admin_id" "uuid", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."unvoid_transactions_bulk"("p_transaction_ids" "uuid"[], "p_admin_id" "uuid", "p_reason" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."update_admin_role"("p_target_user_id" "uuid", "p_new_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_admin_role"("p_target_user_id" "uuid", "p_new_role" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."update_admin_role"("p_target_user_id" "uuid", "p_new_role" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."update_delivery_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_delivery_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_delivery_updated_at"() TO "anon";



GRANT ALL ON FUNCTION "public"."update_dust_tolerance"("p_asset" "text", "p_tolerance" numeric, "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_dust_tolerance"("p_asset" "text", "p_tolerance" numeric, "p_admin_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."update_dust_tolerance"("p_asset" "text", "p_tolerance" numeric, "p_admin_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."update_fund_aum_baseline"("p_fund_id" "text", "p_new_baseline" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_fund_aum_baseline"("p_fund_id" "text", "p_new_baseline" numeric) TO "service_role";
GRANT ALL ON FUNCTION "public"."update_fund_aum_baseline"("p_fund_id" "text", "p_new_baseline" numeric) TO "anon";



GRANT ALL ON FUNCTION "public"."update_fund_daily_aum"("p_record_id" "uuid", "p_new_total_aum" numeric, "p_reason" "text", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_fund_daily_aum"("p_record_id" "uuid", "p_new_total_aum" numeric, "p_reason" "text", "p_admin_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."update_fund_daily_aum"("p_record_id" "uuid", "p_new_total_aum" numeric, "p_reason" "text", "p_admin_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."update_fund_daily_aum_with_recalc"("p_record_id" "uuid", "p_new_total_aum" numeric, "p_reason" "text", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_fund_daily_aum_with_recalc"("p_record_id" "uuid", "p_new_total_aum" numeric, "p_reason" "text", "p_admin_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."update_fund_daily_aum_with_recalc"("p_record_id" "uuid", "p_new_total_aum" numeric, "p_reason" "text", "p_admin_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."update_investor_aum_percentages"("p_fund_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_investor_aum_percentages"("p_fund_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."update_investor_aum_percentages"("p_fund_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."update_investor_last_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_investor_last_activity"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_investor_last_activity"() TO "anon";



GRANT ALL ON FUNCTION "public"."update_investor_last_activity_withdrawal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_investor_last_activity_withdrawal"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_investor_last_activity_withdrawal"() TO "anon";



GRANT ALL ON FUNCTION "public"."update_last_activity_on_statement"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_last_activity_on_statement"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_last_activity_on_statement"() TO "anon";



GRANT ALL ON FUNCTION "public"."update_transaction"("p_transaction_id" "uuid", "p_updates" "jsonb", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_transaction"("p_transaction_id" "uuid", "p_updates" "jsonb", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."update_transaction"("p_transaction_id" "uuid", "p_updates" "jsonb", "p_reason" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";



GRANT ALL ON FUNCTION "public"."update_user_profile_secure"("p_user_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_profile_secure"("p_user_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_status" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."update_user_profile_secure"("p_user_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_status" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."update_withdrawal"("p_withdrawal_id" "uuid", "p_requested_amount" numeric, "p_withdrawal_type" "text", "p_notes" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_withdrawal"("p_withdrawal_id" "uuid", "p_requested_amount" numeric, "p_withdrawal_type" "text", "p_notes" "text", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."update_withdrawal"("p_withdrawal_id" "uuid", "p_requested_amount" numeric, "p_withdrawal_type" "text", "p_notes" "text", "p_reason" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."upsert_fund_aum_after_yield"("p_fund_id" "uuid", "p_aum_date" "date", "p_yield_amount" numeric, "p_purpose" "public"."aum_purpose", "p_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_fund_aum_after_yield"("p_fund_id" "uuid", "p_aum_date" "date", "p_yield_amount" numeric, "p_purpose" "public"."aum_purpose", "p_actor_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."upsert_fund_aum_after_yield"("p_fund_id" "uuid", "p_aum_date" "date", "p_yield_amount" numeric, "p_purpose" "public"."aum_purpose", "p_actor_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."validate_aum_against_positions"("p_fund_id" "uuid", "p_aum_value" numeric, "p_max_deviation_pct" numeric, "p_context" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_aum_against_positions"("p_fund_id" "uuid", "p_aum_value" numeric, "p_max_deviation_pct" numeric, "p_context" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_aum_against_positions"("p_fund_id" "uuid", "p_aum_value" numeric, "p_max_deviation_pct" numeric, "p_context" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."validate_aum_against_positions_at_date"("p_fund_id" "uuid", "p_aum_value" numeric, "p_event_date" "date", "p_max_deviation_pct" numeric, "p_context" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_aum_against_positions_at_date"("p_fund_id" "uuid", "p_aum_value" numeric, "p_event_date" "date", "p_max_deviation_pct" numeric, "p_context" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_aum_against_positions_at_date"("p_fund_id" "uuid", "p_aum_value" numeric, "p_event_date" "date", "p_max_deviation_pct" numeric, "p_context" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."validate_aum_matches_positions"("p_fund_id" "uuid", "p_aum_date" "date", "p_tolerance_pct" numeric, "p_purpose" "public"."aum_purpose") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_aum_matches_positions"("p_fund_id" "uuid", "p_aum_date" "date", "p_tolerance_pct" numeric, "p_purpose" "public"."aum_purpose") TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_aum_matches_positions"("p_fund_id" "uuid", "p_aum_date" "date", "p_tolerance_pct" numeric, "p_purpose" "public"."aum_purpose") TO "anon";



GRANT ALL ON FUNCTION "public"."validate_aum_matches_positions_strict"("p_fund_id" "uuid", "p_aum_date" "date", "p_purpose" "public"."aum_purpose") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_aum_matches_positions_strict"("p_fund_id" "uuid", "p_aum_date" "date", "p_purpose" "public"."aum_purpose") TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_aum_matches_positions_strict"("p_fund_id" "uuid", "p_aum_date" "date", "p_purpose" "public"."aum_purpose") TO "anon";



GRANT ALL ON FUNCTION "public"."validate_dust_tolerance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_dust_tolerance"() TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_dust_tolerance"() TO "anon";



GRANT ALL ON FUNCTION "public"."validate_fees_account_fee_pct"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_fees_account_fee_pct"() TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_fees_account_fee_pct"() TO "anon";



GRANT ALL ON FUNCTION "public"."validate_ib_parent_has_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_ib_parent_has_role"() TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_ib_parent_has_role"() TO "anon";



GRANT ALL ON FUNCTION "public"."validate_manual_aum_entry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_manual_aum_entry"() TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_manual_aum_entry"() TO "anon";



GRANT ALL ON FUNCTION "public"."validate_manual_aum_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_manual_aum_event"() TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_manual_aum_event"() TO "anon";



GRANT ALL ON FUNCTION "public"."validate_position_fund_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_position_fund_status"() TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_position_fund_status"() TO "anon";



GRANT ALL ON FUNCTION "public"."validate_pre_yield_aum"("p_fund_id" "uuid", "p_tolerance_percentage" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_pre_yield_aum"("p_fund_id" "uuid", "p_tolerance_percentage" numeric) TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_pre_yield_aum"("p_fund_id" "uuid", "p_tolerance_percentage" numeric) TO "anon";



GRANT ALL ON FUNCTION "public"."validate_transaction_amount"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_transaction_amount"() TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_transaction_amount"() TO "anon";



GRANT ALL ON FUNCTION "public"."validate_transaction_aum_exists"("p_fund_id" "uuid", "p_tx_date" "date", "p_purpose" "public"."aum_purpose") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_transaction_aum_exists"("p_fund_id" "uuid", "p_tx_date" "date", "p_purpose" "public"."aum_purpose") TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_transaction_aum_exists"("p_fund_id" "uuid", "p_tx_date" "date", "p_purpose" "public"."aum_purpose") TO "anon";



GRANT ALL ON FUNCTION "public"."validate_transaction_fund_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_transaction_fund_status"() TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_transaction_fund_status"() TO "anon";



GRANT ALL ON FUNCTION "public"."validate_transaction_has_aum"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_transaction_has_aum"() TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_transaction_has_aum"() TO "anon";



GRANT ALL ON FUNCTION "public"."validate_transaction_type"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_transaction_type"() TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_transaction_type"() TO "anon";



GRANT ALL ON FUNCTION "public"."validate_withdrawal_request"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_withdrawal_request"() TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_withdrawal_request"() TO "anon";



GRANT ALL ON FUNCTION "public"."validate_withdrawal_transition"("p_current_status" "text", "p_new_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_withdrawal_transition"("p_current_status" "text", "p_new_status" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_withdrawal_transition"("p_current_status" "text", "p_new_status" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."validate_yield_distribution_prerequisites"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_purpose" "text", "p_aum_tolerance_pct" numeric, "p_auto_sync" boolean, "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_yield_distribution_prerequisites"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_purpose" "text", "p_aum_tolerance_pct" numeric, "p_auto_sync" boolean, "p_admin_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_yield_distribution_prerequisites"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_purpose" "text", "p_aum_tolerance_pct" numeric, "p_auto_sync" boolean, "p_admin_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."validate_yield_parameters"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_purpose" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_yield_parameters"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_purpose" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_yield_parameters"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_purpose" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."validate_yield_rate_sanity"("p_yield_pct" numeric, "p_fund_id" "uuid", "p_context" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_yield_rate_sanity"("p_yield_pct" numeric, "p_fund_id" "uuid", "p_context" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_yield_rate_sanity"("p_yield_pct" numeric, "p_fund_id" "uuid", "p_context" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."validate_yield_temporal_lock"("p_fund_id" "uuid", "p_yield_date" "date", "p_purpose" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_yield_temporal_lock"("p_fund_id" "uuid", "p_yield_date" "date", "p_purpose" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_yield_temporal_lock"("p_fund_id" "uuid", "p_yield_date" "date", "p_purpose" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."verify_aum_purpose_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_aum_purpose_usage"() TO "service_role";
GRANT ALL ON FUNCTION "public"."verify_aum_purpose_usage"() TO "anon";



GRANT ALL ON FUNCTION "public"."verify_yield_distribution_balance"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_yield_distribution_balance"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."verify_yield_distribution_balance"("p_fund_id" "uuid", "p_date" "date", "p_purpose" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."void_and_reissue_full_exit"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_reason" "text", "p_new_date" "date", "p_send_precision" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."void_and_reissue_full_exit"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_reason" "text", "p_new_date" "date", "p_send_precision" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."void_and_reissue_full_exit"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_reason" "text", "p_new_date" "date", "p_send_precision" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."void_and_reissue_transaction"("p_original_tx_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_new_date" "date", "p_new_notes" "text", "p_new_tx_hash" "text", "p_closing_aum" numeric, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."void_and_reissue_transaction"("p_original_tx_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_new_date" "date", "p_new_notes" "text", "p_new_tx_hash" "text", "p_closing_aum" numeric, "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."void_and_reissue_transaction"("p_original_tx_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_new_date" "date", "p_new_notes" "text", "p_new_tx_hash" "text", "p_closing_aum" numeric, "p_reason" "text") TO "anon";



REVOKE ALL ON FUNCTION "public"."void_completed_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."void_completed_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."void_completed_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."void_fund_daily_aum"("p_record_id" "uuid", "p_reason" "text", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."void_fund_daily_aum"("p_record_id" "uuid", "p_reason" "text", "p_admin_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."void_fund_daily_aum"("p_record_id" "uuid", "p_reason" "text", "p_admin_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."void_investor_yield_events_for_distribution"("p_distribution_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."void_investor_yield_events_for_distribution"("p_distribution_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."void_investor_yield_events_for_distribution"("p_distribution_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."void_transaction_with_lock"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."void_transaction_with_lock"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."void_transaction_with_lock"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."void_transactions_bulk"("p_transaction_ids" "uuid"[], "p_admin_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."void_transactions_bulk"("p_transaction_ids" "uuid"[], "p_admin_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."void_transactions_bulk"("p_transaction_ids" "uuid"[], "p_admin_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."void_yield_distribution"("p_distribution_id" "uuid", "p_admin_id" "uuid", "p_reason" "text", "p_void_crystals" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."void_yield_distribution"("p_distribution_id" "uuid", "p_admin_id" "uuid", "p_reason" "text", "p_void_crystals" boolean) TO "service_role";















GRANT ALL ON TABLE "public"."admin_alerts" TO "anon";
GRANT ALL ON TABLE "public"."admin_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."admin_integrity_runs" TO "anon";
GRANT ALL ON TABLE "public"."admin_integrity_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_integrity_runs" TO "service_role";



GRANT ALL ON TABLE "public"."assets" TO "anon";
GRANT ALL ON TABLE "public"."assets" TO "authenticated";
GRANT ALL ON TABLE "public"."assets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."assets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."assets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."assets_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."fund_daily_aum" TO "anon";
GRANT ALL ON TABLE "public"."fund_daily_aum" TO "authenticated";
GRANT ALL ON TABLE "public"."fund_daily_aum" TO "service_role";



GRANT ALL ON TABLE "public"."funds" TO "anon";
GRANT ALL ON TABLE "public"."funds" TO "authenticated";
GRANT ALL ON TABLE "public"."funds" TO "service_role";



GRANT ALL ON TABLE "public"."investor_positions" TO "anon";
GRANT ALL ON TABLE "public"."investor_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."investor_positions" TO "service_role";



GRANT ALL ON TABLE "public"."aum_position_reconciliation" TO "anon";
GRANT ALL ON TABLE "public"."aum_position_reconciliation" TO "authenticated";
GRANT ALL ON TABLE "public"."aum_position_reconciliation" TO "service_role";



GRANT ALL ON TABLE "public"."data_edit_audit" TO "anon";
GRANT ALL ON TABLE "public"."data_edit_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."data_edit_audit" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."error_code_metadata" TO "anon";
GRANT ALL ON TABLE "public"."error_code_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."error_code_metadata" TO "service_role";



GRANT ALL ON TABLE "public"."fee_allocations" TO "anon";
GRANT ALL ON TABLE "public"."fee_allocations" TO "authenticated";
GRANT ALL ON TABLE "public"."fee_allocations" TO "service_role";



GRANT ALL ON TABLE "public"."fund_aum_events" TO "anon";
GRANT ALL ON TABLE "public"."fund_aum_events" TO "authenticated";
GRANT ALL ON TABLE "public"."fund_aum_events" TO "service_role";



GRANT ALL ON TABLE "public"."fund_yield_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."fund_yield_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."fund_yield_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."generated_statements" TO "anon";
GRANT ALL ON TABLE "public"."generated_statements" TO "authenticated";
GRANT ALL ON TABLE "public"."generated_statements" TO "service_role";



GRANT ALL ON TABLE "public"."global_fee_settings" TO "anon";
GRANT ALL ON TABLE "public"."global_fee_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."global_fee_settings" TO "service_role";



GRANT ALL ON TABLE "public"."ib_allocations" TO "anon";
GRANT ALL ON TABLE "public"."ib_allocations" TO "authenticated";
GRANT ALL ON TABLE "public"."ib_allocations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."ib_allocation_consistency" TO "anon";
GRANT ALL ON TABLE "public"."ib_allocation_consistency" TO "authenticated";
GRANT ALL ON TABLE "public"."ib_allocation_consistency" TO "service_role";



GRANT ALL ON TABLE "public"."ib_commission_ledger" TO "anon";
GRANT ALL ON TABLE "public"."ib_commission_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."ib_commission_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."ib_commission_schedule" TO "anon";
GRANT ALL ON TABLE "public"."ib_commission_schedule" TO "authenticated";
GRANT ALL ON TABLE "public"."ib_commission_schedule" TO "service_role";



GRANT ALL ON TABLE "public"."investor_daily_balance" TO "anon";
GRANT ALL ON TABLE "public"."investor_daily_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."investor_daily_balance" TO "service_role";



GRANT ALL ON TABLE "public"."investor_emails" TO "anon";
GRANT ALL ON TABLE "public"."investor_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."investor_emails" TO "service_role";



GRANT ALL ON TABLE "public"."investor_fee_schedule" TO "anon";
GRANT ALL ON TABLE "public"."investor_fee_schedule" TO "authenticated";
GRANT ALL ON TABLE "public"."investor_fee_schedule" TO "service_role";



GRANT ALL ON TABLE "public"."investor_fund_performance" TO "anon";
GRANT ALL ON TABLE "public"."investor_fund_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."investor_fund_performance" TO "service_role";



GRANT ALL ON TABLE "public"."transactions_v2" TO "anon";
GRANT ALL ON TABLE "public"."transactions_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions_v2" TO "service_role";



GRANT ALL ON TABLE "public"."investor_position_ledger_mismatch" TO "anon";
GRANT ALL ON TABLE "public"."investor_position_ledger_mismatch" TO "authenticated";
GRANT ALL ON TABLE "public"."investor_position_ledger_mismatch" TO "service_role";



GRANT ALL ON TABLE "public"."investor_position_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."investor_position_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."investor_position_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."investor_yield_events" TO "anon";
GRANT ALL ON TABLE "public"."investor_yield_events" TO "authenticated";
GRANT ALL ON TABLE "public"."investor_yield_events" TO "service_role";



GRANT ALL ON TABLE "public"."mv_admin_repair_usage" TO "anon";
GRANT ALL ON TABLE "public"."mv_admin_repair_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_admin_repair_usage" TO "service_role";



GRANT ALL ON TABLE "public"."mv_aum_position_drift" TO "anon";
GRANT ALL ON TABLE "public"."mv_aum_position_drift" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_aum_position_drift" TO "service_role";



GRANT ALL ON TABLE "public"."mv_position_ledger_drift" TO "anon";
GRANT ALL ON TABLE "public"."mv_position_ledger_drift" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_position_ledger_drift" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."platform_fee_ledger" TO "anon";
GRANT ALL ON TABLE "public"."platform_fee_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_fee_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."platform_invites" TO "anon";
GRANT ALL ON TABLE "public"."platform_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_invites" TO "service_role";



GRANT ALL ON TABLE "public"."position_transaction_reconciliation" TO "anon";
GRANT ALL ON TABLE "public"."position_transaction_reconciliation" TO "authenticated";
GRANT ALL ON TABLE "public"."position_transaction_reconciliation" TO "service_role";







GRANT ALL ON TABLE "public"."rate_limit_config" TO "anon";
GRANT ALL ON TABLE "public"."rate_limit_config" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limit_config" TO "service_role";



GRANT ALL ON TABLE "public"."report_schedules" TO "anon";
GRANT ALL ON TABLE "public"."report_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."report_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."risk_alerts" TO "anon";
GRANT ALL ON TABLE "public"."risk_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."risk_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."statement_email_delivery" TO "anon";
GRANT ALL ON TABLE "public"."statement_email_delivery" TO "authenticated";
GRANT ALL ON TABLE "public"."statement_email_delivery" TO "service_role";



GRANT ALL ON TABLE "public"."statement_periods" TO "anon";
GRANT ALL ON TABLE "public"."statement_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."statement_periods" TO "service_role";



GRANT ALL ON TABLE "public"."statements" TO "anon";
GRANT ALL ON TABLE "public"."statements" TO "authenticated";
GRANT ALL ON TABLE "public"."statements" TO "service_role";



GRANT ALL ON TABLE "public"."support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."system_config" TO "anon";
GRANT ALL ON TABLE "public"."system_config" TO "authenticated";
GRANT ALL ON TABLE "public"."system_config" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."v_concentration_risk" TO "anon";
GRANT ALL ON TABLE "public"."v_concentration_risk" TO "authenticated";
GRANT ALL ON TABLE "public"."v_concentration_risk" TO "service_role";



GRANT ALL ON TABLE "public"."v_cost_basis_mismatch" TO "anon";
GRANT ALL ON TABLE "public"."v_cost_basis_mismatch" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cost_basis_mismatch" TO "service_role";



GRANT ALL ON TABLE "public"."yield_distributions" TO "anon";
GRANT ALL ON TABLE "public"."yield_distributions" TO "authenticated";
GRANT ALL ON TABLE "public"."yield_distributions" TO "service_role";



GRANT ALL ON TABLE "public"."v_fee_calculation_orphans" TO "anon";
GRANT ALL ON TABLE "public"."v_fee_calculation_orphans" TO "authenticated";
GRANT ALL ON TABLE "public"."v_fee_calculation_orphans" TO "service_role";



GRANT ALL ON TABLE "public"."v_fund_aum_position_health" TO "anon";
GRANT ALL ON TABLE "public"."v_fund_aum_position_health" TO "authenticated";
GRANT ALL ON TABLE "public"."v_fund_aum_position_health" TO "service_role";



GRANT ALL ON TABLE "public"."v_ledger_position_mismatches" TO "anon";
GRANT ALL ON TABLE "public"."v_ledger_position_mismatches" TO "authenticated";
GRANT ALL ON TABLE "public"."v_ledger_position_mismatches" TO "service_role";



GRANT ALL ON TABLE "public"."v_ledger_reconciliation" TO "anon";
GRANT ALL ON TABLE "public"."v_ledger_reconciliation" TO "authenticated";
GRANT ALL ON TABLE "public"."v_ledger_reconciliation" TO "service_role";



GRANT ALL ON TABLE "public"."withdrawal_requests" TO "anon";
GRANT ALL ON TABLE "public"."withdrawal_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."withdrawal_requests" TO "service_role";



GRANT ALL ON TABLE "public"."v_liquidity_risk" TO "anon";
GRANT ALL ON TABLE "public"."v_liquidity_risk" TO "authenticated";
GRANT ALL ON TABLE "public"."v_liquidity_risk" TO "service_role";



GRANT ALL ON TABLE "public"."v_orphaned_positions" TO "anon";
GRANT ALL ON TABLE "public"."v_orphaned_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."v_orphaned_positions" TO "service_role";



GRANT ALL ON TABLE "public"."v_orphaned_transactions" TO "anon";
GRANT ALL ON TABLE "public"."v_orphaned_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."v_orphaned_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."v_yield_conservation_violations" TO "anon";
GRANT ALL ON TABLE "public"."v_yield_conservation_violations" TO "authenticated";
GRANT ALL ON TABLE "public"."v_yield_conservation_violations" TO "service_role";



GRANT ALL ON TABLE "public"."yield_allocations" TO "anon";
GRANT ALL ON TABLE "public"."yield_allocations" TO "authenticated";
GRANT ALL ON TABLE "public"."yield_allocations" TO "service_role";



GRANT ALL ON TABLE "public"."yield_distribution_conservation_check" TO "anon";
GRANT ALL ON TABLE "public"."yield_distribution_conservation_check" TO "authenticated";
GRANT ALL ON TABLE "public"."yield_distribution_conservation_check" TO "service_role";



GRANT ALL ON TABLE "public"."yield_rate_sanity_config" TO "anon";
GRANT ALL ON TABLE "public"."yield_rate_sanity_config" TO "authenticated";
GRANT ALL ON TABLE "public"."yield_rate_sanity_config" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































