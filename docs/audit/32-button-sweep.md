# Button & Control Completeness Sweep

## Screen-by-Screen Control Inventory

### Login (`/login`)
| Control | Type | Must Work | Status |
|---------|------|-----------|--------|
| Email input | Text field | YES | ⬜ |
| Password input | Password | YES | ⬜ |
| Submit button | Button | YES | ⬜ |
| Forgot password link | Link | CAN DEFER | ⬜ |

### Investor Dashboard (`/investor`)
| Control | Type | Must Work | Status |
|---------|------|-----------|--------|
| Period selector | Dropdown | YES | ⬜ |
| Refresh button | Button | YES | ⬜ |
| Holdings cards | Cards | YES | ⬜ |
| Recent activity | List | YES | ⬜ |

### Portfolio (`/investor/portfolio`)
| Control | Type | Must Work | Status |
|---------|------|-----------|--------|
| Sort dropdown | Dropdown | YES | ⬜ |
| Token filter | Filter | CAN DEFER | ⬜ |
| Export button | Button | YES | ⬜ |
| View details | Row click | YES | ⬜ |

### Yield History (`/investor/yield-history`)
| Control | Type | Must Work | Status |
|---------|------|-----------|--------|
| Date filter | Date picker | YES | ⬜ |
| Token filter | Dropdown | YES | ⬜ |
| Export | Button | YES | ⬜ |
| Pagination | Controls | YES | ⬜ |

### Transactions (`/investor/transactions`)
| Control | Type | Must Work | Status |
|---------|------|-----------|--------|
| Date filter | Filter | YES | ⬜ |
| Type filter | Dropdown | YES | ⬜ |
| Status filter | Dropdown | YES | ⬜ |
| Export | Button | YES | ⬜ |
| View details | Row click | YES | ⬜ |

### Withdrawals (`/investor/withdrawals`)
| Control | Type | Must Work | Status |
|---------|------|-----------|--------|
| New withdrawal | Button | YES | ⬜ |
| Status filter | Filter | YES | ⬜ |
| View details | Row click | YES | ⬜ |

### New Withdrawal (`/investor/withdrawals/new`)
| Control | Type | Must Work | Status |
|---------|------|-----------|--------|
| Amount input | Number | YES | ⬜ |
| Wallet input | Text | YES | ⬜ |
| Submit | Button | YES | ⬜ |
| Cancel | Button | YES | ⬜ |

### Statements (`/investor/statements`)
| Control | Type | Must Work | Status |
|---------|------|-----------|--------|
| Download PDF | Button | YES | ⬜ |
| View list | List | YES | ⬜ |

### Admin Dashboard (`/admin`)
| Control | Type | Must Work | Status |
|---------|------|-----------|--------|
| Refresh | Button | YES | ⬜ |
| Quick actions | Buttons | YES | ⬜ |
| Navigate sections | Links | YES | ⬜ |

### Revenue (`/admin/revenue`)
| Control | Type | Must Work | Status |
|---------|------|-----------|--------|
| Date range | Filter | YES | ⬜ |
| Tab switch | Tabs | YES | ⬜ |
| Export | Button | CAN DEFER | ⬜ |

### Investors (`/admin/investors`)
| Control | Type | Must Work | Status |
|---------|------|-----------|--------|
| Search | Input | YES | ⬜ |
| Status filter | Dropdown | YES | ⬜ |
| Invite button | Button | YES | ⬜ |
| View details | Row click | YES | ⬜ |
| Export | Button | CAN DEFER | ⬜ |

### Investor Details (`/admin/investors/:id`)
| Control | Type | Must Work | Status |
|---------|------|-----------|--------|
| Edit | Button | YES | ⬜ |
| Create deposit | Button | YES | ⬜ |
| Create withdrawal | Button | YES | ⬜ |
| View history | Button | YES | ⬜ |
| Disable | Button | CAN DISABLE | ⬜ |

### Ledger (`/admin/ledger`)
| Control | Type | Must Work | Status |
|---------|------|-----------|--------|
| Tab switch | Tabs | YES | ⬜ |
| Create deposit | Button | YES | ⬜ |
| Create withdrawal | Button | YES | ⬜ |
| Date filter | Filter | YES | ⬜ |
| Type filter | Dropdown | YES | ⬜ |
| Status filter | Dropdown | YES | ⬜ |
| Investor filter | Dropdown | YES | ⬜ |
| Void button | Button | YES | ⬜ |
| Export | Button | CAN DEFER | ⬜ |
| Pagination | Controls | YES | ⬜ |

### Yield History Admin (`/admin/yield-history`)
| Control | Type | Must Work | Status |
|---------|------|-----------|--------|
| Preview | Button | YES | ⬜ |
| Apply | Button | YES | ⬜ |
| Date filter | Filter | YES | ⬜ |
| Fund filter | Dropdown | YES | ⬜ |
| Status filter | Dropdown | YES | ⬜ |

### Reports (`/admin/reports`)
| Control | Type | Must Work | Status |
|---------|------|-----------|--------|
| Generate | Button | YES | ⬜ |
| Report type | Dropdown | YES | ⬜ |
| Date range | Filter | YES | ⬜ |
| Investor filter | Filter | YES | ⬜ |
| Download | Button | YES | ⬜ |

---

## Must-Work Controls (Go-Live Required)

### Authentication
- [ ] Login email input
- [ ] Login password input
- [ ] Login submit button

### Investor Core
- [ ] Dashboard period selector
- [ ] Portfolio view details
- [ ] Transaction filters
- [ ] Withdrawal new button
- [ ] Withdrawal form submit

### Admin Core
- [ ] Dashboard navigation
- [ ] Investors list search
- [ ] Investors invite button
- [ ] Ledger tabs
- [ ] Ledger create deposit
- [ ] Ledger create withdrawal
- [ ] Yield preview button
- [ ] Yield apply button
- [ ] Reports generate button

### Financial Actions
- [ ] Deposit form fields
- [ ] Deposit submit
- [ ] Withdrawal form fields
- [ ] Withdrawal submit
- [ ] Yield preview modal
- [ ] Yield apply confirm
- [ ] Transaction void
- [ ] Transaction unvoid

---

## Acceptable Deferrals

### Can Disable Today
- [ ] Investor "Disable" button (not needed for go-live)
- [ ] Export buttons (manual export available)

### Can Defer
- [ ] Revenue export
- [ ] Investors export
- [ ] Forgot password flow
- [ ] Password reset flow

---

## Visible-but-Broken Blockers (P0)

List any controls that are visible but DO NOT work:
- [ ] None identified yet

---

## Verification Commands

```bash
# Run permission tests
npx playwright test tests/e2e/ui-permissions-error-states.spec.ts

# Run all new UI tests
npx playwright test tests/e2e/ui-*.spec.ts
```