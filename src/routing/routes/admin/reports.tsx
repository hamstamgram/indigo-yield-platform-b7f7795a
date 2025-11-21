/**
 * Admin Reports Routes
 * All reporting and analytics routes
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminReports = lazy(() => import("@/pages/admin/AdminReports"));
const HistoricalReportsDashboard = lazy(
  () => import("@/components/admin/investors/HistoricalReportsDashboard")
);
const AdminBatchReportsPage = lazy(() => import("@/pages/admin/AdminBatchReportsPage"));
const PDFGenerationDemo = lazy(() =>
  import("@/components/pdf/PDFGenerationDemo").then((m) => ({ default: m.PDFGenerationDemo }))
);

export function ReportsRoutes() {
  return (
    <>
      <Route
        path="/admin/reports"
        element={
          <AdminRoute>
            <AdminReports />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/reports/historical"
        element={
          <AdminRoute>
            <HistoricalReportsDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/batch-reports"
        element={
          <AdminRoute>
            <AdminBatchReportsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/pdf-demo"
        element={
          <AdminRoute>
            <PDFGenerationDemo />
          </AdminRoute>
        }
      />
    </>
  );
}
