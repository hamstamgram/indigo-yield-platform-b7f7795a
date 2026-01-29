/**
 * Core Investor Routes
 * New investor portal routes
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { InvestorRoute } from "../../InvestorRoute";

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
          <InvestorRoute>
            <InvestorOverviewPage />
          </InvestorRoute>
        }
      />
      <Route
        path="/investor/portfolio"
        element={
          <InvestorRoute>
            <InvestorPortfolioPage />
          </InvestorRoute>
        }
      />
      <Route
        path="/investor/performance"
        element={
          <InvestorRoute>
            <InvestorPerformancePage />
          </InvestorRoute>
        }
      />
      <Route
        path="/investor/transactions"
        element={
          <InvestorRoute>
            <InvestorTransactionsPage />
          </InvestorRoute>
        }
      />
      <Route
        path="/investor/statements"
        element={
          <InvestorRoute>
            <StatementsPage />
          </InvestorRoute>
        }
      />
      <Route
        path="/investor/documents"
        element={
          <InvestorRoute>
            <InvestorDocumentsPage />
          </InvestorRoute>
        }
      />
      <Route
        path="/investor/settings"
        element={
          <InvestorRoute>
            <InvestorSettingsPage />
          </InvestorRoute>
        }
      />
      <Route
        path="/investor/yield-history"
        element={
          <InvestorRoute>
            <YieldHistoryPage />
          </InvestorRoute>
        }
      />

      {/* Legacy redirects */}
      <Route path="/dashboard" element={<Navigate to="/investor" replace />} />
      <Route path="/statements" element={<Navigate to="/investor/statements" replace />} />
      <Route path="/transactions" element={<Navigate to="/investor/transactions" replace />} />
      <Route path="/account" element={<Navigate to="/investor/settings" replace />} />
      <Route
        path="/portfolio/analytics"
        element={<Navigate to="/investor/performance" replace />}
      />

      {/* Detail routes */}
      <Route
        path="/transactions/:id"
        element={
          <InvestorRoute>
            <TransactionDetailsPage />
          </InvestorRoute>
        }
      />
      <Route
        path="/funds/:assetId"
        element={
          <InvestorRoute>
            <FundDetailsPage />
          </InvestorRoute>
        }
      />
    </>
  );
}
