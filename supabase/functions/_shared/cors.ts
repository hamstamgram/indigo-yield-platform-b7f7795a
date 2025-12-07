// Allowed origins for CORS - restrict to known domains only
const ALLOWED_ORIGINS = [
  "https://indigo-yield-platform.vercel.app",
  "https://indigo-yield-platform-v01.vercel.app",
  "https://app.indigofund.com",
  "https://www.indigofund.com",
  "http://localhost:3000",
  "http://localhost:5173", // Vite dev server
];

// Static CORS headers (used when origin is not dynamic)
export const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0], // Default to primary production URL
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

/**
 * Get CORS headers with dynamic origin validation
 * @param requestOrigin - The Origin header from the incoming request
 * @returns CORS headers with validated origin or default
 */
export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

/**
 * Check if an origin is allowed
 * @param origin - The origin to check
 * @returns true if origin is in allowlist
 */
export function isAllowedOrigin(origin?: string | null): boolean {
  return origin ? ALLOWED_ORIGINS.includes(origin) : false;
}
