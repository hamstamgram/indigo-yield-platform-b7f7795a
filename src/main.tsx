import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Import self-hosted fonts
import "@fontsource/montserrat/400.css"; // Regular
import "@fontsource/montserrat/500.css"; // Medium
import "@fontsource/montserrat/600.css"; // Semi-bold
import "@fontsource/montserrat/700.css"; // Bold

import { initPostHog } from "./utils/analytics/posthog";
import { registerSW } from "./pwa/registerSW";

// Initialize analytics
initPostHog();

// Register service worker for PWA
registerSW();

createRoot(document.getElementById("root")!).render(<App />);
// Deployment trigger - 2026-01-28T12:35:00Z
