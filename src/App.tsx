
import { BrowserRouter as Router, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import './index.css';
import { initSentry } from './utils/monitoring/sentry';
import { initPostHog } from './utils/analytics/posthog';
import './utils/cleanup/debugCleanup'; // Initialize cleanup on app start
import { SkipLink } from './components/accessibility/SkipLink';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';

// UI Components
import { Toaster } from './components/ui/sonner';
import { CookieConsent } from './components/privacy/CookieConsent';
import { InstallPrompt as SimpleInstallPrompt } from './pwa/installPrompt';

// Routing
import { AppRoutes } from './routing/AppRoutes';
import { useFocusManagement } from './hooks/useFocusManagement';
import { RouteSuspense } from './routing/RouteSuspense';

// This hook has been moved to src/hooks/useFocusManagement.ts

// Main app content with focus management
function AppContent() {
  useFocusManagement();
  const navigate = useNavigate();
  
  // Handle Supabase recovery links that arrive with tokens in the URL hash
  // Example: https://site/#access_token=...&refresh_token=...&type=recovery
  useEffect(() => {
    const rawHash = window.location.hash || '';
    const hash = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
    if (hash && hash.includes('access_token') && hash.includes('type=recovery')) {
      const hashParams = new URLSearchParams(hash);
      const access = hashParams.get('access_token');
      const refresh = hashParams.get('refresh_token');
      if (access && refresh) {
        navigate(`/reset-password?access_token=${encodeURIComponent(access)}&refresh_token=${encodeURIComponent(refresh)}`, { replace: true });
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
    // Initialize error tracking
    initSentry();
    
    // Initialize analytics
    initPostHog();
    
    
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
