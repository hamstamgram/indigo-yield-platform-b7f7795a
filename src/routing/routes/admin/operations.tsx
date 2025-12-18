/**
 * Admin Operations Routes
 * Yield operations and reporting
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const YieldOperationsPage = lazy(() => import("@/routes/admin/YieldOperationsPage"));
const InvestorReports = lazy(() => import("@/routes/admin/InvestorReports"));
const DailyRatesManagement = lazy(() => import("@/routes/admin/DailyRatesManagement"));

export function OperationsRoutes() {
  return (
    <>
      {/* Main yield operations page */}
      <Route
        path="/admin/yield"
        element={
          <AdminRoute>
            <YieldOperationsPage />
          </AdminRoute>
        }
      />

      {/* Reports */}
      <Route
        path="/admin/investor-reports"
        element={
          <AdminRoute>
            <InvestorReports />
          </AdminRoute>
        }
      />

      {/* Daily rates (kept for now) */}
      <Route
        path="/admin/daily-rates"
        element={
          <AdminRoute>
            <DailyRatesManagement />
          </AdminRoute>
        }
      />

      {/* Redirects for consolidated pages */}
      <Route path="/admin/monthly-data-entry" element={<Navigate to="/admin/yield" replace />} />
      <Route path="/admin/operations" element={<Navigate to="/admin/yield" replace />} />
      <Route path="/admin/funds" element={<Navigate to="/admin/yield" replace />} />
      <Route path="/admin/yield-settings" element={<Navigate to="/admin/yield" replace />} />
      <Route path="/admin/requests" element={<Navigate to="/admin/withdrawals" replace />} />
      <Route path="/admin/statements" element={<Navigate to="/admin/investor-reports" replace />} />
      <Route path="/admin/email-tracking" element={<Navigate to="/admin/investor-reports" replace />} />
    </>
  );
}
