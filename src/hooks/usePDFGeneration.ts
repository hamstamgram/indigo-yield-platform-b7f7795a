/**
 * React Hook for PDF Generation
 * Provides easy PDF generation capabilities for React components
 */

import { useState, useCallback } from "react";
import {
  StatementPDFGenerator,
  ChartExporter,
  StatementData,
  PDFGenerationOptions,
  PDFGenerationResult,
  BrandingAssets,
} from "@/lib/pdf";

interface UsePDFGenerationOptions {
  branding?: Partial<BrandingAssets>;
  defaultOptions?: PDFGenerationOptions;
}

export function usePDFGeneration(options: UsePDFGenerationOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePDF = useCallback(
    async (
      data: StatementData,
      pdfOptions?: PDFGenerationOptions
    ): Promise<PDFGenerationResult | null> => {
      setIsGenerating(true);
      setError(null);

      try {
        const generator = new StatementPDFGenerator(options.branding);
        const result = await generator.generateStatement(data, {
          ...options.defaultOptions,
          ...pdfOptions,
        });

        if (!result.success) {
          setError(result.error || "PDF generation failed");
          return null;
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [options.branding, options.defaultOptions]
  );

  const exportChartAsImage = useCallback(
    async (
      element: HTMLElement,
      chartOptions?: Parameters<typeof ChartExporter.exportChartAsImage>[1]
    ): Promise<string | null> => {
      try {
        return await ChartExporter.exportChartAsImage(element, chartOptions);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Chart export failed";
        setError(errorMessage);
        return null;
      }
    },
    []
  );

  const downloadPDF = useCallback((result: PDFGenerationResult) => {
    if (!result.success || !result.data || !result.filename) {
      setError("Invalid PDF result for download");
      return;
    }

    try {
      const blob = new Blob([new Uint8Array(result.data)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Download failed";
      setError(errorMessage);
    }
  }, []);

  const previewPDF = useCallback((result: PDFGenerationResult) => {
    if (!result.success || !result.data) {
      setError("Invalid PDF result for preview");
      return;
    }

    try {
      const blob = new Blob([new Uint8Array(result.data)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      // Clean up URL after a delay to allow the browser to load it
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Preview failed";
      setError(errorMessage);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generatePDF,
    downloadPDF,
    previewPDF,
    exportChartAsImage,
    isGenerating,
    error,
    clearError,
  };
}

// Utility hook for generating and downloading PDFs in one step
export function useStatementDownload(options: UsePDFGenerationOptions = {}) {
  const { generatePDF, downloadPDF, isGenerating, error, clearError } = usePDFGeneration(options);

  const generateAndDownload = useCallback(
    async (data: StatementData, pdfOptions?: PDFGenerationOptions): Promise<boolean> => {
      const result = await generatePDF(data, pdfOptions);
      if (result) {
        downloadPDF(result);
        return true;
      }
      return false;
    },
    [generatePDF, downloadPDF]
  );

  return {
    generateAndDownload,
    isGenerating,
    error,
    clearError,
  };
}
