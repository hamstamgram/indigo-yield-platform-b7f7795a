/**
 * QueryErrorBoundary Component
 * Wraps critical components with React Query error boundary for automatic retry capability
 * Created: 2026-01-13
 *
 * Usage:
 * <QueryErrorBoundary>
 *   <YourComponent />
 * </QueryErrorBoundary>
 */

import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface QueryErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

/**
 * Error fallback component displayed when a query fails
 */
function QueryErrorFallback({ error, resetErrorBoundary }: QueryErrorFallbackProps) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Data Loading Error
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {error.message || "An error occurred while loading data."}
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
            {error.stack}
          </pre>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" onClick={resetErrorBoundary} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </CardFooter>
    </Card>
  );
}

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
  /** Custom fallback component */
  fallback?: React.ComponentType<QueryErrorFallbackProps>;
  /** Called when error occurs */
  onError?: (error: Error) => void;
  /** Called when reset is triggered */
  onReset?: () => void;
}

/**
 * QueryErrorBoundary - Wraps components with React Query error recovery
 *
 * This boundary will:
 * 1. Catch errors from failed React Query operations
 * 2. Display a user-friendly error message
 * 3. Provide a "Try Again" button that resets the query cache and retries
 * 4. Log errors in development mode
 */
export function QueryErrorBoundary({
  children,
  fallback: CustomFallback,
  onError,
  onReset,
}: QueryErrorBoundaryProps) {
  const FallbackComponent = CustomFallback || QueryErrorFallback;

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={() => {
            reset();
            onReset?.();
          }}
          onError={(error) => {
            console.error("[QueryErrorBoundary] Error caught:", error);
            onError?.(error);
          }}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <FallbackComponent error={error} resetErrorBoundary={resetErrorBoundary} />
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

/**
 * Compact error fallback for inline/small components
 */
function CompactErrorFallback({ error, resetErrorBoundary }: QueryErrorFallbackProps) {
  return (
    <div className="flex items-center gap-2 p-2 text-sm text-destructive bg-destructive/5 rounded">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{error.message || "Error loading data"}</span>
      <Button variant="ghost" size="sm" onClick={resetErrorBoundary} className="ml-auto h-7 px-2">
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );
}

/**
 * Compact version for inline components
 */
export function QueryErrorBoundaryCompact({
  children,
  onError,
  onReset,
}: Omit<QueryErrorBoundaryProps, "fallback">) {
  return (
    <QueryErrorBoundary fallback={CompactErrorFallback} onError={onError} onReset={onReset}>
      {children}
    </QueryErrorBoundary>
  );
}

export default QueryErrorBoundary;
