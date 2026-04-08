# Next Steps for Indigo Yield Platform

## Accomplished in this session:
1. ✅ Added `test_void_yield_distribution` function to seeds file
2. ✅ Created migration `20260407_formalize_local_db_patches.sql` to:
   - Make `investor_yield_events.investor_balance` nullable
   - Make `investor_yield_events.investor_share_pct` nullable
   - Make `investor_yield_events.fund_yield_pct` nullable
   - Patch `void_yield_distribution` to support `test_admin_override` session flag
   - Patch `apply_transaction_with_crystallization` to support `test_admin_override` session flag
3. ✅ Verified all 45 integration tests pass
4. ✅ Verified TypeScript compilation passes with no errors
5. ✅ Updated handoff.md with completed work and remaining tasks

## Waiting for Agent Reports:
Two background agents are currently running:
- **ui-auditor** (frontend-architect agent): Auditing all 129 custom hooks in src/
- **db-auditor** (database-specialist agent): Auditing database schema for dead tables/columns

## Immediate Next Tasks (after agent reports complete):

### TASK 3: Synthesize agent reports
- Read ui-auditor output from `/private/tmp/claude-501/-Users-mama/e4207d04-a7ae-4631-a1ec-a0c69e7a1337/tasks/aa8d5f63b2172aa17.output`
- Read db-auditor output from `/private/tmp/claude-501/-Users-mama/e4207d04-a7ae-4631-a1ec-a0c69e7a1337/tasks/a4f91ff9db80f132c.output`
- Create combined remediation plan

### TASK 4: Page-by-page UI audit fixes
Based on agent reports, fix:
- Broken onClick handlers
- Dead routes
- Components calling supabase directly (should go through service gateway)
- Hardcoded data instead of real queries
- Missing backend connections

Priority order:
1. Admin portal yield operations (`/admin/yield`, `/admin/yield-distributions`)
2. Admin investor detail (`/admin/investors/:id`)
3. Investor portal overview (`/investor`)

### TASK 5: Schema cleanup
Based on db-auditor report:
1. For each table/column identified as dead:
   - Verify it is truly unused (grep src/ for references)
   - Create a migration to DROP it
   - Run tests after each migration
   - Confirm 45/45 still pass
2. Never drop without verifying no src/ references exist

## Verification After All Tasks:
```bash
npm run test:integration:yield  # Should show 45/45 tests passing
npm test                        # Full test suite
npx tsc --noEmit                # TypeScript check
```