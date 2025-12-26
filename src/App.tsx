import { BrowserRouter as Router, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { initPostHog } from "./utils/analytics/posthog";
import "./utils/cleanup/debugCleanup"; // Initialize cleanup on app start
import { SkipLink } from "./components/accessibility/SkipLink";
import { ErrorBoundary } from "./components/error/ErrorBoundary";
import { AuthProvider } from "./lib/auth/context";
import { SecurityProvider } from "./components/security/SecurityProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryClientConfig, setQueryClient } from "./utils/performance/caching";

// UI Components
import { Toaster } from "./components/ui/sonner";
import { CookieConsent } from "./components/privacy/CookieConsent";
import { InstallPrompt as SimpleInstallPrompt } from "./pwa/installPrompt";

// Routing
import { AppRoutes } from "./routing/AppRoutes";
import { useFocusManagement } from "@/hooks";
import { RouteSuspense } from "./routing/RouteSuspense";

// Create a QueryClient instance with optimized config
const queryClient = new QueryClient(queryClientConfig);

// Register the queryClient for cache utilities
setQueryClient(queryClient);

// Main app content with focus management
function AppContent() {
  useFocusManagement();
  const navigate = useNavigate();

  // Handle Supabase recovery links that arrive with tokens in the URL hash
  // Example: https://site/#access_token=...&refresh_token=...&type=recovery
  useEffect(() => {
    const rawHash = window.location.hash || "";
    const hash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
    if (hash && hash.includes("access_token") && hash.includes("type=recovery")) {
      const hashParams = new URLSearchParams(hash);
      const access = hashParams.get("access_token");
      const refresh = hashParams.get("refresh_token");
      if (access && refresh) {
        navigate(
          `/reset-password?access_token=${encodeURIComponent(access)}&refresh_token=${encodeURIComponent(refresh)}`,
          { replace: true }
        );
      }
    }
  }, [navigate]);

  return (
    <>
      <SkipLink />
      <main id="main-content" className="focus:outline-none">
        <RouteSuspense>
          <AppRoutes />
        </RouteSuspense>
      </main>
      <Toaster />
      <CookieConsent />
      <SimpleInstallPrompt />
    </>
  );
}

function App() {
  // Initialize observability tools on app startup
  useEffect(() => {
    // Initialize analytics
    initPostHog();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SecurityProvider>
          <AuthProvider>
            <Router>
              <AppContent />
            </Router>
          </AuthProvider>
        </SecurityProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
