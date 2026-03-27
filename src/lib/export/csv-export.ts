/**
 * CSV Export Utilities
 * Client-side CSV generation and download functionality
 */

import { format } from "date-fns";
import { logError } from "@/lib/logger";
import { parseFinancial } from "@/utils/financial";

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
  width?: number;
}

export interface ExportOptions {
  filename: string;
  columns: ExportColumn[];
  includeHeaders?: boolean;
  dateFormat?: string;
  numberFormat?: "currency" | "percentage" | "decimal" | "integer";
  delimiter?: "," | ";" | "\t";
  encoding?: "utf-8" | "utf-8-bom";
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  rowCount?: number;
  error?: string;
  downloadUrl?: string;
}

export class CSVExporter {
  /**
   * Export data to CSV format and trigger download
   */
  static async exportToCSV<T>(data: T[], options: ExportOptions): Promise<ExportResult> {
    try {
      const csv = this.generateCSV(data, options);
      const blob = this.createBlob(csv, options.encoding);
      const filename = this.generateFilename(options.filename);

      this.downloadBlob(blob, filename);

      return {
        success: true,
        filename,
        rowCount: data.length,
      };
    } catch (error) {
      logError("CSVExporter.exportToCSV", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Export failed",
      };
    }
  }

  /**
   * Generate CSV string from data
   */
  static generateCSV<T>(data: T[], options: ExportOptions): string {
    const { columns, includeHeaders = true, delimiter = ",", dateFormat = "yyyy-MM-dd" } = options;
    const lines: string[] = [];

    // Add headers
    if (includeHeaders) {
      const headers = columns.map((col) => this.escapeCSVField(col.label));
      lines.push(headers.join(delimiter));
    }

    // Add data rows
    data.forEach((row) => {
      const fields = columns.map((col) => {
        const value = this.getValueByPath(row, col.key);
        const formatted = col.format
          ? col.format(value)
          : this.formatValue(value, dateFormat, options.numberFormat);
        return this.escapeCSVField(formatted);
      });
      lines.push(fields.join(delimiter));
    });

    return lines.join("\n");
  }

  /**
   * Create blob with proper encoding
   */
  static createBlob(content: string, encoding: string = "utf-8"): Blob {
    const type = "text/csv;charset=utf-8;";

    if (encoding === "utf-8-bom") {
      // Add BOM for Excel compatibility
      const bom = "\uFEFF";
      return new Blob([bom + content], { type });
    }

    return new Blob([content], { type });
  }

  /**
   * Download blob as file
   */
  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Escape CSV field for proper formatting
   */
  static escapeCSVField(value: string): string {
    if (value == null) return "";

    const stringValue = String(value);

    // If field contains comma, newline, or quotes, wrap in quotes and escape internal quotes
    if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  /**
   * Get nested object value by dot notation path
   */
  static getValueByPath(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  /**
   * Format value based on type
   */
  static formatValue(value: any, dateFormat: string, numberFormat?: string): string {
    if (value == null) return "";

    // Handle dates
    if (value instanceof Date) {
      return format(value, dateFormat);
    }

    // Handle date strings
    if (typeof value === "string" && !isNaN(Date.parse(value))) {
      try {
        return format(new Date(value), dateFormat);
      } catch {
        return value;
      }
    }

    // Handle numbers
    if (typeof value === "number") {
      switch (numberFormat) {
        case "currency":
          // Output plain number for CSV (asset column indicates the currency/token)
          return new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          }).format(value);
        case "percentage":
          return new Intl.NumberFormat("en-US", {
            style: "percent",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(value / 100);
        case "decimal":
          return value.toFixed(2);
        case "integer":
          return Math.round(value).toString();
        default:
          return value.toString();
      }
    }

    // Handle booleans
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    return String(value);
  }

  /**
   * Generate filename with timestamp
   */
  static generateFilename(baseName: string): string {
    const timestamp = format(new Date(), "yyyy-MM-dd_HHmm");
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${cleanBaseName}_${timestamp}.csv`;
  }

  /**
   * Create standard export configurations
   */
  static createPortfolioExportConfig(): ExportOptions {
    return {
      filename: "portfolio_holdings",
      columns: [
        { key: "asset", label: "Asset" },
        { key: "symbol", label: "Symbol" },
        { key: "quantity", label: "Quantity", format: (v) => parseFinancial(v).toNumber().toFixed(4) },
        { key: "price", label: "Price (per unit)", format: (v) => parseFinancial(v).toNumber().toFixed(6) },
        { key: "value", label: "Value", format: (v) => parseFinancial(v).toNumber().toFixed(2) },
        {
          key: "percentOfPortfolio",
          label: "% of Portfolio",
          format: (v) => `${parseFinancial(v).toNumber().toFixed(2)}%`,
        },
        { key: "lastUpdated", label: "Last Updated" },
      ],
      includeHeaders: true,
      encoding: "utf-8-bom",
    };
  }

  static createTransactionsExportConfig(): ExportOptions {
    return {
      filename: "transaction_history",
      columns: [
        { key: "date", label: "Date" },
        { key: "type", label: "Type" },
        { key: "asset_code", label: "Asset" },
        { key: "description", label: "Description" },
        { key: "amount", label: "Amount", format: (v) => parseFinancial(v).toNumber().toFixed(4) },
        {
          key: "balance",
          label: "Balance",
          format: (v) => (v ? parseFinancial(v).toNumber().toFixed(4) : ""),
        },
        { key: "status", label: "Status" },
        { key: "reference", label: "Reference" },
      ],
      includeHeaders: true,
      encoding: "utf-8-bom",
    };
  }

  static createAuditLogExportConfig(): ExportOptions {
    return {
      filename: "audit_log",
      columns: [
        { key: "timestamp", label: "Timestamp" },
        { key: "user", label: "User" },
        { key: "operation", label: "Operation" },
        { key: "target_table", label: "Table" },
        { key: "target_id", label: "Record ID" },
        { key: "ip_address", label: "IP Address" },
        { key: "user_agent", label: "User Agent" },
        { key: "success", label: "Success", format: (v) => (v ? "Yes" : "No") },
      ],
      includeHeaders: true,
      encoding: "utf-8-bom",
    };
  }

  static createBalancesExportConfig(): ExportOptions {
    return {
      filename: "investor_balances",
      columns: [
        { key: "investor_name", label: "Investor Name" },
        { key: "fund_code", label: "Fund" },
        { key: "asset_code", label: "Asset" },
        { key: "total_value", label: "Total Value", format: (v) => parseFinancial(v).toNumber().toFixed(4) },
        {
          key: "cash_balance",
          label: "Cash Balance",
          format: (v) => parseFinancial(v).toNumber().toFixed(4),
        },
        {
          key: "invested_amount",
          label: "Invested Amount",
          format: (v) => parseFinancial(v).toNumber().toFixed(4),
        },
        {
          key: "unrealized_pnl",
          label: "Unrealized P&L",
          format: (v) => parseFinancial(v).toNumber().toFixed(4),
        },
        {
          key: "total_return_percent",
          label: "Total Return %",
          format: (v) => `${parseFinancial(v).toNumber().toFixed(2)}%`,
        },
        { key: "last_updated", label: "Last Updated" },
      ],
      includeHeaders: true,
      encoding: "utf-8-bom",
    };
  }

  static createKPIExportConfig(): ExportOptions {
    return {
      filename: "kpi_metrics",
      columns: [
        { key: "metric_name", label: "Metric" },
        { key: "value", label: "Value" },
        { key: "unit", label: "Unit" },
        { key: "period", label: "Period" },
        { key: "fund_code", label: "Fund" },
        { key: "calculated_at", label: "Calculated At" },
      ],
      includeHeaders: true,
      encoding: "utf-8-bom",
    };
  }
}

// Hook for easy CSV export in React components
export function useCSVExport() {
  const exportData = async <T>(data: T[], options: ExportOptions): Promise<ExportResult> => {
    if (data.length === 0) {
      return {
        success: false,
        error: "No data to export",
      };
    }

    return CSVExporter.exportToCSV(data, options);
  };

  const exportPortfolio = (portfolioData: any[]) => {
    return exportData(portfolioData, CSVExporter.createPortfolioExportConfig());
  };

  const exportTransactions = (transactionData: any[]) => {
    return exportData(transactionData, CSVExporter.createTransactionsExportConfig());
  };

  const exportAuditLog = (auditData: any[]) => {
    return exportData(auditData, CSVExporter.createAuditLogExportConfig());
  };

  const exportBalances = (balanceData: any[]) => {
    return exportData(balanceData, CSVExporter.createBalancesExportConfig());
  };

  const exportKPIs = (kpiData: any[]) => {
    return exportData(kpiData, CSVExporter.createKPIExportConfig());
  };

  return {
    exportData,
    exportPortfolio,
    exportTransactions,
    exportAuditLog,
    exportBalances,
    exportKPIs,
  };
}
