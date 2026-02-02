import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminManualTransaction = lazy(
  () => import("@/features/admin/transactions/pages/AdminManualTransaction")
);

const AdminTransactionsPage = lazy(
  () => import("@/features/admin/transactions/pages/AdminTransactionsPage")
);

export function TransactionRoutes() {
  return (
    <>
      <Route
        path="/admin/transactions"
        element={
          <AdminRoute>
            <AdminTransactionsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/transactions/new"
        element={
          <AdminRoute>
            <AdminManualTransaction />
          </AdminRoute>
        }
      />
    </>
  );
}
