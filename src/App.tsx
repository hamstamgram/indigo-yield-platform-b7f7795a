
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import './App.css';
import { initSentry } from './utils/monitoring/sentry';
import { initPostHog } from './utils/analytics/posthog';
import Index from './pages/Index';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EnhancedDashboard from './pages/EnhancedDashboard';
import StatementsPage from './pages/StatementsPage';
import TransactionsPage from './pages/TransactionsPage';
import DocumentsPage from './pages/DocumentsPage';
import NotFound from './pages/NotFound';
import AssetDetail from './pages/AssetDetail';
import AccountPage from './pages/AccountPage';
import SettingsPage from './pages/SettingsPage';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Contact from './pages/Contact';
import About from './pages/About';
import Strategies from './pages/Strategies';
import FAQ from './pages/FAQ';
import Health from './pages/Health';
import { Toaster } from './components/ui/sonner';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminTools from './pages/AdminTools';
import AdminInvite from './pages/AdminInvite';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminInvestors from './pages/admin/AdminInvestors';
import InvestorDetail from './pages/admin/InvestorDetail';
import YieldSettings from './pages/admin/YieldSettings';
import YieldSourcesManagement from './pages/YieldSourcesManagement';
import AdminOperations from './pages/AdminOperations';
import AdminAudit from './pages/AdminAudit';
import Status from './pages/Status';
import { CookieConsent } from './components/privacy/CookieConsent';
import { InstallPrompt } from './components/pwa/InstallPrompt';
import { InstallPrompt as SimpleInstallPrompt } from './pwa/installPrompt';
import RequireAdmin from './components/auth/RequireAdmin';
import OnboardingWizard from './components/onboarding/OnboardingWizard';

// LP Pages
import WithdrawalsPage from './pages/WithdrawalsPage';
import SupportPage from './pages/SupportPage';
import SupportTicketsPage from './pages/SupportTicketsPage';
import NotificationsPage from './pages/NotificationsPage';
import PortfolioAnalyticsPage from './pages/PortfolioAnalyticsPage';
import SessionManagementPage from './pages/SessionManagementPage';
import ProfileSettingsPage from './pages/settings/ProfileSettingsPage';
import NotificationSettingsPage from './pages/settings/NotificationSettingsPage';
import SecuritySettings from './pages/settings/SecuritySettings';
import DocumentsVault from './pages/documents/DocumentsVault';
import Support from './pages/support/Support';

// Admin Pages
import AdminInvestorNewPage from './pages/admin/investors/AdminInvestorNewPage';
import AdminInvestorDetailPage from './pages/admin/investors/AdminInvestorDetailPage';
import AdminInvestorPositionsPage from './pages/admin/investors/AdminInvestorPositionsPage';
import AdminInvestorTransactionsPage from './pages/admin/investors/AdminInvestorTransactionsPage';
import AdminYieldSettingsPage from './pages/admin/AdminYieldSettingsPage';
import AdminRequestsQueuePage from './pages/admin/AdminRequestsQueuePage';
import AdminStatementsPage from './pages/admin/AdminStatementsPage';
import AdminSupportQueuePage from './pages/admin/AdminSupportQueuePage';
import AdminDocumentsPage from './pages/admin/AdminDocumentsPage';
import AdminBatchReportsPage from './pages/admin/AdminBatchReportsPage';
import { InvestorAccountCreation } from './pages/admin/InvestorAccountCreation';
import { BalanceAdjustments } from './pages/admin/BalanceAdjustments';
import { InvestorStatusTracking } from './pages/admin/InvestorStatusTracking';
import { FeeConfigurationManagement } from './pages/admin/FeeConfigurationManagement';
import { YieldSettingsManagement } from './pages/admin/YieldSettingsManagement';
import { AuditDrilldown } from './pages/admin/AuditDrilldown';

// PDF Generation Demo
import { PDFGenerationDemo } from './components/pdf/PDFGenerationDemo';

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
      <Toaster />
      <CookieConsent />
      <SimpleInstallPrompt />
    </Router>
  );
}

export default App;
