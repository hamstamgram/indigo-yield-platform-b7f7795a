/**
 * Reports Routes
 * Portfolio performance, statements, and custom reports
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

// Reports pages
const ReportsPage = lazy(() => import("@/routes/reports/ReportsPage"));
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
