# Deployment Runbook

## Pre-Deployment Checklist
1. `npx tsc --noEmit` — Type check passes
2. `npm run lint` — Lint passes
3. `npm run test` — Tests pass
4. `npx supabase db diff --linked` — No unexpected drift
5. `npx supabase migration list` — Local matches remote

## Deploying Migrations
```bash
npx supabase db push --linked
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
npm run build
```

## Emergency Rollback
If a migration causes issues on remote:
1. `npx supabase migration repair --status reverted <version>` — mark as reverted
2. Create a new compensating migration (never amend)
3. `npx supabase db push --linked` — push the fix

## Database Reset (Local Only)
```bash
npx supabase db reset
```
This drops and recreates the local DB from migrations + seeds.

## Backup Verification
```bash
npx supabase db dump --linked > backup_schema.sql
npx supabase db dump --linked --data-only > backup_data.sql
```
Backups also stored in `docs/audit/backups/`.

## Schema Verification Against Remote
```bash
npx supabase db diff --linked
```
Should show only storage policies as differences (expected — Supabase manages these).

## Post-Deployment Verification
1. Check `npx supabase migration list` shows all migrations applied
2. Verify core RPCs work via frontend
3. Run invariant queries from `docs/verification/INVARIANT_REGISTRY.md`
4. Check `scripts/db-smoke-test.sh`

## Known Operational Gaps

### Unvoid Does NOT Restore Cascade-Voided Records
When a transaction is voided, the cascade voids related records (yield distributions, fee allocations, IB ledger entries, AUM events). When the transaction is unvoided:
- **Restored**: The transaction itself (is_voided = false), the investor position (via trigger)
- **NOT restored**: Cascade-voided yield_distributions, fee_allocations, ib_commission_ledger, platform_fee_ledger, investor_yield_events
- **AUM**: Recalculated automatically via `recalculate_fund_aum_for_date`
- **Action required**: If the unvoided transaction was a yield-related type, manually re-apply the yield distribution for the affected period