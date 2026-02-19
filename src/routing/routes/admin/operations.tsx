/**
 * Admin Operations Routes
 * Yield history, fund management, and reporting
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const YieldHistoryPage = lazy(() => import("@/features/admin/yields/pages/YieldHistoryPage"));
const InvestorReports = lazy(() => import("@/features/admin/reports/pages/InvestorReports"));
const FundManagementPage = lazy(() => import("@/features/admin/funds/pages/FundManagementPage"));

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

      {/* Fund Management */}
      <Route
        path="/admin/funds"
        element={
          <AdminRoute>
            <FundManagementPage />
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

      {/* Redirects - all old yield routes point to yield-history */}
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
      <Route path="/admin/requests" element={<Navigate to="/admin/withdrawals" replace />} />
      <Route path="/admin/statements" element={<Navigate to="/admin/investor-reports" replace />} />
      <Route
        path="/admin/email-tracking"
        element={<Navigate to="/admin/investor-reports" replace />}
      />
    </>
  );
}
