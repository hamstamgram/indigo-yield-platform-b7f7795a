-- Email Logs Table Migration
-- Created: 2025-11-20
-- Purpose: Audit trail for email sending via Edge Functions

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, sent, failed, bounced
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_status JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS email_logs_user_id_idx ON email_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS email_logs_recipient_idx ON email_logs(recipient, created_at DESC);
CREATE INDEX IF NOT EXISTS email_logs_status_idx ON email_logs(status, created_at DESC);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own email logs
DROP POLICY IF EXISTS email_logs_select_policy ON email_logs;
CREATE POLICY email_logs_select_policy
  ON email_logs FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Only authenticated users can insert (Edge Function uses user's JWT)
DROP POLICY IF EXISTS email_logs_insert_policy ON email_logs;
CREATE POLICY email_logs_insert_policy
  ON email_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add comment for documentation
COMMENT ON TABLE email_logs IS 'Audit trail for all emails sent through the platform. Used for rate limiting, debugging, and compliance.';
COMMENT ON COLUMN email_logs.status IS 'Email delivery status: pending (queued), sent (delivered), failed (permanent), bounced (recipient rejected)';
COMMENT ON COLUMN email_logs.template IS 'Email template identifier: STATEMENT_READY, WELCOME, PASSWORD_RESET, TOTP_ENABLED, WITHDRAWAL_REQUEST, ADMIN_NOTIFICATION';
