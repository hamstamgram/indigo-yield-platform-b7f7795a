/**
 * Public Routes Module
 * All public-accessible routes (no authentication required)
 */

import { Route } from "react-router-dom";
import { lazy } from "react";

// Core pages loaded immediately
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

// Password reset pages
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));

// Admin invite (public access for new admin setup)
const AdminInvite = lazy(() => import("@/pages/admin/settings/AdminInvite"));

// Public info pages
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Contact = lazy(() => import("@/pages/Contact"));
const About = lazy(() => import("@/pages/About"));
const Strategies = lazy(() => import("@/pages/Strategies"));
const FAQ = lazy(() => import("@/pages/FAQ"));
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
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin-invite" element={<AdminInvite />} />

      {/* Public Info Pages */}
      <Route path="/health" element={<Health />} />
      <Route path="/status" element={<Status />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/about" element={<About />} />
      <Route path="/strategies" element={<Strategies />} />
      <Route path="/faq" element={<FAQ />} />

      {/* 404 route */}
      <Route path="*" element={<NotFound />} />
    </>
  );
}
