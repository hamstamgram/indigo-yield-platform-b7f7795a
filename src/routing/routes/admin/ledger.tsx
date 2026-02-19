/**
 * Admin Ledger Routes
 * Consolidated Transactions + Withdrawals
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const LedgerPage = lazy(() => import("@/features/admin/ledger/pages/LedgerPage"));
const AdminManualTransaction = lazy(
  () => import("@/features/admin/transactions/pages/AdminManualTransaction")
);

export function LedgerRoutes() {
  return (
    <>
      <Route
        path="/admin/ledger"
        element={
          <AdminRoute>
            <LedgerPage />
          </AdminRoute>
        }
      />

      {/* Manual transaction entry (keep as standalone) */}
      <Route
        path="/admin/transactions/new"
        element={
          <AdminRoute>
            <AdminManualTransaction />
          </AdminRoute>
        }
      />

      {/* Redirects from old standalone routes */}
      <Route path="/admin/transactions" element={<Navigate to="/admin/ledger" replace />} />
      <Route
        path="/admin/withdrawals"
        element={<Navigate to="/admin/ledger?tab=withdrawals" replace />}
      />
    </>
  );
}
