// Updated to use INDIGO Portfolio Supabase (unified with mobile app)
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 'https://noekumitbfoxhsndwypz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vZWt1bWl0YmZveGhzbmR3eXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NDI5MzEsImV4cCI6MjA2NTIxODkzMX0.NsqZLt_0kIK_c1qHg3zDIfbLoZ5z1vf2CuNJKkWVKZ8';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);