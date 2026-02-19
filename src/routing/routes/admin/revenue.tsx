/**
 * Admin Revenue Routes
 * Consolidated INDIGO Fees + IB Management
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const RevenuePage = lazy(() => import("@/features/admin/revenue/pages/RevenuePage"));

export function RevenueRoutes() {
  return (
    <>
      <Route
        path="/admin/revenue"
        element={
          <AdminRoute>
            <RevenuePage />
          </AdminRoute>
        }
      />

      {/* Redirects from old standalone routes */}
      <Route path="/admin/fees" element={<Navigate to="/admin/revenue" replace />} />
      <Route
        path="/admin/ib-management"
        element={<Navigate to="/admin/revenue?tab=ib" replace />}
      />
    </>
  );
}
