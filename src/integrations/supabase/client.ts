import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Helper to get env vars safely across Next.js and Vite environments
const getEnv = (key: string, viteKey: string) => {
  // 1. Try standard Next.js process.env
  if (typeof process !== "undefined" && process.env[key]) {
    return process.env[key];
  }
  // 2. Try Vite import.meta.env (if available)
  if (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env[viteKey]) {
    return (import.meta as any).env[viteKey];
  }
  // 3. Fallback to process.env for VITE_ keys (legacy)
  if (typeof process !== "undefined" && process.env[viteKey]) {
    return process.env[viteKey];
  }
  return undefined;
};

// Use a single, unified Supabase project (nkfimvovosdehmyyjubn)
const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL");
const SUPABASE_ANON_KEY = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY");

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing required environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or VITE_ equivalents) in your .env file or deployment settings. " +
      "Never hardcode credentials in source code."
  );
}

// Validate URL format
if (!SUPABASE_URL.startsWith("https://") || !SUPABASE_URL.includes(".supabase.co")) {
  throw new Error(
    `Invalid Supabase URL format: ${SUPABASE_URL}. Must be a valid Supabase URL (https://*.supabase.co)`
  );
}

// Validate key format (basic JWT structure check)
if (!SUPABASE_ANON_KEY.startsWith("eyJ") || SUPABASE_ANON_KEY.split(".").length !== 3) {
  throw new Error("Invalid Supabase Anon Key format. Must be a valid JWT token.");
}

// Log configuration in development (without exposing sensitive data)
if (process.env.NODE_ENV === "development") {
  console.log("✅ Supabase Configuration:", {
    url: SUPABASE_URL,
    keyPrefix: SUPABASE_ANON_KEY.substring(0, 20) + "...",
    keyLength: SUPABASE_ANON_KEY.length,
  });
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
