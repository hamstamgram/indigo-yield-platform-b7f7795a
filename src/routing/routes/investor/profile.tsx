/**
 * Profile Routes
 * User profile, personal information, security, and preferences
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

// Profile pages
const ProfileSettings = lazy(() => import("@/routes/profile/ProfileSettings"));
const ProfileSecurity = lazy(() => import("@/routes/profile/Security"));
const KYCVerification = lazy(() => import("@/routes/profile/KYCVerification"));

export function ProfileRoutes() {
  return (
    <>
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfileSettings />
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
