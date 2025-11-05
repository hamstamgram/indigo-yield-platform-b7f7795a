import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Core pages loaded immediately
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';

// Password reset pages
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));

// Lazy load heavy components
const Dashboard = lazy(() => import('@/pages/investor/dashboard/Dashboard'));
const StatementsPage = lazy(() => import('@/pages/investor/statements/StatementsPage'));
const TransactionsPage = lazy(() => import('@/pages/investor/portfolio/TransactionsPage'));
const DocumentsPage = lazy(() => import('@/pages/investor/statements/Documents'));
const AssetDetail = lazy(() => import('@/pages/AssetDetail'));
const AccountPage = lazy(() => import('@/pages/investor/account/AccountPage'));
const SettingsPage = lazy(() => import('@/pages/investor/account/SettingsPage'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Contact = lazy(() => import('@/pages/Contact'));
const About = lazy(() => import('@/pages/About'));
const Strategies = lazy(() => import('@/pages/Strategies'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const Health = lazy(() => import('@/pages/Health'));
const Status = lazy(() => import('@/pages/Status'));
const OnboardingWizard = lazy(() => import('@/components/onboarding/OnboardingWizard'));

// Admin pages - lazy load all
const AdminTools = lazy(() => import('@/pages/admin/settings/AdminTools'));
const AdminInvite = lazy(() => import('@/pages/admin/settings/AdminInvite'));
const AdminDashboardV2 = lazy(() => import('@/components/admin/AdminDashboardV2'));
const PortfolioDashboard = lazy(() => import('@/pages/admin/PortfolioDashboard'));
const AdminPortfolioDashboard = lazy(() => import('@/pages/admin/AdminPortfolioDashboard'));
const InvestorManagementView = lazy(() => import('@/components/admin/InvestorManagementView'));
const InvestorDetail = lazy(() => import('@/pages/admin/InvestorDetail'));
const AdminOperations = lazy(() => import('@/pages/admin/settings/AdminOperations'));
const AdminAudit = lazy(() => import('@/pages/admin/settings/AdminAudit'));

// LP Pages - lazy load all
const WithdrawalsPage = lazy(() => import('@/pages/admin/investors/WithdrawalsPage'));
const DepositsPage = lazy(() => import('@/pages/admin/investors/DepositsPage'));
const SupportPage = lazy(() => import('@/pages/SupportPage'));
const SupportTicketsPage = lazy(() => import('@/pages/SupportTicketsPage'));
const PortfolioAnalyticsPage = lazy(() => import('@/pages/investor/portfolio/PortfolioAnalyticsPage'));
const SessionManagementPage = lazy(() => import('@/pages/investor/account/SessionManagementPage'));
const ProfileSettingsPage = lazy(() => import('@/pages/settings/ProfileSettingsPage'));
const SecuritySettings = lazy(() => import('@/pages/settings/SecuritySettings'));

// Notifications Module - lazy load all
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage'));
const NotificationSettingsPage = lazy(() => import('@/pages/notifications/NotificationSettingsPage'));
const PriceAlertsPage = lazy(() => import('@/pages/notifications/PriceAlertsPage'));
const NotificationHistoryPage = lazy(() => import('@/pages/notifications/NotificationHistoryPage'));
const NotificationDetailPage = lazy(() => import('@/pages/notifications/NotificationDetailPage'));

// Documents Module - lazy load all
const DocumentsVaultPage = lazy(() => import('@/pages/documents/DocumentsVaultPage'));
const DocumentViewerPage = lazy(() => import('@/pages/documents/DocumentViewerPage'));
const DocumentUploadPage = lazy(() => import('@/pages/documents/DocumentUploadPage'));

// Support Module - lazy load all
const SupportHubPage = lazy(() => import('@/pages/support/SupportHubPage'));
const SupportTickets = lazy(() => import('@/pages/support/SupportTicketsPage'));
const NewTicketPage = lazy(() => import('@/pages/support/NewTicketPage'));
const TicketDetailPage = lazy(() => import('@/pages/support/TicketDetailPage'));
const LiveChatPage = lazy(() => import('@/pages/support/LiveChatPage'));

// Profile Module - lazy load all
const ProfileOverview = lazy(() => import('@/pages/profile/ProfileOverview'));
const PersonalInfo = lazy(() => import('@/pages/profile/PersonalInfo'));
const ProfileSecurity = lazy(() => import('@/pages/profile/Security'));
const Preferences = lazy(() => import('@/pages/profile/Preferences'));
const ProfilePrivacy = lazy(() => import('@/pages/profile/Privacy'));
const LinkedAccounts = lazy(() => import('@/pages/profile/LinkedAccounts'));
const KYCVerification = lazy(() => import('@/pages/profile/KYCVerification'));
const Referrals = lazy(() => import('@/pages/profile/Referrals'));

// Reports Module - lazy load all
const ReportsDashboard = lazy(() => import('@/pages/reports/ReportsDashboard'));
const PortfolioPerformance = lazy(() => import('@/pages/reports/PortfolioPerformance'));
const TaxReport = lazy(() => import('@/pages/reports/TaxReport'));
const MonthlyStatement = lazy(() => import('@/pages/reports/MonthlyStatement'));
const CustomReport = lazy(() => import('@/pages/reports/CustomReport'));
const ReportHistory = lazy(() => import('@/pages/reports/ReportHistory'));

// New Admin Module Pages - lazy load all
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminInvestorManagement = lazy(() => import('@/pages/admin/AdminInvestorManagement'));
const AdminInvestorDetailNew = lazy(() => import('@/pages/admin/AdminInvestorDetail'));
const AdminTransactions = lazy(() => import('@/pages/admin/AdminTransactions'));
const AdminWithdrawalsNew = lazy(() => import('@/pages/admin/AdminWithdrawals'));
const AdminDocumentsNew = lazy(() => import('@/pages/admin/AdminDocuments'));
const AdminCompliance = lazy(() => import('@/pages/admin/AdminCompliance'));
const AdminReportsNew = lazy(() => import('@/pages/admin/AdminReports'));
const AdminFees = lazy(() => import('@/pages/admin/AdminFees'));
const AdminSettingsNew = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminAuditLogs = lazy(() => import('@/pages/admin/AdminAuditLogs'));
const AdminUserManagement = lazy(() => import('@/pages/admin/AdminUserManagement'));

// Admin Pages - lazy load all
const AdminInvestorNewPage = lazy(() => import('@/pages/admin/investors/AdminInvestorNewPage'));
const AdminInvestorDetailPage = lazy(() => import('@/pages/admin/investors/AdminInvestorDetailPage'));
const AdminInvestorPositionsPage = lazy(() => import('@/pages/admin/investors/AdminInvestorPositionsPage'));
const AdminInvestorTransactionsPage = lazy(() => import('@/pages/admin/investors/AdminInvestorTransactionsPage'));

// Phase 5: Monthly Data Entry & Daily Rates
const MonthlyDataEntry = lazy(() => import('@/pages/admin/MonthlyDataEntry'));
const DailyRatesManagement = lazy(() => import('@/pages/admin/DailyRatesManagement'));
const InvestorReports = lazy(() => import('@/pages/admin/InvestorReports'));

const AdminRequestsQueuePage = lazy(() => import('@/pages/admin/AdminRequestsQueuePage'));
const AdminStatementsPage = lazy(() => import('@/pages/admin/AdminStatementsPage'));
const AdminSupportQueue = lazy(() => import('@/pages/admin/AdminSupportQueue'));
const AdminReports = lazy(() => import('@/pages/admin/AdminReports'));
const AdminDocumentsPage = lazy(() => import('@/pages/admin/AdminDocumentsPage'));
const HistoricalReportsDashboard = lazy(() => import('@/components/admin/investors/HistoricalReportsDashboard'));
const AdminBatchReportsPage = lazy(() => import('@/pages/admin/AdminBatchReportsPage'));
const AdminWithdrawalsPage = lazy(() => import('@/pages/admin/AdminWithdrawalsPage'));

// Expert Investor Management - lazy load
const ExpertInvestorMasterView = lazy(() => import('@/pages/admin/ExpertInvestorMasterView'));
const ExpertInvestorDashboard = lazy(() => import('@/components/admin/expert/ExpertInvestorDashboard'));

// Lazy load complex admin components
const InvestorAccountCreation = lazy(() => import('@/pages/admin/InvestorAccountCreation').then(m => ({ default: m.InvestorAccountCreation })));
const BalanceAdjustments = lazy(() => import('@/pages/admin/BalanceAdjustments').then(m => ({ default: m.BalanceAdjustments })));
const InvestorStatusTracking = lazy(() => import('@/pages/admin/InvestorStatusTracking').then(m => ({ default: m.InvestorStatusTracking })));
const FeeConfigurationManagement = lazy(() => import('@/pages/admin/FeeConfigurationManagement').then(m => ({ default: m.FeeConfigurationManagement })));
const YieldSettings = lazy(() => import('@/pages/admin/YieldSettings'));
const FundManagement = lazy(() => import('@/pages/admin/funds/FundManagement'));
const YieldManagement = lazy(() => import('@/pages/admin/YieldManagement'));
const AuditDrilldown = lazy(() => import('@/pages/admin/AuditDrilldown'));

// PDF Generation Demo - lazy load
const PDFGenerationDemo = lazy(() => import('@/components/pdf/PDFGenerationDemo').then(m => ({ default: m.PDFGenerationDemo })));
const SetupAUMPage = lazy(() => import('@/pages/admin/SetupAUMPage'));
const TestYieldPage = lazy(() => import('@/pages/admin/TestYieldPage'));


// UI Components
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';
import { PageLoadingSpinner } from '@/components/ui/loading-spinner';

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/onboarding" element={<OnboardingWizard />} />
        <Route path="/admin-invite" element={<AdminInvite />} />
        
        {/* Public info pages */}
        <Route path="/health" element={<Health />} />
        <Route path="/status" element={<Status />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/strategies" element={<Strategies />} />
        <Route path="/faq" element={<FAQ />} />
      
        {/* Dashboard routes with layout */}
        <Route path="/" element={<DashboardLayout />}>
          {/* Investor Dashboard route - protected */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* LP Routes - all protected */}
          <Route path="/withdrawals" element={<ProtectedRoute><WithdrawalsPage /></ProtectedRoute>} />
          <Route path="/portfolio/analytics" element={<ProtectedRoute><PortfolioAnalyticsPage /></ProtectedRoute>} />
          <Route path="/settings/sessions" element={<ProtectedRoute><SessionManagementPage /></ProtectedRoute>} />
          <Route path="/settings/profile" element={<ProtectedRoute><ProfileSettingsPage /></ProtectedRoute>} />
          <Route path="/settings/security" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />

          {/* Notifications Module Routes - all protected */}
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/notifications/settings" element={<ProtectedRoute><NotificationSettingsPage /></ProtectedRoute>} />
          <Route path="/notifications/alerts" element={<ProtectedRoute><PriceAlertsPage /></ProtectedRoute>} />
          <Route path="/notifications/history" element={<ProtectedRoute><NotificationHistoryPage /></ProtectedRoute>} />
          <Route path="/notifications/:id" element={<ProtectedRoute><NotificationDetailPage /></ProtectedRoute>} />

          {/* Documents Module Routes - all protected */}
          <Route path="/documents" element={<ProtectedRoute><DocumentsVaultPage /></ProtectedRoute>} />
          <Route path="/documents/upload" element={<ProtectedRoute><DocumentUploadPage /></ProtectedRoute>} />
          <Route path="/documents/statements" element={<ProtectedRoute><DocumentsVaultPage /></ProtectedRoute>} />
          <Route path="/documents/statements/:id" element={<ProtectedRoute><DocumentViewerPage /></ProtectedRoute>} />
          <Route path="/documents/tax" element={<ProtectedRoute><DocumentsVaultPage /></ProtectedRoute>} />
          <Route path="/documents/trade-confirmations" element={<ProtectedRoute><DocumentsVaultPage /></ProtectedRoute>} />
          <Route path="/documents/agreements" element={<ProtectedRoute><DocumentsVaultPage /></ProtectedRoute>} />
          <Route path="/documents/categories" element={<ProtectedRoute><DocumentsVaultPage /></ProtectedRoute>} />
          <Route path="/documents/:id" element={<ProtectedRoute><DocumentViewerPage /></ProtectedRoute>} />

          {/* Support Module Routes - all protected */}
          <Route path="/support" element={<ProtectedRoute><SupportHubPage /></ProtectedRoute>} />
          <Route path="/support/tickets" element={<ProtectedRoute><SupportTickets /></ProtectedRoute>} />
          <Route path="/support/tickets/new" element={<ProtectedRoute><NewTicketPage /></ProtectedRoute>} />
          <Route path="/support/tickets/:id" element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} />
          <Route path="/support/live-chat" element={<ProtectedRoute><LiveChatPage /></ProtectedRoute>} />
          <Route path="/support/faq" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
          <Route path="/support/knowledge-base" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
          
          {/* Other existing routes - protected */}
          <Route path="/statements" element={<ProtectedRoute><StatementsPage /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
          <Route path="/assets/:symbol" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          {/* Profile Module Routes - all protected */}
          <Route path="/profile" element={<ProtectedRoute><ProfileOverview /></ProtectedRoute>} />
          <Route path="/profile/personal-info" element={<ProtectedRoute><PersonalInfo /></ProtectedRoute>} />
          <Route path="/profile/security" element={<ProtectedRoute><ProfileSecurity /></ProtectedRoute>} />
          <Route path="/profile/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
          <Route path="/profile/privacy" element={<ProtectedRoute><ProfilePrivacy /></ProtectedRoute>} />
          <Route path="/profile/linked-accounts" element={<ProtectedRoute><LinkedAccounts /></ProtectedRoute>} />
          <Route path="/profile/kyc-verification" element={<ProtectedRoute><KYCVerification /></ProtectedRoute>} />
          <Route path="/profile/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />

          {/* Reports Module Routes - all protected */}
          <Route path="/reports" element={<ProtectedRoute><ReportsDashboard /></ProtectedRoute>} />
          <Route path="/reports/portfolio-performance" element={<ProtectedRoute><PortfolioPerformance /></ProtectedRoute>} />
          <Route path="/reports/tax-report" element={<ProtectedRoute><TaxReport /></ProtectedRoute>} />
          <Route path="/reports/monthly-statement" element={<ProtectedRoute><MonthlyStatement /></ProtectedRoute>} />
          <Route path="/reports/custom" element={<ProtectedRoute><CustomReport /></ProtectedRoute>} />
          <Route path="/reports/history" element={<ProtectedRoute><ReportHistory /></ProtectedRoute>} />
          
          {/* Admin routes - all protected with AdminRoute */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/portfolio" element={<AdminRoute><PortfolioDashboard /></AdminRoute>} />
          <Route path="/admin/portfolio-dashboard" element={<AdminRoute><AdminPortfolioDashboard /></AdminRoute>} />
          <Route path="/admin/yield-settings" element={<Navigate to="/admin/funds" replace />} />

          {/* New Admin Module Routes */}
          <Route path="/admin/investors-management" element={<AdminRoute><AdminInvestorManagement /></AdminRoute>} />
          <Route path="/admin/investor/:id" element={<AdminRoute><AdminInvestorDetailNew /></AdminRoute>} />
          <Route path="/admin/transactions-all" element={<AdminRoute><AdminTransactions /></AdminRoute>} />
          <Route path="/admin/withdrawals-queue" element={<AdminRoute><AdminWithdrawalsNew /></AdminRoute>} />
          <Route path="/admin/documents-queue" element={<AdminRoute><AdminDocumentsNew /></AdminRoute>} />
          <Route path="/admin/compliance" element={<AdminRoute><AdminCompliance /></AdminRoute>} />
          <Route path="/admin/reports-admin" element={<AdminRoute><AdminReportsNew /></AdminRoute>} />
          <Route path="/admin/fees-management" element={<AdminRoute><AdminFees /></AdminRoute>} />
          <Route path="/admin/settings-platform" element={<AdminRoute><AdminSettingsNew /></AdminRoute>} />
          <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogs /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUserManagement /></AdminRoute>} />

          {/* Phase 5: Monthly Data Entry & Daily Rates */}
          <Route path="/admin/monthly-data-entry" element={<AdminRoute><MonthlyDataEntry /></AdminRoute>} />
          <Route path="/admin/daily-rates" element={<AdminRoute><DailyRatesManagement /></AdminRoute>} />
          <Route path="/admin/investor-reports" element={<AdminRoute><InvestorReports /></AdminRoute>} />

          {/* Existing Admin Routes */}
          <Route path="/admin/investors" element={<AdminRoute><InvestorManagementView /></AdminRoute>} />
          <Route path="/admin/investors/new" element={<AdminRoute><AdminInvestorNewPage /></AdminRoute>} />
          <Route path="/admin/investors/:id" element={<AdminRoute><AdminInvestorDetailPage /></AdminRoute>} />
          <Route path="/admin/investors/:id/positions" element={<AdminRoute><AdminInvestorPositionsPage /></AdminRoute>} />
          <Route path="/admin/investors/:id/transactions" element={<AdminRoute><AdminInvestorTransactionsPage /></AdminRoute>} />
          <Route path="/admin/expert-investors" element={<AdminRoute><ExpertInvestorMasterView /></AdminRoute>} />
          <Route path="/admin/expert-investor/:id" element={<AdminRoute><ExpertInvestorDashboard /></AdminRoute>} />
          <Route path="/admin/requests" element={<AdminRoute><AdminRequestsQueuePage /></AdminRoute>} />
          <Route path="/admin/statements" element={<AdminRoute><AdminStatementsPage /></AdminRoute>} />
          <Route path="/admin/support" element={<AdminRoute><AdminSupportQueue /></AdminRoute>} />
          <Route path="/admin/documents" element={<AdminRoute><AdminDocumentsPage /></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
          <Route path="/admin/reports/historical" element={<AdminRoute><HistoricalReportsDashboard /></AdminRoute>} />
          <Route path="/admin/withdrawals" element={<AdminRoute><AdminWithdrawalsPage /></AdminRoute>} />
          
          
          {/* Phase 3.1 Admin Features */}
          <Route path="/admin/investors/create" element={<AdminRoute><InvestorAccountCreation /></AdminRoute>} />
          <Route path="/admin/balances/adjust" element={<AdminRoute><BalanceAdjustments /></AdminRoute>} />
          <Route path="/admin/investors/status" element={<AdminRoute><InvestorStatusTracking /></AdminRoute>} />
          <Route path="/admin/fees" element={<AdminRoute><FeeConfigurationManagement /></AdminRoute>} />
          <Route path="/admin/funds" element={<AdminRoute><FundManagement /></AdminRoute>} />
          <Route path="/admin/yield-management" element={<AdminRoute><YieldManagement /></AdminRoute>} />
          <Route path="/admin/audit-drilldown" element={<AdminRoute><AuditDrilldown /></AdminRoute>} />
          <Route path="/admin/setup-aum" element={<AdminRoute><SetupAUMPage /></AdminRoute>} />
          <Route path="/admin/test-yield" element={<AdminRoute><TestYieldPage /></AdminRoute>} />
          
          
          {/* Phase 3.2 Admin Features */}
          <Route path="/admin/pdf-demo" element={<AdminRoute><PDFGenerationDemo /></AdminRoute>} />
          
          {/* Legacy admin routes - redirects to new structure */}
          <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="/admin-investors" element={<Navigate to="/admin/investors" replace />} />
          
          {/* Portfolio route redirects for backward compatibility */}
          <Route path="/portfolio/USDC" element={<Navigate to="/assets/usdc" replace />} />
          <Route path="/portfolio/BTC" element={<Navigate to="/assets/btc" replace />} />
          <Route path="/portfolio/ETH" element={<Navigate to="/assets/eth" replace />} />
          <Route path="/portfolio/SOL" element={<Navigate to="/assets/sol" replace />} />
          <Route path="/portfolio/usdc" element={<Navigate to="/assets/usdc" replace />} />
          <Route path="/portfolio/btc" element={<Navigate to="/assets/btc" replace />} />
          <Route path="/portfolio/eth" element={<Navigate to="/assets/eth" replace />} />
          <Route path="/portfolio/sol" element={<Navigate to="/assets/sol" replace />} />
          
          {/* Keep existing admin tools routes for now */}
          <Route path="/admin-tools" element={<AdminRoute><AdminTools /></AdminRoute>} />
          <Route path="/admin-operations" element={<AdminRoute><AdminOperations /></AdminRoute>} />
          <Route path="/admin/audit" element={<AdminRoute><AdminAudit /></AdminRoute>} />
          
          {/* Deprecated yield management route with redirect */}
          <Route path="/yield-sources" element={<Navigate to="/admin/yield-settings" replace />} />
        </Route>
        
        {/* 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
