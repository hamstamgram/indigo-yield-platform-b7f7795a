# Rollback Runbook — Indigo Yield Go-Live

**Version:** v1 (2026-04-20)
**Owner:** Platform lead
**Scope:** Recovery path for prod failures on Supabase project `nkfimvovosdehmyyjubn` after go-live hardening cutover.

---

## 1. Backup posture at go-live

### 1.1 PITR (Point-in-Time Recovery)

- **Plan:** Supabase Pro → PITR enabled, 7-day retention window.
- **Access:** Supabase dashboard → Project `nkfimvovosdehmyyjubn` → Database → Backups → "Restore to point in time".
- **Granularity:** per-second restore inside retention window.
- **Verification:** PITR timestamp visible in dashboard at cutover time; screenshot archived in `docs/runbooks/evidence/pitr-<cutover-date>.png`.

### 1.2 Migration ledger (authoritative schema history)

Captured via `mcp__supabase__list_migrations` at cutover:

```
20260415000000  squash_canonical_baseline
20260415000001  squash_reconciliation
20260416055420  financial_logic_p2_fixes
...
20260417220000  ledger_derived_aum_rpcs
20260420000000  fix_get_investor_ledger_balance_caller_check
20260420010000  fix_get_investor_all_ledger_balances_caller_check
```

Full inventory regenerates on demand with MCP `list_migrations`. Any schema rollback must replay from squash baseline (`20260415000000`) forward — not from an arbitrary migration — because later files assume baseline objects exist.

### 1.3 Why no `pg_dump` artifact

The direct `postgres://` password is not in the local environment and is not required for this plan. All schema / data operations in this hardening round run through Supabase MCP (`execute_sql` / `apply_migration`), which is audited in Supabase logs. Should a full logical dump be required post-incident, request dashboard-scoped DB credentials at that time rather than storing them long-lived.

---

## 2. Tag conventions

| Tag                                    | Meaning                                                    |
| -------------------------------------- | ---------------------------------------------------------- |
| `pre-golive-hardening-2026-04-20`      | HEAD of `main` immediately before Phase 2 executes on prod |
| `golive-2026-04-20`                    | HEAD of `main` at the moment cutover is declared green     |

Both tags are annotated and signed where possible. Push both to `origin` so remote is authoritative.

---

## 3. Rollback scenarios

### 3.1 Schema-only regression (migration applied, data unchanged or trivially dirty)

**Trigger:** a compensating migration behaves unexpectedly (e.g., tightened SECDEF gate blocks a legitimate admin path).

**Steps:**
1. Identify the offending migration version via `list_migrations`.
2. Draft a forward-fix migration (`<next_ts>_revert_<name>.sql`) that reverses only the problematic change. Do **not** delete rows from `supabase_migrations.schema_migrations` — always roll forward.
3. Apply via `mcp__supabase__apply_migration`.
4. Re-run the 20-invariant live sweep (`tests/invariants/run.sql` — to be added in Phase 5).
5. File a note in this runbook's `## 6. Incident log`.

### 3.2 Data regression (visibly incorrect balances or positions in prod)

**Trigger:** a trigger matrix test identifies divergence between `transactions_v2` (source of truth) and `investor_positions` / AUM caches; divergence confirmed live.

**Steps:**
1. Freeze mutating endpoints: toggle `public.system_mode` to `'read_only'` (or whichever flag the current admin gate checks).
2. Snapshot the offending keys: `SELECT … FROM investor_positions WHERE …` via MCP `execute_sql`, store output in `docs/runbooks/evidence/`.
3. Determine recompute path:
   - **Cache drift only** → call `recalculate_fund_aum()` / canonical position recompute RPCs. No PITR needed.
   - **Ledger drift** → PITR to the last known-good timestamp (see §1.1); accept loss of everything after that point; communicate to impacted investors.
4. Re-run the 20-invariant sweep.
5. Unfreeze mutating endpoints.

### 3.3 Full-surface outage (app or DB hard failure)

**Trigger:** frontend fully unavailable, or DB unreachable / corrupted.

**Steps:**
1. Declare incident; post status to internal channel.
2. If DB-level: PITR to the latest timestamp in §1.1. Confirm PITR target is inside the 7-day window.
3. If app-level (frontend build): `git checkout pre-golive-hardening-2026-04-20`, redeploy.
4. After restore: replay any missing migrations from git `main` against the restored PITR instance via MCP `apply_migration`, in order by version.
5. Verify invariants and smoke tests before re-opening to users.

---

## 4. Non-destructive operational knobs

These exist and do **not** require a rollback — use them first:

- `system_mode = 'read_only'` — freezes mutating admin/investor actions without touching schema.
- Soft-disable a feature by flipping its admin gate to always-return-403 rather than dropping the RPC.
- Kill-switch on yield distribution: set `auto_yield_enabled = false` on the fund row.

---

## 5. Communication

| Audience    | Channel                     | Who drafts                     |
| ----------- | --------------------------- | ------------------------------ |
| Investors   | In-app banner + email       | Platform lead, <15 min of call |
| Admins      | Internal Slack #indigo-ops  | On-call engineer               |
| Regulators  | Per EU/GDPR playbook        | Compliance, only if PII exposed |

---

## 6. Incident log

<!-- append entries here: date, tag at time of incident, what rolled, outcome -->

_(empty at go-live)_
