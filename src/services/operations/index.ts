/**
 * Operations Services - Re-exports all operational services
 */

// Operations metrics
export { operationsService } from "./operationsService";
export type { OperationsMetrics, PendingBreakdown } from "./operationsService";

// Position management
export * from "./positionAdjustmentService";

// Note: feeService removed in P2-01 (was unimplemented placeholder)
// Note: snapshotService removed in P1-03 (Unify AUM Snapshot Tables)
