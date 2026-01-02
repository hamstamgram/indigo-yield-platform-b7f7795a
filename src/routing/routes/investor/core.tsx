/**
 * Core Investor Routes
 * New investor portal routes
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

// New investor pages
const InvestorOverviewPage = lazy(() => import("@/pages/investor/InvestorOverviewPage"));
const InvestorPortfolioPage = lazy(() => import("@/pages/investor/InvestorPortfolioPage"));
const InvestorPerformancePage = lazy(() => import("@/pages/investor/InvestorPerformancePage"));
const InvestorTransactionsPage = lazy(() => import("@/pages/investor/InvestorTransactionsPage"));
const StatementsPage = lazy(() => import("@/pages/investor/statements/StatementsPage"));
const InvestorDocumentsPage = lazy(() => import("@/pages/investor/InvestorDocumentsPage"));
const InvestorSettingsPage = lazy(() => import("@/pages/investor/InvestorSettingsPage"));
const TransactionDetailsPage = lazy(() => import("@/pages/transactions/TransactionDetailsPage"));
const FundDetailsPage = lazy(() => import("@/pages/investor/funds/FundDetailsPage"));
const YieldHistoryPage = lazy(() => import("@/pages/investor/YieldHistoryPage"));

export function CoreInvestorRoutes() {
  return (
    <>
      {/* New investor routes */}
      <Route
        path="/investor"
        element={
          <ProtectedRoute>
            <InvestorOverviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/investor/portfolio"
        element={
          <ProtectedRoute>
            <InvestorPortfolioPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/investor/performance"
        element={
          <ProtectedRoute>
            <InvestorPerformancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/investor/transactions"
        element={
          <ProtectedRoute>
            <InvestorTransactionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/investor/statements"
        element={
          <ProtectedRoute>
            <StatementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/investor/documents"
        element={
          <ProtectedRoute>
            <InvestorDocumentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/investor/settings"
        element={
          <ProtectedRoute>
            <InvestorSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/investor/yield-history"
        element={
          <ProtectedRoute>
            <YieldHistoryPage />
          </ProtectedRoute>
        }
      />
      
      {/* Legacy redirects */}
      <Route path="/dashboard" element={<Navigate to="/investor" replace />} />
      <Route path="/statements" element={<Navigate to="/investor/statements" replace />} />
      <Route path="/transactions" element={<Navigate to="/investor/transactions" replace />} />
      <Route path="/account" element={<Navigate to="/investor/settings" replace />} />
      <Route path="/portfolio/analytics" element={<Navigate to="/investor/performance" replace />} />
      
      {/* Detail routes */}
      <Route
        path="/transactions/:id"
        element={
          <ProtectedRoute>
            <TransactionDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/funds/:assetId"
        element={
          <ProtectedRoute>
            <FundDetailsPage />
          </ProtectedRoute>
        }
      />
    </>
  );
}
