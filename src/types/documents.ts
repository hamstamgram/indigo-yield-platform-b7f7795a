/**
 * Document Types
 * Type definitions for document management system
 * Note: This is currently a stub - the feature is not fully implemented
 */

// Document metadata
export interface Document {
  id: string;
  userId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSizeBytes: number;
  category?: string;
  tags?: string[];
  description?: string;
  uploadedAt: string;
  updatedAt: string;
  isPublic?: boolean;
  shareUrl?: string;
  downloadCount?: number;
}

// Document filter for queries
export interface DocumentFilter {
  category?: string;
  fileType?: string;
  tags?: string[];
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
  isPublic?: boolean;
}

// Document statistics
export interface DocumentStats {
  totalDocuments: number;
  totalSizeBytes: number;
  documentsByCategory: Record<string, number>;
  documentsByType: Record<string, number>;
  recentUploads: number; // Last 30 days
  publicDocuments: number;
  privateDocuments: number;
}

// Document upload request
export interface DocumentUpload {
  file: File;
  category?: string;
  tags?: string[];
  description?: string;
  isPublic?: boolean;
}
