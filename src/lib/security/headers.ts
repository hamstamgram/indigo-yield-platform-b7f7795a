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
    "connect-src": `'self'${supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ""}`,
    // Allow Google Fonts and font data URIs
    "font-src": "'self' data: https://fonts.gstatic.com",
    "object-src": "'none'",
    "media-src": "'self'",
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
  // Apply security headers as meta tags
  const head = document.head;

  // Content Security Policy
  const cspMeta = document.createElement("meta");
  cspMeta.httpEquiv = "Content-Security-Policy";
  cspMeta.content = generateCSP();
  head.appendChild(cspMeta);

  // Other security headers as meta tags where applicable
  const xFrameMeta = document.createElement("meta");
  xFrameMeta.httpEquiv = "X-Frame-Options";
  xFrameMeta.content = SECURITY_HEADERS["X-Frame-Options"];
  head.appendChild(xFrameMeta);

  const xContentTypeMeta = document.createElement("meta");
  xContentTypeMeta.httpEquiv = "X-Content-Type-Options";
  xContentTypeMeta.content = SECURITY_HEADERS["X-Content-Type-Options"];
  head.appendChild(xContentTypeMeta);
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
