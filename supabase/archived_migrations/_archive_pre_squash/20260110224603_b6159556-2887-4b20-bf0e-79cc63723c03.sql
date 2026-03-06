-- ============================================================================
-- PHASE 1: THE OBSERVER - Delta Audit Pattern
-- This MUST be deployed first to record all subsequent system evolution
-- ============================================================================

-- 1A. Create the JSONB Delta Computation Function
-- Computes only the changed keys between old and new JSONB objects
CREATE OR REPLACE FUNCTION compute_jsonb_delta(p_old jsonb, p_new jsonb)
RETURNS jsonb AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- 1B. Create the Universal Audit Delta Trigger Function
CREATE OR REPLACE FUNCTION audit_delta_trigger()
RETURNS trigger AS $$
DECLARE
  v_delta jsonb;
  v_entity_id text;
  v_actor uuid;
BEGIN
  -- Determine entity ID
  v_entity_id := COALESCE(
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
    'unknown'
  );
  
  -- Determine actor (prefer auth.uid, fall back to updated_by/created_by columns)
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    IF TG_OP = 'UPDATE' AND NEW IS NOT NULL THEN
      v_actor := COALESCE(
        (NEW.updated_by)::uuid,
        (NEW.created_by)::uuid
      );
    ELSIF TG_OP = 'INSERT' AND NEW IS NOT NULL THEN
      v_actor := (NEW.created_by)::uuid;
    END IF;
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
      jsonb_build_object('_created', true),
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1C. Attach Delta Audit Trigger to Critical Financial Tables
-- These triggers will now record all changes with high-efficiency delta logging

-- transactions_v2 - Core ledger
DROP TRIGGER IF EXISTS delta_audit_transactions_v2 ON transactions_v2;
CREATE TRIGGER delta_audit_transactions_v2
  AFTER INSERT OR UPDATE OR DELETE ON transactions_v2
  FOR EACH ROW EXECUTE FUNCTION audit_delta_trigger();

-- investor_positions - Balance tracking
DROP TRIGGER IF EXISTS delta_audit_investor_positions ON investor_positions;
CREATE TRIGGER delta_audit_investor_positions
  AFTER INSERT OR UPDATE OR DELETE ON investor_positions
  FOR EACH ROW EXECUTE FUNCTION audit_delta_trigger();

-- yield_distributions - Yield calculations
DROP TRIGGER IF EXISTS delta_audit_yield_distributions ON yield_distributions;
CREATE TRIGGER delta_audit_yield_distributions
  AFTER INSERT OR UPDATE OR DELETE ON yield_distributions
  FOR EACH ROW EXECUTE FUNCTION audit_delta_trigger();

-- withdrawal_requests - Withdrawal lifecycle
DROP TRIGGER IF EXISTS delta_audit_withdrawal_requests ON withdrawal_requests;
CREATE TRIGGER delta_audit_withdrawal_requests
  AFTER INSERT OR UPDATE OR DELETE ON withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION audit_delta_trigger();

-- Add index for efficient delta audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_delta_entity 
  ON audit_log(entity, entity_id, created_at DESC) 
  WHERE action = 'DELTA_UPDATE';

CREATE INDEX IF NOT EXISTS idx_audit_log_action_created 
  ON audit_log(action, created_at DESC);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION compute_jsonb_delta(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION audit_delta_trigger() TO authenticated;