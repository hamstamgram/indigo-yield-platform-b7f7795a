/**
 * Configuration Module
 * Central export for all configuration settings
 */

// Environment configuration
export { config, isFeatureEnabledByEnv, getDatabaseUrl, isCIEnvironment, getApiRateLimit } from './environment';
export type { 
  Environment, 
  AppConfig, 
  SupabaseConfig, 
  PortfolioSupabaseConfig,
  SentryConfig,
  PostHogConfig,
  EmailConfig,
  AirtableConfig,
  RateLimitConfig
} from './environment';

// Feature flags
export { 
  FEATURE_FLAGS, 
  isFeatureEnabled, 
  getEnabledFeatures, 
  getDisabledFeatures,
  FEATURE_PHASES,
  getDeploymentReadiness,
  getFeatureFlagsForEnvironment
} from './features';
export type { FeatureFlags } from './features';

// Navigation configuration
export { 
  investorNav, 
  ibNav, 
  adminNavGroups, 
  adminNav,
  activityNav,
  profileAndSettingsNav,
  mainNav
} from './navigation';
export type { NavGroup } from './navigation';
