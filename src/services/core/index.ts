/**
 * Core Services - Foundational/infrastructure services
 */

export { ApiClient } from "./ApiClient";
export type { ApiResponse } from "./ApiClient";

export { AuthService, authService } from "./AuthService";
export type { SignUpData, SignInData } from "./AuthService";

export { PortfolioService, portfolioService } from "./PortfolioService";

// Data integrity
export * from "./dataIntegrityService";

// System health
export * from "./systemHealthService";

// Session management
export * from "./sessionManagement";

// Report services (email report generator moved to lib/reports)
export * from "@/lib/reports/emailReportGenerator";
export * from "./reportUpsertService";

// Support service
export * from "./supportService";
