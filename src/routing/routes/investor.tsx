/**
 * Investor Routes Module
 * All investor-protected routes for portfolio management
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../ProtectedRoute";

// Investor Dashboard & Portfolio
const Dashboard = lazy(() => import("@/pages/investor/dashboard/Dashboard"));
const StatementsPage = lazy(() => import("@/pages/investor/statements/StatementsPage"));
const TransactionsPage = lazy(() => import("@/pages/investor/portfolio/TransactionsPage"));
const DocumentsPage = lazy(() => import("@/pages/investor/statements/Documents"));
const AssetDetail = lazy(() => import("@/pages/AssetDetail"));
const AccountPage = lazy(() => import("@/pages/investor/account/AccountPage"));
const SettingsPage = lazy(() => import("@/pages/investor/account/SettingsPage"));

// LP Pages
const WithdrawalsPage = lazy(() => import("@/pages/admin/investors/WithdrawalsPage"));
const PortfolioAnalyticsPage = lazy(
  () => import("@/pages/investor/portfolio/PortfolioAnalyticsPage")
);
const SessionManagementPage = lazy(() => import("@/pages/investor/account/SessionManagementPage"));
const ProfileSettingsPage = lazy(() => import("@/pages/settings/ProfileSettingsPage"));
const SecuritySettings = lazy(() => import("@/pages/settings/SecuritySettings"));

// Notifications Module
const NotificationsPage = lazy(() => import("@/pages/notifications/NotificationsPage"));
const NotificationSettingsPage = lazy(
  () => import("@/pages/notifications/NotificationSettingsPage")
);
const PriceAlertsPage = lazy(() => import("@/pages/notifications/PriceAlertsPage"));
const NotificationHistoryPage = lazy(() => import("@/pages/notifications/NotificationHistoryPage"));
const NotificationDetailPage = lazy(() => import("@/pages/notifications/NotificationDetailPage"));

// Documents Module
const DocumentsVaultPage = lazy(() => import("@/pages/documents/DocumentsVaultPage"));
const DocumentViewerPage = lazy(() => import("@/pages/documents/DocumentViewerPage"));
const DocumentUploadPage = lazy(() => import("@/pages/documents/DocumentUploadPage"));

// Support Module
const SupportHubPage = lazy(() => import("@/pages/support/SupportHubPage"));
const SupportTickets = lazy(() => import("@/pages/support/SupportTicketsPage"));
const NewTicketPage = lazy(() => import("@/pages/support/NewTicketPage"));
const TicketDetailPage = lazy(() => import("@/pages/support/TicketDetailPage"));
const LiveChatPage = lazy(() => import("@/pages/support/LiveChatPage"));

// Profile Module
const ProfileOverview = lazy(() => import("@/pages/profile/ProfileOverview"));
const PersonalInfo = lazy(() => import("@/pages/profile/PersonalInfo"));
const ProfileSecurity = lazy(() => import("@/pages/profile/Security"));
const Preferences = lazy(() => import("@/pages/profile/Preferences"));
const ProfilePrivacy = lazy(() => import("@/pages/profile/Privacy"));
const LinkedAccounts = lazy(() => import("@/pages/profile/LinkedAccounts"));
const KYCVerification = lazy(() => import("@/pages/profile/KYCVerification"));
const Referrals = lazy(() => import("@/pages/profile/Referrals"));

// Reports Module
const ReportsDashboard = lazy(() => import("@/pages/reports/ReportsDashboard"));
const PortfolioPerformance = lazy(() => import("@/pages/reports/PortfolioPerformance"));
const MonthlyStatement = lazy(() => import("@/pages/reports/MonthlyStatement"));
const CustomReport = lazy(() => import("@/pages/reports/CustomReport"));
const ReportHistory = lazy(() => import("@/pages/reports/ReportHistory"));

/**
 * Investor Routes Component
 * Exports all investor-protected routes
 */
export function InvestorRoutes() {
  return (
    <>
      {/* Investor Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* LP Routes */}
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

      {/* Notifications Module */}
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications/settings"
        element={
          <ProtectedRoute>
            <NotificationSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications/alerts"
        element={
          <ProtectedRoute>
            <PriceAlertsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications/history"
        element={
          <ProtectedRoute>
            <NotificationHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications/:id"
        element={
          <ProtectedRoute>
            <NotificationDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Documents Module */}
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <DocumentsVaultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/upload"
        element={
          <ProtectedRoute>
            <DocumentUploadPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/statements"
        element={
          <ProtectedRoute>
            <DocumentsVaultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/statements/:id"
        element={
          <ProtectedRoute>
            <DocumentViewerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/trade-confirmations"
        element={
          <ProtectedRoute>
            <DocumentsVaultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/agreements"
        element={
          <ProtectedRoute>
            <DocumentsVaultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/categories"
        element={
          <ProtectedRoute>
            <DocumentsVaultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/:id"
        element={
          <ProtectedRoute>
            <DocumentViewerPage />
          </ProtectedRoute>
        }
      />

      {/* Support Module */}
      <Route
        path="/support"
        element={
          <ProtectedRoute>
            <SupportHubPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support/tickets"
        element={
          <ProtectedRoute>
            <SupportTickets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support/tickets/new"
        element={
          <ProtectedRoute>
            <NewTicketPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support/tickets/:id"
        element={
          <ProtectedRoute>
            <TicketDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support/live-chat"
        element={
          <ProtectedRoute>
            <LiveChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support/faq"
        element={
          <ProtectedRoute>
            <SupportHubPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support/knowledge-base"
        element={
          <ProtectedRoute>
            <SupportHubPage />
          </ProtectedRoute>
        }
      />

      {/* Core Investor Routes */}
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

      {/* Profile Module */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfileOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/personal-info"
        element={
          <ProtectedRoute>
            <PersonalInfo />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/security"
        element={
          <ProtectedRoute>
            <ProfileSecurity />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/preferences"
        element={
          <ProtectedRoute>
            <Preferences />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/privacy"
        element={
          <ProtectedRoute>
            <ProfilePrivacy />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/linked-accounts"
        element={
          <ProtectedRoute>
            <LinkedAccounts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/kyc-verification"
        element={
          <ProtectedRoute>
            <KYCVerification />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/referrals"
        element={
          <ProtectedRoute>
            <Referrals />
          </ProtectedRoute>
        }
      />

      {/* Reports Module */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/portfolio-performance"
        element={
          <ProtectedRoute>
            <PortfolioPerformance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/monthly-statement"
        element={
          <ProtectedRoute>
            <MonthlyStatement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/custom"
        element={
          <ProtectedRoute>
            <CustomReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/history"
        element={
          <ProtectedRoute>
            <ReportHistory />
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
