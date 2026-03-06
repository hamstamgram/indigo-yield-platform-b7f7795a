-- =============================================================================
-- P2-03: Transaction Helper Function Cleanup
-- Drop deprecated handle_ledger_transaction and document active transaction RPCs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PHASE 1: Drop deprecated function
-- -----------------------------------------------------------------------------

-- handle_ledger_transaction was deprecated (raises exception on call)
-- Safe to remove as it's never called from frontend
DROP FUNCTION IF EXISTS public.handle_ledger_transaction(uuid, uuid, numeric, text);

-- -----------------------------------------------------------------------------
-- PHASE 2: Document retained transaction functions (using specific signatures)
-- -----------------------------------------------------------------------------

-- admin_create_transaction
DO $$
DECLARE
  func_oid oid;
BEGIN
  SELECT oid INTO func_oid FROM pg_proc 
  WHERE proname = 'admin_create_transaction' 
  AND pronamespace = 'public'::regnamespace
  LIMIT 1;
  
  IF func_oid IS NOT NULL THEN
    EXECUTE format('COMMENT ON FUNCTION %s IS %L', func_oid::regprocedure,
      'CANONICAL: Creates a new transaction in the ledger. Used for manual deposits, withdrawals, and adjustments by admins. Triggers position recompute automatically. Idempotency: Uses reference_id unique constraint. Role: Requires admin role.');
  END IF;
END $$;

-- admin_create_transactions_batch
DO $$
DECLARE
  func_oid oid;
BEGIN
  SELECT oid INTO func_oid FROM pg_proc 
  WHERE proname = 'admin_create_transactions_batch' 
  AND pronamespace = 'public'::regnamespace
  LIMIT 1;
  
  IF func_oid IS NOT NULL THEN
    EXECUTE format('COMMENT ON FUNCTION %s IS %L', func_oid::regprocedure,
      'CANONICAL: Creates multiple transactions in a single atomic operation. Used for bulk imports and batch processing. Triggers position recompute for all affected investors. Idempotency: Uses reference_id unique constraint per transaction. Role: Requires admin role.');
  END IF;
END $$;

-- void_transaction
DO $$
DECLARE
  func_oid oid;
BEGIN
  SELECT oid INTO func_oid FROM pg_proc 
  WHERE proname = 'void_transaction' 
  AND pronamespace = 'public'::regnamespace
  LIMIT 1;
  
  IF func_oid IS NOT NULL THEN
    EXECUTE format('COMMENT ON FUNCTION %s IS %L', func_oid::regprocedure,
      'CANONICAL: Voids a transaction, marking it as cancelled without deletion. Creates audit trail entry. Triggers position recompute. Precondition: Transaction must not already be voided. Role: Requires admin role.');
  END IF;
END $$;

-- void_transaction_with_approval
DO $$
DECLARE
  func_oid oid;
BEGIN
  SELECT oid INTO func_oid FROM pg_proc 
  WHERE proname = 'void_transaction_with_approval' 
  AND pronamespace = 'public'::regnamespace
  LIMIT 1;
  
  IF func_oid IS NOT NULL THEN
    EXECUTE format('COMMENT ON FUNCTION %s IS %L', func_oid::regprocedure,
      'CANONICAL: Voids a transaction with dual-approval workflow. For high-value or sensitive transactions requiring second admin approval. Precondition: Valid pending approval must exist. Role: Requires admin role with valid approval.');
  END IF;
END $$;

-- void_and_reissue_transaction
DO $$
DECLARE
  func_oid oid;
BEGIN
  SELECT oid INTO func_oid FROM pg_proc 
  WHERE proname = 'void_and_reissue_transaction' 
  AND pronamespace = 'public'::regnamespace
  LIMIT 1;
  
  IF func_oid IS NOT NULL THEN
    EXECUTE format('COMMENT ON FUNCTION %s IS %L', func_oid::regprocedure,
      'CANONICAL: Atomically voids a transaction and creates a corrected replacement. Preferred method for corrections to maintain ledger immutability. Returns: { voided_transaction_id, new_transaction_id, success, message }. Role: Requires admin role.');
  END IF;
END $$;

-- edit_transaction
DO $$
DECLARE
  func_oid oid;
BEGIN
  SELECT oid INTO func_oid FROM pg_proc 
  WHERE proname = 'edit_transaction' 
  AND pronamespace = 'public'::regnamespace
  LIMIT 1;
  
  IF func_oid IS NOT NULL THEN
    EXECUTE format('COMMENT ON FUNCTION %s IS %L', func_oid::regprocedure,
      'CANONICAL: Edits non-financial metadata on a transaction. Allowed fields: notes, visibility_scope, source. Does NOT allow editing amount, date, or type (use void_and_reissue instead). Role: Requires admin role.');
  END IF;
END $$;

-- update_transaction
DO $$
DECLARE
  func_oid oid;
BEGIN
  SELECT oid INTO func_oid FROM pg_proc 
  WHERE proname = 'update_transaction' 
  AND pronamespace = 'public'::regnamespace
  LIMIT 1;
  
  IF func_oid IS NOT NULL THEN
    EXECUTE format('COMMENT ON FUNCTION %s IS %L', func_oid::regprocedure,
      'CANONICAL: Updates transaction with comprehensive audit logging. Similar to edit_transaction but with additional audit metadata. Role: Requires admin role.');
  END IF;
END $$;

-- delete_transaction
DO $$
DECLARE
  func_oid oid;
BEGIN
  SELECT oid INTO func_oid FROM pg_proc 
  WHERE proname = 'delete_transaction' 
  AND pronamespace = 'public'::regnamespace
  LIMIT 1;
  
  IF func_oid IS NOT NULL THEN
    EXECUTE format('COMMENT ON FUNCTION %s IS %L', func_oid::regprocedure,
      'CANONICAL: Permanently deletes a voided transaction. Only allowed for transactions with is_voided=true. Use with extreme caution - prefer keeping voided records for audit. Role: Requires super_admin role.');
  END IF;
END $$;

-- adjust_investor_position
DO $$
DECLARE
  func_oid oid;
BEGIN
  SELECT oid INTO func_oid FROM pg_proc 
  WHERE proname = 'adjust_investor_position' 
  AND pronamespace = 'public'::regnamespace
  LIMIT 1;
  
  IF func_oid IS NOT NULL THEN
    EXECUTE format('COMMENT ON FUNCTION %s IS %L', func_oid::regprocedure,
      'CANONICAL: Creates an adjustment transaction to correct position. Used for reconciliation when position drift is detected. Creates ADJUSTMENT type transaction in ledger. Role: Requires admin role.');
  END IF;
END $$;

-- get_void_transaction_impact
DO $$
DECLARE
  func_oid oid;
BEGIN
  SELECT oid INTO func_oid FROM pg_proc 
  WHERE proname = 'get_void_transaction_impact' 
  AND pronamespace = 'public'::regnamespace
  LIMIT 1;
  
  IF func_oid IS NOT NULL THEN
    EXECUTE format('COMMENT ON FUNCTION %s IS %L', func_oid::regprocedure,
      'READ-ONLY: Previews the impact of voiding a transaction. Returns affected position balance, AUM changes, and related entities. Use before calling void_transaction to understand consequences. Role: Requires admin role.');
  END IF;
END $$;