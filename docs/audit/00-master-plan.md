# Master Plan

## Goal
Stabilize and align the codebase, schema, migrations, functions, types, and frontend/backend contracts without breaking working business logic.

## Current Status (2026-04-13)
- **Repo**: indigo-yield-platform (Indigo Yield Platform)
- **Supabase Project**: nkfimvovosdehmyyjubn
- **Issue**: Local Supabase start fails at migration 20260413 (void/cascade test assertions)
- **Approach**: Audit from schema artifacts, fix migrations forensically, then stabilize local DB

## Rules
- Inventory first
- Classify second
- Map dependencies third
- Patch only after evidence exists
- One domain at a time
- One cleanup batch at a time

## Audit Phases

### Phase 1: Evidence Collection (Days 1-2)
1. Generate schema dumps from remote
2. Inventory all migrations
3. Map repo structure
4. Document existing patterns

### Phase 2: Analysis (Days 3-4)
5. Forensic migration analysis
6. Service/hook dependency mapping
7. Contract mismatch detection
8. Dead code identification

### Phase 3: Stabilization (Days 5+)
9. Fix migration issues
10. Align types and contracts
11. Remove dead code
12. Validate business logic

## Next Steps
1. Generate remote schema dump
2. Pull and analyze migrations
3. Create repo map
4. Document findings
