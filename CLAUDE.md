# indigo-yield-platform-v01 - Claude AI Context

> Last updated: 2025-12-06
> Auto-maintained by Claude Code workflow

---

## ⚠️ CRITICAL PLATFORM RULES (NEVER FORGET)

### 1. ALL VALUES ARE IN NATIVE TOKENS - NEVER DOLLARS
This is a **crypto-native platform**. All balances, AUM, transactions, and displays are in the asset's native token:
- ✅ `41.34 BTC` (41.34 Bitcoin tokens)
- ✅ `664.58 ETH` (664.58 Ethereum tokens)
- ✅ `3,433,304.84 USDT` (3.4M Tether tokens)
- ❌ NEVER display as `$41.34` or any fiat currency

### 2. THE 7 CANONICAL FUNDS (No others)
| Fund Name | Code | Asset | CDN Logo Key |
|-----------|------|-------|--------------|
| BTC Yield Fund | IND-BTC | BTC | `BTC YIELD FUND` |
| ETH Yield Fund | IND-ETH | ETH | `ETH YIELD FUND` |
| SOL Yield Fund | IND-SOL | SOL | `SOL YIELD FUND` |
| Stablecoin Fund | IND-USDT | USDT | `Stablecoin Fund` |
| Tokenized Gold | IND-XAUT | xAUT | `Tokenized Gold` |
| XRP Yield Fund | IND-XRP | XRP | `XRP YIELD FUND` |
| EURC Yield Fund | IND-EURC | EURC | `EURC YIELD FUND` |

**NOT included**: USDC - this is NOT a platform fund. Remove all USDC references.

### 3. USE CDN LOGOS FROM storage.mlcdn.com
All asset/fund logos are hosted on the Indigo CDN. Never use CoinGecko or other external logo sources for official displays.

---

## Project Overview

**Type:** Web Application (Frontend + Supabase Backend)
**Framework:** React 18 + Vite
**Language:** TypeScript (strict mode)
**Status:** Active development - Production deployed on Vercel

**Description:**
Multi-platform investment platform for INDIGO Fund with web and planned iOS applications.
Manages investor onboarding, portfolio tracking, statements, and communications.

---

## Architecture

### Technology Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, Radix UI, shadcn/ui |
| State | TanStack Query, React Context |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| Testing | Jest, Playwright, Vitest |
| Deployment | Vercel (web), Supabase (backend) |

### Project Structure
```
src/
├── components/      # UI components (26 subdirs)
├── hooks/           # Custom hooks (21 files)
├── routes/          # Page routes (24 files)
├── lib/             # Utilities (18 files)
├── config/          # Configuration
├── integrations/    # External integrations
├── middleware/      # Request middleware
└── features/        # Feature modules

supabase/
├── migrations/      # Database migrations
└── functions/       # Edge Functions (archived)
```

### Key Patterns
- **Auth:** Supabase Auth with Row Level Security (RLS)
- **State:** TanStack Query for server state, React Context for client state
- **Forms:** React Hook Form + Zod validation
- **Styling:** Tailwind with design tokens, Radix primitives

---

## Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run type-check       # TypeScript check

# Testing
npm run test             # Jest unit tests
npm run test:e2e         # Playwright E2E tests
npm run test:coverage    # Coverage report

# Linting
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix issues
npm run format           # Prettier format

# Database
supabase db push         # Apply migrations
supabase db pull         # Pull remote schema
supabase migration list  # List migrations
```

---

## Environment Variables

### Required
```
VITE_SUPABASE_URL        # Supabase project URL
VITE_SUPABASE_ANON_KEY   # Supabase anon key
```

### Optional
```
VITE_PREVIEW_ADMIN       # Enable admin preview
VITE_APP_ENV             # Environment (dev/staging/prod)
VITE_SENTRY_DSN          # Sentry error tracking
VERCEL_TOKEN             # Vercel deployment
```

### Secrets (Keychain)
Stored in macOS Keychain for security:
- `supabase-url` (service) / `claude-ai` (account)
- `supabase-anon-key` (service) / `claude-ai` (account)

---

## Code Conventions

### TypeScript
- Strict mode enabled
- Use interfaces over types for objects
- Explicit return types on public functions
- No `any` - use `unknown` with type guards

### React
- Functional components only
- Custom hooks for reusable logic
- Memoize expensive computations
- Use React.lazy for code splitting

### Naming
- Components: `PascalCase` (e.g., `InvestorCard.tsx`)
- Hooks: `camelCase` with `use` prefix (e.g., `useInvestorData.ts`)
- Utils: `camelCase` (e.g., `formatCurrency.ts`)
- Constants: `SCREAMING_SNAKE_CASE`

### File Organization
- One component per file
- Co-locate tests with components
- Group by feature when possible

---

## Security Guidelines

1. **Never hardcode secrets** - Use Keychain or env vars
2. **Validate all inputs** - Use Zod schemas
3. **Trust RLS** - Supabase handles auth at DB level
4. **Sanitize outputs** - XSS prevention on user content
5. **Use HTTPS only** - Enforced by Vercel

---

## Recent Changes

```
d921b02 Cleanup: Archive unused Supabase Edge Functions
f18a069 Ultrathink Cleanup: Archive docs, delete unused migrations/scripts/components
560004f Final: Complete Data Restoration Pipeline
1c33852 Final: Deploy Edge Function and Migration for Master Data Import
```

---

## Active Focus Areas

1. **Investor Portal** - Dashboard, statements, communications
2. **Admin Dashboard** - Investor management, platform settings
3. **Data Pipeline** - Import/export, reporting
4. **Security Hardening** - RLS policies, audit logging

---

## Claude AI Instructions

### Preferred Approach
1. Explore codebase before making changes
2. Use existing patterns and abstractions
3. Write tests for new functionality
4. Keep changes minimal and focused

### Model Selection
- **Complex planning:** Use `/ultrathink` or `/plan` (Opus)
- **Exploration:** Use `/explore` (Sonnet)
- **Quick fixes:** Direct implementation (default)

### Testing Requirements
- Unit tests for utilities and hooks
- Integration tests for critical flows
- E2E tests for user journeys
- Minimum 80% coverage on critical paths

---

*Generated by Claude Code Workflow System*
*Synced with ~/.claude/shared_memory.json*
