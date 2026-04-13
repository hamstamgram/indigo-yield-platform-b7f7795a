# Environment Issues Backlog

**Created:** 2026-04-13 (post-merge)  
**Scope:** Pre-existing infrastructure issues tracked separately from code quality  
**Priority:** Medium (resolve before Phase 2 smoke testing)

## Issue 1: TypeScript Compilation Heap OOM

**Status:** Open  
**Severity:** Medium  
**Blocker for:** Full-repo typecheck, CI/CD pipeline  

### Description
`npx tsc --noEmit` hits JavaScript heap out of memory even with 4GB allocation. Root cause appears to be type inference explosion on `src/integrations/supabase/types.ts` (8500 lines auto-generated).

### Current State
- tsconfig.json includes `skipLibCheck: true` (global)
- docs/audit directory excluded from compilation
- Individual file type checking works
- Full-repo check fails consistently

### Investigation Needed
1. Determine if supabase/types.ts is causing circular type inference
2. Check if there's a TypeScript compiler regression or known issue
3. Evaluate options:
   - Split types.ts into smaller files
   - Use type-only imports to reduce inference burden
   - Enable incremental compilation with better caching
   - Upgrade TypeScript version

### Workaround
Skip full-repo typecheck for now; individual builds and Vite compilation succeed.

### Success Criteria
Full `npx tsc --noEmit` completes without heap allocation failure and finds no type errors.

---

## Issue 2: Test Framework Configuration Mismatch

**Status:** Open  
**Severity:** Low  
**Blocker for:** Unit test execution  

### Description
`npm test` fails during test file discovery. File `tests/validation/fundLifecycle.spec.ts` uses Playwright test APIs (`test.describe.serial()`) but the test runner is Vitest, causing:
```
Error: Playwright Test did not expect test.describe() to be called here.
```

### Current State
- Vitest configured as test runner (vitest run)
- E2E tests in tests/e2e/ are separate (Playwright-based)
- Unit test files use Vitest API (mostly)
- tests/validation/ mixes Playwright and Vitest APIs

### Investigation Needed
1. Determine if tests/validation/ should be:
   - Migrated to Vitest API
   - Run separately with Playwright
   - Deleted (if redundant with e2e tests)
2. Check if there are version conflicts in package.json

### Workaround
Skip failing test file; e2e tests in tests/e2e/ work independently.

### Success Criteria
`npm test` runs without errors; either tests/validation/ is properly configured or removed.

---

## Issue 3: Supabase Local Development Stability

**Status:** Open  
**Severity:** Medium  
**Blocker for:** Local database reset, migration testing  

### Description
`supabase db reset` causes containers to crash with exit code 143 (SIGTERM) during extended operations. Docker containers run out of resources or timeout after migrations apply successfully.

### Current State
- Migrations apply without SQL errors before container crash
- Database schema changes are valid
- Problem is environment/Docker resource management, not migrations
- Can start fresh with `supabase stop && supabase start`

### Investigation Needed
1. Check Docker resource limits (memory, CPU)
2. Check if there are long-running operations timing out
3. Determine if this is specific to this repo or global Docker issue
4. Evaluate options:
   - Increase Docker desktop memory allocation
   - Run migrations incrementally instead of full reset
   - Switch to alternative local dev setup (e.g., neon, local postgres)

### Workaround
Run migrations incrementally or use cloud database for development.

### Success Criteria
`supabase db reset` completes cleanly without container crashes.

---

## Resolution Order

1. **Supabase Docker Stability** (first) — Needed for Phase 2 migration testing
2. **Test Framework Config** (parallel) — Lower priority, can file separate
3. **TypeScript Heap OOM** (last) — Least critical, doesn't block development

## Integration with Phase 2

**Phase 2 Prerequisite:** Smoke testing suite must be executable end-to-end.

- If TypeScript heap OOM not resolved: Can use incremental compilation workaround
- If Test Framework Config not resolved: E2E tests can run independently
- If Supabase Stability not resolved: Cannot run local regression tests

**Recommendation:** Resolve Supabase stability before Phase 2 smoke testing begins. The other two are blocking CI/CD but not local development.

---

## Ticket Templates

### Ticket 1: Fix TypeScript Heap OOM During Full-Repo Compilation

```
Title: TypeScript compilation hits heap OOM on supabase/types.ts
Severity: Medium
Area: Build / Type Checking
Description:
npx tsc --noEmit fails with "Allocation failed - JavaScript heap out of memory" even with NODE_OPTIONS='--max-old-space-size=4096'

Root cause likely in src/integrations/supabase/types.ts (8500 lines, auto-generated).

Investigation:
- Analyze type inference on supabase/types.ts
- Check for circular type dependencies
- Evaluate incremental compilation with caching
- Consider splitting types.ts into smaller modules

Acceptance Criteria:
- npx tsc --noEmit completes without heap error
- No type errors reported
- Completes in <60 seconds

Workaround:
- Use tsconfig.json with skipLibCheck: true (already in place)
- Can build individual files without issue
- Vite dev server works without this check
```

### Ticket 2: Fix Test Framework Configuration Mismatch (Playwright vs Vitest)

```
Title: Unit test suite fails during discovery due to Playwright/Vitest API mismatch
Severity: Low
Area: Testing
Description:
npm test fails with error about test.describe() being called in wrong context.
File tests/validation/fundLifecycle.spec.ts uses Playwright test APIs but runner is Vitest.

Options:
A) Migrate tests/validation/ to Vitest API
B) Move tests/validation/ to separate Playwright test runner
C) Delete tests/validation/ if redundant with tests/e2e/

Investigation:
- Check if tests/validation/ is separate from e2e suite
- Determine proper home for these tests
- Check version conflicts in package.json

Acceptance Criteria:
- npm test runs without configuration errors
- All intended tests execute or are properly excluded
```

### Ticket 3: Fix Supabase Local Development Docker Stability

```
Title: supabase db reset causes container crash after migrations apply
Severity: Medium
Area: Local Development / Docker
Description:
supabase db reset succeeds through all migrations but then Docker containers exit with code 143 (SIGTERM).
Appears to be resource exhaustion or timeout, not migration errors.

Investigation:
- Check Docker desktop memory/CPU allocation
- Monitor resource usage during reset
- Check for long-running operations timing out
- Evaluate incremental migration approach

Acceptance Criteria:
- supabase db reset completes cleanly
- All migrations apply successfully
- Containers remain running and healthy
- DB is in valid state post-reset
```

---

## Owner Assignment

These tickets should be assigned to:
- **Infrastructure/DevOps:** Issues 1 and 3 (build tooling, Docker environment)
- **QA/Test Engineering:** Issue 2 (test framework configuration)

Do not assign to the backend cleanup team — these are environment issues pre-dating the cleanup work.
