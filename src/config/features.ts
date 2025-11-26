/**
 * Feature Flags Configuration
 *
 * Controls which features are enabled/disabled across the platform.
 * Use this to gate incomplete features during deployment and enable
 * them progressively in Phase 2.
 *
 * @module config/features
 */

export interface FeatureFlags {
  // Phase 1 - MVP Features (Currently Deployed)
  AUTHENTICATION: boolean;
  DASHBOARD: boolean;
  PORTFOLIO_MANAGEMENT: boolean;
  DOCUMENT_MANAGEMENT: boolean;
  ADMIN_OPERATIONS: boolean;
  TRANSACTION_HISTORY: boolean;
  WITHDRAWAL_REQUESTS: boolean;

  // Phase 2 - Advanced Features (To Be Implemented)
  CUSTOM_REPORTS: boolean;
  PDF_GENERATION: boolean;
  SCHEDULED_REPORTS: boolean;
  AIRTABLE_SYNC: boolean;
  PUSH_NOTIFICATIONS: boolean;
  TWO_FACTOR_AUTH: boolean;
  DARK_MODE: boolean;
  OFFLINE_MODE: boolean;

  // Phase 3 - Enterprise Features (Future)
  BULK_OPERATIONS: boolean;
  ADVANCED_ANALYTICS: boolean;
  API_ACCESS: boolean;
  CUSTOM_INTEGRATIONS: boolean;
  WHITE_LABEL: boolean;
  MULTI_LANGUAGE: boolean;
}

/**
 * Feature Flags - Phase 1 MVP Configuration
 *
 * Enable only completed features for initial Lovable deployment.
 * Features marked `false` will be hidden from UI and their
 * functionality will return stub responses.
 */
export const FEATURE_FLAGS: FeatureFlags = {
  // ===== PHASE 1 - ENABLED (MVP Features) =====
  AUTHENTICATION: true, // ✅ Login, logout, password reset
  DASHBOARD: true, // ✅ Investor & admin dashboards
  PORTFOLIO_MANAGEMENT: true, // ✅ View positions, balances, performance
  DOCUMENT_MANAGEMENT: true, // ✅ Upload, view, download documents
  ADMIN_OPERATIONS: true, // ✅ Monthly data entry, statement generation
  TRANSACTION_HISTORY: true, // ✅ View all transactions
  WITHDRAWAL_REQUESTS: true, // ✅ Submit and track withdrawal requests

  // ===== PHASE 2 - DISABLED (Coming Soon) =====
  CUSTOM_REPORTS: false, // ⚠️ reportEngine.ts is stub - enable after full implementation
  PDF_GENERATION: false, // ⚠️ Requires PDFKit/jsPDF installation
  SCHEDULED_REPORTS: false, // ⚠️ Requires cron job or Edge Function implementation
  AIRTABLE_SYNC: false, // ⚠️ Optional - enable when AIRTABLE_API_KEY configured
  PUSH_NOTIFICATIONS: false, // ⚠️ Requires service worker + push API setup
  TWO_FACTOR_AUTH: false, // ⚠️ TOTP implementation needs encryption key rotation
  DARK_MODE: false, // ⚠️ UI theme system not implemented
  OFFLINE_MODE: false, // ⚠️ Service worker + cache strategy not implemented

  // ===== PHASE 3 - DISABLED (Future) =====
  BULK_OPERATIONS: false, // Future: Bulk investor import, bulk transactions
  ADVANCED_ANALYTICS: false, // Future: Predictive analytics, forecasting
  API_ACCESS: false, // Future: REST API for third-party integrations
  CUSTOM_INTEGRATIONS: false, // Future: Zapier, n8n, custom webhooks
  WHITE_LABEL: false, // Future: Custom branding per client
  MULTI_LANGUAGE: false, // Future: i18n support
};

/**
 * Check if a feature is enabled
 *
 * @param feature - Feature name from FeatureFlags
 * @returns boolean
 *
 * @example
 * if (isFeatureEnabled('CUSTOM_REPORTS')) {
 *   // Show custom reports UI
 * } else {
 *   // Show "Coming Soon" message
 * }
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return FEATURE_FLAGS[feature] === true;
}

/**
 * Get all enabled features
 *
 * @returns Array of enabled feature names
 */
export function getEnabledFeatures(): Array<keyof FeatureFlags> {
  return (Object.keys(FEATURE_FLAGS) as Array<keyof FeatureFlags>).filter((key) =>
    isFeatureEnabled(key)
  );
}

/**
 * Get all disabled features
 *
 * @returns Array of disabled feature names
 */
export function getDisabledFeatures(): Array<keyof FeatureFlags> {
  return (Object.keys(FEATURE_FLAGS) as Array<keyof FeatureFlags>).filter(
    (key) => !isFeatureEnabled(key)
  );
}

/**
 * Feature deployment phases
 */
export const FEATURE_PHASES = {
  PHASE_1_MVP: [
    "AUTHENTICATION",
    "DASHBOARD",
    "PORTFOLIO_MANAGEMENT",
    "DOCUMENT_MANAGEMENT",
    "ADMIN_OPERATIONS",
    "TRANSACTION_HISTORY",
    "WITHDRAWAL_REQUESTS",
  ],
  PHASE_2_ADVANCED: [
    "CUSTOM_REPORTS",
    "PDF_GENERATION",
    "SCHEDULED_REPORTS",
    "AIRTABLE_SYNC",
    "PUSH_NOTIFICATIONS",
    "TWO_FACTOR_AUTH",
    "DARK_MODE",
    "OFFLINE_MODE",
  ],
  PHASE_3_ENTERPRISE: [
    "BULK_OPERATIONS",
    "ADVANCED_ANALYTICS",
    "API_ACCESS",
    "CUSTOM_INTEGRATIONS",
    "WHITE_LABEL",
    "MULTI_LANGUAGE",
  ],
} as const;

/**
 * Check deployment readiness
 *
 * @returns Percentage of features ready for deployment
 */
export function getDeploymentReadiness(): {
  ready: number;
  total: number;
  percentage: number;
  phase: string;
} {
  const enabledCount = getEnabledFeatures().length;
  const totalCount = Object.keys(FEATURE_FLAGS).length;
  const percentage = Math.round((enabledCount / totalCount) * 100);

  let phase = "Phase 1 - MVP";
  if (percentage > 85) phase = "Phase 3 - Enterprise";
  else if (percentage > 50) phase = "Phase 2 - Advanced";

  return {
    ready: enabledCount,
    total: totalCount,
    percentage,
    phase,
  };
}

/**
 * Environment-based feature overrides
 *
 * In development, you might want to enable experimental features.
 * In production, stick to FEATURE_FLAGS defaults.
 */
export function getFeatureFlagsForEnvironment(): FeatureFlags {
  const env = import.meta.env.VITE_APP_ENV || "development";

  if (env === "development" || env === "staging") {
    // Enable some Phase 2 features for testing in dev/staging
    return {
      ...FEATURE_FLAGS,
      // Optionally enable features for testing:
      // CUSTOM_REPORTS: true,
      // DARK_MODE: true,
    };
  }

  // Production: use strict defaults
  return FEATURE_FLAGS;
}

// Default export
export default {
  FEATURE_FLAGS,
  isFeatureEnabled,
  getEnabledFeatures,
  getDisabledFeatures,
  FEATURE_PHASES,
  getDeploymentReadiness,
  getFeatureFlagsForEnvironment,
};
