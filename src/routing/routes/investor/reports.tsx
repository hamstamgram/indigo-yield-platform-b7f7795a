/**
 * Reports Routes
 * Custom Reports feature is Phase 2 (disabled). Redirect to investor home.
 */

import { Route, Navigate } from "react-router-dom";

export function ReportsRoutes() {
  return (
    <>
      <Route path="/reports" element={<Navigate to="/investor" replace />} />
      <Route path="/reports/custom" element={<Navigate to="/investor" replace />} />
    </>
  );
}
