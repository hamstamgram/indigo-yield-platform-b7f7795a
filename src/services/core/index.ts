/**
 * Core Services - Foundational/infrastructure services
 */

// Auth is now in lib/auth - import from there
// export { AuthService, authService } from "./AuthService";
// export type { SignUpData, SignInData } from "./AuthService";

// Data integrity
export * from "./dataIntegrityService";

// System health
export * from "./systemHealthService";

// Session management
export * from "./sessionManagement";

// Report services
export * from "./reportUpsertService";

// Support service
export * from "./supportService";
