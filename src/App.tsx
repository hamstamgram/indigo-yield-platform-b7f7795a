
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import './App.css';
import { initSentry } from './utils/monitoring/sentry';
import { initPostHog } from './utils/analytics/posthog';

// Core pages loaded immediately
import Index from './pages/Index';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// Lazy load heavy components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EnhancedDashboard = lazy(() => import('./pages/EnhancedDashboard'));
const StatementsPage = lazy(() => import('./pages/StatementsPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const AssetDetail = lazy(() => import('./pages/AssetDetail'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Contact = lazy(() => import('./pages/Contact'));
const About = lazy(() => import('./pages/About'));
const Strategies = lazy(() => import('./pages/Strategies'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Health = lazy(() => import('./pages/Health'));
const Status = lazy(() => import('./pages/Status'));
const OnboardingWizard = lazy(() => import('./components/onboarding/OnboardingWizard'));

// UI Components
import { Toaster } from './components/ui/sonner';
import DashboardLayout from './components/layout/DashboardLayout';
import { CookieConsent } from './components/privacy/CookieConsent';
import { InstallPrompt } from './components/pwa/InstallPrompt';
import { InstallPrompt as SimpleInstallPrompt } from './pwa/installPrompt';
import RequireAdmin from './components/auth/RequireAdmin';
import { PageLoadingSpinner } from './components/ui/loading-spinner';

// Admin pages - lazy load all
const AdminTools = lazy(() => import('./pages/AdminTools'));
const AdminInvite = lazy(() => import('./pages/AdminInvite'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const PortfolioDashboard = lazy(() => import('./pages/admin/PortfolioDashboard'));
const AdminPortfolioDashboard = lazy(() => import('./pages/admin/AdminPortfolioDashboard'));
const AdminInvestors = lazy(() => import('./pages/admin/AdminInvestors'));
const InvestorDetail = lazy(() => import('./pages/admin/InvestorDetail'));
const YieldSettings = lazy(() => import('./pages/admin/YieldSettings'));
const YieldSourcesManagement = lazy(() => import('./pages/YieldSourcesManagement'));
const AdminOperations = lazy(() => import('./pages/AdminOperations'));
const AdminAudit = lazy(() => import('./pages/AdminAudit'));

// LP Pages - lazy load all
const WithdrawalsPage = lazy(() => import('./pages/WithdrawalsPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const SupportTicketsPage = lazy(() => import('./pages/SupportTicketsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const PortfolioAnalyticsPage = lazy(() => import('./pages/PortfolioAnalyticsPage'));
const SessionManagementPage = lazy(() => import('./pages/SessionManagementPage'));
const ProfileSettingsPage = lazy(() => import('./pages/settings/ProfileSettingsPage'));
const NotificationSettingsPage = lazy(() => import('./pages/settings/NotificationSettingsPage'));
const SecuritySettings = lazy(() => import('./pages/settings/SecuritySettings'));
const DocumentsVault = lazy(() => import('./pages/documents/DocumentsVault'));
const Support = lazy(() => import('./pages/support/Support'));

// Admin Pages - lazy load all
const AdminInvestorNewPage = lazy(() => import('./pages/admin/investors/AdminInvestorNewPage'));
const AdminInvestorDetailPage = lazy(() => import('./pages/admin/investors/AdminInvestorDetailPage'));
const AdminInvestorPositionsPage = lazy(() => import('./pages/admin/investors/AdminInvestorPositionsPage'));
const AdminInvestorTransactionsPage = lazy(() => import('./pages/admin/investors/AdminInvestorTransactionsPage'));
const AdminYieldSettingsPage = lazy(() => import('./pages/admin/AdminYieldSettingsPage'));
const AdminRequestsQueuePage = lazy(() => import('./pages/admin/AdminRequestsQueuePage'));
const AdminStatementsPage = lazy(() => import('./pages/admin/AdminStatementsPage'));
const AdminSupportQueuePage = lazy(() => import('./pages/admin/AdminSupportQueuePage'));
const AdminDocumentsPage = lazy(() => import('./pages/admin/AdminDocumentsPage'));
const AdminBatchReportsPage = lazy(() => import('./pages/admin/AdminBatchReportsPage'));
const AdminWithdrawalsPage = lazy(() => import('./pages/admin/AdminWithdrawalsPage'));
const ExcelImportFirstRun = lazy(() => import('./pages/admin/ExcelImportFirstRun'));

// Lazy load complex admin components
const InvestorAccountCreation = lazy(() => import('./pages/admin/InvestorAccountCreation').then(m => ({ default: m.InvestorAccountCreation })));
const BalanceAdjustments = lazy(() => import('./pages/admin/BalanceAdjustments').then(m => ({ default: m.BalanceAdjustments })));
const InvestorStatusTracking = lazy(() => import('./pages/admin/InvestorStatusTracking').then(m => ({ default: m.InvestorStatusTracking })));
const FeeConfigurationManagement = lazy(() => import('./pages/admin/FeeConfigurationManagement').then(m => ({ default: m.FeeConfigurationManagement })));
const YieldSettingsManagement = lazy(() => import('./pages/admin/YieldSettingsManagement').then(m => ({ default: m.YieldSettingsManagement })));
const AuditDrilldown = lazy(() => import('./pages/admin/AuditDrilldown').then(m => ({ default: m.AuditDrilldown })));

// PDF Generation Demo - lazy load
const PDFGenerationDemo = lazy(() => import('./components/pdf/PDFGenerationDemo').then(m => ({ default: m.PDFGenerationDemo })));

function App() {
  // Initialize observability tools on app startup
  useEffect(() => {
    // Initialize error tracking
    initSentry();
    
    // Initialize analytics
    initPostHog();
    
    console.log('🚀 Indigo Yield Platform initialized with observability');
  }, []);

  return (
    <Router>
      <Suspense fallback={<PageLoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<OnboardingWizard />} />
          <Route path="/admin-invite" element={<AdminInvite />} />
        
        {/* Dashboard routes with layout */}
        <Route path="/" element={<DashboardLayout />}>
          {/* LP Dashboard route */}
          <Route path="/dashboard" element={<EnhancedDashboard />} />
          
          {/* LP Routes */}
          <Route path="/withdrawals" element={<WithdrawalsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/support-tickets" element={<SupportTicketsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/portfolio/analytics" element={<PortfolioAnalyticsPage />} />
          <Route path="/settings/sessions" element={<SessionManagementPage />} />
          <Route path="/settings/profile" element={<ProfileSettingsPage />} />
          <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
          <Route path="/settings/security" element={<SecuritySettings />} />
          <Route path="/documents" element={<DocumentsVault />} />
          
          {/* Admin routes - all protected with RequireAdmin */}
          <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="/admin/portfolio" element={<RequireAdmin><PortfolioDashboard /></RequireAdmin>} />
          <Route path="/admin/portfolio-dashboard" element={<RequireAdmin><AdminPortfolioDashboard /></RequireAdmin>} />
          <Route path="/admin/yield-settings" element={<RequireAdmin><AdminYieldSettingsPage /></RequireAdmin>} />
          <Route path="/admin/investors" element={<RequireAdmin><AdminInvestors /></RequireAdmin>} />
          <Route path="/admin/investors/new" element={<RequireAdmin><AdminInvestorNewPage /></RequireAdmin>} />
          <Route path="/admin/investors/:id" element={<RequireAdmin><AdminInvestorDetailPage /></RequireAdmin>} />
          <Route path="/admin/investors/:id/positions" element={<RequireAdmin><AdminInvestorPositionsPage /></RequireAdmin>} />
          <Route path="/admin/investors/:id/transactions" element={<RequireAdmin><AdminInvestorTransactionsPage /></RequireAdmin>} />
          <Route path="/admin/requests" element={<RequireAdmin><AdminRequestsQueuePage /></RequireAdmin>} />
          <Route path="/admin/statements" element={<RequireAdmin><AdminStatementsPage /></RequireAdmin>} />
          <Route path="/admin/support" element={<RequireAdmin><AdminSupportQueuePage /></RequireAdmin>} />
          <Route path="/admin/documents" element={<RequireAdmin><AdminDocumentsPage /></RequireAdmin>} />
          <Route path="/admin/reports" element={<RequireAdmin><AdminBatchReportsPage /></RequireAdmin>} />
          <Route path="/admin/withdrawals" element={<RequireAdmin><AdminWithdrawalsPage /></RequireAdmin>} />
          <Route path="/admin/excel-first-run" element={<RequireAdmin><ExcelImportFirstRun /></RequireAdmin>} />
          
          {/* Phase 3.1 Admin Features */}
          <Route path="/admin/investors/create" element={<RequireAdmin><InvestorAccountCreation /></RequireAdmin>} />
          <Route path="/admin/balances/adjust" element={<RequireAdmin><BalanceAdjustments /></RequireAdmin>} />
          <Route path="/admin/investors/status" element={<RequireAdmin><InvestorStatusTracking /></RequireAdmin>} />
          <Route path="/admin/fees" element={<RequireAdmin><FeeConfigurationManagement /></RequireAdmin>} />
          <Route path="/admin/yield" element={<RequireAdmin><YieldSettingsManagement /></RequireAdmin>} />
          <Route path="/admin/audit-drilldown" element={<RequireAdmin><AuditDrilldown /></RequireAdmin>} />
          
          {/* Phase 3.2 Admin Features */}
          <Route path="/admin/pdf-demo" element={<RequireAdmin><PDFGenerationDemo /></RequireAdmin>} />
          
          {/* Legacy admin routes - redirects to new structure */}
          <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="/admin-investors" element={<Navigate to="/admin/investors" replace />} />
          
          {/* Other existing routes */}
          <Route path="/statements" element={<StatementsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/assets/:symbol" element={<AssetDetail />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          
          {/* Keep existing admin tools routes for now */}
          <Route path="/admin-tools" element={<RequireAdmin><AdminTools /></RequireAdmin>} />
          <Route path="/admin-operations" element={<RequireAdmin><AdminOperations /></RequireAdmin>} />
          <Route path="/admin/audit" element={<RequireAdmin><AdminAudit /></RequireAdmin>} />
          
          {/* Deprecated yield management route with redirect */}
          <Route path="/yield-sources" element={<Navigate to="/admin/yield-settings" replace />} />
        </Route>
        
        {/* Other routes */}
        <Route path="/health" element={<Health />} />
        <Route path="/status" element={<Status />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/strategies" element={<Strategies />} />
        <Route path="/faq" element={<FAQ />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster />
      <CookieConsent />
      <SimpleInstallPrompt />
    </Router>
  );
}

export default App;
