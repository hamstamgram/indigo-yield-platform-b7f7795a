-- ============================================================================
-- C3: Update daily_nav primary key to include purpose
-- Release: C (Cleanup)
-- CAUTION: Requires maintenance window if table has FK references
-- ============================================================================

-- First check if any FKs reference daily_nav
DO $$
DECLARE
  v_fk_count integer;
BEGIN
  SELECT COUNT(*) INTO v_fk_count
  FROM information_schema.referential_constraints
  WHERE unique_constraint_name = 'daily_nav_pkey';
  
  IF v_fk_count > 0 THEN
    RAISE EXCEPTION 'Cannot modify daily_nav PK: % foreign keys reference it. Drop those FKs first.', v_fk_count;
  END IF;
  
  RAISE NOTICE 'No FK references to daily_nav_pkey found. Safe to proceed.';
END $$;

-- Drop old PK and add new one including purpose
ALTER TABLE daily_nav DROP CONSTRAINT IF EXISTS daily_nav_pkey;
ALTER TABLE daily_nav ADD PRIMARY KEY (fund_id, nav_date, purpose);

-- Drop the redundant unique index we added in A1 (now covered by PK)
DROP INDEX CONCURRENTLY IF EXISTS idx_daily_nav_fund_date_purpose_unique;

RAISE NOTICE 'daily_nav PK updated to (fund_id, nav_date, purpose)';

-- ============================================================================
-- ROLLBACK:
-- ALTER TABLE daily_nav DROP CONSTRAINT IF EXISTS daily_nav_pkey;
-- ALTER TABLE daily_nav ADD PRIMARY KEY (fund_id, nav_date);
-- CREATE UNIQUE INDEX CONCURRENTLY idx_daily_nav_fund_date_purpose_unique 
--   ON daily_nav (fund_id, nav_date, purpose);
-- ============================================================================
