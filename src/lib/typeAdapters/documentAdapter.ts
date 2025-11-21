/**
 * Document Type Adapters
 * Transform between Supabase document types and application Document types
 */

import { Database } from "@/integrations/supabase/types";
import type { Document as DomainDocument, DocumentWithMetadata } from "@/types/domains/document";

type SupabaseDocument = Database["public"]["Tables"]["documents"]["Row"];

/**
 * Transform Supabase document row to application Document type
 */
export function toDocument(row: SupabaseDocument): DomainDocument {
  return {
    id: row.id,
    user_id: row.user_id,
    fund_id: row.fund_id,
    type: row.type,
    title: row.title,
    storage_path: row.storage_path,
    period_start: row.period_start,
    period_end: row.period_end,
    created_at: row.created_at,
    created_by: row.created_by,
    checksum: row.checksum,
  };
}

/**
 * Transform multiple Supabase documents to application Documents
 */
export function toDocuments(rows: SupabaseDocument[]): DomainDocument[] {
  return rows.map(toDocument);
}

/**
 * Transform Supabase document to DocumentWithMetadata
 */
export function toDocumentWithMetadata(
  row: SupabaseDocument,
  metadata?: {
    file_size?: number;
    mime_type?: string;
    download_url?: string;
    is_accessible?: boolean;
  }
): DocumentWithMetadata {
  return {
    ...toDocument(row),
    file_size: metadata?.file_size,
    mime_type: metadata?.mime_type,
    download_url: metadata?.download_url,
    is_accessible: metadata?.is_accessible ?? true,
  };
}

/**
 * Prepare document data for Supabase insert
 */
export function toSupabaseInsert(
  doc: Omit<DomainDocument, "id" | "created_at">
): Database["public"]["Tables"]["documents"]["Insert"] {
  return {
    user_id: doc.user_id,
    fund_id: doc.fund_id,
    type: doc.type,
    title: doc.title,
    storage_path: doc.storage_path,
    period_start: doc.period_start,
    period_end: doc.period_end,
    created_by: doc.created_by,
    checksum: doc.checksum,
  };
}
