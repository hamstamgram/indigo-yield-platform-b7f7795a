/**
 * Admin System Routes
 * System administration: operations, audit logs, settings
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const OperationsPage = lazy(() => import("@/features/admin/system/pages/OperationsPage"));
const AdminAuditLogs = lazy(() => import("@/features/admin/system/pages/AuditLogViewer"));
const AdminSettingsPage = lazy(() => import("@/features/admin/settings/pages/AdminSettings"));

export function SystemRoutes() {
  return (
    <>
      {/* Operations (Health + Integrity + Crystallization) */}
      <Route
        path="/admin/operations"
        element={
          <AdminRoute>
            <OperationsPage />
          </AdminRoute>
        }
      />

      {/* Audit Trail */}
      <Route
        path="/admin/audit-logs"
        element={
          <AdminRoute>
            <AdminAuditLogs />
          </AdminRoute>
        }
      />

      {/* Settings (Platform config + Admin Management) */}
      <Route
        path="/admin/settings"
        element={
          <AdminRoute>
            <AdminSettingsPage />
          </AdminRoute>
        }
      />

      {/* Redirects for old/consolidated routes */}
      <Route path="/admin/system-health" element={<Navigate to="/admin/operations" replace />} />
      <Route path="/admin/integrity" element={<Navigate to="/admin/operations" replace />} />
      <Route path="/admin/crystallization" element={<Navigate to="/admin/operations" replace />} />
      <Route path="/admin/settings/tools" element={<Navigate to="/admin/settings" replace />} />
      <Route path="/admin/settings/admins" element={<Navigate to="/admin/settings" replace />} />
      <Route path="/admin/settings/invites" element={<Navigate to="/admin/settings" replace />} />
      <Route path="/admin/users" element={<Navigate to="/admin/settings" replace />} />
      <Route path="/admin/audit" element={<Navigate to="/admin/audit-logs" replace />} />
      <Route path="/admin/settings/audit" element={<Navigate to="/admin/audit-logs" replace />} />
    </>
  );
}
