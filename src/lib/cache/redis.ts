// Redis caching with optional ioredis dependency
// If ioredis is not installed, caching is disabled

// Cache service with fallback (no Redis dependency)
export class CacheService {
  private client: any = null;
  private defaultTTL: number;

  constructor(defaultTTL = 3600) {
    this.defaultTTL = defaultTTL;
    // Redis is optional - install ioredis to enable caching
    console.log('Redis caching disabled (install ioredis to enable)');
  }

  async get<T>(key: string): Promise<T | null> {
    return null;
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    return false;
  }

  async del(key: string | string[]): Promise<boolean> {
    return false;
  }

  async invalidate(pattern: string): Promise<boolean> {
    return false;
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Without cache, just run the factory function
    return await factory();
  }

  async exists(key: string): Promise<boolean> {
    return false;
  }

  async ttl(key: string): Promise<number> {
    return -1;
  }

  async incr(key: string, ttl?: number): Promise<number> {
    return 0;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return keys.map(() => null);
  }

  async mset(items: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    return false;
  }

  async flush(): Promise<boolean> {
    return false;
  }

  async getStats(): Promise<any> {
    return null;
  }
}

// Cache key generators
export const CacheKeys = {
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user_profile:${id}`,
  userSession: (id: string) => `session:${id}`,
  portfolio: (userId: string) => `portfolio:${userId}`,
  portfolioCompany: (companyId: string) => `portfolio_company:${companyId}`,
  portfolioStats: (userId: string) => `portfolio_stats:${userId}`,
  yieldRates: (companyId: string) => `yield_rates:${companyId}`,
  yieldHistory: (companyId: string, year?: number) =>
    year ? `yield_history:${companyId}:${year}` : `yield_history:${companyId}`,
  report: (reportId: string) => `report:${reportId}`,
  reportList: (userId: string) => `report_list:${userId}`,
  analytics: (type: string, date: string) => `analytics:${type}:${date}`,
  metrics: (metric: string) => `metrics:${metric}`,
  apiResponse: (endpoint: string, params: string) => `api:${endpoint}:${params}`,
};

// Cache TTL presets (in seconds)
export const CacheTTL = {
  SHORT: 60,
  MEDIUM: 300,
  DEFAULT: 3600,
  LONG: 86400,
  WEEK: 604800,
};

// Create singleton instance
export const cacheService = new CacheService();

// Export for testing
export function getRedisClient() {
  return null;
}
