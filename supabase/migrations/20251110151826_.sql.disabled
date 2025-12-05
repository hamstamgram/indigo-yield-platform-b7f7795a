-- Enable realtime for operations metrics tables (with safe checks)
-- This allows the Operations Hub to receive live updates

-- Enable realtime for deposits (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'deposits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE deposits;
  END IF;
END $$;

-- Enable realtime for investments (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'investments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE investments;
  END IF;
END $$;

-- Enable realtime for transactions_v2 (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'transactions_v2'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE transactions_v2;
  END IF;
END $$;

-- Enable realtime for investors (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'investors'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE investors;
  END IF;
END $$;

-- Enable realtime for investor_positions (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'investor_positions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE investor_positions;
  END IF;
END $$;

-- Set replica identity to FULL for proper realtime updates
ALTER TABLE deposits REPLICA IDENTITY FULL;
ALTER TABLE investments REPLICA IDENTITY FULL;
ALTER TABLE transactions_v2 REPLICA IDENTITY FULL;
ALTER TABLE investors REPLICA IDENTITY FULL;
ALTER TABLE investor_positions REPLICA IDENTITY FULL;
ALTER TABLE withdrawal_requests REPLICA IDENTITY FULL;;
