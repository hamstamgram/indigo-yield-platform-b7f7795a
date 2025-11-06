/**
 * Report Domain Types
 * Clean abstractions for reporting functionality
 */

import { Database } from '@/integrations/supabase/types';

type ReportType = Database['public']['Enums']['report_type'];
type ReportFormat = Database['public']['Enums']['report_format'];
type ReportStatus = Database['public']['Enums']['report_status'];

export interface ReportDefinition {
  id: string;
  name: string;
  description: string | null;
  report_type: ReportType;
  default_format: ReportFormat;
  template_config: Record<string, any>;
  is_admin_only: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeneratedReport {
  id: string;
  report_definition_id: string;
  generated_for_user_id: string;
  generated_by_user_id: string;
  status: ReportStatus;
  format: ReportFormat;
  parameters: Record<string, any>;
  filters: Record<string, any>;
  date_range_start: string | null;
  date_range_end: string | null;
  file_path: string | null;
  file_size_bytes: number | null;
  error_message: string | null;
  generated_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface ReportRequest {
  report_definition_id: string;
  format: ReportFormat;
  parameters?: Record<string, any>;
  filters?: Record<string, any>;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  generated_at: string;
  period_start?: string;
  period_end?: string;
  sections: ReportSection[];
  metadata?: Record<string, any>;
}

export interface ReportSection {
  title: string;
  type: 'table' | 'chart' | 'summary' | 'text';
  data: any;
  config?: Record<string, any>;
}

export interface ReportSummary {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
}
