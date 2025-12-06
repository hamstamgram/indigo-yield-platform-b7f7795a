-- Create onboarding_submissions table if not exists
CREATE TABLE IF NOT EXISTS public.onboarding_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'duplicate')),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company_name TEXT,
    additional_emails TEXT[],
    airtable_record_id TEXT,
    jotform_submission_id TEXT,
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id),
    created_investor_id UUID REFERENCES public.investors(id),
    notes TEXT,
    raw_data JSONB
);

-- Create investor_emails table if not exists
CREATE TABLE IF NOT EXISTS public.investor_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(investor_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_status ON public.onboarding_submissions(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_email ON public.onboarding_submissions(email);
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_airtable_id ON public.onboarding_submissions(airtable_record_id);
CREATE INDEX IF NOT EXISTS idx_investor_emails_email ON public.investor_emails(email);

-- RLS
ALTER TABLE public.onboarding_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_emails ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view onboarding submissions"
    ON public.onboarding_submissions FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can insert/update onboarding submissions"
    ON public.onboarding_submissions FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view investor emails"
    ON public.investor_emails FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can manage investor emails"
    ON public.investor_emails FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
