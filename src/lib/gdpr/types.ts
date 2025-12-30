/**
 * GDPR Compliance Types
 */

export enum ConsentType {
  MARKETING = 'MARKETING',
  ANALYTICS = 'ANALYTICS',
  PERSONALIZATION = 'PERSONALIZATION',
  THIRD_PARTY = 'THIRD_PARTY',
  COOKIES = 'COOKIES',
  DATA_PROCESSING = 'DATA_PROCESSING',
}

export enum DataRequestType {
  EXPORT = 'EXPORT',
  DELETE = 'DELETE',
  RECTIFY = 'RECTIFY',
}

export enum DataRequestStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ConsentRecord {
  consent_type: ConsentType;
  consented: boolean;
  consent_date?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface DataRequest {
  id: string;
  request_type: DataRequestType;
  status: DataRequestStatus;
  requested_at: string;
  completed_at?: string;
  export_url?: string;
  notes?: string;
}
