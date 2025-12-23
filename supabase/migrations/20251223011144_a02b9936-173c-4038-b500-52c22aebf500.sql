-- Fix search_path for sync_ib_account_type function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;