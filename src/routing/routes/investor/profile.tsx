/**
 * Profile Routes
 * User profile, personal information, security, and preferences
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

// Profile pages
const ProfilePage = lazy(() => import("@/routes/profile/ProfilePage"));
const ProfileSecurity = lazy(() => import("@/routes/profile/Security"));
const KYCVerification = lazy(() => import("@/routes/profile/KYCVerification"));

export function ProfileRoutes() {
  return (
    <>
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/security"
        element={
          <ProtectedRoute>
            <ProfileSecurity />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/kyc-verification"
        element={
          <ProtectedRoute>
            <KYCVerification />
          </ProtectedRoute>
        }
      />
    </>
  );
}
