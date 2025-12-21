/**
 * Public Routes Module
 * All public-accessible routes (no authentication required)
 */

import { Route } from "react-router-dom";
import { lazy } from "react";

// Core pages loaded immediately
import Login from "@/routes/Login";
import NotFound from "@/routes/NotFound";

// Password reset pages
const ForgotPassword = lazy(() => import("@/routes/ForgotPassword"));
const ResetPassword = lazy(() => import("@/routes/ResetPassword"));

// Invite pages (public access for new user setup)
const AdminInvite = lazy(() => import("@/routes/admin/settings/AdminInvite"));
const InvestorInvite = lazy(() => import("@/routes/InvestorInvite"));

// Public info pages
const Terms = lazy(() => import("@/routes/Terms"));
const Privacy = lazy(() => import("@/routes/Privacy"));
const Health = lazy(() => import("@/routes/Health"));
const Status = lazy(() => import("@/routes/Status"));

/**
 * Public Routes Component
 * Exports all public routes (no authentication)
 */
export function PublicRoutes() {
  return (
    <>
      {/* Landing & Authentication */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin-invite" element={<AdminInvite />} />
      <Route path="/investor-invite" element={<InvestorInvite />} />

      {/* Public Info Pages */}
      <Route path="/health" element={<Health />} />
      <Route path="/status" element={<Status />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      {/* 404 route */}
      <Route path="*" element={<NotFound />} />
    </>
  );
}
