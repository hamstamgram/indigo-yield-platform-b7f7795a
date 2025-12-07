# Code Quality Review: Security Fixes in Indigo Yield Platform
**Security Focused Code Review Report**
**Date**: 2025-11-20
**Reviewer**: AI Code Review Agent
**Review Scope**: 4 Critical Security Files
**Status**: Comprehensive Multi-Dimensional Analysis

---

## Executive Summary

This code quality review evaluates 4 critical security-focused files across **5 dimensional analysis**: TypeScript type safety, error handling patterns, code organization, documentation quality, and test coverage gaps.

### Overall Quality Scores

| File | Type Safety | Error Handling | Organization | Documentation | Test Coverage | **OVERALL** |
|------|-------------|----------------|---------------|----------------|---------------|-----------|
| `src/integrations/supabase/client.ts` | 72% | 65% | 80% | 50% | 30% | **59%** |
| `src/lib/security/headers.ts` | 80% | 60% | 75% | 45% | 20% | **56%** |
| `src/lib/email.ts` | 65% | 70% | 65% | 55% | 10% | **53%** |
| `src/lib/auth/context.tsx` | 70% | 75% | 80% | 50% | 40% | **63%** |
| **AGGREGATE SCORE** | **71.75%** | **67.5%** | **75%** | **50%** | **25%** | **58%** |

---

## File 1: src/integrations/supabase/client.ts

**CRITICAL SEVERITY: HIGH**
**43 lines of code**

### Type Safety Analysis (72/100)

**✅ Strengths**:
- Proper use of `import.meta.env` for environment access
- `Database` type imported and applied to client creation (line 42)
- Validation of required environment variables exists (lines 9-14)

**❌ Critical Issues**:

1. **Unsafe Environment Variable Access**
   ```typescript
   const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;  // Line 5
   // Could be undefined - no type guard
   ```
   **Risk**: TypeScript doesn't enforce strict typing of import.meta.env
   **Recommendation**: Use Zod or io-ts
   ```typescript
   import { z } from 'zod';
   const envSchema = z.object({
     VITE_SUPABASE_URL: z.string().url(),
     VITE_SUPABASE_ANON_KEY: z.string().min(50),
   });
   const env = envSchema.parse(import.meta.env);
   ```

2. **Inadequate URL Validation** (Line 17)
   ```typescript
   if (!SUPABASE_URL.startsWith("https://") || !SUPABASE_URL.includes(".supabase.co"))
   // Issue: Overly simplistic, doesn't validate subdomain format
   ```
   **Recommendation**: Use URL constructor
   ```typescript
   try {
     const url = new URL(SUPABASE_URL);
     if (url.hostname !== "nkfimvovosdehmyyjubn.supabase.co") {
       throw new Error("Invalid Supabase project");
     }
   } catch (e) {
     throw new Error("Invalid VITE_SUPABASE_URL format");
   }
   ```

3. **Superficial JWT Validation** (Line 24)
   ```typescript
   if (!SUPABASE_ANON_KEY.startsWith("eyJ") || SUPABASE_ANON_KEY.split(".").length !== 3)
   // Only checks prefix and structure, not validity
   ```
   **Risk**: Accepts malformed tokens as valid
   **Recommendation**:
   ```typescript
   function isValidJWT(token: string): boolean {
     if (!token.startsWith("eyJ")) return false;
     const parts = token.split(".");
     if (parts.length !== 3) return false;
     try {
       // Decode header and payload (don't verify signature - can't without key)
       atob(parts[0]);
       atob(parts[1]);
       return true;
     } catch {
       return false;
     }
   }
   ```

### Error Handling Analysis (65/100)

**✅ Strengths**:
- Validation errors thrown with descriptive messages
- Clear error reporting per issue (lines 10-27)

**❌ Issues**:

1. **Synchronous Throwing During Module Load** (Lines 9-28)
   ```typescript
   // ❌ Throws during import phase
   if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
     throw new Error(...);
   }
   ```
   **Problem**:
   - Module initialization fails silently in some bundlers
   - Prevents graceful degradation
   - No recovery strategy

   **Recommendation**: Use lazy initialization
   ```typescript
   let client: SupabaseClient<Database> | null = null;
   let initError: Error | null = null;

   function initializeClient() {
     if (client) return client;
     if (initError) throw initError;

     const url = import.meta.env.VITE_SUPABASE_URL;
     const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

     if (!url || !key) {
       initError = new Error("Missing Supabase credentials");
       throw initError;
     }

     client = createClient(url, key);
     return client;
   }

   export const getSupabase = () => initializeClient();
   ```

2. **No Development vs Production Differentiation**
   ```typescript
   // Development logging (lines 31-37)
   if (import.meta.env.DEV) {
     console.log(...);
   }
   // But validation errors always thrown regardless of env
   ```
   **Recommendation**: Different handling for dev/prod

### Code Organization (80/100)

**✅ Strengths**:
- Single responsibility (client initialization only)
- Clean import structure
- Logical progression of validations

**❌ Issues**:

1. **Hardcoded Project ID in Error Messages** (Line 4 comment)
   ```typescript
   // Use a single, unified Supabase project (nkfimvovosdehmyyjubn)
   ```
   **Risk**: Reveals infrastructure details to error logs
   **Recommendation**: Remove hardcoded IDs from comments

2. **No Separation of Validation Logic**
   - Validation is interleaved with client creation
   - Should extract to separate validation module

### Documentation (50/100)

**❌ Critical Gaps**:

1. **Missing Security Documentation**
   - No explanation of credential rotation strategy
   - No notes on SSL/TLS certificate pinning
   - No information about network isolation

2. **Missing Usage Documentation**
   ```typescript
   // Line 39-40 has basic import instruction
   // Missing: Error handling in consuming code
   // Missing: How to handle initialization errors
   // Missing: Recovery strategies
   ```

3. **Missing Environment Setup Guide**
   - No documentation of required env vars
   - No format specification for credentials
   - No validation rules explanation

**Recommendation**: Add comprehensive JSDoc
```typescript
/**
 * Supabase client singleton for the Indigo Yield Platform.
 *
 * Environment Variables (REQUIRED):
 * - VITE_SUPABASE_URL: Must be https://nkfimvovosdehmyyjubn.supabase.co
 * - VITE_SUPABASE_ANON_KEY: Valid JWT token (min 50 chars)
 *
 * Usage:
 * ```typescript
 * import { supabase } from "@/integrations/supabase/client";
 *
 * // Will throw if environment is misconfigured
 * const { data } = await supabase.from("table").select();
 * ```
 *
 * Security Notes:
 * - Credentials are validated at module load time
 * - No sensitive data logged to console in production
 * - URL pinning prevents man-in-the-middle attacks
 * - JWT token validation ensures token structure integrity
 *
 * @throws {Error} If required environment variables are missing or invalid
 */
```

### Test Coverage (30/100)

**❌ Critical Gaps**:

1. **No Unit Tests**
   - No tests for environment validation
   - No tests for URL format validation
   - No tests for JWT structure validation

2. **No Integration Tests**
   - No verification that client connects to Supabase
   - No network connectivity tests

3. **No Error Case Coverage**
   - No tests for missing env vars
   - No tests for malformed credentials

**Recommended Tests**:
```typescript
describe('Supabase Client', () => {
  describe('Environment Validation', () => {
    it('should throw if VITE_SUPABASE_URL is missing', () => {
      // Mock missing env var
      expect(() => initializeClient()).toThrow();
    });

    it('should throw if VITE_SUPABASE_ANON_KEY is missing', () => {
      // Mock missing env var
      expect(() => initializeClient()).toThrow();
    });

    it('should throw if URL is not valid Supabase URL', () => {
      // Set URL to invalid value
      expect(() => initializeClient()).toThrow();
    });

    it('should throw if key is not valid JWT', () => {
      // Set key to invalid JWT format
      expect(() => initializeClient()).toThrow();
    });
  });

  describe('Client Initialization', () => {
    it('should successfully initialize with valid credentials', () => {
      const client = getSupabase();
      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
    });

    it('should return same client instance (singleton)', () => {
      const client1 = getSupabase();
      const client2 = getSupabase();
      expect(client1).toBe(client2);
    });
  });
});
```

---

## File 2: src/lib/security/headers.ts

**CRITICAL SEVERITY: CRITICAL**
**75 lines of code**

### Type Safety Analysis (80/100)

**✅ Strengths**:
- `as const` assertions on SECURITY_HEADERS and CSP_POLICY (best practice)
- Return types properly specified (generateCSP returns string)
- Proper TypeScript const patterns

**❌ Issues**:

1. **Missing Return Type Annotation** (Line 40)
   ```typescript
   export function applySecurityHeaders() {  // ❌ Missing void
   ```
   **Fix**:
   ```typescript
   export function applySecurityHeaders(): void {
   ```

2. **Unsafe Parameter Type** (Line 62)
   ```typescript
   export function validateCSRFToken(token: string): boolean {
     const storedToken = sessionStorage.getItem("csrf_token");  // Could be null
   ```
   **Issue**: Comparing `string | null` with `string`
   **Fix**:
   ```typescript
   export function validateCSRFToken(token: string | null): boolean {
     if (!token) return false;
     const storedToken = sessionStorage.getItem("csrf_token");
     return storedToken === token && token.length >= 32;
   }
   ```

### Error Handling Analysis (60/100)

**🔴 CRITICAL SECURITY ISSUE**: **Meta Tags Don't Enforce Security Headers**

Lines 44-59 have a fundamental flaw:
```typescript
const cspMeta = document.createElement("meta");
cspMeta.httpEquiv = "Content-Security-Policy";
cspMeta.content = generateCSP();
head.appendChild(cspMeta);  // ❌ This does NOT enforce CSP
```

**Critical Security Problem**:
- Browsers **IGNORE** CSP sent via meta tags for most directives
- CSP **MUST** be delivered via HTTP headers
- This gives false sense of security
- XSS, data exfiltration, and framing attacks NOT prevented

**Similarly** (Lines 51-59):
- X-Frame-Options via meta tag: NOT enforced
- X-Content-Type-Options via meta tag: NOT enforced
- These headers **MUST** come from HTTP response headers

**Recommendation**: This function should be removed entirely. Instead:

1. **Configure HTTP Headers in Next.js**
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: generateCSP(),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // ... other headers
        ],
      },
    ];
  },
};
```

2. **Or use middleware**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('Content-Security-Policy', generateCSP());
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');

  return response;
}
```

**Other Error Handling Issues**:

1. **No Try-Catch** (Line 40)
   ```typescript
   export function applySecurityHeaders() {
     const head = document.head;  // Could throw if called SSR
   ```
   **Fix**:
   ```typescript
   export function applySecurityHeaders(): void {
     if (typeof document === 'undefined') {
       return; // Skip on server
     }

     try {
       const head = document.head;
       // ...
     } catch (error) {
       console.error('Failed to apply security headers:', error);
     }
   }
   ```

2. **Session Storage Unavailable** (Line 64)
   - sessionStorage might be disabled
   - Private browsing mode blocks access
   - No fallback strategy

### Code Organization (75/100)

**✅ Strengths**:
- Clear separation of SECURITY_HEADERS and CSP_POLICY
- Utility functions are well-named
- Logical grouping of related functionality

**❌ Issues**:

1. **Hardcoded Supabase Project ID** (Lines 20, 25)
   ```typescript
   "script-src": "'self' https://nkfimvovosdehmyyjubn.supabase.co",
   "connect-src": "'self' https://nkfimvovosdehmyyjubn.supabase.co wss://...",
   ```
   **Issue**: Hardcoded infrastructure details
   **Recommendation**: Load from environment
   ```typescript
   const SUPABASE_URL = new URL(import.meta.env.VITE_SUPABASE_URL).hostname;

   export const CSP_POLICY = {
     "script-src": `'self' https://${SUPABASE_URL}`,
     // ...
   } as const;
   ```

2. **Mixed Concerns**
   - HTTP header simulation (meta tags) mixed with real security config
   - Should separate: static config vs dynamic application

### Documentation (45/100)

**❌ Critical Gaps**:

1. **No Security Explanation**
   ```typescript
   // Line 18-19: Comment says "Removed 'unsafe-inline'"
   // But no explanation of WHY or the security impact
   ```
   **Recommendation**: Add security education
   ```typescript
   /**
    * Removed 'unsafe-inline' for maximum XSS protection.
    *
    * Why 'unsafe-inline' is dangerous:
    * - Allows arbitrary inline <script> tags
    * - Defeats purpose of CSP
    * - Vulnerable to DOM-based XSS
    *
    * Modern bundlers (Vite, Webpack) handle all script bundling,
    * making 'unsafe-inline' unnecessary.
    *
    * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP/script-src
    */
   ```

2. **Missing CSRF Documentation**
   ```typescript
   // generateCSRFToken() with no explanation of:
   // - How token is used
   // - Rotation strategy
   // - Expiration policy
   // - Double-submit cookie pattern?
   ```

3. **No Browser Compatibility Notes**
   - No mention of IE11 or older browser support
   - No notes on CSP3 vs CSP2
   - No fallback strategy

**Recommended Documentation**:
```typescript
/**
 * Security Headers Configuration
 *
 * These headers should be applied via HTTP response headers, NOT meta tags.
 * Meta tag application is deprecated and provides limited protection.
 *
 * Configuration for Next.js (next.config.js):
 * - Use response.headers.set() in middleware
 * - Or configure in next.config.js headers()
 *
 * @see https://owasp.org/www-project-secure-headers/
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers
 */

/**
 * CSRF Token Management
 *
 * Token Generation:
 * - 32 bytes of cryptographic random data
 * - Stored in sessionStorage
 * - Per-session (not persistent)
 *
 * Token Validation:
 * - Must match stored value exactly
 * - Must be >= 32 characters
 *
 * Integration:
 * - Include in POST request headers as X-CSRF-Token
 * - Or as form field _csrf
 * - Server validates on each state-changing request
 *
 * Rotation:
 * - NOT rotated per request (expensive)
 * - Rotated on privilege escalation
 * - Rotated on logout
 *
 * @see https://owasp.org/www-community/attacks/csrf
 */
```

### Test Coverage (20/100)

**🔴 CRITICAL**: No tests found

**Missing Tests**:

1. **CSP Policy Tests**
   ```typescript
   describe('CSP Policy', () => {
     it('should not include unsafe-inline in script-src', () => {
       const csp = generateCSP();
       expect(csp).not.toMatch(/script-src.*unsafe-inline/);
     });

     it('should not include unsafe-inline in style-src', () => {
       const csp = generateCSP();
       expect(csp).not.toMatch(/style-src.*unsafe-inline/);
     });

     it('should include Supabase domain in script-src', () => {
       const csp = generateCSP();
       expect(csp).toMatch(/script-src.*supabase.co/);
     });

     it('should restrict frame-src to none', () => {
       const csp = generateCSP();
       expect(csp).toMatch(/frame-src\s+'none'/);
     });
   });
   ```

2. **CSRF Token Tests**
   ```typescript
   describe('CSRF Token', () => {
     beforeEach(() => {
       sessionStorage.clear();
     });

     it('should generate 64-character token (32 bytes hex)', () => {
       const token = generateCSRFToken();
       expect(token).toHaveLength(64);
       expect(/^[0-9a-f]+$/.test(token)).toBe(true);
     });

     it('should store token in sessionStorage', () => {
       const token = generateCSRFToken();
       expect(sessionStorage.getItem('csrf_token')).toBe(token);
     });

     it('should validate matching tokens', () => {
       const token = generateCSRFToken();
       expect(validateCSRFToken(token)).toBe(true);
     });

     it('should reject non-matching tokens', () => {
       generateCSRFToken();
       expect(validateCSRFToken('wrong-token')).toBe(false);
     });

     it('should reject tokens shorter than 32 chars', () => {
       sessionStorage.setItem('csrf_token', 'short');
       expect(validateCSRFToken('short')).toBe(false);
     });

     it('should handle missing sessionStorage', () => {
       const spy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
       expect(validateCSRFToken('any-token')).toBe(false);
       spy.mockRestore();
     });
   });
   ```

3. **Security Headers Application Tests**
   ```typescript
   describe('applySecurityHeaders', () => {
     it('should create CSP meta tag', () => {
       applySecurityHeaders();
       const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
       expect(cspMeta).toBeDefined();
     });

     it('should not throw if document is undefined (SSR)', () => {
       // Mock SSR environment
       expect(() => applySecurityHeaders()).not.toThrow();
     });
   });
   ```

---

## File 3: src/lib/email.ts

**CRITICAL SEVERITY: CRITICAL**
**199 lines of code**

### Type Safety Analysis (65/100)

**❌ Critical Issues**:

1. **Record<string, any> Anti-Pattern** (Line 8)
   ```typescript
   export interface EmailTemplate {
     to: string;
     subject: string;
     template: string;
     variables: Record<string, any>;  // ❌ Loses type safety
   }
   ```
   **Problem**: Allows arbitrary data without validation
   **Impact**: Variables could contain malicious content

   **Recommendation**: Use specific template types
   ```typescript
   export interface StatementReadyVariables {
     statementId: string;
     downloadUrl: string;
     expiresIn: string;
   }

   export interface WelcomeVariables {
     userName: string;
     loginUrl: string;
     supportUrl: string;
   }

   type EmailVariables =
     | StatementReadyVariables
     | WelcomeVariables
     | AdminNotificationVariables;

   export interface EmailTemplate {
     to: string;
     subject: string;
     template: EmailTemplateType;
     variables: EmailVariables;
   }
   ```

2. **No Email Validation** (Line 51, 77, etc.)
   ```typescript
   async sendEmail(template: EmailTemplate): Promise<boolean> {
     // No validation that template.to is valid email
   ```
   **Recommendation**:
   ```typescript
   private validateEmail(email: string): boolean {
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     return emailRegex.test(email);
   }

   async sendEmail(template: EmailTemplate): Promise<boolean> {
     if (!this.validateEmail(template.to)) {
       console.error("Invalid email address:", template.to);
       return false;
     }
     // ...
   }
   ```

3. **No Port Validation** (Line 36)
   ```typescript
   port: parseInt(import.meta.env.SMTP_PORT || "587"),
   // No validation of port range (1-65535)
   ```
   **Recommendation**:
   ```typescript
   private validatePort(port: number): boolean {
     return port >= 1 && port <= 65535;
   }

   constructor() {
     this.config = {
       // ...
       port: this.parseAndValidatePort(import.meta.env.SMTP_PORT),
     };
   }
   ```

### Error Handling Analysis (70/100)

**✅ Strengths**:
- Checks `isConfigured` before operations (line 52)
- Promise.allSettled prevents one failure from blocking others (line 149)
- Try-catch blocks exist (lines 71-74, 170-180)

**❌ Critical Issues**:

1. **Simulated Testing** (Lines 58-68, 171-173)
   ```typescript
   // Simulate async email sending
   await new Promise((resolve) => setTimeout(resolve, 100));

   // Simulate connection test
   await new Promise((resolve) => setTimeout(resolve, 50));
   ```
   **Problem**: Method returns success but doesn't actually send
   **Risk**: User thinks email was sent when it wasn't

   **Recommendation**: Implement real SMTP or throw error
   ```typescript
   async sendEmail(template: EmailTemplate): Promise<boolean> {
     if (!this.isConfigured) {
       throw new Error("Email service not configured");
     }

     if (import.meta.env.MODE === 'development') {
       console.log("📧 [DEV MODE] Would send email:", template);
       return true;
     }

     // Real implementation for production
     return this.sendViaEdgeFunction(template);
   }
   ```

2. **No Retry Logic**
   ```typescript
   async sendAdminNotification(adminEmails: string[], ...) {
     const promises = adminEmails.map((email) =>
       this.sendEmail(...)  // Single attempt, no retry
     );
   ```
   **Issue**: Network errors cause permanent failure
   **Recommendation**: Add exponential backoff

3. **No Timeout Handling**
   - `sendEmail` could hang indefinitely
   - No timeout parameter
   - No timeout handling

### Code Organization (65/100)

**🔴 CRITICAL ARCHITECTURE ISSUE**: **Client-Side SMTP Implementation**

```typescript
// Line 35-39: SMTP config in client code
this.config = {
  host: import.meta.env.SMTP_HOST,
  port: parseInt(import.meta.env.SMTP_PORT || "587"),
  user: import.meta.env.SMTP_USER,
  pass: import.meta.env.SMTP_PASS,
};
```

**Problems**:
1. **Security**: SMTP credentials exposed to browser
2. **Architecture**: Browser cannot directly connect to SMTP servers
3. **Functionality**: Doesn't actually send emails (as noted in comment line 58)
4. **False Security**: Code suggests emails work, but they're just logged

**Critical**: Lines 97-99 use `window.location.origin`
```typescript
loginUrl: `${window.location.origin}/login`,  // ❌ Fails on server
```
- This will crash if code runs in Edge Functions or SSR context
- Confirms this is client-only, but exported as singleton

**Recommendation**: Proper architecture

```typescript
// src/lib/email/client.ts - Client-only stubs
export const emailService = {
  async sendStatementReady(...) {
    return fetch('/api/email/send', {
      method: 'POST',
      body: JSON.stringify({ type: 'statement-ready', ... })
    });
  },
};

// supabase/functions/send-email/index.ts - Server implementation
import { Resend } from 'resend';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
  const { type, to, variables } = await req.json();

  const result = await resend.emails.send({
    from: 'noreply@indigo.com',
    to,
    subject: getSubject(type),
    html: renderTemplate(type, variables),
  });

  return new Response(JSON.stringify(result));
});
```

**Other Organization Issues**:

1. **Unused Status Check** (Line 157-187)
   ```typescript
   async testConnection(): Promise<{ status: 'healthy' | 'unhealthy'; ... }> {
     // Simulates connection, never used
     // Should be called in health checks
   }
   ```

2. **No Template Validation**
   - Accepts any template name
   - No schema validation
   - No enum checking

### Documentation (55/100)

**✅ Strengths**:
- Line 2-3: Honest about being a stub
- Console logging includes useful context

**❌ Critical Gaps**:

1. **Migration Path Not Documented**
   ```typescript
   // Line 2-3: "production implementation would use Supabase Edge Functions"
   // But no documentation on how to implement this
   // No migration guide
   // No example implementation
   ```

2. **No Email Template Schema Documentation**
   - Each template accepts different variables
   - No schema definition
   - No validation rules

3. **No Production Deployment Guide**
   - How to switch from stub to real implementation
   - Where to store API keys
   - How to handle email failures in production

**Recommended Documentation**:

```typescript
/**
 * Email Service - Client-Side Stub
 *
 * IMPORTANT: This is a development/client stub implementation.
 *
 * DO NOT USE IN PRODUCTION:
 * - This code does NOT actually send emails
 * - SMTP credentials are visible in browser
 * - Clients cannot connect to SMTP servers
 * - window.location calls fail in Edge Functions
 *
 * Production Implementation:
 * 1. Remove this file from client code
 * 2. Implement Edge Function: supabase/functions/send-email/index.ts
 * 3. Call via: POST /functions/v1/send-email
 * 4. Use service like Resend, SendGrid, or SMTP relay
 *
 * Email Templates:
 * - STATEMENT_READY: requires { statementId, downloadUrl, expiresIn }
 * - WELCOME: requires { userName, loginUrl, supportUrl }
 * - PASSWORD_RESET: requires { resetUrl, expiresIn }
 * - TOTP_ENABLED: requires { userName, timestamp }
 * - WITHDRAWAL_REQUEST: requires { amount, currency, requestId }
 * - ADMIN_NOTIFICATION: requires { message, context, dashboardUrl }
 *
 * @see ./email.server.ts - Server-side implementation
 * @see supabase/functions/send-email/ - Edge Function
 */
```

### Test Coverage (10/100)

**🔴 CRITICAL**: Virtually no tests

**Missing Unit Tests**:
```typescript
describe('EmailService', () => {
  describe('Initialization', () => {
    it('should warn if SMTP not configured', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      new EmailService();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SMTP not configured')
      );
    });
  });

  describe('Email Validation', () => {
    it('should reject invalid email addresses', () => {
      const service = new EmailService();
      expect(service.isValidEmail('invalid')).toBe(false);
      expect(service.isValidEmail('test@')).toBe(false);
      expect(service.isValidEmail('test@example.com')).toBe(true);
    });
  });

  describe('sendStatementReady', () => {
    it('should build correct email object', async () => {
      const service = new EmailService();
      const sendSpy = jest.spyOn(service, 'sendEmail');

      await service.sendStatementReady('test@example.com', 'stmt-123', 'http://download');

      expect(sendSpy).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Your Indigo Yield Statement is Ready',
        template: 'statement-ready',
        variables: expect.objectContaining({
          statementId: 'stmt-123',
          downloadUrl: 'http://download',
        }),
      });
    });
  });

  describe('sendAdminNotification', () => {
    it('should send to all admin emails', async () => {
      const service = new EmailService();
      const sendSpy = jest.spyOn(service, 'sendEmail');

      const admins = ['admin1@example.com', 'admin2@example.com'];
      await service.sendAdminNotification(admins, 'Alert', 'Something happened');

      expect(sendSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures', async () => {
      // Test Promise.allSettled behavior
    });
  });

  describe('testConnection', () => {
    it('should return healthy status if configured', async () => {
      // Mock environment
      const service = new EmailService();
      const result = await service.testConnection();

      expect(result.status).toBe('healthy');
      expect(result.latency).toBeDefined();
    });

    it('should return unhealthy if not configured', async () => {
      // Mock missing config
      const result = await service.testConnection();

      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('SMTP configuration missing');
    });
  });
});
```

---

## File 4: src/lib/auth/context.tsx

**CRITICAL SEVERITY: HIGH**
**213 lines of code**

### Type Safety Analysis (70/100)

**✅ Strengths**:
- Profile interface properly typed
- Auth hook pattern correctly implemented
- useContext safety check (line 44-46)
- Proper React type annotations

**❌ Critical Issues**:

1. **"any" Type in Public API** (Line 22)
   ```typescript
   signIn: (email: string, password: string) => Promise<any>;
   signOut: () => Promise<void>;
   signUp: (email: string, password: string) => Promise<any>;
   ```
   **Problem**: Callers don't know what to expect
   **Recommendation**:
   ```typescript
   interface AuthResponse {
     user: User | null;
     session: Session | null;
     error: Error | null;
   }

   interface SignInResponse extends AuthResponse {
     session: Session | null; // Required on success
   }

   interface AuthContextType {
     signIn: (email: string, password: string) => Promise<SignInResponse>;
     signUp: (email: string, password: string) => Promise<SignInResponse>;
     // ...
   }
   ```

2. **Stale User Reference** (Line 117, 128, 166)
   ```typescript
   setProfile({
     id: userId,
     email: user?.email || "",  // ❌ 'user' is from context, may be stale
   ```
   **Issue**:
   - User's email comes from User object
   - But user object may be out of sync with profile
   - Email should come from fetched profile

   **Fix**:
   ```typescript
   const fetchProfile = async (userId: string) => {
     try {
       const [basicProfile, adminStatus] = await Promise.all([
         supabase.rpc("get_profile_basic", { user_id: userId }),
         supabase.rpc("get_user_admin_status", { user_id: userId }),
       ]);

       if (basicProfile.data?.[0]) {
         const p = basicProfile.data[0];
         setProfile({
           id: userId,
           email: p.email,  // ✅ From profile, not User object
           // ...
         });
       }
     }
   };
   ```

3. **TOTP Verified Check Logic** (Lines 122-123)
   ```typescript
   totp_verified: (totpData?.verified_at !== null && totpData?.verified_at !== undefined) || false,
   ```
   **Issue**: Overly complex logic
   **Better**:
   ```typescript
   totp_verified: !!totpData?.verified_at,
   ```

### Error Handling Analysis (75/100)

**✅ Strengths**:
- TOTP settings wrapped in try-catch (lines 100-111)
- Profile fetch has error handler (lines 150-173)
- Fallback profile created on error (lines 163-170)
- Security events logged (lines 138-149, 155-161)

**❌ Critical Issues**:

1. **Race Condition - NOT FULLY FIXED** (Lines 56-87)
   ```typescript
   // Line 56-60: Subscribe to auth changes
   const { data: { subscription } } = supabase.auth.onAuthStateChange((...) => {
     if (session?.user) {
       setTimeout(() => {  // ❌ setTimeout(0) is a workaround, not a fix
         fetchProfile(session.user.id);
       }, 0);
     }
   });

   // Line 76-84: THEN check for existing session
   supabase.auth.getSession().then(({ data: { session } }) => {
     // Could fire TWICE: once here, once from listener
   });
   ```

   **Race Condition Scenario**:
   1. `onAuthStateChange` listener is set up
   2. `getSession()` is called and finds existing session
   3. `fetchProfile()` is queued with setTimeout(0)
   4. Meanwhile, `onAuthStateChange` fires AGAIN (duplicate)
   5. `fetchProfile()` is called twice
   6. First call updates profile, second call might overwrite with stale data

   **Proper Fix**:
   ```typescript
   useEffect(() => {
     let isMounted = true;

     const initializeAuth = async () => {
       // Check for existing session FIRST
       const { data: { session } } = await supabase.auth.getSession();

       if (!isMounted) return;

       if (session?.user) {
         await fetchProfile(session.user.id);
         if (!isMounted) return;
       } else {
         setLoading(false);
       }

       // THEN subscribe to changes
       const { data: { subscription } } = supabase.auth.onAuthStateChange(
         async (_event, newSession) => {
           if (!isMounted) return;

           if (newSession?.user) {
             await fetchProfile(newSession.user.id);
           } else {
             setProfile(null);
           }
         }
       );

       return () => {
         subscription?.unsubscribe();
       };
     };

     initializeAuth();

     return () => {
       isMounted = false;
     };
   }, []);
   ```

2. **Generic Error Logging** (Line 151)
   ```typescript
   console.error("Error fetching profile:", error);
   // No distinction between different error types
   ```
   **Better**:
   ```typescript
   if (error instanceof AuthError) {
     console.error("Auth error:", error.message, error.code);
   } else if (error instanceof FetchError) {
     console.error("Network error fetching profile");
   } else {
     console.error("Unknown error:", error);
   }
   ```

3. **Unused Variable** (Line 145)
   ```typescript
   details: {
     user_id: userId,
     // But userId variable exists?
   ```
   **Check**: Is this correct or typo?

### Code Organization (80/100)

**✅ Strengths**:
- Clear separation of concerns (Profile vs Session vs User)
- Hook pattern properly implemented
- Context provider properly structured

**❌ Issues**:

1. **Mixed Responsibilities** (Lines 89-174)
   ```typescript
   const fetchProfile = async (userId: string) => {
     // Does too much:
     // 1. Fetches basic profile
     // 2. Gets admin status
     // 3. Gets TOTP settings
     // 4. Handles errors for each
     // 5. Logs security events
     // 6. Updates state
   ```
   **Better**: Separate into smaller functions
   ```typescript
   const fetchBasicProfile = rpc("get_profile_basic", { user_id });
   const fetchAdminStatus = rpc("get_user_admin_status", { user_id });
   const fetchTOTPSettings = from("user_totp_settings").select(...);

   const fetchProfile = async (userId: string) => {
     const [basic, admin, totp] = await Promise.allSettled([...]);
     // Combine results
   };
   ```

2. **Hardcoded RPC Function Names**
   ```typescript
   supabase.rpc("get_profile_basic", { user_id: userId }),  // Line 93
   supabase.rpc("get_user_admin_status", { user_id: userId }),  // Line 94
   ```
   **Risk**: String names aren't checked at compile time
   **Better**: Type-safe approach
   ```typescript
   enum RpcFunctions {
     GetProfileBasic = 'get_profile_basic',
     GetUserAdminStatus = 'get_user_admin_status',
   }
   ```

### Documentation (50/100)

**❌ Critical Gaps**:

1. **Race Condition Not Documented** (Lines 56-87)
   ```typescript
   // Comment: "THEN check for existing session"
   // But no explanation of why this order is needed
   // Or how setTimeout(0) prevents race conditions (it doesn't fully)
   ```

2. **No RLS Policy Documentation**
   ```typescript
   // Line 93-95: Uses RPC functions to bypass RLS
   // No documentation of why RLS needs to be bypassed
   // No security implications explained
   ```
   **Recommendation**:
   ```typescript
   /**
    * Fetches user profile securely via RPC functions.
    *
    * Why RPC functions?
    * - Standard table queries fail with Row-Level Security (RLS) policies
    * - RPC functions allow server-side permission checks
    * - Prevents unauthorized users from accessing other profiles
    *
    * RLS Flow:
    * 1. User authenticates via Supabase Auth
    * 2. RPC function `get_profile_basic` runs with auth context
    * 3. Database RLS policy checks: user_id = auth.uid()
    * 4. Returns profile only if user matches
    *
    * @see database/policies/profiles.sql
    */
   ```

3. **No TOTP Documentation**
   ```typescript
   // Lines 98-111: Tries to fetch TOTP, catches errors
   // No explanation of why table might not exist
   // No migration path for when table is created
   ```

4. **Race Condition Explanation Missing**
   - The setTimeout(0) workaround needs explanation
   - Should document the actual fix
   - Should include issue number/ticket reference

**Recommended Documentation**:

```typescript
/**
 * AuthProvider - Multi-Factor Authentication Ready
 *
 * Features:
 * - Supabase Auth integration
 * - Profile data synchronization
 * - TOTP (2FA) support
 * - Admin role management
 * - Security event logging
 *
 * Auth Flow:
 * 1. Component mounts
 * 2. Subscribe to auth state changes
 * 3. Check for existing session
 * 4. Fetch user profile if authenticated
 * 5. Set loading=false once complete
 *
 * Race Condition Handling:
 * - Uses isMounted flag to prevent state updates after unmount
 * - setTimeout(0) defers profile fetch to avoid callback deadlock
 * - Issue: #156 - Auth callback race condition
 * - Fixed in: #158 - Race condition mitigation
 *
 * Known Limitations:
 * - TOTP table may not exist in development
 * - Errors are caught and logged, not thrown
 * - Fallback profile uses user_metadata (less reliable)
 *
 * Testing:
 * - See tests/auth-integration.spec.ts
 * - Use TEST_USER_EMAIL for testing
 */
```

### Test Coverage (40/100)

**✅ Existing Tests**:
- `tests/auth-verification.test.ts` - Basic verification
- `tests/auth-integration.spec.ts` - Playwright E2E tests
- Some coverage exists

**❌ Critical Gaps**:

1. **No Unit Tests for AuthProvider**
   - No tests for profile fetching logic
   - No tests for race condition handling
   - No tests for error scenarios

2. **No Race Condition Tests**
   ```typescript
   // The race condition fix isn't tested
   // Should have test case that verifies:
   // 1. Profile fetched once even if auth fires twice
   // 2. State updates don't occur after unmount
   ```

3. **Missing TOTP Tests**
   ```typescript
   // No tests for TOTP setting handling
   // No tests for when TOTP table missing
   ```

4. **Missing Error Scenario Tests**
   ```typescript
   // No tests for:
   // - Profile fetch failure
   // - RPC function errors
   // - Network errors
   // - Missing profile data
   ```

**Recommended Test Suite**:

```typescript
describe('AuthProvider', () => {
  describe('Initialization', () => {
    it('should load existing session on mount', async () => {
      // Mock existing session
      const wrapper = render(<AuthProvider>{children}</AuthProvider>);

      await waitFor(() => {
        expect(useAuth().user).toBeDefined();
      });
    });

    it('should load profile after session established', async () => {
      // Wait for profile to load
      await waitFor(() => {
        expect(useAuth().profile).toBeDefined();
      });
    });
  });

  describe('Race Condition Prevention', () => {
    it('should not fetch profile twice on rapid auth changes', async () => {
      const fetchSpy = jest.spyOn(supabase, 'rpc');

      // Trigger rapid auth changes
      // Verify rpc called only once
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should not update state after unmount', async () => {
      const { unmount } = render(<AuthProvider>{children}</AuthProvider>);

      unmount();

      // Verify no console errors about setting state
    });
  });

  describe('Profile Fetching', () => {
    it('should fetch admin status', async () => {
      const { user } = render(<AuthProvider>{children}</AuthProvider>);

      await waitFor(() => {
        const { profile } = useAuth();
        expect(profile?.is_admin).toBeDefined();
      });
    });

    it('should handle TOTP data gracefully', async () => {
      // TOTP table might not exist in dev
      // Should not crash
    });

    it('should create fallback profile on error', async () => {
      // Mock profile fetch failure
      // Verify fallback profile is created
      expect(useAuth().profile).toBeDefined();
    });
  });

  describe('TOTP Integration', () => {
    it('should fetch TOTP enabled status', async () => {
      // When TOTP table exists
      expect(useAuth().profile?.totp_enabled).toBeDefined();
    });

    it('should handle missing TOTP table', async () => {
      // When TOTP table doesn't exist
      // Should default to false
      expect(useAuth().profile?.totp_enabled).toBe(false);
    });

    it('should calculate verified status correctly', async () => {
      // verified_at = null → not verified
      // verified_at = timestamp → verified
    });
  });

  describe('Sign In/Out', () => {
    it('should sign in with email and password', async () => {
      const { signIn } = useAuth();
      const result = await signIn('test@example.com', 'password123');

      expect(result.user).toBeDefined();
    });

    it('should sign out and clear profile', async () => {
      const { signOut } = useAuth();
      await signOut();

      await waitFor(() => {
        expect(useAuth().user).toBeNull();
        expect(useAuth().profile).toBeNull();
      });
    });
  });
});
```

---

## Summary Table: Quality Metrics

| Metric | Score | Notes |
|--------|-------|-------|
| **TypeScript Type Safety** | 71.75% | `any` types used, missing type guards |
| **Error Handling** | 67.5% | Meta tag security headers fundamentally broken |
| **Code Organization** | 75% | Generally good, some hardcoding of project IDs |
| **Documentation** | 50% | Critical gaps in security explanations |
| **Test Coverage** | 25% | Minimal test coverage across all files |
| **OVERALL** | **58%** | Multiple critical security and architectural issues |

---

## Critical Issues Summary

### 🔴 MUST FIX BEFORE PRODUCTION

1. **src/lib/security/headers.ts** - **CSP and security headers sent via meta tags (DOESN'T WORK)**
   - Severity: CRITICAL SECURITY
   - Timeline: URGENT (before any deployment)
   - Effort: HIGH (architecture change)

2. **src/lib/email.ts** - **Client-side email service with SMTP credentials in browser**
   - Severity: CRITICAL SECURITY
   - Timeline: URGENT
   - Effort: HIGH (implement Edge Function)

3. **src/lib/auth/context.tsx** - **Race condition partially mitigated but not fixed**
   - Severity: CRITICAL (potential data inconsistency)
   - Timeline: HIGH (affects auth flow)
   - Effort: MEDIUM (implement proper lock)

4. **src/integrations/supabase/client.ts** - **JWT validation too permissive**
   - Severity: HIGH SECURITY
   - Timeline: MEDIUM
   - Effort: LOW (improve validation)

### 🟡 HIGH PRIORITY

5. All files missing comprehensive test coverage
6. Type safety issues (any types, missing guards)
7. Documentation gaps (no security explanations)

---

## Recommendations for Swarm Synthesis

For AI agent synthesis and multi-agent task assignment:

1. **Security-Focused Swarm** (5 agents)
   - security-auditor: Fix security header architecture
   - backend-architect: Design Edge Function for email
   - code-reviewer: Review type safety improvements
   - test-automator: Generate comprehensive test suite
   - performance-engineer: Ensure no performance regressions

2. **Implementation Priority**
   - Phase 1 (URGENT): Fix CSP header delivery
   - Phase 2 (URGENT): Implement email Edge Function
   - Phase 3 (HIGH): Fix race condition completely
   - Phase 4 (MEDIUM): Improve type safety

3. **Testing Checkpoints**
   - Security headers validated via headers audit
   - Email delivery tested end-to-end
   - Auth flow tested with race condition scenarios
   - Type checking passes with strict: true

---

## Final Recommendations

### Next Steps
1. Use this report to prioritize agent swarm work
2. Assign security-auditor to CSP header issue (CRITICAL)
3. Assign backend-architect to email Edge Function
4. Run test suite generation after fixes
5. Re-run this review on fixed code

### Long-term Improvements
- Enable `strict: true` in TypeScript
- Implement comprehensive test coverage (target: 80%+)
- Add security headers validation in CI/CD
- Document all security patterns with examples
- Conduct regular security audits

---

**Report Generated**: 2025-11-20
**Files Analyzed**: 4
**Total Lines**: 530
**Issues Found**: 40+
**Critical Issues**: 4
**Test Gaps**: 15+
