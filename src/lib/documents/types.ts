/**
 * Document Vault Types and Utilities
 * For secure document storage and management
 */

export type DocumentType = 
  | 'statement'
  | 'notice' 
  | 'terms'
  | 'tax'
  | 'agreement'
  | 'report'
  | 'certificate'
  | 'other';

export type DocumentStatus = 
  | 'pending'
  | 'processing'
  | 'ready'
  | 'expired'
  | 'error';

export interface Document {
  id: string;
  user_id?: string; // null for fund-wide documents
  fund_id?: string;
  type: DocumentType;
  title: string;
  description?: string;
  storage_path: string;
  filename: string;
  file_size: number;
  mime_type: string;
  period_start?: Date;
  period_end?: Date;
  tax_year?: number;
  status: DocumentStatus;
  created_at: Date;
  created_by: string;
  updated_at?: Date;
  checksum: string;
  metadata?: {
    tags?: string[];
    category?: string;
    confidentiality?: 'public' | 'confidential' | 'restricted';
    retention_years?: number;
    requires_signature?: boolean;
  };
}

export interface DocumentUploadRequest {
  file: File;
  type: DocumentType;
  title: string;
  description?: string;
  user_id?: string;
  fund_id?: string;
  period_start?: Date;
  period_end?: Date;
  tax_year?: number;
  metadata?: Document['metadata'];
}

export interface DocumentFilter {
  type?: DocumentType[];
  user_id?: string;
  fund_id?: string;
  period_start?: Date;
  period_end?: Date;
  tax_year?: number;
  status?: DocumentStatus[];
  search?: string;
}

export interface DocumentDownloadResponse {
  signed_url: string;
  expires_at: Date;
  filename: string;
  content_type: string;
}

export interface BulkUploadResult {
  success: boolean;
  uploaded: Document[];
  failed: Array<{
    filename: string;
    error: string;
  }>;
  total_count: number;
  success_count: number;
  error_count: number;
}

// Document type configurations
export const DOCUMENT_TYPE_CONFIG: Record<DocumentType, {
  label: string;
  icon: string;
  maxSize: number; // bytes
  allowedMimeTypes: string[];
  requiresPeriod: boolean;
  description: string;
}> = {
  statement: {
    label: 'Account Statement',
    icon: 'FileText',
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf'],
    requiresPeriod: true,
    description: 'Monthly or quarterly account statements',
  },
  notice: {
    label: 'Fund Notice',
    icon: 'Bell',
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['application/pdf', 'text/plain', 'text/html'],
    requiresPeriod: false,
    description: 'Important fund announcements and notices',
  },
  terms: {
    label: 'Terms & Conditions',
    icon: 'ScrollText',
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['application/pdf'],
    requiresPeriod: false,
    description: 'Fund terms and legal agreements',
  },
  tax: {
    label: 'Tax Document',
    icon: 'Receipt',
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf'],
    requiresPeriod: true,
    description: 'Tax forms and supporting documents',
  },
  agreement: {
    label: 'Legal Agreement',
    icon: 'FileSignature',
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf'],
    requiresPeriod: false,
    description: 'Legal agreements and contracts',
  },
  report: {
    label: 'Investment Report',
    icon: 'BarChart3',
    maxSize: 15 * 1024 * 1024, // 15MB
    allowedMimeTypes: ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    requiresPeriod: true,
    description: 'Performance and analytics reports',
  },
  certificate: {
    label: 'Certificate',
    icon: 'Award',
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['application/pdf'],
    requiresPeriod: false,
    description: 'Investment certificates and confirmations',
  },
  other: {
    label: 'Other Document',
    icon: 'File',
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf', 'text/plain', 'image/png', 'image/jpeg'],
    requiresPeriod: false,
    description: 'Other fund-related documents',
  },
};

export const MIME_TYPE_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/html': '.html',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'image/png': '.png',
  'image/jpeg': '.jpg',
};

// Utility functions
export function getDocumentTypeConfig(type: DocumentType) {
  return DOCUMENT_TYPE_CONFIG[type];
}

export function validateDocumentUpload(request: DocumentUploadRequest): string[] {
  const errors: string[] = [];
  const config = getDocumentTypeConfig(request.type);

  // File size validation
  if (request.file.size > config.maxSize) {
    errors.push(`File size exceeds maximum of ${formatFileSize(config.maxSize)}`);
  }

  // MIME type validation
  if (!config.allowedMimeTypes.includes(request.file.type)) {
    errors.push(`File type "${request.file.type}" not allowed for ${config.label}`);
  }

  // Required fields validation
  if (!request.title.trim()) {
    errors.push('Document title is required');
  }

  if (config.requiresPeriod && !request.period_start) {
    errors.push(`Period start date is required for ${config.label}`);
  }

  // Filename validation (no PII)
  const filename = request.file.name.toLowerCase();
  const piiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/, // Credit card
    /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/, // Email
  ];

  for (const pattern of piiPatterns) {
    if (pattern.test(filename)) {
      errors.push('Filename should not contain personally identifiable information');
      break;
    }
  }

  return errors;
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function generateSafeFilename(original: string, documentId: string): string {
  // Remove PII and special characters, add document ID
  const extension = original.substring(original.lastIndexOf('.'));
  const baseName = original
    .substring(0, original.lastIndexOf('.'))
    .replace(/[^a-zA-Z0-9\-_]/g, '_')
    .substring(0, 50); // Limit length

  return `${baseName}_${documentId}${extension}`;
}

export function getStoragePath(document: Partial<Document>): string {
  const { user_id, type, created_at, id } = document;
  const date = created_at || new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  if (user_id) {
    // User-specific document
    return `documents/${user_id}/${year}/${month}/${type}/${id}`;
  } else {
    // Fund-wide document
    return `documents/fund/${year}/${month}/${type}/${id}`;
  }
}
