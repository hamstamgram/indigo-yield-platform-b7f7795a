import { lazy } from "react";
import { RouteSuspense } from "./RouteSuspense";

// ============================================================================
// PUBLIC PAGES
// ============================================================================
export const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
export const Health = lazy(() => import("@/pages/Health"));
export const Login = lazy(() => import("@/pages/Login"));
export const NotFound = lazy(() => import("@/pages/NotFound"));
export const Privacy = lazy(() => import("@/pages/Privacy"));
export const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
export const Status = lazy(() => import("@/pages/Status"));
export const Terms = lazy(() => import("@/pages/Terms"));

// ============================================================================
// ADMIN PAGES
// ============================================================================
export const AdminAuditLogs = lazy(() => import("@/pages/admin/AdminAuditLogs"));
export const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
// AdminDepositsPage removed - consolidated into AdminTransactionsPage
export const AdminEmailTrackingPage = lazy(() => import("@/pages/admin/AdminEmailTrackingPage"));
export const AdminOperationsHub = lazy(() => import("@/pages/admin/AdminOperationsHub"));
export const AdminRequestsQueuePage = lazy(() => import("@/pages/admin/AdminRequestsQueuePage"));
export const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
export const AdminStatementsPage = lazy(() => import("@/pages/admin/AdminStatementsPage"));

export const AdminUserManagement = lazy(() => import("@/pages/admin/AdminUserManagement"));
export const AdminWithdrawalsPage = lazy(() => import("@/pages/admin/AdminWithdrawalsPage"));

export const InvestorReports = lazy(() => import("@/pages/admin/InvestorReports"));
// MonthlyDataEntry removed - duplicate of YieldOperationsPage (P1 cleanup 2026-01-19)

// Admin Sub-pages
export const InvestorManagement = lazy(() => import("@/pages/admin/investors/InvestorManagement"));
export const WithdrawalsPage = lazy(() => import("@/pages/admin/investors/WithdrawalsPage"));
export const AdminInvite = lazy(() => import("@/pages/admin/settings/AdminInvite"));
export const SystemHealthPage = lazy(() => import("@/pages/admin/system-health/SystemHealthPage"));
export const AdminTransactionsPage = lazy(
  () => import("@/pages/admin/transactions/AdminTransactionsPage")
);
export const AdminManualTransaction = lazy(
  () => import("@/pages/admin/transactions/AdminManualTransaction")
);

// ============================================================================
// AUTH PAGES
// ============================================================================
export const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
export const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
export const VerifyEmailPage = lazy(() => import("@/pages/auth/VerifyEmailPage"));

// ============================================================================
// DASHBOARD PAGES
// ============================================================================
export const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
export const PortfolioPage = lazy(() => import("@/pages/dashboard/PortfolioPage"));

// ============================================================================
// INVESTOR PAGES
// ============================================================================
export const AccountPage = lazy(() => import("@/pages/investor/account/AccountPage"));
export const NotificationsPage = lazy(() => import("@/pages/investor/account/NotificationsPage"));
export const SessionManagementPage = lazy(
  () => import("@/pages/investor/account/SessionManagementPage")
);
// SettingsPage removed - merged into AccountPage
export const PortfolioAnalyticsPage = lazy(
  () => import("@/pages/investor/portfolio/PortfolioAnalyticsPage")
);
export const PortfolioIndex = lazy(() => import("@/pages/investor/portfolio/index"));
export const StatementsPage = lazy(() => import("@/pages/investor/statements/StatementsPage"));

// Transactions
export const TransactionsPage = lazy(() => import("@/pages/transactions/TransactionsPage"));

// ============================================================================
// FEATURE PAGES
// ============================================================================

export const NotificationSettingsPage = lazy(
  () => import("@/pages/settings/NotificationSettingsPage")
);

export const CustomReport = lazy(() => import("@/pages/reports/CustomReport"));
export const PerformanceReportPage = lazy(() => import("@/pages/reports/PerformanceReportPage"));
export const ReportsPage = lazy(() => import("@/pages/reports/ReportsPage"));

// SettingsNotificationsPage is the same as NotificationSettingsPage - use that instead

export const PendingTransactionsPage = lazy(
  () => import("@/pages/transactions/PendingTransactionsPage")
);
export const PendingTransactionDetailsPage = lazy(
  () => import("@/pages/transactions/PendingTransactionDetailsPage")
);
export const TransactionDetailsPage = lazy(
  () => import("@/pages/transactions/TransactionDetailsPage")
);
// TransactionsPageV2 alias removed - use TransactionsPage directly

export const WithdrawalHistoryPage = lazy(
  () => import("@/pages/withdrawals/WithdrawalHistoryPage")
);

// ============================================================================
// LAZY WRAPPERS WITH SUSPENSE
// ============================================================================

// Public
export const LazyForgotPassword = () => (
  <RouteSuspense>
    <ForgotPassword />
  </RouteSuspense>
);
export const LazyHealth = () => (
  <RouteSuspense>
    <Health />
  </RouteSuspense>
);
export const LazyLogin = () => (
  <RouteSuspense>
    <Login />
  </RouteSuspense>
);
export const LazyNotFound = () => (
  <RouteSuspense>
    <NotFound />
  </RouteSuspense>
);
export const LazyPrivacy = () => (
  <RouteSuspense>
    <Privacy />
  </RouteSuspense>
);
export const LazyResetPassword = () => (
  <RouteSuspense>
    <ResetPassword />
  </RouteSuspense>
);
export const LazyStatus = () => (
  <RouteSuspense>
    <Status />
  </RouteSuspense>
);
export const LazyTerms = () => (
  <RouteSuspense>
    <Terms />
  </RouteSuspense>
);

// Admin
export const LazyAdminAuditLogs = () => (
  <RouteSuspense type="admin">
    <AdminAuditLogs />
  </RouteSuspense>
);
export const LazyAdminDashboard = () => (
  <RouteSuspense type="admin">
    <AdminDashboard />
  </RouteSuspense>
);
// LazyAdminDeposits removed - consolidated into AdminTransactionsPage
export const LazyAdminEmailTracking = () => (
  <RouteSuspense type="admin">
    <AdminEmailTrackingPage />
  </RouteSuspense>
);
export const LazyAdminOperationsHub = () => (
  <RouteSuspense type="admin">
    <AdminOperationsHub />
  </RouteSuspense>
);
export const LazyAdminRequestsQueue = () => (
  <RouteSuspense type="admin">
    <AdminRequestsQueuePage />
  </RouteSuspense>
);
export const LazyAdminSettings = () => (
  <RouteSuspense type="admin">
    <AdminSettings />
  </RouteSuspense>
);
export const LazyAdminStatements = () => (
  <RouteSuspense type="admin">
    <AdminStatementsPage />
  </RouteSuspense>
);
export const LazyAdminUserManagement = () => (
  <RouteSuspense type="admin">
    <AdminUserManagement />
  </RouteSuspense>
);
export const LazyAdminWithdrawals = () => (
  <RouteSuspense type="admin">
    <AdminWithdrawalsPage />
  </RouteSuspense>
);
export const LazyInvestorReports = () => (
  <RouteSuspense type="admin">
    <InvestorReports />
  </RouteSuspense>
);
// LazyMonthlyDataEntry removed - duplicate of YieldOperationsPage (P1 cleanup 2026-01-19)

// Admin Sub-pages
export const LazyInvestorManagement = () => (
  <RouteSuspense type="admin">
    <InvestorManagement />
  </RouteSuspense>
);
export const LazyAdminWithdrawalsView = () => (
  <RouteSuspense type="admin">
    <WithdrawalsPage />
  </RouteSuspense>
);
export const LazyAdminInvite = () => (
  <RouteSuspense type="admin">
    <AdminInvite />
  </RouteSuspense>
);
export const LazySystemHealth = () => (
  <RouteSuspense type="admin">
    <SystemHealthPage />
  </RouteSuspense>
);
export const LazyAdminTransactionsView = () => (
  <RouteSuspense type="admin">
    <AdminTransactionsPage />
  </RouteSuspense>
);
export const LazyAdminManualTransaction = () => (
  <RouteSuspense type="admin">
    <AdminManualTransaction />
  </RouteSuspense>
);

// Auth
export const LazyLoginPage = () => (
  <RouteSuspense>
    <LoginPage />
  </RouteSuspense>
);
export const LazyRegister = () => (
  <RouteSuspense>
    <RegisterPage />
  </RouteSuspense>
);
export const LazyVerifyEmail = () => (
  <RouteSuspense>
    <VerifyEmailPage />
  </RouteSuspense>
);

// Dashboard
export const LazyDashboardPage = () => (
  <RouteSuspense type="dashboard">
    <DashboardPage />
  </RouteSuspense>
);
export const LazyPortfolio = () => (
  <RouteSuspense type="dashboard">
    <PortfolioPage />
  </RouteSuspense>
);

// Investor
export const LazyAccount = () => (
  <RouteSuspense>
    <AccountPage />
  </RouteSuspense>
);
export const LazyNotifications = () => (
  <RouteSuspense>
    <NotificationsPage />
  </RouteSuspense>
);
export const LazySessionManagement = () => (
  <RouteSuspense>
    <SessionManagementPage />
  </RouteSuspense>
);
// LazySettings removed - Settings merged into AccountPage
export const LazyPortfolioAnalytics = () => (
  <RouteSuspense>
    <PortfolioAnalyticsPage />
  </RouteSuspense>
);
export const LazyTransactions = () => (
  <RouteSuspense>
    <TransactionsPage />
  </RouteSuspense>
);
export const LazyPortfolioIndex = () => (
  <RouteSuspense>
    <PortfolioIndex />
  </RouteSuspense>
);
export const LazyStatements = () => (
  <RouteSuspense>
    <StatementsPage />
  </RouteSuspense>
);

// Feature Pages
export const LazyNotificationSettings = () => (
  <RouteSuspense>
    <NotificationSettingsPage />
  </RouteSuspense>
);
export const LazyCustomReport = () => (
  <RouteSuspense>
    <CustomReport />
  </RouteSuspense>
);
export const LazyPerformanceReport = () => (
  <RouteSuspense>
    <PerformanceReportPage />
  </RouteSuspense>
);
export const LazyReportsPage = () => (
  <RouteSuspense>
    <ReportsPage />
  </RouteSuspense>
);
export const LazySettingsNotifications = () => (
  <RouteSuspense>
    <NotificationSettingsPage />
  </RouteSuspense>
);
export const LazyPendingTransactions = () => (
  <RouteSuspense>
    <PendingTransactionsPage />
  </RouteSuspense>
);
export const LazyPendingTransactionDetails = () => (
  <RouteSuspense>
    <PendingTransactionDetailsPage />
  </RouteSuspense>
);
export const LazyTransactionDetails = () => (
  <RouteSuspense>
    <TransactionDetailsPage />
  </RouteSuspense>
);
export const LazyTransactionsV2 = () => (
  <RouteSuspense>
    <TransactionsPage />
  </RouteSuspense>
);
export const LazyWithdrawalHistory = () => (
  <RouteSuspense>
    <WithdrawalHistoryPage />
  </RouteSuspense>
);
