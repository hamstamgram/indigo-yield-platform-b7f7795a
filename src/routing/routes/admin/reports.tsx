/**
 * Admin Reports Routes
 * Historical reports redirect to consolidated Reports page
 */

import { Route, Navigate } from "react-router-dom";

export function ReportsRoutes() {
  return (
    <>
      <Route
        path="/admin/reports/historical"
        element={<Navigate to="/admin/reports?tab=historical" replace />}
      />
    </>
  );
}
