/**
 * Admin Transactions Page - View all platform transactions
 */

import { AdminGuard } from "@/components/admin/AdminGuard";
import AdminTransactionsPage from "./transactions/AdminTransactionsPage";

export default function AdminTransactions() {
  return (
    <AdminGuard>
      <AdminTransactionsPage />
    </AdminGuard>
  );
}
