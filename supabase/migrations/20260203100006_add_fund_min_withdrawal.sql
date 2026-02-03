-- Bug #7: Add asset-specific withdrawal minimums to funds table
-- Default NULL = no minimum enforced. Only funds with explicit values will validate.

ALTER TABLE funds ADD COLUMN IF NOT EXISTS min_withdrawal_amount numeric(20,8) DEFAULT NULL;

UPDATE funds SET min_withdrawal_amount = 0.001 WHERE asset = 'BTC';
UPDATE funds SET min_withdrawal_amount = 0.01 WHERE asset = 'ETH';
UPDATE funds SET min_withdrawal_amount = 10 WHERE asset = 'USDT';
UPDATE funds SET min_withdrawal_amount = 10 WHERE asset = 'USDC';

COMMENT ON COLUMN funds.min_withdrawal_amount IS 'Minimum withdrawal amount in fund asset. NULL = no minimum enforced.';
