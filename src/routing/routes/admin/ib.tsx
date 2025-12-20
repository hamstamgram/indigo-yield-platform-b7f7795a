/**
 * Admin IB Routes
 * Routes for IB management in admin panel
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const IBManagementPage = lazy(() => import("@/routes/admin/ib/IBManagementPage"));

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
    </>
  );
}
