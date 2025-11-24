import { Routes, Route } from "react-router-dom";
import DocumentsHubPage from "@/routes/documents/DocumentsHubPage";
import DocumentViewerPage from "@/routes/documents/DocumentViewerPage";

export default function DocumentsPage() {
  return (
    <Routes>
      <Route index element={<DocumentsHubPage />} />
      <Route path=":id" element={<DocumentViewerPage />} />
    </Routes>
  );
}
