/**
 * Admin Yield Routes
 * Yield history and yield management
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const YieldHistoryPage = lazy(() => import("@/features/admin/yields/pages/YieldHistoryPage"));

export function YieldsRoutes() {
  return (
    <>
      <Route
        path="/admin/yield-history"
        element={
          <AdminRoute>
            <YieldHistoryPage />
          </AdminRoute>
        }
      />
    </>
  );
}
