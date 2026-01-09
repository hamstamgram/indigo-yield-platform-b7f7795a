# Schema Synchronization Audit Report - January 2026

## Audit Summary
- **Date**: 2026-01-09
- **Schema Health Score**: 6/10
- **TypeScript Alignment**: A-
- **Naming Consistency**: 9.5/10

## Critical Issues Identified

### P0 - Fix Immediately
1. **Deprecated `status` column** in transactions_v2 - use `is_voided` instead
2. **FK Constraint Redundancy** - transactions_v2 has 22 FKs with conflicting CASCADE
3. **87+ FK columns missing NOT NULL** constraints

### P1 - High Priority
4. **130+ `as any` casts** masking type errors
5. **Deprecated field mappings**: tx_type→type, effective_date→tx_date, current_balance→current_value
6. **20+ RPC calls** with incomplete typing

### P2 - Medium Priority
7. Date vs String inconsistency
8. Deprecated AdminInvestor interface (camelCase)
9. 100+ optional chaining patterns indicating nullable uncertainty

## Confirmed Alignments (No Action)
- snake_case convention: 100% aligned
- Supabase types generation: Current
- ENUM sync: 100%
- Domain types: 95%+ aligned

## Source of Truth Hierarchy
1. PostgreSQL Schema (PRIMARY)
2. supabase/types.ts (generated)
3. src/types/domains/* (must align)
4. Frontend components (consume)

## Key Files
- `src/integrations/supabase/types.ts` - 6,095 lines, auto-generated
- `src/types/domains/` - 19 files, 2,872 lines custom types
- `docs/DATA_MODEL.md` - Documents deprecated columns
