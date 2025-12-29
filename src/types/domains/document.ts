/**
 * Document Domain Types
 * Clean abstractions for document management
 */

import { Database } from "@/integrations/supabase/types";

type DocumentType = Database["public"]["Enums"]["document_type"];

export interface Document {
  id: string;
  user_id: string;
  fund_id: string | null;
  type: DocumentType;
  title: string;
  storage_path: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  created_by: string | null;
  checksum: string | null;
}

export interface DocumentWithMetadata extends Document {
  file_size?: number;
  mime_type?: string;
  download_url?: string;
  is_accessible: boolean;
}

export interface DocumentFilter {
  type?: DocumentType;
  fund_id?: string;
  period_start?: string;
  period_end?: string;
  search_query?: string;
}

export interface DocumentUploadRequest {
  file: File;
  type: DocumentType;
  title: string;
  fund_id?: string;
  period_start?: string;
  period_end?: string;
}

// Alias for backward compatibility
export type DocumentUpload = DocumentUploadRequest;

export interface DocumentDownloadResult {
  url: string;
  filename: string;
  expires_at: string;
}

// Extended document stats
export interface DocumentStats {
  totalDocuments: number;
  totalSizeBytes: number;
  documentsByCategory: Record<string, number>;
  documentsByType: Record<string, number>;
  recentUploads: number;
  publicDocuments: number;
  privateDocuments: number;
}
