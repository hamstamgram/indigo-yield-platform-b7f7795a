/**
 * Admin User Management Page - Manage admin users
 */

import React from 'react';
import { UserCog } from 'lucide-react';
import { AdminGuard } from '@/components/admin/AdminGuard';

function AdminUserManagementContent() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <UserCog className="h-8 w-8" />
        User Management
      </h1>
      <p className="text-muted-foreground mt-2">Manage admin user accounts and permissions</p>
    </div>
  );
}

export default function AdminUserManagement() {
  return (
    <AdminGuard>
      <AdminUserManagementContent />
    </AdminGuard>
  );
}
