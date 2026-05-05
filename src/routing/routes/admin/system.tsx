/**
  * Admin System Routes
  * System administration: settings
  */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminSettingsPage = lazy(() => import("@/features/admin/settings/pages/AdminSettings"));

export function SystemRoutes() {
  return (
     <>
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
       <Route path="/admin/operations" element={<Navigate to="/admin/settings" replace />} />
       <Route path="/admin/system-health" element={<Navigate to="/admin/settings" replace />} />
       <Route path="/admin/integrity" element={<Navigate to="/admin/settings" replace />} />
       <Route path="/admin/crystallization" element={<Navigate to="/admin/settings" replace />} />
       <Route path="/admin/audit-logs" element={<Navigate to="/admin/settings" replace />} />
       <Route path="/admin/audit" element={<Navigate to="/admin/settings" replace />} />
       <Route path="/admin/settings/tools" element={<Navigate to="/admin/settings" replace />} />
       <Route path="/admin/settings/admins" element={<Navigate to="/admin/settings" replace />} />
       <Route path="/admin/settings/invites" element={<Navigate to="/admin/settings" replace />} />
       <Route path="/admin/users" element={<Navigate to="/admin/settings" replace />} />
       <Route path="/admin/settings/audit" element={<Navigate to="/admin/settings" replace />} />
     </>
   );
}
