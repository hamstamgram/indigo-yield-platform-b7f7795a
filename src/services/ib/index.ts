/**
 * IB Services barrel export
 * 
 * This module provides all IB (Introducing Broker) related services:
 * - ibService: Portal operations for IB users (referrals, commissions, payouts)
 * - ibAllocationService: Allocation calculations used during yield distribution
 */

// Portal operations - for IB users viewing their dashboard, referrals, commissions
export * from './ibService';
export { ibService } from './ibService';

// Allocation calculations - used internally during yield distribution
export * from './allocations';
export { ibAllocationService } from './allocations';
