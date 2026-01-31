-- =============================================================================
-- Phase 0: Runtime Truth Verification
-- =============================================================================
-- Extracts all DB enum values, public function signatures, and compares
-- against expected frontend contracts. Returns a JSONB drift report.
--
-- Usage:
--   SELECT qa_runtime_truth_report();
-- =============================================================================

CREATE OR REPLACE FUNCTION qa_runtime_truth_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enums jsonb := '{}';
  v_rpcs jsonb := '[]';
  v_tables jsonb := '[]';
  v_views jsonb := '[]';
  v_drift_items jsonb := '[]';
  v_rec record;
  v_enum_values jsonb;
BEGIN
  -- =========================================================================
  -- 1. Extract all user-defined enum types and their values
  -- =========================================================================
  FOR v_rec IN
    SELECT
      t.typname AS enum_name,
      jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  LOOP
    v_enums := v_enums || jsonb_build_object(v_rec.enum_name, v_rec.enum_values);
  END LOOP;

  -- =========================================================================
  -- 2. Extract all public function signatures (RPCs)
  -- =========================================================================
  FOR v_rec IN
    SELECT
      p.proname AS func_name,
      pg_get_function_arguments(p.oid) AS args,
      pg_get_function_result(p.oid) AS return_type,
      p.prosecdef AS security_definer,
      p.provolatile AS volatility
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
    ORDER BY p.proname
  LOOP
    v_rpcs := v_rpcs || jsonb_build_object(
      'name', v_rec.func_name,
      'args', v_rec.args,
      'return_type', v_rec.return_type,
      'security_definer', v_rec.security_definer,
      'volatility', v_rec.volatility
    );
  END LOOP;

  -- =========================================================================
  -- 3. Extract all public tables with their columns
  -- =========================================================================
  FOR v_rec IN
    SELECT
      c.relname AS table_name,
      jsonb_agg(
        jsonb_build_object(
          'name', a.attname,
          'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
          'nullable', NOT a.attnotnull
        )
        ORDER BY a.attnum
      ) AS columns
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'  -- regular tables only
      AND a.attnum > 0
      AND NOT a.attisdropped
    GROUP BY c.relname
    ORDER BY c.relname
  LOOP
    v_tables := v_tables || jsonb_build_object(
      'name', v_rec.table_name,
      'columns', v_rec.columns
    );
  END LOOP;

  -- =========================================================================
  -- 4. Extract all public views
  -- =========================================================================
  FOR v_rec IN
    SELECT c.relname AS view_name
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
    ORDER BY c.relname
  LOOP
    v_views := v_views || to_jsonb(v_rec.view_name);
  END LOOP;

  -- =========================================================================
  -- 5. Check for known drift items
  -- =========================================================================

  -- Drift 1: Check if tx_source has 'stress_test' value
  SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
  INTO v_enum_values
  FROM pg_type t
  JOIN pg_enum e ON t.oid = e.enumtypid
  JOIN pg_namespace n ON t.typnamespace = n.oid
  WHERE n.nspname = 'public' AND t.typname = 'tx_source';

  IF v_enum_values IS NOT NULL AND v_enum_values ? 'stress_test' THEN
    v_drift_items := v_drift_items || jsonb_build_object(
      'id', 'DRIFT-001',
      'severity', 'warn',
      'category', 'CONTRACT_DRIFT',
      'description', 'tx_source enum has stress_test value in DB but may be missing from frontend dbEnums.ts',
      'db_has', true,
      'expected_frontend', 'TX_SOURCE_VALUES should include stress_test'
    );
  END IF;

  -- Drift 2: Check if yield_distributions has dust columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'yield_distributions'
      AND column_name = 'dust_amount'
  ) THEN
    v_drift_items := v_drift_items || jsonb_build_object(
      'id', 'DRIFT-002',
      'severity', 'info',
      'category', 'SCHEMA_DEBT',
      'description', 'yield_distributions still has dust_amount column (scheduled for elimination)',
      'action', 'Phase 7 migration will remove dust_amount and dust_receiver_id'
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'yield_distributions'
      AND column_name = 'dust_receiver_id'
  ) THEN
    v_drift_items := v_drift_items || jsonb_build_object(
      'id', 'DRIFT-003',
      'severity', 'info',
      'category', 'SCHEMA_DEBT',
      'description', 'yield_distributions still has dust_receiver_id column (scheduled for elimination)',
      'action', 'Phase 7 migration will remove dust_amount and dust_receiver_id'
    );
  END IF;

  -- Drift 3: Check for transaction_type enum (legacy)
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public' AND t.typname = 'transaction_type'
  ) THEN
    v_drift_items := v_drift_items || jsonb_build_object(
      'id', 'DRIFT-004',
      'severity', 'warn',
      'category', 'CONTRACT_DRIFT',
      'description', 'Legacy transaction_type enum exists alongside tx_type - potential confusion',
      'action', 'Document which enum is canonical (tx_type is canonical)'
    );
  END IF;

  -- Drift 4: Check for transaction_status enum (legacy)
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public' AND t.typname = 'transaction_status'
  ) THEN
    v_drift_items := v_drift_items || jsonb_build_object(
      'id', 'DRIFT-005',
      'severity', 'info',
      'category', 'CONTRACT_DRIFT',
      'description', 'Legacy transaction_status enum exists - v2 uses is_voided boolean instead',
      'action', 'Consider deprecation path'
    );
  END IF;

  -- =========================================================================
  -- 6. Build and return the full report
  -- =========================================================================
  RETURN jsonb_build_object(
    'generated_at', now(),
    'schema_version', 'phase0_v1',
    'enums', v_enums,
    'rpc_count', jsonb_array_length(v_rpcs),
    'rpcs', v_rpcs,
    'table_count', jsonb_array_length(v_tables),
    'tables', v_tables,
    'view_count', jsonb_array_length(v_views),
    'views', v_views,
    'drift_items', v_drift_items,
    'drift_count', jsonb_array_length(v_drift_items)
  );
END;
$$;

-- =============================================================================
-- Helper: Extract just enum values for a specific enum
-- =============================================================================
CREATE OR REPLACE FUNCTION qa_get_enum_values(p_enum_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_values jsonb;
BEGIN
  SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
  INTO v_values
  FROM pg_type t
  JOIN pg_enum e ON t.oid = e.enumtypid
  JOIN pg_namespace n ON t.typnamespace = n.oid
  WHERE n.nspname = 'public' AND t.typname = p_enum_name;

  RETURN COALESCE(v_values, '[]'::jsonb);
END;
$$;

-- =============================================================================
-- Helper: Compare two JSONB arrays and return differences
-- =============================================================================
CREATE OR REPLACE FUNCTION qa_compare_enum_sets(
  p_enum_name text,
  p_frontend_values jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_db_values jsonb;
  v_only_in_db jsonb := '[]';
  v_only_in_frontend jsonb := '[]';
  v_val text;
BEGIN
  v_db_values := qa_get_enum_values(p_enum_name);

  -- Find values only in DB
  FOR v_val IN SELECT jsonb_array_elements_text(v_db_values) LOOP
    IF NOT v_val = ANY(ARRAY(SELECT jsonb_array_elements_text(p_frontend_values))) THEN
      v_only_in_db := v_only_in_db || to_jsonb(v_val);
    END IF;
  END LOOP;

  -- Find values only in frontend
  FOR v_val IN SELECT jsonb_array_elements_text(p_frontend_values) LOOP
    IF NOT v_val = ANY(ARRAY(SELECT jsonb_array_elements_text(v_db_values))) THEN
      v_only_in_frontend := v_only_in_frontend || to_jsonb(v_val);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'enum_name', p_enum_name,
    'db_values', v_db_values,
    'frontend_values', p_frontend_values,
    'only_in_db', v_only_in_db,
    'only_in_frontend', v_only_in_frontend,
    'in_sync', jsonb_array_length(v_only_in_db) = 0 AND jsonb_array_length(v_only_in_frontend) = 0
  );
END;
$$;
