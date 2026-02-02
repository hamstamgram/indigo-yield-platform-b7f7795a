/**
 * Admin Investor Routes
 * Unified investor management with slide-out drawer
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const UnifiedInvestorsPage = lazy(
  () => import("@/features/admin/investors/pages/UnifiedInvestorsPage")
);
const InvestorManagement = lazy(
  () => import("@/features/admin/investors/pages/InvestorManagement")
);

export function InvestorRoutes() {
  return (
    <>
      {/* Main unified investors page */}
      <Route
        path="/admin/investors"
        element={
          <AdminRoute>
            <UnifiedInvestorsPage />
          </AdminRoute>
        }
      />

      {/* Individual investor profile (still accessible via drawer link) */}
      <Route
        path="/admin/investors/:id"
        element={
          <AdminRoute>
            <InvestorManagement />
          </AdminRoute>
        }
      />

      {/* Redirects for old routes */}
      <Route path="/admin/investors/new" element={<Navigate to="/admin/investors" replace />} />
      <Route
        path="/admin/investors/:id/edit"
        element={<Navigate to="/admin/investors/:id" replace />}
      />
      <Route
        path="/admin/expert-investor/:id"
        element={<Navigate to="/admin/investors/:id" replace />}
      />
    </>
  );
}
