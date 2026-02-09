/**
 * IB Services barrel export
 *
 * This module provides all IB (Introducing Broker) related services:
 * - ibManagementService: IB role assignment and management
 * - Config functions: IB configuration CRUD operations
 * - Referral functions: IB referral queries
 */

// IB config operations
export * from "./config";

// Referral queries
export * from "./referrals";

// Role management
export * from "./management";
export { ibManagementService } from "./management";
