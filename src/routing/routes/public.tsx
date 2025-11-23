/**
 * Public Routes Module
 * All public-accessible routes (no authentication required)
 */

import { Route } from "react-router-dom";
import { lazy } from "react";

// Core pages loaded immediately
import Index from "@/routes/Index";
import Login from "@/routes/Login";
import NotFound from "@/routes/NotFound";

// Password reset pages
const ForgotPassword = lazy(() => import("@/routes/ForgotPassword"));
const ResetPassword = lazy(() => import("@/routes/ResetPassword"));

// Admin invite (public access for new admin setup)
const AdminInvite = lazy(() => import("@/routes/admin/settings/AdminInvite"));

// Public info pages
const Terms = lazy(() => import("@/routes/Terms"));
const Privacy = lazy(() => import("@/routes/Privacy"));
const Contact = lazy(() => import("@/routes/Contact"));
const About = lazy(() => import("@/routes/About"));
const Strategies = lazy(() => import("@/routes/Strategies"));
const FAQ = lazy(() => import("@/routes/FAQ"));
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
