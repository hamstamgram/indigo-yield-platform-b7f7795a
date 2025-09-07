import * as Sentry from "@sentry/react";

export const initSentry = () => {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_APP_ENV || 'development';

  if (!sentryDsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    // Send default PII data to Sentry for better debugging
    // This includes automatic IP address collection on events
    sendDefaultPii: true,
    integrations: [
      new Sentry.BrowserTracing({
        // Set sampling rate for performance monitoring
        tracingOrigins: [
          "localhost", 
          /^\//,
          /^https:\/\/.*\.vercel\.app/,
          /^https:\/\/.*\.supabase\.co/,
          "indigo-yield-platform"
        ],
      }),
      new Sentry.Replay({
        // Capture 10% of all sessions in production,
        // plus 100% of sessions with an error
        sessionSampleRate: environment === 'production' ? 0.1 : 1.0,
        errorSampleRate: 1.0,
        // Mask sensitive data in session replays
        maskAllInputs: true,
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Session Replay sampling
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    // Enhanced error filtering and context
    beforeSend(event, hint) {
      // Filter out development-only errors
      if (environment === 'development') {
        if (event.exception?.values?.some(ex => 
          ex.value?.includes('ResizeObserver loop limit exceeded') ||
          ex.value?.includes('Non-Error promise rejection captured') ||
          ex.value?.includes('ChunkLoadError') ||
          ex.value?.includes('Loading chunk')
        )) {
          return null;
        }
      }
      
      // Add additional context for financial platform
      if (event.user) {
        // Remove sensitive PII but keep useful debugging info
        const { email, ...safeUser } = event.user;
        event.user = {
          ...safeUser,
          email_hash: email ? btoa(email).substring(0, 8) : undefined,
        };
      }
      
      // Add platform-specific tags
      event.tags = {
        ...event.tags,
        platform: 'indigo-yield',
        deployment: environment,
      };
      
      return event;
    },
    // Set user context automatically
    initialScope: {
      tags: {
        component: 'frontend',
        platform: 'indigo-yield-portal',
      },
    },
  });

  console.log('✅ Sentry initialized for error tracking');
};

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
export const setUser = Sentry.setUser;
export const setTag = Sentry.setTag;
export const setContext = Sentry.setContext;
