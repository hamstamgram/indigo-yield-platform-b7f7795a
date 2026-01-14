-- ============================================================================
-- TYPED ERROR CONTRACT - Finance-Grade Error Handling
-- Migration: 20260114190000_typed_error_contract.sql
-- Purpose: Standardize DB -> RPC -> UI error mapping
-- ============================================================================

-- ============================================================================
-- SECTION 1: ERROR CODE ENUM
-- ============================================================================

-- Create error code enum for typed errors
DO $$ BEGIN
  CREATE TYPE platform_error_code AS ENUM (
    -- AUM & Preflow Errors
    'PREFLOW_AUM_MISSING',
    'AUM_NOT_FOUND',
    'AUM_ALREADY_EXISTS',
    'AUM_DUPLICATE_PREFLOW',

    -- Period & Date Errors
    'PERIOD_LOCKED',
    'PERIOD_NOT_FOUND',
    'ECONOMIC_DATE_REQUIRED',
    'FUTURE_DATE_NOT_ALLOWED',
    'BACKDATED_NOT_ALLOWED',

    -- Ledger & Transaction Errors
    'LEDGER_IMMUTABLE',
    'TRANSACTION_NOT_FOUND',
    'TRANSACTION_ALREADY_VOIDED',
    'INSUFFICIENT_BALANCE',
    'INVALID_TRANSACTION_TYPE',

    -- Asset & Currency Errors
    'ASSET_MISMATCH',
    'INVALID_ASSET',

    -- Yield & Distribution Errors
    'YIELD_CONSERVATION_VIOLATION',
    'DUST_TOLERANCE_EXCEEDED',
    'NO_POSITIONS_FOR_YIELD',

    -- Fund Errors
    'FUND_NOT_FOUND',
    'FUND_INACTIVE',

    -- Investor Errors
    'INVESTOR_NOT_FOUND',
    'INVESTOR_POSITION_NOT_FOUND',
    'INVESTOR_NOT_IN_FUND',

    -- Approval & Permission Errors
    'APPROVAL_REQUIRED',
    'APPROVAL_PENDING',
    'SELF_APPROVAL_NOT_ALLOWED',
    'UNAUTHORIZED',
    'ADMIN_REQUIRED',

    -- Validation Errors
    'VALIDATION_ERROR',
    'REQUIRED_FIELD_MISSING',
    'INVALID_AMOUNT',
    'INVALID_DATE',
    'INVALID_PURPOSE',

    -- System Errors
    'SYSTEM_ERROR',
    'INVARIANT_VIOLATION',
    'CONCURRENCY_ERROR',

    -- Staging & Import Errors
    'STAGING_VALIDATION_FAILED',
    'STAGING_BATCH_NOT_FOUND',
    'STAGING_ALREADY_PROMOTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SECTION 2: ERROR CATEGORY ENUM
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE error_category AS ENUM (
    'VALIDATION',      -- Input validation errors (user can fix)
    'BUSINESS_RULE',   -- Business logic violations
    'STATE',           -- Invalid state for operation
    'PERMISSION',      -- Authorization errors
    'NOT_FOUND',       -- Resource not found
    'CONFLICT',        -- Concurrency/duplicate errors
    'SYSTEM'           -- Internal system errors
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SECTION 3: ERROR METADATA TABLE (for UI message mapping)
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_code_metadata (
  error_code text PRIMARY KEY,
  category text NOT NULL,
  default_message text NOT NULL,
  user_action_hint text,         -- What the user should do
  ui_action text,                -- Suggested UI behavior
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
  is_retryable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE error_code_metadata ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read error metadata
DROP POLICY IF EXISTS "error_metadata_read" ON error_code_metadata;
CREATE POLICY "error_metadata_read" ON error_code_metadata
  FOR SELECT TO authenticated USING (true);

-- Populate error metadata
INSERT INTO error_code_metadata (error_code, category, default_message, user_action_hint, ui_action, severity, is_retryable)
VALUES
  -- AUM & Preflow Errors
  ('PREFLOW_AUM_MISSING', 'STATE',
   'No preflow AUM record exists for this fund and date.',
   'Create a preflow AUM record before proceeding.',
   'OPEN_PREFLOW_AUM_MODAL', 'error', false),

  ('AUM_NOT_FOUND', 'NOT_FOUND',
   'AUM record not found.',
   'Verify the fund and date are correct.',
   'SHOW_ERROR', 'error', false),

  ('AUM_ALREADY_EXISTS', 'CONFLICT',
   'An AUM record already exists for this fund, date, and purpose.',
   'Use the existing AUM record or update it.',
   'SHOW_EXISTING_AUM', 'warning', false),

  ('AUM_DUPLICATE_PREFLOW', 'CONFLICT',
   'Duplicate preflow AUM records detected.',
   'Run cleanup to remove duplicates.',
   'SHOW_ERROR', 'error', false),

  -- Period & Date Errors
  ('PERIOD_LOCKED', 'STATE',
   'This accounting period is locked.',
   'Request an unlock from the finance team before making changes.',
   'SHOW_UNLOCK_REQUEST', 'error', false),

  ('PERIOD_NOT_FOUND', 'NOT_FOUND',
   'Accounting period not found.',
   'Verify the date range is correct.',
   'SHOW_ERROR', 'error', false),

  ('ECONOMIC_DATE_REQUIRED', 'VALIDATION',
   'Transaction date is required.',
   'Select a valid transaction date.',
   'FOCUS_DATE_FIELD', 'error', false),

  ('FUTURE_DATE_NOT_ALLOWED', 'VALIDATION',
   'Future dates are not allowed in live mode.',
   'Select today''s date or an earlier date.',
   'FOCUS_DATE_FIELD', 'error', false),

  ('BACKDATED_NOT_ALLOWED', 'STATE',
   'Backdating into a locked period is not allowed.',
   'Select a date in an open period or request an unlock.',
   'FOCUS_DATE_FIELD', 'error', false),

  -- Ledger & Transaction Errors
  ('LEDGER_IMMUTABLE', 'BUSINESS_RULE',
   'Transactions cannot be edited after creation.',
   'Use Void and Reissue to correct this transaction.',
   'SHOW_VOID_REISSUE_OPTION', 'error', false),

  ('TRANSACTION_NOT_FOUND', 'NOT_FOUND',
   'Transaction not found.',
   'Verify the transaction ID is correct.',
   'SHOW_ERROR', 'error', false),

  ('TRANSACTION_ALREADY_VOIDED', 'STATE',
   'This transaction has already been voided.',
   'No further action is needed.',
   'SHOW_VOIDED_STATUS', 'warning', false),

  ('INSUFFICIENT_BALANCE', 'BUSINESS_RULE',
   'Insufficient balance for this withdrawal.',
   'Reduce the withdrawal amount or void related withdrawals first.',
   'SHOW_BALANCE_INFO', 'error', false),

  ('INVALID_TRANSACTION_TYPE', 'VALIDATION',
   'Invalid transaction type.',
   'Use a valid transaction type: DEPOSIT, WITHDRAWAL, YIELD, etc.',
   'SHOW_ERROR', 'error', false),

  -- Asset & Currency Errors
  ('ASSET_MISMATCH', 'VALIDATION',
   'Transaction asset does not match fund base asset.',
   'Use the fund''s native currency for all transactions.',
   'LOCK_ASSET_FIELD', 'error', false),

  ('INVALID_ASSET', 'VALIDATION',
   'Invalid asset code.',
   'Select a valid asset from the list.',
   'SHOW_ERROR', 'error', false),

  -- Yield & Distribution Errors
  ('YIELD_CONSERVATION_VIOLATION', 'SYSTEM',
   'Yield conservation violated: gross must equal net + fees.',
   'Contact support. This is a system error.',
   'SHOW_ERROR', 'critical', false),

  ('DUST_TOLERANCE_EXCEEDED', 'BUSINESS_RULE',
   'Rounding difference exceeds dust tolerance.',
   'Review the calculation for accuracy.',
   'SHOW_ERROR', 'error', false),

  ('NO_POSITIONS_FOR_YIELD', 'STATE',
   'No investor positions found for yield distribution.',
   'Ensure investors have positions before distributing yield.',
   'SHOW_ERROR', 'error', false),

  -- Fund Errors
  ('FUND_NOT_FOUND', 'NOT_FOUND',
   'Fund not found.',
   'Verify the fund ID is correct.',
   'SHOW_ERROR', 'error', false),

  ('FUND_INACTIVE', 'STATE',
   'This fund is not active.',
   'Contact the administrator to activate the fund.',
   'SHOW_ERROR', 'error', false),

  -- Investor Errors
  ('INVESTOR_NOT_FOUND', 'NOT_FOUND',
   'Investor not found.',
   'Verify the investor ID is correct.',
   'SHOW_ERROR', 'error', false),

  ('INVESTOR_POSITION_NOT_FOUND', 'NOT_FOUND',
   'Investor does not have a position in this fund.',
   'Create a position for the investor first.',
   'SHOW_ERROR', 'error', false),

  ('INVESTOR_NOT_IN_FUND', 'VALIDATION',
   'Investor is not enrolled in this fund.',
   'Enroll the investor in the fund first.',
   'SHOW_ERROR', 'error', false),

  -- Approval & Permission Errors
  ('APPROVAL_REQUIRED', 'PERMISSION',
   'This action requires approval from another administrator.',
   'Submit for approval and wait for authorization.',
   'SHOW_APPROVAL_REQUEST', 'warning', false),

  ('APPROVAL_PENDING', 'STATE',
   'An approval request is already pending.',
   'Wait for the pending request to be processed.',
   'SHOW_PENDING_STATUS', 'warning', false),

  ('SELF_APPROVAL_NOT_ALLOWED', 'PERMISSION',
   'You cannot approve your own request.',
   'Another administrator must approve this action.',
   'SHOW_ERROR', 'error', false),

  ('UNAUTHORIZED', 'PERMISSION',
   'You are not authorized to perform this action.',
   'Contact an administrator for access.',
   'SHOW_ERROR', 'error', false),

  ('ADMIN_REQUIRED', 'PERMISSION',
   'Administrator privileges are required.',
   'Log in with an administrator account.',
   'SHOW_ERROR', 'error', false),

  -- Validation Errors
  ('VALIDATION_ERROR', 'VALIDATION',
   'Validation failed.',
   'Check the form for errors and try again.',
   'SHOW_FIELD_ERRORS', 'error', false),

  ('REQUIRED_FIELD_MISSING', 'VALIDATION',
   'A required field is missing.',
   'Fill in all required fields.',
   'FOCUS_FIRST_ERROR', 'error', false),

  ('INVALID_AMOUNT', 'VALIDATION',
   'Invalid amount.',
   'Enter a valid positive number.',
   'FOCUS_AMOUNT_FIELD', 'error', false),

  ('INVALID_DATE', 'VALIDATION',
   'Invalid date.',
   'Enter a valid date.',
   'FOCUS_DATE_FIELD', 'error', false),

  ('INVALID_PURPOSE', 'VALIDATION',
   'Invalid purpose. Must be "transaction" or "reporting".',
   'Select a valid purpose.',
   'SHOW_ERROR', 'error', false),

  -- System Errors
  ('SYSTEM_ERROR', 'SYSTEM',
   'An unexpected system error occurred.',
   'Please try again. If the problem persists, contact support.',
   'SHOW_ERROR', 'critical', true),

  ('INVARIANT_VIOLATION', 'SYSTEM',
   'A system invariant was violated.',
   'Contact support immediately. Do not retry.',
   'SHOW_ERROR', 'critical', false),

  ('CONCURRENCY_ERROR', 'CONFLICT',
   'The data was modified by another user.',
   'Refresh and try again.',
   'REFRESH_AND_RETRY', 'warning', true),

  -- Staging & Import Errors
  ('STAGING_VALIDATION_FAILED', 'VALIDATION',
   'Staging batch validation failed.',
   'Review and fix the errors in the staging data.',
   'SHOW_STAGING_ERRORS', 'error', false),

  ('STAGING_BATCH_NOT_FOUND', 'NOT_FOUND',
   'Staging batch not found.',
   'Verify the batch ID is correct.',
   'SHOW_ERROR', 'error', false),

  ('STAGING_ALREADY_PROMOTED', 'STATE',
   'This staging batch has already been promoted.',
   'The data has already been imported.',
   'SHOW_ERROR', 'warning', false)

ON CONFLICT (error_code) DO UPDATE SET
  category = EXCLUDED.category,
  default_message = EXCLUDED.default_message,
  user_action_hint = EXCLUDED.user_action_hint,
  ui_action = EXCLUDED.ui_action,
  severity = EXCLUDED.severity,
  is_retryable = EXCLUDED.is_retryable;

-- ============================================================================
-- SECTION 4: TYPED ERROR HELPER FUNCTIONS
-- ============================================================================

-- Function to raise a typed platform error
CREATE OR REPLACE FUNCTION raise_platform_error(
  p_error_code text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to build a typed error response (for RPC returns)
CREATE OR REPLACE FUNCTION build_error_response(
  p_error_code text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to build a success response (for consistency)
CREATE OR REPLACE FUNCTION build_success_response(
  p_data jsonb DEFAULT '{}'::jsonb,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to parse a platform error from exception message
CREATE OR REPLACE FUNCTION parse_platform_error(
  p_error_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ============================================================================
-- SECTION 5: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION raise_platform_error(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION build_error_response(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION build_success_response(jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION parse_platform_error(text) TO authenticated, service_role;

-- ============================================================================
-- SECTION 6: UPDATE CRITICAL FUNCTIONS TO USE TYPED ERRORS
-- ============================================================================

-- Update apply_deposit_with_crystallization to use typed errors
CREATE OR REPLACE FUNCTION apply_deposit_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_new_total_aum numeric,
  p_tx_date date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'transaction'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_position_id uuid;
  v_current_value numeric(28,10);
  v_transaction_id uuid;
  v_yield_crystallized numeric(28,10);
  v_new_value numeric(28,10);
  v_fund_asset text;
  v_aum_id uuid;
  v_system_mode text;
BEGIN
  -- Get system mode
  v_system_mode := get_system_mode();

  -- Validate required fields
  IF p_tx_date IS NULL THEN
    PERFORM raise_platform_error('ECONOMIC_DATE_REQUIRED', jsonb_build_object(
      'operation', 'deposit'
    ));
  END IF;

  -- Check for future date in live mode
  IF v_system_mode = 'live' AND p_tx_date > CURRENT_DATE THEN
    PERFORM raise_platform_error('FUTURE_DATE_NOT_ALLOWED', jsonb_build_object(
      'provided_date', p_tx_date,
      'current_date', CURRENT_DATE,
      'system_mode', v_system_mode
    ));
  END IF;

  -- Check if period is locked
  IF is_period_locked(p_fund_id, p_tx_date) THEN
    PERFORM raise_platform_error('PERIOD_LOCKED', jsonb_build_object(
      'fund_id', p_fund_id,
      'tx_date', p_tx_date
    ));
  END IF;

  -- Validate purpose
  IF p_purpose != 'transaction' THEN
    PERFORM raise_platform_error('INVALID_PURPOSE', jsonb_build_object(
      'provided_purpose', p_purpose,
      'required_purpose', 'transaction'
    ));
  END IF;

  -- Get fund asset for native currency enforcement
  SELECT asset INTO v_fund_asset FROM funds WHERE id = p_fund_id;
  IF v_fund_asset IS NULL THEN
    PERFORM raise_platform_error('FUND_NOT_FOUND', jsonb_build_object(
      'fund_id', p_fund_id
    ));
  END IF;

  -- Check transaction-purpose AUM exists
  SELECT id INTO v_aum_id
  FROM fund_aum
  WHERE fund_id = p_fund_id
    AND effective_date = p_tx_date
    AND purpose = 'transaction'
    AND NOT voided;

  IF v_aum_id IS NULL THEN
    PERFORM raise_platform_error('PREFLOW_AUM_MISSING', jsonb_build_object(
      'fund_id', p_fund_id,
      'tx_date', p_tx_date,
      'purpose', 'transaction'
    ));
  END IF;

  -- Get or create investor position
  SELECT id, current_value INTO v_position_id, v_current_value
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  IF v_position_id IS NULL THEN
    v_current_value := 0;
    INSERT INTO investor_positions (investor_id, fund_id, current_value)
    VALUES (p_investor_id, p_fund_id, 0)
    RETURNING id INTO v_position_id;
  END IF;

  -- Crystallize any accrued yield BEFORE the deposit
  v_yield_crystallized := crystallize_yield_before_flow(
    p_fund_id, p_investor_id, p_tx_date, p_purpose
  );

  -- Re-fetch current value after crystallization
  SELECT current_value INTO v_current_value
  FROM investor_positions
  WHERE id = v_position_id;

  -- Calculate new value
  v_new_value := v_current_value + p_amount;

  -- Insert transaction in native currency
  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, created_by, notes, asset
  )
  VALUES (
    p_fund_id, p_investor_id, 'DEPOSIT', p_amount, p_tx_date, p_admin_id, p_notes, v_fund_asset
  )
  RETURNING id INTO v_transaction_id;

  -- Update investor position
  UPDATE investor_positions
  SET current_value = v_new_value,
      last_activity_date = p_tx_date,
      updated_at = now()
  WHERE id = v_position_id;

  -- Update fund AUM
  UPDATE fund_aum
  SET total_aum = p_new_total_aum,
      updated_at = now()
  WHERE fund_id = p_fund_id
    AND effective_date = p_tx_date
    AND purpose = p_purpose;

  -- Audit log
  INSERT INTO audit_log (entity, action, actor_id, metadata)
  VALUES (
    'transactions_v2',
    'DEPOSIT_WITH_CRYSTALLIZATION',
    p_admin_id,
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'fund_id', p_fund_id,
      'investor_id', p_investor_id,
      'amount', p_amount,
      'asset', v_fund_asset,
      'yield_crystallized', v_yield_crystallized,
      'previous_value', v_current_value,
      'new_value', v_new_value,
      'tx_date', p_tx_date
    )
  );

  -- Return success response
  RETURN build_success_response(
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'position_id', v_position_id,
      'yield_crystallized', v_yield_crystallized,
      'previous_value', v_current_value,
      'new_value', v_new_value,
      'asset', v_fund_asset
    ),
    'Deposit applied successfully with yield crystallization'
  );
END;
$$;

-- Update apply_withdrawal_with_crystallization to use typed errors
CREATE OR REPLACE FUNCTION apply_withdrawal_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_new_total_aum numeric,
  p_tx_date date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'transaction'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_position_id uuid;
  v_current_value numeric(28,10);
  v_transaction_id uuid;
  v_yield_crystallized numeric(28,10);
  v_new_value numeric(28,10);
  v_fund_asset text;
  v_aum_id uuid;
  v_system_mode text;
BEGIN
  -- Get system mode
  v_system_mode := get_system_mode();

  -- Validate required fields
  IF p_tx_date IS NULL THEN
    PERFORM raise_platform_error('ECONOMIC_DATE_REQUIRED', jsonb_build_object(
      'operation', 'withdrawal'
    ));
  END IF;

  -- Check for future date in live mode
  IF v_system_mode = 'live' AND p_tx_date > CURRENT_DATE THEN
    PERFORM raise_platform_error('FUTURE_DATE_NOT_ALLOWED', jsonb_build_object(
      'provided_date', p_tx_date,
      'current_date', CURRENT_DATE,
      'system_mode', v_system_mode
    ));
  END IF;

  -- Check if period is locked
  IF is_period_locked(p_fund_id, p_tx_date) THEN
    PERFORM raise_platform_error('PERIOD_LOCKED', jsonb_build_object(
      'fund_id', p_fund_id,
      'tx_date', p_tx_date
    ));
  END IF;

  -- Validate purpose
  IF p_purpose != 'transaction' THEN
    PERFORM raise_platform_error('INVALID_PURPOSE', jsonb_build_object(
      'provided_purpose', p_purpose,
      'required_purpose', 'transaction'
    ));
  END IF;

  -- Get fund asset
  SELECT asset INTO v_fund_asset FROM funds WHERE id = p_fund_id;
  IF v_fund_asset IS NULL THEN
    PERFORM raise_platform_error('FUND_NOT_FOUND', jsonb_build_object(
      'fund_id', p_fund_id
    ));
  END IF;

  -- Check transaction-purpose AUM exists
  SELECT id INTO v_aum_id
  FROM fund_aum
  WHERE fund_id = p_fund_id
    AND effective_date = p_tx_date
    AND purpose = 'transaction'
    AND NOT voided;

  IF v_aum_id IS NULL THEN
    PERFORM raise_platform_error('PREFLOW_AUM_MISSING', jsonb_build_object(
      'fund_id', p_fund_id,
      'tx_date', p_tx_date,
      'purpose', 'transaction'
    ));
  END IF;

  -- Get investor position
  SELECT id, current_value INTO v_position_id, v_current_value
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  IF v_position_id IS NULL THEN
    PERFORM raise_platform_error('INVESTOR_POSITION_NOT_FOUND', jsonb_build_object(
      'investor_id', p_investor_id,
      'fund_id', p_fund_id
    ));
  END IF;

  -- Crystallize any accrued yield BEFORE the withdrawal
  v_yield_crystallized := crystallize_yield_before_flow(
    p_fund_id, p_investor_id, p_tx_date, p_purpose
  );

  -- Re-fetch current value after crystallization
  SELECT current_value INTO v_current_value
  FROM investor_positions
  WHERE id = v_position_id;

  -- Calculate new value
  v_new_value := v_current_value - p_amount;

  -- Check for insufficient balance
  IF v_new_value < 0 THEN
    PERFORM raise_platform_error('INSUFFICIENT_BALANCE', jsonb_build_object(
      'current_value', v_current_value,
      'requested_amount', p_amount,
      'shortfall', ABS(v_new_value)
    ));
  END IF;

  -- Insert transaction
  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, created_by, notes, asset
  )
  VALUES (
    p_fund_id, p_investor_id, 'WITHDRAWAL', -p_amount, p_tx_date, p_admin_id, p_notes, v_fund_asset
  )
  RETURNING id INTO v_transaction_id;

  -- Update investor position
  UPDATE investor_positions
  SET current_value = v_new_value,
      last_activity_date = p_tx_date,
      updated_at = now()
  WHERE id = v_position_id;

  -- Update fund AUM
  UPDATE fund_aum
  SET total_aum = p_new_total_aum,
      updated_at = now()
  WHERE fund_id = p_fund_id
    AND effective_date = p_tx_date
    AND purpose = p_purpose;

  -- Audit log
  INSERT INTO audit_log (entity, action, actor_id, metadata)
  VALUES (
    'transactions_v2',
    'WITHDRAWAL_WITH_CRYSTALLIZATION',
    p_admin_id,
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'fund_id', p_fund_id,
      'investor_id', p_investor_id,
      'amount', p_amount,
      'asset', v_fund_asset,
      'yield_crystallized', v_yield_crystallized,
      'previous_value', v_current_value,
      'new_value', v_new_value,
      'tx_date', p_tx_date
    )
  );

  -- Return success response
  RETURN build_success_response(
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'position_id', v_position_id,
      'yield_crystallized', v_yield_crystallized,
      'previous_value', v_current_value,
      'new_value', v_new_value,
      'asset', v_fund_asset
    ),
    'Withdrawal applied successfully with yield crystallization'
  );
END;
$$;

-- Update void_transaction to use typed errors
CREATE OR REPLACE FUNCTION void_transaction(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx record;
  v_position_id uuid;
  v_current_value numeric(28,10);
  v_new_value numeric(28,10);
  v_voided_yield_events int := 0;
BEGIN
  -- Get transaction details
  SELECT * INTO v_tx
  FROM transactions_v2
  WHERE id = p_transaction_id;

  IF v_tx IS NULL THEN
    PERFORM raise_platform_error('TRANSACTION_NOT_FOUND', jsonb_build_object(
      'transaction_id', p_transaction_id
    ));
  END IF;

  -- Check if already voided
  IF v_tx.voided THEN
    PERFORM raise_platform_error('TRANSACTION_ALREADY_VOIDED', jsonb_build_object(
      'transaction_id', p_transaction_id,
      'voided_at', v_tx.voided_at
    ));
  END IF;

  -- Check if period is locked
  IF is_period_locked(v_tx.fund_id, v_tx.tx_date) THEN
    PERFORM raise_platform_error('PERIOD_LOCKED', jsonb_build_object(
      'fund_id', v_tx.fund_id,
      'tx_date', v_tx.tx_date,
      'operation', 'void_transaction'
    ));
  END IF;

  -- Get investor position
  SELECT id, current_value INTO v_position_id, v_current_value
  FROM investor_positions
  WHERE investor_id = v_tx.investor_id AND fund_id = v_tx.fund_id;

  -- Calculate projected balance after void
  v_new_value := v_current_value - v_tx.amount;

  -- Check if void would cause negative balance (for deposits)
  IF v_tx.type = 'DEPOSIT' AND v_new_value < 0 THEN
    PERFORM raise_platform_error('INSUFFICIENT_BALANCE', jsonb_build_object(
      'current_value', v_current_value,
      'transaction_amount', v_tx.amount,
      'projected_balance', v_new_value,
      'hint', 'Void related withdrawals first'
    ));
  END IF;

  -- Void the transaction
  UPDATE transactions_v2
  SET voided = true,
      voided_at = now(),
      voided_by = p_admin_id,
      void_reason = p_reason
  WHERE id = p_transaction_id;

  -- Void any associated yield events
  UPDATE investor_yield_events
  SET voided = true,
      voided_at = now(),
      voided_by = p_admin_id,
      void_reason = 'Cascade void from transaction: ' || p_reason
  WHERE transaction_id = p_transaction_id
    AND NOT voided;
  GET DIAGNOSTICS v_voided_yield_events = ROW_COUNT;

  -- Update investor position
  UPDATE investor_positions
  SET current_value = v_new_value,
      updated_at = now()
  WHERE id = v_position_id;

  -- Audit log
  INSERT INTO audit_log (entity, action, actor_id, metadata)
  VALUES (
    'transactions_v2',
    'VOID_TRANSACTION',
    p_admin_id,
    jsonb_build_object(
      'transaction_id', p_transaction_id,
      'transaction_type', v_tx.type,
      'amount', v_tx.amount,
      'reason', p_reason,
      'previous_balance', v_current_value,
      'new_balance', v_new_value,
      'voided_yield_events', v_voided_yield_events
    )
  );

  -- Return success response
  RETURN build_success_response(
    jsonb_build_object(
      'transaction_id', p_transaction_id,
      'voided_at', now(),
      'previous_balance', v_current_value,
      'new_balance', v_new_value,
      'voided_yield_events', v_voided_yield_events
    ),
    'Transaction voided successfully'
  );
END;
$$;

-- ============================================================================
-- SECTION 7: VERIFICATION
-- ============================================================================

-- Verify error metadata was populated
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM error_code_metadata;
  RAISE NOTICE 'Typed error contract: % error codes configured', v_count;

  IF v_count < 30 THEN
    RAISE WARNING 'Expected at least 30 error codes, got %', v_count;
  END IF;
END $$;
