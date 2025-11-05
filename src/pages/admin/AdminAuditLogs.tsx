/**
 * Admin Audit Logs Page - View system audit logs
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { AdminGuard } from '@/components/admin/AdminGuard';

function AdminAuditLogsContent() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <AlertCircle className="h-8 w-8" />
        Audit Logs
      </h1>
      <p className="text-muted-foreground mt-2">System audit trail and activity logs</p>
    </div>
  );
}

export default function AdminAuditLogs() {
  return (
    <AdminGuard>
      <AdminAuditLogsContent />
    </AdminGuard>
  );
}
