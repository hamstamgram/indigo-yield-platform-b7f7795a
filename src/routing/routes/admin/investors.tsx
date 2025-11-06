/**
 * Admin Investor Routes
 * All investor management and tracking routes
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const InvestorManagementView = lazy(() => import("@/components/admin/InvestorManagementView"));
const AdminInvestorManagement = lazy(() => import("@/pages/admin/AdminInvestorManagement"));
const AdminInvestorDetailNew = lazy(() => import("@/pages/admin/AdminInvestorDetail"));
const AdminInvestorNewPage = lazy(() => import("@/pages/admin/investors/AdminInvestorNewPage"));
const AdminInvestorDetailPage = lazy(() => import("@/pages/admin/investors/AdminInvestorDetailPage"));
const AdminInvestorPositionsPage = lazy(() => import("@/pages/admin/investors/AdminInvestorPositionsPage"));
const AdminInvestorTransactionsPage = lazy(() => import("@/pages/admin/investors/AdminInvestorTransactionsPage"));
const ExpertInvestorMasterView = lazy(() => import("@/pages/admin/ExpertInvestorMasterView"));
const ExpertInvestorDashboard = lazy(() => import("@/components/admin/expert/ExpertInvestorDashboard"));
const InvestorAccountCreation = lazy(() =>
  import("@/pages/admin/InvestorAccountCreation").then((m) => ({
    default: m.InvestorAccountCreation,
  }))
);
const InvestorStatusTracking = lazy(() =>
  import("@/pages/admin/InvestorStatusTracking").then((m) => ({
    default: m.InvestorStatusTracking,
  }))
);

export function InvestorRoutes() {
  return (
    <>
      {/* New investor management */}
      <Route
        path="/admin/investors-management"
        element={
          <AdminRoute>
            <AdminInvestorManagement />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/investor/:id"
        element={
          <AdminRoute>
            <AdminInvestorDetailNew />
          </AdminRoute>
        }
      />

      {/* Main investor routes */}
      <Route
        path="/admin/investors"
        element={
          <AdminRoute>
            <InvestorManagementView />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/investors/new"
        element={
          <AdminRoute>
            <AdminInvestorNewPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/investors/create"
        element={
          <AdminRoute>
            <InvestorAccountCreation />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/investors/status"
        element={
          <AdminRoute>
            <InvestorStatusTracking />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/investors/:id"
        element={
          <AdminRoute>
            <AdminInvestorDetailPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/investors/:id/positions"
        element={
          <AdminRoute>
            <AdminInvestorPositionsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/investors/:id/transactions"
        element={
          <AdminRoute>
            <AdminInvestorTransactionsPage />
          </AdminRoute>
        }
      />

      {/* Expert investors */}
      <Route
        path="/admin/expert-investors"
        element={
          <AdminRoute>
            <ExpertInvestorMasterView />
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
