import posthog from 'posthog-js';

let isInitialized = false;

export function initPostHog() {
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY || 'your_posthog_key_here';
  const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';
  
  if (!apiKey || apiKey === 'your_posthog_key_here') {
    console.log('PostHog: No API key configured, skipping initialization');
    return;
  }

  if (isInitialized) {
    console.log('PostHog: Already initialized');
    return;
  }

  try {
    posthog.init(apiKey, {
      api_host: apiHost,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false, // We'll manually track important events
      persistence: 'localStorage',
      loaded: (posthog) => {
        // Disable in development if needed
        if (import.meta.env.DEV && import.meta.env.VITE_DISABLE_ANALYTICS === 'true') {
          posthog.opt_out_capturing();
        }
      },
      // Mask sensitive data
      sanitize_properties: (properties) => {
        // Remove any keys that might contain sensitive data
        const sanitized = { ...properties };
        const sensitiveKeys = ['password', 'token', 'api_key', 'secret', 'credit_card'];
        
        Object.keys(sanitized).forEach(key => {
          if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
            delete sanitized[key];
          }
        });
        
        return sanitized;
      },
    });

    isInitialized = true;
    console.log('PostHog: Initialized successfully');
  } catch (error) {
    console.error('PostHog: Failed to initialize', error);
  }
}

// User identification
export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (!isInitialized) return;
  
  // Mask email if present in traits
  const maskedTraits = { ...traits };
  if (maskedTraits.email) {
    const [localPart, domain] = maskedTraits.email.split('@');
    maskedTraits.email = `${localPart.slice(0, 2)}***@${domain}`;
  }
  
  posthog.identify(userId, maskedTraits);
}

export function resetUser() {
  if (!isInitialized) return;
  posthog.reset();
}

// Event tracking functions
export const analytics = {
  // Authentication events
  trackLogin: (method: 'email' | 'magic_link' | 'social') => {
    if (!isInitialized) return;
    posthog.capture('user_logged_in', {
      method,
      timestamp: new Date().toISOString(),
    });
  },

  trackLogout: () => {
    if (!isInitialized) return;
    posthog.capture('user_logged_out', {
      timestamp: new Date().toISOString(),
    });
  },

  trackSignup: (method: 'email' | 'invite') => {
    if (!isInitialized) return;
    posthog.capture('user_signed_up', {
      method,
      timestamp: new Date().toISOString(),
    });
  },

  // Statement events
  trackStatementDownload: (statementId: string, period: { year: number; month: number }) => {
    if (!isInitialized) return;
    posthog.capture('statement_downloaded', {
      statement_id: statementId,
      period_year: period.year,
      period_month: period.month,
      timestamp: new Date().toISOString(),
    });
  },

  trackStatementGenerated: (investorId: string, period: { year: number; month: number }, mode: 'single' | 'bulk') => {
    if (!isInitialized) return;
    posthog.capture('statement_generated', {
      investor_id_hash: hashId(investorId), // Hash for privacy
      period_year: period.year,
      period_month: period.month,
      generation_mode: mode,
      timestamp: new Date().toISOString(),
    });
  },

  // Transaction events
  trackDepositCreated: (amount: number, assetCode: string) => {
    if (!isInitialized) return;
    posthog.capture('deposit_created', {
      amount_range: getAmountRange(amount),
      asset_code: assetCode,
      timestamp: new Date().toISOString(),
    });
  },

  trackWithdrawalCreated: (amount: number, assetCode: string) => {
    if (!isInitialized) return;
    posthog.capture('withdrawal_created', {
      amount_range: getAmountRange(amount),
      asset_code: assetCode,
      timestamp: new Date().toISOString(),
    });
  },

  trackInterestCalculated: (totalPortfolios: number, totalInterest: number) => {
    if (!isInitialized) return;
    posthog.capture('interest_calculated', {
      portfolios_processed: totalPortfolios,
      total_interest_range: getAmountRange(totalInterest),
      timestamp: new Date().toISOString(),
    });
  },

  // Page views
  trackPageView: (page: string, properties?: Record<string, any>) => {
    if (!isInitialized) return;
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      page_name: page,
      ...properties,
    });
  },

  // Feature usage
  trackFeatureUsed: (feature: string, properties?: Record<string, any>) => {
    if (!isInitialized) return;
    posthog.capture('feature_used', {
      feature_name: feature,
      ...properties,
      timestamp: new Date().toISOString(),
    });
  },

  // Error tracking (in addition to Sentry)
  trackError: (error: string, context?: Record<string, any>) => {
    if (!isInitialized) return;
    posthog.capture('error_occurred', {
      error_message: error.slice(0, 100), // Truncate for privacy
      ...context,
      timestamp: new Date().toISOString(),
    });
  },
};

// Helper functions
function hashId(id: string): string {
  // Simple hash for privacy (in production, use a proper hash)
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

function getAmountRange(amount: number): string {
  if (amount < 100) return '0-100';
  if (amount < 1000) return '100-1000';
  if (amount < 10000) return '1000-10000';
  if (amount < 100000) return '10000-100000';
  return '100000+';
}

// Shutdown function for consent withdrawal
export function shutdownPostHog() {
  if (isInitialized) {
    posthog.opt_out_capturing();
    isInitialized = false;
    console.log('PostHog: Shut down due to consent withdrawal');
  }
}

// Export PostHog instance for advanced usage
export { posthog };
