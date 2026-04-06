

# Test Data Cleanup Plan — Full Audit & Deletion

## What Exists (Audit Results)

### 5 TEST Funds (all status: `deprecated`)
| Fund | ID | Asset |
|---|---|---|
| TEST BTC Yield Fund | `00746a0e-...` | TBTC |
| TEST ETH Yield Fund | `44cb78f6-...` | TETH |
| TEST SOL Yield Fund | `b0f083b2-...` | TSOL |
| TEST USDT Yield Fund | `ec01a77f-...` | TUSDT |
| TEST XRP Yield Fund | `14e0f00a-...` | TXRP |

### 2 Inactive (Non-Test) Funds — Do NOT delete
- Euro Yield Fund (IND-EURC) — `inactive`
- Tokenized Gold (IND-XAUT) — `inactive`

### 45 TEST Investor Profiles
All have IDs matching `a0000001-0000-0000-0000-0000000000XX` and emails like `test.*@indigo.fund`.

### 1 QA Admin Profile
- `qa.admin@indigo.fund` (id: `e06a15fb-...`) — has `admin` role in `user_roles`.

### Data Volumes Linked to Test Entities

| Table | Rows to Delete |
|---|---|
| `transactions_v2` (test fund + test investors) | 3,232 |
| `yield_distributions` (test funds) | 158 |
| `yield_allocations` (test funds) | 1,619 |
| `fee_allocations` (test funds) | 1,114 |
| `ib_allocations` (test funds) | 170 |
| `ib_commission_ledger` (test funds) | 170 |
| `fund_daily_aum` (test funds) | 158 |
| `investor_positions` (test funds/investors) | 75 |
| `investor_position_snapshots` (test funds) | 114 |
| `investor_fee_schedule` (test investors) | 168 |
| `ib_commission_schedule` (test investors) | 13 |
| `withdrawal_requests` (test funds) | 94 |
| `risk_alerts` (test funds) | 62 |
| `notifications` (test investors) | 10,773 |
| `user_roles` (test investors + QA admin) | 6 |
| `profiles` (test investors + QA admin) | 46 |
| `funds` (5 TEST funds) | 5 |

**Total: ~17,982 rows across 17 tables.**

Audit log rows (~147K) referencing test entities will NOT be deleted — the `audit_log` table is immutable by design.

---

## Deletion Plan

Due to foreign-key-like trigger dependencies and RLS constraints (especially `no_profile_deletes` blocking direct profile deletion), this requires a **migration with a SECURITY DEFINER cleanup function** that executes in the correct dependency order.

### Deletion Order (children first)

```text
Step 1: Set system_mode = 'backfill' (bypass guards)
Step 2: Set indigo.canonical_rpc flag (bypass trigger blocks)
Step 3: Delete from child tables (test fund IDs + test investor IDs):
   - notifications
   - risk_alerts
   - withdrawal_requests
   - investor_position_snapshots
   - ib_commission_ledger
   - ib_allocations
   - fee_allocations
   - yield_allocations
   - fund_daily_aum
   - platform_fee_ledger (0 rows but include for safety)
   - investor_fee_schedule
   - ib_commission_schedule
   - investor_fund_performance
   - generated_statements
   - statement_email_delivery
   - documents
Step 4: Delete transactions_v2 (test funds)
Step 5: Delete yield_distributions (test funds)
Step 6: Delete investor_positions (test funds/investors)
Step 7: Delete user_roles for test investor IDs + QA admin
Step 8: Delete profiles for test investors + QA admin
        (requires bypassing no_profile_deletes RLS — use service role / SECURITY DEFINER)
Step 9: Delete 5 TEST funds
Step 10: Restore system_mode = 'live'
```

### Implementation

A single migration that:
1. Creates a temporary `_cleanup_test_data()` SECURITY DEFINER function
2. Executes it
3. Drops the function immediately after
4. Returns a summary JSONB of rows deleted per table

This mirrors the pattern already used in the codebase (`20260326_temp_fast_wipe.sql`).

### Safety Filters
- Test funds: matched by exact 5 UUIDs (all `TEST-*` codes)
- Test investors: matched by `id::text LIKE 'a0000001-0000-0000-0000-%'`
- QA admin: matched by exact UUID `e06a15fb-0c5d-44d8-961a-8d5950715f37`
- **No production data is touched** — all WHERE clauses are explicit

