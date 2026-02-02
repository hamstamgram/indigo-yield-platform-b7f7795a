/**
 * Admin Audit Logs Page - View system audit logs
 */

import { AdminGuard } from "@/components/admin";
import AuditLogViewer from "./AuditLogViewer";

export default function AdminAuditLogs() {
  return (
    <AdminGuard>
      <AuditLogViewer />
    </AdminGuard>
  );
}
