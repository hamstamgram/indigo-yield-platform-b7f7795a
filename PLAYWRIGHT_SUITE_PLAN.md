# PLAYWRIGHT SUITE PLAN — Go-Live Execution

## A. Playwright Suite Plan

| Spec File | Purpose | Routes Covered | Risk Level |
|----------|---------|--------------|-------------|
| `ui-admin-financial-actions.spec.ts` | Core financial mutations | `/admin/ledger`, `/admin/yield-history`, `/admin/withdrawals` | **P0** |
| `ui-admin-data-integrity.spec.ts` | Data refresh/consistency | `/admin`, `/admin/investors`, `/admin/revenue` | **P0** |
| `ui-reports-history.spec.ts` | Reports/history verification | `/admin/reports`, `/admin/ledger`, `/admin/yield-history` | **P0** |
| `ui-withdrawal-full-exit.spec.ts` | Withdrawal + dust verification | `/admin/withdrawals`, investor detail | **P0** (NEW) |
| `ui-void-cascade.spec.ts` | Void cascade verification | `/admin/ledger`, `/admin/yield-history` | **P0** (NEW) |
| `ui-form-validation.spec.ts` | Form validation | Various forms | **P1** |
| `ui-permissions-error-states.spec.ts` | Permissions/safety | Various | **P1** |

---

## B. Scenario Matrix

| Action | Expected UI Result | Expected Cross-Page | History Impact | Blocker |
|--------|------------------|-------------------|------------------|---------------|
| Partial withdrawal approve | Position reduced, TX created | Dashboard AUM updates | TX in history | **P0** |
| Full exit (99%+) | Toggle appears, dust preview shown | AUM = 0, position inactive | TX + fee TX | **P0** |
| Transaction void | Marked voided, position restored | AUM restored | Excluded from reports | **P0** |
| Yield void | Position restored | AUM restored | YD voided | **P0** |
| Yield apply | Positions increased | AUM increased | YD created | **P0** |

---

## C. Withdrawal Test Matrix

| Type | Expected Balance | Dust Behavior | History/Dashboard | Blocker |
|------|-----------------|----------------|-------------------|---------|
| Partial (50%) | Position = orig - 50% | Remainder active | Single WITHDRAWAL TX | **P1** |
| Full (100%) | Position inactive | Dust → fees (2 TXs) | 2 TXs, AUM = 0 | **P0** |
| Near-full (99%+) | Toggle enabled | Shows dust preview | Full exit flow | **P0** |

---

## D. Dust/Residual Test Matrix

| Scenario | Expected UI | Inconsistency to Detect | Blocker |
|----------|-------------|----------------------|---------|
| Full exit leaving dust | Dust preview shown | Missing dust = **P0** | **P0** |
| Near-zero balance | Shows 0.000... | Wrong rounding = **P1** | **P1** |
| Multiple withdrawals | Cumulative | Missing accumulation = **P1** | **P1** |

---

## E. Void Cascade UI Matrix

| Entrypoint | Confirmation Flow | Post-Action State | History Effect | Blocker |
|-----------|-------------------|------------------|----------------|---------|
| Ledger void | Dialog → reason → confirm | TX voided, position restored | Excluded from reports | **P0** |
| Yield void | Dialog → confirm | YD voided, position restored | YD marked voided | **P0** |
| Unvoid | Confirmation | TX active, position reverted | Restored | **P1** |

---

## F. Validation/Error Matrix

| Form | Invalid Input | Expected Validation | Blocker |
|------|-------------|-------------------|---------|
| Withdrawal form | Amount > balance | "Exceeds balance" error | **P1** |
| Withdrawal form | Zero/negative | "Invalid amount" | **P1** |
| Void dialog | No reason | "Reason required" | **P1** |
| Deposit form | Invalid amount | Format error | **P1** |

---

## G. Manual-Only List

| Scenario | Why Manual | Automatable? |
|----------|-----------|--------------|
| Exact dust amount verification in DB | Requires DB query post-action | No - DB check needed |
| AUM reconciliation | Math requires DB aggregation | No - DB query needed |
| Position exact value | Requires DB verification | No - DB query needed |
| Void cascade entire path | Complex state chain | Hard - skip for now |
| Yield crystallization | Time-dependent | No - skip for now |

---

## H. Execution Order

### Run 1: Highest-Risk Plays (P0)
```bash
npx playwright test tests/e2e/ui-admin-financial-actions.spec.ts --reporter=line
npx playwright test tests/e2e/ui-withdrawal-full-exit.spec.ts --reporter=line
npx playwright test tests/e2e/ui-void-cascade.spec.ts --reporter=line
```

### Run 2: Data Integrity (P0)
```bash
npx playwright test tests/e2e/ui-admin-data-integrity.spec.ts --reporter=line
npx playwright test tests/e2e/ui-reports-history.spec.ts --reporter=line
```

### Run 3: Validation/Permissions (P1)
```bash
npx playwright test tests/e2e/ui-form-validation.spec.ts --reporter=line
npx playwright test tests/e2e/ui-permissions-error-states.spec.ts --reporter=line
```

---

## Files Created/Updated

| File | Status | Scenarios |
|------|--------|----------|
| `ui-withdrawal-full-exit.spec.ts` | **NEW** | Partial/full withdrawal, dust, cross-page |
| `ui-void-cascade.spec.ts` | **NEW** | Void cascade, unvoid, history |
| `ui-admin-financial-actions.spec.ts` | Existing | Core financial actions |
| `ui-admin-data-integrity.spec.ts` | Existing | Data refresh |
| `ui-reports-history.spec.ts` | Existing | Reports/history |
| `ui-form-validation.spec.ts` | Existing | Validation |
| `ui-permissions-error-states.spec.ts` | Existing | Permissions |

---

## Likely Blockers These Suites Will Expose

1. **Full exit dust not routed** — UI shows toggle but no second TX created
2. **Void not restoring positions** — Voided but position wrong
3. **AUM stale after mutations** — Dashboard shows old values
4. **Withdrawal history empty** — Post-action refresh fails
5. **Status transitions broken** — UI shows wrong status