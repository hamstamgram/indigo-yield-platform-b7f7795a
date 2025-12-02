/**
 * Admin Investor Routes
 * All investor management and tracking routes
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminInvestorsPage = lazy(() => import("@/routes/admin/investors/InvestorsListPage"));
const InvestorManagement = lazy(() => import("@/routes/admin/investors/InvestorManagement"));
const AdminOnboardingPage = lazy(() => import("@/routes/admin/AdminOnboardingPage"));
const ExpertInvestorDashboard = lazy(
  () => import("@/components/admin/expert/ExpertInvestorDashboard")
);

export function InvestorRoutes() {
  return (
    <>
      <Route
        path="/admin/investors"
        element={
          <AdminRoute>
            <AdminInvestorsPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/investors/:id"
        element={
          <AdminRoute>
            <InvestorManagement />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/onboarding"
        element={
          <AdminRoute>
            <AdminOnboardingPage />
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
