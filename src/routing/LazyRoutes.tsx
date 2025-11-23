import { lazy } from "react";
import { RouteSuspense } from "./RouteSuspense";

// ============================================================================
// PUBLIC PAGES (14)
// ============================================================================
export const About = lazy(() => import("@/routes/About"));
export const AssetDetail = lazy(() => import("@/routes/AssetDetail"));
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
// ADMIN PAGES (48)
// ============================================================================
export const AdminAssetsPage = lazy(() => import("@/routes/admin/AdminAssetsPage"));
export const AdminAuditLogs = lazy(() => import("@/routes/admin/AdminAuditLogs"));
export const AdminBatchReportsPage = lazy(() => import("@/routes/admin/AdminBatchReportsPage"));
export const AdminCompliance = lazy(() => import("@/routes/admin/AdminCompliance"));
export const AdminDashboard = lazy(() => import("@/routes/admin/AdminDashboard"));
export const AdminDepositsPage = lazy(() => import("@/routes/admin/AdminDepositsPage"));
export const AdminDocumentsPage = lazy(() => import("@/routes/admin/AdminDocumentsPage"));
export const AdminEmailTrackingPage = lazy(() => import("@/routes/admin/AdminEmailTrackingPage"));
export const AdminFeesPage = lazy(() => import("@/routes/admin/AdminFeesPage"));
export const AdminInvestmentsPage = lazy(() => import("@/routes/admin/AdminInvestmentsPage"));
export const AdminOnboardingPage = lazy(() => import("@/routes/admin/AdminOnboardingPage"));
export const AdminOperationsHub = lazy(() => import("@/routes/admin/AdminOperationsHub"));
export const AdminReports = lazy(() => import("@/routes/admin/AdminReports"));
export const AdminRequestsQueuePage = lazy(() => import("@/routes/admin/AdminRequestsQueuePage"));
export const AdminSettings = lazy(() => import("@/routes/admin/AdminSettings"));
export const AdminStatementsPage = lazy(() => import("@/routes/admin/AdminStatementsPage"));
export const AdminSupportQueue = lazy(() => import("@/routes/admin/AdminSupportQueue"));
export const AdminTransactions = lazy(() => import("@/routes/admin/AdminTransactions"));
export const AdminUserManagement = lazy(() => import("@/routes/admin/AdminUserManagement"));
export const AdminWithdrawalsPage = lazy(() => import("@/routes/admin/AdminWithdrawalsPage"));
export const AuditDrilldown = lazy(() => import("@/routes/admin/AuditDrilldown"));
export const AuditLogViewer = lazy(() => import("@/routes/admin/AuditLogViewer"));
export const BalanceAdjustments = lazy(() => import("@/routes/admin/BalanceAdjustments"));
export const DailyRatesManagement = lazy(() => import("@/routes/admin/DailyRatesManagement"));
export const DataIntegrityDashboard = lazy(() => import("@/routes/admin/DataIntegrityDashboard"));
export const ExpertInvestorMasterView = lazy(() => import("@/routes/admin/ExpertInvestorMasterView"));
export const InvestorAccountCreation = lazy(() => import("@/routes/admin/InvestorAccountCreation"));
export const InvestorReportGenerator = lazy(() => import("@/routes/admin/InvestorReportGenerator"));
export const InvestorReports = lazy(() => import("@/routes/admin/InvestorReports"));
export const InvestorStatusTracking = lazy(() => import("@/routes/admin/InvestorStatusTracking"));
export const MonthlyDataEntry = lazy(() => import("@/routes/admin/MonthlyDataEntry"));
export const PortfolioDashboard = lazy(() => import("@/routes/admin/PortfolioDashboard"));
export const TestYieldPage = lazy(() => import("@/routes/admin/TestYieldPage"));

// Admin sub-pages
export const FundManagement = lazy(() => import("@/routes/admin/funds/FundManagement"));
export const AdminInvestorDetailPage = lazy(() => import("@/routes/admin/investors/AdminInvestorDetailPage"));
export const AdminInvestorNewPage = lazy(() => import("@/routes/admin/investors/AdminInvestorNewPage"));
export const AdminInvestorPositionsPage = lazy(() => import("@/routes/admin/investors/AdminInvestorPositionsPage"));
export const AdminInvestorTransactionsPage = lazy(() => import("@/routes/admin/investors/AdminInvestorTransactionsPage"));
export const DepositsPage = lazy(() => import("@/routes/admin/investors/DepositsPage"));
export const WithdrawalsPage = lazy(() => import("@/routes/admin/investors/WithdrawalsPage"));
export const MonthlyReportsPage = lazy(() => import("@/routes/admin/reports/MonthlyReportsPage"));
export const AdminAudit = lazy(() => import("@/routes/admin/settings/AdminAudit"));
export const AdminInvite = lazy(() => import("@/routes/admin/settings/AdminInvite"));
export const AdminOperations = lazy(() => import("@/routes/admin/settings/AdminOperations"));
export const AdminTools = lazy(() => import("@/routes/admin/settings/AdminTools"));
export const SystemHealthPage = lazy(() => import("@/routes/admin/system-health/SystemHealthPage"));
export const AdminTransactionsPage = lazy(() => import("@/routes/admin/transactions/AdminTransactionsPage"));

// ============================================================================
// AUTH PAGES (4)
// ============================================================================
export const LoginPage = lazy(() => import("@/routes/auth/LoginPage"));
export const MfaSetupPage = lazy(() => import("@/routes/auth/MfaSetupPage"));
export const RegisterPage = lazy(() => import("@/routes/auth/RegisterPage"));
export const VerifyEmailPage = lazy(() => import("@/routes/auth/VerifyEmailPage"));

// ============================================================================
// DASHBOARD PAGES (3)
// ============================================================================
export const DashboardPage = lazy(() => import("@/routes/dashboard/DashboardPage"));
export const PerformancePage = lazy(() => import("@/routes/dashboard/PerformancePage"));
export const PortfolioPage = lazy(() => import("@/routes/dashboard/PortfolioPage"));

// ============================================================================
// INVESTOR PAGES (8)
// ============================================================================
export const AccountPage = lazy(() => import("@/routes/investor/account/AccountPage"));
export const NotificationsPage = lazy(() => import("@/routes/investor/account/NotificationsPage"));
export const SessionManagementPage = lazy(() => import("@/routes/investor/account/SessionManagementPage"));
export const SettingsPage = lazy(() => import("@/routes/investor/account/SettingsPage"));
export const Dashboard = lazy(() => import("@/routes/investor/dashboard/Dashboard"));
export const PortfolioAnalyticsPage = lazy(() => import("@/routes/investor/portfolio/PortfolioAnalyticsPage"));
export const TransactionsPage = lazy(() => import("@/routes/investor/portfolio/TransactionsPage"));
export const PortfolioIndex = lazy(() => import("@/routes/investor/portfolio/index"));
export const StatementsPage = lazy(() => import("@/routes/investor/statements/StatementsPage"));

// ============================================================================
// DOCUMENTS PAGES (2)
// ============================================================================
export const DocumentViewerPage = lazy(() => import("@/routes/documents/DocumentViewerPage"));
export const DocumentsHubPage = lazy(() => import("@/routes/documents/DocumentsHubPage"));

// ============================================================================
// NOTIFICATIONS PAGES (5)
// ============================================================================
export const NotificationDetailPage = lazy(() => import("@/routes/notifications/NotificationDetailPage"));
export const NotificationHistoryPage = lazy(() => import("@/routes/notifications/NotificationHistoryPage"));
export const NotificationSettingsPage = lazy(() => import("@/routes/notifications/NotificationSettingsPage"));
export const NotificationsPageV2 = lazy(() => import("@/routes/notifications/NotificationsPage"));
export const PriceAlertsPage = lazy(() => import("@/routes/notifications/PriceAlertsPage"));

// ============================================================================
// PROFILE PAGES (7)
// ============================================================================
export const KYCVerification = lazy(() => import("@/routes/profile/KYCVerification"));
export const LinkedAccounts = lazy(() => import("@/routes/profile/LinkedAccounts"));
export const PersonalInfo = lazy(() => import("@/routes/profile/PersonalInfo"));
export const Preferences = lazy(() => import("@/routes/profile/Preferences"));
export const ProfilePrivacy = lazy(() => import("@/routes/profile/Privacy"));
export const ProfileOverview = lazy(() => import("@/routes/profile/ProfileOverview"));
export const Security = lazy(() => import("@/routes/profile/Security"));

// ============================================================================
// REPORTS PAGES (5)
// ============================================================================
export const CustomReport = lazy(() => import("@/routes/reports/CustomReport"));
export const MonthlyStatement = lazy(() => import("@/routes/reports/MonthlyStatement"));
export const PerformanceReportPage = lazy(() => import("@/routes/reports/PerformanceReportPage"));
export const PortfolioPerformance = lazy(() => import("@/routes/reports/PortfolioPerformance"));
export const ReportsPage = lazy(() => import("@/routes/reports/ReportsPage"));

// ============================================================================
// SETTINGS PAGES (3)
// ============================================================================
export const SettingsNotificationsPage = lazy(() => import("@/routes/settings/NotificationSettingsPage"));
export const ProfileSettingsPage = lazy(() => import("@/routes/settings/ProfileSettingsPage"));
export const SecuritySettings = lazy(() => import("@/routes/settings/SecuritySettings"));

// ============================================================================
// SUPPORT PAGES (5)
// ============================================================================
export const LiveChatPage = lazy(() => import("@/routes/support/LiveChatPage"));
export const NewTicketPage = lazy(() => import("@/routes/support/NewTicketPage"));
export const SupportHubPage = lazy(() => import("@/routes/support/SupportHubPage"));
export const SupportTicketsPage = lazy(() => import("@/routes/support/SupportTicketsPage"));
export const TicketDetailPage = lazy(() => import("@/routes/support/TicketDetailPage"));

// ============================================================================
// TRANSACTIONS PAGES (5)
// ============================================================================
export const NewDepositPage = lazy(() => import("@/routes/transactions/NewDepositPage"));
export const PendingTransactionsPage = lazy(() => import("@/routes/transactions/PendingTransactionsPage"));
export const RecurringDepositsPage = lazy(() => import("@/routes/transactions/RecurringDepositsPage"));
export const TransactionDetailsPage = lazy(() => import("@/routes/transactions/TransactionDetailsPage"));
export const TransactionsPageV2 = lazy(() => import("@/routes/transactions/TransactionsPage"));

// ============================================================================
// WITHDRAWALS PAGES (2)
// ============================================================================
export const NewWithdrawalPage = lazy(() => import("@/routes/withdrawals/NewWithdrawalPage"));
export const WithdrawalHistoryPage = lazy(() => import("@/routes/withdrawals/WithdrawalHistoryPage"));

// ============================================================================
// ACTIVITY PAGES (1)
// ============================================================================
export const ActivityPage = lazy(() => import("@/routes/activity/ActivityPage"));

// ============================================================================
// LAZY WRAPPERS WITH SUSPENSE (112 total)
// ============================================================================

// Public page wrappers
export const LazyAbout = () => <RouteSuspense><About /></RouteSuspense>;
export const LazyAssetDetail = () => <RouteSuspense><AssetDetail /></RouteSuspense>;
export const LazyContact = () => <RouteSuspense><Contact /></RouteSuspense>;
export const LazyFAQ = () => <RouteSuspense><FAQ /></RouteSuspense>;
export const LazyForgotPassword = () => <RouteSuspense><ForgotPassword /></RouteSuspense>;
export const LazyHealth = () => <RouteSuspense><Health /></RouteSuspense>;
export const LazyIndex = () => <RouteSuspense><Index /></RouteSuspense>;
export const LazyLogin = () => <RouteSuspense><Login /></RouteSuspense>;
export const LazyNotFound = () => <RouteSuspense><NotFound /></RouteSuspense>;
export const LazyPrivacy = () => <RouteSuspense><Privacy /></RouteSuspense>;
export const LazyResetPassword = () => <RouteSuspense><ResetPassword /></RouteSuspense>;
export const LazyStatus = () => <RouteSuspense><Status /></RouteSuspense>;
export const LazyStrategies = () => <RouteSuspense><Strategies /></RouteSuspense>;
export const LazyTerms = () => <RouteSuspense><Terms /></RouteSuspense>;

// Admin page wrappers
export const LazyAdminAssets = () => <RouteSuspense type="admin"><AdminAssetsPage /></RouteSuspense>;
export const LazyAdminAuditLogs = () => <RouteSuspense type="admin"><AdminAuditLogs /></RouteSuspense>;
export const LazyAdminBatchReports = () => <RouteSuspense type="admin"><AdminBatchReportsPage /></RouteSuspense>;
export const LazyAdminCompliance = () => <RouteSuspense type="admin"><AdminCompliance /></RouteSuspense>;
export const LazyAdminDashboard = () => <RouteSuspense type="admin"><AdminDashboard /></RouteSuspense>;
export const LazyAdminDeposits = () => <RouteSuspense type="admin"><AdminDepositsPage /></RouteSuspense>;
export const LazyAdminDocuments = () => <RouteSuspense type="admin"><AdminDocumentsPage /></RouteSuspense>;
export const LazyAdminEmailTracking = () => <RouteSuspense type="admin"><AdminEmailTrackingPage /></RouteSuspense>;
export const LazyAdminFees = () => <RouteSuspense type="admin"><AdminFeesPage /></RouteSuspense>;
export const LazyAdminInvestments = () => <RouteSuspense type="admin"><AdminInvestmentsPage /></RouteSuspense>;
export const LazyAdminOnboarding = () => <RouteSuspense type="admin"><AdminOnboardingPage /></RouteSuspense>;
export const LazyAdminOperationsHub = () => <RouteSuspense type="admin"><AdminOperationsHub /></RouteSuspense>;
export const LazyAdminReports = () => <RouteSuspense type="admin"><AdminReports /></RouteSuspense>;
export const LazyAdminRequestsQueue = () => <RouteSuspense type="admin"><AdminRequestsQueuePage /></RouteSuspense>;
export const LazyAdminSettings = () => <RouteSuspense type="admin"><AdminSettings /></RouteSuspense>;
export const LazyAdminStatements = () => <RouteSuspense type="admin"><AdminStatementsPage /></RouteSuspense>;
export const LazyAdminSupportQueue = () => <RouteSuspense type="admin"><AdminSupportQueue /></RouteSuspense>;
export const LazyAdminTransactions = () => <RouteSuspense type="admin"><AdminTransactions /></RouteSuspense>;
export const LazyAdminUserManagement = () => <RouteSuspense type="admin"><AdminUserManagement /></RouteSuspense>;
export const LazyAdminWithdrawals = () => <RouteSuspense type="admin"><AdminWithdrawalsPage /></RouteSuspense>;
export const LazyAuditDrilldown = () => <RouteSuspense type="admin"><AuditDrilldown /></RouteSuspense>;
export const LazyAuditLogViewer = () => <RouteSuspense type="admin"><AuditLogViewer /></RouteSuspense>;
export const LazyBalanceAdjustments = () => <RouteSuspense type="admin"><BalanceAdjustments /></RouteSuspense>;
export const LazyDailyRatesManagement = () => <RouteSuspense type="admin"><DailyRatesManagement /></RouteSuspense>;
export const LazyDataIntegrityDashboard = () => <RouteSuspense type="admin"><DataIntegrityDashboard /></RouteSuspense>;
export const LazyExpertInvestorMasterView = () => <RouteSuspense type="admin"><ExpertInvestorMasterView /></RouteSuspense>;
export const LazyInvestorAccountCreation = () => <RouteSuspense type="admin"><InvestorAccountCreation /></RouteSuspense>;
export const LazyInvestorReportGenerator = () => <RouteSuspense type="admin"><InvestorReportGenerator /></RouteSuspense>;
export const LazyInvestorReports = () => <RouteSuspense type="admin"><InvestorReports /></RouteSuspense>;
export const LazyInvestorStatusTracking = () => <RouteSuspense type="admin"><InvestorStatusTracking /></RouteSuspense>;
export const LazyMonthlyDataEntry = () => <RouteSuspense type="admin"><MonthlyDataEntry /></RouteSuspense>;
export const LazyPortfolioDashboard = () => <RouteSuspense type="admin"><PortfolioDashboard /></RouteSuspense>;
export const LazyTestYieldPage = () => <RouteSuspense type="admin"><TestYieldPage /></RouteSuspense>;
export const LazyFundManagement = () => <RouteSuspense type="admin"><FundManagement /></RouteSuspense>;
export const LazyAdminInvestorDetail = () => <RouteSuspense type="admin"><AdminInvestorDetailPage /></RouteSuspense>;
export const LazyAdminInvestorNew = () => <RouteSuspense type="admin"><AdminInvestorNewPage /></RouteSuspense>;
export const LazyAdminInvestorPositions = () => <RouteSuspense type="admin"><AdminInvestorPositionsPage /></RouteSuspense>;
export const LazyAdminInvestorTransactions = () => <RouteSuspense type="admin"><AdminInvestorTransactionsPage /></RouteSuspense>;
export const LazyAdminDepositsView = () => <RouteSuspense type="admin"><DepositsPage /></RouteSuspense>;
export const LazyAdminWithdrawalsView = () => <RouteSuspense type="admin"><WithdrawalsPage /></RouteSuspense>;
export const LazyAdminMonthlyReports = () => <RouteSuspense type="admin"><MonthlyReportsPage /></RouteSuspense>;
export const LazyAdminAudit = () => <RouteSuspense type="admin"><AdminAudit /></RouteSuspense>;
export const LazyAdminInvite = () => <RouteSuspense type="admin"><AdminInvite /></RouteSuspense>;
export const LazyAdminOperations = () => <RouteSuspense type="admin"><AdminOperations /></RouteSuspense>;
export const LazyAdminTools = () => <RouteSuspense type="admin"><AdminTools /></RouteSuspense>;
export const LazySystemHealth = () => <RouteSuspense type="admin"><SystemHealthPage /></RouteSuspense>;
export const LazyAdminTransactionsView = () => <RouteSuspense type="admin"><AdminTransactionsPage /></RouteSuspense>;

// Auth page wrappers
export const LazyLoginPage = () => <RouteSuspense><LoginPage /></RouteSuspense>;
export const LazyMfaSetup = () => <RouteSuspense><MfaSetupPage /></RouteSuspense>;
export const LazyRegister = () => <RouteSuspense><RegisterPage /></RouteSuspense>;
export const LazyVerifyEmail = () => <RouteSuspense><VerifyEmailPage /></RouteSuspense>;

// Dashboard page wrappers
export const LazyDashboardPage = () => <RouteSuspense type="dashboard"><DashboardPage /></RouteSuspense>;
export const LazyPerformance = () => <RouteSuspense type="dashboard"><PerformancePage /></RouteSuspense>;
export const LazyPortfolio = () => <RouteSuspense type="dashboard"><PortfolioPage /></RouteSuspense>;

// Investor page wrappers
export const LazyAccount = () => <RouteSuspense><AccountPage /></RouteSuspense>;
export const LazyNotifications = () => <RouteSuspense><NotificationsPage /></RouteSuspense>;
export const LazySessionManagement = () => <RouteSuspense><SessionManagementPage /></RouteSuspense>;
export const LazySettings = () => <RouteSuspense><SettingsPage /></RouteSuspense>;
export const LazyDashboard = () => <RouteSuspense type="dashboard"><Dashboard /></RouteSuspense>;
export const LazyPortfolioAnalytics = () => <RouteSuspense><PortfolioAnalyticsPage /></RouteSuspense>;
export const LazyTransactions = () => <RouteSuspense><TransactionsPage /></RouteSuspense>;
export const LazyPortfolioIndex = () => <RouteSuspense><PortfolioIndex /></RouteSuspense>;
export const LazyStatements = () => <RouteSuspense><StatementsPage /></RouteSuspense>;

// Documents page wrappers
export const LazyDocumentViewer = () => <RouteSuspense><DocumentViewerPage /></RouteSuspense>;
export const LazyDocumentsHub = () => <RouteSuspense><DocumentsHubPage /></RouteSuspense>;

// Notifications page wrappers
export const LazyNotificationDetail = () => <RouteSuspense><NotificationDetailPage /></RouteSuspense>;
export const LazyNotificationHistory = () => <RouteSuspense><NotificationHistoryPage /></RouteSuspense>;
export const LazyNotificationSettings = () => <RouteSuspense><NotificationSettingsPage /></RouteSuspense>;
export const LazyNotificationsV2 = () => <RouteSuspense><NotificationsPageV2 /></RouteSuspense>;
export const LazyPriceAlerts = () => <RouteSuspense><PriceAlertsPage /></RouteSuspense>;

// Profile page wrappers
export const LazyKYCVerification = () => <RouteSuspense><KYCVerification /></RouteSuspense>;
export const LazyLinkedAccounts = () => <RouteSuspense><LinkedAccounts /></RouteSuspense>;
export const LazyPersonalInfo = () => <RouteSuspense><PersonalInfo /></RouteSuspense>;
export const LazyPreferences = () => <RouteSuspense><Preferences /></RouteSuspense>;
export const LazyProfilePrivacy = () => <RouteSuspense><ProfilePrivacy /></RouteSuspense>;
export const LazyProfileOverview = () => <RouteSuspense><ProfileOverview /></RouteSuspense>;
export const LazySecurity = () => <RouteSuspense><Security /></RouteSuspense>;

// Reports page wrappers
export const LazyCustomReport = () => <RouteSuspense><CustomReport /></RouteSuspense>;
export const LazyMonthlyStatement = () => <RouteSuspense><MonthlyStatement /></RouteSuspense>;
export const LazyPerformanceReport = () => <RouteSuspense><PerformanceReportPage /></RouteSuspense>;
export const LazyPortfolioPerformance = () => <RouteSuspense><PortfolioPerformance /></RouteSuspense>;
export const LazyReportsPage = () => <RouteSuspense><ReportsPage /></RouteSuspense>;

// Settings page wrappers
export const LazySettingsNotifications = () => <RouteSuspense><SettingsNotificationsPage /></RouteSuspense>;
export const LazyProfileSettings = () => <RouteSuspense><ProfileSettingsPage /></RouteSuspense>;
export const LazySecuritySettings = () => <RouteSuspense><SecuritySettings /></RouteSuspense>;

// Support page wrappers
export const LazyLiveChat = () => <RouteSuspense><LiveChatPage /></RouteSuspense>;
export const LazyNewTicket = () => <RouteSuspense><NewTicketPage /></RouteSuspense>;
export const LazySupportHub = () => <RouteSuspense><SupportHubPage /></RouteSuspense>;
export const LazySupportTickets = () => <RouteSuspense><SupportTicketsPage /></RouteSuspense>;
export const LazyTicketDetail = () => <RouteSuspense><TicketDetailPage /></RouteSuspense>;

// Transactions page wrappers
export const LazyNewDeposit = () => <RouteSuspense><NewDepositPage /></RouteSuspense>;
export const LazyPendingTransactions = () => <RouteSuspense><PendingTransactionsPage /></RouteSuspense>;
export const LazyRecurringDeposits = () => <RouteSuspense><RecurringDepositsPage /></RouteSuspense>;
export const LazyTransactionDetails = () => <RouteSuspense><TransactionDetailsPage /></RouteSuspense>;
export const LazyTransactionsV2 = () => <RouteSuspense><TransactionsPageV2 /></RouteSuspense>;

// Withdrawals page wrappers
export const LazyNewWithdrawal = () => <RouteSuspense><NewWithdrawalPage /></RouteSuspense>;
export const LazyWithdrawalHistory = () => <RouteSuspense><WithdrawalHistoryPage /></RouteSuspense>;

// Activity page wrapper
export const LazyActivity = () => <RouteSuspense><ActivityPage /></RouteSuspense>;
