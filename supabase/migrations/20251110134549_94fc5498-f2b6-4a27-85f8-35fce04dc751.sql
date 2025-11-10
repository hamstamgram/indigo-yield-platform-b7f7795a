-- Enable Row Level Security on backup tables
ALTER TABLE public.investor_monthly_reports_backup_20250106 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions_backup_20250106 ENABLE ROW LEVEL SECURITY;

-- Create admin-only policies for investor_monthly_reports_backup_20250106
CREATE POLICY "backup_monthly_reports_admin_only" 
ON public.investor_monthly_reports_backup_20250106
FOR ALL 
USING (public.is_admin_v2());

-- Create admin-only policies for positions_backup_20250106
CREATE POLICY "backup_positions_admin_only" 
ON public.positions_backup_20250106
FOR ALL 
USING (public.is_admin_v2());