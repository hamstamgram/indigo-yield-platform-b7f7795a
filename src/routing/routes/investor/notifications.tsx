/**
 * Notifications Routes
 * Alerts, notifications, and notification management
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

// Notifications pages
const NotificationsPage = lazy(() => import("@/pages/notifications/NotificationsPage"));
const NotificationSettingsPage = lazy(
  () => import("@/pages/notifications/NotificationSettingsPage")
);
const PriceAlertsPage = lazy(() => import("@/pages/notifications/PriceAlertsPage"));
const NotificationHistoryPage = lazy(() => import("@/pages/notifications/NotificationHistoryPage"));
const NotificationDetailPage = lazy(() => import("@/pages/notifications/NotificationDetailPage"));

export function NotificationRoutes() {
  return (
    <>
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications/settings"
        element={
          <ProtectedRoute>
            <NotificationSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications/alerts"
        element={
          <ProtectedRoute>
            <PriceAlertsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications/history"
        element={
          <ProtectedRoute>
            <NotificationHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications/:id"
        element={
          <ProtectedRoute>
            <NotificationDetailPage />
          </ProtectedRoute>
        }
      />
    </>
  );
}
