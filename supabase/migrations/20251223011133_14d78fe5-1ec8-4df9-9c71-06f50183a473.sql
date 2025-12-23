-- ============================================================
-- IB Data Fixes & Validation Trigger
-- ============================================================

-- 1. Fix lars's account_type to 'ib'
UPDATE profiles 
SET account_type = 'ib' 
WHERE id = '4ecade70-05ad-4661-8f65-83b1e56b1c17'
  AND account_type = 'investor';

-- 2. Backfill ib_allocations from existing IB_CREDIT transactions
INSERT INTO ib_allocations (
  id,
  ib_investor_id,
  source_investor_id,
  fund_id,
  source_net_income,
  ib_percentage,
  ib_fee_amount,
  effective_date,
  purpose,
  source,
  period_start,
  period_end
)
SELECT 
  gen_random_uuid(),
  t.investor_id as ib_investor_id,
  COALESCE(
    (SELECT p.id FROM profiles p 
     WHERE p.ib_parent_id = t.investor_id 
     AND t.notes LIKE '%' || LEFT(p.id::text, 8) || '%'
     LIMIT 1),
    (SELECT p.id FROM profiles p WHERE p.ib_parent_id = t.investor_id LIMIT 1)
  ) as source_investor_id,
  t.fund_id,
  CASE 
    WHEN (SELECT ib_percentage FROM profiles WHERE ib_parent_id = t.investor_id LIMIT 1) > 0 
    THEN t.amount / ((SELECT ib_percentage FROM profiles WHERE ib_parent_id = t.investor_id LIMIT 1) / 100.0)
    ELSE t.amount * 20
  END as source_net_income,
  COALESCE((SELECT ib_percentage FROM profiles WHERE ib_parent_id = t.investor_id LIMIT 1), 5) as ib_percentage,
  t.amount as ib_fee_amount,
  t.tx_date as effective_date,
  COALESCE(t.purpose, 'reporting'::aum_purpose) as purpose,
  'from_investor_yield' as source,  -- Valid source value
  date_trunc('month', t.tx_date)::date as period_start,
  t.tx_date as period_end
FROM transactions_v2 t
WHERE t.type = 'IB_CREDIT'
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.ib_parent_id = t.investor_id)
  AND NOT EXISTS (
    SELECT 1 FROM ib_allocations ia 
    WHERE ia.ib_investor_id = t.investor_id 
      AND ia.effective_date = t.tx_date 
      AND ia.ib_fee_amount = t.amount
  );

-- 3. Create validation trigger to ensure IB account_type consistency
CREATE OR REPLACE FUNCTION sync_ib_account_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'ib' THEN
    UPDATE profiles 
    SET account_type = 'ib'
    WHERE id = NEW.user_id 
      AND (account_type IS NULL OR account_type != 'ib');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_ib_account_type ON user_roles;

CREATE TRIGGER trigger_sync_ib_account_type
AFTER INSERT ON user_roles
FOR EACH ROW
EXECUTE FUNCTION sync_ib_account_type();