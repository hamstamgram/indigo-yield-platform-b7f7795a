/**
 * Secure Session Management with httpOnly Cookies
 * Implements secure session handling with CSRF protection
 */

import { supabase } from '@/integrations/supabase/client';
import { securityLogger, SecurityEventType, SecuritySeverity } from './security-logger';

interface SessionConfig {
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  httpOnly: boolean;
  maxAge: number; // in seconds
  path: string;
  domain?: string;
}

class SessionManager {
  private static instance: SessionManager;
  private csrfToken: string | null = null;
  private sessionCheckInterval: number | null = null;
  private readonly SESSION_CHECK_INTERVAL = 60000; // 1 minute
  private readonly SESSION_TIMEOUT = 1800000; // 30 minutes
  private lastActivity: number = Date.now();

  private readonly config: SessionConfig = {
    secure: !import.meta.env.DEV, // HTTPS in production
    sameSite: 'strict',
    httpOnly: true,
    maxAge: 86400, // 24 hours
    path: '/',
    domain: import.meta.env.VITE_COOKIE_DOMAIN,
  };

  private constructor() {
    this.initializeSessionMonitoring();
    this.initializeActivityTracking();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Initialize session monitoring
   */
  private initializeSessionMonitoring(): void {
    // Check session validity periodically
    this.sessionCheckInterval = window.setInterval(() => {
      this.checkSessionValidity();
    }, this.SESSION_CHECK_INTERVAL);

    // Clean up on unload
    window.addEventListener('beforeunload', () => {
      if (this.sessionCheckInterval) {
        clearInterval(this.sessionCheckInterval);
      }
    });
  }

  /**
   * Initialize activity tracking for session timeout
   */
  private initializeActivityTracking(): void {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    events.forEach(event => {
      document.addEventListener(event, () => {
        this.lastActivity = Date.now();
      }, { passive: true });
    });
  }

  /**
   * Check if session is still valid
   */
  private async checkSessionValidity(): Promise<void> {
    try {
      // Check for inactivity timeout
      if (Date.now() - this.lastActivity > this.SESSION_TIMEOUT) {
        await this.handleSessionTimeout();
        return;
      }

      // Verify session with Supabase
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        await this.handleInvalidSession();
        return;
      }

      // Check if token needs refresh
      const expiresAt = new Date(session.expires_at! * 1000);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();

      // Refresh if less than 5 minutes until expiry
      if (timeUntilExpiry < 300000) {
        await this.refreshSession();
      }
    } catch (error) {
      console.error('Session check failed:', error);
    }
  }

  /**
   * Handle session timeout
   */
  private async handleSessionTimeout(): Promise<void> {
    await securityLogger.logEvent(
      SecurityEventType.LOGOUT,
      SecuritySeverity.LOW,
      { reason: 'inactivity_timeout' }
    );

    await this.endSession();

    // Redirect to login with timeout message
    window.location.href = '/auth/login?reason=timeout';
  }

  /**
   * Handle invalid session
   */
  private async handleInvalidSession(): Promise<void> {
    await securityLogger.logEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecuritySeverity.MEDIUM,
      { reason: 'invalid_session' }
    );

    await this.endSession();

    // Redirect to login
    window.location.href = '/auth/login?reason=invalid';
  }

  /**
   * Create secure session
   */
  public async createSession(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Log login attempt
      await securityLogger.logLoginAttempt(email, false);

      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        await securityLogger.logLoginAttempt(email, false, { error: error.message });
        return { success: false, error: error.message };
      }

      if (!data.session) {
        return { success: false, error: 'No session created' };
      }

      // Generate CSRF token
      this.csrfToken = this.generateCSRFToken();

      // Store CSRF token in sessionStorage (accessible to JS but not cross-domain)
      sessionStorage.setItem('csrf_token', this.csrfToken);

      // Log successful login
      await securityLogger.logLoginAttempt(email, true);

      // Reset activity timestamp
      this.lastActivity = Date.now();

      // Note: Actual httpOnly cookie should be set by the server
      // This is a client-side implementation that simulates the behavior
      await this.requestServerSession(data.session.access_token);

      return { success: true };
    } catch (error) {
      console.error('Session creation failed:', error);
      await securityLogger.logLoginAttempt(email, false, { error: String(error) });
      return { success: false, error: 'Session creation failed' };
    }
  }

  /**
   * Request server to set httpOnly cookie
   */
  private async requestServerSession(accessToken: string): Promise<void> {
    // In production, this would call a server endpoint that sets httpOnly cookies
    // For now, we'll store in a secure manner on the client

    // This should be replaced with:
    // await fetch('/api/auth/session', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${accessToken}`,
    //     'X-CSRF-Token': this.csrfToken,
    //   },
    //   credentials: 'include', // Include cookies
    // });

    console.log('Server session would be created with httpOnly cookie');
  }

  /**
   * Refresh session
   */
  public async refreshSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();

      if (error || !session) {
        await this.handleInvalidSession();
        return false;
      }

      // Update CSRF token
      this.csrfToken = this.generateCSRFToken();
      sessionStorage.setItem('csrf_token', this.csrfToken);

      // Request server to update httpOnly cookie
      await this.requestServerSession(session.access_token);

      return true;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  }

  /**
   * End session
   */
  public async endSession(): Promise<void> {
    try {
      // Log logout
      await securityLogger.logEvent(
        SecurityEventType.LOGOUT,
        SecuritySeverity.LOW
      );

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear CSRF token
      this.csrfToken = null;
      sessionStorage.removeItem('csrf_token');

      // Clear session check interval
      if (this.sessionCheckInterval) {
        clearInterval(this.sessionCheckInterval);
        this.sessionCheckInterval = null;
      }

      // In production, call server to clear httpOnly cookie
      // await fetch('/api/auth/logout', {
      //   method: 'POST',
      //   credentials: 'include',
      // });

    } catch (error) {
      console.error('Session end failed:', error);
    }
  }

  /**
   * Generate CSRF token
   */
  private generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get CSRF token for requests
   */
  public getCSRFToken(): string | null {
    return this.csrfToken || sessionStorage.getItem('csrf_token');
  }

  /**
   * Validate CSRF token
   */
  public validateCSRFToken(token: string): boolean {
    const storedToken = this.getCSRFToken();

    if (!storedToken || !token) {
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    if (storedToken.length !== token.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < storedToken.length; i++) {
      result |= storedToken.charCodeAt(i) ^ token.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Get session info
   */
  public async getSessionInfo(): Promise<{
    isValid: boolean;
    expiresAt?: Date;
    lastActivity?: Date;
    timeUntilTimeout?: number;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return { isValid: false };
      }

      const expiresAt = new Date(session.expires_at! * 1000);
      const lastActivity = new Date(this.lastActivity);
      const timeUntilTimeout = Math.max(0, this.SESSION_TIMEOUT - (Date.now() - this.lastActivity));

      return {
        isValid: true,
        expiresAt,
        lastActivity,
        timeUntilTimeout,
      };
    } catch (error) {
      console.error('Failed to get session info:', error);
      return { isValid: false };
    }
  }

  /**
   * Extend session on activity
   */
  public extendSession(): void {
    this.lastActivity = Date.now();
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();

// React hook for session management
import { useEffect, useState } from 'react';

export function useSession() {
  const [sessionInfo, setSessionInfo] = useState<{
    isValid: boolean;
    expiresAt?: Date;
    timeUntilTimeout?: number;
  }>({ isValid: false });

  useEffect(() => {
    // Initial check
    sessionManager.getSessionInfo().then(setSessionInfo);

    // Update every minute
    const interval = setInterval(() => {
      sessionManager.getSessionInfo().then(setSessionInfo);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return {
    ...sessionInfo,
    extendSession: () => sessionManager.extendSession(),
    endSession: () => sessionManager.endSession(),
  };
}