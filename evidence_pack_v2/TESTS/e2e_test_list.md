# E2E Test Inventory

## Test Files

### 1. `tests/e2e/admin-transactions.spec.ts`
| Test ID | Test Name | Description |
|---------|-----------|-------------|
| AT-01 | Display transactions page | Verify page loads with header and table |
| AT-02 | Add Transaction button visible | Admin sees add transaction controls |
| AT-03 | Add Transaction modal opens | Modal appears when clicking add button |
| AT-04 | Transaction count matches rows | Header count equals rendered rows |
| AT-05 | All purposes visible for admin | Admin can filter by all transaction types |
| AT-06 | Form validation | Required fields are validated on submit |

### 2. `tests/e2e/yield-workflow.spec.ts`
| Test ID | Test Name | Description |
|---------|-----------|-------------|
| YW-01 | Display yield records page | Page loads correctly |
| YW-02 | Token format without USD | AUM displayed in token format |
| YW-03 | Distribution controls visible | Yield distribution UI available |
| YW-04 | Idempotency check | Prevents duplicate distributions |
| YW-05 | Eligible investor count | Shows correct count of eligible investors |
| YW-06 | Date filtering | Date filter controls work correctly |

### 3. `tests/e2e/report-generation.spec.ts`
| Test ID | Test Name | Description |
|---------|-----------|-------------|
| RG-01 | Display reports page | Page loads correctly |
| RG-02 | Generation controls visible | Report generation UI available |
| RG-03 | One per period enforcement | Prevents duplicate reports for same period |
| RG-04 | Eligible investors only | Only shows investors with positions |
| RG-05 | Status indicators | Reports show status badges |
| RG-06 | Period selection | Period dropdown/select works |
| RG-07 | Token amounts displayed | Amounts in token format, not USD |

### 4. `tests/e2e/ib-portal.spec.ts`
| Test ID | Test Name | Description |
|---------|-----------|-------------|
| IB-01 | Display IB dashboard | Page loads or redirects to login |
| IB-02 | Role switching capability | Dual-role users can switch portals |
| IB-03 | Portal state persistence | State maintained after navigation |
| IB-04 | IB-specific data displayed | Shows referral/commission content |
| IB-05 | Token format in IB portal | No USD conversion, uses USDT |
| IB-06 | Accessible navigation | Proper nav structure |
| IB-07 | IB routes work correctly | All /ib/* routes load properly |

### 5. `tests/e2e/transactions.spec.ts` (Existing)
| Test ID | Test Name | Description |
|---------|-----------|-------------|
| TX-01 | Navigate and interact | Basic navigation works |
| TX-02 | Form submission | Forms can be submitted |
| TX-03 | Accessibility | Basic a11y checks |

### 6. `tests/e2e/critical-user-journeys.spec.ts` (Existing)
| Test ID | Test Name | Description |
|---------|-----------|-------------|
| CUJ-01 | Homepage loads | App starts correctly |
| CUJ-02 | Navigation works | Can navigate between pages |
| CUJ-03 | Login flow | Authentication works |
| CUJ-04 | Dashboard access | Protected routes work |

### 7. `tests/e2e/admin-yield-workflow.spec.ts` (NEW)
| Test ID | Test Name | Description |
|---------|-----------|-------------|
| AYW-01 | Navigate to investor list | Loads investor management page |
| AYW-02 | Access investor detail | Can open investor profile |
| AYW-03 | Navigate to yield management | Yield page loads from admin |
| AYW-04 | Display yield records | Table with proper columns |
| AYW-05 | Record yield controls | Add/Record button visible |
| AYW-06 | Open yield form | Dialog opens on add click |
| AYW-07 | Token format display | Amounts in USDT/USDC format |
| AYW-08 | Form validation | Required fields validated |
| AYW-09 | Success toast system | Toast notifications ready |
| AYW-10 | Idempotency check | No duplicate rows appear |
| AYW-11 | Statement navigation | Can navigate to statements |
| AYW-12 | Eligible count display | Shows investor count |

### 8. `tests/e2e/ib-assignment-workflow.spec.ts` (NEW)
| Test ID | Test Name | Description |
|---------|-----------|-------------|
| IAW-01 | Navigate to investor profile | Opens investor with IB settings |
| IAW-02 | IB settings section visible | Section displayed in profile |
| IAW-03 | IB parent dropdown | Searchable dropdown available |
| IAW-04 | Find/Assign IB button | Button visible and enabled |
| IAW-05 | IB dialog opens | Dialog appears on click |
| IAW-06 | IB percentage validation | Validates 0-100 range |
| IAW-07 | Success toast on save | Toast system ready |
| IAW-08 | Self-reference prevention | Cannot set self as IB |
| IAW-09 | Data refresh after save | List reloads correctly |
| IAW-10 | Search users in dialog | Can search by email |
| IAW-11 | IB role badge display | Shows IB badges |
| IAW-12 | No duplicate accounts | Count stable after operations |

### 9. `tests/e2e/investor-portal.spec.ts` (NEW)
| Test ID | Test Name | Description |
|---------|-----------|-------------|
| IP-01 | Display investor dashboard | Page loads or redirects |
| IP-02 | Token format display | No USD conversion shown |
| IP-03 | Navigate to portfolio | Portfolio page accessible |
| IP-04 | Navigate to transactions | Transactions page accessible |
| IP-05 | Visibility scope filter | Internal transactions hidden |
| IP-06 | Navigate to statements | Statements page accessible |
| IP-07 | Reporting purpose only | No internal purpose shown |
| IP-08 | Accessible navigation | Proper nav structure |
| IP-09 | Navigate to settings | Settings page accessible |
| IP-10 | Performance metrics | Token format in metrics |
| IP-11 | Documents page | Documents accessible |
| IP-12 | Internal types hidden | No internal transaction types |
| IP-13 | Fund details display | Fund cards render |
| IP-14 | Empty state handling | Graceful empty states |
| IP-15 | Heading structure | Proper H1/H2/H3 |
| IP-16 | State persistence | Auth maintained on navigation |

### 10. `tests/e2e/fee-schedule.spec.ts` (NEW)
| Test ID | Test Name | Description |
|---------|-----------|-------------|
| FS-01 | Navigate to fee settings | Opens investor fee section |
| FS-02 | Display fee table | Table renders correctly |
| FS-03 | Add fee button | Button visible and enabled |
| FS-04 | Open fee form | Dialog opens on click |
| FS-05 | Fee percentage validation | Validates 0-100 range |
| FS-06 | Percentage display | Shows 18% not 1800% |
| FS-07 | Overlap prevention | DB rejects overlapping schedules |
| FS-08 | Effective date field | Date field visible |
| FS-09 | Success toast on save | Toast system ready |
| FS-10 | List refresh after add | Count updates |
| FS-11 | Auto-close previous | End date column visible |
| FS-12 | Fund-specific fees | Fund selector available |
| FS-13 | Fee history display | History section accessible |

## Total Test Count

| Category | Tests |
|----------|-------|
| Admin Transactions | 6 |
| Yield Workflow | 6 |
| Report Generation | 7 |
| IB Portal | 7 |
| Transactions (existing) | 3 |
| Critical Journeys (existing) | 4 |
| Admin Yield Workflow (NEW) | 12 |
| IB Assignment Workflow (NEW) | 12 |
| Investor Portal (NEW) | 16 |
| Fee Schedule (NEW) | 13 |
| **TOTAL** | **86** |

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/admin-yield-workflow.spec.ts
npx playwright test tests/e2e/ib-assignment-workflow.spec.ts
npx playwright test tests/e2e/investor-portal.spec.ts
npx playwright test tests/e2e/fee-schedule.spec.ts

# Run with UI
npx playwright test --ui

# Run headed (visible browser)
npx playwright test --headed

# Run specific test by name
npx playwright test -g "should display fee as percentage"
```

## Coverage Areas

- ✅ Transaction CRUD operations
- ✅ Yield distribution idempotency
- ✅ Report generation one-per-period
- ✅ IB portal dual-role switching
- ✅ Token-only formatting (no USD)
- ✅ Eligibility filtering
- ✅ Form validation
- ✅ Navigation and routing
- ✅ Admin yield workflow (NEW)
- ✅ IB assignment after investor creation (NEW)
- ✅ Investor portal visibility scoping (NEW)
- ✅ Fee schedule overlap prevention (NEW)
- ✅ Fee percentage display (18% not 1800%) (NEW)
- ✅ Success/error toast confirmations (NEW)
