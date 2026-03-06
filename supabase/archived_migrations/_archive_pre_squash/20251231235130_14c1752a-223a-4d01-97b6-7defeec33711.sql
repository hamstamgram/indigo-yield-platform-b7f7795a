-- Add 'withdrawal_completion' to tx_source enum
-- This value is used by the complete_withdrawal function when recording
-- withdrawal transactions in transactions_v2

ALTER TYPE tx_source ADD VALUE IF NOT EXISTS 'withdrawal_completion';

-- Add comment for documentation
COMMENT ON TYPE tx_source IS 
  'Transaction source types: manual_admin, yield_distribution, fee_allocation, ib_allocation, system_bootstrap, investor_wizard, internal_routing, yield_correction, withdrawal_completion';