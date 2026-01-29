/**
 * Portfolio & LP Routes
 * Withdrawals, analytics, and portfolio-specific features
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { InvestorRoute } from "../../InvestorRoute";

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
          <InvestorRoute>
            <WithdrawalsPage />
          </InvestorRoute>
        }
      />
      <Route
        path="/withdrawals/new"
        element={
          <InvestorRoute>
            <NewWithdrawalPage />
          </InvestorRoute>
        }
      />
      <Route
        path="/portfolio/analytics"
        element={
          <InvestorRoute>
            <PortfolioAnalyticsPage />
          </InvestorRoute>
        }
      />
    </>
  );
}
