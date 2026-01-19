/**
 * Contracts Module
 * Central export for all database and RPC contracts
 * 
 * These contracts define the interface between the frontend and backend,
 * ensuring type safety for database operations and RPC calls.
 */

// Database enums (source of truth for enum values)
export * from './dbEnums';

// Database schema type helpers
export {
  DB_TABLES,
  COMPOSITE_PK_TABLES,
  IDEMPOTENT_TABLES,
  hasCompositePK,
  getPrimaryKeyColumns,
  columnExists,
  getTableColumns,
  requiresIdempotency as tableRequiresIdempotency,
  type TableName,
  type TableColumns,
  type TablePrimaryKey,
  type CompositePKTable,
} from './dbSchema';

// RPC function signatures
export {
  RPC_FUNCTIONS,
  CANONICAL_MUTATION_RPCS,
  PROTECTED_TABLES,
  READ_ONLY_RPCS,
  MUTATION_RPCS,
  IDEMPOTENT_RPCS,
  isReadOnlyRPC,
  isMutationRPC,
  requiresIdempotency as rpcRequiresIdempotency,
  isProtectedTable,
  getCanonicalRPC,
  isValidRPCFunction,
  type RPCFunctionName,
  type IdempotentRPC,
  type ReadOnlyRPC,
  type MutationRPC,
  type ProtectedTable,
  type RPCArgs,
  type RPCReturns,
} from './rpcSignatures';
