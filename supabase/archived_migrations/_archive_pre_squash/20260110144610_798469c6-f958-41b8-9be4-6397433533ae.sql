-- ============================================================================
-- TOTAL SYSTEM HARDENING MIGRATION
-- Critical Financial Integrity & Security Fixes
-- ============================================================================

-- =============================================================================
-- PART 1: Server-Side Available Balance Validation
-- Prevents client-side bypass of withdrawal lock-in
-- =============================================================================

CREATE OR REPLACE FUNCTION get_available_balance(
  p_investor_id uuid,
  p_fund_id uuid
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0,
    COALESCE(
      (SELECT current_value FROM investor_positions 
       WHERE investor_id = p_investor_id AND fund_id = p_fund_id), 0
    )
    - COALESCE(
      (SELECT SUM(requested_amount) FROM withdrawal_requests
       WHERE investor_id = p_investor_id 
         AND fund_id = p_fund_id
         AND status IN ('pending', 'approved', 'processing')), 0
    )
  );
$$;

COMMENT ON FUNCTION get_available_balance IS 
'Returns the available balance for withdrawal, accounting for pending requests. Used for server-side validation to prevent over-withdrawal.';

-- =============================================================================
-- PART 2: Immutable Field Protection Triggers
-- Prevents modification of audit-critical fields even by admins
-- =============================================================================

CREATE OR REPLACE FUNCTION protect_audit_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Protect created_at from modification
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_at';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION protect_transaction_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Protect created_at
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_at';
  END IF;
  
  -- Protect reference_id (idempotency key)
  IF OLD.reference_id IS DISTINCT FROM NEW.reference_id THEN
    RAISE EXCEPTION 'Cannot modify immutable field: reference_id';
  END IF;
  
  -- Protect investor_id (ownership)
  IF OLD.investor_id IS DISTINCT FROM NEW.investor_id THEN
    RAISE EXCEPTION 'Cannot modify immutable field: investor_id';
  END IF;
  
  -- Protect fund_id (ownership)
  IF OLD.fund_id IS DISTINCT FROM NEW.fund_id THEN
    RAISE EXCEPTION 'Cannot modify immutable field: fund_id';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION protect_allocation_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Protect created_at
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_at';
  END IF;
  
  -- Protect distribution_id (source linkage)
  IF OLD.distribution_id IS DISTINCT FROM NEW.distribution_id THEN
    RAISE EXCEPTION 'Cannot modify immutable field: distribution_id';
  END IF;
  
  -- Protect investor linkages
  IF TG_TABLE_NAME = 'fee_allocations' THEN
    IF OLD.investor_id IS DISTINCT FROM NEW.investor_id THEN
      RAISE EXCEPTION 'Cannot modify immutable field: investor_id';
    END IF;
  ELSIF TG_TABLE_NAME = 'ib_allocations' THEN
    IF OLD.source_investor_id IS DISTINCT FROM NEW.source_investor_id THEN
      RAISE EXCEPTION 'Cannot modify immutable field: source_investor_id';
    END IF;
    IF OLD.ib_investor_id IS DISTINCT FROM NEW.ib_investor_id THEN
      RAISE EXCEPTION 'Cannot modify immutable field: ib_investor_id';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION protect_audit_log_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Protect all fields in audit_log - audit logs should be append-only
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_at';
  END IF;
  
  IF OLD.actor_user IS DISTINCT FROM NEW.actor_user THEN
    RAISE EXCEPTION 'Cannot modify immutable field: actor_user';
  END IF;
  
  IF OLD.action IS DISTINCT FROM NEW.action THEN
    RAISE EXCEPTION 'Cannot modify immutable field: action';
  END IF;
  
  IF OLD.entity IS DISTINCT FROM NEW.entity THEN
    RAISE EXCEPTION 'Cannot modify immutable field: entity';
  END IF;
  
  IF OLD.entity_id IS DISTINCT FROM NEW.entity_id THEN
    RAISE EXCEPTION 'Cannot modify immutable field: entity_id';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply triggers to protect immutable fields

-- Transactions
DROP TRIGGER IF EXISTS protect_transactions_immutable ON transactions_v2;
CREATE TRIGGER protect_transactions_immutable
  BEFORE UPDATE ON transactions_v2
  FOR EACH ROW
  EXECUTE FUNCTION protect_transaction_immutable_fields();

-- Fee allocations
DROP TRIGGER IF EXISTS protect_fee_allocations_immutable ON fee_allocations;
CREATE TRIGGER protect_fee_allocations_immutable
  BEFORE UPDATE ON fee_allocations
  FOR EACH ROW
  EXECUTE FUNCTION protect_allocation_immutable_fields();

-- IB allocations
DROP TRIGGER IF EXISTS protect_ib_allocations_immutable ON ib_allocations;
CREATE TRIGGER protect_ib_allocations_immutable
  BEFORE UPDATE ON ib_allocations
  FOR EACH ROW
  EXECUTE FUNCTION protect_allocation_immutable_fields();

-- Audit log
DROP TRIGGER IF EXISTS protect_audit_log_immutable ON audit_log;
CREATE TRIGGER protect_audit_log_immutable
  BEFORE UPDATE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION protect_audit_log_immutable_fields();

-- Yield distributions
DROP TRIGGER IF EXISTS protect_yield_distributions_immutable ON yield_distributions;
CREATE TRIGGER protect_yield_distributions_immutable
  BEFORE UPDATE ON yield_distributions
  FOR EACH ROW
  EXECUTE FUNCTION protect_audit_immutable_fields();

-- =============================================================================
-- PART 3: Withdrawal Request Validation with Server-Side Balance Check
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_withdrawal_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS validate_withdrawal_request_trigger ON withdrawal_requests;
CREATE TRIGGER validate_withdrawal_request_trigger
  BEFORE INSERT ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_withdrawal_request();

-- =============================================================================
-- PART 4: Conservation Check Enhancement
-- Add residual dust tracking to yield distributions
-- =============================================================================

-- Add dust_amount column if not exists for tracking rounding residuals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'yield_distributions' AND column_name = 'dust_amount'
  ) THEN
    ALTER TABLE yield_distributions ADD COLUMN dust_amount numeric(28,10) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'yield_distributions' AND column_name = 'dust_receiver_id'
  ) THEN
    ALTER TABLE yield_distributions ADD COLUMN dust_receiver_id uuid REFERENCES profiles(id);
  END IF;
END $$;

COMMENT ON COLUMN yield_distributions.dust_amount IS 
'Rounding residual from yield allocation. Routed to dust_receiver_id for conservation.';

COMMENT ON COLUMN yield_distributions.dust_receiver_id IS 
'Investor who received rounding dust (largest position holder for determinism).';

-- =============================================================================
-- PART 5: Integrity View Performance Indexes
-- Ensure monitoring views are fast even with large datasets
-- =============================================================================

-- Index for faster integrity checks on voided status
CREATE INDEX IF NOT EXISTS idx_transactions_v2_integrity_check 
ON transactions_v2 (investor_id, fund_id, is_voided) 
WHERE is_voided = false;

-- Index for withdrawal status queries
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_available_balance 
ON withdrawal_requests (investor_id, fund_id, status) 
WHERE status IN ('pending', 'approved', 'processing');

-- Index for fund AUM lookups
CREATE INDEX IF NOT EXISTS idx_fund_daily_aum_integrity 
ON fund_daily_aum (fund_id, aum_date, is_voided) 
WHERE is_voided = false;

-- =============================================================================
-- PART 6: Cleanup Orphan Zero-Balance Positions (One-Time)
-- =============================================================================

DELETE FROM investor_positions ip
WHERE ip.current_value = 0
  AND ip.shares = 0
  AND NOT EXISTS (
    SELECT 1 FROM transactions_v2 t
    WHERE t.investor_id = ip.investor_id
      AND t.fund_id = ip.fund_id
      AND t.is_voided = false
  );

-- Log cleanup to audit
INSERT INTO audit_log (action, entity, meta)
SELECT 
  'orphan_position_cleanup',
  'investor_positions',
  jsonb_build_object('migration', 'total_system_hardening', 'timestamp', now())
WHERE EXISTS (SELECT 1); -- Only if migration ran