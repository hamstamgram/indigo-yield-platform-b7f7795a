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
    integrations: [
      new Sentry.BrowserTracing({
        // Set sampling rate for performance monitoring
        tracingOrigins: ["localhost", /^\//],
      }),
      new Sentry.Replay({
        // Capture 10% of all sessions,
        // plus 100% of sessions with an error
        sessionSampleRate: 0.1,
        errorSampleRate: 1.0,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Filter out development errors
      if (environment === 'development') {
        // Don't send certain development-only errors
        if (event.exception?.values?.some(ex => 
          ex.value?.includes('ResizeObserver loop limit exceeded') ||
          ex.value?.includes('Non-Error promise rejection captured')
        )) {
          return null;
        }
      }
      return event;
    },
  });

  console.log('✅ Sentry initialized for error tracking');
};

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
export const setUser = Sentry.setUser;
export const setTag = Sentry.setTag;
export const setContext = Sentry.setContext;
