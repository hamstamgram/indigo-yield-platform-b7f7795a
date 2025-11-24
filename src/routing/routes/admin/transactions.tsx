import { Route } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminManualTransaction = lazy(
  () => import("@/routes/admin/transactions/AdminManualTransaction")
);

export function TransactionRoutes() {
  return (
    <>
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
