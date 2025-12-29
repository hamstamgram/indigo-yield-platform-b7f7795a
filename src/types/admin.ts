/**
 * Admin Types
 * @deprecated Most types should be imported from "@/types/domains" instead
 * 
 * This file maintains backward compatibility for imports that haven't been migrated yet.
 */

// Re-export from canonical sources
export {
  type Investor,
  type InvestorStatus,
  type AdminInvestor,
} from "./domains/investor";

export {
  type Transaction,
  type TransactionType,
  type TransactionSummary,
  type TransactionFilter,
} from "./domains/transaction";

// Legacy types that are still specific to admin UI

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
  period: string;
  status: "queued" | "generated" | "failed";
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
  status: "open" | "pending" | "resolved";
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
  priority: "low" | "medium" | "high";
}
