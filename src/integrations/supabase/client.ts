import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Use a single, unified Supabase project (nkfimvovosdehmyyjubn)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env file. " +
    "Never hardcode credentials in source code."
  );
}

// Validate URL format
if (!SUPABASE_URL.startsWith("https://") || !SUPABASE_URL.includes(".supabase.co")) {
  throw new Error(
    `Invalid VITE_SUPABASE_URL format: ${SUPABASE_URL}. Must be a valid Supabase URL (https://*.supabase.co)`
  );
}

// Validate key format (basic JWT structure check)
if (!SUPABASE_ANON_KEY.startsWith("eyJ") || SUPABASE_ANON_KEY.split(".").length !== 3) {
  throw new Error(
    "Invalid VITE_SUPABASE_ANON_KEY format. Must be a valid JWT token."
  );
}

// Log configuration in development (without exposing sensitive data)
if (import.meta.env.DEV) {
  console.log("✅ Supabase Configuration:", {
    url: SUPABASE_URL,
    keyPrefix: SUPABASE_ANON_KEY.substring(0, 20) + "...",
    keyLength: SUPABASE_ANON_KEY.length,
  });
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
