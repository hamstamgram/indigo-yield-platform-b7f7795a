-- Drop triggers on transactions_v2
DROP TRIGGER IF EXISTS trg_sync_aum_on_transaction ON transactions_v2;
DROP TRIGGER IF EXISTS trg_validate_transaction_has_aum ON transactions_v2;

-- Drop triggers on investor_positions
DROP TRIGGER IF EXISTS trg_sync_aum_after_position ON investor_positions;
DROP TRIGGER IF EXISTS trg_sync_aum_on_position ON investor_positions;
DROP TRIGGER IF EXISTS trg_alert_aum_position_mismatch ON investor_positions;

-- Drop associated functions
DROP FUNCTION IF EXISTS sync_aum_on_transaction() CASCADE;
DROP FUNCTION IF EXISTS validate_transaction_has_aum() CASCADE;
DROP FUNCTION IF EXISTS sync_fund_aum_after_position() CASCADE;
DROP FUNCTION IF EXISTS sync_aum_on_position_change() CASCADE;
DROP FUNCTION IF EXISTS alert_on_aum_position_mismatch() CASCADE;
