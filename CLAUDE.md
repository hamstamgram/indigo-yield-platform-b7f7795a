# Indigo Yield Platform

> **Project**: Indigo Yield Platform  
> **Type**: Crypto Yield/Investment Platform  
> **Stack**: React 18 + TypeScript + Vite + Tailwind CSS + Supabase (Lovable Cloud)

## Architecture

- **Frontend**: React SPA with React Router, TanStack Query, Zustand
- **Backend**: Supabase (PostgreSQL + Edge Functions + RLS)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Auth**: Supabase Auth with RBAC (investor/admin/super_admin)

## Core Documentation

| Topic | Location |
|-------|----------|
| Architecture | `docs/ARCHITECTURE.md` |
| Platform Inventory (Schema/RPCs/Views) | `docs/PLATFORM_INVENTORY.md` |
| Admin Guide | `docs/ADMIN_GUIDE.md` |
| Finance/Accounting Logic | `docs/CFO_ACCOUNTING_GUIDE.md` |
| Operations Manual | `docs/OPERATIONS_MANUAL.md` |
| Incident Playbook | `docs/INCIDENT_PLAYBOOK.md` |
| Flow Diagrams | `docs/flows/` |
| Page Contracts | `docs/page-contracts/` |

## Key Conventions

- **Types**: Import from `@/types/domains/` (fund, transaction, position, etc.)
- **Services**: Import from `@/services/` (admin, investor, shared)
- **Contracts**: RPC signatures in `src/contracts/rpcSignatures.ts`
- **DB Enums**: Mapped in `src/contracts/dbEnums.ts`

## Development Guidelines

- **Security**: Financial data platform - never log PII or secrets
- **RLS**: All tables have Row Level Security enabled
- **Audit**: All mutations logged to `audit_log` table
- **Testing**: Run `npm run build` before committing

## Archived Documentation

Historical audit reports, AI artifacts, and completed plans are in `docs/_archive/`.
These are NOT authoritative - use the canonical docs listed above.
