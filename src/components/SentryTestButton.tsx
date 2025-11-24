import { Bug } from "lucide-react";

/**
 * Sentry Test Component
 * Use this to verify Sentry error tracking is working correctly
 */
export function SentryTestButton() {
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

// Fallback error boundary
export const SentryErrorBoundary = ({ children }: any) => children;
