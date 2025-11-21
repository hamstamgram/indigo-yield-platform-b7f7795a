import React, { Suspense } from "react";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import {
  RouteLoading,
  DashboardLoading,
  PortfolioLoading,
  AdminLoading,
} from "@/components/ui/loading-states";

interface RouteSuspenseProps {
  children: React.ReactNode;
  type?: "default" | "dashboard" | "portfolio" | "admin";
}

export function RouteSuspense({ children, type = "default" }: RouteSuspenseProps) {
  const getLoadingComponent = () => {
    switch (type) {
      case "dashboard":
        return <DashboardLoading />;
      case "portfolio":
        return <PortfolioLoading />;
      case "admin":
        return <AdminLoading />;
      default:
        return <RouteLoading />;
    }
  };

  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-destructive mb-2">Failed to load page</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Please try refreshing the page or contact support if the issue persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
    >
      <Suspense fallback={getLoadingComponent()}>{children}</Suspense>
    </ErrorBoundary>
  );
}
