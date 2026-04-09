

## Full Platform Architecture & Data Flow Diagram

I've generated a comprehensive Mermaid diagram that maps the **entire system graph** — every table, RPC, trigger chain, edge function, integrity view, and frontend route — so you can visually trace any flow end-to-end and spot orphan risks.

### What the diagram covers

1. **Authentication Layer** — `auth.users` -> `profiles` -> `user_roles` with trigger sync chain
2. **Capital Flow RPCs** — Deposit (with crystallization-first), Manual Transaction, Withdrawal (via `withdrawal_requests` state machine)
3. **Yield Distribution Engine** — Preview -> Apply V5 -> creates YIELD/FEE_CREDIT/IB_CREDIT transactions + allocation records across 4 tables
4. **Canonical Ledger** (`transactions_v2`) — Single source of truth with 14 BEFORE INSERT guards and AFTER triggers driving position recomputation
5. **Position Layer** — `investor_positions` derived from ledger via `recompute_investor_position`, with 7 BEFORE INSERT guards including canonical write enforcement
6. **Void Cascade** — `void_transaction` and `void_yield_distribution` with trigger-driven cascades to `fee_allocations`, `ib_allocations`, `platform_fee_ledger`, `ib_commission_ledger`
7. **Integrity System** — `run_integrity_pack` checking 9 views (cost basis mismatch, orphaned positions/transactions, conservation violations, ledger mismatches, fee/IB/yield allocation orphans, missing withdrawal transactions)
8. **Reporting** — Statement generation, PDF storage, email delivery pipeline, fund performance computation
9. **Frontend** — 8 admin pages and 6 investor pages with their data source connections

### Key architectural findings (no risks detected)

- **No orphan risk in void cascades**: `void_yield_distribution` explicitly cascades to all 4 allocation tables + linked transactions. The `cascade_void_from_transaction` and `cascade_void_to_allocations` triggers provide backup cascade on UPDATE.
- **Position integrity is enforced**: The `trg_enforce_canonical_position_write` trigger blocks any direct write not flagged with `indigo.canonical_rpc`, ensuring only `recompute_investor_position` can mutate positions.
- **Ledger immutability**: `zz