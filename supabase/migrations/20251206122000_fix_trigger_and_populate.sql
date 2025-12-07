-- Combined migration: Fix audit trigger UUID handling + Populate positions
-- This must run as a single migration to ensure correct order

-- Step 1: Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Fix the audit trigger to generate deterministic UUIDs for composite keys
CREATE OR REPLACE FUNCTION public.log_data_edit()
RETURNS TRIGGER AS $$
DECLARE
  v_import_id UUID;
  v_edit_source TEXT;
  v_record_id UUID;
  -- DNS namespace UUID for deterministic UUID generation
  v_namespace UUID := '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
BEGIN
  -- Determine edit source
  IF current_setting('app.edit_source', true) IS NOT NULL THEN
    v_edit_source = current_setting('app.edit_source', true);
  ELSE
    v_edit_source = 'manual';
  END IF;

  -- Get import ID if this is import-related
  IF current_setting('app.import_id', true) IS NOT NULL THEN
    v_import_id = current_setting('app.import_id', true)::UUID;
  END IF;

  -- Handle tables with composite keys (no 'id' column)
  -- Generate a deterministic UUID from the composite key using uuid_generate_v5
  IF TG_TABLE_NAME = 'investor_positions' THEN
    IF TG_OP = 'DELETE' THEN
      v_record_id = uuid_generate_v5(v_namespace, OLD.investor_id::TEXT || ':' || OLD.fund_id::TEXT);
    ELSE
      v_record_id = uuid_generate_v5(v_namespace, NEW.investor_id::TEXT || ':' || NEW.fund_id::TEXT);
    END IF;
  ELSE
    -- Standard tables with 'id' column
    IF TG_OP = 'DELETE' THEN
      v_record_id = OLD.id;
    ELSE
      v_record_id = NEW.id;
    END IF;
  END IF;

  -- Log the edit
  INSERT INTO public.data_edit_audit (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    import_related,
    import_id,
    edited_by,
    edit_source
  ) VALUES (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    v_import_id IS NOT NULL,
    v_import_id,
    auth.uid(),
    v_edit_source
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Populate investor_positions from investor_monthly_reports
DO $$
DECLARE
  v_count INTEGER;
BEGIN
    -- Clear existing positions
    DELETE FROM public.investor_positions;

    -- Insert positions from latest monthly reports
    INSERT INTO public.investor_positions (
        investor_id,
        fund_id,
        shares,
        current_value,
        cost_basis,
        unrealized_pnl,
        realized_pnl,
        updated_at
    )
    SELECT DISTINCT ON (imr.investor_id, f.id)
        imr.investor_id,
        f.id as fund_id,
        imr.closing_balance as shares,
        imr.closing_balance as current_value,
        (imr.closing_balance - COALESCE(imr.yield_earned, 0)) as cost_basis,
        COALESCE(imr.yield_earned, 0) as unrealized_pnl,
        0 as realized_pnl,
        NOW() as updated_at
    FROM public.investor_monthly_reports imr
    JOIN public.funds f ON f.asset = imr.asset_code
    WHERE imr.closing_balance > 0
    ORDER BY imr.investor_id, f.id, imr.report_month DESC;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Populated investor_positions: % rows', v_count;
END $$;
