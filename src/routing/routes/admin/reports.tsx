/**
 * Admin Reports Routes
 * All reporting and analytics routes
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const HistoricalReportsDashboard = lazy(
  () => import("@/features/admin/investors/components/reports/HistoricalReportsDashboard")
);

export function ReportsRoutes() {
  return (
    <>
      <Route
        path="/admin/reports/historical"
        element={
          <AdminRoute>
            <HistoricalReportsDashboard />
          </AdminRoute>
        }
      />
    </>
  );
}
