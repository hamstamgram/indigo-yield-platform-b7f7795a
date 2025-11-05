/**
 * Admin Settings Page - Platform configuration
 */

import React from 'react';
import { Settings } from 'lucide-react';
import { AdminGuard } from '@/components/admin/AdminGuard';

function AdminSettingsContent() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Settings className="h-8 w-8" />
        Platform Settings
      </h1>
      <p className="text-muted-foreground mt-2">Configure platform-wide settings</p>
    </div>
  );
}

export default function AdminSettings() {
  return (
    <AdminGuard>
      <AdminSettingsContent />
    </AdminGuard>
  );
}
