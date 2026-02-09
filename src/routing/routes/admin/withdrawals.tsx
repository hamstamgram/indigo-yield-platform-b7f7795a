import { lazy } from "react";
import { Route } from "react-router-dom";
import { AdminRoute } from "@/routing/AdminRoute";

const AdminWithdrawalsPage = lazy(
  () => import("@/features/admin/withdrawals/pages/AdminWithdrawalsPage")
);

export function WithdrawalRoutes() {
  return (
    <Route
      path="/admin/withdrawals"
      element={
        <AdminRoute>
          <AdminWithdrawalsPage />
        </AdminRoute>
      }
    />
  );
}
