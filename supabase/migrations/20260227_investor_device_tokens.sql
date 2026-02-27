-- investor_device_tokens
-- Stores Expo push tokens per investor device for yield-applied push notifications

CREATE TABLE IF NOT EXISTS public.investor_device_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_token   text NOT NULL,
  platform     text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investor_id, expo_token)
);

-- Prevent admin access to raw tokens from the web app; only Edge Functions touch this table
ALTER TABLE public.investor_device_tokens ENABLE ROW LEVEL SECURITY;

-- Investors may insert/update/delete their own tokens; no SELECT needed from client
CREATE POLICY "investor_device_tokens_insert" ON public.investor_device_tokens
  FOR INSERT TO authenticated
  WITH CHECK (investor_id = auth.uid());

CREATE POLICY "investor_device_tokens_delete" ON public.investor_device_tokens
  FOR DELETE TO authenticated
  USING (investor_id = auth.uid());

-- Service role (Edge Functions) can read everything
CREATE POLICY "service_role_read" ON public.investor_device_tokens
  FOR SELECT TO service_role USING (true);

-- Auto-update updated_at on upsert
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS investor_device_tokens_updated_at ON public.investor_device_tokens;
CREATE TRIGGER investor_device_tokens_updated_at
  BEFORE UPDATE ON public.investor_device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
