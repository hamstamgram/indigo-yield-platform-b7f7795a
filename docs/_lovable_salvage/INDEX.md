# Lovable Fork Salvage — 2026-04-08

## Origin
Files in this directory were copied from `~/Downloads/indigo-yield-platform-v01-main`,
a Lovable Cloud export that diverged from this repository's `main` branch.

## Why quarantined
- The Lovable fork's `supabase/migrations/` history is dated **Feb 2026** with a
  re-baseline (`00000000000000_baseline_from_prod.sql`) that does **not** match
  production (`nkfimvovosdehmyyjubn`). Verified via `supabase list_migrations`
  on 2026-04-08 — prod's migration timeline is `20260306` → `20260406`, exactly
  matching this repo (`~/ai-lab/repo/indigo-yield`), not the fork.
- The fork's `src/` (307 modified files) was edited against that wrong baseline,
  so those changes cannot be merged blindly without re-deriving them against the
  canonical schema.
- **Excluded entirely:** `src/`, `supabase/migrations/`, `package.json`,
  `tsconfig.json`, `vite.config.ts`, `.env`, all build/config files.
- **Salvaged:** documentation, the Excel source-of-truth workbook, and Python
  replay/validation scripts that read prod via the API (no schema dependency).

## Layout
- `docs/source-of-truth/Accounting Yield Funds (6).xlsx` — canonical accounting
  workbook (XRP, SOL, BTC funds). This is the source of truth all replays must
  reconcile against.
- `docs/source-of-truth/CLAUDE_lovable.md` — the Lovable-side CLAUDE.md, kept
  for reference. **Do not** copy over the canonical CLAUDE.md without diffing.
- `docs/_lovable_salvage/*.md` — top-level launch / handoff / audit docs
  (LAUNCH_STATUS_2026-04-07, HANDOFF_*, EXPERT_HANDOFF_PROMPT, etc.).
- `docs/_lovable_salvage/docs/*.md` — the ~50 docs/ files missing from this repo
  (ARCHITECTURE, FINANCIAL_RULEBOOK, INCIDENT_PLAYBOOK, OPERATIONS_MANUAL,
  PLATFORM_DEEP_ANALYSIS, etc.).
- `scripts/_lovable_salvage/` — Python replay/validation scripts and the
  fund_transactions ledger CSV/JSON.

## Rules for using this content
1. Treat everything here as **read-only reference**. Do not import these files
   into the active codebase without manual review.
2. Never apply any SQL, migration, or schema change derived from these docs
   without first confirming it against the live prod migration list.
3. When promoting a doc out of `_lovable_salvage/` into `docs/`, rename it to
   indicate it has been reviewed and accepted (e.g. add a header noting the
   review date and reviewer).
4. The XLSX in `docs/source-of-truth/` is the **only** file here that is used
   directly by tooling (the launch-day BTC reconciliation replay).

## Verification commands used
```bash
# Confirmed prod migration history matches this repo, not the Lovable fork:
supabase list_migrations --project-id nkfimvovosdehmyyjubn
# Prod last 3: 20260406064723, 20260406065100, 20260406065906
# This repo: 20260406064725, 20260406065153, 20260406065908  (~2s clock offset)
# Lovable fork: 20260214 -> 20260228 + 20260407 (NO MATCH)
```
