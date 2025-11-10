/**
 * CSRF Token Management
 * Generates and validates CSRF tokens for protecting against Cross-Site Request Forgery attacks
 */

const CSRF_TOKEN_KEY = 'csrf_token';
const TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure random CSRF token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create CSRF token from session storage
 * Session storage is used (not localStorage) as CSRF tokens should be per-session
 */
export function getCsrfToken(): string {
  let token = sessionStorage.getItem(CSRF_TOKEN_KEY);
  
  if (!token) {
    token = generateCsrfToken();
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  }
  
  return token;
}

/**
 * Clear CSRF token (call on logout)
 */
export function clearCsrfToken(): void {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
}

/**
 * Validate CSRF token format (client-side check)
 */
export function isValidCsrfTokenFormat(token: string | null): boolean {
  if (!token) return false;
  return token.length === TOKEN_LENGTH * 2 && /^[0-9a-f]+$/.test(token);
}

/**
 * Add CSRF token to request headers
 */
export function addCsrfHeader(headers: Record<string, string> = {}): Record<string, string> {
  return {
    ...headers,
    'x-csrf-token': getCsrfToken()
  };
}
