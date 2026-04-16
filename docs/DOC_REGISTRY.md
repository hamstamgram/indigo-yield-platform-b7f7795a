# Doc Registry

## Active Documents
| Path | Purpose | Last Updated |
|------|---------|-------------|
| `AGENTS.md` | AI agent operating instructions | 2026-04-15 |
| `CHANGELOG.md` | Version history | 2026-04-15 |
| `CONTRIBUTING.md` | Contributor guidelines | 2026-04-15 |
| `docs/adr/` | Architecture Decision Records | 2026-04-15 |
| `docs/DEPLOYMENT_RUNBOOK.md` | Deployment procedures | 2026-04-15 |
| `docs/verification/INVARIANT_REGISTRY.md` | Financial invariants I1-I7 | — |
| `docs/POST_LAUNCH_TECH_DEBT.md` | P0/P1/P2 debt tracking | — |
| `docs/release/00-canonical-contract.md` | Frontend/backend contract | — |
| `supabase/migrations/README.md` | Migration rules | 2026-04-15 |

## Audit Documents (Historical)
| Path | Purpose | Status |
|------|---------|--------|
| `docs/audit/00-master-plan.md` | Audit phases | Canonical |
| `docs/audit/04-migration-forensics.md` | Migration analysis | Partially superseded (pre-squash) |
| `docs/audit/08-domain-canonical-contracts.md` | Domain contracts | Needs update |
| `docs/audit/17-migration-baseline-strategy.md` | Baseline strategy | Deprecated (superseded by ADR 001) |
| `docs/audit/backups/` | Remote DB backups | 2026-04-15 |

## Superseded Documents
| Path | Reason | Replacement |
|------|--------|-------------|
| `docs/audit/17-migration-baseline-strategy.md` | Squash strategy decided | ADR 001 |
| `docs/source-of-truth/CLAUDE_lovable.md` | Outdated Lovable-era handoff | AGENTS.md |
| `docs/audit/_remote-public-schema.sql` | Stale (April 13) | `docs/audit/backups/remote_schema_20260415.sql` |
| `docs/audit/_remote-db-types.ts` | Stale | `src/integrations/supabase/types.ts` |