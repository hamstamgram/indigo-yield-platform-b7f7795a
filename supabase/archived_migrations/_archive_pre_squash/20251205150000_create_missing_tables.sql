-- Create email_logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT,
  status TEXT CHECK (status IN ('sent', 'failed', 'bounced', 'delivered')),
  message_id TEXT,
  error TEXT,
  metadata JSONB,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all email logs"
  ON public.email_logs FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'service_role' OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "System can insert email logs"
  ON public.email_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT false,
  sms_enabled BOOLEAN DEFAULT false,
  notification_types JSONB DEFAULT '{
    "statements": true,
    "withdrawals": true,
    "deposits": true,
    "security": true,
    "marketing": false
  }'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.notification_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own settings"
  ON public.notification_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own settings"
  ON public.notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
