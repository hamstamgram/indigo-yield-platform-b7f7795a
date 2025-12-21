-- Fix delivery status constraint to include all webhook-triggered statuses
ALTER TABLE statement_email_delivery DROP CONSTRAINT IF EXISTS chk_delivery_status;
ALTER TABLE statement_email_delivery DROP CONSTRAINT IF EXISTS statement_email_delivery_status_check;

-- Add comprehensive status constraint with all possible states
ALTER TABLE statement_email_delivery ADD CONSTRAINT chk_delivery_status 
CHECK (status = ANY (ARRAY[
  'queued', 'sending', 'sent', 'delivered', 'failed', 'bounced', 'complained', 'cancelled', 'skipped',
  'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'COMPLAINED', 'CANCELLED', 'SKIPPED'
]));