/**
 * Admin Core Routes
 * Main dashboard and portfolio overview
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminDashboard = lazy(() => import("@/features/admin/dashboard/pages/AdminDashboard"));

export function CoreAdminRoutes() {
  return (
    <Route
      path="/admin"
      element={
        <AdminRoute>
          <AdminDashboard />
        </AdminRoute>
      }
    />
  );
}
