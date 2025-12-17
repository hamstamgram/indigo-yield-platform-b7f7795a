-- 1. Add RLS policies to tables missing them

-- excel_import_log policies
CREATE POLICY "excel_import_log_select_admin" ON public.excel_import_log
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "excel_import_log_insert_admin" ON public.excel_import_log
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "excel_import_log_update_admin" ON public.excel_import_log
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "excel_import_log_delete_admin" ON public.excel_import_log
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- fees policies
CREATE POLICY "fees_select_own_or_admin" ON public.fees
FOR SELECT USING (investor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "fees_insert_admin" ON public.fees
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "fees_update_admin" ON public.fees
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "fees_delete_admin" ON public.fees
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- fund_configurations policies
CREATE POLICY "fund_configurations_select_authenticated" ON public.fund_configurations
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "fund_configurations_insert_admin" ON public.fund_configurations
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "fund_configurations_update_admin" ON public.fund_configurations
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "fund_configurations_delete_admin" ON public.fund_configurations
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 2. Populate user_roles for existing admins from profiles table
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE is_admin = true
ON CONFLICT (user_id, role) DO NOTHING;