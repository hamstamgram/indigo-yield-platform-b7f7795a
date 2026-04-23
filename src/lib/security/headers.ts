/**
 * Security headers configuration and utilities
 */

import config from "@/config/environment";

// Extract Supabase host from URL for CSP
const supabaseUrl = config.supabase.url;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : "";

export const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  // Note: X-XSS-Protection is deprecated and can cause security issues in some browsers
  // Modern browsers use CSP for XSS protection instead
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-site",
} as const;

// Build CSP policy dynamically based on configuration
function buildCSPPolicy() {
  const policy: Record<string, string> = {
    "default-src": "'self'",
    // Removed 'unsafe-inline' for better XSS protection
    // Modern bundlers like Vite handle all script bundling
    "script-src": `'self'${supabaseHost ? ` https://${supabaseHost}` : ""}`,
    // Allow 'unsafe-inline' for Tailwind/styled components and Google Fonts stylesheets
    "style-src": "'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src": "'self' data: https:",
    "connect-src": `'self'${
      supabaseHost
        ? supabaseHost.includes("localhost") || supabaseHost.includes("127.0.0.1")
          ? ` http://${supabaseHost} ws://${supabaseHost}`
          : ` https://${supabaseHost} wss://${supabaseHost}`
        : ""
    }`,
    // Allow Google Fonts and font data URIs
    "font-src": "'self' data: https://fonts.gstatic.com",
    "object-src": "'none'",
    "media-src": "'self'",
    "worker-src": "'self' blob:",
    "frame-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
  };
  return policy;
}

export const CSP_POLICY = buildCSPPolicy();

export function generateCSP(): string {
  return Object.entries(CSP_POLICY)
    .map(([directive, sources]) => `${directive} ${sources}`)
    .join("; ");
}

export function applySecurityHeaders() {
  // Apply security headers where possible via meta tags
  // NOTE: X-Frame-Options, X-Content-Type-Options, HSTS, etc. MUST be set via HTTP headers
  // (configured in lovable.json) - browsers ignore these when set via meta tags.
  // Only CSP works as a meta tag via http-equiv.
  const head = document.head;

  // Content Security Policy - this works as a meta tag
  const cspMeta = document.createElement("meta");
  cspMeta.httpEquiv = "Content-Security-Policy";
  cspMeta.content = generateCSP();
  head.appendChild(cspMeta);
}

export function validateCSRFToken(token: string): boolean {
  // Basic CSRF token validation
  const storedToken = sessionStorage.getItem("csrf_token");
  return storedToken === token && token.length >= 32;
}

export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const token = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  sessionStorage.setItem("csrf_token", token);
  return token;
}
