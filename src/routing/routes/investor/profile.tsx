/**
 * Profile Routes
 * User profile, personal information, security, and preferences
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

// Profile pages
const ProfileOverview = lazy(() => import("@/pages/profile/ProfileOverview"));
const PersonalInfo = lazy(() => import("@/pages/profile/PersonalInfo"));
const ProfileSecurity = lazy(() => import("@/pages/profile/Security"));
const Preferences = lazy(() => import("@/pages/profile/Preferences"));
const ProfilePrivacy = lazy(() => import("@/pages/profile/Privacy"));
const LinkedAccounts = lazy(() => import("@/pages/profile/LinkedAccounts"));
const KYCVerification = lazy(() => import("@/pages/profile/KYCVerification"));

export function ProfileRoutes() {
  return (
    <>
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfileOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/personal-info"
        element={
          <ProtectedRoute>
            <PersonalInfo />
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
        path="/profile/preferences"
        element={
          <ProtectedRoute>
            <Preferences />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/privacy"
        element={
          <ProtectedRoute>
            <ProfilePrivacy />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/linked-accounts"
        element={
          <ProtectedRoute>
            <LinkedAccounts />
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
