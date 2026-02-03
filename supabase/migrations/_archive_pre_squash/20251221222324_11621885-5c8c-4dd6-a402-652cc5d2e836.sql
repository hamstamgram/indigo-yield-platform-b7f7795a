-- Add MailerSend tracking columns to statement_email_delivery
ALTER TABLE statement_email_delivery 
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'mailersend',
ADD COLUMN IF NOT EXISTS delivery_mode text DEFAULT 'email_html',
ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
ADD COLUMN IF NOT EXISTS opened_at timestamptz,
ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
ADD COLUMN IF NOT EXISTS bounced_at timestamptz,
ADD COLUMN IF NOT EXISTS bounce_type text;

-- Create report_delivery_events table for webhook event history
CREATE TABLE IF NOT EXISTS report_delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES statement_email_delivery(id) ON DELETE CASCADE,
  provider_message_id text,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  occurred_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_report_delivery_events_delivery ON report_delivery_events(delivery_id);
CREATE INDEX IF NOT EXISTS idx_report_delivery_events_message ON report_delivery_events(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_report_delivery_events_occurred ON report_delivery_events(occurred_at DESC);

-- Enable RLS - Admin only access
ALTER TABLE report_delivery_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can access delivery events
CREATE POLICY "Admins can manage delivery events" ON report_delivery_events 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Add index on provider_message_id in statement_email_delivery for webhook lookups
CREATE INDEX IF NOT EXISTS idx_statement_email_delivery_message_id 
ON statement_email_delivery(provider_message_id);