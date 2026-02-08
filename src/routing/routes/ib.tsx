/**
 * IB Routes Module
 * All /ib/* routes redirect to /investor (IB portal removed)
 */

import { Route, Navigate } from "react-router-dom";

export function IBUserRoutes() {
  return (
    <>
      <Route path="/ib" element={<Navigate to="/investor" replace />} />
      <Route path="/ib/*" element={<Navigate to="/investor" replace />} />
    </>
  );
}
