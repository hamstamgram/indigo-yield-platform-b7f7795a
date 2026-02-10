/**
 * Admin Operations Routes
 * Yield operations and reporting
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const YieldOperationsPage = lazy(() => import("@/features/admin/yields/pages/YieldOperationsPage"));
const InvestorReports = lazy(() => import("@/features/admin/reports/pages/InvestorReports"));
const RecordedYieldsPage = lazy(() => import("@/features/admin/yields/pages/RecordedYieldsPage"));
const YieldDistributionsPage = lazy(
  () => import("@/features/admin/yields/pages/YieldDistributionsPage")
);
const FundManagementPage = lazy(() => import("@/features/admin/funds/pages/FundManagementPage"));

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

      {/* Fund Management */}
      <Route
        path="/admin/funds"
        element={
          <AdminRoute>
            <FundManagementPage />
          </AdminRoute>
        }
      />

      {/* Recorded Yields - view/edit all yield entries */}
      <Route
        path="/admin/recorded-yields"
        element={
          <AdminRoute>
            <RecordedYieldsPage />
          </AdminRoute>
        }
      />

      {/* Yield Distributions - investor allocations by distribution */}
      <Route
        path="/admin/yield-distributions"
        element={
          <AdminRoute>
            <YieldDistributionsPage />
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

      {/* Redirects for consolidated pages */}
      <Route path="/admin/monthly-data-entry" element={<Navigate to="/admin/yield" replace />} />
      {/* /admin/operations now handled by SystemRoutes */}
      <Route path="/admin/yield-settings" element={<Navigate to="/admin/yield" replace />} />
      <Route path="/admin/yields" element={<Navigate to="/admin/yield" replace />} />
      <Route path="/admin/yield-operations" element={<Navigate to="/admin/yield" replace />} />
      <Route path="/admin/requests" element={<Navigate to="/admin/withdrawals" replace />} />
      <Route path="/admin/statements" element={<Navigate to="/admin/investor-reports" replace />} />
      <Route
        path="/admin/email-tracking"
        element={<Navigate to="/admin/investor-reports" replace />}
      />
    </>
  );
}
