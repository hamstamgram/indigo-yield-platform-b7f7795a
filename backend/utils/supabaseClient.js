/**
 * Secure Supabase client configuration
 * Enforces environment variable usage for service keys
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nkfimvovosdehmyyjubn.supabase.co';

/**
 * Create Supabase client with service role key
 * Requires SUPABASE_SERVICE_ROLE_KEY environment variable
 * @returns {object} Configured Supabase client
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceKey) {
    console.error('❌ Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
    console.error('   Please set this variable before running the script:');
    console.error('   export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    process.exit(1);
  }
  
  return createClient(SUPABASE_URL, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Create Supabase client with anon key (for client-side usage)
 * @returns {object} Configured Supabase client
 */
export function createAnonClient() {
  const anonKey = process.env.SUPABASE_ANON_KEY;
  
  if (!anonKey) {
    console.error('❌ Missing required environment variable: SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  return createClient(SUPABASE_URL, anonKey);
}
