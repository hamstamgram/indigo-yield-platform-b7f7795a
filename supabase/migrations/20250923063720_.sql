-- Fix RLS policies for tables missing them

-- 1. Add RLS policies for yield_settings table
CREATE POLICY "yield_settings_select_admin" ON public.yield_settings
  FOR SELECT USING (is_admin_v2());

CREATE POLICY "yield_settings_insert_admin" ON public.yield_settings
  FOR INSERT WITH CHECK (is_admin_v2());

CREATE POLICY "yield_settings_update_admin" ON public.yield_settings
  FOR UPDATE USING (is_admin_v2()) WITH CHECK (is_admin_v2());

CREATE POLICY "yield_settings_delete_admin" ON public.yield_settings
  FOR DELETE USING (is_admin_v2());

-- 2. Add RLS policies for fund_configurations table
CREATE POLICY "fund_configurations_select_all" ON public.fund_configurations
  FOR SELECT USING (true);

CREATE POLICY "fund_configurations_insert_admin" ON public.fund_configurations
  FOR INSERT WITH CHECK (is_admin_v2());

CREATE POLICY "fund_configurations_update_admin" ON public.fund_configurations
  FOR UPDATE USING (is_admin_v2()) WITH CHECK (is_admin_v2());

CREATE POLICY "fund_configurations_delete_admin" ON public.fund_configurations
  FOR DELETE USING (is_admin_v2());

-- 3. Add RLS policies for fees table
CREATE POLICY "fees_select_own_or_admin" ON public.fees
  FOR SELECT USING (user_id = auth.uid() OR is_admin_v2());

CREATE POLICY "fees_insert_admin" ON public.fees
  FOR INSERT WITH CHECK (is_admin_v2());

CREATE POLICY "fees_update_admin" ON public.fees
  FOR UPDATE USING (is_admin_v2()) WITH CHECK (is_admin_v2());

CREATE POLICY "fees_delete_admin" ON public.fees
  FOR DELETE USING (is_admin_v2());

-- 4. Fix function search_path issues
CREATE OR REPLACE FUNCTION public.ensure_investor_for_profile()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create investor record for non-admin users
  IF NEW.user_type = 'investor' OR NEW.user_type IS NULL THEN
    -- Ensure we have a name to insert
    DECLARE
      investor_name TEXT;
    BEGIN
      -- Build the name from available fields
      investor_name := COALESCE(
        NULLIF(TRIM(CONCAT_WS(' ', NEW.first_name, NEW.last_name)), ''),
        NEW.full_name,
        split_part(NEW.email, '@', 1),
        'Investor'
      );

      -- Insert or update investor record
      INSERT INTO public.investors(profile_id, name, email)
      VALUES (
        NEW.id,
        investor_name,
        COALESCE(NEW.email, (SELECT email FROM auth.users WHERE id = NEW.id))
      )
      ON CONFLICT (profile_id) DO UPDATE
      SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        updated_at = NOW();
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_investor_portfolio_summary(p_investor_id uuid)
RETURNS TABLE(total_aum numeric, portfolio_count integer, last_statement_date date)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
    -- This function redirects to the user function for backward compatibility
    RETURN QUERY
    SELECT * FROM public.get_user_portfolio_summary(p_investor_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_portfolio_summary(p_user_id uuid)
RETURNS TABLE(total_aum numeric, portfolio_count integer, last_statement_date date)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(p.current_balance), 0) as total_aum,
        COUNT(DISTINCT p.asset_code)::INTEGER as portfolio_count,
        MAX(s.created_at)::DATE as last_statement_date
    FROM public.positions p
    LEFT JOIN public.statements s ON s.user_id = p.user_id
    WHERE p.user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. Add enhanced indexes for performance
CREATE INDEX IF NOT EXISTS idx_positions_user_asset ON public.positions(user_id, asset_code);
CREATE INDEX IF NOT EXISTS idx_investor_positions_investor_fund ON public.investor_positions(investor_id, fund_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type) WHERE user_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- 6. Add audit trail columns to key tables
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS last_modified_by UUID;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.investor_positions ADD COLUMN IF NOT EXISTS last_modified_by UUID;
ALTER TABLE public.investor_positions ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT NOW();

-- 7. Create triggers for audit trail
CREATE OR REPLACE FUNCTION public.update_audit_fields()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.last_modified_by = auth.uid();
  NEW.last_modified_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_positions_audit ON public.positions;
CREATE TRIGGER update_positions_audit
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.update_audit_fields();

DROP TRIGGER IF EXISTS update_investor_positions_audit ON public.investor_positions;
CREATE TRIGGER update_investor_positions_audit
  BEFORE UPDATE ON public.investor_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_audit_fields();;
