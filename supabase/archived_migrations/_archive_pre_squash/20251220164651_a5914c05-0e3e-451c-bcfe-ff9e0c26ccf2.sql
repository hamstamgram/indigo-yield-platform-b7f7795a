-- ============================================================================
-- Report Uniqueness & AUM Purpose Migration
-- ============================================================================

-- 1. Create AUM purpose enum
CREATE TYPE aum_purpose AS ENUM ('reporting', 'transaction');

-- 2. Add purpose column to fund_daily_aum (defaults to 'transaction' for existing data)
ALTER TABLE public.fund_daily_aum 
ADD COLUMN IF NOT EXISTS purpose aum_purpose NOT NULL DEFAULT 'transaction';

-- 3. Add purpose column to daily_nav
ALTER TABLE public.daily_nav 
ADD COLUMN IF NOT EXISTS purpose aum_purpose NOT NULL DEFAULT 'transaction';

-- 4. Create index for efficient filtering by purpose and is_month_end
CREATE INDEX IF NOT EXISTS idx_fund_daily_aum_purpose ON public.fund_daily_aum(purpose, is_month_end);
CREATE INDEX IF NOT EXISTS idx_daily_nav_purpose ON public.daily_nav(purpose, is_month_end);

-- 5. Add unique constraint for generated_statements (one report per investor per period)
-- First, clean up any duplicates if they exist
DELETE FROM public.generated_statements a USING public.generated_statements b
WHERE a.id < b.id 
  AND a.investor_id = b.investor_id 
  AND a.period_id = b.period_id;

ALTER TABLE public.generated_statements 
ADD CONSTRAINT unique_investor_period UNIQUE (investor_id, period_id);

-- 6. Add unique constraint for generated_reports (one report per investor per fund per month)
-- First, clean up any duplicates if they exist
DELETE FROM public.generated_reports a USING public.generated_reports b
WHERE a.id < b.id 
  AND a.investor_id = b.investor_id 
  AND COALESCE(a.fund_id, '') = COALESCE(b.fund_id, '') 
  AND a.report_month = b.report_month;

ALTER TABLE public.generated_reports 
ADD CONSTRAINT unique_investor_fund_month UNIQUE (investor_id, fund_id, report_month);

-- 7. Create report_change_log table for audit trail (NOT multiple versions)
CREATE TABLE IF NOT EXISTS public.report_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL,
  report_table TEXT NOT NULL CHECK (report_table IN ('generated_statements', 'generated_reports')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  previous_html_hash TEXT,
  previous_pdf_url TEXT,
  change_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Enable RLS on report_change_log
ALTER TABLE public.report_change_log ENABLE ROW LEVEL SECURITY;

-- 9. RLS policies for report_change_log
CREATE POLICY "Admin can view change log" ON public.report_change_log
  FOR SELECT USING (is_admin());
  
CREATE POLICY "System can insert change log" ON public.report_change_log
  FOR INSERT WITH CHECK (true);

-- 10. Create indexes for report_change_log
CREATE INDEX IF NOT EXISTS idx_report_change_log_report ON public.report_change_log(report_id, report_table);
CREATE INDEX IF NOT EXISTS idx_report_change_log_changed_at ON public.report_change_log(changed_at DESC);

-- 11. Create yield_edit_audit table for tracking yield record edits
CREATE TABLE IF NOT EXISTS public.yield_edit_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('fund_daily_aum', 'daily_nav')),
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_by UUID REFERENCES auth.users(id),
  previous_values JSONB NOT NULL,
  new_values JSONB NOT NULL,
  edit_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.yield_edit_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view yield edits" ON public.yield_edit_audit
  FOR SELECT USING (is_admin());
  
CREATE POLICY "Admin can insert yield edits" ON public.yield_edit_audit
  FOR INSERT WITH CHECK (is_admin());