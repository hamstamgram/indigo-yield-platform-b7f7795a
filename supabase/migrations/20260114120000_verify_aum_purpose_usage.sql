-- Verification function for AUM purpose usage
-- Purpose: Detect inconsistencies in AUM purpose usage across tables
-- Part of remediation plan P0-001

-- Verification function for AUM purpose consistency
CREATE OR REPLACE FUNCTION public.verify_aum_purpose_usage()
RETURNS TABLE(
  issue_type TEXT,
  table_name TEXT,
  record_id UUID,
  details JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check for yield distributions without matching AUM records
  RETURN QUERY
  SELECT
    'MISSING_AUM_RECORD'::TEXT,
    'yield_distributions'::TEXT,
    yd.id,
    jsonb_build_object(
      'fund_id', yd.fund_id,
      'effective_date', yd.effective_date,
      'purpose', yd.purpose
    )
  FROM yield_distributions yd
  WHERE yd.is_voided = false
    AND NOT EXISTS (
      SELECT 1 FROM fund_daily_aum fda
      WHERE fda.fund_id = yd.fund_id::text
        AND fda.aum_date = yd.effective_date
        AND fda.purpose = yd.purpose
        AND fda.is_voided = false
    );

  -- Check for transactions with wrong visibility scope
  RETURN QUERY
  SELECT
    'VISIBILITY_MISMATCH'::TEXT,
    'transactions_v2'::TEXT,
    t.id,
    jsonb_build_object(
      'type', t.type,
      'visibility_scope', t.visibility_scope,
      'is_system_generated', t.is_system_generated
    )
  FROM transactions_v2 t
  WHERE t.is_voided = false
    AND t.is_system_generated = true
    AND t.visibility_scope = 'investor_visible'
    AND t.type IN ('FEE', 'IB_CREDIT', 'FEE_CREDIT');

  -- Check for fee allocations without linked transactions
  RETURN QUERY
  SELECT
    'ORPHANED_FEE_ALLOCATION'::TEXT,
    'fee_allocations'::TEXT,
    fa.id,
    jsonb_build_object(
      'distribution_id', fa.distribution_id,
      'investor_id', fa.investor_id,
      'fee_amount', fa.fee_amount,
      'credit_transaction_id', fa.credit_transaction_id,
      'debit_transaction_id', fa.debit_transaction_id
    )
  FROM fee_allocations fa
  WHERE fa.is_voided = false
    AND fa.fee_amount > 0
    AND (fa.credit_transaction_id IS NULL OR fa.debit_transaction_id IS NULL);

  -- Check for IB allocations without proper purpose
  RETURN QUERY
  SELECT
    'IB_ALLOCATION_NO_PURPOSE'::TEXT,
    'ib_allocations'::TEXT,
    ia.id,
    jsonb_build_object(
      'source_investor_id', ia.source_investor_id,
      'ib_investor_id', ia.ib_investor_id,
      'ib_fee_amount', ia.ib_fee_amount,
      'purpose', ia.purpose
    )
  FROM ib_allocations ia
  WHERE ia.is_voided = false
    AND ia.purpose IS NULL;

  RETURN;
END;
$$;

COMMENT ON FUNCTION verify_aum_purpose_usage() IS 'Verification function to check AUM purpose consistency across tables. Returns issues found for remediation.';

-- Create a view for easy monitoring
CREATE OR REPLACE VIEW v_aum_purpose_issues AS
SELECT * FROM verify_aum_purpose_usage();

COMMENT ON VIEW v_aum_purpose_issues IS 'View of current AUM purpose consistency issues';
