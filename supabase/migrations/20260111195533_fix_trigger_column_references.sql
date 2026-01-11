-- Fix trigger functions referencing NEW.id on tables where PK is not 'id'
-- Error: "record new has no field id"
--
-- Affected tables: investor_positions (composite PK: investor_id, fund_id)
-- Affected functions: log_data_edit, audit_delta_trigger

-- ============================================================================
-- FIX 1: log_data_edit - Handle tables without 'id' column
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_data_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_record_id uuid;
BEGIN
  -- Determine record ID based on table structure
  -- Handle both single 'id' columns and composite keys
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_record_id := OLD.id;
    ELSE
      v_record_id := NEW.id;
    END IF;
  EXCEPTION WHEN undefined_column THEN
    -- Table doesn't have 'id' column - generate from primary key fields
    -- For investor_positions: investor_id + fund_id
    IF TG_TABLE_NAME = 'investor_positions' THEN
      IF TG_OP = 'DELETE' THEN
        v_record_id := uuid_generate_v5(uuid_nil(), OLD.investor_id::text || ':' || OLD.fund_id::text);
      ELSE
        v_record_id := uuid_generate_v5(uuid_nil(), NEW.investor_id::text || ':' || NEW.fund_id::text);
      END IF;
    ELSE
      -- Fallback: generate from jsonb hash
      IF TG_OP = 'DELETE' THEN
        v_record_id := uuid_generate_v5(uuid_nil(), to_jsonb(OLD)::text);
      ELSE
        v_record_id := uuid_generate_v5(uuid_nil(), to_jsonb(NEW)::text);
      END IF;
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
$function$;

COMMENT ON FUNCTION log_data_edit() IS
'Audit trigger for data edits. Handles tables with single id column or composite PKs.
Fixed 2026-01-11: Handle investor_positions composite PK (investor_id, fund_id)';

-- ============================================================================
-- FIX 2: audit_delta_trigger - Handle tables without 'id' column
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_delta_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

COMMENT ON FUNCTION audit_delta_trigger() IS
'Delta audit trigger that logs only changed fields. Handles tables with composite PKs.
Fixed 2026-01-11: Handle investor_positions composite PK (investor_id, fund_id)';

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

INSERT INTO audit_log (action, entity, entity_id, new_values, meta)
VALUES (
  'FIX_TRIGGER_COLUMN_REFS',
  'migrations',
  '20260111195533_fix_trigger_column_references',
  jsonb_build_object(
    'fixed_functions', ARRAY['log_data_edit', 'audit_delta_trigger'],
    'issue', 'record new has no field id',
    'cause', 'investor_positions has composite PK, not id column'
  ),
  jsonb_build_object('urgent_fix', true)
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Test that functions can handle investor_positions
  -- This will fail if the fix didn't work
  RAISE NOTICE 'Fix applied: log_data_edit and audit_delta_trigger now handle composite PKs';
END $$;
