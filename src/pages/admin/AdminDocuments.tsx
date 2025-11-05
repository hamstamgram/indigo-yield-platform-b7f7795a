/**
 * Admin Documents Page - Review pending documents
 */

import React from 'react';
import { FileText } from 'lucide-react';
import { AdminGuard } from '@/components/admin/AdminGuard';

function AdminDocumentsContent() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <FileText className="h-8 w-8" />
        Document Review Queue
      </h1>
      <p className="text-muted-foreground mt-2">Review KYC and other submitted documents</p>
    </div>
  );
}

export default function AdminDocuments() {
  return (
    <AdminGuard>
      <AdminDocumentsContent />
    </AdminGuard>
  );
}
