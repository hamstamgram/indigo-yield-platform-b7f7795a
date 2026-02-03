-- =============================================
-- Fund Reporting Month Closures Table & RPC
-- Tracks closed months for yield reporting
-- =============================================

-- Create the fund_reporting_month_closures table
CREATE TABLE IF NOT EXISTS public.fund_reporting_month_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  month_end DATE NOT NULL,
  purpose public.aum_purpose NOT NULL DEFAULT 'reporting',
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by UUID NOT NULL REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Idempotency constraint - cannot close same fund+month+purpose twice
  CONSTRAINT unique_fund_month_purpose UNIQUE (fund_id, month_start, purpose),
  
  -- Ensure month_start is actually first of month
  CONSTRAINT valid_month_start CHECK (month_start = date_trunc('month', month_start)::date),
  
  -- Ensure month_end is last day of the same month
  CONSTRAINT valid_month_end CHECK (month_end = (date_trunc('month', month_start) + interval '1 month - 1 day')::date)
);

-- Enable RLS
ALTER TABLE public.fund_reporting_month_closures ENABLE ROW LEVEL SECURITY;

-- RLS: Admin can manage closures
CREATE POLICY "Admins can manage month closures"
ON public.fund_reporting_month_closures
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_fund_closures_lookup 
ON public.fund_reporting_month_closures(fund_id, month_start, purpose);

-- =============================================
-- RPC: close_fund_reporting_month
-- Validates and creates a month closure record
-- =============================================

CREATE OR REPLACE FUNCTION public.close_fund_reporting_month(
  p_fund_id UUID,
  p_month_start DATE,
  p_effective_date DATE,
  p_admin_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_month_end DATE;
  v_closure_id UUID;
  v_fund_name TEXT;
BEGIN
  -- Calculate month_end from month_start
  v_month_end := (date_trunc('month', p_month_start) + interval '1 month - 1 day')::date;
  
  -- Ensure month_start is actually first of month
  IF p_month_start != date_trunc('month', p_month_start)::date THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'month_start must be first day of month (e.g., 2024-12-01)'
    );
  END IF;
  
  -- Validate effective_date is within the reporting month
  IF p_effective_date < p_month_start OR p_effective_date > v_month_end THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Effective date %s must be within reporting month %s to %s', 
        p_effective_date, p_month_start, v_month_end)
    );
  END IF;
  
  -- Check for existing closure (idempotency check)
  IF EXISTS (
    SELECT 1 FROM fund_reporting_month_closures 
    WHERE fund_id = p_fund_id 
      AND month_start = p_month_start 
      AND purpose = 'reporting'
  ) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'This month is already closed for reporting. Cannot close again.'
    );
  END IF;
  
  -- Get fund name for audit log
  SELECT name INTO v_fund_name FROM funds WHERE id = p_fund_id;
  
  -- Insert closure record
  INSERT INTO fund_reporting_month_closures (
    fund_id, month_start, month_end, purpose, closed_by, notes
  ) VALUES (
    p_fund_id, p_month_start, v_month_end, 'reporting', p_admin_id, p_notes
  ) RETURNING id INTO v_closure_id;
  
  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES (
    'CLOSE_REPORTING_MONTH', 
    'fund_reporting_month_closures', 
    v_closure_id::text, 
    p_admin_id,
    jsonb_build_object(
      'fund_id', p_fund_id,
      'fund_name', v_fund_name,
      'month_start', p_month_start, 
      'month_end', v_month_end, 
      'effective_date', p_effective_date
    )
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'closure_id', v_closure_id,
    'fund_id', p_fund_id,
    'month_start', p_month_start,
    'month_end', v_month_end,
    'closed_at', NOW()
  );
END;
$$;

-- =============================================
-- RPC: get_month_closure_status
-- Returns closure status for a fund+month
-- =============================================

CREATE OR REPLACE FUNCTION public.get_month_closure_status(
  p_fund_id UUID,
  p_month_start DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_closure RECORD;
BEGIN
  SELECT 
    id, 
    fund_id, 
    month_start, 
    month_end, 
    purpose,
    closed_at, 
    closed_by,
    notes
  INTO v_closure
  FROM fund_reporting_month_closures
  WHERE fund_id = p_fund_id 
    AND month_start = date_trunc('month', p_month_start)::date
    AND purpose = 'reporting'
  LIMIT 1;
  
  IF v_closure IS NULL THEN
    RETURN jsonb_build_object(
      'is_closed', false,
      'fund_id', p_fund_id,
      'month_start', date_trunc('month', p_month_start)::date
    );
  END IF;
  
  RETURN jsonb_build_object(
    'is_closed', true,
    'closure_id', v_closure.id,
    'fund_id', v_closure.fund_id,
    'month_start', v_closure.month_start,
    'month_end', v_closure.month_end,
    'closed_at', v_closure.closed_at,
    'closed_by', v_closure.closed_by,
    'notes', v_closure.notes
  );
END;
$$;