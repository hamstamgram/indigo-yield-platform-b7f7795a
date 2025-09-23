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
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const EnhancedDashboard = lazy(() => import('@/pages/EnhancedDashboard'));
const StatementsPage = lazy(() => import('@/pages/StatementsPage'));
const TransactionsPage = lazy(() => import('@/pages/TransactionsPage'));
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'));
const AssetDetail = lazy(() => import('@/pages/AssetDetail'));
const AccountPage = lazy(() => import('@/pages/AccountPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
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
const AdminTools = lazy(() => import('@/pages/AdminTools'));
const AdminInvite = lazy(() => import('@/pages/AdminInvite'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const PortfolioDashboard = lazy(() => import('@/pages/admin/PortfolioDashboard'));
const AdminPortfolioDashboard = lazy(() => import('@/pages/admin/AdminPortfolioDashboard'));
const InvestorManagementView = lazy(() => import('@/components/admin/InvestorManagementView'));
const InvestorDetail = lazy(() => import('@/pages/admin/InvestorDetail'));
const AdminOperations = lazy(() => import('@/pages/AdminOperations'));
const AdminAudit = lazy(() => import('@/pages/AdminAudit'));

// LP Pages - lazy load all
const WithdrawalsPage = lazy(() => import('@/pages/WithdrawalsPage'));
const SupportPage = lazy(() => import('@/pages/SupportPage'));
const SupportTicketsPage = lazy(() => import('@/pages/SupportTicketsPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const PortfolioAnalyticsPage = lazy(() => import('@/pages/PortfolioAnalyticsPage'));
const SessionManagementPage = lazy(() => import('@/pages/SessionManagementPage'));
const ProfileSettingsPage = lazy(() => import('@/pages/settings/ProfileSettingsPage'));
const NotificationSettingsPage = lazy(() => import('@/pages/settings/NotificationSettingsPage'));
const SecuritySettings = lazy(() => import('@/pages/settings/SecuritySettings'));
const DocumentsVault = lazy(() => import('@/pages/documents/DocumentsVault'));
const Support = lazy(() => import('@/pages/support/Support'));

// Admin Pages - lazy load all
const AdminInvestorNewPage = lazy(() => import('@/pages/admin/investors/AdminInvestorNewPage'));
const AdminInvestorDetailPage = lazy(() => import('@/pages/admin/investors/AdminInvestorDetailPage'));
const AdminInvestorPositionsPage = lazy(() => import('@/pages/admin/investors/AdminInvestorPositionsPage'));
const AdminInvestorTransactionsPage = lazy(() => import('@/pages/admin/investors/AdminInvestorTransactionsPage'));
const AdminYieldSettingsPage = lazy(() => import('@/pages/admin/AdminYieldSettingsPage'));
const AdminRequestsQueuePage = lazy(() => import('@/pages/admin/AdminRequestsQueuePage'));
const AdminStatementsPage = lazy(() => import('@/pages/admin/AdminStatementsPage'));
const AdminSupportQueue = lazy(() => import('@/pages/admin/AdminSupportQueue'));
const AdminReports = lazy(() => import('@/pages/admin/AdminReports'));
const AdminDocumentsPage = lazy(() => import('@/pages/admin/AdminDocumentsPage'));
const HistoricalReportsDashboard = lazy(() => import('@/components/admin/investors/HistoricalReportsDashboard'));
const AdminBatchReportsPage = lazy(() => import('@/pages/admin/AdminBatchReportsPage'));
const AdminWithdrawalsPage = lazy(() => import('@/pages/admin/AdminWithdrawalsPage'));
const ExcelImportFirstRun = lazy(() => import('@/pages/admin/ExcelImportFirstRun'));

// Lazy load complex admin components
const InvestorAccountCreation = lazy(() => import('@/pages/admin/InvestorAccountCreation').then(m => ({ default: m.InvestorAccountCreation })));
const BalanceAdjustments = lazy(() => import('@/pages/admin/BalanceAdjustments').then(m => ({ default: m.BalanceAdjustments })));
const InvestorStatusTracking = lazy(() => import('@/pages/admin/InvestorStatusTracking').then(m => ({ default: m.InvestorStatusTracking })));
const FeeConfigurationManagement = lazy(() => import('@/pages/admin/FeeConfigurationManagement').then(m => ({ default: m.FeeConfigurationManagement })));
const YieldSettings = lazy(() => import('@/pages/admin/YieldSettings'));
const AuditDrilldown = lazy(() => import('@/pages/admin/AuditDrilldown'));

// PDF Generation Demo - lazy load
const PDFGenerationDemo = lazy(() => import('@/components/pdf/PDFGenerationDemo').then(m => ({ default: m.PDFGenerationDemo })));

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
          {/* LP Dashboard route - protected */}
          <Route path="/dashboard" element={<ProtectedRoute><EnhancedDashboard /></ProtectedRoute>} />
          
          {/* LP Routes - all protected */}
          <Route path="/withdrawals" element={<ProtectedRoute><WithdrawalsPage /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
          <Route path="/support-tickets" element={<ProtectedRoute><SupportTicketsPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/portfolio/analytics" element={<ProtectedRoute><PortfolioAnalyticsPage /></ProtectedRoute>} />
          <Route path="/settings/sessions" element={<ProtectedRoute><SessionManagementPage /></ProtectedRoute>} />
          <Route path="/settings/profile" element={<ProtectedRoute><ProfileSettingsPage /></ProtectedRoute>} />
          <Route path="/settings/notifications" element={<ProtectedRoute><NotificationSettingsPage /></ProtectedRoute>} />
          <Route path="/settings/security" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><DocumentsVault /></ProtectedRoute>} />
          
          {/* Other existing routes - protected */}
          <Route path="/statements" element={<ProtectedRoute><StatementsPage /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
          <Route path="/assets/:symbol" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          
          {/* Admin routes - all protected with AdminRoute */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/portfolio" element={<AdminRoute><PortfolioDashboard /></AdminRoute>} />
          <Route path="/admin/portfolio-dashboard" element={<AdminRoute><AdminPortfolioDashboard /></AdminRoute>} />
          <Route path="/admin/yield-settings" element={<Navigate to="/admin/yield" replace />} />
          <Route path="/admin/investors" element={<AdminRoute><InvestorManagementView /></AdminRoute>} />
          <Route path="/admin/investors/new" element={<AdminRoute><AdminInvestorNewPage /></AdminRoute>} />
          <Route path="/admin/investors/:id" element={<AdminRoute><AdminInvestorDetailPage /></AdminRoute>} />
          <Route path="/admin/investors/:id/positions" element={<AdminRoute><AdminInvestorPositionsPage /></AdminRoute>} />
          <Route path="/admin/investors/:id/transactions" element={<AdminRoute><AdminInvestorTransactionsPage /></AdminRoute>} />
          <Route path="/admin/requests" element={<AdminRoute><AdminRequestsQueuePage /></AdminRoute>} />
          <Route path="/admin/statements" element={<AdminRoute><AdminStatementsPage /></AdminRoute>} />
          <Route path="/admin/support" element={<AdminRoute><AdminSupportQueue /></AdminRoute>} />
          <Route path="/admin/documents" element={<AdminRoute><AdminDocumentsPage /></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
          <Route path="/admin/reports/historical" element={<AdminRoute><HistoricalReportsDashboard /></AdminRoute>} />
          <Route path="/admin/withdrawals" element={<AdminRoute><AdminWithdrawalsPage /></AdminRoute>} />
          <Route path="/admin/excel-first-run" element={<AdminRoute><ExcelImportFirstRun /></AdminRoute>} />
          
          {/* Phase 3.1 Admin Features */}
          <Route path="/admin/investors/create" element={<AdminRoute><InvestorAccountCreation /></AdminRoute>} />
          <Route path="/admin/balances/adjust" element={<AdminRoute><BalanceAdjustments /></AdminRoute>} />
          <Route path="/admin/investors/status" element={<AdminRoute><InvestorStatusTracking /></AdminRoute>} />
          <Route path="/admin/fees" element={<AdminRoute><FeeConfigurationManagement /></AdminRoute>} />
          <Route path="/admin/yield" element={<AdminRoute><YieldSettings /></AdminRoute>} />
          <Route path="/admin/audit-drilldown" element={<AdminRoute><AuditDrilldown /></AdminRoute>} />
          
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
