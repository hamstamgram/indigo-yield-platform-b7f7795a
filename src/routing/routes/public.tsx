/**
 * Public Routes Module
 * All public-accessible routes (no authentication required)
 */

import { Route } from "react-router-dom";
import { lazy } from "react";

// Core pages loaded immediately
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

// Password reset pages
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));

// Invite pages (public access for new user setup)
const AdminInvite = lazy(() => import("@/pages/admin/settings/AdminInvite"));
const AdminInviteCallback = lazy(() => import("@/pages/AdminInviteCallback"));
const InvestorInvite = lazy(() => import("@/pages/InvestorInvite"));

// Public info pages
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Health = lazy(() => import("@/pages/Health"));
const Status = lazy(() => import("@/pages/Status"));

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
      <Route path="/admin-invite-callback" element={<AdminInviteCallback />} />
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
