import { lazy } from 'react';
import { RouteSuspense } from './RouteSuspense';

// Lazy load main pages
export const Dashboard = lazy(() => import('@/pages/Dashboard'));
export const TransactionsPage = lazy(() => import('@/pages/TransactionsPage'));
export const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
export const Login = lazy(() => import('@/pages/Login'));
export const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

// Lazy load admin pages
export const AdminInvestors = lazy(() => import('@/pages/admin/AdminInvestors'));
export const AdminWithdrawalsPage = lazy(() => import('@/pages/admin/AdminWithdrawalsPage'));

// Lazy load other pages
export const Contact = lazy(() => import('@/pages/Contact'));
export const Privacy = lazy(() => import('@/pages/Privacy'));
export const Terms = lazy(() => import('@/pages/Terms'));
export const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
export const ResetPassword = lazy(() => import('@/pages/ResetPassword'));

// Wrapper components with appropriate loading states
export const LazyDashboard = () => (
  <RouteSuspense type="dashboard">
    <Dashboard />
  </RouteSuspense>
);

export const LazyAdminDashboard = () => (
  <RouteSuspense type="admin">
    <AdminDashboard />
  </RouteSuspense>
);

export const LazyAdminInvestors = () => (
  <RouteSuspense type="admin">
    <AdminInvestors />
  </RouteSuspense>
);

export const LazyAdminWithdrawals = () => (
  <RouteSuspense type="admin">
    <AdminWithdrawalsPage />
  </RouteSuspense>
);

export const LazyTransactions = () => (
  <RouteSuspense>
    <TransactionsPage />
  </RouteSuspense>
);

export const LazyLogin = () => (
  <RouteSuspense>
    <Login />
  </RouteSuspense>
);

export const LazySettings = () => (
  <RouteSuspense>
    <SettingsPage />
  </RouteSuspense>
);

export const LazyContact = () => (
  <RouteSuspense>
    <Contact />
  </RouteSuspense>
);

export const LazyPrivacy = () => (
  <RouteSuspense>
    <Privacy />
  </RouteSuspense>
);

export const LazyTerms = () => (
  <RouteSuspense>
    <Terms />
  </RouteSuspense>
);

export const LazyForgotPassword = () => (
  <RouteSuspense>
    <ForgotPassword />
  </RouteSuspense>
);

export const LazyResetPassword = () => (
  <RouteSuspense>
    <ResetPassword />
  </RouteSuspense>
);