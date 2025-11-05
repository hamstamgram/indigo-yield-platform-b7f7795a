# Admin Pages Security Tests

Comprehensive security testing suite for all 12 admin pages in the Indigo Yield Platform.

## Overview

This test suite verifies that the AdminGuard component properly protects all administrative functionality from unauthorized access. It tests authentication, authorization, data loading, and user experience for each admin page.

## Test Coverage

### Pages Tested (12 Total)

1. **Admin Dashboard** (`/admin`)
2. **Investor Management** (`/admin/investors`)
3. **Investor Details** (`/admin/investors/:id`)
4. **All Transactions** (`/admin/transactions`)
5. **Withdrawal Approvals** (`/admin/withdrawals`)
6. **Document Review Queue** (`/admin/documents`)
7. **Compliance Dashboard** (`/admin/compliance`)
8. **Admin Reports** (`/admin/reports`)
9. **Fee Management** (`/admin/fees`)
10. **Platform Settings** (`/admin/settings`)
11. **Audit Logs** (`/admin/audit-logs`)
12. **User Management** (`/admin/users`)

### Test Scenarios Per Page

- ✅ Unauthenticated access (redirects to login)
- ✅ Non-admin user access (shows Access Denied)
- ✅ Admin user access (grants access)
- ✅ Page content loading
- ✅ Console error monitoring

**Total Test Cases:** 36+ (3 per page minimum)

## Prerequisites

### Environment Setup

```bash
# 1. Install Playwright
npm install -D @playwright/test

# 2. Install Playwright browsers
npx playwright install
```

### Credentials Configuration

Create a `.env.test` file or set environment variables:

```bash
# Admin credentials
export PLAYWRIGHT_ADMIN_EMAIL="admin@indigo.test"
export PLAYWRIGHT_ADMIN_PASSWORD="your_admin_password"

# LP (Limited Partner/Investor) credentials
export PLAYWRIGHT_LP_EMAIL="investor@indigo.test"
export PLAYWRIGHT_LP_PASSWORD="your_investor_password"
```

**Security Note:** Never commit credentials to version control. Use environment variables or a secure secrets manager.

## Running Tests

### Basic Execution

```bash
# Run all admin security tests
npx playwright test tests/admin-pages-security.spec.ts

# Run with headed browser (visible)
npx playwright test tests/admin-pages-security.spec.ts --headed

# Run in UI mode (interactive)
npx playwright test tests/admin-pages-security.spec.ts --ui

# Run with debug mode
npx playwright test tests/admin-pages-security.spec.ts --debug
```

### Specific Test Groups

```bash
# Run only AdminGuard component tests
npx playwright test tests/admin-pages-security.spec.ts -g "AdminGuard"

# Run tests for a specific page
npx playwright test tests/admin-pages-security.spec.ts -g "Admin Dashboard"

# Run tests for investor pages
npx playwright test tests/admin-pages-security.spec.ts -g "Investor"
```

### Report Generation

```bash
# Generate HTML report
npx playwright test tests/admin-pages-security.spec.ts --reporter=html

# Generate JSON report
npx playwright test tests/admin-pages-security.spec.ts --reporter=json

# Generate both
npx playwright test tests/admin-pages-security.spec.ts --reporter=html,json

# Open HTML report
npx playwright show-report
```

## Test Output

### Screenshots

Generated in `tests/screenshots/`:

- `admin-access-denied.png` - Access denied screen for non-admin users
- `admin-dashboard-full.png` - Admin dashboard view
- `admin-investors-list.png` - Investor list page
- `admin-investor-detail.png` - Individual investor detail
- `admin-transactions.png` - Transaction history
- `admin-withdrawals.png` - Withdrawal approval queue
- `admin-documents.png` - Document review queue
- `admin-compliance.png` - Compliance dashboard
- `admin-reports.png` - Reports page
- `admin-fees.png` - Fee management
- `admin-settings.png` - Platform settings
- `admin-audit-logs.png` - Audit logs
- `admin-users.png` - User management

### Test Report

Generated in `test-reports/admin-tests.md`:

- Executive summary
- Detailed test results for each page
- Security assessment
- Recommendations
- Compliance considerations

## Understanding Test Results

### Success Indicators

✅ **All tests passing:**
- Admin users can access all pages
- Non-admin users are properly blocked
- No console errors
- Content loads correctly

### Common Issues

❌ **Test failures:**

1. **Credentials not provided**
   - Solution: Set `PLAYWRIGHT_ADMIN_EMAIL` and `PLAYWRIGHT_ADMIN_PASSWORD`

2. **Access denied not showing**
   - Solution: Verify AdminGuard is properly wrapped around component
   - Check: `<AdminRoute><Component /></AdminRoute>`

3. **Page content not loading**
   - Solution: Check network requests in debug mode
   - Verify: API endpoints are accessible

4. **Console errors**
   - Solution: Review error messages in test output
   - Check: Component dependencies and imports

## Test Architecture

### Helper Functions

```typescript
// Login helpers
loginAsAdmin(page: Page)  // Authenticates as admin user
loginAsLP(page: Page)     // Authenticates as investor

// Verification helpers
verifyAccessDenied(page: Page)  // Checks Access Denied screen
setupConsoleErrorCapture(page: Page)  // Monitors console errors
```

### Test Pattern

```typescript
test('admin can access page', async ({ page }) => {
  // 1. Setup
  const errors = setupConsoleErrorCapture(page);

  // 2. Login as admin
  await loginAsAdmin(page);

  // 3. Navigate to page
  await page.goto(`${BASE_URL}/admin/page`);

  // 4. Verify content
  await expect(page.locator('text=Page Title')).toBeVisible();

  // 5. Take screenshot
  await page.screenshot({ path: 'screenshot.png' });

  // 6. Check for errors
  expect(errors).toHaveLength(0);
});
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Admin Security Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run admin security tests
        env:
          PLAYWRIGHT_ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
          PLAYWRIGHT_ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
          PLAYWRIGHT_LP_EMAIL: ${{ secrets.LP_EMAIL }}
          PLAYWRIGHT_LP_PASSWORD: ${{ secrets.LP_PASSWORD }}
        run: npx playwright test tests/admin-pages-security.spec.ts

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            test-results/
            tests/screenshots/
            test-reports/
```

## Security Best Practices

### Test Data

- ✅ Use dedicated test accounts
- ✅ Never use production credentials
- ✅ Rotate test credentials regularly
- ✅ Use environment variables for secrets

### Test Environment

- ✅ Run tests in isolated environment
- ✅ Use test database
- ✅ Mock external services
- ✅ Clean up test data after runs

### Access Control

- ✅ Verify AdminGuard on all admin pages
- ✅ Test authentication flows
- ✅ Test authorization checks
- ✅ Monitor for access bypass attempts

## Troubleshooting

### Tests Timing Out

**Issue:** Tests fail with timeout errors

**Solutions:**
- Increase timeout: `test.setTimeout(60000)`
- Check network connectivity
- Verify server is running
- Review page load performance

### Authentication Failures

**Issue:** Login fails during tests

**Solutions:**
- Verify credentials are correct
- Check auth service is running
- Review network requests
- Test login manually

### Screenshots Not Generated

**Issue:** Screenshot files not created

**Solutions:**
- Check directory permissions
- Verify `tests/screenshots/` exists
- Review error messages
- Run with `--headed` to debug

### Flaky Tests

**Issue:** Tests pass/fail intermittently

**Solutions:**
- Add explicit waits: `await page.waitForSelector()`
- Use retry logic: `test.describe.configure({ retries: 2 })`
- Increase timeouts
- Review timing-dependent assertions

## Maintenance

### Adding New Admin Pages

1. **Add page to `adminPages` array:**

```typescript
{
  name: 'New Admin Page',
  path: '/admin/new-page',
  expectedContent: ['Page Title', 'Key Content'],
  actions: ['Action 1', 'Action 2']
}
```

2. **Create test describe block:**

```typescript
test.describe('Admin Page: New Page', () => {
  test('admin can access', async ({ page }) => {
    // Test implementation
  });

  test('non-admin cannot access', async ({ page }) => {
    // Test implementation
  });
});
```

3. **Update test report generation**

4. **Add screenshots to documentation**

### Updating AdminGuard

If the AdminGuard component changes:

1. Review all test assertions
2. Update helper functions
3. Regenerate baseline screenshots
4. Update documentation
5. Run full test suite

## Resources

- **Playwright Documentation:** https://playwright.dev
- **Test File:** `/tests/admin-pages-security.spec.ts`
- **Test Report:** `/test-reports/admin-tests.md`
- **AdminGuard Component:** `/src/components/admin/AdminGuard.tsx`

## Support

For questions or issues:

1. Review test output and error messages
2. Check this README for troubleshooting
3. Review test report for detailed results
4. Contact the testing team

---

**Test Version:** 1.0.0
**Last Updated:** 2025-11-04
**Maintained By:** Test Automation Team
