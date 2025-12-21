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

## Total Test Count

| Category | Tests |
|----------|-------|
| Admin Transactions | 6 |
| Yield Workflow | 6 |
| Report Generation | 7 |
| IB Portal | 7 |
| Transactions (existing) | 3 |
| Critical Journeys (existing) | 4 |
| **TOTAL** | **33** |

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/admin-transactions.spec.ts

# Run with UI
npx playwright test --ui

# Run headed (visible browser)
npx playwright test --headed
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
