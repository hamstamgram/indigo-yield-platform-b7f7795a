export interface Investor {
  id: string;
  email: string;
  name?: string;
  totalPrincipal: string;
  totalEarned: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastActivity?: string;
}

export interface Position {
  asset: string;
  principal: string;
  earned: string;
  total: string;
  lastAdjusted?: string;
}

export interface PositionAdjustment {
  id: string;
  investorId: string;
  asset: string;
  principalDelta: string;
  earnedDelta: string;
  reason: string;
  adminId: string;
  createdAt: string;
  beforeSnapshot: any;
  afterSnapshot: any;
}

export interface Transaction {
  id: string;
  investorId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST' | 'FEE';
  asset: string;
  amount: string;
  memo?: string;
  adminId?: string;
  createdAt: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface YieldSetting {
  asset: string;
  apr: number;
  effectiveFrom: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface Statement {
  id: string;
  investorId: string;
  investorEmail: string;
  period: string; // YYYY-MM format
  status: 'queued' | 'generated' | 'failed';
  pdfUrl?: string;
  createdAt: string;
  generatedAt?: string;
}

export interface SupportTicket {
  id: string;
  investorId: string;
  investorEmail: string;
  subject: string;
  category?: string;
  status: 'open' | 'pending' | 'resolved';
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
  priority: 'low' | 'medium' | 'high';
}
