/**
 * Lib - Barrel export for all library modules
 */

// Core utilities
export * from "./utils";
export * from "./correlationId";
export * from "./email";
export * from "./performance";

// Reports (unified module)
export * from "./reports";

// GDPR compliance
export * from "./gdpr";

// Auth
export * from "./auth";

// Type adapters
export * from "./typeAdapters";

// Re-export subdirectories (consumers can import from subdirectories directly for specific modules)
// e.g., import { something } from "@/lib/auth"
// e.g., import { something } from "@/lib/documents"
