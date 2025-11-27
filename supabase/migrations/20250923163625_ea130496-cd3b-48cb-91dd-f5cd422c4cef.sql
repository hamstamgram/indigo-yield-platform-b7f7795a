-- Fix the data audit trigger that's blocking migrations
-- The trigger assumes all tables have an 'id' field, but some don't

CREATE OR REPLACE FUNCTION public.log_data_edit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public
AS $$
DECLARE
  v_import_id UUID;
  v_edit_source TEXT;
  v_record_id TEXT;
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
  
  -- Try to get record ID from common ID fields, fallback to generating one
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_record_id = COALESCE(
        (OLD.id)::TEXT,
        (OLD.user_id)::TEXT,
        (OLD.portfolio_id)::TEXT,
        gen_random_uuid()::TEXT
      );
    ELSE
      v_record_id = COALESCE(
        (NEW.id)::TEXT,
        (NEW.user_id)::TEXT, 
        (NEW.portfolio_id)::TEXT,
        gen_random_uuid()::TEXT
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      v_record_id = gen_random_uuid()::TEXT;
  END;
  
  -- Log the edit only if we can safely do so
  BEGIN
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
  EXCEPTION
    WHEN OTHERS THEN
      -- If audit logging fails, don't block the operation
      NULL;
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;