/**
 * Admin Investor Management Page - See all investors
 */

import { Users } from 'lucide-react';
import { AdminGuard } from '@/components/admin/AdminGuard';

function AdminInvestorManagementContent() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Users className="h-8 w-8" />
        Investor Management
      </h1>
      <p className="text-muted-foreground mt-2">View and manage all investor accounts</p>
      {/* Component implementation */}
    </div>
  );
}

export default function AdminInvestorManagement() {
  return (
    <AdminGuard>
      <AdminInvestorManagementContent />
    </AdminGuard>
  );
}
