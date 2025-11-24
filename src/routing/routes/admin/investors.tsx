/**
 * Admin Investor Routes
 * All investor management and tracking routes
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const InvestorManagement = lazy(() => import("@/routes/admin/investors/InvestorManagement"));
const ExpertInvestorDashboard = lazy(
  () => import("@/components/admin/expert/ExpertInvestorDashboard")
);

// Placeholder for missing pages if needed, or just remove
// const InvestorAccountCreation = ... (Missing)
// const InvestorStatusTracking = ... (Missing)

export function InvestorRoutes() {
  return (
    <>
      <Route
        path="/admin/investors/:id"
        element={
          <AdminRoute>
            <InvestorManagement />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/expert-investor/:id"
        element={
          <AdminRoute>
            <ExpertInvestorDashboard />
          </AdminRoute>
        }
      />

      {/* Legacy redirect */}
      <Route path="/admin-investors" element={<Navigate to="/admin/investors" replace />} />
    </>
  );
}
