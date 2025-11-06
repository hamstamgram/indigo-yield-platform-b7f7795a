/**
 * Admin System Routes
 * System administration: settings, audit, users, compliance
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminTools = lazy(() => import("@/pages/admin/settings/AdminTools"));
const AdminInvite = lazy(() => import("@/pages/admin/settings/AdminInvite"));
const AdminSettingsNew = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminAuditLogs = lazy(() => import("@/pages/admin/AdminAuditLogs"));
const AdminAudit = lazy(() => import("@/pages/admin/settings/AdminAudit"));
const AuditDrilldown = lazy(() => import("@/pages/admin/AuditDrilldown"));
const AdminUserManagement = lazy(() => import("@/pages/admin/AdminUserManagement"));
const AdminCompliance = lazy(() => import("@/pages/admin/AdminCompliance"));

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
