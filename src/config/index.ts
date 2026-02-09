/**
 * Configuration Module
 * Central export for all configuration settings
 */

// Environment configuration
export {
  config,
  isFeatureEnabledByEnv,
  getDatabaseUrl,
  isCIEnvironment,
  getApiRateLimit,
} from "./environment";
export type {
  Environment,
  AppConfig,
  SupabaseConfig,
  PortfolioSupabaseConfig,
  SentryConfig,
  PostHogConfig,
  EmailConfig,
  AirtableConfig,
  RateLimitConfig,
} from "./environment";

// Navigation configuration
export { investorNav, adminNavGroups, adminNav } from "./navigation";
export type { NavGroup } from "./navigation";
