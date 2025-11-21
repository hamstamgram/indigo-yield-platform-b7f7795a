/**
 * Admin Core Routes
 * Main dashboard and portfolio overview
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const PortfolioDashboard = lazy(() => import("@/pages/admin/PortfolioDashboard"));
const AdminTransactionsPage = lazy(
  () => import("@/pages/admin/transactions/AdminTransactionsPage")
);
const MonthlyReportsPage = lazy(
  () => import("@/pages/admin/reports/MonthlyReportsPage")
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
        path="/admin/portfolio"
        element={
          <AdminRoute>
            <PortfolioDashboard />
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
