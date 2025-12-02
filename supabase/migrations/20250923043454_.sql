-- Fix the log_data_edit trigger to handle tables without 'id' field
CREATE OR REPLACE FUNCTION public.log_data_edit()
RETURNS TRIGGER AS $$
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
  
  -- Safely get record ID - try different common ID field names
  v_record_id = NULL;
  BEGIN
    IF TG_OP != 'DELETE' THEN
      -- Try common ID field names
      IF to_jsonb(NEW) ? 'id' THEN
        v_record_id = (to_jsonb(NEW) ->> 'id');
      ELSIF to_jsonb(NEW) ? 'user_id' THEN
        v_record_id = (to_jsonb(NEW) ->> 'user_id');
      ELSIF to_jsonb(NEW) ? 'portfolio_id' THEN
        v_record_id = (to_jsonb(NEW) ->> 'portfolio_id');
      END IF;
    ELSE
      -- For DELETE, try to get ID from OLD record
      IF to_jsonb(OLD) ? 'id' THEN
        v_record_id = (to_jsonb(OLD) ->> 'id');
      ELSIF to_jsonb(OLD) ? 'user_id' THEN
        v_record_id = (to_jsonb(OLD) ->> 'user_id');
      ELSIF to_jsonb(OLD) ? 'portfolio_id' THEN
        v_record_id = (to_jsonb(OLD) ->> 'portfolio_id');
      END IF;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      v_record_id = 'unknown';
  END;
  
  -- Log the edit with safe record ID
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
    COALESCE(v_record_id, 'unknown')::TEXT,
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    v_import_id IS NOT NULL,
    v_import_id,
    auth.uid(),
    v_edit_source
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Now proceed with Phase 1 data migration
-- 1) Ensure all investors have portfolios
INSERT INTO public.portfolios_v2 (owner_user_id, name, status, base_currency, inception_date, metadata)
SELECT 
  p.id,
  COALESCE(
    NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''),
    p.full_name,
    'Investor'
  ) || '''s Portfolio' as name,
  'active'::text,
  'USD'::text,
  COALESCE(p.created_at::date, CURRENT_DATE),
  jsonb_build_object(
    'risk_profile', 'moderate',
    'investment_objectives', 'yield_generation',
    'created_from_legacy', true
  )
FROM public.profiles p 
WHERE p.is_admin = false
  AND NOT EXISTS (SELECT 1 FROM public.portfolios_v2 WHERE owner_user_id = p.id);

-- 2) Create yield rates table for tracking daily rates
CREATE TABLE IF NOT EXISTS public.yield_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT NOT NULL,
  rate_percentage NUMERIC(10,6) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(asset_code, effective_date)
);

-- Enable RLS on yield_rates
ALTER TABLE public.yield_rates ENABLE ROW LEVEL SECURITY;

-- Create policies for yield_rates
CREATE POLICY "Admins can manage yield rates" ON public.yield_rates
  FOR ALL USING (is_admin_v2()) WITH CHECK (is_admin_v2());

CREATE POLICY "All can view yield rates" ON public.yield_rates
  FOR SELECT USING (true);;
