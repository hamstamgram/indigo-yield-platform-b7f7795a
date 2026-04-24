import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://nkfimvovosdehmyyjubn.supabase.co";

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase anon key. Set VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY."
  );
}

if (import.meta.env.DEV && import.meta.env.VITE_SUPABASE_URL) {
  console.log("[supabase] Using env-provided URL:", import.meta.env.VITE_SUPABASE_URL);
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
