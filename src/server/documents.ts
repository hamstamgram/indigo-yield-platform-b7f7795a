/**
 * @deprecated Use documentService from @/services/documentService instead
 * This file is kept for backwards compatibility only
 */

import { documentService } from "@/services/documentService";
import type { DocumentFilter as DomainDocumentFilter } from "@/types/domains/document";

// Legacy interfaces for backwards compatibility
export interface DocumentFilter {
  type?: "statement" | "tax" | "terms" | "notice" | "other";
  date_from?: string;
  date_to?: string;
}

export interface Document {
  id: string;
  name: string;
  type: "statement" | "tax" | "terms" | "notice" | "other";
  size: number;
  created_at: string;
  investor_id?: string;
  is_public: boolean;
  metadata?: Record<string, any>;
}

/**
 * @deprecated Use documentService.listDocuments instead
 */
export async function listDocuments(filter?: DocumentFilter): Promise<Document[]> {
  try {
    const domainFilter: DomainDocumentFilter = {
      type: filter?.type,
      period_start: filter?.date_from,
      period_end: filter?.date_to,
    };

    const docs = await documentService.listDocuments(domainFilter);

    // Transform to legacy format
    return docs.map((doc) => ({
      id: doc.id,
      name: doc.title,
      type: doc.type as any,
      size: 0, // Size not tracked in new schema
      created_at: doc.created_at,
      investor_id: doc.user_id,
      is_public: !doc.user_id, // Public if no user_id
      metadata: {},
    }));
  } catch (error) {
    console.error("Error fetching documents:", error);
    return [];
  }
}

/**
 * @deprecated Use documentService.getSignedUrl instead
 */
export async function getSignedUrl(docId: string): Promise<string> {
  try {
    return await documentService.getSignedUrl(docId);
  } catch (error) {
    console.error("Error getting signed URL:", error);
    throw error;
  }
}
