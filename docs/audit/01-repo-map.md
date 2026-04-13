# Repository Map

## Project Overview
- **Name**: indigo-yield-platform
- **Type**: Full-stack TypeScript/React platform
- **Supabase Project**: nkfimvovosdehmyyjubn (Indigo Yield)
- **Primary Focus**: Investor fund management, yield distribution, reporting

## Top-Level Folder Structure

| Path | Purpose | Category | Status |
|------|---------|----------|--------|
| `/src` | React application code | core application | active |
| `/supabase` | Database migrations, functions, configs | backend / database | active |
| `/docs` | Documentation | docs | active |
| `/public` | Static assets | generated | active |
| `/scripts` | Build and utility scripts | build | active |
| `/tests` | Test files | tests | active |
| `/coverage` | Test coverage reports | generated | active |
| `/.github` | GitHub workflows | ci | active |
| `/.claude` | Claude Code config | tools | active |
| `/.husky` | Git hooks | tools | active |
| `/.serena` | Serena AI tools config | tools | active |

## Critical Folders

### `/src` — React Application
- **components/** — UI components (pages, common, forms, reporting, dashboard)
- **hooks/** — Custom hooks for Supabase queries, auth, session management
- **services/** — Business logic (investors, funds, transactions, yield)
- **types/** — TypeScript type definitions and schemas
- **utils/** — Helper utilities, validation, formatting
- **lib/** — Supabase client initialization, authentication setup

### `/supabase` — Database Layer
- **migrations/** — 98 migration files (see forensics)
- **functions/** — 20 Edge Functions (yield, reporting, auth, webhooks)
- **config.toml** — Supabase local configuration
- **seed/** — Optional seed data

## Key Observations

### Active Components
- ✅ React 18 application with TypeScript strict mode
- ✅ Tailwind CSS + shadcn/ui component library
- ✅ Supabase PostgREST API + RLS policies
- ✅ Edge Functions for business logic
- ✅ Test coverage with Vitest + Playwright

### Suspicious Areas
- ⚠️ Multiple migration backup folders (migrations_bak, migrations_broken, migrations_fixes, migrations_essential)
- ⚠️ 98 migrations for single project (potential consolidation needed)
- ⚠️ Migration 20260413135228 causes local startup failure (void/cascade test assertions)
- ⚠️ Inconsistent migration naming (some UUIDs, some dates)

### Legacy/Uncertain
- ❓ `/supabase/archived_migrations` — unclear why archived
- ❓ `/supabase/functions_archive` — which functions are truly archived?
- ❓ `/supabase/snippets` — test scripts, not clear if in use

## Documentation Inventory

| File | Purpose | Status |
|------|---------|--------|
| README.md | Project overview | basic |
| docs/SCHEMA.md | Database schema | exists |
| docs/API.md | API endpoints | exists |
| docs/WORKFLOWS.md | User workflows | exists |

## Tech Stack Summary

- **Frontend**: React 18 + TypeScript + Vite + Tailwind
- **Backend**: Supabase (PostgreSQL + PostgREST + Edge Functions)
- **Testing**: Vitest + Playwright
- **Build**: Vite
- **Package Manager**: npm/bun
- **Database**: PostgreSQL 17 (from config.toml)

## Recommended Inspection Order

1. **Next**: Schema inventory (migrations & table structure)
2. **Then**: Service/hook map (business logic dependencies)
3. **Then**: Contract mismatches (frontend/backend alignment)
4. **Finally**: Dead code and cleanup opportunities
