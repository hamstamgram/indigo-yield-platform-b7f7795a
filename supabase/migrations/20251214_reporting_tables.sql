-- ==============================================================================
-- Migration: Reporting Infrastructure
-- Date: 2025-12-14
-- Description: Creates tables for report definitions and generated reports
-- ==============================================================================

-- 1. Report Definitions (Templates)
CREATE TABLE IF NOT EXISTS public.report_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    report_type text NOT NULL,
    template_config jsonb,
    default_filters jsonb,
    available_formats text[],
    is_admin_only boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Generated Reports (History)
CREATE TABLE IF NOT EXISTS public.generated_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_definition_id uuid REFERENCES public.report_definitions(id),
    investor_id uuid REFERENCES public.profiles(id),
    report_type text NOT NULL,
    report_name text NOT NULL,
    format text,
    status text DEFAULT 'pending', -- pending, processing, completed, failed
    pdf_url text,
    storage_path text,
    file_size_bytes bigint,
    report_data jsonb,
    parameters jsonb,
    filters jsonb,
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. RLS Policies

-- Enable RLS
ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- Report Definitions Policies
CREATE POLICY "Admins can manage report definitions"
    ON public.report_definitions
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Investors can view active public report definitions"
    ON public.report_definitions
    FOR SELECT
    USING (is_active = true AND is_admin_only = false);

-- Generated Reports Policies
CREATE POLICY "Admins can manage all generated reports"
    ON public.generated_reports
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Investors can view their own generated reports"
    ON public.generated_reports
    FOR SELECT
    USING (investor_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_generated_reports_investor_id ON public.generated_reports(investor_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_created_at ON public.generated_reports(created_at DESC);
