/**
 * INDIGO Fees Routes Module
 * Admin INDIGO Fees management and audit trail
 */

import { lazy } from "react";
import { Route } from "react-router-dom";
import { AdminRoute } from "../../AdminRoute";

const FeesOverviewPage = lazy(() => import("@/routes/admin/FeesOverviewPage"));

export function FeesRoutes() {
  return (
    <>
      <Route
        path="/admin/fees"
        element={
          <AdminRoute>
            <FeesOverviewPage />
          </AdminRoute>
        }
      />
    </>
  );
}
