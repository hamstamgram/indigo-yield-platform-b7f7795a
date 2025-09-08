import posthog from 'posthog-js';

let initialized = false;

export const initPostHog = () => {
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';
  const environment = import.meta.env.VITE_APP_ENV || 'development';

  if (!apiKey) {
    console.warn('PostHog API key not configured. Analytics disabled.');
    return;
  }

  if (initialized) {
    return;
  }

  posthog.init(apiKey, {
    api_host: host,
    person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
    capture_pageview: true,
    capture_pageleave: true,
    loaded: (posthog) => {
      if (environment === 'development') {
        posthog.debug(true);
      }
    },
    autocapture: {
      // Disable autocapture of sensitive form inputs
      css_selector_allowlist: [
        '[data-attr="button"]',
        '[data-attr="link"]',
        '[data-attr="nav-item"]'
      ],
    },
    session_recording: {
      // Enable session recordings for error debugging
      maskAllInputs: true,
      maskInputOptions: {
        password: true,
        email: false,
        color: false,
      },
    },
  });

  initialized = true;
  console.log('✅ PostHog initialized for analytics');
};

// Analytics event tracking functions
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (!initialized) return;
  posthog.capture(eventName, properties);
};

export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (!initialized) return;
  posthog.identify(userId, properties);
};

export const trackUserAction = (action: string, context?: Record<string, any>) => {
  trackEvent('user_action', {
    action,
    ...context,
    timestamp: new Date().toISOString(),
  });
};

// Specific business events
export const trackStatementDownload = (statementId: string, userId: string) => {
  trackEvent('statement_downloaded', {
    statement_id: statementId,
    user_id: userId,
    timestamp: new Date().toISOString(),
  });
};

export const trackInvestorLogin = (userId: string, method: string = 'email') => {
  trackEvent('investor_login', {
    user_id: userId,
    login_method: method,
    timestamp: new Date().toISOString(),
  });
};

export const trackAdminAction = (action: string, targetId?: string, adminId?: string) => {
  trackEvent('admin_action', {
    action,
    target_id: targetId,
    admin_id: adminId,
    timestamp: new Date().toISOString(),
  });
};

export const trackTransaction = (transactionType: string, amount: number, currency: string, userId: string) => {
  trackEvent('transaction_created', {
    transaction_type: transactionType,
    amount,
    currency,
    user_id: userId,
    timestamp: new Date().toISOString(),
  });
};

export default posthog;
