-- =====================================================
-- Migration: Create Daily Rates Table
-- Description: Table for storing daily cryptocurrency rates for investor notifications
-- Date: 2025-11-05
-- Phase: 5 - Daily Rates & Notifications
-- =====================================================

-- Create daily_rates table
CREATE TABLE IF NOT EXISTS public.daily_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_date date NOT NULL UNIQUE,
  btc_rate numeric(28, 10) NOT NULL DEFAULT 0,
  eth_rate numeric(28, 10) NOT NULL DEFAULT 0,
  sol_rate numeric(28, 10) NOT NULL DEFAULT 0,
  usdt_rate numeric(28, 10) NOT NULL DEFAULT 1.00,
  usdc_rate numeric(28, 10) NOT NULL DEFAULT 1.00,
  eurc_rate numeric(28, 10) NOT NULL DEFAULT 1.00,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add index on rate_date for fast lookups
CREATE INDEX IF NOT EXISTS idx_daily_rates_date ON public.daily_rates(rate_date DESC);

-- Add index on created_at for audit trail
CREATE INDEX IF NOT EXISTS idx_daily_rates_created_at ON public.daily_rates(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_daily_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_rates_updated_at
  BEFORE UPDATE ON public.daily_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_rates_updated_at();

-- Enable Row Level Security
ALTER TABLE public.daily_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can do everything
CREATE POLICY "Admins can manage daily rates"
  ON public.daily_rates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policy: Investors can view daily rates (read-only)
CREATE POLICY "Investors can view daily rates"
  ON public.daily_rates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'investor'
    )
  );

-- Add comments for documentation
COMMENT ON TABLE public.daily_rates IS 'Daily cryptocurrency rates for each fund, entered by admins and sent via notifications';
COMMENT ON COLUMN public.daily_rates.rate_date IS 'The date for which these rates apply (unique per day)';
COMMENT ON COLUMN public.daily_rates.btc_rate IS 'BTC rate in USD on this date';
COMMENT ON COLUMN public.daily_rates.eth_rate IS 'ETH rate in USD on this date';
COMMENT ON COLUMN public.daily_rates.sol_rate IS 'SOL rate in USD on this date';
COMMENT ON COLUMN public.daily_rates.usdt_rate IS 'USDT rate in USD (typically $1.00)';
COMMENT ON COLUMN public.daily_rates.usdc_rate IS 'USDC rate in USD (typically $1.00)';
COMMENT ON COLUMN public.daily_rates.eurc_rate IS 'EURC rate in USD (typically $1.00)';
COMMENT ON COLUMN public.daily_rates.notes IS 'Optional notes about the daily rates';
COMMENT ON COLUMN public.daily_rates.created_by IS 'Admin user who entered these rates';

-- Grant permissions
GRANT SELECT ON public.daily_rates TO authenticated;
GRANT ALL ON public.daily_rates TO service_role;
