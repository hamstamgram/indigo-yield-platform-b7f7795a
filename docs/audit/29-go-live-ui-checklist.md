# Go-Live UI Acceptance Checklist

## 4-Layer Acceptance Model

### Layer A - Navigation & Rendering
- [ ] Page loads without crash
- [ ] Main widgets visible
- [ ] No console-breaking errors
- [ ] No blank screens
- [ ] Correct page title

### Layer B - Input & Validation
- [ ] Required fields enforced
- [ ] Invalid values rejected
- [ ] Disabled buttons stay disabled
- [ ] Date pickers functional
- [ ] Number/currency formatting correct
- [ ] Dropdown selections work
- [ ] Modal open/close works
- [ ] Form cancel/reset works

### Layer C - Mutation & Side Effects
- [ ] Create action succeeds
- [ ] Update action succeeds
- [ ] Delete/Void action succeeds
- [ ] Success feedback shown (toast)
- [ ] Data refreshes after mutation
- [ ] History updates after mutation
- [ ] Cross-page consistency maintained

### Layer D - Error & Permission Behavior
- [ ] Unauthorized actions blocked
- [ ] Server errors shown correctly
- [ ] Invalid business actions rejected
- [ ] Not-found pages work

---

## Screen-by-Screen Checklist

### Login (`/login`)
| Layer | Check | Status |
|-------|-------|--------|
| A | Page loads | ⬜ |
| A | Form visible | ⬜ |
| A | No console errors | ⬜ |
| B | Email field required | ⬜ |
| B | Password field required | ⬜ |
| B | Submit disabled when empty | ⬜ |
| C | Invalid credentials shows error | ⬜ |
| C | Valid login redirects | ⬜ |
| D | Rate limiting message | ⬜ |

### Investor Dashboard (`/investor`)
| Layer | Check | Status |
|-------|-------|--------|
| A | Page loads | ⬜ |
| A | AUM widget visible | ⬜ |
| A | Holdings section visible | ⬜ |
| A | Yield summary visible | ⬜ |
| A | Recent activity visible | ⬜ |
| B | Period selector works | ⬜ |
| C | Data refreshes on navigate back | ⬜ |

### Portfolio (`/investor/portfolio`)
| Layer | Check | Status |
|-------|-------|--------|
| A | Page loads | ⬜ |
| A | Holdings table visible | ⬜ |
| A | Allocation display visible | ⬜ |
| B | Sort controls work | ⬜ |
| C | Click holding → details | ⬜ |
| C | Export button triggers download | ⬜ |

### Yield History (`/investor/yield-history`)
| Layer | Check | Status |
|-------|-------|--------|
| A | Page loads | ⬜ |
| A | Yield table visible | ⬜ |
| B | Date filter works | ⬜ |
| B | Token filter works | ⬜ |
| C | Export works | ⬜ |
| C | Data matches dashboard | ⬜ |

### Transactions (`/investor/transactions`)
| Layer | Check | Status |
|-------|-------|--------|
| A | Page loads | ⬜ |
| A | Transaction table visible | ⬜ |
| B | Date filter works | ⬜ |
| B | Type filter works | ⬜ |
| B | Status filter works | ⬜ |
| C | Click row → details | ⬜ |
| C | Export works | ⬜ |

### Withdrawals (`/investor/withdrawals`)
| Layer | Check | Status |
|-------|-------|--------|
| A | Page loads | ⬜ |
| A | Withdrawal table visible | ⬜ |
| B | Status filter works | ⬜ |
| C | New withdrawal button → form | ⬜ |
| C | Click row → details | ⬜ |

### New Withdrawal (`/investor/withdrawals/new`)
| Layer | Check | Status |
|-------|----|--------|
| A | Page loads | ⬜ |
| A | Form visible | ⬜ |
| B | Amount required | ⬜ |
| B | Wallet address required | ⬜ |
| B | Amount format validation | ⬜ |
| B | Wallet format validation | ⬜ |
| B | Insufficient balance error | ⬜ |
| C | Submit → success toast | ⬜ |
| C | Submit → redirect to list | ⬜ |
| C | Cancel → back to list | ⬜ |
| D | Duplicate submit blocked | ⬜ |

### Statements (`/investor/statements`)
| Layer | Check | Status |
|-------|-------|--------|
| A | Page loads | ⬜ |
| A | Statement list visible | ⬜ |
| C | Download PDF works | ⬜ |
| C | Empty state if none | ⬜ |

### Admin Dashboard (`/admin`)
| Layer | Check | Status |
|-------|-------|--------|
| A | Page loads | ⬜ |
| A | AUM widget visible | ⬜ |
| A | Investor count visible | ⬜ |
| A | Revenue metrics visible | ⬜ |
| A | Operations status visible | ⬜ |
| C | Quick action buttons work | ⬜ |

### Revenue (`/admin/revenue`)
| Layer | Check | Status |
|-------|-------|--------|
| A | Page loads | ⬜ |
| A | Revenue charts visible | ⬜ |
| A | Breakdown table visible | ⬜ |
| B | Date range filter works | ⬜ |

### Investors (`/admin/investors`)
| Layer | Check | Status |
|-------|-------|--------|
| A | Page loads | ⬜ |
| A | Investor table visible | ⬜ |
| B | Search works | ⬜ |
| B | Status filter works | ⬜ |
| C | Click row → details | ⬜ |
| C | Invite button → modal | ⬜ |
| C | Export works | ⬜ |

### Investor Details (`/admin/investors/:id`)
| Layer | Check | Status |
|-------|-------|--------|
| A | Page loads | ⬜ |
| A | Profile section visible | ⬜ |
| A | Holdings visible | ⬜ |
| A | Activity visible | ⬜ |
| C | Edit button → form | ⬜ |
| C | Create deposit button → form | ⬜ |
| C | Create withdrawal button → form | ⬜ |

### Ledger (`/admin/ledger`)
| Layer | Check | Status |
|-------|-------|--------|
| A | Page loads | ⬜ |
| A | Transaction table visible | ⬜ |
| B | Date filter works | ⬜ |
| B | Type filter works | ⬜ |
| B | Status filter works | ⬜ |
| B | Investor filter works | ⬜ |
| B | Fund filter works | ⬜ |
| C | Create deposit → modal → success | ⬜ |
| C | Create withdrawal → modal → success | ⬜ |
| C | Void button → confirmation → success | ⬜ |
| C | Click row → details | ⬜ |
| C | Export works | ⬜ |

### Yield History Admin (`/admin/yield-history`)
| Layer | Check | Status |
|-------|-------|--------|
| A | Page loads | ⬜ |
| A | Yield table visible | ⬜ |
| B | Date filter works | ⬜ |
| B | Fund filter works | ⬜ |
| B | Status filter works | ⬜ |
| C | Preview button → preview modal | ⬜ |
| C | Apply button → confirmation → success | ⬜ |

### Reports (`/admin/reports`)
| Layer | Check | Status |
|-------|-------|--------|
| A | Page loads | ⬜ |
| A | Report list visible | ⬜ |
| B | Report type selector works | ⬜ |
| B | Date range works | ⬜ |
| B | Investor filter works | ⬜ |
| C | Generate button → success | ⬜ |
| C | Download button works | ⬜ |

---

## Manual vs Automated Split

### AUTOMATE (Playwright)
- [ ] Login page renders
- [ ] Investor dashboard loads
- [ ] Admin dashboard loads
- [ ] Transaction list loads
- [ ] Yield history loads
- [ ] Form validation (required fields)
- [ ] Submit buttons disabled when invalid
- [ ] Success toast after mutation
- [ ] Error toast on failure
- [ ] Filters work

### MANUAL (Expert Walkthrough)
- [ ] Date picker UX
- [ ] Currency formatting display
- [ ] Keyboard navigation
- [ ] Modal animation feel
- [ ] Toast positioning
- [ ] Empty state messaging
- [ ] Loading skeleton appearance
- [ ] Responsive layout at breakpoints
- [ ] Print/export PDF format

---

## Highest-Risk Screens (Test First)

1. **Ledger** - Most mutations, most risk of stale data
2. **New Withdrawal** - High-value mutation, user-facing
3. **Yield Apply** - Financial integrity critical
4. **Investor Details** - Cross-page consistency
5. **Reports** - End-to-end data integrity

---

## Same-Day Run Order

### Batch 1 - Authentication (5 min)
1. Login renders
2. Login validates
3. Login submits correctly
4. Redirect after login

### Batch 2 - Investor Read-Only (10 min)
5. Dashboard loads
6. Portfolio loads
7. Yield history loads
8. Transactions load
9. Withdrawals load

### Batch 3 - Investor Write (10 min)
10. New withdrawal form renders
11. Withdrawal validation works
12. Withdrawal submit → success

### Batch 4 - Admin Read-Only (10 min)
13. Admin dashboard loads
14. Investors list loads
15. Investor details load
16. Ledger loads

### Batch 5 - Admin Write (15 min)
17. Create deposit → verify in ledger
18. Create withdrawal → verify status
19. Void transaction → verify status change
20. Preview yield → modal works
21. Apply yield → verify in history

### Batch 6 - Cross-Page (10 min)
22. Deposit → investor sees it
23. Yield apply → investor sees it
24. Withdrawal → investor sees status change

### Batch 7 - Reports (5 min)
25. Reports page loads
26. Generate report works

### Total Estimated: ~65 minutes