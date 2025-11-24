/**
 * Document Routes
 * Document vault and viewing
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

const DocumentsPage = lazy(() => import("@/routes/documents/DocumentsPage"));

export function DocumentRoutes() {
  return (
    <Route
      path="/documents/*"
      element={
        <ProtectedRoute>
          <DocumentsPage />
        </ProtectedRoute>
      }
    />
  );
}
