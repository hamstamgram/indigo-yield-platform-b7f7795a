-- Add AUM preflow validation functions
-- Purpose: Ensure AUM records exist before deposit/withdrawal processing
-- Part of remediation plan P0-001

-- Function to validate AUM exists for transaction date
CREATE OR REPLACE FUNCTION public.validate_transaction_aum_exists(
  p_fund_id UUID,
  p_tx_date DATE,
  p_purpose aum_purpose DEFAULT 'transaction'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_aum_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM fund_daily_aum
    WHERE fund_id = p_fund_id::text
      AND aum_date = p_tx_date
      AND purpose = p_purpose
      AND is_voided = false
  ) INTO v_aum_exists;

  RETURN v_aum_exists;
END;
$$;

COMMENT ON FUNCTION validate_transaction_aum_exists(UUID, DATE, aum_purpose) IS
'Validates that AUM record exists for transaction date before allowing deposit/withdrawal. Returns true if valid AUM exists.';

-- Function to get the correct AUM for transaction processing
CREATE OR REPLACE FUNCTION public.get_transaction_aum(
  p_fund_id UUID,
  p_tx_date DATE,
  p_purpose aum_purpose DEFAULT 'transaction'
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_aum NUMERIC;
BEGIN
  SELECT total_aum INTO v_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id::text
    AND aum_date = p_tx_date
    AND purpose = p_purpose
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_aum IS NULL THEN
    RAISE EXCEPTION 'No AUM record found for fund % on date % with purpose %',
      p_fund_id, p_tx_date, p_purpose;
  END IF;

  RETURN v_aum;
END;
$$;

COMMENT ON FUNCTION get_transaction_aum(UUID, DATE, aum_purpose) IS
'Gets the AUM value for transaction processing. Raises exception if no valid AUM exists.';

-- Function to create transaction-purpose AUM if needed
CREATE OR REPLACE FUNCTION public.ensure_transaction_aum(
  p_fund_id UUID,
  p_tx_date DATE,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transaction_aum NUMERIC;
  v_reporting_aum NUMERIC;
  v_pending_deposits NUMERIC;
  v_pending_withdrawals NUMERIC;
  v_result JSONB;
  v_aum_id UUID;
BEGIN
  -- Check if transaction AUM already exists
  SELECT total_aum INTO v_transaction_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id::text
    AND aum_date = p_tx_date
    AND purpose = 'transaction'
    AND is_voided = false;

  IF v_transaction_aum IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'exists',
      'aum', v_transaction_aum,
      'message', 'Transaction AUM already exists'
    );
  END IF;

  -- Get reporting AUM as base
  SELECT total_aum INTO v_reporting_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id::text
    AND aum_date = p_tx_date
    AND purpose = 'reporting'
    AND is_voided = false;

  IF v_reporting_aum IS NULL THEN
    -- Fall back to most recent reporting AUM
    SELECT total_aum INTO v_reporting_aum
    FROM fund_daily_aum
    WHERE fund_id = p_fund_id::text
      AND aum_date <= p_tx_date
      AND purpose = 'reporting'
      AND is_voided = false
    ORDER BY aum_date DESC
    LIMIT 1;
  END IF;

  IF v_reporting_aum IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error', 'No reporting AUM available as base',
      'fund_id', p_fund_id,
      'tx_date', p_tx_date
    );
  END IF;

  -- Calculate pending transactions (approved but not completed withdrawals)
  SELECT COALESCE(SUM(requested_amount), 0) INTO v_pending_withdrawals
  FROM withdrawal_requests
  WHERE fund_id = p_fund_id
    AND status IN ('approved', 'processing')
    AND request_date <= p_tx_date;

  -- Transaction AUM = Reporting AUM - Pending Withdrawals
  v_transaction_aum := v_reporting_aum - v_pending_withdrawals;

  -- Create the transaction AUM record
  INSERT INTO fund_daily_aum (
    fund_id,
    aum_date,
    total_aum,
    purpose,
    source,
    created_by
  ) VALUES (
    p_fund_id::text,
    p_tx_date,
    v_transaction_aum,
    'transaction',
    'auto_generated_preflow',
    p_admin_id
  ) RETURNING id INTO v_aum_id;

  RETURN jsonb_build_object(
    'status', 'created',
    'aum_id', v_aum_id,
    'aum', v_transaction_aum,
    'base_reporting_aum', v_reporting_aum,
    'pending_withdrawals', v_pending_withdrawals,
    'message', 'Transaction AUM created from reporting AUM minus pending withdrawals'
  );
END;
$$;

COMMENT ON FUNCTION ensure_transaction_aum(UUID, DATE, UUID) IS
'Ensures a transaction-purpose AUM exists for the given date. Creates one from reporting AUM if needed, accounting for pending withdrawals.';

-- Function to check all funds have transaction AUM for a date
CREATE OR REPLACE FUNCTION public.check_all_funds_transaction_aum(
  p_tx_date DATE
)
RETURNS TABLE(
  fund_id UUID,
  fund_code TEXT,
  has_reporting_aum BOOLEAN,
  has_transaction_aum BOOLEAN,
  reporting_aum NUMERIC,
  transaction_aum NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id as fund_id,
    f.code as fund_code,
    EXISTS (
      SELECT 1 FROM fund_daily_aum fda
      WHERE fda.fund_id = f.id::text
        AND fda.aum_date = p_tx_date
        AND fda.purpose = 'reporting'
        AND fda.is_voided = false
    ) as has_reporting_aum,
    EXISTS (
      SELECT 1 FROM fund_daily_aum fda
      WHERE fda.fund_id = f.id::text
        AND fda.aum_date = p_tx_date
        AND fda.purpose = 'transaction'
        AND fda.is_voided = false
    ) as has_transaction_aum,
    (
      SELECT fda.total_aum FROM fund_daily_aum fda
      WHERE fda.fund_id = f.id::text
        AND fda.aum_date = p_tx_date
        AND fda.purpose = 'reporting'
        AND fda.is_voided = false
      LIMIT 1
    ) as reporting_aum,
    (
      SELECT fda.total_aum FROM fund_daily_aum fda
      WHERE fda.fund_id = f.id::text
        AND fda.aum_date = p_tx_date
        AND fda.purpose = 'transaction'
        AND fda.is_voided = false
      LIMIT 1
    ) as transaction_aum
  FROM funds f
  WHERE f.status = 'active';
END;
$$;

COMMENT ON FUNCTION check_all_funds_transaction_aum(DATE) IS
'Checks all active funds for AUM availability on a given date. Used for daily preflow validation.';

-- Add comments
COMMENT ON FUNCTION validate_transaction_aum_exists IS 'P0-001: Validates AUM preflow for deposits/withdrawals';
COMMENT ON FUNCTION get_transaction_aum IS 'P0-001: Gets transaction-purpose AUM for crystallization';
COMMENT ON FUNCTION ensure_transaction_aum IS 'P0-001: Auto-creates transaction AUM from reporting AUM';
