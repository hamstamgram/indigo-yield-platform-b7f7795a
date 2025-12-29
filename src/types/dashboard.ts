/**
 * Dashboard Types
 * Types for dashboard widgets and data
 */

export interface FundWithAUM {
  id: string;
  name: string;
  asset: string;
  currentAUM: number;
}

export interface ActivityItem {
  id: string;
  type: "deposit" | "withdrawal" | "yield" | "user" | "report" | "transaction";
  title: string;
  description: string;
  timestamp: Date;
  metadata?: {
    amount?: number;
    asset?: string;
    investorName?: string;
  };
}

export interface PendingItem {
  id: string;
  type: "withdrawal" | "report";
  title: string;
  subtitle: string;
  amount?: string;
  timestamp: Date;
  priority: "high" | "medium" | "low";
}
