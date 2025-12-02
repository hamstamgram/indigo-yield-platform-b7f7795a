-- Migration: Comprehensive Report Generation System
-- Version: 20251104000000
-- Date: 2025-11-04
-- Description: Creates all tables and functions for report generation, scheduling, and management

-- Create ENUM types for report system
CREATE TYPE report_type AS ENUM (
  -- Investor Reports
  'portfolio_performance',
  'transaction_history',
  'tax_report',
  'monthly_statement',
  'annual_summary',
  'custom_date_range',
  -- Admin Reports
  'aum_report',
  'investor_activity',
  'transaction_volume',
  'compliance_report',
  'fund_performance',
  'fee_analysis',
  'audit_trail'
);

CREATE TYPE report_format AS ENUM ('pdf', 'excel', 'csv', 'json');

CREATE TYPE report_status AS ENUM ('queued', 'processing', 'completed', 'failed', 'cancelled');

CREATE TYPE report_schedule_frequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');

-- Report Definitions Table
-- Stores reusable report templates and configurations
CREATE TABLE IF NOT EXISTS public.report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type report_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_config JSONB NOT NULL DEFAULT '{}',
  default_filters JSONB DEFAULT '{}',
  available_formats report_format[] DEFAULT ARRAY['pdf', 'excel']::report_format[],
  is_admin_only BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(report_type, name)
);

COMMENT ON TABLE public.report_definitions IS 'Reusable report templates and configurations';
COMMENT ON COLUMN public.report_definitions.template_config IS 'JSON configuration for report template (sections, charts, tables)';
COMMENT ON COLUMN public.report_definitions.default_filters IS 'Default filter values for this report type';

-- Generated Reports Table
-- Stores information about generated report instances
CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_definition_id UUID REFERENCES public.report_definitions(id) ON DELETE SET NULL,
  report_type report_type NOT NULL,
  format report_format NOT NULL,
  status report_status DEFAULT 'queued' NOT NULL,

  -- User context
  generated_for_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_by_user_id UUID REFERENCES auth.users(id),

  -- Report parameters
  parameters JSONB DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  date_range_start DATE,
  date_range_end DATE,

  -- Storage and metadata
  storage_path TEXT,
  file_size_bytes BIGINT,
  page_count INTEGER,

  -- Download tracking
  download_url TEXT,
  download_url_expires_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,

  -- Processing info
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  processing_duration_ms INTEGER,
  error_message TEXT,
  error_details JSONB,

  -- Scheduling context
  schedule_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.generated_reports IS 'Individual report instances with their generation status and metadata';
COMMENT ON COLUMN public.generated_reports.parameters IS 'Specific parameters used to generate this report';
COMMENT ON COLUMN public.generated_reports.filters IS 'Filters applied (funds, investors, date ranges, etc.)';

-- Report Schedules Table
-- Automated report generation schedules
CREATE TABLE IF NOT EXISTS public.report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_definition_id UUID REFERENCES public.report_definitions(id) ON DELETE CASCADE,

  -- Schedule configuration
  name TEXT NOT NULL,
  description TEXT,
  frequency report_schedule_frequency NOT NULL,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  time_of_day TIME NOT NULL DEFAULT '09:00:00',
  timezone TEXT DEFAULT 'UTC',

  -- Recipients and delivery
  recipient_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
  recipient_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
  delivery_method TEXT[] DEFAULT ARRAY['email', 'storage']::TEXT[],

  -- Report parameters
  parameters JSONB DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  formats report_format[] DEFAULT ARRAY['pdf']::report_format[],

  -- Schedule state
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  run_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.report_schedules IS 'Automated report generation schedules';

-- Report Access Logs Table
-- Audit trail for report access and downloads
CREATE TABLE IF NOT EXISTS public.report_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.generated_reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'view', 'download', 'delete', 'share'
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.report_access_logs IS 'Audit trail for all report access and actions';

-- Report Shares Table
-- Track shared report links
CREATE TABLE IF NOT EXISTS public.report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.generated_reports(id) ON DELETE CASCADE,
  shared_by_user_id UUID REFERENCES auth.users(id),
  share_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  max_downloads INTEGER,
  download_count INTEGER DEFAULT 0,
  password_hash TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_accessed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.report_shares IS 'Secure shareable links for reports with expiration and access control';

-- Create indexes for performance
CREATE INDEX idx_generated_reports_user ON public.generated_reports(generated_for_user_id);
CREATE INDEX idx_generated_reports_status ON public.generated_reports(status);
CREATE INDEX idx_generated_reports_type ON public.generated_reports(report_type);
CREATE INDEX idx_generated_reports_created ON public.generated_reports(created_at DESC);
CREATE INDEX idx_generated_reports_schedule ON public.generated_reports(schedule_id) WHERE schedule_id IS NOT NULL;

CREATE INDEX idx_report_schedules_active ON public.report_schedules(is_active, next_run_at) WHERE is_active = TRUE;
CREATE INDEX idx_report_schedules_user ON public.report_schedules(created_by);

CREATE INDEX idx_report_access_logs_report ON public.report_access_logs(report_id);
CREATE INDEX idx_report_access_logs_user ON public.report_access_logs(user_id);
CREATE INDEX idx_report_access_logs_created ON public.report_access_logs(created_at DESC);

CREATE INDEX idx_report_shares_token ON public.report_shares(share_token);
CREATE INDEX idx_report_shares_report ON public.report_shares(report_id);
CREATE INDEX idx_report_shares_active ON public.report_shares(is_active, expires_at) WHERE is_active = TRUE;

-- Trigger for updated_at
CREATE TRIGGER update_report_definitions_updated_at
  BEFORE UPDATE ON public.report_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_generated_reports_updated_at
  BEFORE UPDATE ON public.generated_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_report_schedules_updated_at
  BEFORE UPDATE ON public.report_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function: Calculate next run time for report schedule
CREATE OR REPLACE FUNCTION calculate_next_run_time(
  p_frequency report_schedule_frequency,
  p_day_of_week INTEGER,
  p_day_of_month INTEGER,
  p_time_of_day TIME,
  p_timezone TEXT,
  p_current_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_next_run TIMESTAMPTZ;
  v_base_date DATE;
BEGIN
  v_base_date := (p_current_time AT TIME ZONE p_timezone)::DATE;

  CASE p_frequency
    WHEN 'daily' THEN
      v_next_run := (v_base_date + INTERVAL '1 day' + p_time_of_day) AT TIME ZONE p_timezone;

    WHEN 'weekly' THEN
      -- Calculate next occurrence of specified day of week
      v_next_run := (v_base_date +
                    ((p_day_of_week - EXTRACT(DOW FROM v_base_date)::INTEGER + 7) % 7)::INTEGER * INTERVAL '1 day' +
                    p_time_of_day) AT TIME ZONE p_timezone;
      IF v_next_run <= p_current_time THEN
        v_next_run := v_next_run + INTERVAL '7 days';
      END IF;

    WHEN 'monthly' THEN
      -- Calculate next occurrence of specified day of month
      v_next_run := (DATE_TRUNC('month', v_base_date) + (p_day_of_month - 1) * INTERVAL '1 day' + p_time_of_day) AT TIME ZONE p_timezone;
      IF v_next_run <= p_current_time THEN
        v_next_run := (DATE_TRUNC('month', v_base_date) + INTERVAL '1 month' + (p_day_of_month - 1) * INTERVAL '1 day' + p_time_of_day) AT TIME ZONE p_timezone;
      END IF;

    WHEN 'quarterly' THEN
      -- First day of next quarter
      v_next_run := (DATE_TRUNC('quarter', v_base_date) + INTERVAL '3 months' + p_time_of_day) AT TIME ZONE p_timezone;

    WHEN 'yearly' THEN
      -- First day of next year
      v_next_run := (DATE_TRUNC('year', v_base_date) + INTERVAL '1 year' + p_time_of_day) AT TIME ZONE p_timezone;

    ELSE
      RAISE EXCEPTION 'Invalid frequency: %', p_frequency;
  END CASE;

  RETURN v_next_run;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get report generation statistics
CREATE OR REPLACE FUNCTION get_report_statistics(
  p_user_id UUID DEFAULT NULL,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  report_type report_type,
  format report_format,
  total_generated BIGINT,
  successful BIGINT,
  failed BIGINT,
  avg_processing_time_ms NUMERIC,
  total_downloads BIGINT,
  total_file_size_bytes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gr.report_type,
    gr.format,
    COUNT(*) AS total_generated,
    COUNT(*) FILTER (WHERE gr.status = 'completed') AS successful,
    COUNT(*) FILTER (WHERE gr.status = 'failed') AS failed,
    AVG(gr.processing_duration_ms) AS avg_processing_time_ms,
    SUM(gr.download_count) AS total_downloads,
    SUM(gr.file_size_bytes) AS total_file_size_bytes
  FROM public.generated_reports gr
  WHERE gr.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    AND (p_user_id IS NULL OR gr.generated_for_user_id = p_user_id)
  GROUP BY gr.report_type, gr.format
  ORDER BY gr.report_type, gr.format;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Clean up expired reports
CREATE OR REPLACE FUNCTION cleanup_expired_reports(
  p_retention_days INTEGER DEFAULT 90
)
RETURNS TABLE(
  deleted_count INTEGER,
  storage_paths TEXT[]
) AS $$
DECLARE
  v_deleted_count INTEGER;
  v_storage_paths TEXT[];
BEGIN
  -- Get storage paths before deletion for cleanup
  SELECT ARRAY_AGG(storage_path)
  INTO v_storage_paths
  FROM public.generated_reports
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
    AND storage_path IS NOT NULL;

  -- Delete old reports
  WITH deleted AS (
    DELETE FROM public.generated_reports
    WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_deleted_count FROM deleted;

  RETURN QUERY SELECT v_deleted_count, v_storage_paths;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get reports for user with filters
CREATE OR REPLACE FUNCTION get_user_reports(
  p_user_id UUID,
  p_report_type report_type DEFAULT NULL,
  p_status report_status DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  report_type report_type,
  format report_format,
  status report_status,
  storage_path TEXT,
  file_size_bytes BIGINT,
  download_url TEXT,
  download_url_expires_at TIMESTAMPTZ,
  download_count INTEGER,
  date_range_start DATE,
  date_range_end DATE,
  created_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gr.id,
    gr.report_type,
    gr.format,
    gr.status,
    gr.storage_path,
    gr.file_size_bytes,
    gr.download_url,
    gr.download_url_expires_at,
    gr.download_count,
    gr.date_range_start,
    gr.date_range_end,
    gr.created_at,
    gr.processing_completed_at
  FROM public.generated_reports gr
  WHERE gr.generated_for_user_id = p_user_id
    AND (p_report_type IS NULL OR gr.report_type = p_report_type)
    AND (p_status IS NULL OR gr.status = p_status)
  ORDER BY gr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default report definitions
INSERT INTO public.report_definitions (report_type, name, description, template_config, is_admin_only) VALUES
  ('portfolio_performance', 'Portfolio Performance Report', 'Comprehensive view of portfolio performance with charts and metrics', '{"sections": ["summary", "holdings", "performance", "charts"], "charts": ["allocation", "performance_trend"]}', false),
  ('transaction_history', 'Transaction History Report', 'Detailed list of all transactions for a given period', '{"sections": ["summary", "transactions", "totals"], "grouping": "by_type"}', false),
  ('tax_report', 'Tax Report (1099)', 'Annual tax report with capital gains and income details', '{"sections": ["summary", "capital_gains", "income", "cost_basis"], "year_end_only": true}', false),
  ('monthly_statement', 'Monthly Statement', 'Professional monthly account statement', '{"sections": ["cover", "summary", "holdings", "transactions", "disclosures"]}', false),
  ('annual_summary', 'Annual Summary Report', 'Year-end summary with full performance review', '{"sections": ["executive_summary", "yearly_performance", "asset_breakdown", "tax_summary"]}', false),
  ('custom_date_range', 'Custom Date Range Report', 'Flexible report for any date range', '{"sections": ["summary", "performance", "transactions"], "customizable": true}', false),
  ('aum_report', 'Assets Under Management Report', 'AUM trends and breakdown by fund and asset', '{"sections": ["summary", "trend_analysis", "fund_breakdown", "investor_breakdown"]}', true),
  ('investor_activity', 'Investor Activity Report', 'New investors, deposits, withdrawals, and engagement metrics', '{"sections": ["summary", "new_investors", "activity_breakdown", "engagement"]}', true),
  ('transaction_volume', 'Transaction Volume Report', 'Transaction volume analysis by type, asset, and period', '{"sections": ["summary", "volume_charts", "breakdown_by_type", "breakdown_by_asset"]}', true),
  ('compliance_report', 'Compliance Report', 'KYC/AML status and compliance metrics', '{"sections": ["summary", "kyc_status", "aml_alerts", "pending_verifications"]}', true),
  ('fund_performance', 'Fund Performance Report', 'Performance metrics across all funds', '{"sections": ["summary", "fund_comparison", "performance_attribution", "risk_metrics"]}', true),
  ('fee_analysis', 'Fee Analysis Report', 'Management and performance fees analysis', '{"sections": ["summary", "fee_breakdown", "investor_analysis", "trends"]}', true),
  ('audit_trail', 'Audit Trail Report', 'Complete audit log for compliance', '{"sections": ["summary", "events", "user_actions", "system_events"]}', true)
ON CONFLICT (report_type, name) DO NOTHING;

COMMENT ON FUNCTION calculate_next_run_time IS 'Calculates the next scheduled run time for a report based on frequency and timezone';
COMMENT ON FUNCTION get_report_statistics IS 'Returns aggregated statistics about report generation';
COMMENT ON FUNCTION cleanup_expired_reports IS 'Removes reports older than retention period and returns storage paths for cleanup';
COMMENT ON FUNCTION get_user_reports IS 'Retrieves reports for a specific user with optional filters';;
