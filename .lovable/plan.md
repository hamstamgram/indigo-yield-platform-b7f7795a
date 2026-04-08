

# Plan: Create `docs/roadmap.md` — Full Platform Audit Roadmap

## Overview

Create a single comprehensive markdown document that captures the entire audit history from today's session: what was found, what was fixed, what remains, and the full platform inventory (routes, functions, triggers, edge functions, tables).

## File to Create

**`docs/roadmap.md`** — structured as follows:

1. **Executive Summary** — Platform health overview, audit date, methodology
2. **Platform Inventory** — Complete map of all 22 routes, 18 edge functions, 40+ tables, 60+ triggers, 100+ functions
3. **Completed Fixes (Today)** — Everything already resolved:
   - Audit log cleanup (1.2 GB reclaimed)
   - P0-A: `user_roles` INSERT policy dropped + SECURITY DEFINER trigger
   - P0-B: Storage bucket broad-access policies dropped + path-based ownership
   - P1: 20 functions patched with `search_path = public`
   - P2: Redundant RLS policies dropped
   - FK constraints and unique indexes added
4. **Open Issues (Pending)** — Remaining items not yet migrated:
   - P0: `profiles.is_admin` column self-escalation + 15 functions still reading it
   - P1: Asymmetric void on distribution `63b032b8`
   - P2: `system_config` exposed to all users
   - P3: `investor_position_snapshots` missing investor SELECT
   - P4: Redundant `system_config_write` policy
5. **Verification Checklist** — Table of every check performed with pass/fail status
6. **Frontend Route Map** — All 22 routes with status
7. **Edge Function Inventory** — All 18 functions
8. **Database Function Inventory** — All 100+ functions grouped by domain
9. **Trigger Inventory** — All 60+ triggers grouped by table
10. **Financial Integrity Report** — Ledger drift, orphan checks, conservation results

## Technical Details

- Single file creation at `docs/roadmap.md`
- Content sourced from conversation history and `.lovable/plan.md`
- No code changes, no migrations — documentation only

