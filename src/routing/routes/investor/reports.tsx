/**
 * Reports Routes
 * Portfolio performance, statements, and custom reports
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

// Reports pages
const ReportsDashboard = lazy(() => import("@/pages/reports/ReportsDashboard"));
const PortfolioPerformance = lazy(() => import("@/pages/reports/PortfolioPerformance"));
const MonthlyStatement = lazy(() => import("@/pages/reports/MonthlyStatement"));
const CustomReport = lazy(() => import("@/pages/reports/CustomReport"));
const ReportHistory = lazy(() => import("@/pages/reports/ReportHistory"));

export function ReportsRoutes() {
  return (
    <>
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/portfolio-performance"
        element={
          <ProtectedRoute>
            <PortfolioPerformance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/monthly-statement"
        element={
          <ProtectedRoute>
            <MonthlyStatement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/custom"
        element={
          <ProtectedRoute>
            <CustomReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/history"
        element={
          <ProtectedRoute>
            <ReportHistory />
          </ProtectedRoute>
        }
      />
    </>
  );
}
