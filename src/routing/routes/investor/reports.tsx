/**
 * Reports Routes
 * Portfolio performance, statements, and custom reports
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

// Reports pages
const ReportsPage = lazy(() => import("@/routes/reports/ReportsPage"));
const PortfolioPerformance = lazy(() => import("@/routes/reports/PortfolioPerformance"));
const MonthlyStatement = lazy(() => import("@/routes/reports/MonthlyStatement"));
const CustomReport = lazy(() => import("@/routes/reports/CustomReport"));

export function ReportsRoutes() {
  return (
    <>
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
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
    </>
  );
}
