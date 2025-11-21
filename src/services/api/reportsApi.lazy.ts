/**
 * Lazy-loaded report generation functions
 * Splits heavy PDF/Excel generators into separate bundles
 */

/**
 * Dynamically import PDF generator
 * Reduces initial bundle size by ~400KB
 */
export const generatePDFReportLazy = async (
  ...args: Parameters<typeof import("@/lib/reports/pdfGenerator").generatePDFReport>
) => {
  const { generatePDFReport } = await import("@/lib/reports/pdfGenerator");
  return generatePDFReport(...args);
};

/**
 * Dynamically import Excel generator
 * Reduces initial bundle size by ~200KB
 */
export const generateExcelReportLazy = async (
  ...args: Parameters<typeof import("@/lib/reports/excelGenerator").generateExcelReport>
) => {
  const { generateExcelReport } = await import("@/lib/reports/excelGenerator");
  return generateExcelReport(...args);
};

/**
 * Dynamically import ReportEngine
 * Reduces initial bundle size by ~300KB
 */
export const ReportEngineLazy = {
  generateReport: async (
    ...args: Parameters<typeof import("@/lib/reports/reportEngine").ReportEngine.generateReport>
  ) => {
    const { ReportEngine } = await import("@/lib/reports/reportEngine");
    return ReportEngine.generateReport(...args);
  },

  fetchReportData: async (
    ...args: Parameters<typeof import("@/lib/reports/reportEngine").ReportEngine.fetchReportData>
  ) => {
    const { ReportEngine } = await import("@/lib/reports/reportEngine");
    return ReportEngine.fetchReportData(...args);
  },
};
