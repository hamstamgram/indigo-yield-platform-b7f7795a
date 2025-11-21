/**
 * Admin Audit Logs Page - View system audit logs
 */

import { AdminGuard } from "@/components/admin/AdminGuard";
import AuditLogViewer from "./AuditLogViewer";

export default function AdminAuditLogs() {
  return (
    <AdminGuard>
      <AuditLogViewer />
    </AdminGuard>
  );
}
