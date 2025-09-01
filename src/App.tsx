
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Index from './pages/Index';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EnhancedDashboard from './pages/EnhancedDashboard';
import StatementsPage from './pages/StatementsPage';
import TransactionsPage from './pages/TransactionsPage';
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
import AdminDashboard from './pages/AdminDashboard';
import AdminInvestors from './pages/AdminInvestors';
import AdminOperations from './pages/AdminOperations';
import AdminAudit from './pages/AdminAudit';
import Status from './pages/Status';
import { CookieConsent } from './components/privacy/CookieConsent';
import { InstallPrompt } from './components/pwa/InstallPrompt';
import { InstallPrompt as SimpleInstallPrompt } from './pwa/installPrompt';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-invite" element={<AdminInvite />} />
        
        {/* Dashboard routes with layout */}
        <Route path="/" element={<DashboardLayout />}>
          <Route path="/dashboard" element={<EnhancedDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/statements" element={<StatementsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/admin-investors" element={<AdminInvestors />} />
          <Route path="/assets/:symbol" element={<AssetDetail />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminTools />} />
          <Route path="/admin-operations" element={<AdminOperations />} />
          <Route path="/admin/audit" element={<AdminAudit />} />
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
