/**
 * Notifications Routes
 * Alerts, notifications, and notification management
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

// Notifications pages
const NotificationsPage = lazy(() => import("@/routes/notifications/NotificationsPage"));
const NotificationSettingsPage = lazy(
  () => import("@/routes/notifications/NotificationSettingsPage")
);
const PriceAlertsPage = lazy(() => import("@/routes/notifications/PriceAlertsPage"));
const NotificationHistoryPage = lazy(() => import("@/routes/notifications/NotificationHistoryPage"));
const NotificationDetailPage = lazy(() => import("@/routes/notifications/NotificationDetailPage"));

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
