// @ts-nocheck
/**
 * Service Layer - Central Export
 * Unified access to all business logic services
 */

export { ApiClient } from './ApiClient';
export type { ApiResponse } from './ApiClient';

export { AuthService, authService } from './AuthService';
export type { SignUpData, SignInData } from './AuthService';

export { InvestorService, investorService } from './InvestorService';
export type { InvestorFilters } from './InvestorService';

export { PortfolioService, portfolioService } from './PortfolioService';

// Re-export for convenience
export const services = {
  auth: authService,
  investor: investorService,
  portfolio: portfolioService,
};
