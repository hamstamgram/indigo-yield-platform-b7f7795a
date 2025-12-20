import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminManualTransaction = lazy(
  () => import("@/routes/admin/transactions/AdminManualTransaction")
);

const AdminTransactionsPage = lazy(
  () => import("@/routes/admin/transactions/AdminTransactionsPage")
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
