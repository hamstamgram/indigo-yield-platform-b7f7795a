# Financial UX Integrity Verification

## Action-by-Action Verification Matrix

### DEPOSIT

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| Create deposit form opens | Modal/form renders | ⬜ |
| Required fields enforced | Amount, investor required | ⬜ |
| Amount validation | Positive numbers only | ⬜ |
| Submit creates transaction | DB record created | ⬜ |
| Success toast shown | "Deposit created" | ⬜ |
| Ledger table shows new row | Transaction visible | ⬜ |
| Investor balance updated | Amount added to balance | ⬜ |
| Dashboard AUM updated | Total reflects deposit | ⬜ |
| No duplicate submit | Button disabled after click | ⬜ |

### WITHDRAWAL (Admin)

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| Create withdrawal form opens | Modal renders | ⬜ |
| Amount validation | Must be positive, <= balance | ⬜ |
| Submit creates request | DB record created | ⬜ |
| Success toast shown | "Withdrawal created" | ⬜ |
| Table shows new row | In withdrawal tab | ⬜ |
| Status is "Pending" | Default status correct | ⬜ |

### WITHDRAWAL (Investor)

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| New withdrawal page loads | Form renders | ⬜ |
| Amount input validates | Within balance | ⬜ |
| Wallet address format | Valid XRP address | ⬜ |
| Submit creates request | DB record created | ⬜ |
| Redirect to list | After submit | ⬜ |
| Success toast shown | Message displayed | ⬜ |
| List shows new request | Row appears | ⬜ |
| Balance shows pending | Amount reserved | ⬜ |

### YIELD PREVIEW

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| Preview button works | Modal opens | ⬜ |
| Shows expected amounts | Calculation visible | ⬜ |
| Shows affected investors | List displays | ⬜ |
| Shows affected funds | Fund list visible | ⬜ |
| Close works | Modal closes | ⬜ |

### YIELD APPLY

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| Apply button shows confirmation | Dialog opens | ⬜ |
| Confirm applies distribution | Mutation succeeds | ⬜ |
| Success toast shown | Message displays | ⬜ |
| Yield history shows new entry | Row appears | ⬜ |
| Investor yield history updates | New entry visible | ⬜ |
| Dashboard yield summary updates | Total reflects | ⬜ |
| Reports include new yield | In calculations | ⬜ |

### TRANSACTION VOID

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| Void button on transaction | Button visible | ⬜ |
| Click opens confirmation | Dialog opens | ⬜ |
| Confirm voids transaction | Status = voided | ⬜ |
| Success toast shown | Message displays | ⬜ |
| Transaction shows "Voided" | Status updated | ⬜ |
| Amount not in AUM | Excluded from total | ⬜ |
| Cannot void twice | Button disabled | ⬜ |

### TRANSACTION UNVOID

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| Unvoid button on voided | Button visible | ⬜ |
| Click opens confirmation | Dialog opens | ⬜ |
| Confirm unvoids | Status = active | ⬜ |
| Success toast shown | Message displays | ⬜ |
| Amount back in AUM | Included in total | ⬜ |

### REPORT GENERATION

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| Generate button works | Form opens | ⬜ |
| Report type selection | Options available | ⬜ |
| Date range selection | Works correctly | ⬜ |
| Generate creates report | Report record | ⬜ |
| Download button works | PDF downloads | ⬜ |
| List shows generated | Report visible | ⬜ |

---

## Expected UI Consequences

### After Successful Deposit
```
✅ Ledger: New row with type=DEPOSIT, status=COMPLETED
✅ Investor: Balance increased
✅ Dashboard: AUM increased
✅ History: Transaction visible
```

### After Successful Withdrawal Request
```
✅ Withdrawals List: New row with status=PENDING
✅ Investor: Balance shows reserved amount
✅ Details: Request details viewable
```

### After Yield Applied
```
✅ Yield History: New entry with status=APPLIED
✅ Investor Yield History: New entry appears
✅ Dashboard: Yield total updated
✅ Reports: Includes new yield period
```

### After Void
```
✅ Transaction: Status = VOIDED, styled differently
✅ Dashboard: AUM excludes voided amount
✅ History: Voided transaction marked
```

---

## Release-Blocking Anomalies

### P0 - Financial Truth Broken
- [ ] Deposit amount not reflected in AUM
- [ ] Voided transaction still counted
- [ ] Yield not visible to investor
- [ ] Balance doesn't match transactions
- [ ] Reports missing recent transactions

### P1 - UX Mismatch
- [ ] Success toast missing after mutation
- [ ] Table doesn't auto-refresh
- [ ] Cross-page data inconsistent
- [ ] Error messages unclear

### P2 - Minor Issues
- [ ] Timing delay in refresh
- [ ] Minor layout shift on update
- [ ] Pagination reset on update

---

## Patch Priorities

### Immediate (Before Go-Live)
1. Fix any P0 financial issues
2. Ensure all mutations show success feedback
3. Verify data refreshes after actions

### Post-Launch (Day 1-7)
1. Optimize refresh timing
2. Improve error messaging
3. Add confirmation dialogs for critical actions

---

## Verification Commands

```bash
# Run financial UI tests
npx playwright test tests/e2e/ui-admin-financial-actions.spec.ts

# Run data integrity tests  
npx playwright test tests/e2e/ui-admin-data-integrity.spec.ts

# Run form validation tests
npx playwright test tests/e2e/ui-form-validation.spec.ts
```