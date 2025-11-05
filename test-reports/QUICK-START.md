# Admin Security Tests - Quick Start Guide

## 🚀 30-Second Setup

```bash
# 1. Set your credentials
export PLAYWRIGHT_ADMIN_EMAIL="admin@yourcompany.com"
export PLAYWRIGHT_ADMIN_PASSWORD="your_secure_password"
export PLAYWRIGHT_LP_EMAIL="investor@yourcompany.com"
export PLAYWRIGHT_LP_PASSWORD="your_secure_password"

# 2. Run the tests
npx playwright test tests/admin-pages-security.spec.ts

# 3. View results
cat test-reports/admin-tests.md
```

## 📋 What Gets Tested

**12 Admin Pages:**
1. `/admin` - Dashboard
2. `/admin/investors` - Investor list
3. `/admin/investors/:id` - Investor detail
4. `/admin/transactions` - All transactions
5. `/admin/withdrawals` - Withdrawal approvals
6. `/admin/documents` - Document queue
7. `/admin/compliance` - Compliance dashboard
8. `/admin/reports` - Reports
9. `/admin/fees` - Fee management
10. `/admin/settings` - Platform settings
11. `/admin/audit-logs` - Audit logs
12. `/admin/users` - User management

**3 Tests Per Page:**
- ✅ Blocks unauthenticated access
- ✅ Blocks non-admin users
- ✅ Allows admin access

**Total:** 36+ security tests

## 🎯 Common Commands

```bash
# Run all tests
npx playwright test tests/admin-pages-security.spec.ts

# Run with visible browser
npx playwright test tests/admin-pages-security.spec.ts --headed

# Run in debug mode
npx playwright test tests/admin-pages-security.spec.ts --debug

# Run specific page tests
npx playwright test tests/admin-pages-security.spec.ts -g "Dashboard"

# Generate HTML report
npx playwright test tests/admin-pages-security.spec.ts --reporter=html

# View report
npx playwright show-report
```

## 📊 Expected Results

```
✅ 36 tests passed
📸 13 screenshots created
📄 Report generated
⏱️  ~3-5 minutes runtime
```

## 🔍 Where to Find Results

- **Screenshots:** `tests/screenshots/admin-*.png`
- **Test Report:** `test-reports/admin-tests.md`
- **Summary:** `test-reports/ADMIN-SECURITY-SUMMARY.md`
- **Console:** Playwright terminal output

## ⚠️ Common Issues

### "Credentials not provided"
```bash
# Make sure to export both admin AND investor credentials
export PLAYWRIGHT_ADMIN_EMAIL="admin@test.com"
export PLAYWRIGHT_ADMIN_PASSWORD="password"
export PLAYWRIGHT_LP_EMAIL="investor@test.com"
export PLAYWRIGHT_LP_PASSWORD="password"
```

### "Timeout waiting for element"
```bash
# Make sure your dev server is running
npm run dev

# Or specify the correct URL
export PREVIEW_URL="http://localhost:5173"
```

### "Tests are flaky"
```bash
# Increase timeout
npx playwright test tests/admin-pages-security.spec.ts --timeout=60000

# Run with retries
npx playwright test tests/admin-pages-security.spec.ts --retries=2
```

## 📚 Documentation

- **Full Guide:** `tests/README-ADMIN-TESTS.md`
- **Detailed Report:** `test-reports/admin-tests.md`
- **Executive Summary:** `test-reports/ADMIN-SECURITY-SUMMARY.md`

## ✨ What You'll Get

1. **Comprehensive Security Validation**
   - All admin pages are protected
   - Non-admins are properly blocked
   - Admins have full access

2. **Visual Proof**
   - Screenshots of every page
   - Access denied screen
   - Visual documentation

3. **Detailed Report**
   - Test results for each page
   - Security assessment
   - Recommendations
   - Compliance mapping

4. **Confidence**
   - Know your admin area is secure
   - Automated regression testing
   - CI/CD ready

## 🎉 Next Steps

After running tests:

1. ✅ Review test results
2. ✅ Check screenshots
3. ✅ Read the report
4. ✅ Add to CI/CD pipeline
5. ✅ Schedule regular runs

---

**Need Help?** Check `tests/README-ADMIN-TESTS.md` for detailed troubleshooting.
