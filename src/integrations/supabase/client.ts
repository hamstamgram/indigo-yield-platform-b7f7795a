import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://nkfimvovosdehmyyjubn.supabase.co";

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";

if (!SUPABASE_ANON_KEY) {
  // Log a clear warning instead of throwing — a missing key should surface
  // as failed Supabase calls (visible in the UI) rather than a blank screen.
  console.error(
    "[supabase] Missing VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY. " +
      "Add it to your .env file or hosting provider environment variables."
  );
}

if (import.meta.env.DEV && import.meta.env.VITE_SUPABASE_URL) {
  console.log("[supabase] Using env-provided URL:", import.meta.env.VITE_SUPABASE_URL);
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
