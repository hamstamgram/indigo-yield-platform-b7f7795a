-- Add missing columns to statement_email_delivery for MailerSend tracking
ALTER TABLE public.statement_email_delivery 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'email_html';

-- Add comment for clarity
COMMENT ON COLUMN public.statement_email_delivery.delivered_at IS 'Timestamp when email was confirmed delivered via webhook';
COMMENT ON COLUMN public.statement_email_delivery.delivery_mode IS 'Delivery mode: email_html, pdf_attachment, link_only, hybrid';

-- Add constraint to ensure valid delivery modes
ALTER TABLE public.statement_email_delivery
ADD CONSTRAINT valid_delivery_mode 
CHECK (delivery_mode IS NULL OR delivery_mode IN ('email_html', 'pdf_attachment', 'link_only', 'hybrid'));

-- Add unique constraint to prevent duplicate deliveries per period+investor+provider
CREATE UNIQUE INDEX IF NOT EXISTS unique_delivery_investor_period_provider 
ON public.statement_email_delivery (investor_id, period_id, provider) 
WHERE status NOT IN ('cancelled', 'CANCELLED');

-- Add index for faster delivery_mode filtering
CREATE INDEX IF NOT EXISTS idx_statement_email_delivery_mode 
ON public.statement_email_delivery (delivery_mode) WHERE delivery_mode IS NOT NULL;