/**
 * Admin Deposit Routes
 * Deposit tracking, approval, and management
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminDepositsPage = lazy(() => import("@/routes/admin/AdminDepositsPage"));

export function DepositRoutes() {
  return (
    <>
      <Route
        path="/admin/deposits"
        element={
          <AdminRoute>
            <AdminDepositsPage />
          </AdminRoute>
        }
      />
    </>
  );
}
