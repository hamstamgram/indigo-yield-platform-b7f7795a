/**
 * Core Investor Routes
 * Dashboard, statements, transactions, and account management
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

// Core pages
const Dashboard = lazy(() => import("@/routes/dashboard/DashboardPage"));
const StatementsPage = lazy(() => import("@/routes/investor/statements/StatementsPage"));
const TransactionsPage = lazy(() => import("@/routes/transactions/TransactionsPage"));
const TransactionDetailsPage = lazy(() => import("@/routes/transactions/TransactionDetailsPage"));
const PendingTransactionsPage = lazy(() => import("@/routes/transactions/PendingTransactionsPage"));
const PendingTransactionDetailsPage = lazy(
  () => import("@/routes/transactions/PendingTransactionDetailsPage")
);
const AccountPage = lazy(() => import("@/routes/investor/account/AccountPage"));
const SettingsPage = lazy(() => import("@/routes/investor/account/SettingsPage"));
const KYCVerification = lazy(() => import("@/routes/investor/account/KYCVerification"));

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
        path="/transactions/:id"
        element={
          <ProtectedRoute>
            <TransactionDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions/pending"
        element={
          <ProtectedRoute>
            <PendingTransactionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions/pending/:type/:id"
        element={
          <ProtectedRoute>
            <PendingTransactionDetailsPage />
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
        path="/account/kyc-verification"
        element={
          <ProtectedRoute>
            <KYCVerification />
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
