-- Migration: 006_cutover_guards.sql  
-- Date: 2025-09-03
-- Description: Cutover guards and import control mechanisms

-- ========================================
-- System Configuration Table
-- ========================================
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Insert default configuration
INSERT INTO public.system_config (key, value, description) VALUES
  ('excel_import_enabled', 'true'::jsonb, 'Controls whether Excel imports are allowed'),
  ('edit_window_days', '7'::jsonb, 'Number of days after import that edits are allowed'),
  ('maintenance_mode', 'false'::jsonb, 'Enables maintenance mode for the platform'),
  ('allowed_fund_classes', '["USDT","USDC","EURC","BTC","ETH","SOL"]'::jsonb, 'List of allowed fund classes')
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- Import Lock Table
-- ========================================
CREATE TABLE IF NOT EXISTS public.import_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES public.excel_import_log(id),
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_by UUID REFERENCES public.profiles(id),
  lock_reason TEXT,
  unlock_at TIMESTAMPTZ,
  unlocked_by UUID REFERENCES public.profiles(id),
  unlocked_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- ========================================
-- Data Edit Audit Table
-- ========================================
CREATE TABLE IF NOT EXISTS public.data_edit_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  import_related BOOLEAN DEFAULT FALSE,
  import_id UUID REFERENCES public.excel_import_log(id),
  edited_by UUID REFERENCES public.profiles(id),
  edited_at TIMESTAMPTZ DEFAULT NOW(),
  edit_source TEXT CHECK (edit_source IN ('excel_import', 'manual', 'api', 'system'))
);

-- ========================================
-- Functions for cutover control
-- ========================================

-- Function to check if imports are enabled
CREATE OR REPLACE FUNCTION public.is_import_enabled() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT (value)::boolean 
    FROM public.system_config 
    WHERE key = 'excel_import_enabled'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if data is within edit window
CREATE OR REPLACE FUNCTION public.is_within_edit_window(p_created_at TIMESTAMPTZ) 
RETURNS BOOLEAN AS $$
DECLARE
  v_window_days INTEGER;
BEGIN
  SELECT (value)::integer INTO v_window_days
  FROM public.system_config 
  WHERE key = 'edit_window_days';
  
  RETURN (NOW() - p_created_at) < (v_window_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to lock imports (admin only)
CREATE OR REPLACE FUNCTION public.lock_imports(p_reason TEXT DEFAULT 'Manual lock') 
RETURNS UUID AS $$
DECLARE
  v_lock_id UUID;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Only admins can lock imports';
  END IF;
  
  -- Update system config
  UPDATE public.system_config 
  SET value = 'false'::jsonb,
      updated_at = NOW(),
      updated_by = auth.uid()
  WHERE key = 'excel_import_enabled';
  
  -- Create lock record
  INSERT INTO public.import_locks (
    locked_by,
    lock_reason,
    is_active
  ) VALUES (
    auth.uid(),
    p_reason,
    TRUE
  ) RETURNING id INTO v_lock_id;
  
  RETURN v_lock_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unlock imports (admin only)
CREATE OR REPLACE FUNCTION public.unlock_imports() 
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Only admins can unlock imports';
  END IF;
  
  -- Update system config
  UPDATE public.system_config 
  SET value = 'true'::jsonb,
      updated_at = NOW(),
      updated_by = auth.uid()
  WHERE key = 'excel_import_enabled';
  
  -- Deactivate all active locks
  UPDATE public.import_locks
  SET is_active = FALSE,
      unlocked_by = auth.uid(),
      unlocked_at = NOW()
  WHERE is_active = TRUE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Trigger for audit logging
-- ========================================
CREATE OR REPLACE FUNCTION public.log_data_edit() 
RETURNS TRIGGER AS $$
DECLARE
  v_import_id UUID;
  v_edit_source TEXT;
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
    COALESCE(NEW.id, OLD.id),
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

-- Apply audit triggers to critical tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT unnest(ARRAY[
      'investors', 
      'transactions_v2', 
      'investor_positions',
      'funds',
      'daily_nav',
      'withdrawal_requests'
    ])
  LOOP
    EXECUTE format('
      CREATE TRIGGER audit_%I_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.log_data_edit()
    ', tbl, tbl);
  END LOOP;
END $$;

-- ========================================
-- View for import status
-- ========================================
CREATE OR REPLACE VIEW public.import_status AS
SELECT 
  (SELECT (value)::boolean FROM public.system_config WHERE key = 'excel_import_enabled') as imports_enabled,
  (SELECT (value)::integer FROM public.system_config WHERE key = 'edit_window_days') as edit_window_days,
  (SELECT COUNT(*) FROM public.import_locks WHERE is_active = TRUE) as active_locks,
  (SELECT locked_at FROM public.import_locks WHERE is_active = TRUE ORDER BY locked_at DESC LIMIT 1) as last_lock_time,
  (SELECT COUNT(*) FROM public.excel_import_log WHERE status = 'completed') as successful_imports,
  (SELECT MAX(completed_at) FROM public.excel_import_log WHERE status = 'completed') as last_import_time;

-- ========================================
-- Create indexes
-- ========================================
CREATE INDEX IF NOT EXISTS idx_import_locks_active ON public.import_locks(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_data_edit_audit_table ON public.data_edit_audit(table_name, edited_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_edit_audit_import ON public.data_edit_audit(import_id) WHERE import_id IS NOT NULL;

-- ========================================
-- RLS Policies
-- ========================================
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_edit_audit ENABLE ROW LEVEL SECURITY;

-- System config - admins only
CREATE POLICY "system_config_admin_all" ON public.system_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Import locks - admins only
CREATE POLICY "import_locks_admin_all" ON public.import_locks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Data audit - admins can see all, users can see their own
CREATE POLICY "data_edit_audit_select" ON public.data_edit_audit
  FOR SELECT
  USING (
    edited_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- ========================================
-- Grant permissions
-- ========================================
GRANT SELECT ON public.import_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_import_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_within_edit_window(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_imports(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_imports() TO authenticated;

COMMENT ON TABLE public.system_config IS 'System-wide configuration parameters';
COMMENT ON TABLE public.import_locks IS 'Tracks when and why Excel imports were locked';
COMMENT ON TABLE public.data_edit_audit IS 'Comprehensive audit trail for all data modifications';
COMMENT ON VIEW public.import_status IS 'Current status of import system and controls';
COMMENT ON FUNCTION public.is_import_enabled IS 'Checks if Excel imports are currently enabled';
COMMENT ON FUNCTION public.lock_imports IS 'Locks Excel imports (admin only)';
COMMENT ON FUNCTION public.unlock_imports IS 'Unlocks Excel imports (admin only)';
