/**
 * Lib - Barrel export for all library modules
 */

// Core utilities
export * from "./utils";
export * from "./correlationId";
export * from "./email";
export * from "./performance";

// GDPR compliance
export * from "./gdpr";

// Type adapters
export * from "./typeAdapters";

// Error handling utilities
export * from "./errors";

// NOTE: Auth and Reports have moved to services layer
// Use: import { useAuth } from "@/services/auth"
// Use: import { ReportEngine } from "@/services/reports"
