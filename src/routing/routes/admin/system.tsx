/**
 * Admin System Routes
 * System administration: settings, audit logs, maintenance, admin management
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminSettingsPage = lazy(() => import("@/features/admin/settings/pages/AdminSettings"));
const AdminAuditLogs = lazy(() => import("@/features/admin/system/pages/AuditLogViewer"));
const AdminListPage = lazy(() => import("@/features/admin/settings/pages/AdminList"));
const AdminToolsPage = lazy(() => import("@/features/admin/settings/pages/AdminToolsPage"));
const AdminInvitesPage = lazy(() => import("@/features/admin/settings/pages/AdminInvitesPage"));
const SystemHealthPage = lazy(() => import("@/features/admin/system/pages/SystemHealthPage"));
const IntegrityDashboardPage = lazy(
  () => import("@/features/admin/system/pages/IntegrityDashboardPage")
);
const CrystallizationDashboardPage = lazy(
  () => import("@/features/admin/yields/pages/CrystallizationDashboardPage")
);

export function SystemRoutes() {
  return (
    <>
      {/* Consolidated Settings Page */}
      <Route
        path="/admin/settings"
        element={
          <AdminRoute>
            <AdminSettingsPage />
          </AdminRoute>
        }
      />

      {/* Admin Management - Super Admin only (enforced in component) */}
      <Route
        path="/admin/settings/admins"
        element={
          <AdminRoute>
            <AdminListPage />
          </AdminRoute>
        }
      />

      {/* Admin Tools */}
      <Route
        path="/admin/settings/tools"
        element={
          <AdminRoute>
            <AdminToolsPage />
          </AdminRoute>
        }
      />

      {/* Admin Invites */}
      <Route
        path="/admin/settings/invites"
        element={
          <AdminRoute>
            <AdminInvitesPage />
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

      {/* Data Integrity Dashboard */}
      <Route
        path="/admin/integrity"
        element={
          <AdminRoute>
            <IntegrityDashboardPage />
          </AdminRoute>
        }
      />

      {/* P1: Crystallization Dashboard */}
      <Route
        path="/admin/crystallization"
        element={
          <AdminRoute>
            <CrystallizationDashboardPage />
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
      <Route path="/admin/settings/audit" element={<Navigate to="/admin/audit-logs" replace />} />
    </>
  );
}
