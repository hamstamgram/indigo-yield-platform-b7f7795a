
-- LOGIC FIXES - STRUCTURAL CHANGES ONLY
-- Data repairs will be done manually via SQL editor

-- 1. Add IB_DEBIT to tx_type enum
ALTER TYPE tx_type ADD VALUE IF NOT EXISTS 'IB_DEBIT';

-- 2. Add version column for optimistic locking
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;

-- 3. Create version increment trigger
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.version := COALESCE(OLD.version, 0) + 1; RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_withdrawal_requests_version ON withdrawal_requests;
CREATE TRIGGER trg_withdrawal_requests_version BEFORE UPDATE ON withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION increment_version();

-- 4. Void orphaned yield distribution (no trigger blocks this)
UPDATE yield_distributions SET status = 'voided', voided_at = now(),
  void_reason = 'REPAIR: Distribution applied without transactions'
WHERE id = '1a564c4a-786d-4ccc-b480-f4d437868462' AND status = 'applied';

-- 5. Void orphaned fee allocations
UPDATE fee_allocations SET is_voided = true, voided_at = now()
WHERE distribution_id = '1a564c4a-786d-4ccc-b480-f4d437868462'
  AND (is_voided IS NULL OR is_voided = false);

-- Audit log
INSERT INTO audit_log (action, entity, entity_id, meta, created_at) VALUES 
  ('REPAIR', 'yield_distributions', '1a564c4a-786d-4ccc-b480-f4d437868462', '{"repair_type": "voided_orphaned_distribution"}'::jsonb, now());
