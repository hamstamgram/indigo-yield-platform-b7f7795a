

## Fix: Malformed JSDoc Comment in `src/services/admin/index.ts`

### Root Cause
Line 7 contains `src/features/admin/*/services/`. The `*/` within this path prematurely terminates the JSDoc comment block. So line 8's `*/` is no longer inside a comment — esbuild sees a bare `*/` as code, causing "Unexpected *".

### Fix
One change to `src/services/admin/index.ts`: rewrite the JSDoc comment to avoid `*/` inside the comment body.

**Replace lines 1-8:**
```ts
//
// Admin Services - Barrel Export (Canonical Redirect Shim)
//
// This file serves as a re-export shim to maintain backward compatibility
// during the migration to feature-based architecture.
//
// ALL active logic has been moved to src/features/admin/{domain}/services/
//
```

This switches from a block comment (`/** */`) to line comments (`//`), eliminating the premature close issue entirely. No other files need changes.

