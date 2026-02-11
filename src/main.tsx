import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Import self-hosted fonts (Inter: UI, Montserrat: display, JetBrains Mono: financial data)
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";

import { initPostHog } from "./utils/analytics/posthog";

// Initialize analytics
initPostHog();

createRoot(document.getElementById("root")!).render(<App />);
// Deployment trigger - 2026-01-28T12:42:00Z
