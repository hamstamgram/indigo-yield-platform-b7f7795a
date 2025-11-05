/**
 * Admin Withdrawals Page - Approval queue for withdrawals
 */

import React from 'react';
import { DollarSign } from 'lucide-react';
import { AdminGuard } from '@/components/admin/AdminGuard';

function AdminWithdrawalsContent() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <DollarSign className="h-8 w-8" />
        Withdrawal Approvals
      </h1>
      <p className="text-muted-foreground mt-2">Review and approve pending withdrawals</p>
    </div>
  );
}

export default function AdminWithdrawals() {
  return (
    <AdminGuard>
      <AdminWithdrawalsContent />
    </AdminGuard>
  );
}
