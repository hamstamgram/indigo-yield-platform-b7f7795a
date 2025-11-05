/**
 * Admin Fees Page - Fee management and configuration
 */

import React from 'react';
import { DollarSign } from 'lucide-react';
import { AdminGuard } from '@/components/admin/AdminGuard';

function AdminFeesContent() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <DollarSign className="h-8 w-8" />
        Fee Management
      </h1>
      <p className="text-muted-foreground mt-2">Configure platform fees and pricing</p>
    </div>
  );
}

export default function AdminFees() {
  return (
    <AdminGuard>
      <AdminFeesContent />
    </AdminGuard>
  );
}
