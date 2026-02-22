/**
 * Core Investor Routes
 * New investor portal routes
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { InvestorRoute } from "../../InvestorRoute";

// New investor pages
const InvestorOverviewPage = lazy(
  () => import("@/features/investor/overview/pages/InvestorOverviewPage")
);
const InvestorPortfolioPage = lazy(
  () => import("@/features/investor/portfolio/pages/InvestorPortfolioPage")
);
const InvestorTransactionsPage = lazy(
  () => import("@/features/investor/transactions/pages/InvestorTransactionsPage")
);
const StatementsPage = lazy(() => import("@/features/investor/statements/pages/StatementsPage"));
const InvestorSettingsPage = lazy(
  () => import("@/features/investor/settings/pages/InvestorSettingsPage")
);
const TransactionDetailsPage = lazy(
  () => import("@/features/investor/transactions/pages/TransactionDetailsPage")
);
const FundDetailsPage = lazy(() => import("@/features/investor/funds/pages/FundDetailsPage"));
const YieldHistoryPage = lazy(
  () => import("@/features/investor/performance/pages/YieldHistoryPage")
);

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
      <Route path="/investor/performance" element={<Navigate to="/investor" replace />} />
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
      <Route path="/investor/documents" element={<Navigate to="/investor" replace />} />
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
