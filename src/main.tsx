import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initSentry } from './utils/monitoring/sentry'
import { initPostHog } from './utils/analytics/posthog'
import { registerSW } from './pwa/registerSW'
import { AuthProvider } from './context/AuthContext'

// Initialize monitoring and analytics
initSentry();
initPostHog();

// Register service worker for PWA
registerSW();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
