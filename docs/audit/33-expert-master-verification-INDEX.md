# EXPERT MASTER GO-LIVE VERIFICATION PROMPT - INDEX

## Master Prompt Files

| File | Purpose | Status |
|------|---------|--------|
| `docs/audit/33-expert-master-verification.md` | Expert master prompt replacing shallow walkthrough | ✅ Complete |
| `docs/audit/34-codex-execution-prompt.md` | Codex execution prompt for same-day verification | ✅ Complete |

---

## How to Use

### For Codex/Nemotron/Claude Code:

Use `docs/audit/33-expert-master-verification.md` as the prompt input. This is the full expert master prompt covering:

- All platform routes and rendering (A)
- Every critical UI control and mutation path (B)
- Financial core flow verification (C)
- **Void cascade verification** (D) - mandatory separate workstream
- Trigger/RPC/function chain verification (E)
- Reporting/history truth verification (F)
- Form/input validation verification (G)
- Permission and safety verification (H)
- Background/side-effect workflows (I)
- Release blocker triage (J)

### For Codex Execution:

Use `docs/audit/34-codex-execution-prompt.md` which provides:
- Execution workflow with exact commands
- Patch batches for issues found
- Final go/no-go criteria
- Quick verification commands

---

## Quick Start

### 1. Run Full Smoke Suite
```bash
npx playwright test tests/e2e/smoke-critical-flows.spec.ts --reporter=line
```

### 2. Run Financial UI Tests
```bash
npx playwright test tests/e2e/ui-admin-financial-actions.spec.ts --reporter=line
npx playwright test tests/e2e/ui-form-validation.spec.ts --reporter=line
```

### 3. Verify Void Cascade in Code
```bash
# Check void_transaction function exists and cascades
rg "void_transaction" --type ts -l

# Check is_voided filtering in queries
rg "is_voided.*false" --type ts | head -20
```

### 4. Check TypeScript
```bash
npx tsc --noEmit
```

---

## Expert Verification Coverage

### Mandatory Void Cascade Checks:
- ☐ Transaction void cascades to AUM events
- ☐ Transaction void cascades to fee_allocations
- ☐ Transaction void cascades to IB commissions
- ☐ Position recompute triggered on void
- ☐ AUM recompute triggered on void
- ☐ Unvoid reverses exactly
- ☐ is_voided filtering in all queries
- ☐ No stale dashboard after void

### Mandatory Yield Cascade Checks:
- ☐ Yield void cascades to investor_yield_events
- ☐ Yield void cascades to fee_allocations
- ☐ is_voided filtering in yield queries
- ☐ History excludes voided yields

### Mandatory Permission Checks:
- ☐ Admin routes wrapped in AdminRoute
- ☐ Void actions admin-only
- ☐ Yield apply admin-only
- ☐ Invalid routes show 404

---

## Go-Live Decision

**GO** if ALL:
- ☐ TypeScript = 0 errors
- ☐ Smoke = all pass
- ☐ Void cascade = verified in code
- ☐ AUM recompute = verified in code
- ☐ History excludes voided = verified in code
- ☐ Permissions = verified in code
- ☐ No P0 blockers

**NO-GO** if ANY:
- ☐ Broken financial mutation
- ☐ Incorrect AUM after void
- ☐ Stale history after mutations
- ☐ Voided showing in reports
- ☐ Broken permissions