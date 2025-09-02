import * as Sentry from '@sentry/react';

export function initSentry() {
  // Get the Sentry DSN from environment or use the token from .env
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!sentryDsn || sentryDsn === 'your_sentry_dsn_here') {
    console.log('Sentry: No DSN configured, skipping initialization');
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      // Setting this option to true will send default PII data to Sentry.
      // For example, automatic IP address collection on events
      sendDefaultPii: true,
      integrations: [
        Sentry.replayIntegration({
          maskAllText: true,
          maskAllInputs: true,
          blockAllMedia: true,
        }),
      ],
      
      // Performance Monitoring
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in production, 100% in development
      
      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
      
      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || 'unknown',
      environment: import.meta.env.MODE || 'development',
      
      // Filter out common non-errors
      beforeSend(event, hint) {
        // Filter out cancelled requests
        if (hint.originalException?.message?.includes('cancelled')) {
          return null;
        }
        
        // Filter out network errors in development
        if (!import.meta.env.PROD && hint.originalException?.message?.includes('NetworkError')) {
          return null;
        }
        
        // Add user context if available
        const user = getCurrentUser();
        if (user) {
          event.user = {
            id: user.id,
            email: user.email,
          };
        }
        
        return event;
      },
      
      // Ignore certain errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        // Common network errors
        'Network request failed',
        'NetworkError',
        'Failed to fetch',
      ],
    });
    
    console.log('Sentry: Initialized successfully');
  } catch (error) {
    console.error('Sentry: Failed to initialize', error);
  }
}

export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

export function setUserContext(user: { id: string; email: string; name?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

export function clearUserContext() {
  Sentry.setUser(null);
}

export function addBreadcrumb(message: string, category: string, data?: any) {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
}

// Helper to get current user from Supabase
function getCurrentUser() {
  try {
    const userStr = localStorage.getItem('supabase.auth.token');
    if (userStr) {
      const userData = JSON.parse(userStr);
      return userData?.currentSession?.user || null;
    }
  } catch {
    return null;
  }
  return null;
}
