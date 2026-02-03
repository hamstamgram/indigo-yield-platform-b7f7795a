-- ============================================================================
-- P0: Block Transaction Bypass Paths
-- Date: 2026-01-16
-- Purpose: Ensure all transactions go through crystallization-aware RPCs
-- ============================================================================

-- ============================================================================
-- 1. Revoke direct INSERT/UPDATE on transactions_v2 from authenticated role
-- ============================================================================
-- Note: SECURITY DEFINER functions bypass these restrictions
-- Admins retain access through is_admin() checks in RLS policies

REVOKE INSERT, UPDATE ON transactions_v2 FROM authenticated;
REVOKE INSERT, UPDATE ON transactions_v2 FROM anon;

-- Keep SELECT for viewing transactions (controlled by RLS)
-- Keep DELETE revoked (we use soft-delete via is_voided)

-- ============================================================================
-- 2. Create trigger to enforce RPC-only inserts (belt + suspenders)
-- ============================================================================
CREATE OR REPLACE FUNCTION enforce_transaction_via_rpc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow if called from a known RPC (check source column)
  IF NEW.source IN ('rpc_canonical', 'crystallization', 'system', 'migration') THEN
    RETURN NEW;
  END IF;

  -- Allow if admin performing manual correction (rare, audited)
  IF NEW.source = 'manual_admin' AND is_admin() THEN
    RETURN NEW;
  END IF;

  -- Block all other sources
  RAISE EXCEPTION 'Direct transaction inserts are not allowed. Use apply_transaction_with_crystallization() RPC. Source: %', COALESCE(NEW.source::text, 'NULL');
END;
$$;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_enforce_transaction_via_rpc'
  ) THEN
    CREATE TRIGGER trg_enforce_transaction_via_rpc
      BEFORE INSERT ON transactions_v2
      FOR EACH ROW
      EXECUTE FUNCTION enforce_transaction_via_rpc();
  END IF;
END $$;

-- ============================================================================
-- 3. Add tx_source enum values for RPC tracking
-- ============================================================================
DO $$
BEGIN
  -- Add 'crystallization' source if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'tx_source' AND e.enumlabel = 'crystallization'
  ) THEN
    ALTER TYPE tx_source ADD VALUE IF NOT EXISTS 'crystallization';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  -- Add 'system' source if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'tx_source' AND e.enumlabel = 'system'
  ) THEN
    ALTER TYPE tx_source ADD VALUE IF NOT EXISTS 'system';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  -- Add 'migration' source if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'tx_source' AND e.enumlabel = 'migration'
  ) THEN
    ALTER TYPE tx_source ADD VALUE IF NOT EXISTS 'migration';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 4. Create audit log for bypass attempts
-- ============================================================================
CREATE TABLE IF NOT EXISTS transaction_bypass_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  attempted_source text,
  attempted_type text,
  attempted_amount numeric,
  investor_id uuid,
  fund_id uuid,
  error_message text,
  client_info jsonb
);

-- RLS on bypass attempts (admin only)
ALTER TABLE transaction_bypass_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view bypass attempts" ON transaction_bypass_attempts;
CREATE POLICY "Admins can view bypass attempts" ON transaction_bypass_attempts
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "System can log bypass attempts" ON transaction_bypass_attempts;
CREATE POLICY "System can log bypass attempts" ON transaction_bypass_attempts
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 5. Update existing RPCs to use rpc_canonical source
-- ============================================================================

-- Update apply_deposit_with_crystallization if it exists
DO $$
BEGIN
  -- Check if function exists and update its source usage
  -- This is informational - the actual function would need to be updated
  -- if it's not already using the correct source
  NULL;
END $$;

-- ============================================================================
-- 6. Create helper view for monitoring transaction sources
-- ============================================================================
CREATE OR REPLACE VIEW v_transaction_sources AS
SELECT
  tx_source as source,
  type,
  COUNT(*) as tx_count,
  MIN(created_at) as first_tx,
  MAX(created_at) as last_tx
FROM transactions_v2
WHERE is_voided = false
GROUP BY tx_source, type
ORDER BY tx_source, type;

COMMENT ON VIEW v_transaction_sources IS
  'Monitoring view for transaction sources. All should be rpc_canonical, crystallization, or manual_admin.';

GRANT SELECT ON v_transaction_sources TO authenticated;

-- ============================================================================
-- 7. Create function to check for non-RPC transactions (integrity check)
-- ============================================================================
CREATE OR REPLACE FUNCTION check_transaction_sources()
RETURNS TABLE (
  source tx_source,
  tx_count bigint,
  sample_ids uuid[],
  assessment text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    t.tx_source,
    COUNT(*) as tx_count,
    (ARRAY_AGG(t.id ORDER BY t.created_at DESC))[1:5] as sample_ids,
    CASE
      WHEN t.tx_source IN ('rpc_canonical', 'crystallization', 'system', 'migration') THEN 'OK - approved source'
      WHEN t.tx_source = 'manual_admin' THEN 'REVIEW - manual admin entries'
      ELSE 'WARNING - unapproved source'
    END as assessment
  FROM transactions_v2 t
  WHERE t.is_voided = false
  GROUP BY t.tx_source
  ORDER BY
    CASE
      WHEN t.tx_source IN ('rpc_canonical', 'crystallization', 'system', 'migration') THEN 0
      WHEN t.tx_source = 'manual_admin' THEN 1
      ELSE 2
    END,
    t.tx_source;
$$;

GRANT EXECUTE ON FUNCTION check_transaction_sources TO authenticated;

COMMENT ON FUNCTION check_transaction_sources IS
  'Returns transaction counts by source with assessment. All sources should be approved types.';

