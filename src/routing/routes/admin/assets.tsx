/**
 * Admin Asset Routes
 * Asset management, price tracking, and metadata
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminAssetsPage = lazy(() => import("@/pages/admin/AdminAssetsPage"));

export function AssetRoutes() {
  return (
    <>
      <Route
        path="/admin/assets"
        element={
          <AdminRoute>
            <AdminAssetsPage />
          </AdminRoute>
        }
      />
    </>
  );
}
