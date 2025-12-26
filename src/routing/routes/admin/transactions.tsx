import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminManualTransaction = lazy(
  () => import("@/pages/admin/transactions/AdminManualTransaction")
);

const AdminTransactionsPage = lazy(
  () => import("@/pages/admin/transactions/AdminTransactionsPage")
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
