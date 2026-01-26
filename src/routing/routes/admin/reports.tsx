/**
 * Admin Reports Routes
 * All reporting and analytics routes
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const HistoricalReportsDashboard = lazy(
  () => import("@/components/admin/investors/reports/HistoricalReportsDashboard")
);

const ReportDeliveryCenter = lazy(
  () => import("@/components/admin/reports/ReportDeliveryCenter")
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
      <Route
        path="/admin/reports/delivery"
        element={
          <AdminRoute>
            <ReportDeliveryCenter />
          </AdminRoute>
        }
      />
    </>
  );
}
