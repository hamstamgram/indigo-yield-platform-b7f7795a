-- Enable RLS on fund_aum_events (admin-only table)
ALTER TABLE public.fund_aum_events ENABLE ROW LEVEL SECURITY;

-- Admin read policy (using is_admin boolean)
CREATE POLICY "Admins can view all fund AUM events"
ON public.fund_aum_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Admin insert policy
CREATE POLICY "Admins can insert fund AUM events"
ON public.fund_aum_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Admin update policy
CREATE POLICY "Admins can update fund AUM events"
ON public.fund_aum_events
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);