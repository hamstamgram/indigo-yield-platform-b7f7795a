import Redis from 'ioredis';

// Redis connection configuration
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableOfflineQueue: true,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  lazyConnect: true,
};

// Create Redis client with lazy connection
let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    console.log('Redis not configured, caching disabled');
    return null;
  }

  if (!redisClient) {
    try {
      if (process.env.REDIS_URL) {
        redisClient = new Redis(process.env.REDIS_URL);
      } else {
        redisClient = new Redis(REDIS_CONFIG);
      }

      redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      redisClient.on('connect', () => {
        console.log('Redis connected successfully');
      });
    } catch (error) {
      console.error('Failed to create Redis client:', error);
      return null;
    }
  }

  return redisClient;
}

// Cache service with fallback
export class CacheService {
  private client: Redis | null;
  private defaultTTL: number;

  constructor(defaultTTL = 3600) {
    this.client = getRedisClient();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get cached value by key
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;

    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cache value with TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.client) return false;

    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;

      await this.client.set(key, serialized, 'EX', expiry);
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cache entry
   */
  async del(key: string | string[]): Promise<boolean> {
    if (!this.client) return false;

    try {
      const keys = Array.isArray(key) ? key : [key];
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return true;
    } catch (error) {
      console.error(`Cache delete error:`, error);
      return false;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return true;
    } catch (error) {
      console.error(`Cache invalidate error for pattern ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Get or set with factory function (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    let data = await this.get<T>(key);

    if (data !== null) {
      return data;
    }

    // Not in cache, get from factory
    data = await factory();

    // Store in cache (don't await)
    this.set(key, data, ttl);

    return data;
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.client) return -1;

    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string, ttl?: number): Promise<number> {
    if (!this.client) return 0;

    try {
      const value = await this.client.incr(key);
      if (ttl) {
        await this.client.expire(key, ttl);
      }
      return value;
    } catch (error) {
      console.error(`Cache incr error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Batch get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.client || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const values = await this.client.mget(...keys);
      return values.map(v => (v ? JSON.parse(v) : null));
    } catch (error) {
      console.error(`Cache mget error:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Batch set multiple key-value pairs
   */
  async mset(items: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    if (!this.client || items.length === 0) return false;

    try {
      const pipeline = this.client.pipeline();

      for (const { key, value, ttl } of items) {
        const serialized = JSON.stringify(value);
        const expiry = ttl || this.defaultTTL;
        pipeline.set(key, serialized, 'EX', expiry);
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error(`Cache mset error:`, error);
      return false;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async flush(): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.flushdb();
      return true;
    } catch (error) {
      console.error(`Cache flush error:`, error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    if (!this.client) return null;

    try {
      const info = await this.client.info('stats');
      const dbsize = await this.client.dbsize();

      return {
        connected: true,
        dbsize,
        info,
      };
    } catch (error) {
      console.error(`Cache stats error:`, error);
      return null;
    }
  }
}

// Cache key generators
export const CacheKeys = {
  // User cache keys
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user_profile:${id}`,
  userSession: (id: string) => `session:${id}`,

  // Portfolio cache keys
  portfolio: (userId: string) => `portfolio:${userId}`,
  portfolioCompany: (companyId: string) => `portfolio_company:${companyId}`,
  portfolioStats: (userId: string) => `portfolio_stats:${userId}`,

  // Yield cache keys
  yieldRates: (companyId: string) => `yield_rates:${companyId}`,
  yieldHistory: (companyId: string, year?: number) =>
    year ? `yield_history:${companyId}:${year}` : `yield_history:${companyId}`,

  // Report cache keys
  report: (reportId: string) => `report:${reportId}`,
  reportList: (userId: string) => `report_list:${userId}`,

  // Analytics cache keys
  analytics: (type: string, date: string) => `analytics:${type}:${date}`,
  metrics: (metric: string) => `metrics:${metric}`,

  // API response cache
  apiResponse: (endpoint: string, params: string) => `api:${endpoint}:${params}`,
};

// Cache TTL presets (in seconds)
export const CacheTTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  DEFAULT: 3600,       // 1 hour
  LONG: 86400,         // 24 hours
  WEEK: 604800,        // 1 week
};

// Create singleton instance
export const cacheService = new CacheService();

// Export for testing
export { getRedisClient };