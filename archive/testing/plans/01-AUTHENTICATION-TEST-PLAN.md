# Authentication & Authorization Test Plan

## Module Overview

**Module:** Authentication & Authorization
**Severity:** CRITICAL (handles user identity and access control)
**Risk Level:** HIGH (security-sensitive, regulatory compliance)
**Test Coverage Target:** 95%+

---

## 1. Unit Tests

### 1.1 Password Validation (Web & iOS)

**File:** `utils/passwordValidation.ts` / `SecurityManager.swift`

| Test Case | Input | Expected Output | Priority |
|-----------|-------|----------------|----------|
| Valid password | `SecureP@ss123` | `{ valid: true }` | P1 |
| Too short | `Pass1!` | `{ valid: false, error: 'min 8 chars' }` | P1 |
| No uppercase | `password123!` | `{ valid: false, error: 'needs uppercase' }` | P1 |
| No lowercase | `PASSWORD123!` | `{ valid: false, error: 'needs lowercase' }` | P1 |
| No number | `Password!` | `{ valid: false, error: 'needs number' }` | P1 |
| No special char | `Password123` | `{ valid: false, error: 'needs special char' }` | P1 |
| Common password | `Password123!` | `{ valid: false, error: 'too common' }` | P2 |
| Empty string | `` | `{ valid: false, error: 'required' }` | P1 |
| SQL injection attempt | `' OR '1'='1` | `{ valid: false }` | P0 |

**Test File:** `tests/unit/auth/passwordValidation.test.ts`

```typescript
import { validatePassword } from '@/utils/passwordValidation';

describe('Password Validation', () => {
  it('should accept valid password with all requirements', () => {
    const result = validatePassword('SecureP@ss123');
    expect(result.valid).toBe(true);
  });

  it('should reject password shorter than 8 characters', () => {
    const result = validatePassword('Pass1!');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('8 characters');
  });

  // ... additional test cases
});
```

### 1.2 JWT Token Utilities (Web)

**File:** `lib/auth/jwtUtils.ts`

| Test Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| Generate token | Valid user payload | Returns signed JWT |
| Verify valid token | Unexpired token | Returns decoded payload |
| Verify expired token | Token past expiry | Throws TokenExpiredError |
| Verify tampered token | Modified signature | Throws JsonWebTokenError |
| Refresh token | Valid refresh token | Returns new access token |
| Revoke token | Blacklist token | Token marked as revoked |
| Token expiry check | Token near expiry | Returns correct expiry time |

### 1.3 Biometric Authentication (iOS)

**File:** `BiometricAuthManager.swift`

| Test Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| Check availability | Device with FaceID | Returns `.faceID` |
| Check availability | Device with TouchID | Returns `.touchID` |
| Check availability | Device without biometric | Returns `.none` |
| Authenticate | User accepts FaceID | Returns success |
| Authenticate | User cancels | Returns `.userCancel` error |
| Authenticate | Too many failed attempts | Returns `.lockout` error |
| Authenticate | Biometric changed | Returns `.biometryChanged` error |

**Test File:** `IndigoInvestorTests/BiometricAuthManagerTests.swift`

```swift
import XCTest
@testable import IndigoInvestor

class BiometricAuthManagerTests: XCTestCase {
    var sut: BiometricAuthManager!

    override func setUp() {
        super.setUp()
        sut = BiometricAuthManager()
    }

    func testBiometricTypeDetection() {
        let type = sut.biometricType()
        XCTAssertTrue([.faceID, .touchID, .none].contains(type))
    }

    func testAuthenticationSuccess() async throws {
        // Mock LAContext to simulate success
        // ...
    }
}
```

---

## 2. Integration Tests

### 2.1 Sign Up Flow (Web)

**Scenario:** New user registration

**Test Steps:**
1. Navigate to `/signup`
2. Fill in email, password, confirm password
3. Accept terms and conditions
4. Click "Sign Up"
5. Verify email sent
6. Click verification link in email
7. Verify redirect to dashboard

**Assertions:**
- User record created in database
- Email verification token generated
- Welcome email sent
- User status is `pending_verification`
- After verification, user status is `active`
- Session created after verification

**Test File:** `tests/integration/auth/signupFlow.test.ts`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignUpPage } from '@/pages/SignUp';
import { supabase } from '@/lib/supabaseClient';

describe('Sign Up Flow', () => {
  it('should successfully register a new user', async () => {
    const user = userEvent.setup();
    render(<SignUpPage />);

    // Fill form
    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'SecureP@ss123');
    await user.type(screen.getByLabelText(/confirm password/i), 'SecureP@ss123');
    await user.click(screen.getByLabelText(/terms and conditions/i));

    // Submit
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/verification email sent/i)).toBeInTheDocument();
    });

    // Verify database record
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'newuser@example.com')
      .single();

    expect(data).toBeTruthy();
    expect(data.status).toBe('pending_verification');
  });
});
```

### 2.2 Login Flow with 2FA (Web & iOS)

**Scenario:** User logs in with email/password + TOTP

**Test Steps:**
1. Navigate to `/login`
2. Enter valid email and password
3. Click "Login"
4. Verify redirect to 2FA page
5. Enter valid TOTP code
6. Click "Verify"
7. Verify redirect to dashboard
8. Verify session created

**Assertions:**
- User authenticated with correct credentials
- Invalid credentials rejected
- 2FA prompt shown if enabled
- Valid TOTP code accepted
- Invalid TOTP code rejected
- Session token stored securely
- User redirected to intended page

### 2.3 Password Reset Flow

**Scenario:** User forgot password and resets it

**Test Steps:**
1. Click "Forgot Password" on login page
2. Enter email address
3. Submit request
4. Receive reset email
5. Click reset link in email
6. Enter new password
7. Confirm new password
8. Submit new password
9. Verify redirect to login
10. Login with new password

**Assertions:**
- Reset email sent
- Reset token generated and stored
- Token has expiry time (24 hours)
- Token is single-use
- Old password no longer works
- New password works
- Password history prevents reuse

---

## 3. E2E Tests (Playwright)

### 3.1 Complete Authentication Journey

**Test File:** `tests/e2e/auth/completeAuthJourney.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Complete Authentication Journey', () => {
  test('should allow user to sign up, verify, login, and access dashboard', async ({ page, context }) => {
    // Sign up
    await page.goto('/signup');
    await page.fill('[name="email"]', 'testuser@example.com');
    await page.fill('[name="password"]', 'SecureP@ss123');
    await page.fill('[name="confirmPassword"]', 'SecureP@ss123');
    await page.check('[name="acceptTerms"]');
    await page.click('button:has-text("Sign Up")');

    await expect(page.locator('text=Verification email sent')).toBeVisible();

    // Simulate email verification (get token from database)
    const verificationToken = await getVerificationToken('testuser@example.com');
    await page.goto(`/verify?token=${verificationToken}`);

    await expect(page.locator('text=Email verified successfully')).toBeVisible();

    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'testuser@example.com');
    await page.fill('[name="password"]', 'SecureP@ss123');
    await page.click('button:has-text("Login")');

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();

    // Verify session persistence
    await page.reload();
    await expect(page).toHaveURL('/dashboard');
  });

  test('should enforce 2FA for users who have enabled it', async ({ page }) => {
    // Setup: Enable 2FA for test user
    await enableTwoFactorAuth('2fa-user@example.com');

    // Login with password
    await page.goto('/login');
    await page.fill('[name="email"]', '2fa-user@example.com');
    await page.fill('[name="password"]', 'SecureP@ss123');
    await page.click('button:has-text("Login")');

    // Should redirect to 2FA page
    await expect(page).toHaveURL('/2fa-verify');
    await expect(page.locator('text=Enter verification code')).toBeVisible();

    // Get TOTP code
    const totpCode = generateTOTP('2fa-user@example.com');

    // Enter TOTP code
    await page.fill('[name="code"]', totpCode);
    await page.click('button:has-text("Verify")');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/login');
    await page.click('a:has-text("Forgot Password")');

    await expect(page).toHaveURL('/forgot-password');

    await page.fill('[name="email"]', 'existing@example.com');
    await page.click('button:has-text("Send Reset Link")');

    await expect(page.locator('text=Reset link sent')).toBeVisible();

    // Get reset token
    const resetToken = await getPasswordResetToken('existing@example.com');

    // Navigate to reset page
    await page.goto(`/reset-password?token=${resetToken}`);

    // Enter new password
    await page.fill('[name="password"]', 'NewSecureP@ss456');
    await page.fill('[name="confirmPassword"]', 'NewSecureP@ss456');
    await page.click('button:has-text("Reset Password")');

    await expect(page.locator('text=Password reset successfully')).toBeVisible();

    // Login with new password
    await page.goto('/login');
    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'NewSecureP@ss456');
    await page.click('button:has-text("Login")');

    await expect(page).toHaveURL('/dashboard');
  });
});
```

### 3.2 iOS E2E Tests (XCUITest)

**Test File:** `IndigoInvestorUITests/AuthenticationUITests.swift`

```swift
import XCTest

class AuthenticationUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    func testLoginFlow() {
        // Tap login button
        app.buttons["Login"].tap()

        // Enter credentials
        let emailField = app.textFields["Email"]
        emailField.tap()
        emailField.typeText("testuser@example.com")

        let passwordField = app.secureTextFields["Password"]
        passwordField.tap()
        passwordField.typeText("SecureP@ss123")

        // Submit
        app.buttons["Sign In"].tap()

        // Verify dashboard appears
        XCTAssertTrue(app.staticTexts["Dashboard"].waitForExistence(timeout: 5))
    }

    func testBiometricLogin() {
        // Enable biometric in settings (test setup)
        setupBiometricAuth()

        // Launch app
        app.launch()

        // Trigger biometric prompt
        XCTAssertTrue(app.staticTexts["Use Face ID to login"].exists)

        // Simulate biometric success
        simulateBiometricAuth(success: true)

        // Verify dashboard
        XCTAssertTrue(app.staticTexts["Dashboard"].waitForExistence(timeout: 3))
    }
}
```

---

## 4. Security Tests

### 4.1 Authentication Security Checklist

| Test | Description | Tool | Priority |
|------|-------------|------|----------|
| SQL Injection | Test login with SQL injection payloads | Manual + OWASP ZAP | P0 |
| XSS | Test form inputs with XSS payloads | Manual + OWASP ZAP | P0 |
| Brute Force | Test rate limiting on login attempts | k6 script | P0 |
| Session Fixation | Verify session ID changes after login | Manual | P1 |
| CSRF | Verify CSRF tokens on all auth forms | Manual + Burp Suite | P0 |
| Password Hashing | Verify bcrypt/Argon2 used for passwords | Database inspection | P0 |
| Token Expiry | Verify JWT tokens expire as configured | Manual | P1 |
| Secure Cookie Flags | Verify HttpOnly, Secure, SameSite flags | Browser DevTools | P1 |

### 4.2 Brute Force Protection Test

**Test File:** `tests/security/bruteForceProtection.test.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Brute Force Protection', () => {
  test('should block login attempts after 5 failed attempts', async ({ page }) => {
    const email = 'victim@example.com';

    // Attempt 5 failed logins
    for (let i = 0; i < 5; i++) {
      await page.goto('/login');
      await page.fill('[name="email"]', email);
      await page.fill('[name="password"]', 'WrongPassword123!');
      await page.click('button:has-text("Login")');

      await expect(page.locator('text=Invalid credentials')).toBeVisible();
    }

    // 6th attempt should be blocked
    await page.goto('/login');
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', 'WrongPassword123!');
    await page.click('button:has-text("Login")');

    await expect(page.locator('text=Too many failed attempts')).toBeVisible();
    await expect(page.locator('text=Try again in 15 minutes')).toBeVisible();
  });

  test('should allow login after lockout period expires', async ({ page }) => {
    // This test would need to mock time or wait 15 minutes
    // In practice, use a test-specific shorter lockout period
  });
});
```

---

## 5. Performance Tests

### 5.1 Login Performance

**Target:** < 500ms server response time

**Test File:** `tests/performance/loginPerformance.js` (k6)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be below 1%
  },
};

export default function () {
  const payload = JSON.stringify({
    email: 'loadtest@example.com',
    password: 'SecureP@ss123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post('https://api.indigo.com/auth/login', payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'token present': (r) => r.json('access_token') !== undefined,
  });

  sleep(1);
}
```

---

## 6. Accessibility Tests

### 6.1 Login Page Accessibility

**Requirements:**
- Form inputs have labels
- Error messages are announced to screen readers
- Keyboard navigation works
- Focus indicators visible
- Sufficient color contrast

**Test File:** `tests/a11y/loginAccessibility.test.ts`

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Login Page Accessibility', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/login');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be navigable with keyboard only', async ({ page }) => {
    await page.goto('/login');

    // Tab through form
    await page.keyboard.press('Tab'); // Focus email input
    let focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('name'));
    expect(focusedElement).toBe('email');

    await page.keyboard.press('Tab'); // Focus password input
    focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('name'));
    expect(focusedElement).toBe('password');

    await page.keyboard.press('Tab'); // Focus login button
    focusedElement = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedElement).toContain('Login');

    // Submit with Enter key
    await page.keyboard.press('Enter');
  });

  test('should announce error messages to screen readers', async ({ page }) => {
    await page.goto('/login');

    // Submit empty form
    await page.click('button:has-text("Login")');

    // Verify error has aria-live attribute
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveAttribute('aria-live', 'polite');
  });
});
```

---

## 7. Test Data Management

### 7.1 Test User Accounts

| Email | Password | 2FA Enabled | Role | Status |
|-------|----------|-------------|------|--------|
| investor1@test.com | Test123! | No | Investor | Active |
| investor2@test.com | Test123! | Yes | Investor | Active |
| admin@test.com | Admin123! | Yes | Admin | Active |
| pending@test.com | Test123! | No | Investor | Pending Verification |
| suspended@test.com | Test123! | No | Investor | Suspended |

**Test Data Fixture:** `tests/fixtures/authTestData.json`

```json
{
  "users": [
    {
      "id": "user-001",
      "email": "investor1@test.com",
      "passwordHash": "$2b$10$...",
      "firstName": "John",
      "lastName": "Doe",
      "role": "investor",
      "status": "active",
      "emailVerified": true,
      "twoFactorEnabled": false,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "sessions": [],
  "totpSecrets": []
}
```

### 7.2 Test Data Seeding Script

**File:** `tests/scripts/seedAuthData.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import testData from '../fixtures/authTestData.json';

async function seedAuthData() {
  const supabase = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_SERVICE_KEY!
  );

  // Clear existing test data
  await supabase.from('users').delete().like('email', '%@test.com');

  // Insert test users
  for (const user of testData.users) {
    await supabase.from('users').insert(user);
  }

  console.log('Auth test data seeded successfully');
}

seedAuthData().catch(console.error);
```

---

## 8. Test Execution Schedule

| Test Type | Trigger | Frequency | Duration |
|-----------|---------|-----------|----------|
| Unit Tests | Pre-commit | Every commit | < 10s |
| Integration Tests | PR | Every PR | < 2 min |
| E2E Tests | PR merge | Every merge to main | < 5 min |
| Security Tests | Scheduled | Daily | < 30 min |
| Performance Tests | Scheduled | Weekly | < 15 min |
| Accessibility Tests | PR | Every PR | < 1 min |

---

## 9. Known Issues & Workarounds

| Issue | Impact | Workaround | Tracking |
|-------|--------|-----------|----------|
| Flaky biometric test on CI | Low | Skip on CI, run manually | JIRA-123 |
| Email verification in E2E | Medium | Use test email service | JIRA-456 |
| 2FA time sync issues | Low | Mock time provider | JIRA-789 |

---

## 10. Test Coverage Report

**Current Status:** (To be filled after implementation)

| Category | Coverage | Tests | Status |
|----------|----------|-------|--------|
| Password Validation | TBD% | TBD | 🔴 Not Started |
| JWT Utilities | TBD% | TBD | 🔴 Not Started |
| Sign Up Flow | TBD% | TBD | 🔴 Not Started |
| Login Flow | TBD% | TBD | 🔴 Not Started |
| Password Reset | TBD% | TBD | 🔴 Not Started |
| 2FA | TBD% | TBD | 🔴 Not Started |
| Biometric Auth | TBD% | TBD | 🔴 Not Started |
| Session Management | TBD% | TBD | 🔴 Not Started |
| Security Tests | TBD% | TBD | 🔴 Not Started |

**Legend:**
- 🔴 Not Started (0-25%)
- 🟡 In Progress (26-75%)
- 🟢 Complete (76-100%)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-04
**Owner:** QA Team - Authentication Module
**Approvers:** Security Lead, Backend Lead
