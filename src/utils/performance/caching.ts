// @ts-nocheck
import { QueryClient } from '@tanstack/react-query';

// Query client configuration with optimized caching
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus for better performance
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

// Cache keys for consistent query invalidation
export const CACHE_KEYS = {
  // User data
  USER_PROFILE: 'userProfile',
  USER_SETTINGS: 'userSettings',
  
  // Portfolio data
  PORTFOLIO_SUMMARY: 'portfolioSummary',
  PORTFOLIO_POSITIONS: 'portfolioPositions',
  PORTFOLIO_PERFORMANCE: 'portfolioPerformance',
  
  // Transaction data
  TRANSACTIONS: 'transactions',
  TRANSACTION_HISTORY: 'transactionHistory',
  RECENT_TRANSACTIONS: 'recentTransactions',
  
  // Admin data
  ADMIN_METRICS: 'adminMetrics',
  ADMIN_USERS: 'adminUsers',
  ADMIN_SYSTEM_HEALTH: 'adminSystemHealth',
  
  // Real-time data (shorter cache times)
  LIVE_PRICES: 'livePrices',
  MARKET_DATA: 'marketData',
} as const;

// Utility functions for cache management
export const cacheUtils = {
  // Invalidate user-specific caches
  invalidateUserCache: (userId: string) => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        return query.queryKey.includes(userId) || 
               query.queryKey.includes(CACHE_KEYS.USER_PROFILE) ||
               query.queryKey.includes(CACHE_KEYS.PORTFOLIO_SUMMARY);
      }
    });
  },

  // Invalidate portfolio caches
  invalidatePortfolioCache: (userId: string) => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        return query.queryKey.includes(CACHE_KEYS.PORTFOLIO_SUMMARY) ||
               query.queryKey.includes(CACHE_KEYS.PORTFOLIO_POSITIONS) ||
               query.queryKey.includes(CACHE_KEYS.PORTFOLIO_PERFORMANCE);
      }
    });
  },

  // Invalidate transaction caches
  invalidateTransactionCache: () => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        return query.queryKey.includes(CACHE_KEYS.TRANSACTIONS) ||
               query.queryKey.includes(CACHE_KEYS.TRANSACTION_HISTORY) ||
               query.queryKey.includes(CACHE_KEYS.RECENT_TRANSACTIONS);
      }
    });
  },

  // Clear all caches (use sparingly)
  clearAllCaches: () => {
    queryClient.clear();
  },

  // Prefetch commonly used data
  prefetchUserData: async (userId: string) => {
    // Prefetch user profile
    queryClient.prefetchQuery({
      queryKey: [CACHE_KEYS.USER_PROFILE, userId],
      staleTime: 10 * 60 * 1000, // 10 minutes
    });

    // Prefetch portfolio summary
    queryClient.prefetchQuery({
      queryKey: [CACHE_KEYS.PORTFOLIO_SUMMARY, userId],
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  },
};

// Memory-based cache for frequently accessed data
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const memoryCache = new MemoryCache();

// Auto cleanup every 5 minutes
setInterval(() => {
  memoryCache.cleanup();
}, 5 * 60 * 1000);
