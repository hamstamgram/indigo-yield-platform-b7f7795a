/**
 * Portfolio & LP Routes
 * Withdrawals, analytics, and portfolio-specific features
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

// Portfolio pages
const WithdrawalsPage = lazy(() => import("@/pages/admin/investors/WithdrawalsPage"));
const PortfolioAnalyticsPage = lazy(
  () => import("@/pages/investor/portfolio/PortfolioAnalyticsPage")
);
const SessionManagementPage = lazy(() => import("@/pages/investor/account/SessionManagementPage"));
const ProfileSettingsPage = lazy(() => import("@/pages/settings/ProfileSettingsPage"));
const SecuritySettings = lazy(() => import("@/pages/settings/SecuritySettings"));

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
        path="/portfolio/analytics"
        element={
          <ProtectedRoute>
            <PortfolioAnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/sessions"
        element={
          <ProtectedRoute>
            <SessionManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/profile"
        element={
          <ProtectedRoute>
            <ProfileSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/security"
        element={
          <ProtectedRoute>
            <SecuritySettings />
          </ProtectedRoute>
        }
      />

      {/* Portfolio route redirects for backward compatibility */}
      <Route path="/portfolio/USDC" element={<Navigate to="/assets/usdc" replace />} />
      <Route path="/portfolio/BTC" element={<Navigate to="/assets/btc" replace />} />
      <Route path="/portfolio/ETH" element={<Navigate to="/assets/eth" replace />} />
      <Route path="/portfolio/SOL" element={<Navigate to="/assets/sol" replace />} />
      <Route path="/portfolio/usdc" element={<Navigate to="/assets/usdc" replace />} />
      <Route path="/portfolio/btc" element={<Navigate to="/assets/btc" replace />} />
      <Route path="/portfolio/eth" element={<Navigate to="/assets/eth" replace />} />
      <Route path="/portfolio/sol" element={<Navigate to="/assets/sol" replace />} />

      {/* Deprecated yield management route with redirect */}
      <Route path="/yield-sources" element={<Navigate to="/admin/yield-settings" replace />} />
    </>
  );
}
