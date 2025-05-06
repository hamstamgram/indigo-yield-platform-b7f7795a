
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Index from './pages/Index';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
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
import { Toaster } from './components/ui/sonner';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminTools from './pages/AdminTools';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        
        {/* Dashboard routes with layout */}
        <Route path="/" element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/assets/:symbol" element={<AssetDetail />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminTools />} />
        </Route>
        
        {/* Other routes */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/strategies" element={<Strategies />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
