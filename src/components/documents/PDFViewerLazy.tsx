import React, { Suspense, useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui";
import { pdfjs } from "react-pdf";

// Lazy load the actual PDF viewer
const PDFViewer = React.lazy(() => import("./PDFViewer"));

// Preload the PDF.js worker on component mount or hover
const preloadPDFWorker = () => {
  const workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  
  // Check if already preloaded
  const existing = document.querySelector(`link[href="${workerSrc}"]`);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "script";
  link.href = workerSrc;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
};

interface PDFViewerLazyProps {
  url: string;
  onDownload?: () => void;
}

/**
 * Lazy-loaded PDF viewer wrapper
 * Reduces initial bundle size by ~500KB
 */
export const PDFViewerLazy: React.FC<PDFViewerLazyProps> = ({ url, onDownload }) => {
  const [shouldLoad, setShouldLoad] = useState(false);

  // Preload worker when component mounts
  useEffect(() => {
    preloadPDFWorker();
    // Small delay before loading the full component
    const timer = setTimeout(() => setShouldLoad(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseEnter = useCallback(() => {
    preloadPDFWorker();
  }, []);

  if (!shouldLoad) {
    return (
      <Card onMouseEnter={handleMouseEnter}>
        <CardContent className="flex items-center justify-center min-h-96 p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Preparing PDF viewer...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="flex items-center justify-center min-h-96 p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading PDF viewer...</p>
            </div>
          </CardContent>
        </Card>
      }
    >
      <PDFViewer url={url} onDownload={onDownload} />
    </Suspense>
  );
};

export default PDFViewerLazy;
