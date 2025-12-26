/**
 * Documents Hook - Stub
 * Note: The documents feature uses types that don't match the current database schema.
 * The actual 'documents' table is for fund-specific documents, not general file management.
 */

import { useState } from "react";
import type {
  Document as LegacyDocument,
  DocumentFilter,
  DocumentStats,
  DocumentUpload,
} from "@/types/documents";
import { useToast } from "@/hooks";

export function useDocuments(_userId?: string, _filter?: DocumentFilter) {
  const [documents] = useState<LegacyDocument[]>([]);
  const [stats] = useState<DocumentStats | null>(null);
  const [loading] = useState(false);
  const { toast } = useToast();

  const downloadDocument = async (_document: LegacyDocument) => {
    toast({
      title: "Not available",
      description: "Document download feature is not yet implemented.",
      variant: "destructive",
    });
  };

  const uploadDocument = async (_upload: DocumentUpload) => {
    toast({
      title: "Not available",
      description: "Document upload feature is not yet implemented.",
      variant: "destructive",
    });
    return null;
  };

  const deleteDocument = async (_documentId: string, _filePath: string) => {
    toast({
      title: "Not available",
      description: "Document delete feature is not yet implemented.",
      variant: "destructive",
    });
  };

  const getDocumentUrl = async (_filePath: string) => {
    return null;
  };

  return {
    documents,
    stats,
    loading,
    downloadDocument,
    uploadDocument,
    deleteDocument,
    getDocumentUrl,
    refreshDocuments: () => {},
  };
}
