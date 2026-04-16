

# Fix All Build Errors

## Problems (4 total)

1. **`send-investor-report/index.ts`** — `serviceClient` declared twice (lines 82 and 206) in the same block scope.
2. **`excel_import/index.ts`** — `checkAdminAccess(supabase, ...)` fails due to SupabaseClient version mismatch.
3. **`yieldAumService.ts`** — `p_tolerance_pct` used but the RPC expects `p_tolerance`.
4. **`validate-funds.ts`** — imports from `./src/lib/validation/reportGenerator` and `./src/lib/validation/comparator` which don't exist.

Note: `types.ts` line 1 is already clean (`export type Json =`), so no fix needed there.

## Fixes

### 1. `supabase/functions/send-investor-report/index.ts`
Remove the second `const serviceClient = createClient(...)` block at line 206-209. Reuse the existing variable from line 82.

### 2. `supabase/functions/excel_import/index.ts`
Cast the argument: `checkAdminAccess(supabase as any, user.id)` at line 86.

### 3. `src/features/admin/yields/services/yields/yieldAumService.ts`
Rename `p_tolerance_pct` → `p_tolerance` at line 90.

### 4. `validate-funds.ts`
This is a standalone script at project root referencing missing modules. Either delete it or exclude it from the build. Since it's a one-off validation script not part of the app, the cleanest fix is to delete it.

## Risk
All four are low-risk, isolated fixes with no downstream impact.

