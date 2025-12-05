-- Add RLS policies for yield_rates table (if it exists and doesn't have policies)
DO $$
BEGIN
  -- Check if yield_rates table exists and add policies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'yield_rates') THEN
    -- Enable RLS
    ALTER TABLE public.yield_rates ENABLE ROW LEVEL SECURITY;
    
    -- Add policies
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'yield_rates' AND policyname = 'Admin can manage yield rates') THEN
      CREATE POLICY "Admin can manage yield rates" ON public.yield_rates
        FOR ALL USING (is_admin_v2()) WITH CHECK (is_admin_v2());
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'yield_rates' AND policyname = 'Users can view yield rates') THEN
      CREATE POLICY "Users can view yield rates" ON public.yield_rates
        FOR SELECT USING (true);
    END IF;
  END IF;
END $$;;
