/**
 * Admin Fee Routes
 * Fee calculation, structure management, and tracking
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminFeesPage = lazy(() => import("@/pages/admin/AdminFeesPage"));

export function FeeRoutes() {
  return (
    <>
      <Route
        path="/admin/fees"
        element={
          <AdminRoute>
            <AdminFeesPage />
          </AdminRoute>
        }
      />
    </>
  );
}
