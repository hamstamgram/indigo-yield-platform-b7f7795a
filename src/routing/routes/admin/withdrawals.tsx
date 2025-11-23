import { Route } from "react-router-dom";
import { AdminRoute } from "@/routing/AdminRoute";
import AdminWithdrawalsPage from "@/routes/admin/AdminWithdrawalsPage";

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
