/**
 * Admin System Routes
 * System administration: settings, audit, users, compliance
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminTools = lazy(() => import("@/routes/admin/settings/AdminTools"));
const AdminInvite = lazy(() => import("@/routes/admin/settings/AdminInvite"));
const AdminSettingsNew = lazy(() => import("@/routes/admin/AdminSettings"));
const AdminAuditLogs = lazy(() => import("@/routes/admin/AdminAuditLogs"));
const AdminAudit = lazy(() => import("@/routes/admin/settings/AdminAudit"));
const AuditDrilldown = lazy(() => import("@/routes/admin/AuditDrilldown"));
const AdminUserManagement = lazy(() => import("@/routes/admin/AdminUserManagement"));
const AdminCompliance = lazy(() => import("@/routes/admin/AdminCompliance"));
const DataIntegrityDashboard = lazy(() => import("@/routes/admin/DataIntegrityDashboard"));
const SystemHealthPage = lazy(
  () => import("@/routes/admin/system-health/SystemHealthPage")
);

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
      <Route
        path="/admin/audit"
        element={
          <AdminRoute>
            <AdminAudit />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/audit-drilldown"
        element={
          <AdminRoute>
            <AuditDrilldown />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/compliance"
        element={
          <AdminRoute>
            <AdminCompliance />
          </AdminRoute>
        }
      />

      {/* Data integrity */}
      <Route
        path="/admin/data-integrity"
        element={
          <AdminRoute>
            <DataIntegrityDashboard />
          </AdminRoute>
        }
      />

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

      {/* Admin tools */}
      <Route
        path="/admin-tools"
        element={
          <AdminRoute>
            <AdminTools />
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
