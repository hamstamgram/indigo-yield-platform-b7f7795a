/**
 * Admin System Routes
 * System administration: settings, audit logs
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminSettingsNew = lazy(() => import("@/routes/admin/AdminSettings"));
const AdminAuditLogs = lazy(() => import("@/routes/admin/AdminAuditLogs"));

export function SystemRoutes() {
  return (
    <>
      {/* Settings */}
      <Route
        path="/admin/settings-platform"
        element={
          <AdminRoute>
            <AdminSettingsNew />
          </AdminRoute>
        }
      />

      {/* Audit logs */}
      <Route
        path="/admin/audit-logs"
        element={
          <AdminRoute>
            <AdminAuditLogs />
          </AdminRoute>
        }
      />

      {/* Redirects for consolidated/removed pages */}
      <Route path="/admin/audit" element={<Navigate to="/admin/audit-logs" replace />} />
      <Route path="/admin/users" element={<Navigate to="/admin/settings-platform" replace />} />
      <Route path="/admin/system-health" element={<Navigate to="/admin" replace />} />
      <Route path="/admin/invite" element={<Navigate to="/admin/investors" replace />} />
    </>
  );
}
