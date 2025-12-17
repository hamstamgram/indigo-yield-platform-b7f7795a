/**
 * Admin Core Routes
 * Main dashboard and portfolio overview
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminDashboard = lazy(() => import("@/routes/admin/AdminDashboard"));
const AdminTransactionsPage = lazy(
  () => import("@/routes/admin/transactions/AdminTransactionsPage")
);

export function CoreAdminRoutes() {
  return (
    <>
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/transactions"
        element={
          <AdminRoute>
            <AdminTransactionsPage />
          </AdminRoute>
        }
      />
      {/* Redirect old monthly reports route to unified investor reports page */}
      <Route path="/admin/reports/monthly" element={<Navigate to="/admin/investor-reports" replace />} />
      <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
      {/* Redirect old fund routes to monthly data entry */}
      <Route path="/admin/funds/:assetId" element={<Navigate to="/admin/monthly-data-entry" replace />} />
      <Route path="/admin/fund-operations" element={<Navigate to="/admin/monthly-data-entry" replace />} />
    </>
  );
}
