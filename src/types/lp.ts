export interface Balance {
  assetSymbol: string;
  available: string;
  pending: string;
  currency: string;
}

export interface Ticket {
  id: string;
  subject: string;
  category?: string;
  message: string;
  status: 'open' | 'pending' | 'resolved';
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationPrefs {
  dailyYieldEmail: boolean;
  monthlyStatementEmail: boolean;
}

export interface Request {
  id: string;
  type: 'deposit' | 'withdrawal';
  asset: string;
  amount: string;
  memo?: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
  updatedAt?: string;
  adminNotes?: string;
}
