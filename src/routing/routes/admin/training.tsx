/**
 * Training Routes Module
 * Admin onboarding and training routes
 */

import { Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AdminRoute } from "@/routing/AdminRoute";
import { PageLoadingSpinner } from "@/components/ui";

const AdminOnboardingPage = lazy(
  () => import("@/features/admin/investors/pages/AdminOnboardingPage")
);

/**
 * Training Routes
 * - /admin/onboarding - Institutional Admin Training Guide
 */
export function TrainingRoutes() {
  return (
    <Route
      path="/admin/onboarding"
      element={
        <AdminRoute>
          <Suspense fallback={<PageLoadingSpinner />}>
            <AdminOnboardingPage />
          </Suspense>
        </AdminRoute>
      }
    />
  );
}
