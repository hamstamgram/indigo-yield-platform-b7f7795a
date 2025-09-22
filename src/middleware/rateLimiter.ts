import { supabase } from '@/integrations/supabase/client';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string | Promise<string>;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs || 60000, // 1 minute default
      maxRequests: config.maxRequests || 100,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
    };

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private async defaultKeyGenerator(req: Request): Promise<string> {
    // Try to get user ID from auth, fallback to IP
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      return `user:${data.user.id}`;
    }
    
    // Fallback to IP address from headers
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    return `ip:${ip}`;
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  async check(req: Request): Promise<{ allowed: boolean; retryAfter?: number }> {
    if (!import.meta.env.VITE_ENABLE_RATE_LIMITING) {
      return { allowed: true };
    }

    const key = await this.config.keyGenerator!(req);
    const now = Date.now();
    
    if (!this.store[key] || this.store[key].resetTime < now) {
      // New window
      this.store[key] = {
        count: 1,
        resetTime: now + this.config.windowMs,
      };
      return { allowed: true };
    }

    // Existing window
    if (this.store[key].count >= this.config.maxRequests) {
      const retryAfter = Math.ceil((this.store[key].resetTime - now) / 1000);
      return { allowed: false, retryAfter };
    }

    this.store[key].count++;
    return { allowed: true };
  }

  reset(key: string) {
    delete this.store[key];
  }
}

// Rate limiters for different route types
export const apiRateLimiter = new RateLimiter({
  windowMs: parseInt(import.meta.env.VITE_RATE_LIMIT_WINDOW_MS || '60000'),
  maxRequests: parseInt(import.meta.env.VITE_RATE_LIMIT_MAX_REQUESTS || '100'),
});

export const adminRateLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 50, // Stricter for admin routes
});

export const authRateLimiter = new RateLimiter({
  windowMs: 900000, // 15 minutes
  maxRequests: 5, // Very strict for auth attempts
});

// React hook for rate limiting
export function useRateLimit(limiter: RateLimiter = apiRateLimiter) {
  const checkRateLimit = async (req?: Request): Promise<boolean> => {
    const request = req || new Request(window.location.href);
    const { allowed, retryAfter } = await limiter.check(request);
    
    if (!allowed) {
      console.warn(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
      // Could trigger a toast notification here
      return false;
    }
    
    return true;
  };

  return { checkRateLimit };
}

// Middleware for API routes
export async function rateLimitMiddleware(
  req: Request,
  limiter: RateLimiter = apiRateLimiter
): Promise<Response | null> {
  const { allowed, retryAfter } = await limiter.check(req);
  
  if (!allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter?.toString() || '60',
          'X-RateLimit-Limit': import.meta.env.VITE_RATE_LIMIT_MAX_REQUESTS || '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + (retryAfter || 60) * 1000).toISOString(),
        },
      }
    );
  }
  
  return null; // Continue processing
}
