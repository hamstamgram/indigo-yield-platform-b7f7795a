/**
 * Admin IB Routes
 * Routes for IB management in admin panel
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const IBManagementPage = lazy(() => import("@/features/admin/ib/pages/IBManagementPage"));
const IBPayoutsPage = lazy(() => import("@/features/admin/ib/pages/IBPayoutsPage"));

export function IBRoutes() {
  return (
    <>
      <Route
        path="/admin/ib-management"
        element={
          <AdminRoute>
            <IBManagementPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/ib-payouts"
        element={
          <AdminRoute>
            <IBPayoutsPage />
          </AdminRoute>
        }
      />
    </>
  );
}
