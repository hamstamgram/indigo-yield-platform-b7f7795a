-- Fix RLS policy for portfolios table to allow admin inserts
-- This addresses the addAssetsToInvestor workflow failure

-- First, check if the policy already exists and drop it
DROP POLICY IF EXISTS "Admin can insert portfolios for any user" ON portfolios;

-- Create RLS policy that allows:
-- 1. Users can only access their own portfolio records
-- 2. Admin users can insert/update portfolio records for any user
-- 3. Admin users can read all portfolio records

-- Enable RLS on portfolios table if not already enabled
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT operations
-- Users can read their own portfolios, admins can read all
DROP POLICY IF EXISTS "Users can view own portfolios and admins can view all" ON portfolios;
CREATE POLICY "Users can view own portfolios and admins can view all" ON portfolios
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR 
    (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
      )
    )
  );

-- Policy for INSERT operations  
-- Only admins can insert portfolio records (for any user)
-- Regular users should not be able to create their own portfolio records
CREATE POLICY "Admin can insert portfolios for any user" ON portfolios
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Policy for UPDATE operations
-- Users can update their own portfolios, admins can update any
DROP POLICY IF EXISTS "Users can update own portfolios and admins can update all" ON portfolios;
CREATE POLICY "Users can update own portfolios and admins can update all" ON portfolios
  FOR UPDATE
  USING (
    user_id = auth.uid() 
    OR 
    (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
      )
    )
  );

-- Policy for DELETE operations
-- Only admins can delete portfolio records
DROP POLICY IF EXISTS "Only admins can delete portfolios" ON portfolios;
CREATE POLICY "Only admins can delete portfolios" ON portfolios
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Add a trigger to automatically set created_by and updated_by fields
-- if they exist on the portfolios table
DO $$
BEGIN
  -- Check if created_by column exists, if not add it
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'portfolios' AND column_name = 'created_by') THEN
    ALTER TABLE portfolios ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
  
  -- Check if updated_by column exists, if not add it  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'portfolios' AND column_name = 'updated_by') THEN
    ALTER TABLE portfolios ADD COLUMN updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Create or replace trigger function for audit fields
CREATE OR REPLACE FUNCTION set_audit_fields_portfolios()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    -- Preserve created_by on updates
    NEW.created_by = OLD.created_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS portfolios_audit_trigger ON portfolios;
CREATE TRIGGER portfolios_audit_trigger
  BEFORE INSERT OR UPDATE ON portfolios
  FOR EACH ROW
  EXECUTE FUNCTION set_audit_fields_portfolios();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON portfolios TO authenticated;

-- Add helpful comment
COMMENT ON POLICY "Admin can insert portfolios for any user" ON portfolios 
IS 'Allows admin users to add assets to investor portfolios via the InvestorAssetDropdown component';

-- Test the policy with a sample query (commented out for production)
-- SELECT * FROM portfolios WHERE user_id = 'test-user-id';  -- Should work for admins and the user themselves
