/**
 * Query Configuration Constants
 * Centralized React Query staleTime and caching configurations
 * Created: 2026-01-13
 *
 * STRATEGY:
 * - Financial data (balances, AUM): 30 seconds - needs frequent updates
 * - Transaction lists: 60 seconds - semi-frequent updates
 * - Reference data (funds, investors): 5 minutes - rarely changes
 * - Static data (settings, labels): 10 minutes - almost never changes
 */

// ============================================================================
// STALE TIME CONFIGURATIONS (in milliseconds)
// ============================================================================

export const STALE_TIME = {
  /** Financial data that changes frequently (balances, positions, AUM) */
  FINANCIAL: 5 * 1000, // 5 seconds - Fortune 500 requirement: near real-time updates

  /** Transaction and activity lists */
  TRANSACTIONS: 60 * 1000, // 60 seconds

  /** Risk monitoring data */
  RISK_MONITORING: 30 * 1000, // 30 seconds

  /** Reference data (funds list, investor profiles) */
  REFERENCE: 5 * 60 * 1000, // 5 minutes

  /** Static configuration data */
  STATIC: 10 * 60 * 1000, // 10 minutes

  /** Real-time data that should always refetch */
  REALTIME: 0, // Always stale

  /** Admin dashboard metrics */
  DASHBOARD_METRICS: 60 * 1000, // 60 seconds

  /** Materialized view data (refreshed on demand) */
  MATERIALIZED: 2 * 60 * 1000, // 2 minutes
} as const;

// ============================================================================
// CACHE TIME CONFIGURATIONS (garbage collection time)
// ============================================================================

export const CACHE_TIME = {
  /** Short-lived cache for frequently changing data */
  SHORT: 5 * 60 * 1000, // 5 minutes

  /** Standard cache duration */
  STANDARD: 15 * 60 * 1000, // 15 minutes

  /** Long cache for reference data */
  LONG: 30 * 60 * 1000, // 30 minutes

  /** Extended cache for static data */
  EXTENDED: 60 * 60 * 1000, // 1 hour
} as const;

// ============================================================================
// RETRY CONFIGURATIONS
// ============================================================================

export const RETRY_CONFIG = {
  /** Standard retry count for most queries */
  STANDARD: 3,

  /** Reduced retries for user-facing operations */
  REDUCED: 1,

  /** No retries for mutations (user should manually retry) */
  NONE: 0,

  /** Retry delay function for exponential backoff */
  DELAY: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
} as const;

// ============================================================================
// REFETCH INTERVAL CONFIGURATIONS
// ============================================================================

export const REFETCH_INTERVAL = {
  /** Disable background refetch */
  DISABLED: false as const,

  /** High-frequency polling (risk alerts, live data) */
  HIGH: 15 * 1000, // 15 seconds

  /** Standard polling interval */
  STANDARD: 30 * 1000, // 30 seconds

  /** Low-frequency polling */
  LOW: 60 * 1000, // 60 seconds

  /** Occasional refresh */
  OCCASIONAL: 5 * 60 * 1000, // 5 minutes
} as const;

// ============================================================================
// QUERY DEFAULTS BY DATA TYPE
// ============================================================================

/**
 * Default query options for different data categories
 */
export const QUERY_DEFAULTS = {
  /** Financial/Balance queries */
  financial: {
    staleTime: STALE_TIME.FINANCIAL,
    gcTime: CACHE_TIME.SHORT,
    retry: RETRY_CONFIG.STANDARD,
    refetchOnWindowFocus: true,
  },

  /** Transaction list queries */
  transactions: {
    staleTime: STALE_TIME.TRANSACTIONS,
    gcTime: CACHE_TIME.STANDARD,
    retry: RETRY_CONFIG.STANDARD,
    refetchOnWindowFocus: true,
  },

  /** Risk monitoring queries */
  riskMonitoring: {
    staleTime: STALE_TIME.RISK_MONITORING,
    gcTime: CACHE_TIME.SHORT,
    retry: RETRY_CONFIG.STANDARD,
    refetchOnWindowFocus: true,
  },

  /** Reference data queries */
  reference: {
    staleTime: STALE_TIME.REFERENCE,
    gcTime: CACHE_TIME.LONG,
    retry: RETRY_CONFIG.STANDARD,
    refetchOnWindowFocus: false,
  },

  /** Static configuration queries */
  static: {
    staleTime: STALE_TIME.STATIC,
    gcTime: CACHE_TIME.EXTENDED,
    retry: RETRY_CONFIG.STANDARD,
    refetchOnWindowFocus: false,
  },

  /** Dashboard metrics queries */
  dashboard: {
    staleTime: STALE_TIME.DASHBOARD_METRICS,
    gcTime: CACHE_TIME.SHORT,
    retry: RETRY_CONFIG.STANDARD,
    refetchOnWindowFocus: true,
  },
} as const;

// ============================================================================
// MUTATION DEFAULTS
// ============================================================================

export const MUTATION_DEFAULTS = {
  /** Standard mutation (financial operations) */
  standard: {
    retry: RETRY_CONFIG.NONE,
  },

  /** Idempotent operations that can be safely retried */
  idempotent: {
    retry: RETRY_CONFIG.REDUCED,
  },
} as const;
