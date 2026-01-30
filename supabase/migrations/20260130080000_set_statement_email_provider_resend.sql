-- Set Resend as default provider for statement email delivery
alter table public.statement_email_delivery
  alter column provider set default 'resend';
