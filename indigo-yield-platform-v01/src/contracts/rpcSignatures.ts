/**
 * Canonical RPC Function Signatures
 *
 * This file defines the signatures for canonical RPC functions that enforce
 * proper gateway usage across the platform. These functions provide
 * standardized, secure interfaces for core platform operations.
 */

// ============================================================================
// CANONICAL RPC REGISTRY (Array for runtime checks)
// ============================================================================

/**
 * Complete list of canonical RPC functions allowed through the gateway.
 * Add new RPCs here when they are created in the database.
 */
export const CANONICAL_RPCS = [
  // Data Export & KPI
  'export_investor_data',
  'get_kpi_metrics',
  'run_integrity_monitoring',

  // Transaction Operations
  'void_transaction',
  'update_transaction',
  'void_and_reissue_transaction',
  'get_void_transaction_impact',
  'apply_deposit_with_crystallization',
  'apply_withdrawal_with_crystallization',

  // Withdrawal Workflow
  'create_withdrawal_request',
  'approve_withdrawal',
  'reject_withdrawal',
  'start_processing_withdrawal',
  'complete_withdrawal',
  'cancel_withdrawal_by_admin',
  'route_withdrawal_to_fees',
  'update_withdrawal',
  'delete_withdrawal',

  // Yield & Fee Operations
  'preview_yield_correction_v2',
  'apply_yield_correction_v2',
  'rollback_yield_correction',
  'regenerate_reports_for_correction',
  'get_yield_corrections',
  'get_void_yield_impact',
  'internal_route_to_fees',

  // Fund & AUM Operations
  'set_fund_daily_aum',
  'check_aum_reconciliation',
  'get_historical_nav',

  // Period & Snapshot Operations
  'generate_fund_period_snapshot',
  'lock_fund_period_snapshot',
  'unlock_fund_period_snapshot',
  'is_period_locked',
  'get_period_ownership',
  'get_statement_period_summary',

  // Reconciliation
  'reconcile_fund_period',
  'reconcile_investor_position',
  'force_delete_investor',

  // Delivery Operations
  'get_delivery_stats',
  'queue_statement_deliveries',
  'retry_delivery',
  'cancel_delivery',
  'mark_sent_manually',
  'requeue_stale_sending',

  // Admin Operations
  'update_admin_role',
  'get_user_admin_status',
  'is_super_admin',
  'is_admin',

  // Fund Query Operations
  'get_funds_with_aum',

  // Crystallization
  'batch_crystallize_fund',

  // Materialized Views
  'refresh_materialized_view_concurrently',
] as const;

export type CanonicalRpcName = typeof CANONICAL_RPCS[number];

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Base RPC function metadata interface
interface RPCMetadata {
  name: string;
  description: string;
  authRequired: boolean;
  adminOnly: boolean;
  category: 'data_export' | 'kpi_metrics' | 'monitoring' | 'core_operations' | 'transactions' | 'withdrawals' | 'yields' | 'admin';
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

// Generic RPC result for operations
interface OperationResult {
  success: boolean;
  message?: string;
  error_code?: string;
  data?: Record<string, unknown>;
}

// RPC function signatures (typed subset - extend as needed)
export interface CanonicalRPCFunctions {
  export_investor_data: {
    params: { investor_id_param: string };
    returns: InvestorDataExport;
    metadata: RPCMetadata;
  };

  get_kpi_metrics: {
    params: Record<string, never>;
    returns: KPIMetrics;
    metadata: RPCMetadata;
  };

  run_integrity_monitoring: {
    params: Record<string, never>;
    returns: IntegrityMonitoringResult;
    metadata: RPCMetadata;
  };

  void_transaction: {
    params: { p_transaction_id: string; p_admin_id: string; p_reason: string };
    returns: OperationResult;
    metadata: RPCMetadata;
  };

  get_void_transaction_impact: {
    params: { p_transaction_id: string };
    returns: {
      success: boolean;
      transaction_type?: string;
      transaction_amount?: number;
      current_position?: number;
      projected_position?: number;
      position_change?: number;
      would_go_negative?: boolean;
      aum_records_affected?: number;
    };
    metadata: RPCMetadata;
  };
}

// Metadata registry for documented RPCs
export const RPC_METADATA: Partial<Record<CanonicalRpcName, RPCMetadata>> = {
  export_investor_data: {
    name: 'export_investor_data',
    description: 'GDPR compliant data export with audit logging',
    authRequired: true,
    adminOnly: false,
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
  },

  void_transaction: {
    name: 'void_transaction',
    description: 'Void a transaction with audit trail',
    authRequired: true,
    adminOnly: true,
    category: 'transactions'
  },

  apply_deposit_with_crystallization: {
    name: 'apply_deposit_with_crystallization',
    description: 'Apply deposit with automatic yield crystallization',
    authRequired: true,
    adminOnly: true,
    category: 'transactions'
  },

  apply_withdrawal_with_crystallization: {
    name: 'apply_withdrawal_with_crystallization',
    description: 'Apply withdrawal with automatic yield crystallization',
    authRequired: true,
    adminOnly: true,
    category: 'transactions'
  },
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
  const metadata = RPC_METADATA[functionName];

  if (!metadata) {
    // RPC exists in registry but not in metadata - allow but log
    console.warn(`RPC ${functionName} has no metadata defined`);
  }

  // Basic validation
  return typeof params === 'object' && params !== null;
}

// Gateway enforcement helper
export function isCanonicalRPC(functionName: string): functionName is CanonicalRpcName {
  return CANONICAL_RPCS.includes(functionName as CanonicalRpcName);
}

export default CANONICAL_RPCS;