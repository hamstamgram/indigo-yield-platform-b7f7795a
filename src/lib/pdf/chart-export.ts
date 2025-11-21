/**
 * Chart Export Utility
 * Captures React charts as base64 images for PDF embedding
 */

import html2canvas from "html2canvas";
import { ChartExportOptions } from "./types";

export class ChartExporter {
  /**
   * Export a DOM element (typically containing a chart) as base64 PNG
   */
  static async exportChartAsImage(
    element: HTMLElement,
    options: Partial<ChartExportOptions> = {}
  ): Promise<string> {
    const defaultOptions: ChartExportOptions = {
      width: 800,
      height: 400,
      format: "png",
      quality: 0.9,
      backgroundColor: "#ffffff",
      scale: 2,
      ...options,
    };

    try {
      // Wait for any animations to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        width: defaultOptions.width,
        height: defaultOptions.height,
        backgroundColor: defaultOptions.backgroundColor,
        scale: defaultOptions.scale,
        useCORS: true,
        allowTaint: false,
        logging: false,
        removeContainer: true,
        foreignObjectRendering: false,
      });

      // Convert to base64
      const base64 = canvas.toDataURL(`image/${defaultOptions.format}`, defaultOptions.quality);
      return base64;
    } catch (error) {
      console.error("Chart export failed:", error);
      throw new Error(
        `Failed to export chart: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Export multiple chart elements at once
   */
  static async exportMultipleCharts(
    elements: { name: string; element: HTMLElement; options?: Partial<ChartExportOptions> }[]
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    for (const { name, element, options } of elements) {
      try {
        results[name] = await this.exportChartAsImage(element, options);
      } catch (error) {
        console.error(`Failed to export chart "${name}":`, error);
        // Create a placeholder image for failed exports
        results[name] = this.createPlaceholderImage(options?.width || 800, options?.height || 400);
      }
    }

    return results;
  }

  /**
   * Create a placeholder image when chart export fails
   */
  private static createPlaceholderImage(width: number, height: number): string {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Draw placeholder
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#dee2e6";
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.fillStyle = "#6c757d";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Chart Unavailable", width / 2, height / 2);

    return canvas.toDataURL("image/png");
  }

  /**
   * Prepare a chart container for export by ensuring proper sizing
   */
  static prepareChartForExport(
    element: HTMLElement,
    width: number = 800,
    height: number = 400
  ): () => void {
    const originalStyle = {
      width: element.style.width,
      height: element.style.height,
      position: element.style.position,
      visibility: element.style.visibility,
    };

    // Temporarily adjust styles for export
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.position = "absolute";
    element.style.visibility = "hidden";

    // Return cleanup function
    return () => {
      element.style.width = originalStyle.width;
      element.style.height = originalStyle.height;
      element.style.position = originalStyle.position;
      element.style.visibility = originalStyle.visibility;
    };
  }
}
