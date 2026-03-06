-- P0 Security Fix: Enable RLS on exposed tables
-- Risk: These tables were accessible without authentication

-- 1. Enable RLS on position_correction_log
ALTER TABLE IF EXISTS position_correction_log ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on temp_investor
ALTER TABLE IF EXISTS temp_investor ENABLE ROW LEVEL SECURITY;

-- 3. Enable RLS on temp_fund
ALTER TABLE IF EXISTS temp_fund ENABLE ROW LEVEL SECURITY;

-- 4. Enable RLS on temp_balance
ALTER TABLE IF EXISTS temp_balance ENABLE ROW LEVEL SECURITY;

-- 5. Enable RLS on yield_allocations
ALTER TABLE IF EXISTS yield_allocations ENABLE ROW LEVEL SECURITY;

-- Add admin-only policies using the safe is_admin() function

-- Policy for position_correction_log
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'position_correction_log') THEN
    CREATE POLICY "admin_only_position_correction_log" 
    ON position_correction_log 
    FOR ALL 
    TO authenticated
    USING (is_admin());
  END IF;
END $$;

-- Policy for temp_investor
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'temp_investor') THEN
    CREATE POLICY "admin_only_temp_investor" 
    ON temp_investor 
    FOR ALL 
    TO authenticated
    USING (is_admin());
  END IF;
END $$;

-- Policy for temp_fund
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'temp_fund') THEN
    CREATE POLICY "admin_only_temp_fund" 
    ON temp_fund 
    FOR ALL 
    TO authenticated
    USING (is_admin());
  END IF;
END $$;

-- Policy for temp_balance
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'temp_balance') THEN
    CREATE POLICY "admin_only_temp_balance" 
    ON temp_balance 
    FOR ALL 
    TO authenticated
    USING (is_admin());
  END IF;
END $$;

-- Policy for yield_allocations
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'yield_allocations') THEN
    CREATE POLICY "admin_only_yield_allocations" 
    ON yield_allocations 
    FOR ALL 
    TO authenticated
    USING (is_admin());
  END IF;
END $$;