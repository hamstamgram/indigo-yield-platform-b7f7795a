-- Audit Trail Cascade Cleanup on Void/Delete Operations
-- Ensures audit entries are properly cleaned or marked when parent records are voided

-- ============================================================
-- PART 0: Add voided_record column to data_edit_audit for tracking
-- ============================================================

ALTER TABLE data_edit_audit 
ADD COLUMN IF NOT EXISTS voided_record boolean DEFAULT false;

COMMENT ON COLUMN data_edit_audit.voided_record IS 
'True if the parent record being audited has been voided';

-- ============================================================
-- PART 1: Create function to void investor_yield_events for a distribution
-- ============================================================

CREATE OR REPLACE FUNCTION public.void_investor_yield_events_for_distribution(
  p_distribution_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Distribution voided'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE investor_yield_events
  SET is_voided = true,
      voided_at = now(),
      voided_by = p_admin_id
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

COMMENT ON FUNCTION public.void_investor_yield_events_for_distribution IS 
'Voids all investor_yield_events linked to a yield distribution';

-- ============================================================
-- PART 2: Create trigger to auto-void yield events when distribution is voided
-- ============================================================

CREATE OR REPLACE FUNCTION public.cascade_void_to_yield_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When yield_distribution status changes to 'voided', void related events
  IF NEW.status = 'voided' AND (OLD.status IS NULL OR OLD.status != 'voided') THEN
    UPDATE investor_yield_events
    SET is_voided = true,
        voided_at = now(),
        voided_by = NEW.voided_by
    WHERE reference_id = NEW.id::text
      AND is_voided = false;
    
    -- Mark related data_edit_audit entries as voided_record
    UPDATE data_edit_audit
    SET voided_record = true
    WHERE record_id = NEW.id
      AND table_name = 'yield_distributions';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_void_to_yield_events ON yield_distributions;

CREATE TRIGGER trg_cascade_void_to_yield_events
AFTER UPDATE ON yield_distributions
FOR EACH ROW
WHEN (NEW.status = 'voided' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'voided'))
EXECUTE FUNCTION cascade_void_to_yield_events();

COMMENT ON FUNCTION public.cascade_void_to_yield_events IS 
'Cascades void status from yield_distributions to investor_yield_events';

-- ============================================================
-- PART 3: Create trigger to cascade void to fee_allocations and ib_allocations
-- ============================================================

CREATE OR REPLACE FUNCTION public.cascade_void_to_allocations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When yield_distribution is voided, void related fee and IB allocations
  IF NEW.status = 'voided' AND (OLD.status IS NULL OR OLD.status != 'voided') THEN
    -- Void fee allocations
    UPDATE fee_allocations
    SET is_voided = true,
        voided_at = now(),
        voided_by = NEW.voided_by
    WHERE distribution_id = NEW.id
      AND is_voided = false;
    
    -- Void IB allocations
    UPDATE ib_allocations
    SET is_voided = true,
        voided_at = now(),
        voided_by = NEW.voided_by
    WHERE distribution_id = NEW.id
      AND is_voided = false;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_void_to_allocations ON yield_distributions;

CREATE TRIGGER trg_cascade_void_to_allocations
AFTER UPDATE ON yield_distributions
FOR EACH ROW
WHEN (NEW.status = 'voided' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'voided'))
EXECUTE FUNCTION cascade_void_to_allocations();

COMMENT ON FUNCTION public.cascade_void_to_allocations IS 
'Cascades void status from yield_distributions to fee_allocations and ib_allocations';

-- ============================================================
-- PART 4: Create trigger to cascade void from transactions to related records
-- ============================================================

CREATE OR REPLACE FUNCTION public.cascade_void_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a transaction is voided, mark related audit entries
  IF NEW.is_voided = true AND (OLD.is_voided IS NULL OR OLD.is_voided = false) THEN
    -- Mark data_edit_audit entries for this transaction as voided_record
    UPDATE data_edit_audit
    SET voided_record = true
    WHERE record_id = NEW.id
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

DROP TRIGGER IF EXISTS trg_cascade_void_from_transaction ON transactions_v2;

CREATE TRIGGER trg_cascade_void_from_transaction
AFTER UPDATE ON transactions_v2
FOR EACH ROW
WHEN (NEW.is_voided = true AND (OLD.is_voided IS NULL OR OLD.is_voided = false))
EXECUTE FUNCTION cascade_void_from_transaction();

COMMENT ON FUNCTION public.cascade_void_from_transaction IS 
'Cascades void status from transactions to related allocations and audit entries';

-- ============================================================
-- PART 5: Create trigger to handle withdrawal cancellation audit
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_withdrawal_audit_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When withdrawal is cancelled, add a final audit entry
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    INSERT INTO withdrawal_audit_logs (request_id, action, actor_id, details)
    VALUES (
      NEW.id,
      'cancel'::withdrawal_audit_action,
      COALESCE(NEW.cancelled_by, auth.uid()),
      jsonb_build_object(
        'reason', NEW.cancellation_reason,
        'previous_status', OLD.status,
        'cancelled_at', now()
      )
    );
    
    -- Mark related audit_log entries
    UPDATE audit_log
    SET meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('cancelled', true)
    WHERE entity = 'withdrawal_requests'
      AND entity_id = NEW.id::text;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_cancel_audit ON withdrawal_requests;

CREATE TRIGGER trg_withdrawal_cancel_audit
AFTER UPDATE ON withdrawal_requests
FOR EACH ROW
WHEN (NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'cancelled'))
EXECUTE FUNCTION cleanup_withdrawal_audit_on_cancel();

COMMENT ON FUNCTION public.cleanup_withdrawal_audit_on_cancel IS 
'Logs withdrawal cancellation to audit tables';

-- ============================================================
-- PART 6: One-time cleanup of existing orphaned audit entries
-- ============================================================

-- Mark existing data_edit_audit entries for voided transactions
UPDATE data_edit_audit
SET voided_record = true
WHERE table_name = 'transactions_v2'
  AND record_id IN (
    SELECT id FROM transactions_v2 WHERE is_voided = true
  );

-- Mark existing data_edit_audit entries for voided yield distributions
UPDATE data_edit_audit
SET voided_record = true
WHERE table_name = 'yield_distributions'
  AND record_id IN (
    SELECT id FROM yield_distributions WHERE status = 'voided'
  );

-- Void any investor_yield_events for voided distributions
UPDATE investor_yield_events iye
SET is_voided = true,
    voided_at = now()
FROM yield_distributions yd
WHERE iye.reference_id = yd.id::text
  AND yd.status = 'voided'
  AND iye.is_voided = false;

-- Void any fee_allocations for voided distributions
UPDATE fee_allocations fa
SET is_voided = true,
    voided_at = now()
FROM yield_distributions yd
WHERE fa.distribution_id = yd.id
  AND yd.status = 'voided'
  AND fa.is_voided = false;

-- Void any ib_allocations for voided distributions
UPDATE ib_allocations ia
SET is_voided = true,
    voided_at = now()
FROM yield_distributions yd
WHERE ia.distribution_id = yd.id
  AND yd.status = 'voided'
  AND ia.is_voided = false;

-- Void fee_allocations linked to voided transactions
UPDATE fee_allocations
SET is_voided = true,
    voided_at = now()
WHERE is_voided = false
  AND (
    debit_transaction_id IN (SELECT id FROM transactions_v2 WHERE is_voided = true)
    OR credit_transaction_id IN (SELECT id FROM transactions_v2 WHERE is_voided = true)
  );