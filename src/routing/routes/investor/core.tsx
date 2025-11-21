/**
 * Core Investor Routes
 * Dashboard, statements, transactions, and account management
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

// Core pages
const Dashboard = lazy(() => import("@/pages/investor/dashboard/Dashboard"));
const StatementsPage = lazy(() => import("@/pages/investor/statements/StatementsPage"));
const TransactionsPage = lazy(() => import("@/pages/investor/portfolio/TransactionsPage"));
const AssetDetail = lazy(() => import("@/pages/AssetDetail"));
const AccountPage = lazy(() => import("@/pages/investor/account/AccountPage"));
const SettingsPage = lazy(() => import("@/pages/investor/account/SettingsPage"));
const ActivityPage = lazy(() => import("@/pages/activity/ActivityPage"));

export function CoreInvestorRoutes() {
  return (
    <>
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <ProtectedRoute>
            <ActivityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/statements"
        element={
          <ProtectedRoute>
            <StatementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <TransactionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/:symbol"
        element={
          <ProtectedRoute>
            <AssetDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
    </>
  );
}
