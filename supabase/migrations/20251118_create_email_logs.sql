-- Create email_logs table for audit trail
-- Migration: 20251118_create_email_logs
-- Purpose: Track all emails sent from the platform

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  email_type TEXT,
  report_month DATE,
  sent_by UUID REFERENCES profiles(id),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'sent',
  external_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_by ON email_logs(sent_by);

-- Add RLS policies
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Admin can see all email logs
CREATE POLICY "Admins can view all email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can insert email logs
CREATE POLICY "Admins can insert email logs"
  ON email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Comment for documentation
COMMENT ON TABLE email_logs IS 'Audit trail for all emails sent from the platform';
COMMENT ON COLUMN email_logs.recipient_email IS 'Email address of the recipient';
COMMENT ON COLUMN email_logs.email_type IS 'Type of email: investor_report, password_reset, invitation, etc.';
COMMENT ON COLUMN email_logs.report_month IS 'For investor reports, the month being reported';
COMMENT ON COLUMN email_logs.sent_by IS 'Admin user who triggered the email';
COMMENT ON COLUMN email_logs.status IS 'Status: sent, failed, bounced, etc.';
COMMENT ON COLUMN email_logs.external_id IS 'ID from email provider (MailerLite, Resend, etc.)';
