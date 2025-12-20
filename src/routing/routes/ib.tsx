/**
 * IB Routes Module
 * Routes for Introducing Brokers
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { IBRoute } from "../IBRoute";

const IBDashboard = lazy(() => import("@/routes/ib/IBDashboard"));

export function IBUserRoutes() {
  return (
    <>
      <Route
        path="/ib/dashboard"
        element={
          <IBRoute>
            <IBDashboard />
          </IBRoute>
        }
      />
    </>
  );
}
