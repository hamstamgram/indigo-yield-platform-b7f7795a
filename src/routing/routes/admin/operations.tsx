/**
 * Admin Operations Routes
 * Yield history, fund management, and reporting
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const YieldHistoryPage = lazy(() => import("@/features/admin/yields/pages/YieldHistoryPage"));
const ReportsConsolidatedPage = lazy(
  () => import("@/features/admin/reports/pages/ReportsConsolidatedPage")
);

export function OperationsRoutes() {
  return (
    <>
      {/* Yield History - merged Recorded Yields + Yield Distributions */}
      <Route
        path="/admin/yield-history"
        element={
          <AdminRoute>
            <YieldHistoryPage />
          </AdminRoute>
        }
      />

      {/* Redirects - deprecated route: Consolidated to Command Center */}
      <Route path="/admin/funds" element={<Navigate to="/admin" replace />} />

      {/* Consolidated Reports page */}
      <Route
        path="/admin/reports"
        element={
          <AdminRoute>
            <ReportsConsolidatedPage />
          </AdminRoute>
        }
      />

      {/* Redirects - old yield routes */}
      <Route path="/admin/yield" element={<Navigate to="/admin/yield-history" replace />} />
      <Route
        path="/admin/yield-distributions"
        element={<Navigate to="/admin/yield-history" replace />}
      />
      <Route
        path="/admin/recorded-yields"
        element={<Navigate to="/admin/yield-history" replace />}
      />
      <Route
        path="/admin/monthly-data-entry"
        element={<Navigate to="/admin/yield-history" replace />}
      />
      <Route
        path="/admin/yield-settings"
        element={<Navigate to="/admin/yield-history" replace />}
      />
      <Route path="/admin/yields" element={<Navigate to="/admin/yield-history" replace />} />
      <Route
        path="/admin/yield-operations"
        element={<Navigate to="/admin/yield-history" replace />}
      />

      {/* Redirects - old report/withdrawal routes */}
      <Route
        path="/admin/requests"
        element={<Navigate to="/admin/ledger?tab=withdrawals" replace />}
      />
      <Route path="/admin/investor-reports" element={<Navigate to="/admin/reports" replace />} />
      <Route path="/admin/statements" element={<Navigate to="/admin/reports" replace />} />
      <Route path="/admin/email-tracking" element={<Navigate to="/admin/reports" replace />} />
    </>
  );
}
