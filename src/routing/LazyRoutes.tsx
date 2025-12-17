import { lazy } from "react";
import { RouteSuspense } from "./RouteSuspense";

// ============================================================================
// PUBLIC PAGES
// ============================================================================
export const About = lazy(() => import("@/routes/About"));
export const Contact = lazy(() => import("@/routes/Contact"));
export const FAQ = lazy(() => import("@/routes/FAQ"));
export const ForgotPassword = lazy(() => import("@/routes/ForgotPassword"));
export const Health = lazy(() => import("@/routes/Health"));
export const Index = lazy(() => import("@/routes/Index"));
export const Login = lazy(() => import("@/routes/Login"));
export const NotFound = lazy(() => import("@/routes/NotFound"));
export const Privacy = lazy(() => import("@/routes/Privacy"));
export const ResetPassword = lazy(() => import("@/routes/ResetPassword"));
export const Status = lazy(() => import("@/routes/Status"));
export const Strategies = lazy(() => import("@/routes/Strategies"));
export const Terms = lazy(() => import("@/routes/Terms"));

// ============================================================================
// ADMIN PAGES
// ============================================================================
export const AdminAuditLogs = lazy(() => import("@/routes/admin/AdminAuditLogs"));
export const AdminDashboard = lazy(() => import("@/routes/admin/AdminDashboard"));
export const AdminDepositsPage = lazy(() => import("@/routes/admin/AdminDepositsPage"));
export const AdminEmailTrackingPage = lazy(() => import("@/routes/admin/AdminEmailTrackingPage"));
export const AdminOperationsHub = lazy(() => import("@/routes/admin/AdminOperationsHub"));
export const AdminRequestsQueuePage = lazy(() => import("@/routes/admin/AdminRequestsQueuePage"));
export const AdminSettings = lazy(() => import("@/routes/admin/AdminSettings"));
export const AdminStatementsPage = lazy(() => import("@/routes/admin/AdminStatementsPage"));
export const AdminTransactions = lazy(() => import("@/routes/admin/AdminTransactions"));
export const AdminUserManagement = lazy(() => import("@/routes/admin/AdminUserManagement"));
export const AdminWithdrawalsPage = lazy(() => import("@/routes/admin/AdminWithdrawalsPage"));
export const AuditLogViewer = lazy(() => import("@/routes/admin/AuditLogViewer"));
export const DailyRatesManagement = lazy(() => import("@/routes/admin/DailyRatesManagement"));
export const InvestorReports = lazy(() => import("@/routes/admin/InvestorReports"));
export const MonthlyDataEntry = lazy(() => import("@/routes/admin/MonthlyDataEntry"));

// Admin Sub-pages
export const InvestorManagement = lazy(() => import("@/routes/admin/investors/InvestorManagement"));
export const WithdrawalsPage = lazy(() => import("@/routes/admin/investors/WithdrawalsPage"));
export const MonthlyReportsPage = lazy(() => import("@/routes/admin/reports/MonthlyReportsPage"));
export const AdminAudit = lazy(() => import("@/routes/admin/settings/AdminAudit"));
export const AdminInvite = lazy(() => import("@/routes/admin/settings/AdminInvite"));
export const AdminOperations = lazy(() => import("@/routes/admin/settings/AdminOperations"));
export const AdminTools = lazy(() => import("@/routes/admin/settings/AdminTools"));
export const SystemHealthPage = lazy(() => import("@/routes/admin/system-health/SystemHealthPage"));
export const AdminTransactionsPage = lazy(
  () => import("@/routes/admin/transactions/AdminTransactionsPage")
);
export const AdminManualTransaction = lazy(
  () => import("@/routes/admin/transactions/AdminManualTransaction")
);

// ============================================================================
// AUTH PAGES
// ============================================================================
export const LoginPage = lazy(() => import("@/routes/auth/LoginPage"));
export const MfaSetupPage = lazy(() => import("@/routes/auth/MfaSetupPage"));
export const RegisterPage = lazy(() => import("@/routes/auth/RegisterPage"));
export const VerifyEmailPage = lazy(() => import("@/routes/auth/VerifyEmailPage"));

// ============================================================================
// DASHBOARD PAGES
// ============================================================================
export const DashboardPage = lazy(() => import("@/routes/dashboard/DashboardPage"));
export const PortfolioPage = lazy(() => import("@/routes/dashboard/PortfolioPage"));

// ============================================================================
// INVESTOR PAGES
// ============================================================================
export const AccountPage = lazy(() => import("@/routes/investor/account/AccountPage"));
export const NotificationsPage = lazy(() => import("@/routes/investor/account/NotificationsPage"));
export const SessionManagementPage = lazy(
  () => import("@/routes/investor/account/SessionManagementPage")
);
export const SettingsPage = lazy(() => import("@/routes/investor/account/SettingsPage"));
export const PortfolioAnalyticsPage = lazy(
  () => import("@/routes/investor/portfolio/PortfolioAnalyticsPage")
);
export const PortfolioIndex = lazy(() => import("@/routes/investor/portfolio/index"));
export const StatementsPage = lazy(() => import("@/routes/investor/statements/StatementsPage"));

// Transactions
export const TransactionsPage = lazy(() => import("@/routes/transactions/TransactionsPage"));

// ============================================================================
// FEATURE PAGES
// ============================================================================

export const NotificationSettingsPage = lazy(
  () => import("@/routes/settings/NotificationSettingsPage")
);


export const CustomReport = lazy(() => import("@/routes/reports/CustomReport"));
export const PerformanceReportPage = lazy(() => import("@/routes/reports/PerformanceReportPage"));
export const ReportsPage = lazy(() => import("@/routes/reports/ReportsPage"));

// SettingsNotificationsPage is the same as NotificationSettingsPage - use that instead

export const PendingTransactionsPage = lazy(
  () => import("@/routes/transactions/PendingTransactionsPage")
);
export const PendingTransactionDetailsPage = lazy(
  () => import("@/routes/transactions/PendingTransactionDetailsPage")
);
export const TransactionDetailsPage = lazy(
  () => import("@/routes/transactions/TransactionDetailsPage")
);
// TransactionsPageV2 alias removed - use TransactionsPage directly

export const WithdrawalHistoryPage = lazy(
  () => import("@/routes/withdrawals/WithdrawalHistoryPage")
);

// ============================================================================
// LAZY WRAPPERS WITH SUSPENSE
// ============================================================================

// Public
export const LazyAbout = () => (
  <RouteSuspense>
    <About />
  </RouteSuspense>
);
export const LazyContact = () => (
  <RouteSuspense>
    <Contact />
  </RouteSuspense>
);
export const LazyFAQ = () => (
  <RouteSuspense>
    <FAQ />
  </RouteSuspense>
);
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
export const LazyIndex = () => (
  <RouteSuspense>
    <Index />
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
export const LazyStrategies = () => (
  <RouteSuspense>
    <Strategies />
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
export const LazyAdminDeposits = () => (
  <RouteSuspense type="admin">
    <AdminDepositsPage />
  </RouteSuspense>
);
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
export const LazyAdminTransactions = () => (
  <RouteSuspense type="admin">
    <AdminTransactions />
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
export const LazyAuditLogViewer = () => (
  <RouteSuspense type="admin">
    <AuditLogViewer />
  </RouteSuspense>
);
export const LazyDailyRatesManagement = () => (
  <RouteSuspense type="admin">
    <DailyRatesManagement />
  </RouteSuspense>
);
export const LazyInvestorReports = () => (
  <RouteSuspense type="admin">
    <InvestorReports />
  </RouteSuspense>
);
export const LazyMonthlyDataEntry = () => (
  <RouteSuspense type="admin">
    <MonthlyDataEntry />
  </RouteSuspense>
);

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
export const LazyAdminMonthlyReports = () => (
  <RouteSuspense type="admin">
    <MonthlyReportsPage />
  </RouteSuspense>
);
export const LazyAdminAudit = () => (
  <RouteSuspense type="admin">
    <AdminAudit />
  </RouteSuspense>
);
export const LazyAdminInvite = () => (
  <RouteSuspense type="admin">
    <AdminInvite />
  </RouteSuspense>
);
export const LazyAdminOperations = () => (
  <RouteSuspense type="admin">
    <AdminOperations />
  </RouteSuspense>
);
export const LazyAdminTools = () => (
  <RouteSuspense type="admin">
    <AdminTools />
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
export const LazyMfaSetup = () => (
  <RouteSuspense>
    <MfaSetupPage />
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
export const LazySettings = () => (
  <RouteSuspense>
    <SettingsPage />
  </RouteSuspense>
);
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
