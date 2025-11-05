export type DocumentCategory =
  | 'statement'
  | 'tax'
  | 'trade_confirmation'
  | 'agreement'
  | 'disclosure'
  | 'report'
  | 'other';

export type DocumentStatus = 'pending' | 'processing' | 'available' | 'archived';

export interface Document {
  id: string;
  user_id: string;
  category: DocumentCategory;
  title: string;
  description?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: DocumentStatus;
  period_start?: string;
  period_end?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  is_encrypted: boolean;
  download_count: number;
  last_downloaded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentStatement extends Document {
  category: 'statement';
  statement_type: 'monthly' | 'quarterly' | 'annual';
  statement_period: string; // YYYY-MM format
  balance_start: number;
  balance_end: number;
  net_change: number;
}

export interface TaxDocument extends Document {
  category: 'tax';
  tax_year: number;
  form_type: '1099' | '1099-DIV' | '1099-INT' | 'K-1' | 'other';
}

export interface TradeConfirmation extends Document {
  category: 'trade_confirmation';
  transaction_id: string;
  trade_date: string;
  settlement_date: string;
  asset_symbol: string;
  quantity: number;
  price: number;
  total_amount: number;
}

export interface DocumentUpload {
  file: File;
  category: DocumentCategory;
  title: string;
  description?: string;
  tags?: string[];
}

export interface DocumentFilter {
  category?: DocumentCategory;
  status?: DocumentStatus;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
  tags?: string[];
}

export interface DocumentStats {
  total: number;
  by_category: Record<DocumentCategory, number>;
  by_status: Record<DocumentStatus, number>;
  total_size: number;
  last_uploaded: string;
}
