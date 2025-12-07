/**
 * Security Logger Utility
 * Handles critical security event logging with proper error handling
 */

import { supabase } from "@/integrations/supabase/client";

// Sentry monitoring removed

export enum SecurityEventType {
  LOGIN_ATTEMPT = "LOGIN_ATTEMPT",
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILURE = "LOGIN_FAILURE",
  LOGOUT = "LOGOUT",
  PASSWORD_RESET = "PASSWORD_RESET",
  PASSWORD_CHANGE = "PASSWORD_CHANGE",
  MFA_ENABLED = "MFA_ENABLED",
  MFA_DISABLED = "MFA_DISABLED",
  MFA_CHALLENGE = "MFA_CHALLENGE",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
  DATA_EXPORT = "DATA_EXPORT",
  DATA_DELETION = "DATA_DELETION",
  ADMIN_ACTION = "ADMIN_ACTION",
  API_RATE_LIMIT = "API_RATE_LIMIT",
  SECURITY_SCAN = "SECURITY_SCAN",
}

export enum SecuritySeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

interface SecurityEventData {
  event_type: SecurityEventType;
  severity: SecuritySeverity;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  error_message?: string;
  stack_trace?: string;
}

// Critical events that should fail loudly if logging fails
const CRITICAL_EVENTS: SecurityEventType[] = [
  SecurityEventType.LOGIN_FAILURE,
  SecurityEventType.PERMISSION_DENIED,
  SecurityEventType.SUSPICIOUS_ACTIVITY,
  SecurityEventType.DATA_DELETION,
  SecurityEventType.ADMIN_ACTION,
];

class SecurityLogger {
  private static instance: SecurityLogger;
  private queue: SecurityEventData[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  private constructor() {}

  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * Log a security event
   */
  public async logEvent(
    eventType: SecurityEventType,
    severity: SecuritySeverity,
    details?: Record<string, any>,
    throwOnError = false
  ): Promise<void> {
    const eventData: SecurityEventData = {
      event_type: eventType,
      severity,
      details,
      user_agent: navigator.userAgent,
    };

    // Get current user if authenticated
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        eventData.user_id = user.id;
      }
    } catch (error) {
      console.warn("Failed to get user for security event:", error);
    }

    // Add to queue
    this.queue.push(eventData);

    // Process queue
    try {
      await this.processQueue();
    } catch (error) {
      this.handleLoggingError(
        error,
        eventData,
        throwOnError || CRITICAL_EVENTS.includes(eventType)
      );
    }
  }

  /**
   * Process the event queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const event = this.queue.shift()!;
        await this.persistEvent(event);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Persist event to database with retries
   * Note: log_security_event RPC doesn't exist, using audit_log table directly
   */
  private async persistEvent(event: SecurityEventData, retryCount = 0): Promise<void> {
    try {
      const { error } = await supabase.from("audit_log").insert({
        action: event.event_type,
        actor_user: event.user_id || null,
        entity: "security_event",
        entity_id: null,
        meta: {
          severity: event.severity,
          ip_address: event.ip_address,
          user_agent: event.user_agent,
          error_message: event.error_message,
          stack_trace: event.stack_trace,
          ...event.details,
        },
      });

      if (error) {
        throw error;
      }

      // Also log to console in development
      if (import.meta.env.DEV) {
        console.log(`[SECURITY] ${event.event_type}:`, event);
      }
    } catch (error) {
      if (retryCount < this.maxRetries) {
        // Retry with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, this.retryDelay * Math.pow(2, retryCount))
        );
        return this.persistEvent(event, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Handle logging errors
   */
  private handleLoggingError(error: unknown, event: SecurityEventData, throwError: boolean): void {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorDetails = {
      event,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };

    // Log to console
    console.error("CRITICAL: Security logging failed", errorDetails);

    // Store in localStorage as fallback
    try {
      const failedEvents = JSON.parse(localStorage.getItem("failed_security_events") || "[]");
      failedEvents.push(errorDetails);
      // Keep only last 100 failed events
      if (failedEvents.length > 100) {
        failedEvents.shift();
      }
      localStorage.setItem("failed_security_events", JSON.stringify(failedEvents));
    } catch (localStorageError) {
      console.error("Failed to store security event in localStorage:", localStorageError);
    }

    // Throw error if critical
    if (throwError) {
      throw new Error(`Critical security event logging failed: ${errorMessage}`);
    }
  }

  /**
   * Retry failed events from localStorage
   */
  public async retryFailedEvents(): Promise<void> {
    try {
      const failedEvents = JSON.parse(localStorage.getItem("failed_security_events") || "[]");
      if (failedEvents.length === 0) return;

      for (const failedEvent of failedEvents) {
        try {
          await this.persistEvent(failedEvent.event);
        } catch (error) {
          console.warn("Failed to retry security event:", error);
        }
      }

      // Clear successfully retried events
      localStorage.removeItem("failed_security_events");
    } catch (error) {
      console.error("Error retrying failed security events:", error);
    }
  }

  /**
   * Log login attempt
   */
  public async logLoginAttempt(
    email: string,
    success: boolean,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent(
      success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILURE,
      success ? SecuritySeverity.LOW : SecuritySeverity.MEDIUM,
      { email, ...details }
    );
  }

  /**
   * Log admin action
   */
  public async logAdminAction(
    action: string,
    targetUserId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent(
      SecurityEventType.ADMIN_ACTION,
      SecuritySeverity.HIGH,
      { action, target_user_id: targetUserId, ...details },
      true // Throw on error for admin actions
    );
  }

  /**
   * Log suspicious activity
   */
  public async logSuspiciousActivity(reason: string, details?: Record<string, any>): Promise<void> {
    await this.logEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecuritySeverity.CRITICAL,
      { reason, ...details },
      true // Throw on error for suspicious activity
    );
  }

  /**
   * Log GDPR-related events
   */
  public async logGDPREvent(
    type: "EXPORT" | "DELETE" | "CONSENT",
    details?: Record<string, any>
  ): Promise<void> {
    const eventType =
      type === "EXPORT" ? SecurityEventType.DATA_EXPORT : SecurityEventType.DATA_DELETION;
    await this.logEvent(eventType, SecuritySeverity.HIGH, { gdpr_action: type, ...details });
  }
}

// Export singleton instance
export const securityLogger = SecurityLogger.getInstance();

// Auto-retry failed events on page load
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    securityLogger.retryFailedEvents().catch(console.error);
  });
}
