export type ReportType = "performance" | "transactions" | "custom" | "monthly" | "annual";
export type ReportFormat = "json" | "csv" | "pdf";

export interface ReportFilter {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ReportParameter {
  includeCharts?: boolean;
  confidential?: boolean;
  [key: string]: any;
}

export interface Report {
  id: string;
  title: string;
  type: ReportType;
  description?: string;
  generated_at: string; // ISO Date string
  date_range: {
    start: string; // ISO Date string
    end: string; // ISO Date string
  };
  format: ReportFormat;
  status: "pending" | "processing" | "completed" | "failed";
  url?: string; // Download URL
  metadata?: Record<string, any>;
  user_id: string;
}

export interface GenerateReportRequest {
  reportType: string; // Using string to allow flexibility, but usually maps to ReportType
  format: "pdf" | "csv" | "excel" | "json";
  filters?: Record<string, any>;
  parameters?: Record<string, any>;
  userId?: string;
  reportId?: string;
}

export interface GenerateReportResponse {
  success: boolean;
  reportId?: string;
  data?: Blob | Buffer;
  filename?: string;
  error?: string;
}
