/**
 * Admin System Routes
 * System administration: settings, audit logs, maintenance, admin management
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminSettingsNew = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage"));
const AdminAuditLogs = lazy(() => import("@/pages/admin/AdminAuditLogs"));
const MaintenancePage = lazy(() => import("@/pages/admin/MaintenancePage"));
const AdminListPage = lazy(() => import("@/pages/admin/settings/AdminList"));
const AdminToolsPage = lazy(() => import("@/pages/admin/settings/AdminToolsPage"));
const AdminInvitesPage = lazy(() => import("@/pages/admin/settings/AdminInvitesPage"));
const SystemHealthPage = lazy(() => import("@/pages/admin/system-health/SystemHealthPage"));
const IntegrityDashboardPage = lazy(() => import("@/pages/admin/IntegrityDashboardPage"));
const CrystallizationDashboardPage = lazy(
  () => import("@/pages/admin/CrystallizationDashboardPage")
);
const DuplicatesPage = lazy(() => import("@/pages/admin/DuplicatesPage"));
const BypassAttemptsPage = lazy(() => import("@/pages/admin/BypassAttemptsPage"));

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

      {/* Legacy Settings */}
      <Route
        path="/admin/settings-platform"
        element={
          <AdminRoute>
            <AdminSettingsNew />
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

      {/* P1: Duplicate Profiles */}
      <Route
        path="/admin/duplicates"
        element={
          <AdminRoute>
            <DuplicatesPage />
          </AdminRoute>
        }
      />

      {/* P1: Bypass Attempts */}
      <Route
        path="/admin/bypass-attempts"
        element={
          <AdminRoute>
            <BypassAttemptsPage />
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

      {/* Maintenance */}
      <Route
        path="/admin/maintenance"
        element={
          <AdminRoute>
            <MaintenancePage />
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
