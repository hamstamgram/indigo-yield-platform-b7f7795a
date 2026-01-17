/**
 * Canonical RPC Function Signatures
 *
 * This file defines the signatures for canonical RPC functions that enforce
 * proper gateway usage across the platform. These functions provide
 * standardized, secure interfaces for core platform operations.
 */

// Base RPC function metadata interface
interface RPCMetadata {
  name: string;
  description: string;
  authRequired: boolean;
  adminOnly: boolean;
  category: 'data_export' | 'kpi_metrics' | 'monitoring' | 'core_operations';
}

// Export data types
interface InvestorDataExport {
  personal_info: {
    user_id: string;
    full_name: string;
    email: string;
    created_at: string;
  };
  investments: Array<{
    investment_id: string;
    amount: number;
    investment_date: string;
    status: string;
  }>;
  transactions: Array<{
    transaction_id: string;
    type: string;
    amount: number;
    date: string;
  }>;
  export_timestamp: string;
  export_requested_by: string;
}

// KPI metrics types
interface KPIMetrics {
  total_aum: number;
  total_investors: number;
  monthly_inflows: number;
  monthly_outflows: number;
  avg_investment_size: number;
  fund_performance: {
    ytd_return?: number;
    total_yield_paid?: number;
  };
  calculated_at: string;
  calculated_by: string;
}

// Integrity monitoring types
interface IntegrityMonitoringResult {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  violations_count: number;
  warnings: string[];
  checks_performed: string[];
  monitoring_timestamp: string;
  monitored_by: string;
  system_health_score: number;
}

// RPC function signatures
export interface CanonicalRPCFunctions {
  export_investor_data: {
    params: { investor_id_param: string };
    returns: InvestorDataExport;
    metadata: RPCMetadata;
  };

  get_kpi_metrics: {
    params: Record<string, never>; // No parameters
    returns: KPIMetrics;
    metadata: RPCMetadata;
  };

  run_integrity_monitoring: {
    params: Record<string, never>; // No parameters
    returns: IntegrityMonitoringResult;
    metadata: RPCMetadata;
  };
}

// Canonical RPC function registry
export const CANONICAL_RPCS: Record<keyof CanonicalRPCFunctions, RPCMetadata> = {
  export_investor_data: {
    name: 'export_investor_data',
    description: 'GDPR compliant data export with audit logging',
    authRequired: true,
    adminOnly: false, // Users can export their own data
    category: 'data_export'
  },

  get_kpi_metrics: {
    name: 'get_kpi_metrics',
    description: 'Standardized KPI calculations with security checks',
    authRequired: true,
    adminOnly: true,
    category: 'kpi_metrics'
  },

  run_integrity_monitoring: {
    name: 'run_integrity_monitoring',
    description: 'Automated system health and violation detection',
    authRequired: true,
    adminOnly: true,
    category: 'monitoring'
  }
};

// Type helper for RPC calls
export type RPCCall<T extends keyof CanonicalRPCFunctions> = {
  functionName: T;
  params: CanonicalRPCFunctions[T]['params'];
};

// Type helper for RPC responses
export type RPCResponse<T extends keyof CanonicalRPCFunctions> =
  CanonicalRPCFunctions[T]['returns'];

// Validation helper
export function validateRPCCall<T extends keyof CanonicalRPCFunctions>(
  functionName: T,
  params: unknown
): params is CanonicalRPCFunctions[T]['params'] {
  const metadata = CANONICAL_RPCS[functionName];

  if (!metadata) {
    throw new Error(`Unknown canonical RPC function: ${functionName}`);
  }

  // Basic validation - in a real implementation, you'd have more sophisticated validation
  return typeof params === 'object' && params !== null;
}

// Gateway enforcement helper
export function isCanonicalRPC(functionName: string): functionName is keyof CanonicalRPCFunctions {
  return functionName in CANONICAL_RPCS;
}

export default CANONICAL_RPCS;