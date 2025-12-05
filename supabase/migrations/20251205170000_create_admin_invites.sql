-- Create admin_invites table
CREATE TABLE IF NOT EXISTS public.admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_invites_email ON public.admin_invites(email);
CREATE INDEX IF NOT EXISTS idx_admin_invites_code ON public.admin_invites(invite_code);

-- RLS
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all invites"
  ON public.admin_invites FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can create invites"
  ON public.admin_invites FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Public can view invites by code"
  ON public.admin_invites FOR SELECT
  TO anon
  USING (true); -- Needed for the accept page to verify code

CREATE POLICY "System/Public update usage"
  ON public.admin_invites FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
