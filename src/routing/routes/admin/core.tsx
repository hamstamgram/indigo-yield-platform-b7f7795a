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
const MonthlyReportsPage = lazy(() => import("@/routes/admin/reports/MonthlyReportsPage"));

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
      <Route
        path="/admin/reports/monthly"
        element={
          <AdminRoute>
            <MonthlyReportsPage />
          </AdminRoute>
        }
      />
      <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
    </>
  );
}
