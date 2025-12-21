-- Add logo_url column to funds table
ALTER TABLE funds ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Remove the restrictive asset check constraint to allow free-text tickers
-- The partial unique index already enforces one active fund per ticker
ALTER TABLE funds DROP CONSTRAINT IF EXISTS funds_asset_check;

-- Add comment for documentation
COMMENT ON COLUMN funds.logo_url IS 'Public URL to fund logo image stored in branding-assets bucket';
COMMENT ON COLUMN funds.asset IS 'Fund ticker symbol (e.g., BTC, ETH). Uppercase letters and numbers only.';