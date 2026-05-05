/**
 * Admin Reports Routes
 * Consolidated reports page and historical redirects
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const ReportsConsolidatedPage = lazy(() => import("@/features/admin/reports/pages/ReportsConsolidatedPage"));

export function ReportsRoutes() {
  return (
    <>
      <Route
        path="/admin/reports"
        element={
          <AdminRoute>
            <ReportsConsolidatedPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/reports/historical"
        element={<Navigate to="/admin/reports?tab=historical" replace />}
      />
    </>
  );
}
