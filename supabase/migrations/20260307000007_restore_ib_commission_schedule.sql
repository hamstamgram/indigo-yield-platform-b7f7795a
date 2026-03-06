-- ============================================================
-- Restore IB Commission Schedule
-- Enables date-based, per-fund IB commission rate overrides.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ib_commission_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES profiles(id),
  fund_id uuid REFERENCES funds(id) ON DELETE CASCADE,
  effective_date date NOT NULL,
  end_date date,
  ib_percentage numeric(5,2) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT chk_ib_pct_range CHECK (ib_percentage >= 0 AND ib_percentage <= 100),
  CONSTRAINT uq_ib_schedule UNIQUE (investor_id, fund_id, effective_date)
);

COMMENT ON TABLE public.ib_commission_schedule IS
  'Date-based IB commission rate overrides per investor, optionally per fund. Mirrors investor_fee_schedule pattern.';

-- ============================================================
-- RLS policies
-- ============================================================
ALTER TABLE public.ib_commission_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all ON public.ib_commission_schedule;
CREATE POLICY admin_all ON public.ib_commission_schedule
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS investor_select ON public.ib_commission_schedule;
CREATE POLICY investor_select ON public.ib_commission_schedule
  FOR SELECT USING (auth.uid() = investor_id);

-- ============================================================
-- Auto-close trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_close_previous_ib_schedule()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Close any existing schedules for the same investor+fund scope
  -- that don't have an end_date and have an effective_date before the new schedule
  UPDATE ib_commission_schedule
  SET
    end_date = NEW.effective_date - INTERVAL '1 day',
    updated_at = NOW()
  WHERE investor_id = NEW.investor_id
    AND COALESCE(fund_id::text, 'ALL') = COALESCE(NEW.fund_id::text, 'ALL')
    AND id != NEW.id
    AND end_date IS NULL
    AND effective_date < NEW.effective_date;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_close_previous_ib_schedule ON public.ib_commission_schedule;
CREATE TRIGGER trg_auto_close_previous_ib_schedule
  BEFORE INSERT ON public.ib_commission_schedule
  FOR EACH ROW EXECUTE FUNCTION public.auto_close_previous_ib_schedule();

-- ============================================================
-- Resolution function: _resolve_investor_ib_pct
-- ============================================================
CREATE OR REPLACE FUNCTION public._resolve_investor_ib_pct(
  p_investor_id uuid,
  p_fund_id uuid,
  p_date date
)
RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ib_pct numeric;
  v_account_type text;
BEGIN
  -- SAFETY: Check account type first - fees_account never has IB
  SELECT account_type INTO v_account_type FROM profiles WHERE id = p_investor_id;
  IF v_account_type = 'fees_account' THEN
    RETURN 0;
  END IF;

  -- Check ib_commission_schedule for fund-specific or global rate
  SELECT ib_percentage INTO v_ib_pct
  FROM public.ib_commission_schedule
  WHERE investor_id = p_investor_id
    AND (fund_id = p_fund_id OR fund_id IS NULL)
    AND effective_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY fund_id NULLS LAST, effective_date DESC
  LIMIT 1;

  IF v_ib_pct IS NOT NULL THEN RETURN v_ib_pct; END IF;

  -- Fallback to profile ib_percentage
  SELECT ib_percentage INTO v_ib_pct FROM public.profiles WHERE id = p_investor_id;
  IF v_ib_pct IS NOT NULL THEN RETURN v_ib_pct; END IF;

  -- Default to 0%
  RETURN 0;
END;
$$;

-- ============================================================
-- Update get_investor_ib_pct to use schedule
-- ============================================================
DROP FUNCTION IF EXISTS public.get_investor_ib_pct(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_investor_ib_pct(
  p_investor_id uuid,
  p_fund_id uuid,
  p_effective_date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public._resolve_investor_ib_pct(p_investor_id, p_fund_id, p_effective_date);
$$;
