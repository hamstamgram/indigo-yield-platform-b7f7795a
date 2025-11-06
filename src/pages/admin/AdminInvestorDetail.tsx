/**
 * Admin Investor Detail Page - Individual investor view
 */

import { useParams } from 'react-router-dom';
import { User } from 'lucide-react';
import { AdminGuard } from '@/components/admin/AdminGuard';

function AdminInvestorDetailContent() {
  const { id } = useParams();

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <User className="h-8 w-8" />
        Investor Details
      </h1>
      <p className="text-muted-foreground mt-2">Detailed view for investor {id}</p>
    </div>
  );
}

export default function AdminInvestorDetail() {
  return (
    <AdminGuard>
      <AdminInvestorDetailContent />
    </AdminGuard>
  );
}
