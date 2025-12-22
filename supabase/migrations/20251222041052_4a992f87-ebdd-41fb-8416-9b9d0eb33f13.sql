-- Create report_runs table for tracking batch report generation
CREATE TABLE IF NOT EXISTS public.report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES statement_periods(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'started' 
    CHECK (status IN ('started', 'in_progress', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  triggered_by UUID REFERENCES profiles(id),
  investors_total INTEGER DEFAULT 0,
  investors_generated INTEGER DEFAULT 0,
  investors_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add comment
COMMENT ON TABLE public.report_runs IS 'Tracks batch report generation runs per period';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_report_runs_period ON public.report_runs(period_id);
CREATE INDEX IF NOT EXISTS idx_report_runs_status ON public.report_runs(status);
CREATE INDEX IF NOT EXISTS idx_report_runs_started_at ON public.report_runs(started_at DESC);

-- Enable Row Level Security
ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can manage report_runs
CREATE POLICY "Admins can manage report_runs" ON public.report_runs
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());