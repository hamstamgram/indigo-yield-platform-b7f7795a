# Authentication Integration Tests

## Overview

Comprehensive authentication integration tests for the Indigo Yield Platform that verify Supabase credentials work seamlessly across **web platform** and **iOS app**.

## Test Files

### 1. Web Platform Tests
**File:** `auth-integration.spec.ts`

Tests authentication flows on the web platform:
- Email/password signup and login
- Session management and persistence
- Password reset flow
- Protected route access
- Admin authentication
- Security validations

**Run:**
```bash
npm run test:auth
npm run test:auth:headed  # With visible browser
```

### 2. iOS App Tests
**File:** `ios/IndigoInvestorTests/Integration/AuthenticationIntegrationTests.swift`

Tests authentication on iOS:
- Email/password authentication
- Biometric authentication (Face ID/Touch ID)
- Keychain token storage
- Session persistence
- Cross-platform compatibility

**Run:**
```bash
cd ios
xcodebuild test -scheme IndigoInvestor -destination 'platform=iOS Simulator,name=iPhone 15'
```

### 3. Supabase Integration Tests
**File:** `supabase-integration.spec.ts`

Tests Supabase features:
- Database operations with RLS
- Storage upload/download
- Realtime subscriptions
- Edge Functions
- Admin operations

**Run:**
```bash
npm run test:supabase
```

### 4. Cross-Platform Tests
**File:** `cross-platform-verification.spec.ts`

Tests credential compatibility:
- Web → iOS credential flow
- iOS → Web credential flow
- Password changes sync
- Session token compatibility
- User metadata sync

**Run:**
```bash
npm run test:cross-platform
```

## Quick Start

### Prerequisites

1. **Node.js and npm** installed
2. **Xcode** (for iOS tests)
3. **Supabase credentials** configured in `.env`
4. **Test users** created in Supabase

### Environment Setup

Create or update `.env` file:

```bash
VITE_SUPABASE_URL=https://nkfimvovosdehmyyjubn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

### Install Dependencies

```bash
# Install npm packages
npm install

# Install Playwright browsers
npx playwright install
```

### Create Test Users

Create these test users in Supabase:

1. **Test Investor:**
   - Email: `test-investor@indigoyield.com`
   - Password: `TestPassword123!`
   - Role: Investor

2. **Test Admin:**
   - Email: `test-admin@indigoyield.com`
   - Password: `AdminPassword123!`
   - Role: Admin

## Running Tests

### Run All Tests

```bash
# Run all authentication tests
npm run test:auth:all

# Run with HTML report
npm run test:auth:report
```

### Run Individual Test Suites

```bash
# Web platform tests
npm run test:auth

# Supabase integration tests
npm run test:supabase

# Cross-platform tests
npm run test:cross-platform
```

### Run Tests in Headed Mode

```bash
# Watch tests execute in browser
npm run test:auth:headed
```

### Run iOS Tests

```bash
cd ios

# Run all iOS tests
xcodebuild test -scheme IndigoInvestor -destination 'platform=iOS Simulator,name=iPhone 15'

# Or use Xcode
open IndigoInvestor.xcodeproj
# Press Cmd+U to run tests
```

## Test Script Options

The `run-auth-tests.sh` script supports various options:

```bash
./tests/run-auth-tests.sh [options]

Options:
  --web-only       Run only web platform tests
  --ios-only       Run only iOS platform tests
  --integration    Run only Supabase integration tests
  --cross-platform Run only cross-platform tests
  --all            Run all tests (default)
  --report         Generate HTML test report
  --headed         Run tests in headed mode
```

Examples:

```bash
# Run only web tests
./tests/run-auth-tests.sh --web-only

# Run all tests with report
./tests/run-auth-tests.sh --all --report

# Run integration tests in headed mode
./tests/run-auth-tests.sh --integration --headed
```

## Test Results

### View Test Reports

After running tests, view results:

1. **HTML Report:**
   ```bash
   open playwright-report/index.html
   ```

2. **Comprehensive Report:**
   ```bash
   cat test-reports/AUTH_INTEGRATION_REPORT.md
   ```

3. **iOS Test Results:**
   ```bash
   open test-results/ios-test-results
   ```

### Test Output Locations

- `test-results/` - Raw test results
- `test-reports/` - Human-readable reports
- `playwright-report/` - Playwright HTML report
- `ios/test-results/` - iOS test results

## Test Coverage

### What's Tested

#### Authentication Flows
- ✅ Email/password signup
- ✅ Email/password login
- ✅ Session persistence
- ✅ Token refresh
- ✅ Logout
- ✅ Password reset
- ✅ Password update
- ✅ Email verification
- ✅ Biometric authentication (iOS)

#### Security
- ✅ Row-Level Security (RLS) policies
- ✅ Secure token storage
- ✅ Session fixation prevention
- ✅ XSS protection
- ✅ CSRF protection
- ✅ Rate limiting

#### Cross-Platform
- ✅ Web → iOS credentials
- ✅ iOS → Web credentials
- ✅ Password changes sync
- ✅ Session data sync
- ✅ User metadata sync
- ✅ Concurrent sessions

#### Supabase Features
- ✅ Database queries with RLS
- ✅ Storage upload/download
- ✅ Realtime subscriptions
- ✅ Presence tracking
- ✅ Edge Functions
- ✅ Admin operations

### Test Statistics

- **Total Tests:** 115+
- **Test Suites:** 20+
- **Lines of Test Code:** 3,000+
- **Expected Pass Rate:** 95%+

## Troubleshooting

### Common Issues

#### 1. Supabase Connection Failed

**Error:** "Failed to connect to Supabase"

**Solution:**
```bash
# Verify credentials in .env
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_PUBLISHABLE_KEY

# Test connection
curl $VITE_SUPABASE_URL/rest/v1/
```

#### 2. Test Users Not Found

**Error:** "Invalid login credentials"

**Solution:**
- Create test users in Supabase Dashboard
- Or use automated signup in tests
- Check email/password match test files

#### 3. iOS Tests Fail

**Error:** "xcodebuild: command not found"

**Solution:**
```bash
# Install Xcode from App Store
# Install Command Line Tools
xcode-select --install
```

#### 4. Playwright Browsers Missing

**Error:** "Executable doesn't exist"

**Solution:**
```bash
npx playwright install
```

### Enable Debug Mode

```bash
# Debug Playwright tests
DEBUG=pw:api npm run test:auth

# Verbose iOS tests
xcodebuild test -verbose ...
```

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/auth-tests.yml`:

```yaml
name: Authentication Tests

on: [push, pull_request]

jobs:
  web-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install
      - run: npm run test:auth

  ios-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - run: cd ios && xcodebuild test ...
```

## Best Practices

### Writing New Tests

1. **Use descriptive test names**
   ```typescript
   test('should allow users to read their own profile', async () => {
     // Test implementation
   });
   ```

2. **Clean up after tests**
   ```typescript
   test.afterEach(async () => {
     await supabase.auth.signOut();
   });
   ```

3. **Use test fixtures**
   ```typescript
   const TEST_USER = {
     email: 'test@example.com',
     password: 'TestPassword123!'
   };
   ```

4. **Test both success and failure cases**
   ```typescript
   test('should succeed with valid credentials', ...);
   test('should fail with invalid credentials', ...);
   ```

### Test Organization

- Group related tests in `describe` blocks
- Use clear test descriptions
- Keep tests independent
- Mock external dependencies when appropriate

## Documentation

### Related Documentation

- [Authentication API Docs](/docs/api/authentication.md)
- [Security Guidelines](/docs/security/authentication.md)
- [Supabase Setup](/docs/infrastructure/supabase.md)
- [Test Report](/test-reports/AUTH_INTEGRATION_REPORT.md)

### Code Examples

See test files for comprehensive examples of:
- Supabase authentication
- RLS policy testing
- Cross-platform flows
- Security validations

## Contributing

### Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `*.spec.ts` or `*Tests.swift`
3. Update this README
4. Run tests locally before committing
5. Add to CI/CD pipeline

### Test Standards

- Minimum 80% code coverage
- All tests must pass before merge
- Include both positive and negative tests
- Document test purpose and expectations

## Support

### Getting Help

- **Documentation:** Check `/docs/testing/`
- **Issues:** Open GitHub issue with `test` label
- **Questions:** Ask in team chat

### Reporting Bugs

When reporting test failures:
1. Include test output
2. Specify platform (web/iOS)
3. Note environment (dev/staging/prod)
4. Provide steps to reproduce

## License

Internal use only - Indigo Yield Platform

---

**Last Updated:** November 4, 2025
**Maintained By:** QA Team
