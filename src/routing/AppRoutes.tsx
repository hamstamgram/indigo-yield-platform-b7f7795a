/**
 * Main Application Routes
 * Orchestrates all route modules (admin, investor, public)
 */

import { Routes, Route } from "react-router-dom";
import { Suspense } from "react";

// Route modules
import { AdminRoutes } from "./routes/admin";
import { InvestorRoutes } from "./routes/investor";
import { IBUserRoutes } from "./routes/ib";
import { PublicRoutes } from "./routes/public";

// UI Components
import { DashboardLayout } from "@/components/layout";
import { PageLoadingSpinner } from "@/components/ui";

/**
 * Application Routes Component
 *
 * Route Organization:
 * - Public routes: Landing, auth, info pages (16 routes)
 * - Investor routes: Dashboard, portfolio, documents, support, profile, reports (53 routes)
 * - Admin routes: Admin dashboard, investor management, operations (46 routes)
 *
 * Total: 115 routes across 3 modules
 */
export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <Routes>
        {/* Public Routes (no authentication required) */}
        {PublicRoutes()}

        {/* Protected Routes (with DashboardLayout) */}
        <Route path="/" element={<DashboardLayout />}>
          {/* Investor Routes (ProtectedRoute wrapper) */}
          {InvestorRoutes()}

          {/* Admin Routes (AdminRoute wrapper) */}
          {AdminRoutes()}

          {/* IB Routes (IBRoute wrapper) */}
          {IBUserRoutes()}
        </Route>
      </Routes>
    </Suspense>
  );
}
