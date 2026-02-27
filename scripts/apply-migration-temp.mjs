import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://nkfimvovosdehmyyjubn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k';

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Check if the function exists
const { data: probe, error: probeError } = await sb.rpc('apply_backfill_yield', {
  p_fund_id: '00000000-0000-0000-0000-000000000001',
  p_event_date: '2025-01-01',
  p_gross_pct: 0.01,
  p_admin_id: '00000000-0000-0000-0000-000000000001',
});

if (probeError && probeError.message.includes('Could not find the function')) {
  console.log('Function does not exist - need to apply migration manually');
  console.log('Please run this SQL in the Supabase SQL editor:');
  console.log('  supabase/migrations/20260225_apply_backfill_yield.sql');
} else if (probeError) {
  console.log('Function exists (probe error:', probeError.message.slice(0, 80), ')');
  console.log('Migration already applied!');
} else {
  console.log('Function called successfully:', probe);
}
