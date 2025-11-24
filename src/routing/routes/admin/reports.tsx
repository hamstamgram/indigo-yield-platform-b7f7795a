/**
 * Admin Reports Routes
 * All reporting and analytics routes
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const HistoricalReportsDashboard = lazy(
  () => import("@/components/admin/investors/HistoricalReportsDashboard")
);

// Removed missing routes: AdminReports, AdminBatchReportsPage, PDFGenerationDemo (Assuming it's also gone or not needed)

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
