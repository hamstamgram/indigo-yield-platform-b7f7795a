import { QueryClient } from "@tanstack/react-query";

/**
 * Optimized QueryClient configuration
 */
export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
};

// Lazily-bound QueryClient reference - set by App.tsx
let _queryClient: QueryClient | null = null;

export function setQueryClient(client: QueryClient): void {
  _queryClient = client;
}

function getQueryClient(): QueryClient {
  if (!_queryClient) {
    throw new Error("QueryClient not initialized. Call setQueryClient first.");
  }
  return _queryClient;
}

export const CACHE_KEYS = {
  USER_PROFILE: "userProfile",
  USER_SETTINGS: "userSettings",
  PORTFOLIO_SUMMARY: "portfolioSummary",
  PORTFOLIO_POSITIONS: "portfolioPositions",
  PORTFOLIO_PERFORMANCE: "portfolioPerformance",
  TRANSACTIONS: "transactions",
  TRANSACTION_HISTORY: "transactionHistory",
  RECENT_TRANSACTIONS: "recentTransactions",
  ADMIN_METRICS: "adminMetrics",
  ADMIN_USERS: "adminUsers",
  ADMIN_SYSTEM_HEALTH: "adminSystemHealth",
  LIVE_PRICES: "livePrices",
  MARKET_DATA: "marketData",
} as const;

export const cacheUtils = {
  invalidateUserCache: (userId: string) => {
    getQueryClient().invalidateQueries({
      predicate: (query) => {
        return (
          query.queryKey.includes(userId) ||
          query.queryKey.includes(CACHE_KEYS.USER_PROFILE) ||
          query.queryKey.includes(CACHE_KEYS.PORTFOLIO_SUMMARY)
        );
      },
    });
  },

  invalidatePortfolioCache: () => {
    getQueryClient().invalidateQueries({
      predicate: (query) => {
        return (
          query.queryKey.includes(CACHE_KEYS.PORTFOLIO_SUMMARY) ||
          query.queryKey.includes(CACHE_KEYS.PORTFOLIO_POSITIONS) ||
          query.queryKey.includes(CACHE_KEYS.PORTFOLIO_PERFORMANCE)
        );
      },
    });
  },

  invalidateTransactionCache: () => {
    getQueryClient().invalidateQueries({
      predicate: (query) => {
        return (
          query.queryKey.includes(CACHE_KEYS.TRANSACTIONS) ||
          query.queryKey.includes(CACHE_KEYS.TRANSACTION_HISTORY) ||
          query.queryKey.includes(CACHE_KEYS.RECENT_TRANSACTIONS)
        );
      },
    });
  },

  clearAllCaches: () => {
    getQueryClient().clear();
  },

  prefetchUserData: async (userId: string) => {
    await getQueryClient().prefetchQuery({
      queryKey: [CACHE_KEYS.USER_PROFILE, userId],
      queryFn: async () => null,
      staleTime: 10 * 60 * 1000,
    });

    await getQueryClient().prefetchQuery({
      queryKey: [CACHE_KEYS.PORTFOLIO_SUMMARY, userId],
      queryFn: async () => null,
      staleTime: 5 * 60 * 1000,
    });
  },
};

// Memory-based cache with lazy cleanup (no global setInterval)
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

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      // Lazy cleanup: prune expired entries on read
      if (this.cache.size > 20) this.cleanup();
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

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const memoryCache = new MemoryCache();
