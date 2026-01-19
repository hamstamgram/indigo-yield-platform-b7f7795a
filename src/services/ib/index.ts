/**
 * IB Services barrel export
 * 
 * This module provides all IB (Introducing Broker) related services:
 * - ibService: Portal operations for IB users (referrals, commissions, payouts)
 * - ibAllocationService: Allocation calculations used during yield distribution
 * - ibManagementService: IB role assignment and management
 * - Config functions: IB configuration CRUD operations
 * - Referral functions: IB referral queries
 */

// Portal operations - for IB users viewing their dashboard, referrals, commissions
export * from './ibService';
export { ibService } from './ibService';

// Allocation calculations - used internally during yield distribution
export * from './allocations';
export { ibAllocationService } from './allocations';

// IB config operations
export * from './config';

// Referral queries
export * from './referrals';

// Role management
export * from './management';
export { ibManagementService } from './management';
