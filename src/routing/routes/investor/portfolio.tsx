/**
 * Portfolio & LP Routes
 * Withdrawals, analytics, and portfolio-specific features
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

// Portfolio pages
const WithdrawalsPage = lazy(() => import("@/pages/withdrawals/WithdrawalHistoryPage"));
const NewWithdrawalPage = lazy(() => import("@/pages/withdrawals/NewWithdrawalPage"));
const PortfolioAnalyticsPage = lazy(
  () => import("@/pages/investor/portfolio/PortfolioAnalyticsPage")
);

export function PortfolioRoutes() {
  return (
    <>
      <Route
        path="/withdrawals"
        element={
          <ProtectedRoute>
            <WithdrawalsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/withdrawals/new"
        element={
          <ProtectedRoute>
            <NewWithdrawalPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portfolio/analytics"
        element={
          <ProtectedRoute>
            <PortfolioAnalyticsPage />
          </ProtectedRoute>
        }
      />
    </>
  );
}
