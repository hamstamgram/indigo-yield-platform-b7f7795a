import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initSentry } from './utils/monitoring/sentry'
import { initPostHog } from './utils/analytics/posthog'

// Initialize monitoring and analytics
initSentry();
initPostHog();

createRoot(document.getElementById("root")!).render(<App />);
