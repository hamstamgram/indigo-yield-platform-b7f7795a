/**
 * Rate Limiting Configuration
 * Protects API endpoints from abuse and DDoS attacks
 */

import { supabase } from "@/integrations/supabase/client";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  identifier: "ip" | "user" | "combined";
}

interface RateLimitStore {
  [key: string]: {
    requests: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request should be rate limited
   */
  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const key = `${config.identifier}:${identifier}`;

    // Get or create rate limit entry
    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = {
        requests: 0,
        resetTime: now + config.windowMs,
      };
    }

    const entry = this.store[key];
    entry.requests++;

    const allowed = entry.requests <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.requests);

    // Log potential abuse
    if (!allowed) {
      await this.logRateLimitViolation(identifier, config);
    }

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Log rate limit violations for security monitoring
   */
  private async logRateLimitViolation(identifier: string, config: RateLimitConfig) {
    try {
      await supabase.from("audit_log").insert({
        action: "RATE_LIMIT_EXCEEDED",
        entity: "api_request",
        entity_id: identifier,
        meta: {
          identifier_type: config.identifier,
          max_requests: config.maxRequests,
          window_ms: config.windowMs,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to log rate limit violation:", error);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  /**
   * Destroy the rate limiter and clean up
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store = {};
  }
}

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
  // Authentication endpoints
  auth: {
    login: { windowMs: 15 * 60 * 1000, maxRequests: 5, identifier: "ip" as const },
    register: { windowMs: 60 * 60 * 1000, maxRequests: 3, identifier: "ip" as const },
    passwordReset: { windowMs: 60 * 60 * 1000, maxRequests: 3, identifier: "ip" as const },
  },
  // API endpoints
  api: {
    default: { windowMs: 60 * 1000, maxRequests: 100, identifier: "user" as const },
    heavy: { windowMs: 60 * 1000, maxRequests: 10, identifier: "user" as const },
    sensitive: { windowMs: 60 * 1000, maxRequests: 20, identifier: "user" as const },
  },
  // Admin endpoints
  admin: {
    default: { windowMs: 60 * 1000, maxRequests: 200, identifier: "user" as const },
    bulk: { windowMs: 60 * 1000, maxRequests: 5, identifier: "user" as const },
    export: { windowMs: 60 * 60 * 1000, maxRequests: 10, identifier: "user" as const },
  },
};

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

/**
 * Get or create rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Rate limit hook for React components
 */
export function useRateLimit(config: RateLimitConfig) {
  const checkLimit = async (identifier?: string) => {
    const limiter = getRateLimiter();
    const id = identifier || "anonymous";
    return await limiter.checkLimit(id, config);
  };

  return { checkLimit };
}

/**
 * Rate limit decorator for async functions
 */
export function withRateLimit(config: RateLimitConfig) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const limiter = getRateLimiter();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const identifier = user?.id || "anonymous";

      const { allowed, resetTime } = await limiter.checkLimit(identifier, config);

      if (!allowed) {
        throw new Error(`Rate limit exceeded. Try again at ${new Date(resetTime).toISOString()}`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
