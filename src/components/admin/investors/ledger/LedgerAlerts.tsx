/**
 * Ledger Alerts Component
 * Status alerts for filters, empty states, and errors
 */

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Badge,
  Skeleton,
  Card,
  CardContent,
} from "@/components/ui";
import { Filter, X, RefreshCw, AlertCircle, BookOpen } from "lucide-react";

interface LedgerAlertsProps {
  loading: boolean;
  error: Error | null;
  transactionCount: number;
  totalCount: number;
  hiddenCount: number;
  showVoided: boolean;
  hasActiveFilters: boolean;
  onClearAndRefresh: () => void;
  onRetry: () => void;
  onClearFilters: () => void;
}

export function LedgerAlerts({
  loading,
  error,
  transactionCount,
  totalCount,
  hiddenCount,
  showVoided,
  hasActiveFilters,
  onClearAndRefresh,
  onRetry,
  onClearFilters,
}: LedgerAlertsProps) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  // Error alert
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Query Error</AlertTitle>
        <AlertDescription>
          {error.message}
          <Button variant="link" onClick={onRetry} className="ml-2 h-auto p-0">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {/* Filter Impact Banner */}
      {hiddenCount > 0 && (
        <Alert
          variant="default"
          className="bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/50">
              <Filter className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <AlertTitle className="text-amber-800 dark:text-amber-300 font-semibold">
                Filters Active — {hiddenCount} transaction{hiddenCount !== 1 ? "s" : ""} hidden
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm mt-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>
                      Showing {transactionCount} of {totalCount}.
                    </span>
                    {!showVoided && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300"
                      >
                        Voided hidden
                      </Badge>
                    )}
                    {hasActiveFilters && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300"
                      >
                        Filters applied
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearAndRefresh}
                    className="h-7 text-xs border-amber-400 dark:border-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All & Show Everything
                  </Button>
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* Empty with filters */}
      {transactionCount === 0 && hasActiveFilters && hiddenCount === 0 && (
        <Alert
          variant="default"
          className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
        >
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-400">
            No matching transactions
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
            <div className="flex items-center gap-2">
              <span>Current filters may be excluding transactions.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAndRefresh}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Clear & Refresh
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Empty state (no transactions at all) */}
      {transactionCount === 0 && !hasActiveFilters && hiddenCount === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No transactions found</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

/**
 * Empty state component for when there are no transactions
 */
export function LedgerEmptyState({
  hasActiveFilters,
  onClearFilters,
}: {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No transactions found</p>
        {hasActiveFilters && (
          <Button variant="link" onClick={onClearFilters} className="mt-2">
            Clear filters to see all transactions
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
