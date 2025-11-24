// Make Sentry optional - it may not be installed
let Sentry: any = null;
try {
  // Try to require Sentry if available, but don't fail if not
  if (typeof window !== 'undefined') {
    // @ts-ignore - optional dependency
    import('@sentry/react').then(module => { Sentry = module; }).catch(() => {});
  }
} catch {
  console.log("[Sentry] Package not installed, monitoring disabled");
}

let sentryInitialized = false;

export function initSentry() {
  if (!Sentry) return;
  
  // Prevent multiple initializations
  if (sentryInitialized) {
    console.warn("[Sentry] Already initialized, skipping");
    return;
  }

  // Skip in development to avoid double initialization issues
  if (!import.meta.env.PROD) {
    console.log("[Sentry] Skipping initialization in development");
    return;
  }

  // Use the actual Sentry DSN
  const sentryDsn =
    import.meta.env.VITE_SENTRY_DSN ||
    "https://d9c2a485401aa221a88caa3c007eee4a@o4509944393629696.ingest.de.sentry.io/4509949718233168";

  if (!sentryDsn || sentryDsn === "your_sentry_dsn_here") {
    console.warn("[Sentry] No DSN configured, skipping initialization");
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      // Setting this option to true will send default PII data to Sentry.
      // For example, automatic IP address collection on events
      sendDefaultPii: true,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],

      // Performance Monitoring
      tracesSampleRate: 0.1, // 10% in production

      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || "unknown",
      environment: import.meta.env.MODE || "production",

      // Filter out common non-errors
      beforeSend(event: any, hint: any) {
        // Filter out cancelled requests
        if ((hint.originalException as any)?.message?.includes("cancelled")) {
          return null;
        }

        // Filter out network errors in development
        if (
          !import.meta.env.PROD &&
          (hint.originalException as any)?.message?.includes("NetworkError")
        ) {
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
        "top.GLOBALS",
        "ResizeObserver loop limit exceeded",
        "Non-Error promise rejection captured",
        // Common network errors
        "Network request failed",
        "NetworkError",
        "Failed to fetch",
      ],
    });

    sentryInitialized = true;
    console.log("[Sentry] Initialized successfully");
  } catch (error) {
    console.error("[Sentry] Failed to initialize", error);
  }
}

export function isSentryInitialized() {
  return sentryInitialized;
}

export function captureException(error: Error, context?: Record<string, any>) {
  if (!sentryInitialized || !Sentry) return;
  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message: string, level: any = "info") {
  if (!sentryInitialized || !Sentry) return;
  Sentry.captureMessage(message, level);
}

export function setUserContext(user: { id: string; email: string; name?: string }) {
  if (!sentryInitialized || !Sentry) return;
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

export function clearUserContext() {
  if (!sentryInitialized || !Sentry) return;
  Sentry.setUser(null);
}

export function addBreadcrumb(message: string, category: string, data?: any) {
  if (!sentryInitialized || !Sentry) return;
  Sentry.addBreadcrumb({
    message,
    category,
    level: "info",
    data,
    timestamp: Date.now() / 1000,
  });
}

// Helper to get current user from Supabase
function getCurrentUser() {
  try {
    const userStr = localStorage.getItem("supabase.auth.token");
    if (userStr) {
      const userData = JSON.parse(userStr);
      return userData?.currentSession?.user || null;
    }
  } catch {
    return null;
  }
  return null;
}
