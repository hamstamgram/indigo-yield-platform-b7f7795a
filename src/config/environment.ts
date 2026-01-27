/**
 * Environment Configuration
 *
 * Centralizes environment variable access and provides type-safe configuration
 * for different deployment environments (development, staging, production).
 *
 * @module config/environment
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type Environment = "development" | "staging" | "production" | "test";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  projectId: string;
  serviceRoleKey?: string; // Server-side only
}

export interface PortfolioSupabaseConfig {
  url: string;
  anonKey: string;
}

export interface SentryConfig {
  dsn: string;
  environment: string;
  release: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
}

export interface PostHogConfig {
  apiKey: string;
  host: string;
  enabled: boolean;
}

export interface EmailConfig {
  provider: "mailerlite" | "smtp" | "none";
  mailerlite?: {
    apiKey: string;
    enabled: boolean;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromEmail: string;
    fromName: string;
  };
}

export interface AirtableConfig {
  apiKey: string;
  baseId: string;
  tableName: string;
  syncEnabled: boolean;
  syncIntervalMs: number;
}

export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
}

export interface AppConfig {
  env: Environment;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  isTest: boolean;
  appUrl: string;
  apiUrl: string;
  supabase: SupabaseConfig;
  portfolioSupabase?: PortfolioSupabaseConfig;
  sentry?: SentryConfig;
  posthog?: PostHogConfig;
  email: EmailConfig;
  airtable?: AirtableConfig;
  rateLimit: RateLimitConfig;
  features: {
    previewAdmin: boolean;
    demoMode: boolean;
    debugLogs: boolean;
  };
  logging: {
    level: "debug" | "info" | "warn" | "error";
    format: "json" | "text";
  };
}

// ============================================================================
// Environment Variable Helpers
// ============================================================================

/**
 * Safely get environment variable with fallback
 * Supports both Vite (import.meta.env) and Node.js (process.env)
 */
function getEnv(key: string, fallback = ""): string {
  // Try Vite environment first (client-side)
  if (typeof import.meta !== "undefined" && import.meta.env?.[key]) {
    return import.meta.env[key] as string;
  }

  // Try Node.js environment (server-side)
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key] as string;
  }

  return fallback;
}

/**
 * Get required environment variable or throw error
 */
function getRequiredEnv(key: string): string {
  const value = getEnv(key);
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Please check your .env file or deployment configuration.\n` +
        `See .env.example for required variables.`
    );
  }
  return value;
}

/**
 * Get boolean environment variable
 */
function getBoolEnv(key: string, fallback = false): boolean {
  const value = getEnv(key, String(fallback));
  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Get number environment variable
 */
function getNumberEnv(key: string, fallback: number): number {
  const value = getEnv(key, String(fallback));
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

// ============================================================================
// Environment Detection
// ============================================================================

const NODE_ENV = getEnv("NODE_ENV", "development") as Environment;
const VITE_APP_ENV = getEnv("VITE_APP_ENV", NODE_ENV) as Environment;

// Determine actual environment
const APP_ENV: Environment = VITE_APP_ENV || NODE_ENV;

const IS_DEVELOPMENT = APP_ENV === "development";
const IS_STAGING = APP_ENV === "staging";
const IS_PRODUCTION = APP_ENV === "production";
const IS_TEST = APP_ENV === "test" || NODE_ENV === "test";

// ============================================================================
// Supabase Configuration
// ============================================================================

function getSupabaseConfig(): SupabaseConfig {
  const url = getEnv("VITE_SUPABASE_URL") || getEnv("NEXT_PUBLIC_SUPABASE_URL");

  const anonKey =
    getEnv("VITE_SUPABASE_ANON_KEY") ||
    getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const projectId = getEnv("VITE_SUPABASE_PROJECT_ID", "");

  // Service role key (server-side only, optional for client)
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", "");

  if (!url || !anonKey) {
    throw new Error(
      "Supabase configuration is incomplete.\n" +
        "Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY\n" +
        "Please check your .env file."
    );
  }

  return {
    url,
    anonKey,
    projectId,
    ...(serviceRoleKey && { serviceRoleKey }),
  };
}

function getPortfolioSupabaseConfig(): PortfolioSupabaseConfig | undefined {
  const url = getEnv("VITE_PORTFOLIO_SUPABASE_URL", "");
  const anonKey = getEnv("VITE_PORTFOLIO_SUPABASE_ANON_KEY", "");

  if (!url || !anonKey) {
    return undefined;
  }

  return { url, anonKey };
}

// ============================================================================
// Monitoring Configuration
// ============================================================================

function getSentryConfig(): SentryConfig | undefined {
  const dsn = getEnv("VITE_SENTRY_DSN") || getEnv("SENTRY_DSN", "");

  if (!dsn) {
    if (IS_PRODUCTION) {
      console.warn("⚠️ Sentry DSN not configured for production environment");
    }
    return undefined;
  }

  return {
    dsn,
    environment: getEnv("SENTRY_ENVIRONMENT", APP_ENV),
    release: getEnv("SENTRY_RELEASE", "1.0.0"),
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,
    replaysSessionSampleRate: IS_PRODUCTION ? 0.1 : 0.5,
    replaysOnErrorSampleRate: 1.0,
  };
}

function getPostHogConfig(): PostHogConfig | undefined {
  const apiKey = getEnv("VITE_POSTHOG_KEY", "");
  const host = getEnv("VITE_POSTHOG_HOST", "https://app.posthog.com");

  if (!apiKey) {
    if (IS_PRODUCTION) {
      console.warn("⚠️ PostHog API key not configured for production environment");
    }
    return undefined;
  }

  return {
    apiKey,
    host,
    enabled: getBoolEnv("POSTHOG_FEATURE_FLAGS_ENABLED", true),
  };
}

// ============================================================================
// Email Configuration
// ============================================================================

function getEmailConfig(): EmailConfig {
  const mailerliteKey = getEnv("MAILERLITE_API_KEY", "");
  const mailerliteEnabled = getBoolEnv("VITE_MAILERLITE_ENABLED", false);

  if (mailerliteKey && mailerliteEnabled) {
    return {
      provider: "mailerlite",
      mailerlite: {
        apiKey: mailerliteKey,
        enabled: true,
      },
    };
  }

  const smtpHost = getEnv("SMTP_HOST", "");
  if (smtpHost) {
    return {
      provider: "smtp",
      smtp: {
        host: smtpHost,
        port: getNumberEnv("SMTP_PORT", 587),
        secure: getBoolEnv("SMTP_SECURE", true),
        user: getEnv("SMTP_USER", ""),
        password: getEnv("SMTP_PASSWORD", ""),
        fromEmail: getEnv("SMTP_FROM_EMAIL", "noreply@indigo-platform.com"),
        fromName: getEnv("SMTP_FROM_NAME", "Indigo Yield Platform"),
      },
    };
  }

  return { provider: "none" };
}

// ============================================================================
// Integration Configuration
// ============================================================================

function getAirtableConfig(): AirtableConfig | undefined {
  const apiKey = getEnv("AIRTABLE_API_KEY") || getEnv("VITE_AIRTABLE_API_KEY", "");
  const baseId = getEnv("AIRTABLE_BASE_ID") || getEnv("VITE_AIRTABLE_BASE_ID", "");
  const tableName =
    getEnv("AIRTABLE_TABLE_NAME") || getEnv("VITE_AIRTABLE_TABLE_NAME", "Investor Onboarding");

  if (!apiKey || !baseId) {
    return undefined;
  }

  return {
    apiKey,
    baseId,
    tableName,
    syncEnabled: getBoolEnv("AIRTABLE_SYNC_ENABLED", false),
    syncIntervalMs: getNumberEnv("AIRTABLE_SYNC_INTERVAL_MS", 300000), // 5 minutes
  };
}

// ============================================================================
// Security Configuration
// ============================================================================

function getRateLimitConfig(): RateLimitConfig {
  return {
    enabled: getBoolEnv("RATE_LIMIT_ENABLED", true),
    windowMs: getNumberEnv("RATE_LIMIT_WINDOW_MS", 900000), // 15 minutes
    maxRequests: getNumberEnv("RATE_LIMIT_MAX_REQUESTS", 100),
  };
}

// ============================================================================
// Build Configuration Object
// ============================================================================

export const config: AppConfig = {
  // Environment
  env: APP_ENV,
  isDevelopment: IS_DEVELOPMENT,
  isStaging: IS_STAGING,
  isProduction: IS_PRODUCTION,
  isTest: IS_TEST,

  // URLs
  appUrl: getEnv("NEXT_PUBLIC_APP_URL") || getEnv("VITE_PUBLIC_URL", "http://localhost:8080"),
  apiUrl: getEnv("API_URL") || getEnv("VITE_API_URL", "http://localhost:8080/api"),

  // Core Services
  supabase: getSupabaseConfig(),
  portfolioSupabase: getPortfolioSupabaseConfig(),

  // Monitoring
  sentry: getSentryConfig(),
  posthog: getPostHogConfig(),

  // Integrations
  email: getEmailConfig(),
  airtable: getAirtableConfig(),

  // Security
  rateLimit: getRateLimitConfig(),

  // Feature Flags
  features: {
    previewAdmin: getBoolEnv("VITE_PREVIEW_ADMIN", false),
    demoMode: getBoolEnv("VITE_DEMO_MODE", false),
    debugLogs: getBoolEnv("ENABLE_DEBUG_LOGS", IS_DEVELOPMENT),
  },

  // Logging
  logging: {
    level: getEnv("LOG_LEVEL", IS_DEVELOPMENT ? "debug" : "info") as AppConfig["logging"]["level"],
    format: getEnv("LOG_FORMAT", "json") as AppConfig["logging"]["format"],
  },
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate configuration on module load
 */
function validateConfig(): void {
  const errors: string[] = [];

  // Critical validations
  if (!config.supabase.url) {
    errors.push("Missing VITE_SUPABASE_URL");
  }
  if (!config.supabase.anonKey) {
    errors.push("Missing VITE_SUPABASE_ANON_KEY");
  }

  // Production-specific validations
  if (IS_PRODUCTION) {
    if (!config.sentry?.dsn) {
      console.warn("⚠️ Sentry not configured for production");
    }
    if (!config.posthog?.apiKey) {
      console.warn("⚠️ PostHog not configured for production");
    }
    if (config.features.demoMode) {
      console.warn("⚠️ Demo mode is enabled in production");
    }
  }

  if (errors.length > 0) {
    throw new Error(
      "Configuration validation failed:\n" +
        errors.map((e) => `  - ${e}`).join("\n") +
        "\n\nPlease check your .env file and ensure all required variables are set."
    );
  }
}

// Run validation
validateConfig();

// ============================================================================
// Development Logging
// ============================================================================

// Environment logging removed for security - configuration should not be logged even in development

// ============================================================================
// Exports
// ============================================================================

export default config;

/**
 * Helper function to check if a feature is enabled via environment variable
 * This provides runtime overrides for feature flags defined in features.ts
 */
export function isFeatureEnabledByEnv(feature: string): boolean | undefined {
  const envKey = `VITE_FEATURE_${feature.toUpperCase()}`;
  const value = getEnv(envKey, "");

  if (value === "") {
    return undefined; // Not set, use default from features.ts
  }

  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Get environment-specific database URL
 */
export function getDatabaseUrl(): string | undefined {
  if (IS_TEST) {
    return getEnv("TEST_SUPABASE_URL", "");
  }

  if (IS_DEVELOPMENT) {
    return getEnv("SUPABASE_DEV_DB_URL", "");
  }

  if (IS_STAGING) {
    return getEnv("SUPABASE_STAGING_DB_URL", "");
  }

  if (IS_PRODUCTION) {
    return getEnv("SUPABASE_PROD_DB_URL", "");
  }

  return getEnv("DATABASE_URL", "");
}

/**
 * Check if running in CI/CD environment
 */
export function isCIEnvironment(): boolean {
  return (
    getBoolEnv("CI", false) || getBoolEnv("GITHUB_ACTIONS", false) || getBoolEnv("VERCEL", false)
  );
}

/**
 * Get API rate limit for specific endpoint (can be customized per route)
 */
export function getApiRateLimit(endpoint?: string): RateLimitConfig {
  // Could be extended to support per-endpoint rate limits
  return config.rateLimit;
}
