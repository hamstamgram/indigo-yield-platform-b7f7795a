/**
 * Admin Transactions Page - View all platform transactions
 */

import React from 'react';
import { Activity } from 'lucide-react';
import { AdminGuard } from '@/components/admin/AdminGuard';

function AdminTransactionsContent() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Activity className="h-8 w-8" />
        All Transactions
      </h1>
      <p className="text-muted-foreground mt-2">Platform-wide transaction history</p>
    </div>
  );
}

export default function AdminTransactions() {
  return (
    <AdminGuard>
      <AdminTransactionsContent />
    </AdminGuard>
  );
}
