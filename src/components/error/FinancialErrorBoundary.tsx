/**
 * FinancialErrorBoundary - Error boundary for financial/ledger operations
 * Activates "Safe Mode" when financial calculation errors are detected
 * Logs critical errors to system_health_logs table
 */

import { Component, ErrorInfo, ReactNode } from "react";
import { ShieldOff, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { db } from "@/lib/db/index";

interface FinancialErrorBoundaryProps {
  children: ReactNode;
  /** Context identifier for logging */
  context: "admin" | "investor";
  /** Optional fallback UI for non-financial errors */
  fallback?: ReactNode;
}

interface FinancialErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isSafeMode: boolean;
  isUIError: boolean;
  errorId: string | null;
}

// Keywords that indicate a UI/React error (NOT financial errors)
// These should NOT trigger Safe Mode
const UI_ERROR_KEYWORDS = [
  "Tooltip",
  "TooltipProvider",
  "Provider",
  "Context",
  "useContext",
  "undefined is not an object",
  "Cannot read property",
  "Cannot read properties",
  "is not a function",
  "Hydration",
  "Minified React error",
];

// Keywords that indicate a financial/ledger error
const FINANCIAL_ERROR_KEYWORDS = [
  "ledger",
  "balance",
  "yield",
  "transaction",
  "position",
  "aum",
  "distribution",
  "fee",
  "withdrawal",
  "conservation",
  "numeric",
  "decimal",
  "NaN",
  "Infinity",
];

export class FinancialErrorBoundary extends Component<
  FinancialErrorBoundaryProps,
  FinancialErrorBoundaryState
> {
  constructor(props: FinancialErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isSafeMode: false,
      isUIError: false,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<FinancialErrorBoundaryState> {
    const errorMessage = error.message || "";
    const errorStack = error.stack || "";

    // Check if error is a UI/React error first (these should NOT trigger Safe Mode)
    const isUIError = UI_ERROR_KEYWORDS.some(
      (keyword) => errorMessage.includes(keyword) || errorStack.includes(keyword)
    );

    // If it's a UI error, don't activate Safe Mode
    if (isUIError) {
      const errorId = Date.now().toString(36).toUpperCase();
      return {
        hasError: true,
        error,
        isSafeMode: false,
        isUIError: true,
        errorId,
      };
    }

    // Check if error is financial/ledger related
    const errorMessageLower = errorMessage.toLowerCase();
    const errorStackLower = errorStack.toLowerCase();

    const isFinancialError = FINANCIAL_ERROR_KEYWORDS.some(
      (keyword) =>
        errorMessageLower.includes(keyword.toLowerCase()) ||
        errorStackLower.includes(keyword.toLowerCase())
    );

    const errorId = Date.now().toString(36).toUpperCase();

    return {
      hasError: true,
      error,
      isSafeMode: isFinancialError,
      isUIError: false,
      errorId,
    };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { context } = this.props;
    const { isSafeMode, isUIError, errorId } = this.state;

    // Log to audit_log (system_health_logs is not in types yet)
    try {
      const { error: auditError } = await db.insert("audit_log", {
        action: "financial_error",
        entity: `${context}_dashboard`,
        entity_id: errorId,
        meta: {
          error_id: errorId,
          level: isSafeMode ? "critical" : isUIError ? "warning" : "error",
          message: error.message,
          stack: error.stack?.slice(0, 2000),
          safe_mode_activated: isSafeMode,
          is_ui_error: isUIError,
          timestamp: new Date().toISOString(),
        },
      } as any);

      if (auditError) {
        logError(
          "FinancialErrorBoundary.auditLogWrite",
          new Error(auditError.userMessage || auditError.message)
        );
      }
    } catch (logErr) {
      // Silently fail - don't let logging errors cascade
      logError("FinancialErrorBoundary.auditLogWrite", logErr);
    }

    // Log the original error via structured logger
    logError("FinancialErrorBoundary", error, {
      context,
      isSafeMode,
      isUIError,
      errorId,
      componentStack: errorInfo.componentStack?.slice(0, 500),
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      isSafeMode: false,
      isUIError: false,
      errorId: null,
    });
  };

  render() {
    const { children, fallback } = this.props;
    const { hasError, error, isSafeMode, isUIError, errorId } = this.state;

    // UI Error: Show a recoverable error screen (NOT Safe Mode)
    if (isUIError && hasError) {
      return (
        <div className="min-h-[300px] flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-lg text-amber-700 dark:text-amber-400">
                Display Error
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                A UI component failed to render. This is not a financial error and your data is
                safe.
              </p>

              {error && (
                <div className="bg-muted/50 rounded-md p-3 text-left">
                  <p className="text-xs text-muted-foreground mb-1">Error Details</p>
                  <p className="text-xs text-foreground break-words font-mono">
                    {error.message.slice(0, 150)}
                    {error.message.length > 150 && "..."}
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button onClick={this.handleRetry} variant="outline">
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="primary">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Error ID: <code className="font-mono">{errorId}</code>
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Safe Mode: Critical financial error - block all transactions
    if (isSafeMode) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="max-w-lg w-full border-destructive/50 bg-destructive/5">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldOff className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl text-destructive">Safe Mode Activated</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                A financial calculation error was detected. Transactions are temporarily disabled to
                protect data integrity.
              </p>

              <div className="bg-muted/50 rounded-md p-3 text-left">
                <p className="text-xs text-muted-foreground mb-1">Error ID</p>
                <code className="text-sm font-mono text-foreground">{errorId}</code>
              </div>

              {error && (
                <div className="bg-muted/50 rounded-md p-3 text-left">
                  <p className="text-xs text-muted-foreground mb-1">Details</p>
                  <p className="text-sm text-foreground break-words">
                    {error.message.slice(0, 200)}
                    {error.message.length > 200 && "..."}
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-center pt-2">
                <Button onClick={this.handleReload} variant="primary">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Application
                </Button>
              </div>

              <p className="text-xs text-muted-foreground pt-2">
                If this issue persists, please contact support with the Error ID above.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Non-financial error: Show standard fallback or custom fallback
    if (hasError) {
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <div className="min-h-[300px] flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-lg">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. You can try again or reload the page.
              </p>

              <div className="flex gap-3 justify-center">
                <Button onClick={this.handleRetry} variant="outline">
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="primary">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

export default FinancialErrorBoundary;
