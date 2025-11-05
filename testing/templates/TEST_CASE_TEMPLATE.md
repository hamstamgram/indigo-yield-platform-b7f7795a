# Test Case Template

Use this template when writing new test cases for the Indigo Yield Platform.

---

## Test Case Information

**Test Case ID:** `TC-[MODULE]-[NUMBER]` (e.g., TC-AUTH-001)
**Module:** [Authentication / Portfolio / Transactions / KYC / etc.]
**Feature:** [Specific feature being tested]
**Priority:** [P0: Critical | P1: High | P2: Medium | P3: Low]
**Risk Level:** [CRITICAL | HIGH | MEDIUM | LOW]
**Test Type:** [Unit | Integration | E2E | Performance | Security | Accessibility]
**Automation Status:** [Automated | Manual | Pending Automation]

---

## Test Objective

[Clear, concise statement of what this test validates]

**Example:**
> Verify that users can successfully deposit funds and see their portfolio value update in real-time.

---

## Preconditions

List all conditions that must be true before test execution:

1. [Precondition 1]
2. [Precondition 2]
3. [Precondition 3]

**Example:**
1. User account exists and is verified
2. User is logged in
3. User has at least one linked bank account
4. Portfolio dashboard is accessible

---

## Test Data

| Field | Value | Notes |
|-------|-------|-------|
| Test User | `testuser@example.com` | Standard test account |
| Password | `Test123!` | Meets password requirements |
| Initial Balance | `$50,000.00` | Existing portfolio value |
| Deposit Amount | `$5,000.00` | Test deposit |
| Bank Account | `****1234` | Linked test account |

**Test Data Files:**
- `tests/fixtures/[module]/[feature]Data.json`

---

## Test Steps

### Step 1: [Action]
**Action:** [Detailed description of what to do]
**Expected Result:** [What should happen]
**Actual Result:** [To be filled during execution]
**Status:** [Pass / Fail / Blocked]

**Example:**
### Step 1: Navigate to Deposit Page
**Action:** Click "Deposit" button in navigation menu
**Expected Result:** User is redirected to `/deposit` page. Deposit form is displayed with amount field, payment method dropdown, and submit button.
**Actual Result:** _[To be filled]_
**Status:** _[To be filled]_

---

### Step 2: [Action]
**Action:** [Description]
**Expected Result:** [Expected outcome]
**Actual Result:** _[To be filled]_
**Status:** _[To be filled]_

---

### Step 3: [Action]
**Action:** [Description]
**Expected Result:** [Expected outcome]
**Actual Result:** _[To be filled]_
**Status:** _[To be filled]_

---

[Add more steps as needed]

---

## Expected Results Summary

1. [Expected outcome 1]
2. [Expected outcome 2]
3. [Expected outcome 3]

**Example:**
1. Deposit transaction is created with status "completed"
2. Portfolio value increases by deposit amount ($50,000 → $55,000)
3. Transaction appears in transaction history
4. User receives email confirmation
5. Portfolio allocation is recalculated

---

## Postconditions

State of system after test execution:

1. [Postcondition 1]
2. [Postcondition 2]

**Example:**
1. User portfolio value is $55,000
2. Transaction is recorded in database
3. Email confirmation is sent
4. Audit log contains deposit event

---

## Cleanup Steps

Actions needed to return system to original state:

1. [Cleanup step 1]
2. [Cleanup step 2]

**Example:**
1. Delete test transaction from database
2. Restore original portfolio value
3. Delete email from test inbox

---

## Test Code (if automated)

**File Location:** `tests/[type]/[module]/[testName].test.ts`

```typescript
// Test code here
import { test, expect } from '@playwright/test';

describe('[Test Suite Name]', () => {
  test('[Test Case Name]', async ({ page }) => {
    // Arrange
    // [Setup code]

    // Act
    // [Action code]

    // Assert
    // [Assertion code]
  });
});
```

---

## Dependencies

List any dependencies this test has:

- **Other Tests:** [List dependent test cases]
- **External Services:** [APIs, third-party services]
- **Test Data:** [Specific data requirements]
- **Environment:** [Staging, Dev, specific configuration]

**Example:**
- **Other Tests:** TC-AUTH-001 (user must be authenticated first)
- **External Services:** Plaid API (bank account verification)
- **Test Data:** Requires active bank account in sandbox
- **Environment:** Staging with test payment processor enabled

---

## Edge Cases Covered

| Edge Case | Test Approach | Status |
|-----------|---------------|--------|
| [Edge case 1] | [How it's tested] | [Covered / Not Covered] |
| [Edge case 2] | [How it's tested] | [Covered / Not Covered] |

**Example:**
| Edge Case | Test Approach | Status |
|-----------|---------------|--------|
| Deposit amount with many decimals | Input $5,000.12345, verify rounded to $5,000.12 | Covered |
| Concurrent deposits | Submit two deposits simultaneously | Covered |
| Negative amount | Input -$1000, verify error message | Covered |
| Extremely large amount | Input $999,999,999, verify accepted or error | Covered |

---

## Failure Scenarios

| Failure Scenario | Expected Behavior | Severity |
|------------------|-------------------|----------|
| [Scenario 1] | [Expected error handling] | [P0/P1/P2/P3] |
| [Scenario 2] | [Expected error handling] | [P0/P1/P2/P3] |

**Example:**
| Failure Scenario | Expected Behavior | Severity |
|------------------|-------------------|----------|
| Payment processor is down | Show error message, transaction status "pending", retry logic | P1 |
| Insufficient funds | Show error, do not create transaction | P1 |
| Network timeout | Show error, transaction marked "failed", can retry | P2 |

---

## Performance Criteria

**Acceptance Criteria:**
- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms
- [ ] Transaction processing < 5 seconds
- [ ] No memory leaks after 100 executions
- [ ] Works on slow 3G network

**Example Metrics:**
| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Page Load | < 2s | TBD | TBD |
| API Response | < 500ms | TBD | TBD |
| UI Responsive | Immediate | TBD | TBD |

---

## Accessibility Requirements

- [ ] All form inputs have labels
- [ ] Error messages are announced to screen readers
- [ ] Keyboard navigation works (Tab, Enter, Esc)
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1)
- [ ] Works with screen reader (NVDA / VoiceOver)
- [ ] Form validation errors are associated with inputs

---

## Security Considerations

- [ ] No sensitive data in URL parameters
- [ ] CSRF token present on form submission
- [ ] Input is sanitized (SQL injection, XSS)
- [ ] Rate limiting enforced (if applicable)
- [ ] Session validation on every request
- [ ] Proper authorization checks (user can only access own data)

---

## Cross-Platform Testing

Test on multiple platforms/browsers:

| Platform | Browser/OS | Tested | Result |
|----------|-----------|--------|--------|
| Web | Chrome 120+ | [ ] | TBD |
| Web | Firefox 120+ | [ ] | TBD |
| Web | Safari 17+ | [ ] | TBD |
| Web | Edge 120+ | [ ] | TBD |
| Mobile | iOS 17+ (Safari) | [ ] | TBD |
| Mobile | iOS App | [ ] | TBD |
| Mobile | Android 13+ (Chrome) | [ ] | TBD |

---

## Test Execution Log

| Date | Tester | Environment | Result | Notes |
|------|--------|-------------|--------|-------|
| 2025-01-04 | Jane Doe | Staging | Pass | All steps passed |
| 2025-01-05 | John Smith | Staging | Fail | Step 3 failed, bug filed: BUG-123 |

---

## Related Documentation

- **User Story:** [JIRA-123]
- **Design Spec:** [Link to Figma/design doc]
- **API Documentation:** [Link to API docs]
- **Related Test Cases:** [TC-XXX-001, TC-XXX-002]
- **Bug Reports:** [BUG-123, BUG-456]

---

## Defects Found

| Bug ID | Description | Severity | Status | Assignee |
|--------|-------------|----------|--------|----------|
| BUG-123 | Portfolio value not updating after deposit | P1 | Open | Backend Team |
| BUG-456 | Incorrect error message on network timeout | P3 | Fixed | Frontend Team |

---

## Test Review

**Reviewed By:** [Name]
**Review Date:** [Date]
**Review Status:** [Approved / Changes Requested]
**Comments:**
[Reviewer feedback]

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-04 | QA Team | Initial version |
| 1.1 | 2025-01-10 | Jane Doe | Added edge cases |

---

## Notes

[Any additional information, gotchas, or observations]

**Example:**
- This test requires mock payment processor to be enabled
- Test data is reset nightly at 2 AM UTC
- Known flakiness issue with network timing, add extra wait if needed

---

**Template Version:** 1.0
**Last Updated:** 2025-01-04
**Maintained By:** QA Team Lead
