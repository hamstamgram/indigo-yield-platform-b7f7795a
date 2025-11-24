import { AdminGuard } from "@/components/admin/AdminGuard";

function AdminSupportQueueContent() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Support Queue</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  );
}

export default function AdminSupportQueue() {
  return (
    <AdminGuard>
      <AdminSupportQueueContent />
    </AdminGuard>
  );
}
