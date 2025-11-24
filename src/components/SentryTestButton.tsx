import { Button } from "@/components/ui/button";
import { AlertTriangle, Bug, Info, Activity } from "lucide-react";
import { useState } from "react";

/**
 * Sentry Test Component
 * Use this to verify Sentry error tracking is working correctly
 */
export function SentryTestButton() {
  const [testStatus, setTestStatus] = useState<string>("");

  // Check if Sentry is available (optional dependency)
  const hasSentry = false; // Sentry is optional - install @sentry/react to enable

  if (!hasSentry) {
    return (
      <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Sentry Not Available
        </h3>
        <p className="text-sm text-muted-foreground">
          Install @sentry/react to enable error tracking features.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Bug className="h-5 w-5" />
        Sentry Error Tracking Test
      </h3>
      <p className="text-sm text-muted-foreground">
        Sentry is not configured. Install @sentry/react package to enable.
      </p>
    </div>
  );
}

// Fallback error boundary
export const SentryErrorBoundary = ({ children }: any) => children;
