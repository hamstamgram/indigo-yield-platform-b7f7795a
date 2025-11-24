import { Route } from "react-router-dom";
import { lazy } from "react";

// Lazy load components
const NotificationCenter = lazy(() => import("@/pages/admin/communications/NotificationCenter"));
const ReportDispatcher = lazy(() => import("@/pages/admin/communications/ReportDispatcher"));

// Admin Route Wrapper
import { AdminRoute } from "@/routing/AdminRoute";

export const CommunicationsRoutes = () => (
  <Route path="admin/communications">
    <Route
      path="notifications"
      element={
        <AdminRoute>
          <NotificationCenter />
        </AdminRoute>
      }
    />
    <Route
      path="reports"
      element={
        <AdminRoute>
          <ReportDispatcher />
        </AdminRoute>
      }
    />
  </Route>
);
