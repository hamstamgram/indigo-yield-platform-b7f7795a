# EXPERT GO-LIVE VERIFICATION PLAN — INDIGO YIELD FINANCIAL PLATFORM

**Generated:** April 14, 2026  
**Purpose:** Same-day production go-live verification  
**Operating Mode:** Release-critical financial validation

---

## A. Platform Verification Inventory

| Screen / Route | Purpose | Role | Critical Controls | Backend Dependencies |
|---------------|---------|------|-------------------|---------------------|
| `/login` | Authentication entry | All | Login form, password reset | `authService`, profiles |
| `/investor` | Dashboard overview | Investor | View AUM, positions | `getDashboardStats`, `fund_daily_aum` |
| `/investor/portfolio` | Position summary | Investor | View positions | `investor_positions` |
| `/investor/yield-history` | Yield records | Investor | View yields | `yield_distributions` |
| `/investor/transactions` | Transaction history | Investor | View tx list | `transactions_v2` |
| `/investor/withdrawals` | Withdrawal history | Investor | View history, request new | `withdrawal_requests` |
| `/investor/withdrawals/new` | New withdrawal form | Investor | Asset select, amount input, submit | `withdrawalService` |
| `/admin` | Command center | Admin | Dashboard metrics | Various aggregation RPCs |
| `/admin/investors` | Investor management | Admin | Search, create, view | `investorLookupService` |
| `/admin/ledger` | Transaction ledger | Admin | List, filter, void transactions | `transactionService`, `transactions_v2` |
| `/admin/yield-history` | Yield distributions | Admin | List, apply, void yields | `yieldDistributionService` |
| `/admin/withdrawals` | Withdrawal queue | Admin | Approve, reject, cancel, bulk actions | `withdrawalService` |
| `/admin/reports` | Statements/reports | Admin/Investor | Generate, download | `statementsService` |
| `/admin/operations` | Admin ops tools | Super admin | Config, repair functions | Various admin RPCs |

**Critical path screens (must work today):**
- Investor withdrawal form (`/investor/withdrawals/new`)
- Admin withdrawal approval (`/admin/withdrawals`)
- Transaction void action (`/admin/ledger`)
- Yield apply/void (`/admin/yield-history`)

---

## B. Critical Flow Matrix

| Flow | Entrypoint | Expected Backend State | Expected Frontend State | Expected History/Reporting | Blocker if Broken |
|------|------------|------------------------|------------------------|-----------------------------|-------------------|
| Deposit | Admin: Deposit form | `transactions_v2` INSERT, position INCREASE, AUM adjusted | Toast success, list refresh | TX added with type=DEPOSIT | **P0** — financial integrity |
| Partial Withdrawal | Investor: New withdrawal form | `withdrawal_requests` INSERT (status=pending) | Toast "pending approval", redirect to history | WR shows status=pending | **P1** |
| Full Withdrawal (full exit) | Admin: ApproveWithdrawalDialog + `isFullExit=true` | WITHDRAWAL tx created, position deactivated, dust→INDIGO Fees tx, AUM adjusted | Position removed from list, toast shows success | 2 TXs: main + dust fee | **P0** — dust handling critical |
| Yield Apply | Admin: Yield page | `yield_distributions` INSERT, positions increased, AUM adjusted | Toast success | YD record created | **P0** — yield accuracy |
| Yield Void | Admin: Yield void button | YD voided, positions reversed, AUM reversed | YD marked voided, positions restored | YD excluded from reports | **P0** — cascade |
| Transaction Void | Admin: Void button | `is_voided=true`, position reversed, AUM reversed | Marked voided, position restored | Excluded from reports | **P0** — cascade |
| Completed Withdrawal Void | Admin: Cancel completed WR | WR voided, WITHDRAWAL tx voided, position restored, AUM restored | Position reactivated | Both marked voided | **P0** — complex cascade |

---

## C. Withdrawal Verification Matrix

| Scenario | Type | State Transitions | Residual/Dust | AUM/Position Effects | History Effects | Blocker Severity |
|----------|-------|-------------------|----------------|---------------------|-----------------|------------------|
| Partial withdrawal (e.g., 50% of position) | `partial` | pending → approved → completed | Residual = 50% position stays active | AUM decreased by processed_amount, position reduced by amount | TX type=WITHDRAWAL with processed_amount | **P1** |
| Full withdrawal requested (≥99% of position) | `full` (full exit detected) | pending → completed | Dust = balance - processed | Position deactivated, AUM = 0 | TX with full balance | **P0** |
| Full exit with exact-zero residue | `full` | pending → completed | Residue = 0.000... | Position `is_active=false` | TX = full balance | **P0** |
| Full exit leaving dust (e.g., 0.00000001 BTC) | `full` | pending → completed | Dust → second TX to INDIGO Fees | Position deactivated, dust goes to fees | 2 TXs: WITHDRAWAL + FEE | **P0** |
| Near-full (99%+) automatically detects as full | auto-detect | Shows "full exit" toggle | Dust = balance - requested | Position deactivated | TX = full | **P1** |
| Partial withdrawal, multiple sequential | `partial` | Each: pending → completed | Accumulating remainder | Position reduces each time | Multiple WITHDRAWAL TXs | **P1** |
| Approval fails due to insufficient balance | Error | No state change | No changes | Error displayed | No changes | **P1** |
| Void after completed full exit | `voided` | completed → voided | Position restored from both TXs | AUM restored to original | Both TXs marked voided | **P0** |

---

## D. Dust / Residual Balance Verification Matrix

| Scenario | Intended Rule | Actual Implementation | Impacted Objects | UI Surfaces | Blocker Severity |
|----------|--------------|----------------------|------------------|------------|-------------------|
| Full exit leaving dust (e.g., 0.00000001 BTC) | Route dust to INDIGO Fees account | `approve_and_complete_withdrawal` creates second fee transaction | `investor_positions.is_active=false`, 2 entries in `transactions_v2` | Position disappears from list, dust visible in fees view | **P0** |
| Full exit with large dust (>threshold) | Show warning in UI | `DUST_WARN_THRESHOLDS` check in ApproveWithdrawalDialog | Same as above + warning alert | "Dust amount is unusually large" alert | **P1** |
| Full exit exact zero | Position fully closed | `is_active = false` when processed equals position | Position deactivated | "Full exit" shown in dialog | **P0** |
| Partial withdrawal leaves small balance | Remainder stays active | Only requested_amount processed | `current_value` reduced but > 0 | Position shows reduced balance | **P1** |
| Void after full exit | Restore full position | `void_completed_withdrawal` restores both TXs | Position reactivated, AUM restored | History shows voided for both | **P0** |
| Multiple partial withdrawals | Cumulative | Each creates independent TX | Position reduces each time | Multiple WITHDRAWAL TXs | **P1** |

**Dust thresholds (from ApproveWithdrawalDialog):**
```typescript
const DUST_WARN_THRESHOLDS: Record<string, number> = {
  BTC: 0.001,
  ETH: 0.01,
  USDT: 1,
  USDC: 1,
  EURC: 1,
};
```

---

## E. Void Cascade Verification Matrix

| Cascade Path | Entrypoint | Backend Chain | Expected Behavior | AUM/Position/History Effects | Reversibility | Failure Modes | Blocker |
|--------------|-----------|--------------|------------------|-------------------|----------------------------|----------------|--------------|------------|
| Transaction void | `void_transaction` RPC | void_tx → reverse_position → adjust_AUM → exclude_report | `is_voided=true`, position restored, AUM restored | Position+, AUM+, voided TX hidden from reports | Unvoid via `unvoid_transaction` | Orphan position, double-reverse, P0 |
| Completed withdrawal void | `void_completed_withdrawal` RPC | void_completed_withdrawal → void_WITHDRAWAL_tx → restore_position → adjust_AUM | WR status→voided, TX voided, position reactivated, AUM restored | Position active, AUM+, both voided | Unvoid available | Only one TX voided, position not restored | **P0** |
| Yield distribution void | `void_yield_distribution` RPC | void_yd → reverse_yield → restore_position → adjust_AUM | YD voided, position restored, AUM restored | Position+, AUM+, YD voided | Unvoid available | Orphan yield, double-reverse | **P0** |
| Bulk void withdrawals | `void_completed_withdrawal` loop | For each completed WR | Each voided with full cascade | Each position restored, AUM adjusted | Per-item unvoid available | Partial failure on some | **P0** |

**Critical void cascade checks:**
- [ ] `is_voided` propagates to all child records
- [ ] Position recomputes EXACTLY once (not double)
- [ ] AUM recomputes EXACTLY once (not double)  
- [ ] Reporting excludes voided data immediately
- [ ] No partial state after failed void (must be atomic)
- [ ] Unvoid restores exact prior state
- [ ] History queries return voided items with proper filtering

---

## F. Button and Control Completeness Matrix

| Screen | Control | Must Work | Can Disable | Can Defer | Visible Broken Blocker |
|--------|---------|----------|-----------|--------------|----------|----------------------|
| AdminWithdrawalsPage | Approve button | **Yes** | No | No | **Yes P0** |
| AdminWithdrawalsPage | Reject button | Yes | No | No | Yes P0 |
| AdminWithdrawalsPage | Cancel (pending/approved) | Yes | No | No | Yes P0 |
| AdminWithdrawalsPage | Cancel (completed) → void | Yes | No | No | Yes P0 |
| AdminWithdrawalsPage | Bulk void | Yes | No | No | Yes P0 |
| AdminWithdrawalsPage | Bulk restore | Yes | No | No | Yes P1 |
| AdminWithdrawalsPage | Bulk delete | Yes | No | No | Yes P1 |
| ApproveWithdrawalDialog | Processed amount input | Yes | No | No | Yes P0 |
| ApproveWithdrawalDialog | Full exit checkbox | Yes | No | No | Yes P0 |
| ApproveWithdrawalDialog | Confirm text "APPROVE" | Yes | No | No | Yes P0 |
| NewWithdrawalPage (investor) | Submit button | Yes | No | No | Yes P0 |
| AdminLedgerPage | Void button per tx | Yes | No | No | Yes P0 |
| AdminYieldPage | Apply yield | Yes | No | No | Yes P0 |
| AdminYieldPage | Void yield | Yes | No | No | Yes P0 |

---

## G. Form / Input Validation Matrix

| Screen/Form | Fields | Validations | Expected Error | Expected Success |
|------------|--------|------------|----------------|------------------|
| Investor: WithdrawalRequestForm | assetCode | Required, must be in user's positions | "Asset is required" inline | Redirect to history |
| Investor: WithdrawalRequestForm | amount | Required, > 0, ≤ available balance | "Amount exceeds balance" | Toast + redirect |
| Investor: WithdrawalRequestForm | notes | Optional, max length | Inline error | Stored in WR |
| ApproveWithdrawalDialog | processedAmount | Required, > 0, numeric | "Enter valid amount" | Process transaction |
| ApproveWithdrawalDialog | confirmText | Must equal "APPROVE" | "Type APPROVE to confirm" | Submit enabled |
| CreateWithdrawalDialog (admin) | investorId | Required | Inline error | WR created |
| CreateWithdrawalDialog | amount | Required, > 0 | Inline error | WR created |
| RejectWithdrawalDialog | reason | Required | Inline error | WR rejected |
| EditWithdrawalDialog | amount | > 0 | Inline error | WR updated |

---

## H. Reporting / History Verification Matrix

| Surface | Source of Truth | Expected Post-Action Refresh | Stale/Empty = Blocker |
|---------|------------------|-----------------------------|----------------------|
| Dashboard AUM | `fund_daily_aum` (latest date) | Refreshed after deposit/withdrawal/yield/void | **P0** |
| Investor positions | `investor_positions` | Refreshed after any position-affecting action | **P0** |
| Transaction history | `transactions_v2` with `is_voided=false` filter | New TX visible after action, voided hidden | **P1** |
| Withdrawal history | `withdrawal_requests` | New WR visible, status updates visible | **P1** |
| Yield history | `yield_distributions` | New YD visible, voided hidden in reports | **P1** |
| Investor statements | `statements` table + positions | Regenerated on demand, reflects current state | **P1** |

---

## I. Permissions and Failure-State Matrix

| Action | Allowed Role | Denied Role | Safe Failure Behavior |
|--------|-------------|-------------|------------------------|
| Approve withdrawal | admin, super_admin | investor | Error toast "No admin privileges" |
| Reject withdrawal | admin, super_admin | investor | Error toast "No admin privileges" |
| Void completed withdrawal | super_admin | admin | Error "Super admin required" |
| Create withdrawal (investor) | authenticated user | unauthenticated | Redirect to login |
| Apply yield | super_admin | admin | Error "Super admin required" |
| Void transaction | admin | investor | Error, no state change |
| Bulk void | super_admin | admin | Bulk fails gracefully |

---

## J. Missed-Area Discovery List

| Area | Why It Matters | Severity | Must Test Today |
|------|----------------|----------|----------------|
| Full exit dust sweep to INDIGO Fees | Financial correctness - dust must go to fees, not lost | **P0** | Yes |
| Void cascade on completed withdrawal | Complex multi-table rollback | **P0** | Yes |
| AUM refresh after void cascade | Dashboard must reflect corrected AUM | **P0** | Yes |
| Position reactivation after void | Position must show correct active state | **P0** | Yes |
| Yield crystallization before full exit | Accrued yield must crystallize before payout | **P1** | Yes |
| Duplicate submission prevention | Idempotency on withdrawal submit | **P1** | Yes |
| Bulk void partial failure handling | Some succeed, some fail behavior | **P0** | Yes |
| Concurrent withdrawal + yield apply | Race condition on same position | **P1** | Review code |
| Statement generation for voided positions | Reports must exclude voided data | **P1** | Yes |

---

## K. Release Blocker Board

| Issue | Location | Severity | Required Fix | Deferrable |
|-------|----------|----------|---------------|------------|
| Partial withdrawal position math incorrect | Backend RPC or frontend | **P0** | Verify position = position - amount | No |
| Full exit dust not routed to INDIGO Fees | `approve_and_complete_withdrawal` | **P0** | Must create fee transaction | No |
| Position not deactivated on full exit | `approve_and_complete_withdrawal` | **P0** | is_active = false on full exit | No |
| Void cascade missing position restore | `void_completed_withdrawal` | **P0** | Must restore position + AUM | No |
| AUM not adjusted after withdrawal/yield | Trigger chain | **P0** | fund_daily_aum updated | No |
| Voided transactions visible in reports | Reporting queries | **P0** | Filter is_voided=false | No |
| Dashboard stale after mutations | Dashboard query | **P0** | Query refreshes correctly | No |
| Withdrawal history empty after submit | `withdrawal_requests` insert | **P1** | Verify insert + select | No |
| Full exit toggle missing on eligible WR | ApproveWithdrawalDialog | **P0** | Toggle visible for ≥99% | No |
| Dust warning threshold missing | ApproveWithdrawalDialog | **P1** | Show warning per asset | No |

---

## L. Same-Day Execution Order

### Phase 1: Highest-Risk Manual Walkthroughs (DO FIRST)

| # | Walkthrough | Expected Result | Blocker if Wrong |
|---|-------------|------------------|------------------|
| 1.1 | Investor submits partial withdrawal | WR created with pending status | **P0** — submission fails |
| 1.2 | Investor submits → admin approves partial | Position reduced by amount, TX created | **P1** — amount wrong |
| 1.3 | Investor submits near-full (99%+) → admin sees full exit toggle | Toggle visible, defaults processedAmount to full balance | **P1** — toggle missing |
| 1.4 | Full exit with dust → verify 2 transactions created | Main WITHDRAWAL + FEE transactions | **P0** — dust lost |
| 15 | Full exit → position disappears from investor portfolio | Position not in list, is_active=false | **P0** — position visible |
| 1.6 | Void completed withdrawal → position reactivated | Position active again, AUM restored | **P0** — not restored |
| 1.7 | Yield apply → verify positions increased | Position current_value increased | **P0** — not applied |
| 1.8 | Void yield → verify positions restored | Position restored to pre-yield state | **P0** — not restored |

### Phase 2: Highest-Value Playwright Executions (DO SECOND)

| # | Test | Coverage | Go/No-Go Impact |
|----|------|----------|----------------|
| 2.1 | Investor completes full withdrawal flow | E2E: form → submit → admin approve → confirm | **P0** |
| 2.2 | Full exit dust sweep E2E | Verify dust → fees account | **P0** |
| 2.3 | Void completed withdrawal cascade | Position reactivation | **P0** |
| 2.4 | Dashboard AUM reflects mutations | AUM refresh verification | **P0** |
| 2.5 | Yield apply → void cascade | Yield rollback verification | **P0** |

### Phase 3: Highest-Priority Patch Batches (DO THIRD)

| # | Patch Area | Risk | Deferrable |
|---|-----------|------|-----------|
| 3.1 | Any backend RPC with missing transaction | Patch immediately | No |
| 3.2 | Any cache invalidation missing | Patch immediately | No |
| 3.3 | Any permission check wrong | Patch immediately | No |

### Phase 4: Final Smoke Pass (DO FOURTH)

| # | Smoke Test | Pass Criteria |
|---|-----------|---------------|
| 4.1 | Login → dashboard loads | AUM visible |
| 4.2 | Create deposit → appears in ledger | TX in list |
| 4.3 | Submit withdrawal → appears in queue | WR status=pending |
| 4.4 | Apply yield → appears in yield history | YD visible |
| 4.5 | Void transaction → marked voided, not in reports | Correctly hidden |

### Phase 5: Final Go/No-Go Decision (DO LAST)

Before announcing go-live:
- [ ] All P0 issues resolved (no P0 blockers)
- [ ] Dashboard reflects correct AUM
- [ ] All withdrawal paths work end-to-end
- [ ] Void cascade restores positions correctly
- [ ] Dust is correctly routed (not lost)
- [ ] Reports exclude voided data
- [ ] Investor can view their positions
- [ ] Admin can approve/reject/void withdrawals

---

## Execution Board

### A. Batch List (Exact Execution Order)

| Batch | Type | Description | Owner |
|-------|------|-------------|-------|
| Batch 1 | Manual | Investor partial withdrawal flow walkthrough | Manual |
| Batch 2 | Manual | Full exit with dust verification | Manual |
| Batch 3 | Manual | Void completed withdrawal cascade | Manual |
| Batch 4 | Playwright | E2E: Full withdrawal flow (submit → approve → complete) | Playwright |
| Batch 5 | Manual | Yield apply → void cascade | Manual |
| Batch 6 | Playwright | E2E: Void transaction verification | Playwright |
| Batch 7 | Manual | Dashboard AUM verification after all flows | Manual |
| Batch 8 | Manual | Final smoke: all screens load | Manual |
| Batch 9 | Code patch | Any issues found during testing | Code |
| Batch 10 | Final | Go/No-Go decision | Release Manager |

### B. Owner/Tool per Batch

| Batch | Owner | Tool |
|-------|-------|------|
| Batch 1 | QA Lead | Manual browser |
| Batch 2 | QA Lead | Manual browser |
| Batch 3 | QA Lead | Manual browser |
| Batch 4 | QA Automation | Playwright |
| Batch 5 | QA Lead | Manual browser |
| Batch 6 | QA Automation | Playwright |
| Batch 7 | QA Lead | Manual browser |
| Batch 8 | QA Lead | Manual browser |
| Batch 9 | Backend Lead | Code editor |
| Batch 10 | Release Manager | Decision |

### C. Estimated Duration

| Batch | Duration |
|-------|----------|
| Batch 1 | 15 min |
| Batch 2 | 20 min |
| Batch 3 | 15 min |
| Batch 4 | 25 min |
| Batch 5 | 15 min |
| Batch 6 | 20 min |
| Batch 7 | 10 min |
| Batch 8 | 30 min |
| Batch 9 | Variable |
| Batch 10 | 15 min |

### D. Go/No-Go Dependencies

| Batch | Dependencies | Can Proceed If |
|-------|---------------|----------------|
| Batch 1 | None | Pass |
| Batch 2 | Batch 1 passes | Pass |
| Batch 3 | Batch 2 passes | Pass |
| Batch 4 | Batch 1-2 pass | Pass |
| Batch 5 | Batch 3 passes | Pass |
| Batch 6 | Batch 4-5 pass | Pass |
| Batch 7 | Batch 6 passes | Pass |
| Batch 8 | Batch 7 passes | Pass |
| Batch 9 | Issues found | Issues resolved |
| Batch 10 | All above pass | All pass |

### E. Exact Final Pre-Production Test Order

1. **Manual walkthrough:** All Phase 1 tests pass
2. **Playwright verification:** All Phase 2 tests pass  
3. **Patch any issues:** Phase 3 complete
4. **Smoke pass:** Phase 4 complete
5. **Final decision:** Phase 5 complete

---

**End of Verification Plan**