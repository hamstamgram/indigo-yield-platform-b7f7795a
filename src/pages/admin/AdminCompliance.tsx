/**
 * Admin Compliance Page - KYC/AML compliance dashboard
 */

import { Shield } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";

function AdminComplianceContent() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Shield className="h-8 w-8" />
        Compliance Dashboard
      </h1>
      <p className="text-muted-foreground mt-2">KYC/AML oversight and monitoring</p>
    </div>
  );
}

export default function AdminCompliance() {
  return (
    <AdminGuard>
      <AdminComplianceContent />
    </AdminGuard>
  );
}
