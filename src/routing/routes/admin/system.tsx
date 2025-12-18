/**
 * Admin System Routes
 * System administration: settings, audit, users, compliance
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminInvite = lazy(() => import("@/routes/admin/settings/AdminInvite"));
const AdminSettingsNew = lazy(() => import("@/routes/admin/AdminSettings"));
const AdminAuditLogs = lazy(() => import("@/routes/admin/AdminAuditLogs"));
const AdminUserManagement = lazy(() => import("@/routes/admin/AdminUserManagement"));
const SystemHealthPage = lazy(() => import("@/routes/admin/system-health/SystemHealthPage"));

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

      {/* Audit & compliance */}
      <Route
        path="/admin/audit-logs"
        element={
          <AdminRoute>
            <AdminAuditLogs />
          </AdminRoute>
        }
      />
      
      {/* Redirect old audit route to consolidated audit-logs */}
      <Route path="/admin/audit" element={<Navigate to="/admin/audit-logs" replace />} />

      {/* System Health */}
      <Route
        path="/admin/system-health"
        element={
          <AdminRoute>
            <SystemHealthPage />
          </AdminRoute>
        }
      />

      {/* User management */}
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUserManagement />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/invite"
        element={
          <AdminRoute>
            <AdminInvite />
          </AdminRoute>
        }
      />
    </>
  );
}
