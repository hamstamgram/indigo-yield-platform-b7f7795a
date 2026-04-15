# CODEX EXECUTION PROMPT - SAME-DAY GO-LIVE VERIFICATION

## Using: Expert Master Verification Plan

This prompt executes the expert master verification plan to achieve go-live confidence today.

---

## EXECUTION WORKFLOW

### Step 1: Run Critical Smoke Suite First
```bash
npx playwright test tests/e2e/smoke-critical-flows.spec.ts --reporter=line
```

Expected: All 10 tests pass

### Step 2: Run Financial Core Flow Verification

#### Deposit Flow
```bash
# Test deposit creation exists in UI
npx playwright test -g "deposit" --reporter=line
```

Check:
- ☐ Create deposit button visible on ledger
- ☐ Form opens with required fields
- ☐ Amount validation works

#### Withdrawal Flow
```bash
# Test withdrawal creation exists in UI  
npx playwright test -g "withdrawal" --reporter=line
```

Check:
- ☐ New withdrawal button visible
- ☐ Form validation works

#### Yield Flow
```bash
# Test yield preview/apply UI
npx playwright test -g "yield" --reporter=line
```

Check:
- ☐ Yield history page loads
- ☐ Preview button exists (or disabled if no pending)
- ☐ Apply button exists (or disabled if no pending)

### Step 3: Void Cascade Verification (CRITICAL)

This MUST be verified separately from simple UI tests:

#### Test 1: Void button visible on ledger
```bash
npx playwright test -g "void" --reporter=line
```

#### Test 2: Check void cascade in code
Search for void cascade implementation:
```bash
rg "is_voided" --type ts -l | head -20
```

Check:
- ☐ Void function exists
- ☐ Trigger on void calls position recompute
- ☐ Trigger on void calls AUM recompute
- ☐ Voided transactions excluded from reports

#### Test 3: Unvoid cascade
Check:
- ☐ Unvoid function exists
- ☐ Reverses voided transaction
- ☐ Restores AUM

### Step 4: History/Reporting Truth Check

#### Dashboard AUM
- ☐ Dashboard calls AUM view/query
- ☐ No stale client-side calculation

#### Transaction History
- ☐ Query filters by is_voided correctly
- ☐ Voided transactions show "Voided" status

#### Yield History
- ☐ Query filters by is_voided correctly
- ☐ Voided yields show "Voided" status

### Step 5: Permission Verification

Check code for route protection:
```bash
rg "AdminRoute|RequireAdmin" --type ts -l | head -10
```

- ☐ Admin routes wrap AdminRoute
- ☐ Investor routes wrap RequireAuth
- ☐ Void actions only in admin context

### Step 6: Form Validation Check

Run form validation suite:
```bash
npx playwright test tests/e2e/ui-form-validation.spec.ts --reporter=line
```

- ☐ Required fields enforced
- ☐ Invalid formats rejected
- ☐ Submit disabled when invalid

---

## PATCH BATCHES (If Issues Found)

### P0 Batch: Financial Correctness
If any void cascade broken:
1. Fix transaction void function
2. Add position recompute trigger
3. Add AUM recompute trigger
4. Add is_voided filter to reports query
5. Verify fix with test

### P1 Batch: UX Improvements
If missing toasts:
1. Add success toast to deposit
2. Add success toast to withdrawal
3. Add success toast to yield apply
4. Add success toast to void/unvoid

### P2 Batch: Cosmetic
If minor layout:
1. Defer to post-launch

---

## FINAL DECISION

Make go/no-go decision based on:

| Criterion | Must Pass |
|-----------|-----------|
| TypeScript | 0 errors |
| Smoke suite | All pass |
| Void cascade | Verified in code |
| AUM recompute | Verified in code |
| History excludes voided | Verified in code |
| Permission guards | Verified in code |

**GO** if all criteria pass

**NO-GO** if any P0 issue found

---

## QUICK VERIFICATION COMMANDS

```bash
# Full smoke suite
npx playwright test tests/e2e/smoke-critical-flows.spec.ts --reporter=line

# Financial UI tests
npx playwright test tests/e2e/ui-admin-financial-actions.spec.ts --reporter=line

# Form validation
npx playwright test tests/e2e/ui-form-validation.spec.ts --reporter=line

# TypeScript
npx tsc --noEmit
```

For void cascade code verification:
```bash
# Find void implementation
rg "async function void|const void" --type ts -A 5

# Find is_voided propagation  
rg "is_voided" --type ts -B 2 -A 2 | head -40

# Find triggers
rg "trigger|afterCommit|onCommit" --type ts | head -20
```