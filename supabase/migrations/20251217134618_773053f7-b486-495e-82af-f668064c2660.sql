-- Clean up orphaned investor_monthly_reports records
DELETE FROM public.investor_monthly_reports 
WHERE investor_id NOT IN (SELECT id FROM public.profiles);

-- Clean up orphaned fees records
DELETE FROM public.fees 
WHERE investor_id NOT IN (SELECT id FROM public.profiles);

-- Now add the FK constraints
ALTER TABLE public.investor_monthly_reports 
ADD CONSTRAINT fk_investor_monthly_reports_investor 
FOREIGN KEY (investor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.fees 
ADD CONSTRAINT fk_fees_investor 
FOREIGN KEY (investor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_investor_monthly_reports_investor_id ON public.investor_monthly_reports(investor_id);
CREATE INDEX IF NOT EXISTS idx_fees_investor_id ON public.fees(investor_id);